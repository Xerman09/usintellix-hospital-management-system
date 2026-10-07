<?php

namespace App\Modules\InpatientVitals\Services;

use App\Core\Database;
use App\Modules\NursingStaff\Services\NursingShiftService;
use App\Modules\NursingStaff\Services\NursingStaffService;
use PDO;

/**
 * Inpatient vital signs: any number of sets per admission, a schedule per patient
 * (every N hours) with due / overdue flags, history for the graph.
 *
 * Times come from the database clock (PHP's timezone may differ).
 */
class InpatientVitalsService
{
    /** Hours between sets when a patient has no schedule of their own (ICU wards: hourly). */
    public const DEFAULT_HOURS = 4;
    public const DEFAULT_HOURS_ICU = 1;
    public const ALLOWED_HOURS = [1, 2, 4, 6, 8, 12, 24];
    /** "Due soon" starts this many minutes before the due time; "overdue" this many after. */
    public const DUE_SOON_MIN = 30;
    public const OVERDUE_AFTER_MIN = 30;

    /** What can be entered at all (catches typos like 1200 for 120). */
    public const LIMITS = [
        'bp_systolic' => [40, 300, 'Systolic BP'], 'bp_diastolic' => [20, 200, 'Diastolic BP'],
        'heart_rate' => [20, 300, 'Heart rate'], 'resp_rate' => [4, 80, 'Breathing rate'],
        'temperature_c' => [30, 45, 'Temperature'], 'spo2' => [50, 100, 'SpO₂'],
        'oxygen_lpm' => [0.5, 60, 'Oxygen flow'], 'pain_score' => [0, 10, 'Pain score'],
        'blood_sugar_mgdl' => [10, 1000, 'Blood sugar'],
    ];

    /** Adult reference ranges for highlighting: [low below, high from]. */
    public const NORMAL = [
        'bp_systolic' => [90, 140], 'bp_diastolic' => [60, 90], 'heart_rate' => [50, 101],
        'resp_rate' => [12, 21], 'temperature_c' => [36.0, 38.0], 'spo2' => [94, null],
        'pain_score' => [null, 7], 'blood_sugar_mgdl' => [70, 181],
    ];

    private const ACTIVE = "('Admitted', 'Pending Discharge')";
    private const FIELDS = ['bp_systolic', 'bp_diastolic', 'heart_rate', 'resp_rate', 'temperature_c', 'spo2', 'oxygen_lpm', 'pain_score', 'blood_sugar_mgdl'];
    private const CONSCIOUSNESS = ['Alert', 'Confused', 'Voice', 'Pain', 'Unresponsive'];

    // ------------------------------------------------------------------
    // Ward board
    // ------------------------------------------------------------------

    /** One ward's patients with their latest vitals and what is due. filters: ward_id? */
    public function board(array $filters, array $actor): array
    {
        $db = Database::connection();
        $wards = $db->query("SELECT id, ward_code, ward_name, ward_type FROM hospital_wards WHERE is_active = 1 ORDER BY ward_name")->fetchAll(PDO::FETCH_ASSOC);
        $mine = (new NursingStaffService())->wardIds((int) ($actor['id'] ?? 0));
        $wardId = (int) ($filters['ward_id'] ?? 0) ?: ($mine[0] ?? (int) ($wards[0]['id'] ?? 0));

        $stmt = $db->prepare(
            "SELECT a.id FROM inpatient_admissions a JOIN hospital_beds b ON b.id = a.bed_id
             WHERE a.ward_id = :w AND a.status IN " . self::ACTIVE . " ORDER BY b.room_number, b.bed_number"
        );
        $stmt->execute(['w' => $wardId]);
        $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
        $rows = $ids ? $this->summaries($ids) : [];

        $count = fn(string $s) => count(array_filter($rows, fn($r) => $r['status']['state'] === $s));
        return [
            'ward_id' => $wardId,
            'wards' => array_map(fn($w) => ['id' => (int) $w['id'], 'code' => $w['ward_code'], 'name' => $w['ward_name'], 'mine' => in_array((int) $w['id'], $mine, true)], $wards),
            'patients' => array_values($rows),
            'counts' => ['overdue' => $count('overdue'), 'due' => $count('due'), 'due_soon' => $count('due_soon')],
            'now' => $this->dbNow(),
            'normal' => self::NORMAL,
            'allowed_hours' => self::ALLOWED_HOURS,
        ];
    }

    /**
     * For each admission: patient, bed, latest set (with flags), schedule and due status.
     * Used by the board, the chart widget and the census.
     * @return array<int, array> admission_id => summary
     */
    public function summaries(array $admissionIds): array
    {
        if (!$admissionIds) {
            return [];
        }
        $db = Database::connection();
        $in = implode(',', array_map('intval', $admissionIds));
        $adms = $db->query(
            "SELECT a.id, a.patient_id, a.patient_name, a.patient_mrn, a.patient_age, a.gender, a.admission_date, a.status, a.isolation_precautions,
                    a.ward_id, w.ward_name, w.ward_type, b.room_number, b.bed_number, s.every_hours, s.reason AS schedule_reason,
                    COALESCE(ns.spo2_scale, 1) AS spo2_scale, ns.reason AS scale_reason
             FROM inpatient_admissions a
             JOIN hospital_wards w ON w.id = a.ward_id
             JOIN hospital_beds b ON b.id = a.bed_id
             LEFT JOIN inpatient_vitals_schedules s ON s.admission_id = a.id
             LEFT JOIN inpatient_news2_settings ns ON ns.admission_id = a.id
             WHERE a.id IN ({$in})"
        )->fetchAll(PDO::FETCH_ASSOC);

        // Latest valid set per admission.
        $latest = [];
        $stmt = $db->query(
            "SELECT v.* FROM inpatient_vitals v
             JOIN (SELECT admission_id, MAX(taken_at) AS t FROM inpatient_vitals WHERE voided_at IS NULL AND admission_id IN ({$in}) GROUP BY admission_id) m
               ON m.admission_id = v.admission_id AND m.t = v.taken_at
             WHERE v.voided_at IS NULL ORDER BY v.id"
        );
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $v) {
            $latest[(int) $v['admission_id']] = $v;   // a later id wins a same-minute tie
        }
        $counts = $db->query(
            "SELECT admission_id, COUNT(*) FROM inpatient_vitals WHERE voided_at IS NULL AND admission_id IN ({$in})
               AND taken_at >= NOW() - INTERVAL 24 HOUR GROUP BY admission_id"
        )->fetchAll(PDO::FETCH_KEY_PAIR);

        $shift = new NursingShiftService();
        $cur = $shift->current();
        $nurses = $db->prepare(
            "SELECT admission_id, " . self::userNameSql('nurse_user_id') . " AS nurse_name, " . self::userNameSql('cna_user_id') . " AS cna_name
             FROM nurse_patient_assignments WHERE shift_date = :d AND shift_id = :s AND admission_id IN ({$in})"
        );
        $nurses->execute(['d' => $cur['date'], 's' => $cur['shift']['id'] ?? 0]);
        $team = [];
        foreach ($nurses->fetchAll(PDO::FETCH_ASSOC) as $t) {
            $team[(int) $t['admission_id']] = $t;
        }

        $now = $this->dbNow();
        $out = [];
        foreach ($adms as $a) {
            $id = (int) $a['id'];
            $every = $a['every_hours'] !== null ? (int) $a['every_hours'] : $this->defaultHours($a['ward_type']);
            $last = $latest[$id] ?? null;
            $news2 = $last ? $this->news2Of($last) : null;
            $out[$id] = [
                'admission_id' => $id,
                'patient_id' => $a['patient_id'] !== null ? (int) $a['patient_id'] : null,
                'patient_name' => $a['patient_name'], 'patient_mrn' => $a['patient_mrn'],
                'age' => $a['patient_age'] !== null ? (int) $a['patient_age'] : null, 'sex' => $a['gender'],
                'admission_status' => $a['status'],
                'isolation' => $a['isolation_precautions'] !== 'Standard' ? $a['isolation_precautions'] : null,
                'ward_id' => (int) $a['ward_id'], 'ward' => $a['ward_name'], 'room' => $a['room_number'], 'bed' => $a['bed_number'],
                'schedule' => ['every_hours' => $every, 'is_default' => $a['every_hours'] === null, 'reason' => $a['schedule_reason']],
                'latest' => $last ? $this->shape($last) : null,
                'sets_24h' => (int) ($counts[$id] ?? 0),
                'status' => $this->status($last['taken_at'] ?? null, $a['admission_date'], $every, $now),
                'nurse_name' => $team[$id]['nurse_name'] ?? null, 'cna_name' => $team[$id]['cna_name'] ?? null,
                'news2' => $news2,
                'spo2_scale' => (int) $a['spo2_scale'], 'scale_reason' => $a['scale_reason'],
                // NEWS2 asks for vitals at least this often; flag a schedule that is slower.
                'news2_hours' => $news2['min_hours'] ?? null,
                'schedule_too_slow' => $news2 !== null && $every > $news2['min_hours'],
            ];
        }
        // Keep the order asked for.
        $ordered = [];
        foreach ($admissionIds as $id) {
            if (isset($out[(int) $id])) {
                $ordered[(int) $id] = $out[(int) $id];
            }
        }
        return $ordered;
    }

    /** The chart widget: the patient's current admission, or null if not admitted. */
    public function forPatient(int $patientId): ?array
    {
        $stmt = Database::connection()->prepare("SELECT id FROM inpatient_admissions WHERE patient_id = :p AND status IN " . self::ACTIVE . " ORDER BY id DESC LIMIT 1");
        $stmt->execute(['p' => $patientId]);
        $id = $stmt->fetchColumn();
        return $id ? ($this->summaries([(int) $id])[(int) $id] ?? null) : null;
    }

    // ------------------------------------------------------------------
    // Record / void / schedule
    // ------------------------------------------------------------------

    /**
     * data: admission_id, taken_at?, bp_systolic?, bp_diastolic?, heart_rate?, resp_rate?, temperature_c?,
     *       spo2?, on_oxygen?, oxygen_lpm?, consciousness?, pain_score?, blood_sugar_mgdl?, notes?
     */
    public function record(array $data, array $actor): array
    {
        $db = Database::connection();
        $admId = (int) ($data['admission_id'] ?? 0);
        $stmt = $db->prepare("SELECT id, patient_id, admission_date FROM inpatient_admissions WHERE id = :id AND status IN " . self::ACTIVE);
        $stmt->execute(['id' => $admId]);
        $adm = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$adm) {
            return ['success' => false, 'message' => 'This patient is not admitted (or was discharged).', 'not_found' => true];
        }

        $errors = [];
        $vals = [];
        foreach (self::FIELDS as $f) {
            $raw = $data[$f] ?? null;
            if ($raw === null || $raw === '') {
                $vals[$f] = null;
                continue;
            }
            [$min, $max, $label] = self::LIMITS[$f];
            $isInt = !in_array($f, ['temperature_c', 'oxygen_lpm'], true);
            $num = $isInt ? filter_var($raw, FILTER_VALIDATE_INT) : filter_var($raw, FILTER_VALIDATE_FLOAT);
            if ($num === false || $num < $min || $num > $max) {
                $errors[$f] = "{$label} must be " . ($isInt ? 'a whole number ' : '') . "between {$min} and {$max}.";
                continue;
            }
            $vals[$f] = $isInt ? (int) $num : round((float) $num, 1);
        }
        if (($vals['bp_systolic'] === null) !== ($vals['bp_diastolic'] === null) && !isset($errors['bp_systolic'], $errors['bp_diastolic'])) {
            $errors['bp_systolic'] = 'Enter both numbers of the blood pressure (e.g. 120 / 80).';
        } elseif ($vals['bp_systolic'] !== null && $vals['bp_diastolic'] !== null && $vals['bp_diastolic'] >= $vals['bp_systolic']) {
            $errors['bp_diastolic'] = 'The lower number must be below the upper number.';
        }
        $onOxygen = isset($data['on_oxygen']) && $data['on_oxygen'] !== '' ? (bool) filter_var($data['on_oxygen'], FILTER_VALIDATE_BOOLEAN) : null;
        if (!$onOxygen) {
            $vals['oxygen_lpm'] = null;
        }
        $avpu = $data['consciousness'] ?? null;
        if ($avpu !== null && $avpu !== '' && !in_array($avpu, self::CONSCIOUSNESS, true)) {
            $errors['consciousness'] = 'Choose Alert, Confused, Voice, Pain or Unresponsive.';
        }
        $avpu = $avpu === '' ? null : $avpu;
        $notes = trim((string) ($data['notes'] ?? ''));
        if (mb_strlen($notes) > 500) {
            $errors['notes'] = 'Keep the note under 500 characters.';
        }
        $measured = array_filter($vals, fn($v, $k) => $v !== null && $k !== 'oxygen_lpm', ARRAY_FILTER_USE_BOTH);
        if (!$measured && !$errors) {
            $errors['form'] = 'Enter at least one vital sign.';
        }

        // When taken: now by default; up to 24 h back, not in the future, not before admission.
        $now = $this->dbNow();
        $taken = $now;
        if (!empty($data['taken_at'])) {
            $ts = self::ts(str_replace('T', ' ', (string) $data['taken_at']));
            if ($ts === null) {
                $errors['taken_at'] = 'Invalid time.';
            } else {
                $taken = gmdate('Y-m-d H:i:s', $ts);
                if ($ts > self::ts($now) + 300) {
                    $errors['taken_at'] = 'The time can\'t be in the future.';
                } elseif ($ts < self::ts($now) - 86400) {
                    $errors['taken_at'] = 'Vitals older than 24 hours can\'t be added here.';
                } elseif ($ts < self::ts($adm['admission_date']) - 60) {
                    $errors['taken_at'] = 'That is before the patient was admitted.';
                }
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => $errors['form'] ?? reset($errors), 'errors' => $errors];
        }

        // NEWS2 for this set, with the patient's SpO2 scale.
        $scale = $this->spo2Scale($admId);
        $n = News2::score([
            'resp_rate' => $vals['resp_rate'], 'spo2' => $vals['spo2'], 'on_oxygen' => $onOxygen, 'bp_systolic' => $vals['bp_systolic'],
            'heart_rate' => $vals['heart_rate'], 'consciousness' => $avpu, 'temperature_c' => $vals['temperature_c'],
        ], $scale);

        $db->prepare(
            "INSERT INTO inpatient_vitals (admission_id, patient_id, taken_at, bp_systolic, bp_diastolic, heart_rate, resp_rate, temperature_c, spo2,
                on_oxygen, oxygen_lpm, consciousness, pain_score, blood_sugar_mgdl, notes, news2_score, news2_risk, news2_complete, news2_scale, news2_parts,
                recorded_by, recorded_at)
             VALUES (:a, :p, :t, :sys, :dia, :hr, :rr, :temp, :spo2, :o2, :lpm, :avpu, :pain, :bs, :notes, :ns, :nr, :nc, :nsc, :np, :by, NOW())"
        )->execute([
            'ns' => $n['score'], 'nr' => $n['risk'], 'nc' => $n['complete'] ? 1 : 0, 'nsc' => $scale, 'np' => json_encode($n['parts']),
            'a' => $admId, 'p' => $adm['patient_id'], 't' => $taken,
            'sys' => $vals['bp_systolic'], 'dia' => $vals['bp_diastolic'], 'hr' => $vals['heart_rate'], 'rr' => $vals['resp_rate'],
            'temp' => $vals['temperature_c'], 'spo2' => $vals['spo2'], 'o2' => $onOxygen === null ? null : ($onOxygen ? 1 : 0), 'lpm' => $vals['oxygen_lpm'],
            'avpu' => $avpu, 'pain' => $vals['pain_score'], 'bs' => $vals['blood_sugar_mgdl'], 'notes' => $notes !== '' ? $notes : null,
            'by' => (int) ($actor['id'] ?? 0) ?: null,
        ]);
        $id = (int) $db->lastInsertId();
        $alert = (new News2AlertService())->evaluate($admId, (int) ($actor['id'] ?? 0) ?: null);
        $summary = $this->summaries([$admId])[$admId] ?? null;
        return ['success' => true, 'message' => 'Vital signs saved.', 'data' => ['id' => $id, 'set' => $this->set($id), 'summary' => $summary, 'alert' => $alert]];
    }

    /** Void a wrong entry (kept, struck through). By the person who recorded it, a charge nurse or an admin. */
    public function void(int $id, string $reason, array $actor): array
    {
        $db = Database::connection();
        $set = $this->set($id);
        if (!$set) {
            return ['success' => false, 'message' => 'Vital signs not found.', 'not_found' => true];
        }
        if ($set['voided_at']) {
            return ['success' => false, 'message' => 'Already voided.'];
        }
        $role = (string) ($actor['role'] ?? '');
        if ($set['recorded_by'] !== (int) ($actor['id'] ?? 0) && !in_array($role, ['admin', 'charge_nurse'], true)) {
            return ['success' => false, 'message' => 'Only the person who recorded it, a charge nurse or an admin can void it.', 'forbidden' => true];
        }
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Say why it is being voided (e.g. wrong patient).', 'errors' => ['reason' => 'Required.']];
        }
        $db->prepare("UPDATE inpatient_vitals SET voided_at = NOW(), voided_by = :by, void_reason = :r WHERE id = :id AND voided_at IS NULL")
            ->execute(['by' => (int) $actor['id'], 'r' => mb_substr($reason, 0, 255), 'id' => $id]);
        (new News2AlertService())->evaluate($set['admission_id'], (int) $actor['id']);
        return ['success' => true, 'message' => 'Entry voided.', 'data' => $this->set($id)];
    }

    /** data: admission_id, every_hours, reason? */
    public function setSchedule(array $data, array $actor): array
    {
        $db = Database::connection();
        $admId = (int) ($data['admission_id'] ?? 0);
        $hours = (int) ($data['every_hours'] ?? 0);
        if (!in_array($hours, self::ALLOWED_HOURS, true)) {
            return ['success' => false, 'message' => 'Choose every 1, 2, 4, 6, 8, 12 or 24 hours.', 'errors' => ['every_hours' => 'Invalid.']];
        }
        $stmt = $db->prepare("SELECT 1 FROM inpatient_admissions WHERE id = :id AND status IN " . self::ACTIVE);
        $stmt->execute(['id' => $admId]);
        if (!$stmt->fetchColumn()) {
            return ['success' => false, 'message' => 'This patient is not admitted.', 'not_found' => true];
        }
        $reason = trim((string) ($data['reason'] ?? ''));
        $db->prepare(
            "INSERT INTO inpatient_vitals_schedules (admission_id, every_hours, reason, set_by, set_at) VALUES (:a, :h, :r, :by, NOW())
             ON DUPLICATE KEY UPDATE every_hours = VALUES(every_hours), reason = VALUES(reason), set_by = VALUES(set_by), set_at = NOW()"
        )->execute(['a' => $admId, 'h' => $hours, 'r' => $reason !== '' ? mb_substr($reason, 0, 255) : null, 'by' => (int) ($actor['id'] ?? 0) ?: null]);
        return ['success' => true, 'message' => "Vitals now every {$hours} hour" . ($hours === 1 ? '' : 's') . '.', 'data' => $this->summaries([$admId])[$admId] ?? null];
    }

    /** SpO2 scale 2 (88-92% target) is a doctor's decision. data: admission_id, spo2_scale (1|2), reason? */
    public function setScale(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', ['admin', 'doctor'], true)) {
            return ['success' => false, 'message' => 'The SpO₂ scale is set by a doctor.', 'forbidden' => true];
        }
        $admId = (int) ($data['admission_id'] ?? 0);
        $scale = (int) ($data['spo2_scale'] ?? 0);
        $reason = trim((string) ($data['reason'] ?? ''));
        if (!in_array($scale, [1, 2], true)) {
            return ['success' => false, 'message' => 'Choose scale 1 or 2.'];
        }
        if ($scale === 2 && $reason === '') {
            return ['success' => false, 'message' => 'Say why (e.g. COPD with prescribed target 88–92%).', 'errors' => ['reason' => 'Required for scale 2.']];
        }
        $db = Database::connection();
        $stmt = $db->prepare("SELECT 1 FROM inpatient_admissions WHERE id = :id AND status IN " . self::ACTIVE);
        $stmt->execute(['id' => $admId]);
        if (!$stmt->fetchColumn()) {
            return ['success' => false, 'message' => 'This patient is not admitted.', 'not_found' => true];
        }
        $db->prepare(
            "INSERT INTO inpatient_news2_settings (admission_id, spo2_scale, reason, set_by, set_at) VALUES (:a, :s, :r, :by, NOW())
             ON DUPLICATE KEY UPDATE spo2_scale = VALUES(spo2_scale), reason = VALUES(reason), set_by = VALUES(set_by), set_at = NOW()"
        )->execute(['a' => $admId, 's' => $scale, 'r' => $reason !== '' ? mb_substr($reason, 0, 255) : null, 'by' => (int) $actor['id']]);
        return ['success' => true, 'message' => $scale === 2 ? 'SpO₂ scale 2 (target 88–92%) from the next set.' : 'SpO₂ scale 1 from the next set.',
            'data' => $this->summaries([$admId])[$admId] ?? null];
    }

    public function spo2Scale(int $admissionId): int
    {
        $stmt = Database::connection()->prepare("SELECT spo2_scale FROM inpatient_news2_settings WHERE admission_id = :a");
        $stmt->execute(['a' => $admissionId]);
        return (int) ($stmt->fetchColumn() ?: 1);
    }

    /** NEWS2 for a stored set: as saved, or worked out now for sets saved before scoring existed. */
    public function news2Of(array $row): array
    {
        $num = fn($k, $float = false) => $row[$k] === null || $row[$k] === '' ? null : ($float ? (float) $row[$k] : (int) $row[$k]);
        $values = [
            'resp_rate' => $num('resp_rate'), 'spo2' => $num('spo2'),
            'on_oxygen' => $row['on_oxygen'] === null || $row['on_oxygen'] === '' ? null : (bool) (int) $row['on_oxygen'],
            'bp_systolic' => $num('bp_systolic'), 'heart_rate' => $num('heart_rate'),
            'consciousness' => $row['consciousness'] ?: null, 'temperature_c' => $num('temperature_c', true),
        ];
        $scale = isset($row['news2_scale']) && $row['news2_scale'] !== null ? (int) $row['news2_scale'] : 1;
        $n = News2::score($values, $scale);
        if (isset($row['news2_score']) && $row['news2_score'] !== null) {
            // The saved score wins (it is what staff saw and acted on).
            $n['score'] = (int) $row['news2_score'];
            $n['risk'] = $row['news2_risk'];
            $n['complete'] = (int) $row['news2_complete'] === 1;
        }
        $n['risk_label'] = News2::RISK_LABELS[$n['risk']];
        return $n;
    }

    /** All sets for an admission (oldest first), within the last `hours` (0 = whole stay). */
    public function history(int $admissionId, int $hours = 72): array
    {
        $db = Database::connection();
        $sql = "SELECT v.*, " . self::userNameSql('v.recorded_by') . " AS recorded_by_name, " . self::userNameSql('v.voided_by') . " AS voided_by_name
                FROM inpatient_vitals v WHERE v.admission_id = :a";
        if ($hours > 0) {
            $sql .= " AND v.taken_at >= NOW() - INTERVAL " . (int) $hours . " HOUR";
        }
        $stmt = $db->prepare($sql . " ORDER BY v.taken_at, v.id");
        $stmt->execute(['a' => $admissionId]);
        $sets = array_map(fn($v) => $this->shape($v), $stmt->fetchAll(PDO::FETCH_ASSOC));
        return [
            'summary' => $this->summaries([$admissionId])[$admissionId] ?? null,
            'sets' => $sets, 'hours' => $hours, 'now' => $this->dbNow(), 'normal' => self::NORMAL,
        ];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /**
     * ok / due_soon / due / overdue. Next due = last set + interval (no set yet: due from admission).
     */
    public function status(?string $lastTaken, string $admittedAt, int $every, string $now): array
    {
        $base = $lastTaken ?? $admittedAt;
        $due = self::ts($base) + ($lastTaken ? $every * 3600 : 0);
        $n = self::ts($now);
        $min = (int) floor(($n - $due) / 60);   // minutes past due (negative = still to come)
        $state = $min > self::OVERDUE_AFTER_MIN ? 'overdue' : ($min >= 0 ? 'due' : ($min >= -self::DUE_SOON_MIN ? 'due_soon' : 'ok'));
        return ['state' => $state, 'next_due' => gmdate('Y-m-d H:i:s', $due), 'minutes' => $min, 'never' => $lastTaken === null];
    }

    /**
     * DB time string -> seconds, read as UTC so adding hours never shifts across PHP's
     * daylight-saving changes (the DB clock has none). Formatted back with gmdate().
     */
    private static function ts(string $dt): ?int
    {
        try {
            return (new \DateTimeImmutable($dt, new \DateTimeZone('UTC')))->getTimestamp();
        } catch (\Exception $e) {
            return null;
        }
    }

    private function defaultHours(?string $wardType): int
    {
        return $wardType === 'ICU' ? self::DEFAULT_HOURS_ICU : self::DEFAULT_HOURS;
    }

    private function set(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT v.*, " . self::userNameSql('v.recorded_by') . " AS recorded_by_name, " . self::userNameSql('v.voided_by') . " AS voided_by_name
             FROM inpatient_vitals v WHERE v.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $v = $stmt->fetch(PDO::FETCH_ASSOC);
        return $v ? $this->shape($v) : null;
    }

    private function shape(array $v): array
    {
        $num = fn($x, $float = false) => $x === null ? null : ($float ? (float) $x : (int) $x);
        $out = [
            'id' => (int) $v['id'], 'admission_id' => (int) $v['admission_id'], 'taken_at' => $v['taken_at'],
            'bp_systolic' => $num($v['bp_systolic']), 'bp_diastolic' => $num($v['bp_diastolic']),
            'heart_rate' => $num($v['heart_rate']), 'resp_rate' => $num($v['resp_rate']),
            'temperature_c' => $num($v['temperature_c'], true), 'spo2' => $num($v['spo2']),
            'on_oxygen' => $v['on_oxygen'] === null ? null : (int) $v['on_oxygen'] === 1, 'oxygen_lpm' => $num($v['oxygen_lpm'], true),
            'consciousness' => $v['consciousness'], 'pain_score' => $num($v['pain_score']), 'blood_sugar_mgdl' => $num($v['blood_sugar_mgdl']),
            'notes' => $v['notes'],
            'recorded_by' => $v['recorded_by'] !== null ? (int) $v['recorded_by'] : null, 'recorded_by_name' => $v['recorded_by_name'] ?? null,
            'recorded_at' => $v['recorded_at'],
            'voided_at' => $v['voided_at'], 'voided_by_name' => $v['voided_at'] ? ($v['voided_by_name'] ?? null) : null, 'void_reason' => $v['void_reason'],
        ];
        $out['flags'] = $this->flags($out);
        $out['news2'] = $this->news2Of($v);
        return $out;
    }

    /** field => low / high, against the adult reference ranges. */
    public function flags(array $v): array
    {
        $flags = [];
        foreach (self::NORMAL as $f => [$low, $high]) {
            if (($v[$f] ?? null) === null) {
                continue;
            }
            if ($low !== null && $v[$f] < $low) {
                $flags[$f] = 'low';
            } elseif ($high !== null && $v[$f] >= $high) {
                $flags[$f] = 'high';
            }
        }
        return $flags;
    }

    private function dbNow(): string
    {
        return (string) Database::connection()->query("SELECT NOW()")->fetchColumn();
    }

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL
                 WHERE nu.id = {$column} LIMIT 1)";
    }
}
