<?php

namespace App\Modules\Icu\Services;

use App\Core\Database;
use App\Modules\InpatientVitals\Services\InpatientVitalsService;
use PDO;

/**
 * ICU (module 13, Phase 1: the ICU flowsheet) -- one patient's ICU day (07:00 to 07:00) hour by hour:
 *
 *   * recordHour() -- the hour's entry: vital signs (saved as an inpatient vital-signs set, so NEWS2 and
 *     the vitals graph see them), CVP, EtCO2, level of consciousness (GCS, RASS, pupils, CAM-ICU), oxygen
 *     device and ventilator settings. One live entry per hour; a correction voids the old one (reason).
 *   * Drips -- start (drug, amount in volume, dose unit, weight), change the rate (mL/h or the dose: the
 *     other is worked out), stop. The volume infused counts as intake hour by hour.
 *   * Intake and output (mL, by type) -- totals per hour, the hour's balance, the running balance for
 *     the ICU day, and the balance since admission.
 * Times come from the database clock; time maths is done on UTC timestamps (no daylight-saving shifts).
 */
class IcuService
{
    public const VIEW_ROLES = ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'cna'];
    public const RECORD_ROLES = ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse'];
    /** Intake / output may also be charted by nursing assistants. */
    public const IO_ROLES = ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'cna'];
    /** The ICU day starts at this hour. */
    public const DAY_START = 7;

    public const DEVICES = ['room_air' => 'Room air', 'nasal' => 'Nasal cannula', 'mask' => 'Face mask', 'nrb' => 'Non-rebreather mask',
        'hfnc' => 'High-flow nasal (HFNC)', 'niv' => 'Non-invasive (BiPAP / CPAP)', 'ventilator' => 'Ventilator (intubated / trach)'];
    public const VENT_MODES = ['AC/VC', 'AC/PC', 'PRVC', 'SIMV', 'PSV', 'CPAP', 'APRV', 'BiPAP'];
    public const REACTIONS = ['brisk', 'sluggish', 'fixed'];
    public const CAM = ['negative' => 'Negative', 'positive' => 'Positive (delirium)', 'unable' => 'Unable to assess (RASS −4/−5)'];
    public const RASS = [4 => 'Combative', 3 => 'Very agitated', 2 => 'Agitated', 1 => 'Restless', 0 => 'Alert and calm', -1 => 'Drowsy',
        -2 => 'Light sedation', -3 => 'Moderate sedation', -4 => 'Deep sedation', -5 => 'Unrousable'];
    public const IO_CATEGORIES = [
        'in' => ['iv' => 'IV fluids', 'blood' => 'Blood products', 'oral' => 'Oral', 'enteral' => 'Tube feeding', 'flush' => 'Flushes / medicines', 'other' => 'Other intake'],
        'out' => ['urine' => 'Urine', 'drain' => 'Drains', 'ng' => 'NG / gastric', 'stool' => 'Stool', 'emesis' => 'Vomit', 'blood' => 'Blood loss', 'other' => 'Other output'],
    ];
    public const AMOUNT_UNITS = ['mg', 'mcg', 'g', 'units', 'mmol'];
    public const DOSE_UNITS = ['mcg/kg/min', 'mcg/min', 'mcg/kg/h', 'mcg/h', 'mg/kg/h', 'mg/h', 'mg/min', 'units/kg/h', 'units/h', 'units/min', 'mmol/h', 'mL/h'];

    /** Field => [min, max, label, decimals] for the ICU extras. */
    private const LIMITS = [
        'cvp' => [-5, 40, 'CVP', 0], 'etco2' => [0, 150, 'EtCO₂', 0], 'o2_flow' => [0.5, 80, 'Oxygen flow', 1], 'fio2' => [21, 100, 'FiO₂', 0],
        'peep' => [0, 30, 'PEEP', 1], 'vt_set' => [50, 1500, 'Set tidal volume', 0], 'rr_set' => [0, 60, 'Set rate', 0],
        'pressure_support' => [0, 40, 'Pressure support', 1], 'pinsp' => [0, 60, 'Inspiratory pressure', 1],
        'vt_exp' => [0, 2000, 'Exhaled tidal volume', 0], 'rr_total' => [0, 80, 'Total rate', 0], 'ppeak' => [0, 80, 'Peak pressure', 1], 'pplat' => [0, 60, 'Plateau pressure', 1],
        'pupil_l' => [1, 9, 'Left pupil', 1], 'pupil_r' => [1, 9, 'Right pupil', 1],
    ];
    private const VENT_FIELDS = ['vent_mode', 'peep', 'vt_set', 'rr_set', 'pressure_support', 'pinsp', 'vt_exp', 'rr_total', 'ppeak', 'pplat'];
    private const ACTIVE = "('Admitted', 'Pending Discharge')";

    // ------------------------------------------------------------------
    // ICU board
    // ------------------------------------------------------------------

    /** Patients in ICU wards now (filters: ward_id?): bed, last hour charted, breathing support, drips running, today's balance. */
    public function board(array $filters = []): array
    {
        $db = Database::connection();
        $wards = $db->query("SELECT id, ward_name, ward_code FROM hospital_wards WHERE is_active = 1 AND ward_type = 'ICU' ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
        $ids = array_map(fn($w) => (int) $w['id'], $wards);
        $wardId = (int) ($filters['ward_id'] ?? 0);
        if ($wardId && in_array($wardId, $ids, true)) {
            $ids = [$wardId];
        }
        $now = $this->now();
        $rows = $ids ? $db->query(
            "SELECT a.id, a.patient_id, a.patient_name, a.patient_mrn, a.patient_age, a.gender, a.admission_date, a.admitting_diagnosis, a.attending_physician,
                    w.ward_code, w.ward_name, b.bed_number
             FROM inpatient_admissions a JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id
             WHERE a.status IN " . self::ACTIVE . " AND a.ward_id IN (" . implode(',', $ids) . ") ORDER BY w.id, b.bed_number"
        )->fetchAll(PDO::FETCH_ASSOC) : [];
        [$dayFrom, $dayTo] = $this->dayRange($this->dayOf($now));
        $hourNow = substr($now, 0, 13) . ':00:00';
        $patients = [];
        foreach ($rows as $a) {
            $aid = (int) $a['id'];
            $last = $this->entries($db, $aid, null, null, 1)[0] ?? null;
            $drips = array_values(array_filter($this->drips($db, $aid, $dayFrom, $dayTo, $now), fn($d) => $d['running']));
            $bal = $this->balance($db, $aid, $dayFrom, min($dayTo, $now), $now);
            $patients[] = [
                'admission_id' => $aid, 'patient_id' => (int) $a['patient_id'], 'name' => $a['patient_name'], 'mrn' => $a['patient_mrn'], 'age' => $a['patient_age'],
                'sex' => $a['gender'], 'ward' => $a['ward_code'], 'ward_name' => $a['ward_name'], 'bed' => $a['bed_number'], 'admitted_at' => $a['admission_date'],
                'diagnosis' => $a['admitting_diagnosis'], 'attending' => $a['attending_physician'],
                'icu_day' => max(1, (int) floor(($this->ts($now) - $this->ts($a['admission_date'])) / 86400) + 1),
                'last' => $last, 'this_hour_done' => $last && $last['hour_at'] === $hourNow,
                'minutes_since_last' => $last ? intdiv($this->ts($now) - $this->ts($last['hour_at']), 60) : null,
                'drips' => array_map(fn($d) => ['drug' => $d['drug_name'], 'rate' => $d['current_rate'], 'dose' => $d['current_dose'], 'dose_unit' => $d['dose_unit']], $drips),
                'balance_today' => $bal,
            ];
        }
        return ['wards' => $wards, 'ward_id' => $wardId ?: null, 'patients' => $patients, 'now' => $now, 'day_start' => self::DAY_START];
    }

    // ------------------------------------------------------------------
    // The flowsheet
    // ------------------------------------------------------------------

    /** One ICU day of one patient. $day: YYYY-MM-DD (the date the day starts at 07:00); default the current ICU day. */
    public function flowsheet(int $admissionId, ?string $day = null): ?array
    {
        $db = Database::connection();
        $a = $this->admission($db, $admissionId, true);
        if (!$a) {
            return null;
        }
        $now = $this->now();
        $today = $this->dayOf($now);
        $day = $day && preg_match('/^\d{4}-\d{2}-\d{2}$/', $day) && date('Y-m-d', strtotime($day)) === $day ? $day : $today;
        $first = $this->dayOf($a['admission_date']);
        if ($day < $first) {
            $day = $first;
        }
        if ($day > $today) {
            $day = $today;
        }
        [$from, $to] = $this->dayRange($day);
        $until = min($to, $now);

        $entries = [];
        foreach ($this->entries($db, $admissionId, $from, $to) as $e) {
            $entries[$e['hour_at']] = $e;
        }
        $voided = $db->prepare("SELECT hour_at, COUNT(*) FROM icu_hourly WHERE admission_id = :a AND voided_at IS NOT NULL AND hour_at >= :f AND hour_at < :t GROUP BY hour_at");
        $voided->execute(['a' => $admissionId, 'f' => $from, 't' => $to]);
        $corrections = $voided->fetchAll(PDO::FETCH_KEY_PAIR);

        $drips = $this->drips($db, $admissionId, $from, $to, $now);
        $io = $this->ioEntries($db, $admissionId, $from, $to);
        $hours = [];
        $cum = 0.0;
        $byCat = ['in' => [], 'out' => []];
        for ($i = 0; $i < 24; $i++) {
            $h = $this->plus($from, $i * 60);
            $hEnd = $this->plus($h, 60);
            $in = ['drips' => 0.0];
            $out = [];
            foreach ($io as $x) {
                if ($x['voided_at'] === null && $x['at'] >= $h && $x['at'] < $hEnd) {
                    if ($x['kind'] === 'in') {
                        $in[$x['category']] = ($in[$x['category']] ?? 0) + $x['volume_ml'];
                    } else {
                        $out[$x['category']] = ($out[$x['category']] ?? 0) + $x['volume_ml'];
                    }
                }
            }
            foreach ($drips as $d) {
                $in['drips'] += $d['hours'][$i]['ml'];
            }
            $in['drips'] = round($in['drips'], 1);
            $tIn = round(array_sum($in), 1);
            $tOut = round(array_sum($out), 1);
            $future = $h > $now;
            if (!$future) {
                $cum += $tIn - $tOut;
            }
            foreach (['in' => $in, 'out' => $out] as $k => $vals) {
                foreach ($vals as $c => $v) {
                    $byCat[$k][$c] = round(($byCat[$k][$c] ?? 0) + $v, 1);
                }
            }
            $hours[] = [
                'at' => $h, 'label' => substr($h, 11, 2), 'future' => $future, 'current' => $h <= $now && $now < $hEnd,
                'entry' => $entries[$h] ?? null, 'corrections' => (int) ($corrections[$h] ?? 0),
                'in' => $in, 'out' => $out, 'total_in' => $tIn, 'total_out' => $tOut, 'net' => round($tIn - $tOut, 1), 'cumulative' => $future ? null : round($cum, 1),
            ];
        }
        $dayIn = round(array_sum($byCat['in']), 1);
        $dayOut = round(array_sum($byCat['out']), 1);
        $since = $this->balance($db, $admissionId, $a['admission_date'], $now, $now);
        $active = in_array($a['status'], ['Admitted', 'Pending Discharge'], true);
        return [
            'admission' => [
                'id' => (int) $a['id'], 'patient_id' => (int) $a['patient_id'], 'name' => $a['patient_name'], 'mrn' => $a['patient_mrn'], 'age' => $a['patient_age'],
                'sex' => $a['gender'], 'ward' => $a['ward_code'], 'ward_name' => $a['ward_name'], 'ward_type' => $a['ward_type'], 'bed' => $a['bed_number'],
                'admitted_at' => $a['admission_date'], 'diagnosis' => $a['admitting_diagnosis'], 'attending' => $a['attending_physician'],
                'status' => $a['status'], 'active' => $active, 'weight_kg' => $this->weight($db, $a),
                'allergies' => $this->allergies($db, (int) $a['patient_id']),
            ],
            'day' => $day, 'from' => $from, 'to' => $to, 'now' => $now, 'is_today' => $day === $today,
            'prev_day' => $day > $first ? $this->dayShift($day, -1) : null, 'next_day' => $day < $today ? $this->dayShift($day, 1) : null,
            'hours' => $hours, 'drips' => $drips,
            'io' => array_map(fn($x) => $x + ['category_label' => self::IO_CATEGORIES[$x['kind']][$x['category']] ?? $x['category']], $io),
            'totals' => ['in' => $dayIn, 'out' => $dayOut, 'net' => round($dayIn - $dayOut, 1), 'by_category' => $byCat, 'until' => $until],
            'since_admission' => $since,
        ];
    }

    public static function options(): array
    {
        return ['devices' => self::DEVICES, 'vent_modes' => self::VENT_MODES, 'reactions' => self::REACTIONS, 'cam' => self::CAM, 'rass' => self::RASS,
            'io_categories' => self::IO_CATEGORIES, 'amount_units' => self::AMOUNT_UNITS, 'dose_units' => self::DOSE_UNITS, 'day_start' => self::DAY_START];
    }

    // ------------------------------------------------------------------
    // The hour's entry
    // ------------------------------------------------------------------

    /**
     * data: admission_id, hour_at (YYYY-MM-DD HH:00), the vital signs (bp_systolic, bp_diastolic, heart_rate, resp_rate,
     * temperature_c, spo2, pain_score, blood_sugar_mgdl), cvp, etco2, gcs_e, gcs_v, gcs_m, gcs_intubated, rass, pupil_l,
     * pupil_r, pupil_l_react, pupil_r_react, cam_icu, o2_device, o2_flow, fio2, the ventilator settings, notes,
     * correct_reason (when the hour already has an entry).
     */
    public function recordHour(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::RECORD_ROLES, true)) {
            return ['success' => false, 'message' => 'The ICU flowsheet is charted by the nurses and doctors.', 'forbidden' => true];
        }
        $db = Database::connection();
        $a = $this->admission($db, (int) ($data['admission_id'] ?? 0));
        if (!$a) {
            return ['success' => false, 'message' => 'This patient is not admitted (or was discharged).', 'not_found' => true];
        }
        $now = $this->now();
        $hour = str_replace('T', ' ', trim((string) ($data['hour_at'] ?? '')));
        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}(:00)?$/', $hour)) {
            $hour = substr($hour, 0, 13) . ':00:00';
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:00:00$/', $hour) || $this->ts($hour) === null) {
            return ['success' => false, 'message' => 'Which hour is this for?', 'errors' => ['hour_at' => 'Required.']];
        }
        if ($this->ts($hour) > $this->ts($now) + 300) {
            return ['success' => false, 'message' => 'That hour hasn\'t come yet.', 'errors' => ['hour_at' => 'Future.']];
        }
        if ($this->ts($hour) < $this->ts($now) - 86400) {
            return ['success' => false, 'message' => 'Hours more than 24 hours ago can\'t be charted here.', 'errors' => ['hour_at' => 'Too old.']];
        }
        if ($this->ts($hour) < $this->ts(substr($a['admission_date'], 0, 13) . ':00:00')) {
            return ['success' => false, 'message' => 'That is before the patient was admitted.', 'errors' => ['hour_at' => 'Before admission.']];
        }

        $errors = [];
        $vals = [];
        foreach (self::LIMITS as $f => [$min, $max, $label, $dec]) {
            $raw = $data[$f] ?? null;
            if ($raw === null || $raw === '') {
                $vals[$f] = null;
                continue;
            }
            if (!is_numeric($raw) || (float) $raw < $min || (float) $raw > $max || ($dec === 0 && floor((float) $raw) != (float) $raw)) {
                $errors[$f] = "{$label}: " . ($dec === 0 ? 'a whole number ' : '') . "{$min}–{$max}.";
                continue;
            }
            $vals[$f] = $dec === 0 ? (int) $raw : round((float) $raw, $dec);
        }
        // Level of consciousness
        $gcs = [];
        $intubated = !empty($data['gcs_intubated']) && (string) $data['gcs_intubated'] !== '0';
        foreach (['gcs_e' => 4, 'gcs_v' => 5, 'gcs_m' => 6] as $f => $max) {
            $raw = $data[$f] ?? '';
            $gcs[$f] = $raw === '' || $raw === null ? null : (ctype_digit((string) $raw) && (int) $raw >= 1 && (int) $raw <= $max ? (int) $raw : false);
            if ($gcs[$f] === false) {
                $errors[$f] = 'GCS ' . strtoupper(substr($f, 4)) . ": 1–{$max}.";
            }
        }
        if ($intubated) {
            $gcs['gcs_v'] = null;
        }
        $given = array_filter([$gcs['gcs_e'], $intubated ? 1 : $gcs['gcs_v'], $gcs['gcs_m']], fn($x) => $x !== null && $x !== false);
        if ($given && count($given) < 3) {
            $errors['gcs_e'] = 'Score all three parts of the GCS (eyes, verbal' . ($intubated ? ' = T' : '') . ', motor).';
        }
        $rass = $data['rass'] ?? '';
        if ($rass !== '' && $rass !== null && (!preg_match('/^[+-]?\d$/', (string) $rass) || (int) $rass < -5 || (int) $rass > 4)) {
            $errors['rass'] = 'RASS: −5 to +4.';
        }
        $rass = $rass === '' || $rass === null ? null : (int) $rass;
        foreach (['pupil_l_react', 'pupil_r_react'] as $f) {
            $v = (string) ($data[$f] ?? '');
            if ($v !== '' && !in_array($v, self::REACTIONS, true)) {
                $errors[$f] = 'Brisk, sluggish or fixed.';
            }
            $vals[$f] = $v !== '' ? $v : null;
        }
        $cam = (string) ($data['cam_icu'] ?? '');
        if ($cam !== '' && !isset(self::CAM[$cam])) {
            $errors['cam_icu'] = 'Choose the CAM-ICU result.';
        }
        // Breathing support
        $device = (string) ($data['o2_device'] ?? '');
        if ($device !== '' && !isset(self::DEVICES[$device])) {
            $errors['o2_device'] = 'Choose the oxygen device.';
        }
        $mode = trim((string) ($data['vent_mode'] ?? ''));
        if (in_array($device, ['ventilator', 'niv'], true)) {
            if ($mode === '' && $device === 'ventilator') {
                $errors['vent_mode'] = 'The ventilator mode.';
            } elseif ($mode !== '' && !in_array($mode, self::VENT_MODES, true)) {
                $errors['vent_mode'] = 'Choose the mode.';
            }
            if ($vals['fio2'] === null && !isset($errors['fio2'])) {
                $errors['fio2'] = 'FiO₂ on the ventilator.';
            }
        } else {
            foreach (self::VENT_FIELDS as $f) {
                $vals[$f] = null;
            }
            $mode = '';
        }
        if ($device === 'room_air') {
            $vals['o2_flow'] = null;
            $vals['fio2'] = null;
        }
        if (in_array($device, ['ventilator', 'niv'], true)) {
            $vals['o2_flow'] = null;
        }
        $notes = trim((string) ($data['notes'] ?? ''));
        if (mb_strlen($notes) > 500) {
            $errors['notes'] = 'Keep the note under 500 characters.';
        }
        $vitalKeys = ['bp_systolic', 'bp_diastolic', 'heart_rate', 'resp_rate', 'temperature_c', 'spo2', 'pain_score', 'blood_sugar_mgdl'];
        $hasVitals = (bool) array_filter($vitalKeys, fn($k) => ($data[$k] ?? '') !== '' && $data[$k] !== null);
        $hasIcu = $hasVitals || $given || $rass !== null || $device !== '' || $cam !== '' || array_filter($vals, fn($v) => $v !== null);
        if (!$hasIcu && !$errors) {
            $errors['form'] = 'Enter at least one value for this hour.';
        }

        // Already charted: a correction (by whoever charted it, a charge nurse or an admin).
        $old = $db->prepare("SELECT * FROM icu_hourly WHERE admission_id = :a AND slot_at = :h");
        $old->execute(['a' => $a['id'], 'h' => $hour]);
        $old = $old->fetch(PDO::FETCH_ASSOC) ?: null;
        $reason = trim((string) ($data['correct_reason'] ?? ''));
        if ($old && !$errors) {
            if ((int) $old['recorded_by'] !== (int) $actor['id'] && !in_array($actor['role'], ['admin', 'charge_nurse'], true)) {
                return ['success' => false, 'message' => substr($hour, 11, 5) . ' was charted by someone else: only they, a charge nurse or an admin can correct it.', 'forbidden' => true];
            }
            if ($reason === '') {
                return ['success' => false, 'message' => substr($hour, 11, 5) . ' is already charted. Say why you are correcting it.', 'errors' => ['correct_reason' => 'Required.'], 'needs_reason' => true];
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => $errors['form'] ?? reset($errors), 'errors' => $errors];
        }

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT icu_hour');
        try {
            $vs = new InpatientVitalsService();
            if ($old) {
                $db->prepare("UPDATE icu_hourly SET slot_at = NULL, voided_at = NOW(), voided_by = :u, void_reason = :r WHERE id = :id")
                    ->execute(['u' => (int) $actor['id'], 'r' => 'Corrected: ' . mb_substr($reason, 0, 240), 'id' => $old['id']]);
                if ($old['vitals_id']) {
                    $db->prepare("UPDATE inpatient_vitals SET voided_at = NOW(), voided_by = :u, void_reason = :r WHERE id = :id AND voided_at IS NULL")
                        ->execute(['u' => (int) $actor['id'], 'r' => 'ICU flowsheet correction: ' . mb_substr($reason, 0, 200), 'id' => $old['vitals_id']]);
                }
            }
            $vitalsId = null;
            $alert = null;
            if ($hasVitals) {
                $r = $vs->record([
                    'admission_id' => $a['id'], 'taken_at' => $hour,
                    'bp_systolic' => $data['bp_systolic'] ?? null, 'bp_diastolic' => $data['bp_diastolic'] ?? null, 'heart_rate' => $data['heart_rate'] ?? null,
                    'resp_rate' => $data['resp_rate'] ?? null, 'temperature_c' => $data['temperature_c'] ?? null, 'spo2' => $data['spo2'] ?? null,
                    'pain_score' => $data['pain_score'] ?? null, 'blood_sugar_mgdl' => $data['blood_sugar_mgdl'] ?? null,
                    'on_oxygen' => $device === '' ? '' : ($device === 'room_air' ? '0' : '1'),
                    'oxygen_lpm' => $vals['o2_flow'], 'consciousness' => self::avpu($gcs['gcs_e'], $intubated ? null : $gcs['gcs_v'], $intubated) ?? '',
                    'notes' => $notes !== '' ? 'ICU flowsheet: ' . mb_substr($notes, 0, 480) : 'ICU flowsheet',
                ], $actor);
                if (!$r['success']) {
                    throw new IcuInputException($r['message'], $r['errors'] ?? []);
                }
                $vitalsId = (int) $r['data']['id'];
                $alert = $r['data']['alert'] ?? null;
            } elseif ($old && $old['vitals_id']) {
                // The corrected entry had vitals and the new one has none: the early warning score follows.
                (new \App\Modules\InpatientVitals\Services\News2AlertService())->evaluate((int) $a['id'], (int) $actor['id']);
            }
            $row = [
                'admission_id' => $a['id'], 'patient_id' => $a['patient_id'], 'hour_at' => $hour, 'slot_at' => $hour, 'vitals_id' => $vitalsId,
                'gcs_e' => $gcs['gcs_e'], 'gcs_v' => $intubated ? null : $gcs['gcs_v'], 'gcs_m' => $gcs['gcs_m'], 'gcs_intubated' => $intubated ? 1 : 0,
                'rass' => $rass, 'cam_icu' => $cam !== '' ? $cam : null, 'o2_device' => $device !== '' ? $device : null, 'vent_mode' => $mode !== '' ? $mode : null,
                'notes' => $notes !== '' ? $notes : null, 'recorded_by' => (int) $actor['id'],
            ];
            foreach (array_keys(self::LIMITS) as $f) {
                $row[$f] = $vals[$f];
            }
            $row['pupil_l_react'] = $vals['pupil_l_react'];
            $row['pupil_r_react'] = $vals['pupil_r_react'];
            $cols = array_keys($row);
            $db->prepare("INSERT INTO icu_hourly (" . implode(', ', $cols) . ", recorded_at) VALUES (:" . implode(', :', $cols) . ", NOW())")->execute($row);
            $id = (int) $db->lastInsertId();
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT icu_hour');
        } catch (IcuInputException $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT icu_hour');
            return ['success' => false, 'message' => $e->getMessage(), 'errors' => $e->errors];
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT icu_hour');
            throw $e;
        }
        $msg = ($old ? 'Corrected ' : 'Charted ') . substr($hour, 11, 5) . '.';
        if ($alert && !empty($alert['raised'])) {
            $msg .= ' Early warning score alert sent.';
        }
        return ['success' => true, 'message' => $msg, 'data' => ['id' => $id, 'entry' => $this->entries($db, (int) $a['id'], $hour, $this->plus($hour, 60))[0] ?? null]];
    }

    /** Void an hour's entry (wrong patient, wrong hour). */
    public function voidHour(int $id, string $reason, array $actor): array
    {
        $db = Database::connection();
        $st = $db->prepare("SELECT * FROM icu_hourly WHERE id = :id");
        $st->execute(['id' => $id]);
        $e = $st->fetch(PDO::FETCH_ASSOC);
        if (!$e) {
            return ['success' => false, 'message' => 'Entry not found.', 'not_found' => true];
        }
        if ($e['voided_at']) {
            return ['success' => false, 'message' => 'Already voided.'];
        }
        if ((int) $e['recorded_by'] !== (int) ($actor['id'] ?? 0) && !in_array($actor['role'] ?? '', ['admin', 'charge_nurse'], true)) {
            return ['success' => false, 'message' => 'Only whoever charted it, a charge nurse or an admin can void it.', 'forbidden' => true];
        }
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Say why (e.g. wrong patient).', 'errors' => ['reason' => 'Required.']];
        }
        $db->prepare("UPDATE icu_hourly SET slot_at = NULL, voided_at = NOW(), voided_by = :u, void_reason = :r WHERE id = :id")
            ->execute(['u' => (int) $actor['id'], 'r' => mb_substr($reason, 0, 255), 'id' => $id]);
        if ($e['vitals_id']) {
            $db->prepare("UPDATE inpatient_vitals SET voided_at = NOW(), voided_by = :u, void_reason = :r WHERE id = :id AND voided_at IS NULL")
                ->execute(['u' => (int) $actor['id'], 'r' => 'ICU flowsheet entry voided: ' . mb_substr($reason, 0, 200), 'id' => $e['vitals_id']]);
            (new \App\Modules\InpatientVitals\Services\News2AlertService())->evaluate((int) $e['admission_id'], (int) $actor['id']);
        }
        return ['success' => true, 'message' => substr($e['hour_at'], 11, 5) . ' entry voided.'];
    }

    /** ACVPU from the GCS: eyes open by themselves and oriented = Alert; eyes open, not oriented = Confused; to voice = Voice; to pain = Pain; none = Unresponsive. */
    public static function avpu(?int $e, ?int $v, bool $intubated = false): ?string
    {
        if ($e === null) {
            return null;
        }
        return match (true) {
            $e === 4 => ($intubated || $v === 5) ? 'Alert' : ($v === null ? null : 'Confused'),
            $e === 3 => 'Voice',
            $e === 2 => 'Pain',
            default => 'Unresponsive',
        };
    }

    // ------------------------------------------------------------------
    // Intake and output
    // ------------------------------------------------------------------

    /** data: admission_id, kind (in | out), category, volume_ml, at (HH:MM, or YYYY-MM-DD HH:MM; blank = now), label? */
    public function addIo(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::IO_ROLES, true)) {
            return ['success' => false, 'message' => 'Intake and output are charted by the ward staff.', 'forbidden' => true];
        }
        $db = Database::connection();
        $a = $this->admission($db, (int) ($data['admission_id'] ?? 0));
        if (!$a) {
            return ['success' => false, 'message' => 'This patient is not admitted (or was discharged).', 'not_found' => true];
        }
        $kind = (string) ($data['kind'] ?? '');
        $cat = (string) ($data['category'] ?? '');
        $errors = [];
        if (!isset(self::IO_CATEGORIES[$kind])) {
            $errors['kind'] = 'Intake or output?';
        } elseif (!isset(self::IO_CATEGORIES[$kind][$cat])) {
            $errors['category'] = 'Choose the type.';
        }
        $vol = $data['volume_ml'] ?? '';
        if (!is_numeric($vol) || (float) $vol <= 0 || (float) $vol > 10000) {
            $errors['volume_ml'] = 'Volume in mL (up to 10 000).';
        }
        $label = trim((string) ($data['label'] ?? ''));
        if (mb_strlen($label) > 80) {
            $errors['label'] = 'Keep it under 80 characters.';
        }
        $at = $this->when($db, (string) ($data['at'] ?? ''), $a, $errors, 'at');
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $db->prepare(
            "INSERT INTO icu_io (admission_id, patient_id, kind, category, label, volume_ml, at, recorded_by, recorded_at) VALUES (:a, :p, :k, :c, :l, :v, :at, :u, NOW())"
        )->execute(['a' => $a['id'], 'p' => $a['patient_id'], 'k' => $kind, 'c' => $cat, 'l' => $label !== '' ? $label : null, 'v' => round((float) $vol, 1), 'at' => $at, 'u' => (int) $actor['id']]);
        return ['success' => true, 'message' => self::IO_CATEGORIES[$kind][$cat] . ': ' . rtrim(rtrim(number_format((float) $vol, 1, '.', ''), '0'), '.') . ' mL at ' . substr($at, 11, 5) . '.',
            'data' => ['id' => (int) $db->lastInsertId()]];
    }

    public function voidIo(int $id, string $reason, array $actor): array
    {
        $db = Database::connection();
        $st = $db->prepare("SELECT * FROM icu_io WHERE id = :id");
        $st->execute(['id' => $id]);
        $x = $st->fetch(PDO::FETCH_ASSOC);
        if (!$x) {
            return ['success' => false, 'message' => 'Entry not found.', 'not_found' => true];
        }
        if ($x['voided_at']) {
            return ['success' => false, 'message' => 'Already voided.'];
        }
        if ((int) $x['recorded_by'] !== (int) ($actor['id'] ?? 0) && !in_array($actor['role'] ?? '', ['admin', 'charge_nurse'], true)) {
            return ['success' => false, 'message' => 'Only whoever charted it, a charge nurse or an admin can void it.', 'forbidden' => true];
        }
        if (trim($reason) === '') {
            return ['success' => false, 'message' => 'Say why (e.g. wrong amount).', 'errors' => ['reason' => 'Required.']];
        }
        $db->prepare("UPDATE icu_io SET voided_at = NOW(), voided_by = :u, void_reason = :r WHERE id = :id")->execute(['u' => (int) $actor['id'], 'r' => mb_substr(trim($reason), 0, 255), 'id' => $id]);
        return ['success' => true, 'message' => 'Entry voided.'];
    }

    // ------------------------------------------------------------------
    // Drips
    // ------------------------------------------------------------------

    /**
     * Start a drip. data: admission_id, drug_name (or med_order_id), amount, amount_unit, volume_ml, dose_unit,
     * weight_kg (per-kg doses), rate_ml_h or dose, at? (HH:MM), notes?
     */
    public function startDrip(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::RECORD_ROLES, true)) {
            return ['success' => false, 'message' => 'Drips are charted by the nurses and doctors.', 'forbidden' => true];
        }
        $db = Database::connection();
        $a = $this->admission($db, (int) ($data['admission_id'] ?? 0));
        if (!$a) {
            return ['success' => false, 'message' => 'This patient is not admitted (or was discharged).', 'not_found' => true];
        }
        $errors = [];
        $orderId = (int) ($data['med_order_id'] ?? 0) ?: null;
        $drug = trim((string) ($data['drug_name'] ?? ''));
        if ($orderId) {
            $o = $db->prepare("SELECT drug_name FROM inpatient_med_orders WHERE id = :id AND admission_id = :a AND status = 'verified'");
            $o->execute(['id' => $orderId, 'a' => $a['id']]);
            $name = $o->fetchColumn();
            if (!$name) {
                $errors['med_order_id'] = 'That order isn\'t a verified order of this patient.';
            } elseif ($drug === '') {
                $drug = $name;
            }
        }
        if ($drug === '' || mb_strlen($drug) > 150) {
            $errors['drug_name'] = 'Which drug (e.g. Norepinephrine)?';
        }
        $amountUnit = (string) ($data['amount_unit'] ?? '');
        $doseUnit = (string) ($data['dose_unit'] ?? '');
        if (!in_array($doseUnit, self::DOSE_UNITS, true)) {
            $errors['dose_unit'] = 'Choose the dose unit.';
        }
        $drip = ['dose_unit' => $doseUnit, 'amount' => null, 'amount_unit' => $amountUnit, 'volume_ml' => null, 'weight_kg' => null];
        if ($doseUnit !== 'mL/h') {
            if (!in_array($amountUnit, self::AMOUNT_UNITS, true)) {
                $errors['amount_unit'] = 'Choose the unit of the amount.';
            } elseif (!isset($errors['dose_unit']) && self::factor($amountUnit, explode('/', $doseUnit)[0]) === null) {
                $errors['dose_unit'] = "A dose in {$doseUnit} can't come from {$amountUnit}.";
            }
            $amt = $data['amount'] ?? '';
            if (!is_numeric($amt) || (float) $amt <= 0 || (float) $amt > 1000000) {
                $errors['amount'] = 'How much drug is in the bag / syringe?';
            }
            $drip['amount'] = (float) $amt;
        } else {
            $drip['amount'] = (float) ($data['amount'] ?? 0) ?: 0;
            $drip['amount_unit'] = in_array($amountUnit, self::AMOUNT_UNITS, true) ? $amountUnit : 'mg';
        }
        $vol = $data['volume_ml'] ?? '';
        if (!is_numeric($vol) || (float) $vol < 1 || (float) $vol > 5000) {
            $errors['volume_ml'] = 'In how many mL (1–5000)?';
        }
        $drip['volume_ml'] = (float) $vol;
        if (str_contains($doseUnit, '/kg/')) {
            $w = $data['weight_kg'] ?? '';
            if (!is_numeric($w) || (float) $w < 0.3 || (float) $w > 400) {
                $errors['weight_kg'] = 'The weight in kg (for a per-kg dose).';
            }
            $drip['weight_kg'] = round((float) $w, 1);
        }
        $notes = trim((string) ($data['notes'] ?? ''));
        $at = $this->when($db, (string) ($data['at'] ?? ''), $a, $errors, 'at');
        if (!$errors) {
            [$rate, $dose, $rateErr] = $this->rateAndDose($data, $drip);
            if ($rateErr) {
                $errors[$rateErr[0]] = $rateErr[1];
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT icu_drip');
        try {
            $db->prepare(
                "INSERT INTO icu_drips (admission_id, patient_id, med_order_id, drug_name, amount, amount_unit, volume_ml, dose_unit, weight_kg, started_at, started_by, notes, created_at)
                 VALUES (:a, :p, :o, :d, :amt, :au, :vol, :du, :w, :at, :u, :n, NOW())"
            )->execute(['a' => $a['id'], 'p' => $a['patient_id'], 'o' => $orderId, 'd' => $drug, 'amt' => $drip['amount'], 'au' => $drip['amount_unit'], 'vol' => $drip['volume_ml'],
                'du' => $doseUnit, 'w' => $drip['weight_kg'], 'at' => $at, 'u' => (int) $actor['id'], 'n' => $notes !== '' ? mb_substr($notes, 0, 500) : null]);
            $id = (int) $db->lastInsertId();
            $db->prepare("INSERT INTO icu_drip_rates (drip_id, changed_at, rate_ml_h, dose, reason, recorded_by, recorded_at) VALUES (:d, :at, :r, :dose, 'Started', :u, NOW())")
                ->execute(['d' => $id, 'at' => $at, 'r' => $rate, 'dose' => $dose, 'u' => (int) $actor['id']]);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT icu_drip');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT icu_drip');
            throw $e;
        }
        return ['success' => true, 'message' => "{$drug} started at " . self::fmt($rate) . ' mL/h' . ($dose !== null ? ' = ' . self::fmt($dose) . " {$doseUnit}" : '') . ' (' . substr($at, 11, 5) . ').',
            'data' => ['id' => $id]];
    }

    /** data: drip_id, rate_ml_h or dose, at? (HH:MM), reason? */
    public function changeRate(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::RECORD_ROLES, true)) {
            return ['success' => false, 'message' => 'Drips are charted by the nurses and doctors.', 'forbidden' => true];
        }
        $db = Database::connection();
        [$drip, $a, $err] = $this->runningDrip($db, (int) ($data['drip_id'] ?? 0));
        if ($err) {
            return $err;
        }
        $errors = [];
        $at = $this->when($db, (string) ($data['at'] ?? ''), $a, $errors, 'at');
        $last = $db->prepare("SELECT MAX(changed_at) FROM icu_drip_rates WHERE drip_id = :d AND voided_at IS NULL");
        $last->execute(['d' => $drip['id']]);
        $lastAt = $last->fetchColumn();
        if (!$errors && $lastAt && $at < $lastAt) {
            $errors['at'] = 'That is before the last change (' . substr($lastAt, 11, 5) . ').';
        }
        $reason = trim((string) ($data['reason'] ?? ''));
        if (mb_strlen($reason) > 255) {
            $errors['reason'] = 'Keep it under 255 characters.';
        }
        if (!$errors) {
            [$rate, $dose, $rateErr] = $this->rateAndDose($data, $drip);
            if ($rateErr) {
                $errors[$rateErr[0]] = $rateErr[1];
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $db->prepare("INSERT INTO icu_drip_rates (drip_id, changed_at, rate_ml_h, dose, reason, recorded_by, recorded_at) VALUES (:d, :at, :r, :dose, :why, :u, NOW())")
            ->execute(['d' => $drip['id'], 'at' => $at, 'r' => $rate, 'dose' => $dose, 'why' => $reason !== '' ? $reason : null, 'u' => (int) $actor['id']]);
        return ['success' => true, 'message' => "{$drip['drug_name']}: " . self::fmt($rate) . ' mL/h' . ($dose !== null ? ' = ' . self::fmt($dose) . " {$drip['dose_unit']}" : '')
            . ($rate == 0 ? ' (paused)' : '') . ' from ' . substr($at, 11, 5) . '.', 'data' => ['id' => (int) $db->lastInsertId()]];
    }

    /** data: drip_id, at? (HH:MM), reason? */
    public function stopDrip(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::RECORD_ROLES, true)) {
            return ['success' => false, 'message' => 'Drips are charted by the nurses and doctors.', 'forbidden' => true];
        }
        $db = Database::connection();
        [$drip, $a, $err] = $this->runningDrip($db, (int) ($data['drip_id'] ?? 0));
        if ($err) {
            return $err;
        }
        $errors = [];
        $at = $this->when($db, (string) ($data['at'] ?? ''), $a, $errors, 'at');
        $last = $db->prepare("SELECT MAX(changed_at) FROM icu_drip_rates WHERE drip_id = :d AND voided_at IS NULL");
        $last->execute(['d' => $drip['id']]);
        $lastAt = $last->fetchColumn();
        if (!$errors && $lastAt && $at < $lastAt) {
            $errors['at'] = 'That is before the last rate change (' . substr($lastAt, 11, 5) . ').';
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $reason = trim((string) ($data['reason'] ?? ''));
        $db->prepare("UPDATE icu_drips SET stopped_at = :at, stopped_by = :u, stop_reason = :r WHERE id = :id AND stopped_at IS NULL")
            ->execute(['at' => $at, 'u' => (int) $actor['id'], 'r' => $reason !== '' ? mb_substr($reason, 0, 255) : null, 'id' => $drip['id']]);
        return ['success' => true, 'message' => "{$drip['drug_name']} stopped at " . substr($at, 11, 5) . '.'];
    }

    /** IV medicine orders of the admission (to run a drip under), verified and not stopped. */
    public function ivOrders(int $admissionId): array
    {
        $st = Database::connection()->prepare(
            "SELECT id, drug_name, dose, dose_unit, route, instructions FROM inpatient_med_orders
             WHERE admission_id = :a AND status = 'verified' AND route = 'IV' AND (stop_at IS NULL OR stop_at > NOW()) ORDER BY drug_name"
        );
        $st->execute(['a' => $admissionId]);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * The dose a rate gives, in the drip's dose unit: rate (mL/h) x concentration, per kg and per minute
     * as the unit says. NULL for mL/h drips.
     */
    public static function doseFromRate(float $rate, array $drip): ?float
    {
        if ($drip['dose_unit'] === 'mL/h') {
            return null;
        }
        $parts = explode('/', $drip['dose_unit']);
        $conc = (float) $drip['amount'] * self::factor($drip['amount_unit'], $parts[0]) / (float) $drip['volume_ml'];
        $dose = $rate * $conc;
        if (in_array('kg', $parts, true)) {
            $dose /= (float) $drip['weight_kg'];
        }
        if (end($parts) === 'min') {
            $dose /= 60;
        }
        return $dose;
    }

    public static function rateFromDose(float $dose, array $drip): ?float
    {
        $one = self::doseFromRate(1.0, $drip);
        return $one ? $dose / $one : null;
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** The rate from data (rate_ml_h, or dose converted): [rate, dose, error]. */
    private function rateAndDose(array $data, array $drip): array
    {
        $rateRaw = $data['rate_ml_h'] ?? '';
        $doseRaw = $data['dose'] ?? '';
        if ($rateRaw !== '' && $rateRaw !== null) {
            if (!is_numeric($rateRaw) || (float) $rateRaw < 0 || (float) $rateRaw > 999) {
                return [null, null, ['rate_ml_h', 'Rate: 0–999 mL/h (0 = paused).']];
            }
            $rate = round((float) $rateRaw, 2);
        } elseif ($doseRaw !== '' && $doseRaw !== null && $drip['dose_unit'] !== 'mL/h') {
            if (!is_numeric($doseRaw) || (float) $doseRaw < 0) {
                return [null, null, ['dose', 'The dose.']];
            }
            $rate = round((float) self::rateFromDose((float) $doseRaw, $drip), 2);
            if ($rate > 999) {
                return [null, null, ['dose', 'That dose needs over 999 mL/h: check the concentration.']];
            }
        } else {
            return [null, null, ['rate_ml_h', 'The rate in mL/h' . ($drip['dose_unit'] !== 'mL/h' ? ', or the dose' : '') . '.']];
        }
        $dose = self::doseFromRate($rate, $drip);
        return [$rate, $dose !== null ? round($dose, 4) : null, null];
    }

    /** Factor from the amount unit to the dose's unit (mg -> mcg = 1000), NULL if they don't mix. */
    private static function factor(string $from, string $to): ?float
    {
        $mass = ['g' => 1e6, 'mg' => 1e3, 'mcg' => 1];
        if (isset($mass[$from], $mass[$to])) {
            return $mass[$from] / $mass[$to];
        }
        return $from === $to && in_array($from, ['units', 'mmol'], true) ? 1.0 : null;
    }

    private function runningDrip(PDO $db, int $id): array
    {
        $st = $db->prepare("SELECT * FROM icu_drips WHERE id = :id");
        $st->execute(['id' => $id]);
        $d = $st->fetch(PDO::FETCH_ASSOC);
        if (!$d) {
            return [null, null, ['success' => false, 'message' => 'Drip not found.', 'not_found' => true]];
        }
        if ($d['stopped_at']) {
            return [null, null, ['success' => false, 'message' => 'This drip was stopped. Start it again as a new drip.']];
        }
        $a = $this->admission($db, (int) $d['admission_id']);
        if (!$a) {
            return [null, null, ['success' => false, 'message' => 'This patient is not admitted (or was discharged).']];
        }
        return [$d, $a, null];
    }

    /** Hourly entries (newest first when $limit), with the vital signs. */
    private function entries(PDO $db, int $admissionId, ?string $from, ?string $to, ?int $limit = null): array
    {
        $where = 'h.admission_id = :a AND h.voided_at IS NULL';
        $p = ['a' => $admissionId];
        if ($from) {
            $where .= ' AND h.hour_at >= :f AND h.hour_at < :t';
            $p += ['f' => $from, 't' => $to];
        }
        $st = $db->prepare(
            "SELECT h.*, v.bp_systolic, v.bp_diastolic, v.heart_rate, v.resp_rate, v.temperature_c, v.spo2, v.pain_score, v.blood_sugar_mgdl, v.consciousness,
                    v.news2_score, v.news2_risk, " . self::nameSql('h.recorded_by') . " AS recorded_by_name
             FROM icu_hourly h LEFT JOIN inpatient_vitals v ON v.id = h.vitals_id AND v.voided_at IS NULL
             WHERE {$where} ORDER BY h.hour_at " . ($limit ? "DESC LIMIT {$limit}" : 'ASC')
        );
        $st->execute($p);
        return array_map(function ($e) {
            $num = fn($k) => $e[$k] !== null ? $e[$k] + 0 : null;
            $gcsTotal = $e['gcs_e'] !== null && $e['gcs_m'] !== null && ($e['gcs_v'] !== null || $e['gcs_intubated']) ? (int) $e['gcs_e'] + (int) $e['gcs_m'] + (int) ($e['gcs_v'] ?? 0) : null;
            return [
                'id' => (int) $e['id'], 'hour_at' => $e['hour_at'],
                'bp_systolic' => $num('bp_systolic'), 'bp_diastolic' => $num('bp_diastolic'),
                'map' => $e['bp_systolic'] !== null && $e['bp_diastolic'] !== null ? (int) round(((int) $e['bp_systolic'] + 2 * (int) $e['bp_diastolic']) / 3) : null,
                'heart_rate' => $num('heart_rate'), 'resp_rate' => $num('resp_rate'), 'temperature_c' => $num('temperature_c'), 'spo2' => $num('spo2'),
                'pain_score' => $num('pain_score'), 'blood_sugar_mgdl' => $num('blood_sugar_mgdl'), 'cvp' => $num('cvp'), 'etco2' => $num('etco2'),
                'gcs_e' => $num('gcs_e'), 'gcs_v' => $num('gcs_v'), 'gcs_m' => $num('gcs_m'), 'gcs_intubated' => (bool) $e['gcs_intubated'], 'gcs_total' => $gcsTotal,
                'rass' => $num('rass'), 'pupil_l' => $num('pupil_l'), 'pupil_r' => $num('pupil_r'), 'pupil_l_react' => $e['pupil_l_react'], 'pupil_r_react' => $e['pupil_r_react'],
                'cam_icu' => $e['cam_icu'], 'consciousness' => $e['consciousness'],
                'o2_device' => $e['o2_device'], 'o2_flow' => $num('o2_flow'), 'fio2' => $num('fio2'), 'vent_mode' => $e['vent_mode'], 'peep' => $num('peep'),
                'vt_set' => $num('vt_set'), 'rr_set' => $num('rr_set'), 'pressure_support' => $num('pressure_support'), 'pinsp' => $num('pinsp'),
                'vt_exp' => $num('vt_exp'), 'rr_total' => $num('rr_total'), 'ppeak' => $num('ppeak'), 'pplat' => $num('pplat'),
                'news2_score' => $num('news2_score'), 'news2_risk' => $e['news2_risk'], 'notes' => $e['notes'],
                'recorded_by' => $e['recorded_by'] !== null ? (int) $e['recorded_by'] : null, 'recorded_by_name' => $e['recorded_by_name'], 'recorded_at' => $e['recorded_at'],
            ];
        }, $st->fetchAll(PDO::FETCH_ASSOC));
    }

    /** Drips that ran in [from, to), with their rate history and, per hour, the rate, the dose and the mL infused. */
    private function drips(PDO $db, int $admissionId, string $from, string $to, string $now): array
    {
        $st = $db->prepare(
            "SELECT d.*, " . self::nameSql('d.started_by') . " AS started_by_name FROM icu_drips d
             WHERE d.admission_id = :a AND d.started_at < :t AND (d.stopped_at IS NULL OR d.stopped_at > :f) ORDER BY d.started_at, d.id"
        );
        $st->execute(['a' => $admissionId, 'f' => $from, 't' => $to]);
        $out = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $d) {
            $r = $db->prepare("SELECT r.*, " . self::nameSql('r.recorded_by') . " AS recorded_by_name FROM icu_drip_rates r WHERE r.drip_id = :d AND r.voided_at IS NULL ORDER BY r.changed_at, r.id");
            $r->execute(['d' => $d['id']]);
            $rates = $r->fetchAll(PDO::FETCH_ASSOC);
            $end = $d['stopped_at'] ?? $now;
            $hours = [];
            for ($i = 0; $i < 24; $i++) {
                $h = $this->plus($from, $i * 60);
                $hEnd = $this->plus($h, 60);
                $ml = $this->infused($rates, $h, min($hEnd, $end));
                // The rate showing for the hour: the last one set by the end of the hour (while running).
                $shown = null;
                $changes = 0;
                foreach ($rates as $x) {
                    if ($x['changed_at'] < $hEnd) {
                        $shown = $x;
                    }
                    if ($x['changed_at'] >= $h && $x['changed_at'] < $hEnd) {
                        $changes++;
                    }
                }
                $running = $d['started_at'] < $hEnd && $end > $h && $h <= $now;
                $hours[] = ['rate' => $running && $shown ? (float) $shown['rate_ml_h'] : null, 'dose' => $running && $shown && $shown['dose'] !== null ? round((float) $shown['dose'], 3) : null,
                    'ml' => round($ml, 1), 'changes' => $changes, 'stopped' => $d['stopped_at'] !== null && $d['stopped_at'] >= $h && $d['stopped_at'] < $hEnd];
            }
            $cur = end($rates) ?: null;
            $out[] = [
                'id' => (int) $d['id'], 'drug_name' => $d['drug_name'], 'med_order_id' => $d['med_order_id'] !== null ? (int) $d['med_order_id'] : null,
                'amount' => (float) $d['amount'], 'amount_unit' => $d['amount_unit'], 'volume_ml' => (float) $d['volume_ml'], 'dose_unit' => $d['dose_unit'],
                'weight_kg' => $d['weight_kg'] !== null ? (float) $d['weight_kg'] : null,
                'concentration' => $d['dose_unit'] === 'mL/h' ? null : self::fmt((float) $d['amount']) . " {$d['amount_unit']} in " . self::fmt((float) $d['volume_ml']) . ' mL',
                'started_at' => $d['started_at'], 'started_by_name' => $d['started_by_name'], 'stopped_at' => $d['stopped_at'], 'stop_reason' => $d['stop_reason'],
                'running' => $d['stopped_at'] === null, 'notes' => $d['notes'],
                'current_rate' => $cur ? (float) $cur['rate_ml_h'] : null, 'current_dose' => $cur && $cur['dose'] !== null ? round((float) $cur['dose'], 3) : null,
                'rates' => array_map(fn($x) => ['id' => (int) $x['id'], 'at' => $x['changed_at'], 'rate' => (float) $x['rate_ml_h'], 'dose' => $x['dose'] !== null ? round((float) $x['dose'], 3) : null,
                    'reason' => $x['reason'], 'by' => $x['recorded_by_name']], $rates),
                'hours' => $hours,
                'total_ml' => round(array_sum(array_column($hours, 'ml')), 1),
            ];
        }
        return $out;
    }

    /** mL infused between two times from a rate history. */
    private function infused(array $rates, string $from, string $to): float
    {
        if ($to <= $from) {
            return 0.0;
        }
        $ml = 0.0;
        $n = count($rates);
        for ($i = 0; $i < $n; $i++) {
            $s = $rates[$i]['changed_at'];
            $e = $i + 1 < $n ? $rates[$i + 1]['changed_at'] : $to;
            $s = max($s, $from);
            $e = min($e, $to);
            if ($e > $s) {
                $ml += (float) $rates[$i]['rate_ml_h'] * ($this->ts($e) - $this->ts($s)) / 3600;
            }
        }
        return $ml;
    }

    /** Intake (with drips), output and balance between two times. */
    private function balance(PDO $db, int $admissionId, string $from, string $to, string $now): array
    {
        // Up to now: an entry charted this very second counts too.
        $st = $db->prepare("SELECT kind, COALESCE(SUM(volume_ml), 0) FROM icu_io WHERE admission_id = :a AND voided_at IS NULL AND at >= :f AND at " . ($to >= $now ? '<=' : '<') . " :t GROUP BY kind");
        $st->execute(['a' => $admissionId, 'f' => $from, 't' => $to]);
        $s = $st->fetchAll(PDO::FETCH_KEY_PAIR);
        $dr = $db->prepare("SELECT id, started_at, stopped_at FROM icu_drips WHERE admission_id = :a AND started_at < :t AND (stopped_at IS NULL OR stopped_at > :f)");
        $dr->execute(['a' => $admissionId, 'f' => $from, 't' => $to]);
        $drips = 0.0;
        foreach ($dr->fetchAll(PDO::FETCH_ASSOC) as $d) {
            $r = $db->prepare("SELECT changed_at, rate_ml_h FROM icu_drip_rates WHERE drip_id = :d AND voided_at IS NULL ORDER BY changed_at, id");
            $r->execute(['d' => $d['id']]);
            $drips += $this->infused($r->fetchAll(PDO::FETCH_ASSOC), $from, min($to, $d['stopped_at'] ?? $now, $now));
        }
        $in = round((float) ($s['in'] ?? 0) + $drips, 1);
        $out = round((float) ($s['out'] ?? 0), 1);
        return ['in' => $in, 'out' => $out, 'net' => round($in - $out, 1), 'drips' => round($drips, 1), 'from' => $from];
    }

    private function ioEntries(PDO $db, int $admissionId, string $from, string $to): array
    {
        $st = $db->prepare(
            "SELECT x.*, " . self::nameSql('x.recorded_by') . " AS recorded_by_name FROM icu_io x WHERE x.admission_id = :a AND x.at >= :f AND x.at < :t ORDER BY x.at, x.id"
        );
        $st->execute(['a' => $admissionId, 'f' => $from, 't' => $to]);
        return array_map(fn($x) => ['id' => (int) $x['id'], 'kind' => $x['kind'], 'category' => $x['category'], 'label' => $x['label'], 'volume_ml' => (float) $x['volume_ml'],
            'at' => $x['at'], 'recorded_by' => $x['recorded_by'] !== null ? (int) $x['recorded_by'] : null, 'recorded_by_name' => $x['recorded_by_name'],
            'voided_at' => $x['voided_at'], 'void_reason' => $x['void_reason']], $st->fetchAll(PDO::FETCH_ASSOC));
    }

    /** "HH:MM" (today, or yesterday if later than now) or "YYYY-MM-DD HH:MM"; blank = now. Not in the future, not over 24 h ago, not before admission. */
    private function when(PDO $db, string $raw, array $a, array &$errors, string $field): string
    {
        $now = $this->now();
        $raw = trim(str_replace('T', ' ', $raw));
        if ($raw === '') {
            return $now;
        }
        if (preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $raw)) {
            $c = substr($now, 0, 10) . " {$raw}:00";
            if ($c > $now) {
                $c = $this->dayShift(substr($now, 0, 10), -1) . " {$raw}:00";
            }
        } elseif (preg_match('/^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):[0-5]\d(:\d{2})?$/', $raw) && $this->ts($raw) !== null) {
            $c = substr($raw, 0, 16) . ':00';
        } else {
            $errors[$field] = 'Time as HH:MM.';
            return $now;
        }
        if ($this->ts($c) > $this->ts($now) + 60) {
            $errors[$field] = 'The time can\'t be in the future.';
        } elseif ($this->ts($c) < $this->ts($now) - 86400) {
            $errors[$field] = 'More than 24 hours ago can\'t be charted here.';
        } elseif ($c < $a['admission_date']) {
            $errors[$field] = 'That is before the patient was admitted.';
        }
        return $c;
    }

    private function admission(PDO $db, int $id, bool $any = false): ?array
    {
        $st = $db->prepare(
            "SELECT a.*, w.ward_code, w.ward_name, w.ward_type, b.bed_number FROM inpatient_admissions a JOIN hospital_wards w ON w.id = a.ward_id
             JOIN hospital_beds b ON b.id = a.bed_id WHERE a.id = :id" . ($any ? '' : ' AND a.status IN ' . self::ACTIVE)
        );
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /** The latest weight: a drip's, else the chart's (if it isn't a placeholder 0). */
    private function weight(PDO $db, array $a): ?float
    {
        $st = $db->prepare("SELECT weight_kg FROM icu_drips WHERE admission_id = :a AND weight_kg IS NOT NULL ORDER BY started_at DESC LIMIT 1");
        $st->execute(['a' => $a['id']]);
        $w = $st->fetchColumn();
        if ($w) {
            return (float) $w;
        }
        $p = $db->prepare("SELECT weight FROM patients WHERE id = :p");
        $p->execute(['p' => $a['patient_id']]);
        $w = (float) $p->fetchColumn();
        return $w > 0 && $w < 400 ? $w : null;
    }

    private function allergies(PDO $db, int $patientId): array
    {
        $st = $db->prepare(
            "SELECT a.name FROM patient_allergies pa JOIN allergies a ON a.id = pa.allergy_id WHERE pa.patient_id = :p AND (pa.end_date IS NULL OR pa.end_date >= CURDATE()) ORDER BY a.name"
        );
        $st->execute(['p' => $patientId]);
        return $st->fetchAll(PDO::FETCH_COLUMN);
    }

    /** The ICU day a time falls in (the date its 07:00 start is on). */
    private function dayOf(string $dt): string
    {
        $d = substr($dt, 0, 10);
        return (int) substr($dt, 11, 2) < self::DAY_START ? $this->dayShift($d, -1) : $d;
    }

    private function dayRange(string $day): array
    {
        $from = $day . ' ' . str_pad((string) self::DAY_START, 2, '0', STR_PAD_LEFT) . ':00:00';
        return [$from, $this->plus($from, 1440)];
    }

    private function dayShift(string $day, int $n): string
    {
        return (new \DateTimeImmutable($day, new \DateTimeZone('UTC')))->modify(($n >= 0 ? '+' : '') . "{$n} day")->format('Y-m-d');
    }

    private function plus(string $dt, int $minutes): string
    {
        return gmdate('Y-m-d H:i:s', $this->ts($dt) + $minutes * 60);
    }

    private function ts(string $dt): ?int
    {
        $d = \DateTimeImmutable::createFromFormat('Y-m-d H:i:s', strlen($dt) === 16 ? "{$dt}:00" : $dt, new \DateTimeZone('UTC'));
        return $d ? $d->getTimestamp() : null;
    }

    private function now(): string
    {
        return (string) Database::connection()->query("SELECT NOW()")->fetchColumn();
    }

    private static function fmt(float $v): string
    {
        return rtrim(rtrim(number_format($v, 2, '.', ''), '0'), '.');
    }

    public static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL WHERE nu.id = {$column} LIMIT 1)";
    }
}

/** A value the vital-signs service refused while saving the hour. */
class IcuInputException extends \RuntimeException
{
    public array $errors;

    public function __construct(string $message, array $errors)
    {
        parent::__construct($message);
        $this->errors = $errors;
    }
}
