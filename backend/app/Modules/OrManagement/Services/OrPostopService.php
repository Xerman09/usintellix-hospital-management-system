<?php

namespace App\Modules\OrManagement\Services;

use App\Core\Database;
use App\Modules\PatientPrescriptions\Services\PrescriptionService;
use PDO;
use Throwable;

/**
 * After the surgery (Surgery Phase 5).
 *
 *   * Recovery room (PACU): readings over time -- vitals, pain (0-10),
 *     nausea and the modified Aldrete score -- and the release criteria:
 *     Aldrete 9 or more, pain 4 or less, no nausea, SpO2 92% or more and at
 *     least 30 minutes in recovery. A release with criteria not met needs
 *     a reason.
 *   * Release: to a ward / ICU bed (the patient's open admission moves to
 *     that bed, or a new admission is made, source "Post-Op PACU"), home,
 *     or another facility. The case becomes Transferred / Discharged and
 *     the surgery goes into the patient's surgical history.
 *   * Operative report: written by the team, signed by the surgeon (lead
 *     or assistant) and then locked; corrections are addenda. Printable
 *     with the hospital header.
 */
class OrPostopService
{
    public const ROLES = OrSchedulingService::ROLES;

    /** Modified Aldrete score: five parts, 0-2 each. */
    public const ALDRETE = [
        'activity' => ['label' => 'Activity', 'options' => [2 => 'Moves 4 limbs', 1 => 'Moves 2 limbs', 0 => 'Moves no limbs']],
        'respiration' => ['label' => 'Breathing', 'options' => [2 => 'Breathes deeply, coughs freely', 1 => 'Short of breath or limited breathing', 0 => 'Apneic']],
        'circulation' => ['label' => 'Circulation', 'options' => [2 => 'BP within 20% of pre-op', 1 => 'BP within 20-50% of pre-op', 0 => 'BP more than 50% from pre-op']],
        'consciousness' => ['label' => 'Consciousness', 'options' => [2 => 'Fully awake', 1 => 'Arousable when called', 0 => 'Not responding']],
        'oxygen' => ['label' => 'Oxygen saturation', 'options' => [2 => 'SpO2 above 92% on room air', 1 => 'Needs oxygen to keep SpO2 above 90%', 0 => 'SpO2 below 90% even with oxygen']]
    ];

    public const MIN_ALDRETE = 9;
    public const MAX_PAIN = 4;
    public const MIN_SPO2 = 92;
    public const MIN_PACU_MINUTES = 30;

    public const CONDITIONS = ['Stable', 'Fair', 'Guarded', 'Critical'];

    private const VITAL_RANGES = [
        'heart_rate' => [20, 300, 'Heart rate'], 'bp_systolic' => [30, 300, 'Systolic BP'], 'bp_diastolic' => [10, 200, 'Diastolic BP'],
        'spo2' => [30, 100, 'SpO2'], 'resp_rate' => [0, 80, 'Respiratory rate'], 'temperature' => [25, 45, 'Temperature']
    ];

    private const REPORT_TEXT = [
        'preop_diagnosis' => 500, 'postop_diagnosis' => 500, 'procedure_performed' => 500, 'indications' => 5000, 'findings' => 10000,
        'technique' => 20000, 'complications' => 5000, 'drains' => 500, 'postop_plan' => 5000
    ];

    /* ---------------------------------------------------------------
     * For the case record
     * ------------------------------------------------------------- */

    /** Recovery readings, release criteria, release, the operative report and the beds to release to. */
    public function summary(array $case): array
    {
        $caseId = (int) $case['id'];
        $observations = $this->observations($caseId);
        $report = $this->report($case);
        $stage = $case['perioperative_stage'];

        $release = null;
        if ($case['pacu_discharge_time']) {
            $stmt = Database::connection()->prepare(
                "SELECT a.admission_number, a.status, w.ward_name, b.bed_number FROM inpatient_admissions a
                 JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id WHERE a.id = :id"
            );
            $stmt->execute(['id' => (int) $case['admission_id']]);
            $release = [
                'at' => $case['pacu_discharge_time'], 'by_name' => self::userName((int) $case['released_by']), 'destination' => $case['release_destination'],
                'disposition' => $case['postop_disposition'], 'override_reason' => $case['release_override_reason'], 'notes' => $case['release_notes'],
                'admission' => $case['admission_id'] ? ($stmt->fetch(PDO::FETCH_ASSOC) ?: null) : null,
                'history_added' => $case['patient_surgery_id'] !== null
            ];
        }

        return [
            'aldrete' => self::ALDRETE,
            'thresholds' => ['aldrete' => self::MIN_ALDRETE, 'pain' => self::MAX_PAIN, 'spo2' => self::MIN_SPO2, 'minutes' => self::MIN_PACU_MINUTES],
            'observations' => $observations,
            'criteria' => $this->criteria($case, $observations),
            'can_observe' => $stage === 'In PACU',
            'can_release' => $stage === 'In PACU',
            'release' => $release,
            'report' => $report,
            'conditions' => self::CONDITIONS,
            'release_options' => $stage === 'In PACU' ? $this->releaseOptions($case) : null
        ];
    }

    /** For the board: the latest Aldrete and pain, and how many release criteria are met. */
    public function recoveryStatus(array $case): array
    {
        $observations = $this->observations((int) $case['id']);
        $criteria = $this->criteria($case, $observations);
        $last = fn(string $f) => array_values(array_filter(array_column($observations, $f), fn($v) => $v !== null));
        $aldrete = $last('aldrete_total');
        $pain = $last('pain_score');
        return [
            'aldrete' => $aldrete ? end($aldrete) : null,
            'pain' => $pain ? end($pain) : null,
            'readings' => count($observations),
            'criteria_met' => count(array_filter($criteria, fn($c) => $c['met'])),
            'criteria_total' => count($criteria),
            'unmet' => array_values(array_map(fn($c) => $c['label'], array_filter($criteria, fn($c) => !$c['met'])))
        ];
    }

    private function observations(int $caseId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT o.*, " . self::userNameSql('o.created_by') . " AS recorded_by FROM or_pacu_observations o
             WHERE o.case_id = :c AND o.removed_at IS NULL ORDER BY o.recorded_at, o.id"
        );
        $stmt->execute(['c' => $caseId]);
        $int = fn($v) => $v === null ? null : (int) $v;
        return array_map(fn($o) => [
            'id' => (int) $o['id'], 'recorded_at' => $o['recorded_at'], 'heart_rate' => $int($o['heart_rate']), 'bp_systolic' => $int($o['bp_systolic']),
            'bp_diastolic' => $int($o['bp_diastolic']), 'spo2' => $int($o['spo2']), 'resp_rate' => $int($o['resp_rate']),
            'temperature' => $o['temperature'] !== null ? (float) $o['temperature'] : null, 'pain_score' => $int($o['pain_score']),
            'nausea' => $o['nausea'] === null ? null : (bool) $o['nausea'],
            'aldrete' => $o['aldrete_total'] === null ? null : [
                'activity' => (int) $o['aldrete_activity'], 'respiration' => (int) $o['aldrete_respiration'], 'circulation' => (int) $o['aldrete_circulation'],
                'consciousness' => (int) $o['aldrete_consciousness'], 'oxygen' => (int) $o['aldrete_oxygen']
            ],
            'aldrete_total' => $int($o['aldrete_total']), 'notes' => $o['notes'], 'recorded_by' => $o['recorded_by']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** Each release criterion from the latest reading of it: {key, label, met, detail}. */
    public function criteria(array $case, array $observations): array
    {
        $latest = function (string $field) use ($observations) {
            for ($i = count($observations) - 1; $i >= 0; $i--) {
                if ($observations[$i][$field] !== null) {
                    return $observations[$i];
                }
            }
            return null;
        };
        $at = fn($o) => $o ? ' (' . date('g:i A', strtotime($o['recorded_at'])) . ')' : '';

        $a = $latest('aldrete_total');
        $p = $latest('pain_score');
        $n = $latest('nausea');
        $s = $latest('spo2');
        $minutes = $case['actual_out_room_time'] ? (int) floor((time() - strtotime($case['actual_out_room_time'])) / 60) : null;
        if ($case['pacu_discharge_time'] && $case['actual_out_room_time']) {
            $minutes = (int) floor((strtotime($case['pacu_discharge_time']) - strtotime($case['actual_out_room_time'])) / 60);
        }

        return [
            ['key' => 'aldrete', 'label' => 'Aldrete score ' . self::MIN_ALDRETE . ' or more', 'met' => $a && $a['aldrete_total'] >= self::MIN_ALDRETE,
                'detail' => $a ? "Last: {$a['aldrete_total']}/10" . $at($a) : 'Not scored yet'],
            ['key' => 'pain', 'label' => 'Pain ' . self::MAX_PAIN . '/10 or less', 'met' => $p && $p['pain_score'] <= self::MAX_PAIN,
                'detail' => $p ? "Last: {$p['pain_score']}/10" . $at($p) : 'Not recorded yet'],
            ['key' => 'nausea', 'label' => 'No nausea or vomiting', 'met' => $n && $n['nausea'] === false,
                'detail' => $n ? ($n['nausea'] ? 'Nauseated' : 'None') . $at($n) : 'Not recorded yet'],
            ['key' => 'spo2', 'label' => 'SpO₂ ' . self::MIN_SPO2 . '% or more', 'met' => $s && $s['spo2'] >= self::MIN_SPO2,
                'detail' => $s ? "Last: {$s['spo2']}%" . $at($s) : 'Not recorded yet'],
            ['key' => 'time', 'label' => 'At least ' . self::MIN_PACU_MINUTES . ' minutes in recovery', 'met' => $minutes !== null && $minutes >= self::MIN_PACU_MINUTES,
                'detail' => $minutes !== null ? "{$minutes} min so far" : 'Arrival time not recorded']
        ];
    }

    /* ---------------------------------------------------------------
     * Recovery readings
     * ------------------------------------------------------------- */

    /** data: case_id, recorded_at?, vitals?, pain_score?, nausea? (0/1), aldrete {activity, respiration, circulation, consciousness, oxygen}?, notes? */
    public function addObservation(array $data, int $userId): array
    {
        $caseId = (int) ($data['case_id'] ?? 0);
        $case = $this->caseRow($caseId);
        if (!$case) {
            return ['success' => false, 'message' => 'Surgical case not found.', 'not_found' => true];
        }
        if ($case['perioperative_stage'] !== 'In PACU') {
            return ['success' => false, 'message' => $case['perioperative_stage'] === 'Transferred / Discharged'
                ? 'The patient was already released from recovery.' : 'Recovery readings start once the patient is out of the room (In PACU).'];
        }

        $errors = [];
        $row = [];
        foreach (self::VITAL_RANGES as $k => [$min, $max, $label]) {
            $v = $data[$k] ?? null;
            if ($v === null || $v === '') {
                $row[$k] = null;
                continue;
            }
            if (!is_numeric($v) || (float) $v < $min || (float) $v > $max) {
                $errors[$k] = "{$label}: {$min} to {$max}.";
                continue;
            }
            $row[$k] = $k === 'temperature' ? round((float) $v, 1) : (int) round((float) $v);
        }
        if (!isset($errors['bp_diastolic']) && ($row['bp_systolic'] ?? null) !== null && ($row['bp_diastolic'] ?? null) !== null && $row['bp_diastolic'] >= $row['bp_systolic']) {
            $errors['bp_diastolic'] = 'The diastolic must be lower than the systolic.';
        }

        $pain = $data['pain_score'] ?? null;
        $row['pain_score'] = null;
        if ($pain !== null && $pain !== '') {
            if (!preg_match('/^\d{1,2}$/', (string) $pain) || (int) $pain > 10) {
                $errors['pain_score'] = 'Pain is 0 to 10.';
            } else {
                $row['pain_score'] = (int) $pain;
            }
        }
        $nausea = $data['nausea'] ?? null;
        $row['nausea'] = $nausea === null || $nausea === '' ? null : (in_array($nausea, [1, '1', true, 'true', 'yes'], true) ? 1 : 0);

        // Aldrete: all five parts or none.
        $parts = is_array($data['aldrete'] ?? null) ? $data['aldrete'] : [];
        $given = array_filter(array_keys(self::ALDRETE), fn($k) => isset($parts[$k]) && $parts[$k] !== '' && $parts[$k] !== null);
        $total = null;
        foreach (array_keys(self::ALDRETE) as $k) {
            $row["aldrete_{$k}"] = null;
        }
        if ($given) {
            if (count($given) < count(self::ALDRETE)) {
                $errors['aldrete'] = 'Score all five parts of the Aldrete score (or none).';
            } else {
                $total = 0;
                foreach (array_keys(self::ALDRETE) as $k) {
                    $v = $parts[$k];
                    if (!in_array((string) $v, ['0', '1', '2'], true)) {
                        $errors['aldrete'] = 'Each Aldrete part is 0, 1 or 2.';
                        break;
                    }
                    $row["aldrete_{$k}"] = (int) $v;
                    $total += (int) $v;
                }
            }
        }
        $row['aldrete_total'] = isset($errors['aldrete']) ? null : $total;

        $at = date('Y-m-d H:i:s');
        if (!empty($data['recorded_at'])) {
            $at = OrLiveService::validDateTime((string) $data['recorded_at']);
            if ($at === null) {
                $errors['recorded_at'] = 'Enter a valid time.';
            } elseif ($at > date('Y-m-d H:i:s', time() + 60)) {
                $errors['recorded_at'] = 'That time is in the future.';
            } elseif ($case['actual_out_room_time'] && $at < $case['actual_out_room_time']) {
                $errors['recorded_at'] = 'That is before the patient came out of the room (' . date('g:i A', strtotime($case['actual_out_room_time'])) . ').';
            }
        }
        if (!$errors && !array_filter($row, fn($v) => $v !== null)) {
            return ['success' => false, 'message' => 'Enter at least one reading.'];
        }
        if ($errors) {
            return ['success' => false, 'message' => 'Check the readings.', 'errors' => $errors];
        }

        $cols = array_keys($row);
        Database::connection()->prepare(
            "INSERT INTO or_pacu_observations (case_id, recorded_at, " . implode(', ', $cols) . ", notes, created_at, created_by)
             VALUES (:case_id, :recorded_at, :" . implode(', :', $cols) . ", :notes, :now, :u)"
        )->execute($row + ['case_id' => $caseId, 'recorded_at' => $at, 'notes' => self::text($data['notes'] ?? null, 255), 'now' => date('Y-m-d H:i:s'), 'u' => $userId ?: null]);

        return ['success' => true, 'message' => 'Recovery reading recorded' . ($total !== null ? " (Aldrete {$total}/10)" : '') . '.'];
    }

    public function removeObservation(int $id, int $userId): array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT c.perioperative_stage FROM or_pacu_observations o JOIN or_surgical_cases c ON c.id = o.case_id WHERE o.id = :id AND o.removed_at IS NULL"
        );
        $stmt->execute(['id' => $id]);
        $stage = $stmt->fetchColumn();
        if ($stage === false) {
            return ['success' => false, 'message' => 'That reading was already removed.', 'not_found' => true];
        }
        if ($stage !== 'In PACU') {
            return ['success' => false, 'message' => 'The patient was released; recovery readings are now part of the record.'];
        }
        $db->prepare("UPDATE or_pacu_observations SET removed_at = NOW(), removed_by = :u WHERE id = :id")->execute(['u' => $userId ?: null, 'id' => $id]);
        return ['success' => true, 'message' => 'Reading removed.'];
    }

    /* ---------------------------------------------------------------
     * Release from recovery
     * ------------------------------------------------------------- */

    /** Wards with their available beds, and the patient's open admission. */
    public function releaseOptions(array $case): array
    {
        $db = Database::connection();
        $beds = $db->query(
            "SELECT b.id, b.bed_number, b.room_number, b.bed_type, w.id AS ward_id, w.ward_name, w.ward_type, w.gender_restriction
             FROM hospital_beds b JOIN hospital_wards w ON w.id = b.ward_id AND w.is_active = 1
             WHERE b.is_active = 1 AND b.status = 'Available' ORDER BY w.ward_type = 'ICU', w.ward_name, b.bed_number"
        )->fetchAll(PDO::FETCH_ASSOC);
        $admission = $this->openAdmission((int) $case['patient_id']);

        return [
            'beds' => array_map(fn($b) => $b + ['id' => (int) $b['id'], 'ward_id' => (int) $b['ward_id']], $beds),
            'open_admission' => $admission ? [
                'id' => (int) $admission['id'], 'admission_number' => $admission['admission_number'], 'ward_name' => $admission['ward_name'],
                'bed_id' => (int) $admission['bed_id'], 'bed_number' => $admission['bed_number']
            ] : null
        ];
    }

    private function openAdmission(int $patientId, bool $lock = false): ?array
    {
        if (!$patientId) {
            return null;
        }
        $stmt = Database::connection()->prepare(
            "SELECT a.*, w.ward_name, b.bed_number FROM inpatient_admissions a
             JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id
             WHERE a.patient_id = :p AND a.status IN ('Admitted', 'Pending Discharge') ORDER BY a.id DESC LIMIT 1" . ($lock ? ' FOR UPDATE' : '')
        );
        $stmt->execute(['p' => $patientId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * data: destination (bed | home | facility), bed_id (bed), facility
     * (facility), override_reason (criteria not met), notes?, at? (when,
     * if recorded late).
     */
    public function release(int $caseId, array $data, array $user): array
    {
        $userId = (int) $user['id'];
        $destination = (string) ($data['destination'] ?? '');
        if (!in_array($destination, ['bed', 'home', 'facility'], true)) {
            return ['success' => false, 'message' => 'Choose where the patient goes.', 'errors' => ['destination' => 'Choose one.']];
        }
        $notes = self::text($data['notes'] ?? null, 500);

        $db = Database::connection();
        $owns = $this->begin($db);
        try {
            $fail = function (string $message, array $errors = [], array $extra = []) use ($db, $owns) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $message, 'errors' => $errors ?: null] + $extra;
            };
            $stmt = $db->prepare("SELECT * FROM or_surgical_cases WHERE id = :id FOR UPDATE");
            $stmt->execute(['id' => $caseId]);
            $case = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$case) {
                return $fail('Surgical case not found.', [], ['not_found' => true]);
            }
            if ($case['perioperative_stage'] !== 'In PACU') {
                return $fail($case['perioperative_stage'] === 'Transferred / Discharged' ? "{$case['case_number']} was already released." : 'Only a patient in recovery (In PACU) can be released.');
            }

            // Release criteria: unmet ones need a reason.
            $observations = $this->observations($caseId);
            $unmet = array_values(array_filter($this->criteria($case, $observations), fn($c) => !$c['met']));
            $override = self::text($data['override_reason'] ?? null, 255);
            if ($unmet && $override === null) {
                return $fail('Not all release criteria are met: ' . implode('; ', array_map(fn($c) => "{$c['label']} ({$c['detail']})", $unmet)) . '. Give the reason to release anyway.',
                    ['override_reason' => 'Needed when criteria are not met.'], ['unmet' => array_column($unmet, 'key')]);
            }

            $admissionId = null;
            $releaseDest = $destination;
            $disposition = null;
            $message = '';
            if ($destination === 'bed') {
                $bedId = (int) ($data['bed_id'] ?? 0);
                $stmt = $db->prepare(
                    "SELECT b.*, w.ward_name, w.ward_type, w.is_active AS ward_active FROM hospital_beds b JOIN hospital_wards w ON w.id = b.ward_id WHERE b.id = :id FOR UPDATE"
                );
                $stmt->execute(['id' => $bedId]);
                $bed = $stmt->fetch(PDO::FETCH_ASSOC);
                $admission = $this->openAdmission((int) $case['patient_id'], true);
                $sameBed = $bed && $admission && (int) $admission['bed_id'] === (int) $bed['id'];
                if (!$bed || !(int) $bed['is_active'] || !(int) $bed['ward_active']) {
                    return $fail('Choose the bed the patient goes to.', ['bed_id' => 'Choose a bed.']);
                }
                if (!$sameBed && $bed['status'] !== 'Available') {
                    return $fail("Bed {$bed['bed_number']} is {$bed['status']}. Choose another bed.", ['bed_id' => 'Not available.']);
                }
                $releaseDest = $bed['ward_type'] === 'ICU' ? 'icu' : 'ward';
                $disposition = ($releaseDest === 'icu' ? 'ICU' : 'Ward') . ": {$bed['ward_name']}, bed {$bed['bed_number']}";

                if ($admission) {
                    $admissionId = (int) $admission['id'];
                    if (!$sameBed) {
                        $db->prepare(
                            "INSERT INTO inpatient_transfers (admission_id, patient_id, from_ward_id, from_bed_id, to_ward_id, to_bed_id, transfer_time, transfer_reason, transfer_notes, transferred_by)
                             VALUES (:a, :p, :fw, :fb, :tw, :tb, NOW(), :r, :n, :by)"
                        )->execute(['a' => $admissionId, 'p' => $admission['patient_id'], 'fw' => $admission['ward_id'], 'fb' => $admission['bed_id'],
                            'tw' => $bed['ward_id'], 'tb' => $bed['id'], 'r' => "Post-op from {$case['case_number']}", 'n' => $notes, 'by' => self::userName($userId)]);
                        $db->prepare("UPDATE hospital_beds SET status = 'Dirty / Turnover', current_admission_id = NULL, updated_at = NOW() WHERE id = :id")
                            ->execute(['id' => $admission['bed_id']]);
                        $db->prepare("UPDATE hospital_beds SET status = 'Occupied', current_admission_id = :a, updated_at = NOW() WHERE id = :id")
                            ->execute(['a' => $admissionId, 'id' => $bed['id']]);
                        $db->prepare("UPDATE inpatient_admissions SET ward_id = :w, bed_id = :b, updated_at = NOW() WHERE id = :id")
                            ->execute(['w' => $bed['ward_id'], 'b' => $bed['id'], 'id' => $admissionId]);
                        $message = " Admission {$admission['admission_number']} moved to {$bed['ward_name']}, bed {$bed['bed_number']}.";
                    } else {
                        $message = " Back to bed {$bed['bed_number']} under admission {$admission['admission_number']}.";
                    }
                } else {
                    $admissionId = $this->admit($db, $case, $bed, $userId);
                    $stmt = $db->prepare("SELECT admission_number FROM inpatient_admissions WHERE id = :id");
                    $stmt->execute(['id' => $admissionId]);
                    $message = ' Admitted (' . $stmt->fetchColumn() . ") to {$bed['ward_name']}, bed {$bed['bed_number']}.";
                }
            } elseif ($destination === 'home') {
                $disposition = 'Home (same-day)';
                $open = $this->openAdmission((int) $case['patient_id']);
                if ($open) {
                    $message = " Note: admission {$open['admission_number']} is still open; discharge it under Inpatient Admissions.";
                }
            } else {
                $facility = self::text($data['facility'] ?? null, 80);
                if ($facility === null) {
                    return $fail('Enter the facility the patient is transferred to.', ['facility' => 'Enter the facility.']);
                }
                $disposition = "Transferred to {$facility}";
            }

            $latestAldrete = null;
            foreach (array_reverse($observations) as $o) {
                if ($o['aldrete_total'] !== null) {
                    $latestAldrete = $o['aldrete_total'];
                    break;
                }
            }
            $moved = (new OrLiveService())->move($caseId, [
                'stage' => 'Transferred / Discharged', 'at' => $data['at'] ?? null, 'pacu_aldrete_score' => $latestAldrete, 'postop_disposition' => $disposition
            ], $userId, true);
            if (!$moved['success']) {
                return $fail($moved['message'], $moved['errors'] ?? []);
            }

            $db->prepare(
                "UPDATE or_surgical_cases SET released_by = :u, release_destination = :d, release_override_reason = :o, release_notes = :n, admission_id = :a WHERE id = :id"
            )->execute(['u' => $userId, 'd' => $releaseDest, 'o' => $unmet ? $override : null, 'n' => $notes, 'a' => $admissionId, 'id' => $caseId]);

            $historyAdded = $this->addToHistory($db, $caseId, $userId);
            (new OrSchedulingService())->log($caseId, 'released', ['destination' => $releaseDest, 'disposition' => $disposition,
                'unmet' => array_column($unmet, 'label'), 'admission_id' => $admissionId], $unmet ? $override : null, $userId);

            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => "{$case['case_number']} released from recovery: {$disposition}." . $message
            . ($historyAdded ? ' Added to the surgical history.' : '')];
    }

    /** A new admission from recovery; returns its id. Inside the caller's transaction, the bed already locked. */
    private function admit(PDO $db, array $case, array $bed, int $userId): int
    {
        $types = ['Elective' => 'Elective', 'Urgent' => 'Urgent', 'Emergency / STAT' => 'Emergency / STAT'];
        $stmt = $db->prepare("SELECT postop_diagnosis FROM or_operative_reports WHERE case_id = :c");
        $stmt->execute(['c' => $case['id']]);
        $diagnosis = $stmt->fetchColumn() ?: ($case['postop_diagnosis'] ?: ($case['preop_diagnosis'] ?: "Post-op: {$case['procedure_name']}"));

        $year = date('Y');
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $stmt = $db->prepare(
                "SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(admission_number, '-', -1) AS UNSIGNED)), 0) FROM inpatient_admissions WHERE admission_number LIKE :p"
            );
            $stmt->execute(['p' => "ADM-{$year}-%"]);
            $number = sprintf('ADM-%s-%04d', $year, (int) $stmt->fetchColumn() + 1 + $attempt);
            try {
                $db->exec('SAVEPOINT or_admit');
                $db->prepare(
                    "INSERT INTO inpatient_admissions (admission_number, patient_id, patient_name, patient_mrn, patient_age, gender, ward_id, bed_id, admission_date,
                            admission_source, admission_type, admitting_diagnosis, attending_physician, primary_nurse, isolation_precautions, status, created_by)
                     VALUES (:n, :p, :name, :mrn, :age, :g, :w, :b, NOW(), 'Post-Op PACU / Surgical', :t, :dx, :doc, NULL, 'Standard', 'Admitted', :u)"
                )->execute([
                    'n' => $number, 'p' => $case['patient_id'], 'name' => $case['patient_name'], 'mrn' => $case['patient_mrn'], 'age' => $case['patient_age'],
                    'g' => $case['gender'], 'w' => $bed['ward_id'], 'b' => $bed['id'], 't' => $types[$case['case_priority']] ?? 'Elective',
                    'dx' => mb_substr($diagnosis, 0, 255), 'doc' => $case['lead_surgeon'], 'u' => $userId
                ]);
                $id = (int) $db->lastInsertId();
                $db->exec('RELEASE SAVEPOINT or_admit');
                $db->prepare("UPDATE hospital_beds SET status = 'Occupied', current_admission_id = :a, updated_at = NOW() WHERE id = :id")
                    ->execute(['a' => $id, 'id' => $bed['id']]);
                return $id;
            } catch (\PDOException $e) {
                $db->exec('ROLLBACK TO SAVEPOINT or_admit');
                if ($e->getCode() !== '23000' || !str_contains($e->getMessage(), 'admission_number') || $attempt === 4) {
                    throw $e;
                }
            }
        }
        throw new \RuntimeException('Could not number the admission.');
    }

    /** The completed surgery in the patient's surgical history (once per case). True if a row was added. */
    private function addToHistory(PDO $db, int $caseId, int $userId): bool
    {
        $stmt = $db->prepare(
            "SELECT c.*, r.procedure_performed AS report_procedure, r.postop_diagnosis AS report_dx, r.complications_none, r.status AS report_status
             FROM or_surgical_cases c JOIN patients p ON p.id = c.patient_id
             LEFT JOIN or_operative_reports r ON r.case_id = c.id WHERE c.id = :id"
        );
        $stmt->execute(['id' => $caseId]);
        $c = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$c || $c['patient_surgery_id']) {
            return false;
        }
        $row = self::historyRow($c);
        $db->prepare(
            "INSERT IGNORE INTO patient_surgeries (patient_id, surgery_id, or_case_id, title, begin_date, end_date, comments, outcome, verification_status, created_at, created_by)
             VALUES (:p, :s, :c, :t, :d, :d2, :cm, :o, 'Confirmed', NOW(), :u)"
        )->execute(['p' => $c['patient_id'], 's' => $c['surgery_id'], 'c' => $caseId, 't' => $row['title'], 'd' => $row['date'], 'd2' => $row['date'],
            'cm' => $row['comments'], 'o' => $row['outcome'], 'u' => $userId ?: null]);
        $id = (int) $db->lastInsertId();
        if (!$id) {
            return false;
        }
        $db->prepare("UPDATE or_surgical_cases SET patient_surgery_id = :h WHERE id = :id")->execute(['h' => $id, 'id' => $caseId]);
        return true;
    }

    private static function historyRow(array $c): array
    {
        $title = $c['report_procedure'] ?: ($c['procedure_performed'] ?: $c['procedure_name']);
        if ($c['laterality'] && stripos($title, $c['laterality']) === false) {
            $title .= " ({$c['laterality']})";
        }
        $date = $c['actual_incision_time'] ? substr($c['actual_incision_time'], 0, 10) : $c['scheduled_date'];
        $dx = $c['report_dx'] ?: $c['postop_diagnosis'];
        return [
            'title' => mb_substr($title, 0, 255),
            'date' => $date,
            'comments' => mb_substr("OR case {$c['case_number']} · {$c['lead_surgeon']} · {$c['or_suite_name']}" . ($dx ? " · Post-op diagnosis: {$dx}" : ''), 0, 2000),
            'outcome' => $c['report_status'] === 'signed' && !(int) $c['complications_none'] ? 'Completed with complications' : 'Completed'
        ];
    }

    /* ---------------------------------------------------------------
     * Operative report
     * ------------------------------------------------------------- */

    private const REPORT_STAGES = ['Closing / Extubation', 'In PACU', 'Transferred / Discharged'];

    /** The saved report, or a draft filled in from the case. */
    private function report(array $case): array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT r.*, " . self::userNameSql('r.signed_by') . " AS signed_by_name, " . self::userNameSql('r.updated_by') . " AS updated_by_name
             FROM or_operative_reports r WHERE r.case_id = :c"
        );
        $stmt->execute(['c' => $case['id']]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        $addenda = [];
        if ($r) {
            $stmt = $db->prepare("SELECT a.body, a.created_at, " . self::userNameSql('a.created_by') . " AS by_name FROM or_operative_report_addenda a WHERE a.report_id = :r ORDER BY a.id");
            $stmt->execute(['r' => $r['id']]);
            $addenda = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        $surgeons = array_values(array_filter([(int) $case['lead_surgeon_user_id'], (int) $case['assistant_surgeon_user_id']]));

        return [
            'exists' => (bool) $r,
            'status' => $r['status'] ?? 'new',
            'revision' => (int) ($r['revision'] ?? 0),
            'fields' => [
                'preop_diagnosis' => $r['preop_diagnosis'] ?? $case['preop_diagnosis'],
                'postop_diagnosis' => $r['postop_diagnosis'] ?? ($case['postop_diagnosis'] ?: $case['preop_diagnosis']),
                'procedure_performed' => $r['procedure_performed'] ?? ($case['procedure_performed'] ?: $case['procedure_name'] . ($case['laterality'] ? " ({$case['laterality']})" : '')),
                'indications' => $r['indications'] ?? null,
                'findings' => $r['findings'] ?? null,
                'technique' => $r['technique'] ?? null,
                'complications_none' => $r ? (bool) $r['complications_none'] : true,
                'complications' => $r['complications'] ?? null,
                'drains' => $r['drains'] ?? null,
                'condition_at_end' => $r['condition_at_end'] ?? 'Stable',
                'postop_plan' => $r['postop_plan'] ?? null
            ],
            'signed_at' => $r['signed_at'] ?? null,
            'signed_by_name' => $r['signed_by_name'] ?? null,
            'updated_at' => $r['updated_at'] ?? null,
            'updated_by_name' => $r['updated_by_name'] ?? null,
            'addenda' => $addenda,
            'can_edit' => in_array($case['perioperative_stage'], self::REPORT_STAGES, true) && ($r['status'] ?? 'draft') !== 'signed',
            'surgeon_user_ids' => $surgeons,
            'opens_at' => 'Closing'
        ];
    }

    /** Save the draft. data: revision, the REPORT_TEXT fields, complications_none, condition_at_end. Doctors and admin. */
    public function saveReport(int $caseId, array $data, array $user): array
    {
        if (!in_array($user['role'] ?? '', ['admin', 'doctor'], true)) {
            return ['success' => false, 'message' => 'Only doctors write the operative report.'];
        }
        $db = Database::connection();
        $owns = $this->begin($db);
        try {
            $fail = function (string $message, array $errors = []) use ($db, $owns) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $message, 'errors' => $errors ?: null];
            };
            $stmt = $db->prepare("SELECT * FROM or_surgical_cases WHERE id = :id FOR UPDATE");
            $stmt->execute(['id' => $caseId]);
            $case = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$case) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Surgical case not found.', 'not_found' => true];
            }
            if (!in_array($case['perioperative_stage'], self::REPORT_STAGES, true)) {
                return $fail('The operative report is written from closing on.');
            }
            $stmt = $db->prepare("SELECT * FROM or_operative_reports WHERE case_id = :c FOR UPDATE");
            $stmt->execute(['c' => $caseId]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($existing && $existing['status'] === 'signed') {
                return $fail('The report is signed. Add an addendum instead.');
            }
            if ($existing && isset($data['revision']) && (int) $data['revision'] !== (int) $existing['revision']) {
                return $fail('Someone else just saved this report. Reload it and enter your changes again.');
            }

            [$row, $errors] = $this->reportFields($data, false);
            if ($errors) {
                return $fail('Check the highlighted fields.', $errors);
            }
            $now = date('Y-m-d H:i:s');
            $uid = (int) $user['id'];
            if ($existing) {
                $db->prepare(
                    "UPDATE or_operative_reports SET " . implode(', ', array_map(fn($k) => "{$k} = :{$k}", array_keys($row))) . ",
                            revision = revision + 1, updated_at = :now, updated_by = :u WHERE id = :id"
                )->execute($row + ['now' => $now, 'u' => $uid, 'id' => $existing['id']]);
            } else {
                $cols = array_keys($row);
                $db->prepare(
                    "INSERT INTO or_operative_reports (case_id, surgeon_user_id, " . implode(', ', $cols) . ", status, revision, created_at, created_by, updated_at, updated_by)
                     VALUES (:case_id, :surgeon, :" . implode(', :', $cols) . ", 'draft', 1, :now, :u, :now2, :u2)"
                )->execute($row + ['case_id' => $caseId, 'surgeon' => $case['lead_surgeon_user_id'], 'now' => $now, 'u' => $uid, 'now2' => $now, 'u2' => $uid]);
            }
            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => 'Operative report saved as a draft.'];
    }

    /** Sign (locks it): the lead or assistant surgeon of the case only, with the report complete. */
    public function signReport(int $caseId, array $data, array $user): array
    {
        $saved = $this->saveReport($caseId, $data, $user);
        if (!$saved['success']) {
            return $saved;
        }
        $db = Database::connection();
        $owns = $this->begin($db);
        try {
            $stmt = $db->prepare("SELECT * FROM or_surgical_cases WHERE id = :id FOR UPDATE");
            $stmt->execute(['id' => $caseId]);
            $case = $stmt->fetch(PDO::FETCH_ASSOC);
            $surgeons = array_filter([(int) $case['lead_surgeon_user_id'], (int) $case['assistant_surgeon_user_id']]);
            if (!in_array((int) $user['id'], $surgeons, true)) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => "Only the case's surgeon ({$case['lead_surgeon']}" . ($case['assistant_surgeon'] ? " or {$case['assistant_surgeon']}" : '') . ') can sign the report. Your changes were saved as a draft.'];
            }
            $stmt = $db->prepare("SELECT * FROM or_operative_reports WHERE case_id = :c FOR UPDATE");
            $stmt->execute(['c' => $caseId]);
            $report = $stmt->fetch(PDO::FETCH_ASSOC);
            [, $errors] = $this->reportFields($report + ['complications_none' => (int) $report['complications_none']], true);
            if ($errors) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Fill in the report before signing. It was saved as a draft.', 'errors' => $errors];
            }
            $now = date('Y-m-d H:i:s');
            $db->prepare("UPDATE or_operative_reports SET status = 'signed', signed_at = :now, signed_by = :u, surgeon_user_id = :u2, revision = revision + 1 WHERE id = :id")
                ->execute(['now' => $now, 'u' => $user['id'], 'u2' => $user['id'], 'id' => $report['id']]);
            $db->prepare("UPDATE or_surgical_cases SET postop_diagnosis = :dx, procedure_performed = :p, revision = revision + 1 WHERE id = :id")
                ->execute(['dx' => mb_substr($report['postop_diagnosis'], 0, 255), 'p' => mb_substr($report['procedure_performed'], 0, 255), 'id' => $caseId]);

            // A surgery already in the history picks up the signed procedure name and outcome.
            if ($case['patient_surgery_id']) {
                $stmt = $db->prepare(
                    "SELECT c.*, r.procedure_performed AS report_procedure, r.postop_diagnosis AS report_dx, r.complications_none, r.status AS report_status
                     FROM or_surgical_cases c LEFT JOIN or_operative_reports r ON r.case_id = c.id WHERE c.id = :id"
                );
                $stmt->execute(['id' => $caseId]);
                $h = self::historyRow($stmt->fetch(PDO::FETCH_ASSOC));
                $db->prepare("UPDATE patient_surgeries SET title = :t, comments = :c, outcome = :o, updated_at = NOW(), updated_by = :u WHERE id = :id")
                    ->execute(['t' => $h['title'], 'c' => $h['comments'], 'o' => $h['outcome'], 'u' => $user['id'], 'id' => $case['patient_surgery_id']]);
            }
            (new OrSchedulingService())->log($caseId, 'report_signed', [], null, (int) $user['id']);
            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => 'Operative report signed.'];
    }

    /** A note added to a signed report: the surgeons of the case or admin. */
    public function addAddendum(int $caseId, string $body, array $user): array
    {
        $body = trim($body);
        if ($body === '') {
            return ['success' => false, 'message' => 'Write the addendum.', 'errors' => ['body' => 'Write the addendum.']];
        }
        $db = Database::connection();
        $stmt = $db->prepare("SELECT r.id, r.status, c.lead_surgeon_user_id, c.assistant_surgeon_user_id FROM or_operative_reports r JOIN or_surgical_cases c ON c.id = r.case_id WHERE r.case_id = :c");
        $stmt->execute(['c' => $caseId]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$r || $r['status'] !== 'signed') {
            return ['success' => false, 'message' => 'Addenda are added to a signed report; edit the draft instead.'];
        }
        if (($user['role'] ?? '') !== 'admin' && !in_array((int) $user['id'], [(int) $r['lead_surgeon_user_id'], (int) $r['assistant_surgeon_user_id']], true)) {
            return ['success' => false, 'message' => "Only the case's surgeons add addenda to the operative report."];
        }
        $db->prepare("INSERT INTO or_operative_report_addenda (report_id, body, created_at, created_by) VALUES (:r, :b, NOW(), :u)")
            ->execute(['r' => $r['id'], 'b' => mb_substr($body, 0, 5000), 'u' => $user['id']]);
        (new OrSchedulingService())->log($caseId, 'report_addendum', [], null, (int) $user['id']);
        return ['success' => true, 'message' => 'Addendum added.'];
    }

    /** [row, errors]. $forSigning: the main fields must be filled. */
    private function reportFields(array $data, bool $forSigning): array
    {
        $row = [];
        $errors = [];
        foreach (self::REPORT_TEXT as $k => $max) {
            $v = isset($data[$k]) && !is_array($data[$k]) ? trim((string) $data[$k]) : '';
            if (mb_strlen($v) > $max) {
                $errors[$k] = "Too long (up to {$max} characters).";
            }
            $row[$k] = $v === '' ? null : $v;
        }
        $row['complications_none'] = !empty($data['complications_none']) && !in_array($data['complications_none'], ['0', 'false'], true) ? 1 : 0;
        if ($row['complications_none']) {
            $row['complications'] = null;
        }
        $condition = trim((string) ($data['condition_at_end'] ?? ''));
        if ($condition !== '' && !in_array($condition, self::CONDITIONS, true)) {
            $errors['condition_at_end'] = 'Choose the condition.';
        }
        $row['condition_at_end'] = $condition === '' ? null : $condition;

        if ($forSigning) {
            foreach (['postop_diagnosis' => 'Enter the post-op diagnosis.', 'procedure_performed' => 'Enter the procedure done.',
                         'findings' => 'Describe the findings.', 'technique' => 'Describe the procedure (technique).'] as $k => $msg) {
                if ($row[$k] === null) {
                    $errors[$k] = $msg;
                }
            }
            if (!$row['complications_none'] && $row['complications'] === null) {
                $errors['complications'] = 'Describe the complications, or tick "None".';
            }
            if ($row['condition_at_end'] === null) {
                $errors['condition_at_end'] = 'Choose the condition.';
            }
        }

        return [$row, $errors];
    }

    /** Everything for the printed operative report, with the hospital header. */
    public function printData(int $caseId): ?array
    {
        $case = $this->caseRow($caseId);
        if (!$case) {
            return null;
        }
        $report = $this->report($case);
        if (!$report['exists']) {
            return ['missing' => true];
        }
        $db = Database::connection();
        $stmt = $db->prepare("SELECT kind, name, lot_number, serial_number, manufacturer, body_site FROM or_case_items WHERE case_id = :c AND kind = 'implant' AND voided_at IS NULL ORDER BY id");
        $stmt->execute(['c' => $caseId]);
        $implants = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stmt = $db->prepare("SELECT specimen_type, description, sent_to FROM or_case_specimens WHERE case_id = :c AND removed_at IS NULL ORDER BY id");
        $stmt->execute(['c' => $caseId]);
        $specimens = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stmt = $db->prepare(
            "SELECT pr.license_number, pr.ptr_number FROM employees e JOIN providers pr ON pr.employee_id = e.id AND pr.deleted_at IS NULL
             WHERE e.user_id = :u AND e.deleted_at IS NULL LIMIT 1"
        );
        $stmt->execute(['u' => (int) ($case['lead_surgeon_user_id'] ?? 0)]);
        $surgeonIds = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'business' => PrescriptionService::business(),
            'case' => array_intersect_key($case, array_flip([
                'case_number', 'patient_name', 'patient_mrn', 'patient_age', 'gender', 'or_suite_name', 'scheduled_date', 'surgical_specialty', 'laterality',
                'lead_surgeon', 'assistant_surgeon', 'anesthesiologist', 'scrub_nurse', 'circulating_nurse', 'anesthesia_type', 'case_priority',
                'actual_in_room_time', 'anesthesia_start_time', 'actual_incision_time', 'actual_closing_time', 'actual_out_room_time', 'anesthesia_end_time',
                'estimated_blood_loss_ml', 'urine_output_ml'
            ])),
            'report' => $report,
            'surgeon' => ['license_number' => $surgeonIds['license_number'] ?? null, 'ptr_number' => $surgeonIds['ptr_number'] ?? null],
            'implants' => $implants,
            'specimens' => $specimens
        ];
    }

    /* ---------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------- */

    private function caseRow(int $id): ?array
    {
        $stmt = Database::connection()->prepare("SELECT * FROM or_surgical_cases WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private static function userName(int $userId): ?string
    {
        if (!$userId) {
            return null;
        }
        return (string) Database::connection()->query("SELECT " . self::userNameSql((string) $userId))->fetchColumn() ?: null;
    }

    private static function text($value, int $max): ?string
    {
        if (is_array($value)) {
            return null;
        }
        $value = trim((string) ($value ?? ''));
        return $value === '' ? null : mb_substr($value, 0, $max);
    }

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }

    private function begin(PDO $db): bool
    {
        if (!$db->inTransaction()) {
            $db->beginTransaction();
            return true;
        }
        $db->exec('SAVEPOINT or_postop_step');
        return false;
    }

    private function commit(PDO $db, bool $owns): void
    {
        $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT or_postop_step');
    }

    private function rollBack(PDO $db, bool $owns): void
    {
        if ($owns) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            return;
        }
        $db->exec('ROLLBACK TO SAVEPOINT or_postop_step');
    }
}
