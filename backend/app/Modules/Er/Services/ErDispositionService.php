<?php

namespace App\Modules\Er\Services;

use App\Core\Database;
use App\Modules\InpatientAdmissions\Services\InpatientAdmissionsService;
use PDO;

/**
 * ER (module 12, Phase 4: disposition) -- where the patient goes from the ER, decided by a doctor:
 *
 *   * home -- discharged, with the ER diagnosis, instructions and follow-up.
 *   * admit -- an inpatient admission (Inpatient Admissions, admission source "Emergency Room (ER)")
 *     in a ward bed. No bed free yet: the decision is recorded and the patient waits in the ER
 *     ("boarding") until a nurse or doctor admits them to a bed.
 *   * transfer -- to another facility (where, why, how, the accepting doctor).
 *   * or -- to the OR on a surgery request (Surgery Requests): an existing one, or one made from the ER.
 *   * died -- time of death.
 * Everything but boarding closes the visit (closed_at = when the patient left the ER) and its
 * waiting-time and protocol alerts. A doctor deciding counts as the patient being seen.
 */
class ErDispositionService
{
    public const DECIDE_ROLES = ['admin', 'doctor', 'clinician'];
    /** Admitting a boarding patient to a bed (the decision is already made). */
    public const BED_ROLES = ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse'];
    public const KINDS = [
        'home' => ['label' => 'Discharged home', 'status' => 'discharged'],
        'admit' => ['label' => 'Admitted', 'status' => 'admitted'],
        'transfer' => ['label' => 'Transferred', 'status' => 'transferred'],
        'or' => ['label' => 'To the OR', 'status' => 'or'],
        'died' => ['label' => 'Died in the ER', 'status' => 'died'],
    ];
    public const ADMISSION_TYPES = ['Emergency / STAT', 'Urgent'];
    public const ISOLATION = ['Standard', 'Contact', 'Droplet', 'Airborne', 'Strict Protective Neutropenic'];
    public const TRANSFER_MODES = ['Ambulance', 'Ambulance with nurse / doctor', 'Air ambulance', 'Private vehicle', 'Other'];

    /** For the dialog: free ward beds, wards, doctors, the patient's surgery requests. */
    public function options(int $visitId): ?array
    {
        $db = Database::connection();
        $v = $this->row($db, $visitId);
        if (!$v) {
            return null;
        }
        $beds = $db->query(
            "SELECT b.id, b.bed_number, b.room_number, b.bed_type, w.id AS ward_id, w.ward_name, w.ward_code FROM hospital_beds b JOIN hospital_wards w ON w.id = b.ward_id
             WHERE b.is_active = 1 AND w.is_active = 1 AND b.status = 'Available' ORDER BY w.id, b.bed_number"
        )->fetchAll(PDO::FETCH_ASSOC);
        $wards = $db->query(
            "SELECT w.id, w.ward_name, w.ward_code, SUM(b.status = 'Available' AND b.is_active = 1) AS free FROM hospital_wards w LEFT JOIN hospital_beds b ON b.ward_id = w.id
             WHERE w.is_active = 1 GROUP BY w.id ORDER BY w.id"
        )->fetchAll(PDO::FETCH_ASSOC);
        $sr = $db->prepare(
            "SELECT id, request_number, procedure_name, priority, status, created_at FROM surgery_requests
             WHERE patient_id = :p AND status IN ('requested', 'planning', 'ready', 'scheduled') ORDER BY id DESC LIMIT 20"
        );
        $sr->execute(['p' => $v['patient_id']]);
        return [
            'kinds' => array_map(fn($k) => $k['label'], self::KINDS),
            'beds' => array_map(fn($b) => ['id' => (int) $b['id'], 'ward_id' => (int) $b['ward_id'], 'ward' => $b['ward_name'], 'ward_code' => $b['ward_code'],
                'bed' => $b['bed_number'], 'room' => $b['room_number'], 'type' => $b['bed_type']], $beds),
            'wards' => array_map(fn($w) => ['id' => (int) $w['id'], 'name' => $w['ward_name'], 'code' => $w['ward_code'], 'free' => (int) $w['free']], $wards),
            'doctors' => $db->query(
                "SELECT u.id, " . ErBoardService::nameSql('u.id') . " AS name FROM users u JOIN roles r ON r.id = u.role_id
                 WHERE u.deleted_at IS NULL AND r.name IN ('doctor', 'clinician') ORDER BY name"
            )->fetchAll(PDO::FETCH_ASSOC),
            'surgery_requests' => $sr->fetchAll(PDO::FETCH_ASSOC),
            'admission_types' => self::ADMISSION_TYPES, 'isolation' => self::ISOLATION, 'transfer_modes' => self::TRANSFER_MODES,
        ];
    }

    /**
     * data: id, disposition (home | admit | transfer | or | died), diagnosis, notes?;
     *   home: follow_up?;
     *   admit: bed_id (or ward_id: waiting for a bed), admission_type, attending_user_id, isolation?;
     *   transfer: facility, reason, mode, accepting_doctor?;
     *   or: surgery_request_id;
     *   died: time (HH:MM).
     */
    public function decide(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::DECIDE_ROLES, true)) {
            return ['success' => false, 'message' => 'Where the patient goes is decided by a doctor.', 'forbidden' => true];
        }
        $db = Database::connection();
        $v = $this->row($db, (int) ($data['id'] ?? 0));
        if (!$v) {
            return ['success' => false, 'message' => 'ER visit not found.', 'not_found' => true];
        }
        if (!in_array($v['status'], ['waiting', 'triaged'], true)) {
            return ['success' => false, 'message' => 'This ER visit is closed.'];
        }
        $kind = (string) ($data['disposition'] ?? '');
        if (!isset(self::KINDS[$kind])) {
            return ['success' => false, 'message' => 'Choose where the patient goes.', 'errors' => ['disposition' => 'Required.']];
        }
        if ($v['status'] === 'waiting' && $kind !== 'died') {
            return ['success' => false, 'message' => 'Triage the patient first.'];
        }
        $errors = [];
        $text = function (string $f, int $max, bool $required, string $msg) use ($data, &$errors): ?string {
            $t = trim((string) ($data[$f] ?? ''));
            if ($t === '') {
                if ($required) {
                    $errors[$f] = $msg;
                }
                return null;
            }
            if (mb_strlen($t) > $max) {
                $errors[$f] = "Keep it under {$max} characters.";
            }
            return mb_substr($t, 0, $max);
        };
        $diagnosis = $text('diagnosis', 255, $kind !== 'died', 'The ER diagnosis.');
        $notes = $text('notes', 1000, false, '');
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $set = ['disposition' => $kind, 'disposition_at' => $now, 'disposition_by' => (int) $actor['id'], 'er_diagnosis' => $diagnosis, 'disposition_notes' => $notes,
            'follow_up' => null, 'admit_ward_id' => null, 'admit_details' => null, 'transfer_facility' => null, 'transfer_reason' => null, 'transfer_mode' => null,
            'accepting_doctor' => null, 'surgery_request_id' => null, 'died_at' => null];
        $admit = null;
        if ($kind === 'home') {
            $set['follow_up'] = $text('follow_up', 255, false, '');
        } elseif ($kind === 'admit') {
            $type = (string) ($data['admission_type'] ?? '');
            if (!in_array($type, self::ADMISSION_TYPES, true)) {
                $errors['admission_type'] = 'Emergency or urgent?';
            }
            $iso = (string) ($data['isolation'] ?? 'Standard') ?: 'Standard';
            if (!in_array($iso, self::ISOLATION, true)) {
                $errors['isolation'] = 'Choose the isolation.';
            }
            $att = (int) ($data['attending_user_id'] ?? 0);
            $attName = $att ? $this->doctorName($db, $att) : null;
            if (!$attName) {
                $errors['attending_user_id'] = 'Choose the attending doctor.';
            }
            $bedId = (int) ($data['bed_id'] ?? 0);
            $wardId = (int) ($data['ward_id'] ?? 0);
            $already = $db->prepare("SELECT admission_number FROM inpatient_admissions WHERE patient_id = :p AND status IN ('Admitted', 'Pending Discharge') LIMIT 1");
            $already->execute(['p' => $v['patient_id']]);
            if ($a = $already->fetchColumn()) {
                $errors['bed_id'] = "The patient is already admitted ({$a}).";
            } elseif ($bedId) {
                $bed = $this->freeBed($db, $bedId);
                if (!$bed) {
                    $errors['bed_id'] = 'That bed is no longer free. Choose another, or admit to wait for a bed.';
                } else {
                    $wardId = (int) $bed['ward_id'];
                }
            } elseif (!$wardId || !$db->query("SELECT 1 FROM hospital_wards WHERE is_active = 1 AND id = " . $wardId)->fetchColumn()) {
                $errors['bed_id'] = 'Choose a free bed, or the ward if no bed is free yet.';
            }
            $set['admit_ward_id'] = $wardId ?: null;
            $set['admit_details'] = json_encode(['admission_type' => $type, 'attending_user_id' => $att, 'attending' => $attName, 'isolation' => $iso]);
            $admit = $bedId;
        } elseif ($kind === 'transfer') {
            $set['transfer_facility'] = $text('facility', 150, true, 'Which facility?');
            $set['transfer_reason'] = $text('reason', 255, true, 'Why the transfer? (e.g. needs cardiac surgery, no ICU bed)');
            $mode = (string) ($data['mode'] ?? '');
            if (!in_array($mode, self::TRANSFER_MODES, true)) {
                $errors['mode'] = 'How is the patient going?';
            }
            $set['transfer_mode'] = $mode;
            $set['accepting_doctor'] = $text('accepting_doctor', 150, false, '');
        } elseif ($kind === 'or') {
            $sr = $db->prepare("SELECT id, request_number, status FROM surgery_requests WHERE id = :id AND patient_id = :p");
            $sr->execute(['id' => (int) ($data['surgery_request_id'] ?? 0), 'p' => $v['patient_id']]);
            $req = $sr->fetch(PDO::FETCH_ASSOC);
            if (!$req || $req['status'] === 'cancelled') {
                $errors['surgery_request_id'] = 'Choose the surgery request (or make one).';
            } else {
                $set['surgery_request_id'] = (int) $req['id'];
            }
        } else {
            $t = trim((string) ($data['time'] ?? ''));
            if (!preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', $t)) {
                $errors['time'] = 'Time of death (HH:MM).';
            } else {
                $c = substr($now, 0, 10) . " {$t}:00";
                if ($c > $now) {
                    $c = (new \DateTimeImmutable(substr($now, 0, 10), new \DateTimeZone('UTC')))->modify('-1 day')->format('Y-m-d') . " {$t}:00";
                }
                if ($c < $v['arrived_at']) {
                    $errors['time'] = 'That is before the patient arrived (' . substr($v['arrived_at'], 11, 5) . ').';
                }
                $set['died_at'] = $c;
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT er_dispo');
        try {
            $cols = implode(', ', array_map(fn($k) => "{$k} = :{$k}", array_keys($set)));
            $db->prepare("UPDATE er_visits SET {$cols} WHERE id = :id")->execute($set + ['id' => $v['id']]);
            // The doctor deciding has seen the patient.
            if ($v['doctor_user_id'] === null && in_array($actor['role'], ['doctor', 'clinician'], true)) {
                $db->prepare("UPDATE er_visits SET doctor_user_id = :u, doctor_at = COALESCE(doctor_at, :now) WHERE id = :id")->execute(['u' => (int) $actor['id'], 'now' => $now, 'id' => $v['id']]);
            }
            $msg = null;
            if ($kind === 'admit') {
                if ($admit) {
                    $msg = $this->admitNow($db, (int) $v['id'], $admit, $actor);
                } else {
                    $ward = $db->query("SELECT ward_name FROM hospital_wards WHERE id = " . (int) $set['admit_ward_id'])->fetchColumn();
                    $msg = "Admission decided: waiting in the ER for a bed in {$ward}.";
                }
            } else {
                $this->closeVisit($db, (int) $v['id'], self::KINDS[$kind]['status'], $kind === 'died' ? $set['died_at'] : $now, (int) $actor['id']);
                $msg = match ($kind) {
                    'home' => 'Discharged home.',
                    'transfer' => "Transferred to {$set['transfer_facility']}.",
                    'or' => 'To the OR on ' . $req['request_number'] . '.',
                    default => 'Died in the ER at ' . substr($set['died_at'], 11, 5) . '.',
                };
            }
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT er_dispo');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT er_dispo');
            error_log('ER disposition failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Could not save: ' . $e->getMessage()];
        }
        $this->closeAlerts($db, (int) $v['id']);
        return ['success' => true, 'message' => $msg, 'data' => (new ErService())->show((int) $v['id'])];
    }

    /** A boarding patient (admission decided, no bed yet) gets a bed. data: id, bed_id */
    public function admitToBed(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::BED_ROLES, true)) {
            return ['success' => false, 'message' => 'Beds are given by the ER nurses and doctors.', 'forbidden' => true];
        }
        $db = Database::connection();
        $v = $this->row($db, (int) ($data['id'] ?? 0));
        if (!$v) {
            return ['success' => false, 'message' => 'ER visit not found.', 'not_found' => true];
        }
        if ($v['disposition'] !== 'admit' || !in_array($v['status'], ['waiting', 'triaged'], true)) {
            return ['success' => false, 'message' => 'This patient is not waiting for an inpatient bed.'];
        }
        $bedId = (int) ($data['bed_id'] ?? 0);
        if (!$this->freeBed($db, $bedId)) {
            return ['success' => false, 'message' => 'That bed is no longer free.', 'errors' => ['bed_id' => 'Not free.']];
        }
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT er_bed');
        try {
            $msg = $this->admitNow($db, (int) $v['id'], $bedId, $actor);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT er_bed');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT er_bed');
            return ['success' => false, 'message' => 'Could not admit: ' . $e->getMessage()];
        }
        $this->closeAlerts($db, (int) $v['id']);
        return ['success' => true, 'message' => $msg, 'data' => (new ErService())->show((int) $v['id'])];
    }

    /** Disposition fields for show(). $v: the er_visits row. */
    public static function shape(array $v): array
    {
        $kind = $v['disposition'] ?? null;
        $details = $v['admit_details'] ? (json_decode($v['admit_details'], true) ?: []) : [];
        return [
            'kind' => $kind, 'label' => $kind ? self::KINDS[$kind]['label'] : null, 'at' => $v['disposition_at'] ?? null,
            'by_name' => $v['disposition_by_name'] ?? null, 'diagnosis' => $v['er_diagnosis'] ?? null, 'notes' => $v['disposition_notes'] ?? null,
            'follow_up' => $v['follow_up'] ?? null,
            'boarding' => $kind === 'admit' && in_array($v['status'], ['waiting', 'triaged'], true),
            'admit_ward' => $v['admit_ward_name'] ?? null, 'admit_ward_id' => isset($v['admit_ward_id']) ? (int) $v['admit_ward_id'] : null,
            'admission_type' => $details['admission_type'] ?? null, 'attending' => $details['attending'] ?? null, 'isolation' => $details['isolation'] ?? null,
            'attending_user_id' => isset($details['attending_user_id']) ? (int) $details['attending_user_id'] : null,
            'admission_id' => isset($v['admission_id']) ? (int) $v['admission_id'] : null, 'admission_number' => $v['admission_number'] ?? null,
            'admitted_at' => $v['admitted_at'] ?? null, 'admitted_bed' => $v['admitted_bed'] ?? null,
            'boarding_minutes' => isset($v['boarding_minutes']) ? (int) $v['boarding_minutes'] : null,
            'transfer_facility' => $v['transfer_facility'] ?? null, 'transfer_reason' => $v['transfer_reason'] ?? null, 'transfer_mode' => $v['transfer_mode'] ?? null,
            'accepting_doctor' => $v['accepting_doctor'] ?? null,
            'surgery_request_id' => isset($v['surgery_request_id']) ? (int) $v['surgery_request_id'] : null, 'surgery_request_number' => $v['surgery_request_number'] ?? null,
            'died_at' => $v['died_at'] ?? null,
        ];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** Create the inpatient admission in the bed and close the visit. Inside the caller's transaction. */
    private function admitNow(PDO $db, int $visitId, int $bedId, array $actor): string
    {
        $v = $this->row($db, $visitId);
        $d = json_decode((string) $v['admit_details'], true) ?: [];
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $adm = (new InpatientAdmissionsService())->admitPatient([
            'bed_id' => $bedId, 'patient_id' => (int) $v['patient_id'], 'admission_date' => $now,
            'admission_source' => 'Emergency Room (ER)', 'admission_type' => $d['admission_type'] ?? 'Emergency / STAT',
            'admitting_diagnosis' => $v['er_diagnosis'] ?: 'See ER record', 'attending_physician' => $d['attending'] ?? 'ER doctor',
            'isolation_precautions' => $d['isolation'] ?? 'Standard',
        ], (int) $actor['id']);
        $db->prepare("UPDATE er_visits SET admission_id = :a, admitted_at = :now, admit_ward_id = :w WHERE id = :id")
            ->execute(['a' => (int) $adm['id'], 'now' => $now, 'w' => (int) $adm['ward_id'], 'id' => $visitId]);
        $this->closeVisit($db, $visitId, 'admitted', $now, (int) $actor['id']);
        return "Admitted: {$adm['admission_number']}, {$adm['ward_name']} bed {$adm['bed_number']}.";
    }

    private function closeVisit(PDO $db, int $visitId, string $status, string $at, int $userId): void
    {
        $db->prepare("UPDATE er_visits SET status = :s, closed_at = :at, closed_by = :u WHERE id = :id")
            ->execute(['s' => $status, 'at' => $at, 'u' => $userId, 'id' => $visitId]);
    }

    private function closeAlerts(PDO $db, int $visitId): void
    {
        (new ErBoardService())->closeAlerts($db, $visitId);
        (new ErProtocolService())->closeVisitAlerts($db, $visitId);
    }

    private function freeBed(PDO $db, int $bedId): ?array
    {
        $st = $db->prepare("SELECT b.* FROM hospital_beds b JOIN hospital_wards w ON w.id = b.ward_id AND w.is_active = 1 WHERE b.id = :id AND b.is_active = 1 AND b.status = 'Available'");
        $st->execute(['id' => $bedId]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function doctorName(PDO $db, int $userId): ?string
    {
        $st = $db->prepare("SELECT " . ErBoardService::nameSql('u.id') . " FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = :id AND u.deleted_at IS NULL AND r.name IN ('doctor', 'clinician')");
        $st->execute(['id' => $userId]);
        return $st->fetchColumn() ?: null;
    }

    private function row(PDO $db, int $id): ?array
    {
        $st = $db->prepare("SELECT * FROM er_visits WHERE id = :id");
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }
}
