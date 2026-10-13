<?php

namespace App\Modules\Icu\Services;

use App\Core\Database;
use App\Modules\Er\Services\ErDispositionService;
use App\Modules\InpatientAdmissions\Services\InpatientAdmissionsService;
use App\Modules\OrManagement\Services\OrPostopService;
use PDO;

/**
 * ICU (module 13, Phase 2: the ICU board).
 *
 *   * board() -- every bed of the ICU wards (free ones too): the patient, severity (a bedside SOFA score
 *     from the last 24 hours), drips running (vasopressors flagged), breathing support (ventilator mode,
 *     FiO2, PEEP, ventilated since), open alerts, last hour charted, today's balance.
 *   * sofa() -- respiration (PaO2/FiO2 from a blood gas, else SpO2/FiO2), circulation (MAP and the
 *     vasopressor doses of the drips), brain (GCS), kidneys (creatinine, else 24 h urine), liver
 *     (bilirubin), clotting (platelets). An organ without data in the last 24 h isn't scored.
 *   * transferIn() -- from the ER (a patient waiting for a bed, or a new admission decision), the OR
 *     (released from recovery to an ICU bed) or another ward; transferOut() -- to a ward bed, with a
 *     handover. Each ICU stay is logged in icu_stays.
 *   * tv() -- the ICU board TV: initials only, no drug names or diagnoses.
 * Phase 3: sofa() also scores a past ICU day (window ending at $now: entries, drips and labs up to then);
 * the board shows lines in place and the APACHE II of the stay.
 */
class IcuBoardService
{
    /** Moving patients in and out of the ICU. */
    public const TRANSFER_ROLES = ['admin', 'doctor', 'clinician', 'charge_nurse'];
    public const SOURCES = ['er' => 'ER', 'or' => 'OR / recovery', 'ward' => 'Another ward', 'direct' => 'Admitted to the ICU'];
    /** SOFA bands (Vincent 1996 / Ferreira 2001: higher score, higher mortality). */
    public const BANDS = [[13, 'very_high', 'Very high'], [10, 'high', 'High'], [7, 'moderate', 'Moderate'], [0, 'low', 'Low']];
    private const PRESSORS = ['norepinephrine' => '/nor-?epinephrine|noradrenaline|levophed/i', 'epinephrine' => '/(?<!nor)(?<!nor-)epinephrine|(?<!nor)adrenaline/i',
        'dopamine' => '/dopamine/i', 'dobutamine' => '/dobutamine/i', 'vasopressin' => '/vasopressin/i', 'phenylephrine' => '/phenylephrine/i'];
    private const ACTIVE = "('Admitted', 'Pending Discharge')";
    /** Lab results of urine and other fluids (urine creatinine, urine pH ...) are not blood values. */
    public const NOT_BLOOD = '/urine|urinary|\\bcsf\\b|fluid|stool|sputum|dipstick/i';
    /** Same rule as the census: status Deceased, or a discharge disposition saying so. */
    public const DIED = '/expired|deceased|died|death/i';

    // ------------------------------------------------------------------
    // The board
    // ------------------------------------------------------------------

    public function board(?int $wardId = null): array
    {
        $db = Database::connection();
        $this->syncStays($db);
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $scores = new IcuScoreService();
        $lines = new IcuLinesService();
        $wards = $db->query("SELECT id, ward_name, ward_code FROM hospital_wards WHERE is_active = 1 AND ward_type = 'ICU' ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
        $ids = array_map(fn($w) => (int) $w['id'], $wards);
        if ($wardId && in_array($wardId, $ids, true)) {
            $ids = [$wardId];
        }
        $beds = $ids ? $db->query(
            "SELECT b.id, b.bed_number, b.room_number, b.bed_type, b.status, b.ward_id, w.ward_code, w.ward_name,
                    a.id AS admission_id, a.patient_id, a.patient_name, a.patient_mrn, a.patient_age, a.gender, a.admission_date, a.admitting_diagnosis,
                    a.attending_physician, a.status AS admission_status
             FROM hospital_beds b JOIN hospital_wards w ON w.id = b.ward_id
             LEFT JOIN inpatient_admissions a ON a.bed_id = b.id AND a.status IN " . self::ACTIVE . "
             WHERE b.is_active = 1 AND b.ward_id IN (" . implode(',', $ids) . ") ORDER BY w.id, b.bed_number"
        )->fetchAll(PDO::FETCH_ASSOC) : [];
        $icu = new IcuService();
        $out = [];
        $counts = ['beds' => 0, 'occupied' => 0, 'free' => 0, 'ventilated' => 0, 'pressors' => 0, 'alerts' => 0, 'critical_alerts' => 0, 'severe' => 0, 'not_charted' => 0];
        $hourNow = substr($now, 0, 13) . ':00:00';
        foreach ($beds as $b) {
            $counts['beds']++;
            $bed = ['id' => (int) $b['id'], 'bed' => $b['bed_number'], 'room' => $b['room_number'], 'type' => $b['bed_type'], 'status' => $b['status'],
                'ward_id' => (int) $b['ward_id'], 'ward' => $b['ward_code'], 'ward_name' => $b['ward_name'], 'patient' => null];
            if (!$b['admission_id']) {
                $counts['free'] += (int) ($b['status'] === 'Available');
                $out[] = $bed;
                continue;
            }
            $counts['occupied']++;
            $p = $this->patient($db, $b, $icu, $now);
            $p['lines'] = $lines->inPlace($db, (int) $b['admission_id'], $now);
            $p['apache'] = $p['stay_id'] ? $scores->apacheBrief($db, $p['stay_id'], $now) : null;
            $counts['ventilated'] += (int) ($p['breathing']['device'] === 'ventilator');
            $counts['pressors'] += (int) (bool) array_filter($p['drips'], fn($d) => $d['pressor']);
            $counts['alerts'] += count($p['alerts']);
            $counts['critical_alerts'] += count(array_filter($p['alerts'], fn($a) => $a['urgency'] === 'critical'));
            $counts['severe'] += (int) in_array($p['severity']['band'], ['high', 'very_high'], true);
            $counts['not_charted'] += (int) (!$p['last'] || $p['last']['hour_at'] !== $hourNow);
            $bed['patient'] = $p;
            $out[] = $bed;
        }
        return ['wards' => $wards, 'ward_id' => $wardId ?: null, 'beds' => $out, 'counts' => $counts, 'now' => $now, 'bands' => self::BANDS];
    }

    /** One ICU patient for the board. $b: bed + admission row. */
    private function patient(PDO $db, array $b, IcuService $icu, string $now): array
    {
        $aid = (int) $b['admission_id'];
        $stay = $this->openStay($db, $aid);
        $entries = $this->entries($db, $aid, $now);
        $last = $entries[0] ?? null;
        $drips = $this->runningDrips($db, $aid);
        $breathing = $this->breathing($entries, $now);
        $alerts = $db->prepare(
            "SELECT id, alert_type, urgency, title, created_at, acknowledged_at FROM alerts WHERE patient_id = :p AND resolved_at IS NULL
               AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY FIELD(urgency, 'critical', 'urgent', 'info'), created_at DESC LIMIT 10"
        );
        $alerts->execute(['p' => $b['patient_id']]);
        $flow = $icu->flowsheet($aid);
        $inAt = $stay['in_at'] ?? $b['admission_date'];
        return [
            'admission_id' => $aid, 'stay_id' => $stay ? (int) $stay['id'] : null, 'patient_id' => (int) $b['patient_id'], 'name' => $b['patient_name'], 'mrn' => $b['patient_mrn'], 'age' => $b['patient_age'],
            'sex' => $b['gender'], 'diagnosis' => $b['admitting_diagnosis'], 'attending' => $b['attending_physician'], 'admission_status' => $b['admission_status'],
            'in_icu_since' => $inAt, 'icu_day' => max(1, intdiv(self::ts($now) - self::ts($inAt), 86400) + 1),
            'source' => $stay ? ['kind' => $stay['source'], 'label' => self::SOURCES[$stay['source']] ?? $stay['source'], 'ref' => $stay['source_ref']] : null,
            'severity' => $this->sofa($db, $b, $entries, $drips, $stay, $now),
            'news2' => $last['news2_score'] ?? null,
            'last' => $last ? ['hour_at' => $last['hour_at'], 'heart_rate' => $last['heart_rate'], 'map' => $last['map'], 'spo2' => $last['spo2'],
                'gcs' => $last['gcs_total'], 'gcs_intubated' => (bool) $last['gcs_intubated'], 'rass' => $last['rass']] : null,
            'minutes_since_last' => $last ? intdiv(self::ts($now) - self::ts($last['hour_at']), 60) : null,
            'drips' => $drips, 'breathing' => $breathing,
            'alerts' => array_map(fn($a) => ['id' => (int) $a['id'], 'type' => $a['alert_type'], 'urgency' => $a['urgency'], 'title' => $a['title'],
                'at' => $a['created_at'], 'acknowledged' => $a['acknowledged_at'] !== null], $alerts->fetchAll(PDO::FETCH_ASSOC)),
            'balance_today' => $flow ? $flow['totals'] : null,
        ];
    }

    // ------------------------------------------------------------------
    // Severity: bedside SOFA
    // ------------------------------------------------------------------

    /**
     * SOFA from the last 24 h (the worst value of each). Returns total, organs scored, band and per organ
     * [score, shown value, how it was measured]. Organs without data are not scored (not counted as 0).
     */
    public function sofa(PDO $db, array $b, array $entries, array $drips, ?array $stay, string $now): array
    {
        $since = gmdate('Y-m-d H:i:s', self::ts($now) - 86400);
        $day = array_filter($entries, fn($e) => $e['hour_at'] >= $since);
        $labs = $this->labs($db, (int) $b['patient_id'], $now);
        $organs = [];

        // Respiration: PaO2/FiO2 with a blood gas, else SpO2/FiO2 (only while SpO2 <= 97%).
        $worstPf = null;
        $worstSf = null;
        $support = false;
        foreach ($day as $e) {
            $fio2 = self::fio2($e);
            $support = $support || in_array($e['o2_device'], ['ventilator', 'niv', 'hfnc'], true);
            if ($fio2 && $e['spo2'] !== null && $e['spo2'] <= 97) {
                $sf = $e['spo2'] / ($fio2 / 100);
                $worstSf = $worstSf === null ? $sf : min($worstSf, $sf);
            }
            if ($fio2 && isset($labs['pao2'])) {
                $pf = $labs['pao2']['value'] / ($fio2 / 100);
                $worstPf = $worstPf === null ? $pf : min($worstPf, $pf);
            }
        }
        if ($worstPf !== null) {
            $s = $worstPf < 100 && $support ? 4 : ($worstPf < 200 && $support ? 3 : ($worstPf < 300 ? 2 : ($worstPf < 400 ? 1 : 0)));
            $organs['respiration'] = ['score' => $s, 'value' => 'P/F ' . round($worstPf), 'how' => 'PaO₂ ' . $labs['pao2']['value'] . ' / FiO₂'];
        } elseif ($worstSf !== null) {
            // Pandharipande 2009: S/F 512 / 357 / 214 / 89 stand for P/F 400 / 300 / 200 / 100.
            $s = $worstSf < 89 ? 4 : ($worstSf < 214 ? 3 : ($worstSf < 357 ? 2 : ($worstSf < 512 ? 1 : 0)));
            $organs['respiration'] = ['score' => $s, 'value' => 'S/F ' . round($worstSf), 'how' => 'SpO₂ / FiO₂ (no blood gas)'];
        } else {
            $organs['respiration'] = ['score' => null, 'value' => null, 'how' => 'Needs SpO₂ ≤ 97% with the FiO₂, or a blood gas'];
        }

        // Circulation: MAP, then the vasopressors (mcg/kg/min).
        $maps = array_values(array_filter(array_column($day, 'map'), fn($m) => $m !== null));
        $dose = fn($k) => max(array_merge([0.0], array_map(fn($d) => $d['max_24h'] ?? 0.0, array_filter($drips, fn($d) => $d['pressor'] === $k && $d['per_kg_min']))));
        $ne = $dose('norepinephrine');
        $epi = $dose('epinephrine');
        $dopa = $dose('dopamine');
        $dobu = (bool) array_filter($drips, fn($d) => $d['pressor'] === 'dobutamine');
        $vaso = (bool) array_filter($drips, fn($d) => in_array($d['pressor'], ['vasopressin', 'phenylephrine'], true));
        if ($ne > 0.1 || $epi > 0.1 || $dopa > 15) {
            $organs['circulation'] = ['score' => 4, 'value' => self::pressorText($ne, $epi, $dopa), 'how' => 'Vasopressors'];
        } elseif ($ne > 0 || $epi > 0 || $dopa > 5 || $vaso) {
            $organs['circulation'] = ['score' => 3, 'value' => self::pressorText($ne, $epi, $dopa) ?: 'Vasopressor', 'how' => 'Vasopressors'];
        } elseif ($dopa > 0 || $dobu) {
            $organs['circulation'] = ['score' => 2, 'value' => $dobu ? 'Dobutamine' : 'Dopamine ≤ 5', 'how' => 'Inotropes'];
        } elseif ($maps) {
            $organs['circulation'] = ['score' => min($maps) < 70 ? 1 : 0, 'value' => 'MAP ' . min($maps), 'how' => 'Lowest MAP'];
        } else {
            $organs['circulation'] = ['score' => null, 'value' => null, 'how' => 'No blood pressure charted'];
        }

        // Brain: GCS (intubated: eyes + motor + 1 for verbal -- an estimate).
        $gcs = [];
        $estimated = false;
        foreach ($day as $e) {
            if ($e['gcs_e'] !== null && $e['gcs_m'] !== null) {
                $gcs[] = $e['gcs_e'] + $e['gcs_m'] + ($e['gcs_intubated'] ? 1 : (int) $e['gcs_v']);
                $estimated = $estimated || $e['gcs_intubated'];
            }
        }
        if ($gcs) {
            $g = min($gcs);
            $organs['brain'] = ['score' => $g >= 15 ? 0 : ($g >= 13 ? 1 : ($g >= 10 ? 2 : ($g >= 6 ? 3 : 4))), 'value' => "GCS {$g}" . ($estimated ? ' (V=1, intubated)' : ''), 'how' => 'Lowest GCS'];
        } else {
            $organs['brain'] = ['score' => null, 'value' => null, 'how' => 'No GCS charted'];
        }

        // Kidneys: creatinine; 24 h urine when there is a full day of charting.
        $renal = null;
        if (isset($labs['creatinine'])) {
            $c = $labs['creatinine']['value'];
            $renal = ['score' => $c >= 5 ? 4 : ($c >= 3.5 ? 3 : ($c >= 2 ? 2 : ($c >= 1.2 ? 1 : 0))), 'value' => "Creatinine {$c}", 'how' => 'mg/dL'];
        }
        // 24 h urine only when the patient was in the ICU and charted for the whole day (no charting is not "no urine").
        $inAt = $stay['in_at'] ?? $b['admission_date'];
        $first = $db->prepare(
            "SELECT LEAST(COALESCE((SELECT MIN(hour_at) FROM icu_hourly WHERE admission_id = :a AND voided_at IS NULL), '9999-12-31'),
                          COALESCE((SELECT MIN(at) FROM icu_io WHERE admission_id = :a2 AND voided_at IS NULL), '9999-12-31'))"
        );
        $first->execute(['a' => $b['admission_id'], 'a2' => $b['admission_id']]);
        $charted = (string) $first->fetchColumn();
        if (self::ts($now) - self::ts($inAt) >= 86400 && $charted !== '9999-12-31' && self::ts($charted) <= self::ts($now) - 23 * 3600) {
            $u = $db->prepare("SELECT COUNT(*), COALESCE(SUM(volume_ml), 0) FROM icu_io WHERE admission_id = :a AND kind = 'out' AND category = 'urine' AND voided_at IS NULL AND at >= :s AND at <= :n");
            $u->execute(['a' => $b['admission_id'], 's' => $since, 'n' => $now]);
            [$entries, $uo] = $u->fetch(PDO::FETCH_NUM);
            // No urine charted counts as none only with a urinary catheter in (else it may just not be measured).
            $cath = $db->prepare("SELECT COUNT(*) FROM icu_lines WHERE admission_id = :a AND kind = 'urinary' AND voided_at IS NULL AND inserted_at <= :s AND (removed_at IS NULL OR removed_at >= :n)");
            $cath->execute(['a' => $b['admission_id'], 's' => $since, 'n' => $now]);
            if ((int) $entries > 0 || (int) $cath->fetchColumn() > 0) {
                $uo = (float) $uo;
                $us = $uo < 200 ? 4 : ($uo < 500 ? 3 : 0);
                if (!$renal || $us > $renal['score']) {
                    $renal = ['score' => $us, 'value' => 'Urine ' . round($uo) . ' mL / 24 h', 'how' => (int) $entries > 0 ? 'Urine output' : 'Urinary catheter in, no urine charted'];
                }
            }
        }
        $organs['kidneys'] = $renal ?? ['score' => null, 'value' => null, 'how' => 'Needs a creatinine, or a full day of ICU charting (urine)'];

        // Liver and clotting: labs only.
        if (isset($labs['bilirubin'])) {
            $v = $labs['bilirubin']['value'];
            $organs['liver'] = ['score' => $v >= 12 ? 4 : ($v >= 6 ? 3 : ($v >= 2 ? 2 : ($v >= 1.2 ? 1 : 0))), 'value' => "Bilirubin {$v}", 'how' => 'mg/dL'];
        } else {
            $organs['liver'] = ['score' => null, 'value' => null, 'how' => 'Needs a bilirubin (last 2 days)'];
        }
        if (isset($labs['platelets'])) {
            $v = $labs['platelets']['value'];
            $organs['clotting'] = ['score' => $v < 20 ? 4 : ($v < 50 ? 3 : ($v < 100 ? 2 : ($v < 150 ? 1 : 0))), 'value' => "Platelets {$v}", 'how' => '× 10³/µL'];
        } else {
            $organs['clotting'] = ['score' => null, 'value' => null, 'how' => 'Needs a platelet count (last 2 days)'];
        }

        $scored = array_filter($organs, fn($o) => $o['score'] !== null);
        $total = array_sum(array_column($scored, 'score'));
        $band = 'low';
        $label = 'Low';
        foreach (self::BANDS as [$min, $k, $l]) {
            if ($total >= $min) {
                [$band, $label] = [$k, $l];
                break;
            }
        }
        return ['total' => $scored ? $total : null, 'organs_scored' => count($scored), 'band' => $scored ? $band : null, 'band_label' => $scored ? $label : null,
            'max_organ' => $scored ? max(array_column($scored, 'score')) : null, 'organs' => $organs];
    }

    private static function pressorText(float $ne, float $epi, float $dopa): string
    {
        return implode(', ', array_filter([$ne ? 'Norepinephrine ' . round($ne, 3) : '', $epi ? 'Epinephrine ' . round($epi, 3) : '', $dopa ? 'Dopamine ' . round($dopa, 1) : '']));
    }

    /** FiO2 of an hourly entry: charted, or room air 21%, or nasal cannula ~21 + 4 per L/min. */
    public static function fio2(array $e): ?float
    {
        if ($e['fio2'] !== null) {
            return (float) $e['fio2'];
        }
        if ($e['o2_device'] === 'room_air') {
            return 21.0;
        }
        if ($e['o2_device'] === 'nasal' && $e['o2_flow'] !== null) {
            return min(44.0, 21 + 4 * (float) $e['o2_flow']);
        }
        return null;
    }

    /** Latest PaO2, creatinine, bilirubin, platelets of the 2 days up to $now (lab results, by name; not urine or other fluids). */
    private function labs(PDO $db, int $patientId, string $now): array
    {
        $st = $db->prepare(
            "SELECT r.name, r.value, r.units, r.result_date FROM patient_procedure_results r JOIN patient_procedure_orders o ON o.id = r.patient_procedure_order_id
             WHERE o.patient_id = :p AND r.deleted_at IS NULL AND o.deleted_at IS NULL AND r.result_date >= DATE(:n) - INTERVAL 1 DAY AND r.result_date <= DATE(:n2)
             ORDER BY r.result_date DESC, r.id DESC"
        );
        $st->execute(['p' => $patientId, 'n' => $now, 'n2' => $now]);
        $out = [];
        $match = ['pao2' => '/\b(pao2|po2|pa ?o2|partial pressure of oxygen)\b/i', 'creatinine' => '/creatinine/i', 'bilirubin' => '/bilirubin(?!.*(direct|indirect))/i',
            'platelets' => '/platelet|\bplt\b/i'];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            if (preg_match(self::NOT_BLOOD, $r['name'])) {
                continue;
            }
            foreach ($match as $k => $re) {
                if (isset($out[$k]) || !preg_match($re, $r['name']) || !preg_match('/-?\d+(\.\d+)?/', (string) $r['value'], $m)) {
                    continue;
                }
                $v = (float) $m[0];
                // Creatinine / bilirubin in µmol/L -> mg/dL; platelets per µL -> per 10^3.
                if ($k === 'creatinine' && (stripos((string) $r['units'], 'mol') !== false || $v > 30)) {
                    $v = round($v / 88.4, 2);
                } elseif ($k === 'bilirubin' && (stripos((string) $r['units'], 'mol') !== false)) {
                    $v = round($v / 17.1, 2);
                } elseif ($k === 'platelets' && $v > 5000) {
                    $v = round($v / 1000);
                }
                $out[$k] = ['value' => $v, 'date' => $r['result_date']];
            }
        }
        return $out;
    }

    // ------------------------------------------------------------------
    // Pieces of the board
    // ------------------------------------------------------------------

    /** Hourly entries of the 3 days up to $now, newest first (with the vital signs). */
    public function entries(PDO $db, int $admissionId, string $now): array
    {
        $st = $db->prepare(
            "SELECT h.hour_at, h.gcs_e, h.gcs_v, h.gcs_m, h.gcs_intubated, h.rass, h.o2_device, h.o2_flow, h.fio2, h.vent_mode, h.peep, h.pressure_support,
                    v.bp_systolic, v.bp_diastolic, v.heart_rate, v.spo2, v.news2_score
             FROM icu_hourly h LEFT JOIN inpatient_vitals v ON v.id = h.vitals_id AND v.voided_at IS NULL
             WHERE h.admission_id = :a AND h.voided_at IS NULL AND h.hour_at >= :s AND h.hour_at <= :n ORDER BY h.hour_at DESC"
        );
        $st->execute(['a' => $admissionId, 's' => gmdate('Y-m-d H:i:s', self::ts($now) - 3 * 86400), 'n' => $now]);
        return array_map(function ($e) {
            foreach (['gcs_e', 'gcs_v', 'gcs_m', 'rass', 'fio2', 'bp_systolic', 'bp_diastolic', 'heart_rate', 'spo2', 'news2_score'] as $k) {
                $e[$k] = $e[$k] !== null ? (int) $e[$k] : null;
            }
            foreach (['o2_flow', 'peep', 'pressure_support'] as $k) {
                $e[$k] = $e[$k] !== null ? (float) $e[$k] : null;
            }
            $e['gcs_intubated'] = (bool) $e['gcs_intubated'];
            $e['map'] = $e['bp_systolic'] !== null && $e['bp_diastolic'] !== null ? (int) round(($e['bp_systolic'] + 2 * $e['bp_diastolic']) / 3) : null;
            $e['gcs_total'] = $e['gcs_e'] !== null && $e['gcs_m'] !== null && ($e['gcs_v'] !== null || $e['gcs_intubated']) ? $e['gcs_e'] + $e['gcs_m'] + (int) $e['gcs_v'] : null;
            return $e;
        }, $st->fetchAll(PDO::FETCH_ASSOC));
    }

    /** The latest breathing support, and since when the patient has been on a ventilator (this run). */
    private function breathing(array $entries, string $now): array
    {
        $last = null;
        foreach ($entries as $e) {
            if ($e['o2_device'] !== null) {
                $last = $e;
                break;
            }
        }
        if (!$last) {
            return ['device' => null, 'device_label' => null];
        }
        $since = null;
        if ($last['o2_device'] === 'ventilator') {
            foreach ($entries as $e) {
                if ($e['o2_device'] === null) {
                    continue;
                }
                if ($e['o2_device'] !== 'ventilator') {
                    break;
                }
                $since = $e['hour_at'];
            }
        }
        return ['device' => $last['o2_device'], 'device_label' => IcuService::DEVICES[$last['o2_device']] ?? $last['o2_device'], 'mode' => $last['vent_mode'],
            'fio2' => $last['fio2'], 'peep' => $last['peep'], 'flow' => $last['o2_flow'], 'charted_at' => $last['hour_at'],
            'ventilated_since' => $since, 'ventilated_hours' => $since ? intdiv(self::ts($now) - self::ts($since), 3600) : null];
    }

    /** Drips running now: current rate and dose, the highest dose of the last 24 h, vasopressor or not. */
    private function runningDrips(PDO $db, int $admissionId): array
    {
        $st = $db->prepare("SELECT * FROM icu_drips WHERE admission_id = :a AND stopped_at IS NULL ORDER BY started_at");
        $st->execute(['a' => $admissionId]);
        $out = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $d) {
            $r = $db->prepare(
                "SELECT rate_ml_h, dose, changed_at FROM icu_drip_rates WHERE drip_id = :d AND voided_at IS NULL ORDER BY changed_at DESC, id DESC"
            );
            $r->execute(['d' => $d['id']]);
            $rates = $r->fetchAll(PDO::FETCH_ASSOC);
            $cur = $rates[0] ?? null;
            // Highest dose of the last 24 h: the changes in that time plus the rate running at its start.
            $since = (string) $db->query("SELECT NOW() - INTERVAL 24 HOUR")->fetchColumn();
            $max = 0.0;
            foreach ($rates as $x) {
                $max = max($max, (float) $x['dose']);
                if ($x['changed_at'] < $since) {
                    break;
                }
            }
            $pressor = null;
            foreach (self::PRESSORS as $k => $re) {
                if (preg_match($re, $d['drug_name'])) {
                    $pressor = $k;
                    break;
                }
            }
            $out[] = ['id' => (int) $d['id'], 'drug' => $d['drug_name'], 'rate' => $cur ? (float) $cur['rate_ml_h'] : null,
                'dose' => $cur && $cur['dose'] !== null ? round((float) $cur['dose'], 3) : null, 'dose_unit' => $d['dose_unit'],
                'pressor' => $pressor, 'per_kg_min' => $d['dose_unit'] === 'mcg/kg/min', 'max_24h' => $d['dose_unit'] === 'mcg/kg/min' ? $max : null,
                'paused' => $cur && (float) $cur['rate_ml_h'] == 0.0];
        }
        return $out;
    }

    /**
     * Drips that ran at some time between $from and $to (for a past ICU day's SOFA): the highest dose in that time
     * (the rate running at $from and every change up to $to), vasopressor or not. Same shape as runningDrips().
     */
    public function dripsWindow(PDO $db, int $admissionId, string $from, string $to): array
    {
        $st = $db->prepare("SELECT * FROM icu_drips WHERE admission_id = :a AND started_at <= :t AND (stopped_at IS NULL OR stopped_at > :f) ORDER BY started_at");
        $st->execute(['a' => $admissionId, 't' => $to, 'f' => $from]);
        $out = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $d) {
            $r = $db->prepare("SELECT rate_ml_h, dose, changed_at FROM icu_drip_rates WHERE drip_id = :d AND voided_at IS NULL AND changed_at <= :t ORDER BY changed_at DESC, id DESC");
            $r->execute(['d' => $d['id'], 't' => $to]);
            $max = 0.0;
            $rate = 0.0;
            foreach ($r->fetchAll(PDO::FETCH_ASSOC) as $x) {
                $max = max($max, (float) $x['dose']);
                $rate = max($rate, (float) $x['rate_ml_h']);
                if ($x['changed_at'] <= $from) {
                    break;
                }
            }
            if ($rate <= 0) {
                continue; // paused the whole time
            }
            $pressor = null;
            foreach (self::PRESSORS as $k => $re) {
                if (preg_match($re, $d['drug_name'])) {
                    $pressor = $k;
                    break;
                }
            }
            $out[] = ['id' => (int) $d['id'], 'drug' => $d['drug_name'], 'rate' => null, 'dose' => null, 'dose_unit' => $d['dose_unit'], 'pressor' => $pressor,
                'per_kg_min' => $d['dose_unit'] === 'mcg/kg/min', 'max_24h' => $d['dose_unit'] === 'mcg/kg/min' ? $max : null, 'paused' => false];
        }
        return $out;
    }

    // ------------------------------------------------------------------
    // Transfers
    // ------------------------------------------------------------------

    /** Who could come in: ER patients (waiting for a bed / not yet decided), patients in recovery, patients on other wards; and the free ICU beds. */
    public function incoming(): array
    {
        $db = Database::connection();
        $er = $db->query(
            "SELECT v.id, v.visit_no, v.acuity, v.disposition, v.er_diagnosis, v.chief_complaint, v.arrived_at, p.first_name, p.last_name, hw.ward_name AS admit_ward,
                    (SELECT t.chief_complaint FROM er_triage t WHERE t.visit_id = v.id ORDER BY t.triaged_at DESC, t.id DESC LIMIT 1) AS triage_complaint
             FROM er_visits v JOIN patients p ON p.id = v.patient_id LEFT JOIN hospital_wards hw ON hw.id = v.admit_ward_id
             WHERE v.status = 'triaged' ORDER BY v.disposition = 'admit' DESC, v.acuity, v.arrived_at"
        )->fetchAll(PDO::FETCH_ASSOC);
        $or = $db->query(
            "SELECT c.id, c.case_number, c.patient_id, c.patient_name, c.procedure_name, c.or_suite_name, c.actual_out_room_time
             FROM or_surgical_cases c WHERE c.perioperative_stage = 'In PACU' ORDER BY c.actual_out_room_time"
        )->fetchAll(PDO::FETCH_ASSOC);
        $ward = $db->query(
            "SELECT a.id, a.admission_number, a.patient_name, a.patient_mrn, a.admitting_diagnosis, w.ward_name, b.bed_number
             FROM inpatient_admissions a JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id
             WHERE a.status IN " . self::ACTIVE . " AND w.ward_type <> 'ICU' ORDER BY w.ward_name, b.bed_number"
        )->fetchAll(PDO::FETCH_ASSOC);
        return [
            'er' => array_map(fn($v) => ['id' => (int) $v['id'], 'visit_no' => $v['visit_no'], 'name' => trim("{$v['first_name']} {$v['last_name']}"), 'acuity' => $v['acuity'] !== null ? (int) $v['acuity'] : null,
                'boarding' => $v['disposition'] === 'admit', 'admit_ward' => $v['admit_ward'], 'diagnosis' => $v['er_diagnosis'],
                'complaint' => $v['triage_complaint'] ?: $v['chief_complaint'], 'arrived_at' => $v['arrived_at']], $er),
            'or' => array_map(fn($c) => ['id' => (int) $c['id'], 'case_number' => $c['case_number'], 'name' => $c['patient_name'], 'procedure' => $c['procedure_name'],
                'room' => $c['or_suite_name'], 'out_of_room_at' => $c['actual_out_room_time']], $or),
            'ward' => array_map(fn($a) => ['id' => (int) $a['id'], 'admission_number' => $a['admission_number'], 'name' => $a['patient_name'], 'mrn' => $a['patient_mrn'],
                'diagnosis' => $a['admitting_diagnosis'], 'ward' => $a['ward_name'], 'bed' => $a['bed_number']], $ward),
            'icu_beds' => $this->freeBeds($db, true),
            'doctors' => $db->query(
                "SELECT u.id, " . IcuService::nameSql('u.id') . " AS name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.deleted_at IS NULL AND r.name IN ('doctor', 'clinician') ORDER BY name"
            )->fetchAll(PDO::FETCH_ASSOC),
        ];
    }

    /**
     * data: source (er | or | ward), id (ER visit / OR case / admission), bed_id (a free ICU bed), reason;
     *   er (not yet decided, doctors): diagnosis, attending_user_id; or: override_reason (release criteria not met), notes.
     */
    public function transferIn(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::TRANSFER_ROLES, true)) {
            return ['success' => false, 'message' => 'Moving patients into the ICU is done by the doctors and charge nurses.', 'forbidden' => true];
        }
        $db = Database::connection();
        $source = (string) ($data['source'] ?? '');
        if (!in_array($source, ['er', 'or', 'ward'], true)) {
            return ['success' => false, 'message' => 'From where: the ER, the OR or another ward?', 'errors' => ['source' => 'Required.']];
        }
        $bedId = (int) ($data['bed_id'] ?? 0);
        $bed = $this->bed($db, $bedId);
        if (!$bed || $bed['ward_type'] !== 'ICU' || $bed['status'] !== 'Available') {
            return ['success' => false, 'message' => 'Choose a free ICU bed.', 'errors' => ['bed_id' => 'Not free.']];
        }
        $reason = trim((string) ($data['reason'] ?? ''));
        if ($reason === '' || mb_strlen($reason) > 255) {
            return ['success' => false, 'message' => 'Why the ICU (e.g. septic shock on norepinephrine, needs ventilation)?', 'errors' => ['reason' => 'Required.']];
        }
        $id = (int) ($data['id'] ?? 0);
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT icu_in');
        $undo = fn() => $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT icu_in');
        try {
            if ($source === 'er') {
                $st = $db->prepare("SELECT * FROM er_visits WHERE id = :id");
                $st->execute(['id' => $id]);
                $v = $st->fetch(PDO::FETCH_ASSOC);
                if (!$v || $v['status'] !== 'triaged') {
                    $undo();
                    return ['success' => false, 'message' => 'That ER patient is not in the ER (or not triaged yet).', 'errors' => ['id' => 'Required.']];
                }
                $ds = new ErDispositionService();
                $r = $v['disposition'] === 'admit'
                    ? $ds->admitToBed(['id' => $id, 'bed_id' => $bedId], $actor)
                    : $ds->decide(['id' => $id, 'disposition' => 'admit', 'diagnosis' => $data['diagnosis'] ?? '', 'bed_id' => $bedId,
                        'admission_type' => 'Emergency / STAT', 'attending_user_id' => $data['attending_user_id'] ?? '', 'notes' => "To the ICU: {$reason}"], $actor);
                if (!$r['success']) {
                    $undo();
                    return $r;
                }
                $adm = $this->admissionInBed($db, $bedId);
                $ref = [$v['visit_no'], (int) $v['id']];
                $msg = $r['message'];
            } elseif ($source === 'or') {
                $st = $db->prepare("SELECT * FROM or_surgical_cases WHERE id = :id");
                $st->execute(['id' => $id]);
                $c = $st->fetch(PDO::FETCH_ASSOC);
                if (!$c || $c['perioperative_stage'] !== 'In PACU') {
                    $undo();
                    return ['success' => false, 'message' => 'That patient is not in recovery.', 'errors' => ['id' => 'Required.']];
                }
                $r = (new OrPostopService())->release($id, ['destination' => 'bed', 'bed_id' => $bedId, 'override_reason' => $data['override_reason'] ?? null,
                    'notes' => trim("To the ICU: {$reason}. " . trim((string) ($data['notes'] ?? '')))], $actor);
                if (!$r['success']) {
                    $undo();
                    return $r;
                }
                $adm = $this->admissionInBed($db, $bedId);
                $ref = [$c['case_number'], (int) $c['id']];
                $msg = $r['message'];
            } else {
                $st = $db->prepare("SELECT a.*, w.ward_name, w.ward_type FROM inpatient_admissions a JOIN hospital_wards w ON w.id = a.ward_id WHERE a.id = :id AND a.status IN " . self::ACTIVE);
                $st->execute(['id' => $id]);
                $a = $st->fetch(PDO::FETCH_ASSOC);
                if (!$a || $a['ward_type'] === 'ICU') {
                    $undo();
                    return ['success' => false, 'message' => 'Choose a patient on another ward.', 'errors' => ['id' => 'Required.']];
                }
                (new InpatientAdmissionsService())->transferPatient((int) $a['id'], ['to_bed_id' => $bedId, 'transfer_reason' => "To the ICU: {$reason}",
                    'transfer_notes' => trim((string) ($data['notes'] ?? '')), 'transferred_by' => $this->userName($db, (int) $actor['id'])], (int) $actor['id']);
                $adm = $this->admissionInBed($db, $bedId);
                $ref = [$a['ward_name'], (int) $a['ward_id']];
                $msg = "{$a['patient_name']} moved from {$a['ward_name']} to ICU bed {$bed['bed_number']}.";
            }
            if (!$adm) {
                throw new \RuntimeException('The patient is not in the ICU bed after the transfer.');
            }
            $this->closeOpenStays($db, (int) $adm['id']);
            $db->prepare(
                "INSERT INTO icu_stays (admission_id, patient_id, ward_id, bed_id, in_at, source, source_ref, source_id, in_reason, in_by, created_at)
                 VALUES (:a, :p, :w, :b, NOW(), :s, :ref, :sid, :r, :u, NOW())"
            )->execute(['a' => $adm['id'], 'p' => $adm['patient_id'], 'w' => $bed['ward_id'], 'b' => $bedId, 's' => $source, 'ref' => mb_substr((string) $ref[0], 0, 80),
                'sid' => $ref[1], 'r' => mb_substr($reason, 0, 255), 'u' => (int) $actor['id']]);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT icu_in');
        } catch (\Throwable $e) {
            $undo();
            if ($e instanceof \Exception && !($e instanceof \PDOException) && !($e instanceof \RuntimeException)) {
                return ['success' => false, 'message' => $e->getMessage()];
            }
            throw $e;
        }
        return ['success' => true, 'message' => trim($msg) . ' ICU stay started.', 'data' => ['admission_id' => (int) $adm['id']]];
    }

    /** Free ward beds (not ICU) to send a patient to. */
    public function outOptions(int $admissionId): ?array
    {
        $db = Database::connection();
        $a = $this->icuAdmission($db, $admissionId);
        if (!$a) {
            return null;
        }
        $running = $db->prepare("SELECT drug_name FROM icu_drips WHERE admission_id = :a AND stopped_at IS NULL");
        $running->execute(['a' => $admissionId]);
        $last = $db->prepare("SELECT o2_device, vent_mode, hour_at FROM icu_hourly WHERE admission_id = :a AND voided_at IS NULL AND o2_device IS NOT NULL ORDER BY hour_at DESC LIMIT 1");
        $last->execute(['a' => $admissionId]);
        return ['admission' => ['id' => (int) $a['id'], 'name' => $a['patient_name'], 'bed' => $a['bed_number']], 'beds' => $this->freeBeds($db, false),
            'running_drips' => $running->fetchAll(PDO::FETCH_COLUMN), 'breathing' => $last->fetch(PDO::FETCH_ASSOC) ?: null,
            'lines' => (new IcuLinesService())->inPlace($db, $admissionId, (string) $db->query("SELECT NOW()")->fetchColumn())];
    }

    /**
     * data: admission_id, bed_id (a free bed on a ward that is not an ICU), reason, note (the handover), confirm (on a ventilator).
     * Drips must be stopped first (the ward has no ICU flowsheet).
     */
    public function transferOut(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::TRANSFER_ROLES, true)) {
            return ['success' => false, 'message' => 'Moving patients out of the ICU is done by the doctors and charge nurses.', 'forbidden' => true];
        }
        $db = Database::connection();
        $a = $this->icuAdmission($db, (int) ($data['admission_id'] ?? 0));
        if (!$a) {
            return ['success' => false, 'message' => 'This patient is not in the ICU.', 'not_found' => true];
        }
        $bedId = (int) ($data['bed_id'] ?? 0);
        $bed = $this->bed($db, $bedId);
        if (!$bed || $bed['ward_type'] === 'ICU' || $bed['status'] !== 'Available') {
            return ['success' => false, 'message' => 'Choose a free bed on a ward.', 'errors' => ['bed_id' => 'Not free.']];
        }
        $reason = trim((string) ($data['reason'] ?? ''));
        $note = trim((string) ($data['note'] ?? ''));
        $errors = [];
        if ($reason === '' || mb_strlen($reason) > 255) {
            $errors['reason'] = 'Why now (e.g. off pressors 24 h, extubated, stable)?';
        }
        if ($note === '' || mb_strlen($note) > 1000) {
            $errors['note'] = 'The handover to the ward (lines, drains, what to watch, plan).';
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $o = $this->outOptions((int) $a['id']);
        if ($o['running_drips']) {
            return ['success' => false, 'message' => 'Drips still running on the ICU flowsheet: ' . implode(', ', $o['running_drips']) . '. Stop them (or change them to medicine orders) first.',
                'running_drips' => $o['running_drips']];
        }
        if (($o['breathing']['o2_device'] ?? null) === 'ventilator' && empty($data['confirm'])) {
            return ['success' => false, 'message' => 'The last chart (' . substr($o['breathing']['hour_at'], 11, 5) . ') says the patient is on a ventilator. Confirm the patient is off it, or chart the hour first.',
                'needs_confirm' => true];
        }
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT icu_out');
        try {
            (new InpatientAdmissionsService())->transferPatient((int) $a['id'], ['to_bed_id' => $bedId, 'transfer_reason' => "Out of the ICU: {$reason}",
                'transfer_notes' => $note, 'transferred_by' => $this->userName($db, (int) $actor['id'])], (int) $actor['id']);
            $this->ensureStay($db, $a);
            $db->prepare(
                "UPDATE icu_stays SET out_at = NOW(), out_to = 'ward', out_ward_id = :w, out_bed_id = :b, out_reason = :r, out_note = :n, out_by = :u
                 WHERE admission_id = :a AND out_at IS NULL"
            )->execute(['w' => $bed['ward_id'], 'b' => $bedId, 'r' => mb_substr($reason, 0, 255), 'n' => mb_substr($note, 0, 1000), 'u' => (int) $actor['id'], 'a' => $a['id']]);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT icu_out');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT icu_out');
            if (!($e instanceof \PDOException)) {
                return ['success' => false, 'message' => $e->getMessage()];
            }
            throw $e;
        }
        return ['success' => true, 'message' => "{$a['patient_name']} moved out of the ICU to {$bed['ward_name']}, bed {$bed['bed_number']}."];
    }

    /** The ICU stays of an admission (for the flowsheet header / history). */
    public function stays(int $admissionId): array
    {
        $st = Database::connection()->prepare(
            "SELECT s.*, ow.ward_name AS out_ward, ob.bed_number AS out_bed, ib.bed_number AS in_bed, " . IcuService::nameSql('s.in_by') . " AS in_by_name,
                    " . IcuService::nameSql('s.out_by') . " AS out_by_name
             FROM icu_stays s LEFT JOIN hospital_wards ow ON ow.id = s.out_ward_id LEFT JOIN hospital_beds ob ON ob.id = s.out_bed_id LEFT JOIN hospital_beds ib ON ib.id = s.bed_id
             WHERE s.admission_id = :a ORDER BY s.in_at"
        );
        $st->execute(['a' => $admissionId]);
        return array_map(fn($s) => ['id' => (int) $s['id'], 'in_at' => $s['in_at'], 'source' => $s['source'], 'source_label' => self::SOURCES[$s['source']] ?? $s['source'],
            'source_ref' => $s['source_ref'], 'in_bed' => $s['in_bed'], 'in_reason' => $s['in_reason'], 'in_by' => $s['in_by_name'],
            'out_at' => $s['out_at'], 'out_to' => $s['out_to'], 'out_ward' => $s['out_ward'], 'out_bed' => $s['out_bed'], 'out_reason' => $s['out_reason'],
            'out_note' => $s['out_note'], 'out_by' => $s['out_by_name']], $st->fetchAll(PDO::FETCH_ASSOC));
    }

    // ------------------------------------------------------------------
    // The TV
    // ------------------------------------------------------------------

    /** The ICU board TV (one ICU ward or all): initials, severity, breathing, pressors yes/no, alerts, charting. No names, drugs or diagnoses. */
    public function tv(?int $wardId): array
    {
        $b = $this->board($wardId);
        $hourNow = substr($b['now'], 0, 13) . ':00:00';
        return [
            'beds' => array_map(function ($x) use ($hourNow) {
                $p = $x['patient'];
                if (!$p) {
                    return ['bed' => $x['bed'], 'ward' => $x['ward'], 'status' => $x['status'], 'patient' => null];
                }
                $parts = preg_split('/\s+/', trim((string) $p['name']));
                return ['bed' => $x['bed'], 'ward' => $x['ward'], 'status' => $x['status'], 'patient' => [
                    'initials' => mb_strtoupper(mb_substr($parts[0] ?? '', 0, 1) . '.' . mb_substr(end($parts) ?: '', 0, 1) . '.'),
                    'age' => $p['age'], 'sex' => strtoupper(substr((string) $p['sex'], 0, 1)), 'icu_day' => $p['icu_day'],
                    'sofa' => $p['severity']['total'], 'organs' => $p['severity']['organs_scored'], 'band' => $p['severity']['band'],
                    'ventilator' => $p['breathing']['device'] === 'ventilator', 'breathing' => $p['breathing']['device'] ? ($p['breathing']['device'] === 'ventilator'
                        ? trim(($p['breathing']['mode'] ?? '') . ($p['breathing']['fio2'] ? " {$p['breathing']['fio2']}%" : '') . ($p['breathing']['peep'] !== null ? ' P' . rtrim(rtrim(number_format($p['breathing']['peep'], 1), '0'), '.') : ''))
                        : $p['breathing']['device_label']) : null,
                    'ventilated_hours' => $p['breathing']['ventilated_hours'] ?? null,
                    'drips' => count($p['drips']), 'pressors' => (bool) array_filter($p['drips'], fn($d) => $d['pressor'] && !$d['paused']),
                    'alerts' => count($p['alerts']), 'critical' => (bool) array_filter($p['alerts'], fn($a) => $a['urgency'] === 'critical'),
                    'charted' => $p['last'] && $p['last']['hour_at'] === $hourNow, 'minutes_since_last' => $p['minutes_since_last'],
                ]];
            }, $b['beds']),
            'counts' => $b['counts'],
            'ward' => $wardId ? (current(array_filter($b['wards'], fn($w) => (int) $w['id'] === $wardId))['ward_name'] ?? null) : null,
        ];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /**
     * Keep icu_stays in step with the beds: an ICU patient without an open stay gets one (moved in by another
     * screen: from the latest transfer into the ICU ward, else the admission); a stay whose patient left the
     * ICU by another screen (ward transfer, discharge) is closed.
     */
    public function syncStays(PDO $db): void
    {
        $missing = $db->query(
            "SELECT a.*, w.ward_type FROM inpatient_admissions a JOIN hospital_wards w ON w.id = a.ward_id AND w.ward_type = 'ICU'
             WHERE a.status IN " . self::ACTIVE . " AND NOT EXISTS (SELECT 1 FROM icu_stays s WHERE s.admission_id = a.id AND s.out_at IS NULL)"
        )->fetchAll(PDO::FETCH_ASSOC);
        foreach ($missing as $a) {
            $this->ensureStay($db, $a);
        }
        $stale = $db->query(
            "SELECT s.id, s.admission_id, a.status, a.discharge_date, a.discharge_disposition, w.ward_type, a.ward_id, a.bed_id FROM icu_stays s JOIN inpatient_admissions a ON a.id = s.admission_id
             JOIN hospital_wards w ON w.id = a.ward_id WHERE s.out_at IS NULL AND (a.status NOT IN " . self::ACTIVE . " OR w.ward_type <> 'ICU')"
        )->fetchAll(PDO::FETCH_ASSOC);
        foreach ($stale as $s) {
            if (in_array($s['status'], ['Admitted', 'Pending Discharge'], true)) {
                $t = $db->prepare("SELECT transfer_time FROM inpatient_transfers WHERE admission_id = :a ORDER BY transfer_time DESC, id DESC LIMIT 1");
                $t->execute(['a' => $s['admission_id']]);
                $db->prepare("UPDATE icu_stays SET out_at = COALESCE(:t, NOW()), out_to = 'ward', out_ward_id = :w, out_bed_id = :b, out_reason = 'Moved in Inpatient Admissions' WHERE id = :id")
                    ->execute(['t' => $t->fetchColumn() ?: null, 'w' => $s['ward_id'], 'b' => $s['bed_id'], 'id' => $s['id']]);
            } else {
                $db->prepare("UPDATE icu_stays SET out_at = COALESCE(:t, NOW()), out_to = :o, out_reason = :r WHERE id = :id")
                    ->execute(['t' => $s['discharge_date'], 'o' => self::died($s) ? 'died' : 'discharged',
                        'r' => mb_substr((string) ($s['discharge_disposition'] ?: $s['status']), 0, 255), 'id' => $s['id']]);
            }
        }
    }

    /** An open stay for an ICU admission that has none (moved in by another screen). */
    private function ensureStay(PDO $db, array $a): void
    {
        $open = $db->prepare("SELECT 1 FROM icu_stays WHERE admission_id = :a AND out_at IS NULL");
        $open->execute(['a' => $a['id']]);
        if ($open->fetchColumn()) {
            return;
        }
        $t = $db->prepare(
            "SELECT t.transfer_time, fw.ward_name, fw.id AS from_ward FROM inpatient_transfers t JOIN hospital_wards tw ON tw.id = t.to_ward_id AND tw.ward_type = 'ICU'
             JOIN hospital_wards fw ON fw.id = t.from_ward_id WHERE t.admission_id = :a AND fw.ward_type <> 'ICU' ORDER BY t.transfer_time DESC, t.id DESC LIMIT 1"
        );
        $t->execute(['a' => $a['id']]);
        $tr = $t->fetch(PDO::FETCH_ASSOC);
        $source = $tr ? 'ward' : (($a['admission_source'] ?? '') === 'Emergency Room (ER)' ? 'er' : (($a['admission_source'] ?? '') === 'Post-Op PACU / Surgical' ? 'or' : 'direct'));
        $db->prepare(
            "INSERT INTO icu_stays (admission_id, patient_id, ward_id, bed_id, in_at, source, source_ref, source_id, in_reason, created_at)
             VALUES (:a, :p, :w, :b, :at, :s, :ref, :sid, :r, NOW())"
        )->execute(['a' => $a['id'], 'p' => $a['patient_id'], 'w' => $a['ward_id'], 'b' => $a['bed_id'], 'at' => $tr['transfer_time'] ?? $a['admission_date'],
            's' => $source, 'ref' => $tr['ward_name'] ?? ($a['admission_source'] ?? null), 'sid' => $tr ? (int) $tr['from_ward'] : null, 'r' => null]);
    }

    private function closeOpenStays(PDO $db, int $admissionId): void
    {
        $db->prepare("UPDATE icu_stays SET out_at = NOW(), out_to = 'other', out_reason = 'Replaced by a new ICU stay' WHERE admission_id = :a AND out_at IS NULL")
            ->execute(['a' => $admissionId]);
    }

    private function openStay(PDO $db, int $admissionId): ?array
    {
        $st = $db->prepare("SELECT * FROM icu_stays WHERE admission_id = :a AND out_at IS NULL ORDER BY id DESC LIMIT 1");
        $st->execute(['a' => $admissionId]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function icuAdmission(PDO $db, int $id): ?array
    {
        $st = $db->prepare(
            "SELECT a.*, b.bed_number FROM inpatient_admissions a JOIN hospital_wards w ON w.id = a.ward_id AND w.ward_type = 'ICU' JOIN hospital_beds b ON b.id = a.bed_id
             WHERE a.id = :id AND a.status IN " . self::ACTIVE
        );
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function bed(PDO $db, int $id): ?array
    {
        $st = $db->prepare(
            "SELECT b.*, w.ward_name, w.ward_type FROM hospital_beds b JOIN hospital_wards w ON w.id = b.ward_id AND w.is_active = 1 WHERE b.id = :id AND b.is_active = 1"
        );
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function freeBeds(PDO $db, bool $icu): array
    {
        return array_map(fn($b) => ['id' => (int) $b['id'], 'bed' => $b['bed_number'], 'room' => $b['room_number'], 'type' => $b['bed_type'], 'ward_id' => (int) $b['ward_id'],
            'ward' => $b['ward_name']], $db->query(
            "SELECT b.id, b.bed_number, b.room_number, b.bed_type, b.ward_id, w.ward_name FROM hospital_beds b JOIN hospital_wards w ON w.id = b.ward_id AND w.is_active = 1
             WHERE b.is_active = 1 AND b.status = 'Available' AND w.ward_type " . ($icu ? "= 'ICU'" : "<> 'ICU'") . " ORDER BY w.ward_name, b.bed_number"
        )->fetchAll(PDO::FETCH_ASSOC));
    }

    private function admissionInBed(PDO $db, int $bedId): ?array
    {
        $st = $db->prepare("SELECT * FROM inpatient_admissions WHERE bed_id = :b AND status IN " . self::ACTIVE . " ORDER BY id DESC LIMIT 1");
        $st->execute(['b' => $bedId]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function userName(PDO $db, int $id): string
    {
        $st = $db->prepare("SELECT " . IcuService::nameSql(':id'));
        $st->execute(['id' => $id]);
        return (string) ($st->fetchColumn() ?: 'ICU');
    }

    /** An admission row that ended in death. */
    public static function died(array $a): bool
    {
        return ($a['status'] ?? '') === 'Deceased' || (in_array($a['status'] ?? '', ['Discharged', 'Transferred'], true) && preg_match(self::DIED, (string) ($a['discharge_disposition'] ?? '')));
    }

    private static function ts(string $dt): int
    {
        return (new \DateTimeImmutable(substr($dt, 0, 19), new \DateTimeZone('UTC')))->getTimestamp();
    }
}
