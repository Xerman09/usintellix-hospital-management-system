<?php

namespace App\Modules\Er\Services;

use App\Core\Database;
use App\Modules\PatientMerge\Services\PatientMergeService;
use PDO;

/**
 * ER (module 12, Phase 1: registration and triage).
 *
 *   * register() -- quick registration: an existing chart (searched), a new patient with only name,
 *     sex and birth date (or an age), or an unknown patient (sex, estimated age, a description) under a
 *     temporary name "Unknown Male (ER-2026-00007)". The chart is created at once with placeholders
 *     (registration_status quick / unidentified) and a locked login, so it can be completed later.
 *   * triage() -- acuity 1-5 (resuscitation .. non-urgent), chief complaint, vital signs. Vital signs in
 *     the danger zone (by age) suggest level 2; choosing 3-5 then needs a reason. Re-triage keeps history.
 *   * identify() -- an unknown patient: fill in the real details on the temporary chart, or merge the
 *     temporary chart into the patient's existing chart (everything on it moves over).
 *   * close() -- left without being seen, or registered in error.
 * Phase 2 (the tracking board: beds, doctor, nurse, waiting times and alerts, labs / imaging, the TV) is ErBoardService.
 */
class ErService
{
    public const VIEW_ROLES = ['admin', 'receptionist', 'nurse', 'charge_nurse', 'cna', 'doctor', 'clinician'];
    public const REGISTER_ROLES = ['admin', 'receptionist', 'nurse', 'charge_nurse', 'doctor', 'clinician'];
    public const TRIAGE_ROLES = ['admin', 'nurse', 'charge_nurse', 'doctor', 'clinician'];
    public const ARRIVAL_MODES = ['Walk-in', 'Private vehicle', 'Ambulance', 'Police', 'Transfer from another facility', 'Other'];
    public const ACUITY = [
        1 => ['label' => 'Resuscitation', 'hint' => 'Needs life-saving care now (arrest, not breathing, unresponsive, severe shock).'],
        2 => ['label' => 'Emergent', 'hint' => 'High risk, confused / lethargic, severe pain or distress, or danger-zone vital signs.'],
        3 => ['label' => 'Urgent', 'hint' => 'Stable, but will need two or more resources (labs, X-ray, IV fluids, specialist).'],
        4 => ['label' => 'Less urgent', 'hint' => 'Stable, needs one resource.'],
        5 => ['label' => 'Non-urgent', 'hint' => 'Stable, needs no resources (exam, prescription).'],
    ];
    /** Triage within this many minutes of arrival. */
    public const TRIAGE_TARGET_MIN = 10;
    private const OPEN = ['waiting', 'triaged'];

    // ------------------------------------------------------------------
    // The board
    // ------------------------------------------------------------------

    /** Visits open now (waiting for triage first, then by acuity and arrival), and the last 12 hours' closed ones. */
    public function board(): array
    {
        $db = Database::connection();
        $open = $db->query(
            "SELECT v.id FROM er_visits v WHERE v.status IN ('waiting', 'triaged')
             ORDER BY v.status = 'triaged', COALESCE(v.acuity, 9), v.arrived_at"
        )->fetchAll(PDO::FETCH_COLUMN);
        $closed = $db->query(
            "SELECT v.id FROM er_visits v WHERE v.status IN ('left', 'cancelled') AND v.closed_at >= NOW() - INTERVAL 12 HOUR ORDER BY v.closed_at DESC LIMIT 30"
        )->fetchAll(PDO::FETCH_COLUMN);
        $visits = array_map(fn($id) => $this->show((int) $id), $open);
        $counts = ['waiting' => 0, 'triaged' => 0, 'by_acuity' => [1 => 0, 2 => 0, 3 => 0, 4 => 0, 5 => 0], 'unidentified' => 0, 'over_target' => 0,
            'triage_over' => 0, 'doctor_over' => 0, 'no_doctor' => 0, 'in_beds' => 0];
        foreach ($visits as $v) {
            $counts[$v['status']]++;
            if ($v['acuity']) {
                $counts['by_acuity'][$v['acuity']]++;
            }
            if ($v['patient']['registration_status'] === 'unidentified') {
                $counts['unidentified']++;
            }
            if ($v['wait']['over'] && $v['wait']['stage'] !== 'seen') {
                $counts['over_target']++;
                $counts[$v['wait']['stage'] === 'triage' ? 'triage_over' : 'doctor_over']++;
            }
            if ($v['status'] === 'triaged' && !$v['doctor_user_id']) {
                $counts['no_doctor']++;
            }
            if ($v['er_bed_id']) {
                $counts['in_beds']++;
            }
        }
        return ['visits' => $visits, 'closed' => array_map(fn($id) => $this->show((int) $id), $closed), 'counts' => $counts,
            'beds' => (new ErBoardService())->beds(),
            'server_time' => (string) $db->query("SELECT NOW()")->fetchColumn()];
    }

    public static function options(): array
    {
        return ['arrival_modes' => self::ARRIVAL_MODES, 'acuity' => self::ACUITY, 'triage_target_min' => ErBoardService::targets()[0],
            'targets' => ErBoardService::targets(), 'areas' => ErBoardService::AREAS];
    }

    /** Find a chart: name, patient no. (and birth date "YYYY-MM-DD"). */
    public function searchPatients(string $q): array
    {
        $q = trim($q);
        if (mb_strlen($q) < 2) {
            return [];
        }
        $db = Database::connection();
        $where = [];
        $params = [];
        foreach (array_slice(preg_split('/\s+/', $q), 0, 4) as $i => $word) {
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $word)) {
                $where[] = "p.birthdate = :w{$i}";
                $params["w{$i}"] = $word;
            } else {
                $where[] = "(p.first_name LIKE :w{$i} OR p.last_name LIKE :x{$i} OR p.middle_name LIKE :y{$i} OR p.patient_no LIKE :z{$i})";
                $params["w{$i}"] = $params["x{$i}"] = $params["y{$i}"] = "%{$word}%";
                $params["z{$i}"] = "%{$word}%";
            }
        }
        $st = $db->prepare(
            "SELECT p.id, p.patient_no, p.first_name, p.middle_name, p.last_name, p.sex, p.birthdate, p.dob_estimated, p.registration_status,
                    TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) AS age,
                    (SELECT v.visit_no FROM er_visits v WHERE v.patient_id = p.id AND v.status IN ('waiting', 'triaged') LIMIT 1) AS open_visit
             FROM patients p WHERE p.deleted_at IS NULL AND " . implode(' AND ', $where) . " ORDER BY p.last_name, p.first_name LIMIT 15"
        );
        $st->execute($params);
        return array_map([self::class, 'patientShape'], $st->fetchAll(PDO::FETCH_ASSOC));
    }

    // ------------------------------------------------------------------
    // Registration
    // ------------------------------------------------------------------

    /**
     * data: mode (existing | new | unknown);
     *   existing: patient_id;
     *   new: first_name, last_name, middle_name?, sex, birthdate | age, confirm_new? (a possible duplicate was shown);
     *   unknown: sex, age?, description?;
     * arrival_mode, brought_by?, chief_complaint?, arrived_time? (HH:MM, earlier today / last night)
     */
    public function register(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::REGISTER_ROLES, true)) {
            return ['success' => false, 'message' => 'You can\'t register ER patients.', 'forbidden' => true];
        }
        $db = Database::connection();
        $mode = (string) ($data['mode'] ?? '');
        $errors = [];
        if (!in_array($mode, ['existing', 'new', 'unknown'], true)) {
            return ['success' => false, 'message' => 'Choose: a patient with a chart, a new patient, or an unknown patient.', 'errors' => ['mode' => 'Required.']];
        }
        $arrival = (string) ($data['arrival_mode'] ?? '');
        if (!in_array($arrival, self::ARRIVAL_MODES, true)) {
            $errors['arrival_mode'] = 'How did the patient come in?';
        }
        $broughtBy = trim((string) ($data['brought_by'] ?? ''));
        $complaint = trim((string) ($data['chief_complaint'] ?? ''));
        $description = trim((string) ($data['description'] ?? ''));
        if (mb_strlen($broughtBy) > 150) {
            $errors['brought_by'] = 'Keep it under 150 characters.';
        }
        if (mb_strlen($complaint) > 255) {
            $errors['chief_complaint'] = 'Keep it under 255 characters.';
        }
        if (mb_strlen($description) > 500) {
            $errors['description'] = 'Keep it under 500 characters.';
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $arrivedAt = $now;
        $t = trim((string) ($data['arrived_time'] ?? ''));
        if ($t !== '') {
            if (!preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', $t)) {
                $errors['arrived_time'] = 'Time as HH:MM.';
            } else {
                $c = substr($now, 0, 10) . " {$t}:00";
                if ($c > $now) {
                    $c = date('Y-m-d', strtotime(substr($now, 0, 10) . ' -1 day')) . " {$t}:00";
                }
                if (strtotime($now) - strtotime($c) > 12 * 3600) {
                    $errors['arrived_time'] = 'Arrival must be within the last 12 hours.';
                }
                $arrivedAt = $c;
            }
        }

        $patientId = null;
        $sex = strtolower((string) ($data['sex'] ?? ''));
        if ($mode === 'existing') {
            $p = $this->patient($db, (int) ($data['patient_id'] ?? 0));
            if (!$p) {
                $errors['patient_id'] = 'Choose the patient.';
            } else {
                $patientId = (int) $p['id'];
                $openSt = $db->prepare("SELECT visit_no FROM er_visits WHERE patient_id = :p AND status IN ('waiting', 'triaged') LIMIT 1");
                $openSt->execute(['p' => $patientId]);
                if ($v = $openSt->fetchColumn()) {
                    return ['success' => false, 'message' => "This patient is already in the ER ({$v}).", 'errors' => ['patient_id' => 'Already in the ER.']];
                }
            }
        } else {
            if (!in_array($sex, ['male', 'female'], true)) {
                $errors['sex'] = 'Choose the sex.';
            }
            $age = $data['age'] ?? '';
            if ($age !== '' && $age !== null && (!is_numeric($age) || (int) $age < 0 || (int) $age > 120 || (string) (int) $age !== (string) trim((string) $age))) {
                $errors['age'] = 'Age in years (0–120).';
            }
            if ($mode === 'new') {
                foreach (['first_name' => 'First name', 'last_name' => 'Last name'] as $f => $label) {
                    $v = trim((string) ($data[$f] ?? ''));
                    if ($v === '') {
                        $errors[$f] = "{$label} is required.";
                    } elseif (mb_strlen($v) > 100) {
                        $errors[$f] = 'Too long.';
                    }
                }
                $dob = trim((string) ($data['birthdate'] ?? ''));
                if ($dob !== '') {
                    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dob) || date('Y-m-d', strtotime($dob)) !== $dob || $dob > substr($now, 0, 10) || $dob < '1900-01-01') {
                        $errors['birthdate'] = 'Check the birth date.';
                    }
                } elseif ($age === '' || $age === null) {
                    $errors['birthdate'] = 'Birth date, or an age if it is not known.';
                }
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }

        // A new patient who may already have a chart.
        if ($mode === 'new' && empty($data['confirm_new'])) {
            $dup = $db->prepare(
                "SELECT p.id, p.patient_no, p.first_name, p.middle_name, p.last_name, p.sex, p.birthdate, p.dob_estimated, p.registration_status,
                        TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) AS age, NULL AS open_visit
                 FROM patients p WHERE p.deleted_at IS NULL
                   AND ((p.first_name = :f AND p.last_name = :l) OR (:dob <> '' AND p.last_name = :l2 AND p.birthdate = :dob2))
                 ORDER BY p.birthdate = :dob3 DESC LIMIT 5"
            );
            // Same first and last name (whatever the birth date), or the same last name and birth date: let the user decide.
            $dob = trim((string) ($data['birthdate'] ?? ''));
            $dup->execute(['f' => trim($data['first_name']), 'l' => trim($data['last_name']), 'l2' => trim($data['last_name']), 'dob' => $dob, 'dob2' => $dob, 'dob3' => $dob]);
            $matches = $dup->fetchAll(PDO::FETCH_ASSOC);
            if ($matches) {
                return ['success' => false, 'message' => 'A patient with this name already has a chart. Use that chart, or confirm this is someone else.',
                    'errors' => ['first_name' => 'Possible duplicate.'], 'possible_duplicates' => array_map([self::class, 'patientShape'], $matches)];
            }
        }

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT er_reg');
        try {
            $visitNo = $this->nextVisitNo($db, substr($now, 0, 4));
            if ($mode !== 'existing') {
                $age = ($data['age'] ?? '') !== '' && $data['age'] !== null ? (int) $data['age'] : null;
                if ($mode === 'new' && trim((string) ($data['birthdate'] ?? '')) !== '') {
                    $dob = trim($data['birthdate']);
                    $estimated = 0;
                } else {
                    // From an age (or, unknown and no age, an adult of 30): 1 January of that year.
                    $dob = ((int) substr($now, 0, 4) - ($age ?? 30)) . '-01-01';
                    $estimated = 1;
                }
                $patientId = $this->createChart($db, [
                    'first_name' => $mode === 'new' ? trim($data['first_name']) : 'Unknown',
                    'middle_name' => $mode === 'new' ? (trim((string) ($data['middle_name'] ?? '')) ?: null) : null,
                    'last_name' => $mode === 'new' ? trim($data['last_name']) : ucfirst($sex) . " ({$visitNo})",
                    'sex' => $sex, 'birthdate' => $dob, 'dob_estimated' => $estimated,
                    'registration_status' => $mode === 'new' ? 'quick' : 'unidentified',
                ], (int) $actor['id']);
            }
            $db->prepare(
                "INSERT INTO er_visits (visit_no, patient_id, status, arrived_at, arrival_mode, brought_by, chief_complaint, is_unidentified, description, registered_by, registered_at)
                 VALUES (:no, :p, 'waiting', :at, :m, :b, :c, :u, :d, :by, :now)"
            )->execute(['no' => $visitNo, 'p' => $patientId, 'at' => $arrivedAt, 'm' => $arrival, 'b' => $broughtBy !== '' ? $broughtBy : null,
                'c' => $complaint !== '' ? $complaint : null, 'u' => $mode === 'unknown' ? 1 : 0, 'd' => $description !== '' ? $description : null,
                'by' => (int) $actor['id'], 'now' => $now]);
            $id = (int) $db->lastInsertId();
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT er_reg');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT er_reg');
            throw $e;
        }
        $v = $this->show($id);
        return ['success' => true, 'message' => "Registered {$v['patient']['name']} — {$visitNo}. Waiting for triage.", 'data' => $v];
    }

    // ------------------------------------------------------------------
    // Triage
    // ------------------------------------------------------------------

    /**
     * data: id, acuity (1-5), chief_complaint, bp_systolic, bp_diastolic, heart_rate, resp_rate, temperature_c, spo2,
     * on_oxygen?, pain_score?, gcs?, blood_glucose?, weight_kg?, pregnant?, allergies_note?, notes?, undertriage_reason?
     */
    public function triage(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::TRIAGE_ROLES, true)) {
            return ['success' => false, 'message' => 'Triage is done by a nurse or doctor.', 'forbidden' => true];
        }
        $db = Database::connection();
        $v = $this->row($db, (int) ($data['id'] ?? 0));
        if (!$v) {
            return ['success' => false, 'message' => 'ER visit not found.', 'not_found' => true];
        }
        if (!in_array($v['status'], self::OPEN, true)) {
            return ['success' => false, 'message' => 'This ER visit is closed.'];
        }
        $errors = [];
        $acuity = (int) ($data['acuity'] ?? 0);
        if ($acuity < 1 || $acuity > 5) {
            $errors['acuity'] = 'Choose the acuity level (1–5).';
        }
        $complaint = trim((string) ($data['chief_complaint'] ?? ''));
        if ($complaint === '') {
            $errors['chief_complaint'] = 'What is the chief complaint?';
        } elseif (mb_strlen($complaint) > 255) {
            $errors['chief_complaint'] = 'Keep it under 255 characters.';
        }
        $num = function (string $f, float $min, float $max, string $label, bool $int = true) use ($data, &$errors) {
            $raw = $data[$f] ?? '';
            if ($raw === '' || $raw === null) {
                return null;
            }
            if (!is_numeric($raw) || (float) $raw < $min || (float) $raw > $max || ($int && floor((float) $raw) != (float) $raw)) {
                $errors[$f] = "{$label}: {$min}–{$max}.";
                return null;
            }
            return $int ? (int) $raw : round((float) $raw, 1);
        };
        $vs = [
            'bp_systolic' => $num('bp_systolic', 40, 300, 'Systolic BP'),
            'bp_diastolic' => $num('bp_diastolic', 20, 200, 'Diastolic BP'),
            'heart_rate' => $num('heart_rate', 20, 300, 'Heart rate'),
            'resp_rate' => $num('resp_rate', 4, 80, 'Breathing rate'),
            'temperature_c' => $num('temperature_c', 25, 45, 'Temperature °C', false),
            'spo2' => $num('spo2', 50, 100, 'SpO₂'),
            'pain_score' => $num('pain_score', 0, 10, 'Pain'),
            'gcs' => $num('gcs', 3, 15, 'GCS'),
            'blood_glucose' => $num('blood_glucose', 10, 1500, 'Glucose mg/dL'),
            'weight_kg' => $num('weight_kg', 0.3, 400, 'Weight kg', false),
        ];
        if (($vs['bp_systolic'] === null) !== ($vs['bp_diastolic'] === null)) {
            $errors['bp_systolic'] = 'Enter both blood pressure numbers.';
        } elseif ($vs['bp_systolic'] !== null && $vs['bp_diastolic'] >= $vs['bp_systolic']) {
            $errors['bp_diastolic'] = 'Diastolic must be lower than systolic.';
        }
        // Level 1 is treated first; everyone else is triaged with a full set.
        if ($acuity >= 2) {
            foreach (['bp_systolic' => 'Blood pressure', 'heart_rate' => 'Heart rate', 'resp_rate' => 'Breathing rate', 'spo2' => 'SpO₂'] as $f => $label) {
                if ($vs[$f] === null && !isset($errors[$f])) {
                    $errors[$f] = "{$label} is needed for levels 2–5.";
                }
            }
        }
        $pregnant = (string) ($data['pregnant'] ?? '');
        $p = $this->patient($db, (int) $v['patient_id']);
        if ($pregnant !== '' && (!in_array($pregnant, ['yes', 'no', 'unknown'], true) || ($p['sex'] ?? '') !== 'female')) {
            $errors['pregnant'] = 'Pregnancy is asked for female patients only.';
        }
        foreach (['allergies_note' => 255, 'notes' => 1000, 'undertriage_reason' => 255] as $f => $max) {
            if (mb_strlen(trim((string) ($data[$f] ?? ''))) > $max) {
                $errors[$f] = "Keep it under {$max} characters.";
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $age = $p ? (int) $p['age_months'] : 360;
        $danger = self::dangerZone($vs, $age);
        $reason = trim((string) ($data['undertriage_reason'] ?? ''));
        if ($danger && $acuity >= 3 && $reason === '') {
            return ['success' => false, 'message' => 'Danger-zone vital signs (' . implode(', ', $danger) . '): consider level 2, or say why level ' . $acuity . ' is right.',
                'errors' => ['undertriage_reason' => 'Required.'], 'danger' => $danger];
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $db->prepare(
            "INSERT INTO er_triage (visit_id, acuity, chief_complaint, bp_systolic, bp_diastolic, heart_rate, resp_rate, temperature_c, spo2, on_oxygen, pain_score, gcs,
                                    blood_glucose, weight_kg, pregnant, allergies_note, notes, danger_vitals, undertriage_reason, triaged_by, triaged_at)
             VALUES (:v, :a, :c, :bs, :bd, :hr, :rr, :t, :s, :o, :pain, :gcs, :g, :w, :preg, :al, :n, :dz, :ur, :by, :now)"
        )->execute(['v' => $v['id'], 'a' => $acuity, 'c' => $complaint, 'bs' => $vs['bp_systolic'], 'bd' => $vs['bp_diastolic'], 'hr' => $vs['heart_rate'],
            'rr' => $vs['resp_rate'], 't' => $vs['temperature_c'], 's' => $vs['spo2'], 'o' => !empty($data['on_oxygen']) && (string) $data['on_oxygen'] !== '0' ? 1 : 0,
            'pain' => $vs['pain_score'], 'gcs' => $vs['gcs'], 'g' => $vs['blood_glucose'], 'w' => $vs['weight_kg'], 'preg' => $pregnant !== '' ? $pregnant : null,
            'al' => trim((string) ($data['allergies_note'] ?? '')) ?: null, 'n' => trim((string) ($data['notes'] ?? '')) ?: null,
            'dz' => $danger ? implode(', ', $danger) : null, 'ur' => $danger && $acuity >= 3 ? $reason : null, 'by' => (int) $actor['id'], 'now' => $now]);
        $db->prepare("UPDATE er_visits SET status = 'triaged', acuity = :a, triaged_at = COALESCE(triaged_at, :now) WHERE id = :id")
            ->execute(['a' => $acuity, 'now' => $now, 'id' => $v['id']]);
        $retriage = $v['status'] === 'triaged';
        (new ErBoardService())->closeAlerts($db, (int) $v['id']);
        return ['success' => true, 'message' => ($retriage ? 'Re-triaged' : 'Triaged') . ": level {$acuity} — " . self::ACUITY[$acuity]['label'] . '.', 'data' => $this->show((int) $v['id'])];
    }

    /**
     * Vital signs in the ESI danger zone, by age (months): heart rate and breathing rate above the
     * age limit, SpO2 below 92%. Returns the ones out (e.g. ["HR 128", "SpO₂ 89%"]).
     */
    public static function dangerZone(array $vs, int $ageMonths): array
    {
        [$hr, $rr] = match (true) {
            $ageMonths < 3 => [180, 50],
            $ageMonths < 36 => [160, 40],
            $ageMonths < 96 => [140, 30],
            default => [100, 20],
        };
        $out = [];
        if ($vs['heart_rate'] !== null && $vs['heart_rate'] > $hr) {
            $out[] = "HR {$vs['heart_rate']}";
        }
        if ($vs['resp_rate'] !== null && $vs['resp_rate'] > $rr) {
            $out[] = "RR {$vs['resp_rate']}";
        }
        if ($vs['spo2'] !== null && $vs['spo2'] < 92) {
            $out[] = "SpO₂ {$vs['spo2']}%";
        }
        return $out;
    }

    // ------------------------------------------------------------------
    // Unknown patients, closing
    // ------------------------------------------------------------------

    /**
     * An unknown patient is identified. data: id, how (details | merge);
     *   details: first_name, last_name, middle_name?, sex, birthdate (the real one);
     *   merge: patient_id (their existing chart).
     */
    public function identify(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::REGISTER_ROLES, true)) {
            return ['success' => false, 'message' => 'You can\'t identify ER patients.', 'forbidden' => true];
        }
        $db = Database::connection();
        $v = $this->row($db, (int) ($data['id'] ?? 0));
        if (!$v) {
            return ['success' => false, 'message' => 'ER visit not found.', 'not_found' => true];
        }
        $temp = $this->patient($db, (int) $v['patient_id']);
        if (!$temp || $temp['registration_status'] !== 'unidentified') {
            return ['success' => false, 'message' => 'This patient is already identified.'];
        }
        $how = (string) ($data['how'] ?? '');
        $uid = (int) $actor['id'];
        if ($how === 'details') {
            $errors = [];
            foreach (['first_name' => 'First name', 'last_name' => 'Last name'] as $f => $label) {
                if (trim((string) ($data[$f] ?? '')) === '') {
                    $errors[$f] = "{$label} is required.";
                }
            }
            $sex = strtolower((string) ($data['sex'] ?? ''));
            if (!in_array($sex, ['male', 'female'], true)) {
                $errors['sex'] = 'Choose the sex.';
            }
            $dob = trim((string) ($data['birthdate'] ?? ''));
            $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dob) || date('Y-m-d', strtotime($dob)) !== $dob || $dob > $today || $dob < '1900-01-01') {
                $errors['birthdate'] = 'The birth date (if they have a chart already, choose "Has a chart").';
            }
            if ($errors) {
                return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
            }
            $first = trim($data['first_name']);
            $last = trim($data['last_name']);
            $db->prepare(
                "UPDATE patients SET first_name = :f, middle_name = :m, last_name = :l, sex = :s, birthdate = :d, dob_estimated = 0,
                        registration_status = 'quick', updated_at = NOW(), updated_by = :u WHERE id = :id"
            )->execute(['f' => $first, 'm' => trim((string) ($data['middle_name'] ?? '')) ?: null, 'l' => $last, 's' => $sex, 'd' => $dob, 'u' => $uid, 'id' => $temp['id']]);
            $db->prepare("UPDATE inpatient_admissions SET patient_name = :n WHERE patient_id = :p")->execute(['n' => trim("{$first} {$last}"), 'p' => $temp['id']]);
            $db->prepare("UPDATE er_visits SET identified_at = NOW(), identified_by = :u, identified_how = 'details' WHERE id = :id")->execute(['u' => $uid, 'id' => $v['id']]);
            return ['success' => true, 'message' => "Identified: {$first} {$last}. Complete the registration at Patients when you can.", 'data' => $this->show((int) $v['id'])];
        }
        if ($how !== 'merge') {
            return ['success' => false, 'message' => 'Fill in the details, or choose their existing chart.', 'errors' => ['how' => 'Required.']];
        }
        $target = $this->patient($db, (int) ($data['patient_id'] ?? 0));
        if (!$target || (int) $target['id'] === (int) $temp['id']) {
            return ['success' => false, 'message' => 'Choose the patient\'s existing chart.', 'errors' => ['patient_id' => 'Required.']];
        }
        if ($target['registration_status'] === 'unidentified') {
            return ['success' => false, 'message' => 'That chart is another unknown patient.', 'errors' => ['patient_id' => 'Unknown patient.']];
        }
        $other = $db->prepare("SELECT visit_no FROM er_visits WHERE patient_id = :p AND status IN ('waiting', 'triaged') AND id <> :v LIMIT 1");
        $other->execute(['p' => $target['id'], 'v' => $v['id']]);
        if ($o = $other->fetchColumn()) {
            return ['success' => false, 'message' => "That patient is already in the ER under {$o}. Close one of the visits first.", 'errors' => ['patient_id' => 'In the ER.']];
        }
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT er_merge');
        try {
            // Everything on the temporary chart (this visit, triage, orders, results, admissions...) moves to the real chart.
            (new PatientMergeService())->mergeCore($db, (int) $target['id'], (int) $temp['id'], false, $uid, null, true);
            $db->prepare("UPDATE inpatient_admissions SET patient_name = :n, patient_mrn = :no WHERE patient_id = :p AND patient_mrn = :old")
                ->execute(['n' => $target['name'], 'no' => $target['patient_no'], 'p' => $target['id'], 'old' => $temp['patient_no']]);
            $db->prepare("UPDATE er_visits SET patient_id = :p, identified_at = NOW(), identified_by = :u, identified_how = 'merged', merged_from_patient_id = :src WHERE id = :id")
                ->execute(['p' => $target['id'], 'u' => $uid, 'src' => $temp['id'], 'id' => $v['id']]);
            $db->prepare("UPDATE users SET deleted_at = NOW(), deleted_by = :u WHERE id = :id AND role_id IS NULL")->execute(['u' => $uid, 'id' => $temp['user_id']]);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT er_merge');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT er_merge');
            error_log('ER merge failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Could not merge the charts: ' . $e->getMessage()];
        }
        return ['success' => true, 'message' => "Identified as {$target['name']} ({$target['patient_no']}). The temporary chart was merged into theirs.", 'data' => $this->show((int) $v['id'])];
    }

    /** data: id, reason (left | cancelled), note? (required for cancelled) */
    public function close(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::REGISTER_ROLES, true)) {
            return ['success' => false, 'message' => 'You can\'t close ER visits.', 'forbidden' => true];
        }
        $db = Database::connection();
        $v = $this->row($db, (int) ($data['id'] ?? 0));
        if (!$v) {
            return ['success' => false, 'message' => 'ER visit not found.', 'not_found' => true];
        }
        if (!in_array($v['status'], self::OPEN, true)) {
            return ['success' => false, 'message' => 'This ER visit is already closed.'];
        }
        $reason = (string) ($data['reason'] ?? '');
        $note = trim((string) ($data['note'] ?? ''));
        if (!in_array($reason, ['left', 'cancelled'], true)) {
            return ['success' => false, 'message' => 'Choose why.', 'errors' => ['reason' => 'Required.']];
        }
        if ($reason === 'cancelled' && $note === '') {
            return ['success' => false, 'message' => 'Say what was wrong with the registration.', 'errors' => ['note' => 'Required.']];
        }
        $db->prepare("UPDATE er_visits SET status = :s, closed_at = NOW(), closed_by = :u, close_reason = :n WHERE id = :id")
            ->execute(['s' => $reason, 'u' => (int) $actor['id'], 'n' => $note !== '' ? mb_substr($note, 0, 255) : ($reason === 'left' ? 'Left without being seen' : null), 'id' => $v['id']]);
        (new ErBoardService())->closeAlerts($db, (int) $v['id']);
        return ['success' => true, 'message' => $reason === 'left' ? 'Marked as left without being seen.' : 'Registration cancelled.', 'data' => $this->show((int) $v['id'])];
    }

    // ------------------------------------------------------------------
    // Reading
    // ------------------------------------------------------------------

    public function show(int $id): ?array
    {
        $db = Database::connection();
        $st = $db->prepare(
            "SELECT v.*, TIMESTAMPDIFF(MINUTE, v.arrived_at, COALESCE(v.triaged_at, v.closed_at, NOW())) AS minutes_waiting,
                    TIMESTAMPDIFF(MINUTE, v.arrived_at, COALESCE(v.closed_at, NOW())) AS minutes_in_er,
                    TIMESTAMPDIFF(MINUTE, v.arrived_at, NOW()) AS minutes_since_arrival, TIMESTAMPDIFF(MINUTE, v.arrived_at, v.doctor_at) AS minutes_to_doctor,
                    " . self::nameSql('v.registered_by') . " AS registered_by_name, " . self::nameSql('v.identified_by') . " AS identified_by_name,
                    " . self::nameSql('v.doctor_user_id') . " AS doctor_name, " . self::nameSql('v.nurse_user_id') . " AS nurse_name, b.name AS bed_name, b.area AS bed_area
             FROM er_visits v LEFT JOIN er_beds b ON b.id = v.er_bed_id WHERE v.id = :id"
        );
        $st->execute(['id' => $id]);
        $v = $st->fetch(PDO::FETCH_ASSOC);
        if (!$v) {
            return null;
        }
        $t = $db->prepare("SELECT t.*, " . self::nameSql('t.triaged_by') . " AS triaged_by_name FROM er_triage t WHERE t.visit_id = :v ORDER BY t.triaged_at DESC, t.id DESC");
        $t->execute(['v' => $id]);
        $triages = array_map([self::class, 'triageShape'], $t->fetchAll(PDO::FETCH_ASSOC));
        $p = $this->patient($db, (int) $v['patient_id'], true);
        $al = $db->prepare(
            "SELECT a.name, pa.reaction, pa.severity FROM patient_allergies pa JOIN allergies a ON a.id = pa.allergy_id
             WHERE pa.patient_id = :p AND (pa.end_date IS NULL OR pa.end_date >= CURDATE()) ORDER BY a.name"
        );
        $al->execute(['p' => $v['patient_id']]);
        return [
            'id' => (int) $v['id'], 'visit_no' => $v['visit_no'], 'status' => $v['status'],
            'arrived_at' => $v['arrived_at'], 'arrival_mode' => $v['arrival_mode'], 'brought_by' => $v['brought_by'],
            'chief_complaint' => $v['chief_complaint'], 'is_unidentified' => (bool) $v['is_unidentified'], 'description' => $v['description'],
            'identified_at' => $v['identified_at'], 'identified_by_name' => $v['identified_at'] ? $v['identified_by_name'] : null, 'identified_how' => $v['identified_how'],
            'acuity' => $v['acuity'] !== null ? (int) $v['acuity'] : null, 'triaged_at' => $v['triaged_at'],
            'minutes_waiting' => (int) $v['minutes_waiting'], 'minutes_in_er' => (int) $v['minutes_in_er'],
            'registered_at' => $v['registered_at'], 'registered_by_name' => $v['registered_by_name'],
            'closed_at' => $v['closed_at'], 'close_reason' => $v['close_reason'],
            // Phase 2: bed, doctor (the first one = seen), nurse, the wait against the target, labs and imaging.
            'er_bed_id' => $v['er_bed_id'] !== null ? (int) $v['er_bed_id'] : null, 'bed_name' => $v['bed_name'], 'bed_at' => $v['bed_at'],
            'doctor_user_id' => $v['doctor_user_id'] !== null ? (int) $v['doctor_user_id'] : null, 'doctor_name' => $v['doctor_user_id'] ? $v['doctor_name'] : null,
            'doctor_at' => $v['doctor_at'], 'nurse_user_id' => $v['nurse_user_id'] !== null ? (int) $v['nurse_user_id'] : null,
            'nurse_name' => $v['nurse_user_id'] ? $v['nurse_name'] : null,
            'wait' => ErBoardService::wait($v),
            'orders' => (new ErBoardService())->orders([(int) $v['id']])[(int) $v['id']] ?? ['lab_pending' => 0, 'lab_done' => 0, 'imaging_pending' => 0, 'imaging_done' => 0],
            'patient' => $p ? self::patientShape($p) : null,
            'allergies' => $al->fetchAll(PDO::FETCH_ASSOC),
            'triage' => $triages[0] ?? null, 'triage_history' => array_slice($triages, 1),
        ];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** A chart with placeholders for what quick registration doesn't ask, and a locked login (patients log in only after a full registration). */
    private function createChart(PDO $db, array $f, int $actorId): int
    {
        for ($try = 1; $try <= 5; $try++) {
            $no = 'PAT-' . str_pad((string) ((int) $db->query("SELECT MAX(CAST(SUBSTRING(patient_no, 5) AS UNSIGNED)) FROM patients")->fetchColumn() + 1), 6, '0', STR_PAD_LEFT);
            try {
                $db->exec('SAVEPOINT er_chart');
                $db->prepare(
                    "INSERT INTO users (username, password, must_change_password, is_locked, created_at, created_by) VALUES (:u, :p, 1, 1, NOW(), :by)"
                )->execute(['u' => 'er.' . strtolower($no), 'p' => password_hash(bin2hex(random_bytes(24)), PASSWORD_BCRYPT), 'by' => $actorId]);
                $userId = (int) $db->lastInsertId();
                $db->prepare(
                    "INSERT INTO patients (user_id, patient_no, registration_status, first_name, middle_name, last_name, sex, birthdate, dob_estimated,
                                           civil_status, blood_type, height, weight, created_at, created_by)
                     VALUES (:uid, :no, :rs, :f, :m, :l, :s, :d, :de, 'Unknown', 'Unknown', 0, 0, NOW(), :by)"
                )->execute(['uid' => $userId, 'no' => $no, 'rs' => $f['registration_status'], 'f' => $f['first_name'], 'm' => $f['middle_name'], 'l' => $f['last_name'],
                    's' => $f['sex'], 'd' => $f['birthdate'], 'de' => $f['dob_estimated'], 'by' => $actorId]);
                $id = (int) $db->lastInsertId();
                $db->exec('RELEASE SAVEPOINT er_chart');
                return $id;
            } catch (\PDOException $e) {
                $db->exec('ROLLBACK TO SAVEPOINT er_chart');
                if (($e->errorInfo[1] ?? null) !== 1062 || $try === 5) {
                    throw $e;
                }
            }
        }
        throw new \RuntimeException('Could not number the chart.');
    }

    private function nextVisitNo(PDO $db, string $year): string
    {
        $st = $db->prepare("SELECT MAX(CAST(SUBSTRING(visit_no, 9) AS UNSIGNED)) FROM er_visits WHERE visit_no LIKE :p FOR UPDATE");
        $st->execute(['p' => "ER-{$year}-%"]);
        return "ER-{$year}-" . str_pad((string) ((int) $st->fetchColumn() + 1), 5, '0', STR_PAD_LEFT);
    }

    private function row(PDO $db, int $id): ?array
    {
        $st = $db->prepare("SELECT * FROM er_visits WHERE id = :id");
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function patient(PDO $db, int $id, bool $withDeleted = false): ?array
    {
        $st = $db->prepare(
            "SELECT p.id, p.user_id, p.patient_no, p.first_name, p.middle_name, p.last_name, p.sex, p.birthdate, p.dob_estimated, p.registration_status,
                    TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) AS age, TIMESTAMPDIFF(MONTH, p.birthdate, CURDATE()) AS age_months, NULL AS open_visit
             FROM patients p WHERE p.id = :id" . ($withDeleted ? '' : ' AND p.deleted_at IS NULL')
        );
        $st->execute(['id' => $id]);
        $p = $st->fetch(PDO::FETCH_ASSOC);
        if ($p) {
            $p['name'] = trim(implode(' ', array_filter([$p['first_name'], $p['middle_name'], $p['last_name']])));
        }
        return $p ?: null;
    }

    private static function patientShape(array $p): array
    {
        return [
            'id' => (int) $p['id'], 'patient_no' => $p['patient_no'],
            'name' => $p['name'] ?? trim(implode(' ', array_filter([$p['first_name'], $p['middle_name'], $p['last_name']]))),
            'sex' => $p['sex'], 'birthdate' => $p['birthdate'], 'age' => $p['age'] !== null ? (int) $p['age'] : null, 'dob_estimated' => (bool) $p['dob_estimated'],
            'registration_status' => $p['registration_status'], 'open_visit' => $p['open_visit'] ?? null,
        ];
    }

    private static function triageShape(array $t): array
    {
        $int = fn($v) => $v !== null ? (int) $v : null;
        return [
            'id' => (int) $t['id'], 'acuity' => (int) $t['acuity'], 'chief_complaint' => $t['chief_complaint'],
            'bp_systolic' => $int($t['bp_systolic']), 'bp_diastolic' => $int($t['bp_diastolic']), 'heart_rate' => $int($t['heart_rate']),
            'resp_rate' => $int($t['resp_rate']), 'temperature_c' => $t['temperature_c'] !== null ? (float) $t['temperature_c'] : null,
            'spo2' => $int($t['spo2']), 'on_oxygen' => (bool) $t['on_oxygen'], 'pain_score' => $int($t['pain_score']), 'gcs' => $int($t['gcs']),
            'blood_glucose' => $int($t['blood_glucose']), 'weight_kg' => $t['weight_kg'] !== null ? (float) $t['weight_kg'] : null,
            'pregnant' => $t['pregnant'], 'allergies_note' => $t['allergies_note'], 'notes' => $t['notes'],
            'danger_vitals' => $t['danger_vitals'], 'undertriage_reason' => $t['undertriage_reason'],
            'triaged_by_name' => $t['triaged_by_name'], 'triaged_at' => $t['triaged_at'],
        ];
    }

    private static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL WHERE nu.id = {$column} LIMIT 1)";
    }
}
