<?php

namespace App\Modules\InpatientVitals\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\NursingStaff\Services\NursingShiftService;
use PDO;

/**
 * NEWS2 alerts. After each new or voided set the latest score is compared with the one before:
 *  - the alert level rises (a single 3 / 5-6 / 7+): alert the nurse(s), the ward's charge nurses
 *    and the patient's doctor -- urgent, or critical at 7+;
 *  - it stays the same: no repeat alert (the open one stays until acknowledged, and escalates);
 *  - it falls: open alerts of a higher level are closed ("score fell to N").
 */
class News2AlertService
{
    public const SOURCE = 'news2';

    /** @return array{level:int, raised:?int, resolved:int} */
    public function evaluate(int $admissionId, ?int $actorId = null): array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT * FROM inpatient_vitals WHERE admission_id = :a AND voided_at IS NULL ORDER BY taken_at DESC, id DESC LIMIT 2"
        );
        $stmt->execute(['a' => $admissionId]);
        $sets = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $svc = new InpatientVitalsService();
        $cur = isset($sets[0]) ? $svc->news2Of($sets[0]) : null;
        $prev = isset($sets[1]) ? $svc->news2Of($sets[1]) : null;
        $level = News2::level($cur);
        $prevLevel = News2::level($prev);

        $raised = null;
        if ($level > 0 && $level > $prevLevel) {
            $raised = $this->raise($db, $admissionId, $sets[0], $cur, $level, $actorId);
        }

        // One open NEWS2 alert per patient: close those above the current level (score fell)
        // and, when a higher one was just raised, those below it (replaced).
        $open = $db->prepare("SELECT id, dedupe_key FROM alerts WHERE source_type = :s AND source_id = :a AND resolved_at IS NULL AND acknowledged_at IS NULL");
        $open->execute(['s' => self::SOURCE, 'a' => $admissionId]);
        $resolved = 0;
        foreach ($open->fetchAll(PDO::FETCH_ASSOC) as $o) {
            $l = (int) substr(strrchr((string) $o['dedupe_key'], ':'), 1);
            if ($l > $level) {
                $resolved += AlertService::resolveByKey((string) $o['dedupe_key'], $actorId,
                    $cur ? "NEWS2 fell to {$cur['score']} ({$this->riskLabel($cur)})" : 'No current vital signs');
            } elseif ($raised && $l < $level) {
                $resolved += AlertService::resolveByKey((string) $o['dedupe_key'], $actorId, "Replaced: NEWS2 rose to {$cur['score']} ({$this->riskLabel($cur)})");
            }
        }
        return ['level' => $level, 'raised' => $raised, 'resolved' => $resolved];
    }

    private function raise(PDO $db, int $admissionId, array $set, array $n, int $level, ?int $actorId): ?int
    {
        $stmt = $db->prepare(
            "SELECT a.patient_id, a.patient_name, a.ward_id, w.ward_name, b.room_number, b.bed_number
             FROM inpatient_admissions a JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id WHERE a.id = :id"
        );
        $stmt->execute(['id' => $admissionId]);
        $a = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$a) {
            return null;
        }
        $targets = $this->recipients($db, $admissionId, $a, $level);
        $title = "NEWS2 {$n['score']} ({$this->riskLabel($n)}) — {$a['patient_name']}, {$a['ward_name']} {$a['room_number']}·{$a['bed_number']}";
        $body = 'Scored: ' . News2::describe($n, $set) . ".\n"
            . ($n['complete'] ? '' : 'Partial score — not measured: ' . implode(', ', array_map(fn($k) => News2::PARAMETERS[$k], $n['missing'])) . ".\n")
            . 'Response: ' . News2::RESPONSE[$n['risk']];
        $r = AlertService::raise([
            'type' => 'early_warning',
            'urgency' => $level >= 3 ? 'critical' : 'urgent',
            'title' => mb_substr($title, 0, 200),
            'body' => $body,
            'patient_id' => $a['patient_id'],
            'link' => ['patient_id' => $a['patient_id']],
            'targets' => $targets,
            'source_type' => self::SOURCE,
            'source_id' => $admissionId,
            'dedupe_key' => self::SOURCE . ":{$admissionId}:{$level}",
        ], $actorId);
        return $r['success'] ? (int) $r['data']['id'] : null;
    }

    /**
     * The nurse assigned this shift (else the ward's nurses), the ward's charge nurses, and the
     * patient's doctor (their primary provider; if none, all doctors -- only for a high score).
     */
    private function recipients(PDO $db, int $admissionId, array $a, int $level): array
    {
        $users = [];
        $cur = (new NursingShiftService())->current();
        $stmt = $db->prepare("SELECT nurse_user_id FROM nurse_patient_assignments WHERE admission_id = :a AND shift_date = :d AND shift_id = :s AND nurse_user_id IS NOT NULL");
        $stmt->execute(['a' => $admissionId, 'd' => $cur['date'], 's' => $cur['shift']['id'] ?? 0]);
        $nurse = $stmt->fetchColumn();
        $ward = fn(array $roles) => $this->wardStaff($db, (int) $a['ward_id'], $roles);
        $users = array_merge($users, $nurse ? [(int) $nurse] : $ward(['nurse']), $ward(['charge_nurse']));

        $targets = [];
        $doctor = $this->doctorOf($db, $a['patient_id'] !== null ? (int) $a['patient_id'] : 0);
        if ($doctor) {
            $users[] = $doctor;
        } elseif ($level >= 3) {
            $targets[] = ['role' => 'doctor'];
        }
        foreach (array_unique($users) as $u) {
            $targets[] = ['user' => $u];
        }
        // Nobody linked to the ward and no doctor: tell all nurses.
        return $targets ?: [['role' => 'nurse']];
    }

    private function wardStaff(PDO $db, int $wardId, array $roles): array
    {
        $in = implode(',', array_map(fn($r) => $db->quote($r), $roles));
        $stmt = $db->prepare(
            "SELECT x.user_id FROM nurse_ward_assignments x JOIN users u ON u.id = x.user_id AND u.deleted_at IS NULL
             JOIN roles r ON r.id = u.role_id WHERE x.ward_id = :w AND r.name IN ({$in})"
        );
        $stmt->execute(['w' => $wardId]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /** The patient's primary provider's user account. */
    private function doctorOf(PDO $db, int $patientId): ?int
    {
        if (!$patientId) {
            return null;
        }
        $stmt = $db->prepare(
            "SELECT e.user_id FROM patients p JOIN providers pr ON pr.id = p.provider_id AND pr.deleted_at IS NULL
             JOIN employees e ON e.id = pr.employee_id JOIN users u ON u.id = e.user_id AND u.deleted_at IS NULL
             WHERE p.id = :p LIMIT 1"
        );
        $stmt->execute(['p' => $patientId]);
        $u = $stmt->fetchColumn();
        return $u ? (int) $u : null;
    }

    private function riskLabel(array $n): string
    {
        return strtolower(News2::RISK_LABELS[$n['risk']]) . ' risk' . ($n['complete'] ? '' : ', partial');
    }
}
