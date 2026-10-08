<?php

namespace App\Modules\Displays\Services;

use App\Core\Database;
use App\Modules\InpatientVitals\Services\InpatientVitalsService;
use App\Modules\NursingStaff\Services\NursingShiftService;
use PDO;

/**
 * The room TV (module 9, Phase 2): for the patient in the bed the TV faces.
 *
 *   * Vital signs instead of demographics -- no name, age or diagnosis on the screen: the
 *     latest set (each value flagged low / high), an arrow for how each moved since the set
 *     before, and when the next set is due (a warning once overdue).
 *   * The nurse and CNA for this shift; pain medicine: when it was last given and when the next
 *     dose is allowed (times only, no drug names); allergy and fall-risk icons (no allergy list).
 *   * A Code Blue called on the ward (or with no known place) takes over the screen.
 */
class RoomTvService
{
    /** A move smaller than this is shown as steady. */
    private const TREND_STEP = [
        'bp_systolic' => 5, 'bp_diastolic' => 5, 'heart_rate' => 5, 'resp_rate' => 2, 'temperature_c' => 0.3, 'spo2' => 2, 'pain_score' => 1,
    ];
    /** A Code Blue shows for at most this long unless it is closed sooner. */
    public const CODE_BLUE_MINUTES = 60;

    public function content(array $device): array
    {
        $db = Database::connection();
        $bed = null;
        if ($device['bed_id']) {
            $b = $db->prepare("SELECT b.id, b.ward_id, b.room_number, b.bed_number, w.ward_name FROM hospital_beds b JOIN hospital_wards w ON w.id = b.ward_id WHERE b.id = :id");
            $b->execute(['id' => $device['bed_id']]);
            $bed = $b->fetch(PDO::FETCH_ASSOC) ?: null;
        }
        $place = ['ward' => $bed['ward_name'] ?? null, 'room' => $bed['room_number'] ?? null, 'bed' => $bed['bed_number'] ?? null];
        $adm = null;
        if ($bed) {
            $a = $db->prepare(
                "SELECT id, patient_id, fall_risk, fall_risk_score FROM inpatient_admissions
                 WHERE bed_id = :b AND status IN ('Admitted', 'Pending Discharge') ORDER BY id DESC LIMIT 1"
            );
            $a->execute(['b' => $bed['id']]);
            $adm = $a->fetch(PDO::FETCH_ASSOC) ?: null;
        }
        if (!$adm) {
            return ['occupied' => false, 'place' => $place];
        }
        $admissionId = (int) $adm['id'];
        $vitals = new InpatientVitalsService();
        $sum = $vitals->summaries([$admissionId])[$admissionId] ?? null;
        $sets = array_values(array_filter($vitals->history($admissionId, 0)['sets'], fn($s) => $s['voided_at'] === null));
        $latest = $sets ? $sets[count($sets) - 1] : null;
        $prev = count($sets) > 1 ? $sets[count($sets) - 2] : null;

        $team = (new NursingShiftService())->forAdmission($admissionId);
        $pain = $team['pain_medicine'] ?? null;

        $allergies = 0;
        if ($adm['patient_id']) {
            $q = $db->prepare("SELECT COUNT(*) FROM patient_allergies WHERE patient_id = :p AND deleted_at IS NULL AND (end_date IS NULL OR end_date >= CURDATE())");
            $q->execute(['p' => $adm['patient_id']]);
            $allergies = (int) $q->fetchColumn();
        }

        return [
            'occupied' => true, 'place' => $place,
            'vitals' => [
                'latest' => $latest ? $this->vitalsOut($latest, $prev) : null,
                'previous_at' => $prev['taken_at'] ?? null,
                'state' => $sum['status']['state'] ?? null, 'next_due' => $sum['status']['next_due'] ?? null,
                'minutes_late' => ($sum['status']['state'] ?? null) === 'overdue' ? (int) $sum['status']['minutes'] : 0,
                'every_hours' => $sum['schedule']['every_hours'] ?? null,
            ],
            'team' => [
                'shift' => $team['shift']['shift']['name'] ?? null,
                'nurse' => $team['team']['nurse_name'] ?? null, 'cna' => $team['team']['cna_name'] ?? null,
            ],
            // Times only: no drug names on the room's screen.
            'pain' => $pain ? [
                'last_given_at' => $pain['last']['given_at'] ?? null,
                'next_allowed_at' => $pain['next_allowed_at'] ?? null,
                'available_now' => (bool) ($pain['available_now'] ?? false),
                'has_orders' => !empty($pain['orders']),
            ] : null,
            'safety' => [
                'allergy' => $allergies > 0,
                'fall_risk' => $adm['fall_risk'],
            ],
        ];
    }

    /** The newest Code Blue still open, called on this ward (or with no known place). */
    public function codeBlue(?int $wardId, ?int $bedId = null): ?array
    {
        $db = Database::connection();
        $rows = $db->query(
            "SELECT a.id, a.title, a.patient_id, a.created_at FROM alerts a
             WHERE a.alert_type = 'code_blue' AND a.resolved_at IS NULL AND a.created_at >= NOW() - INTERVAL " . self::CODE_BLUE_MINUTES . " MINUTE
             ORDER BY a.id DESC LIMIT 10"
        )->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $r) {
            $loc = null;
            if ($r['patient_id']) {
                $s = $db->prepare(
                    "SELECT a.ward_id, a.bed_id, w.ward_name, b.room_number, b.bed_number FROM inpatient_admissions a
                     JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id
                     WHERE a.patient_id = :p AND a.status IN ('Admitted', 'Pending Discharge') ORDER BY a.id DESC LIMIT 1"
                );
                $s->execute(['p' => $r['patient_id']]);
                $loc = $s->fetch(PDO::FETCH_ASSOC) ?: null;
            }
            if ($loc && $wardId && (int) $loc['ward_id'] !== $wardId) {
                continue;   // another ward's code
            }
            return [
                'id' => (int) $r['id'], 'called_at' => $r['created_at'],
                // A patient's code: the place only. No patient: the place written in the alert.
                'location' => $loc ? trim("{$loc['ward_name']} · {$loc['room_number']} · Bed {$loc['bed_number']}")
                    : ($r['patient_id'] ? 'Code Blue called' : self::placeFromTitle($r['title'])),
                'here' => $loc && $bedId && (int) $loc['bed_id'] === $bedId,
            ];
        }
        return null;
    }

    private function vitalsOut(array $v, ?array $prev): array
    {
        $out = ['taken_at' => $v['taken_at'], 'flags' => $v['flags'], 'on_oxygen' => $v['on_oxygen'], 'oxygen_lpm' => $v['oxygen_lpm'], 'trends' => []];
        foreach (['bp_systolic', 'bp_diastolic', 'heart_rate', 'resp_rate', 'temperature_c', 'spo2', 'pain_score'] as $f) {
            $out[$f] = $v[$f];
            if ($prev && $v[$f] !== null && $prev[$f] !== null) {
                $d = $v[$f] - $prev[$f];
                $out['trends'][$f] = abs($d) < self::TREND_STEP[$f] ? 'steady' : ($d > 0 ? 'up' : 'down');
            }
        }
        return $out;
    }

    /** "CODE BLUE — Main lobby" -> "Main lobby" (a code with no patient: the alert names the place). */
    private static function placeFromTitle(?string $title): string
    {
        $t = trim((string) preg_replace('/^\s*code\s*blue\s*[:—–-]*\s*/iu', '', (string) $title));
        return $t !== '' ? mb_substr($t, 0, 120) : 'Code Blue called';
    }
}
