<?php

namespace App\Modules\Icu\Services;

use App\Core\Database;
use PDO;

/**
 * ICU (module 13, Phase 3): severity scores of each ICU stay, saved in icu_scores.
 *
 *   * SOFA for every ICU day (the 24 h up to each 07:00, and up to leaving the ICU) -- the bedside SOFA of the
 *     board (IcuBoardService::sofa) worked out for that window. The day in progress is shown live, not saved.
 *   * APACHE II (Knaus 1985) for the first 24 h in the ICU: the worst value of 12 measurements (temperature, MAP,
 *     heart rate, breathing rate, oxygenation, arterial pH (else serum HCO3), sodium, potassium, creatinine
 *     (double with acute kidney failure), haematocrit, white cells, GCS) + age + chronic health. A measurement
 *     not taken scores 0 and is listed as missing. Predicted hospital mortality from the APACHE II equation
 *     without the diagnosis weight: ln(R/(1-R)) = -3.517 + 0.146 x score (+ 0.603 after emergency surgery).
 *   * A saved score is worked out again each time it is looked at (and saved when it changed) until a day after
 *     its window ends, so late lab results still count; then it is final. The doctor's APACHE answers (chronic health, type of admission, acute kidney
 *     failure) are on icu_stays.
 */
class IcuScoreService
{
    public const ANSWER_ROLES = ['admin', 'doctor', 'clinician'];
    public const ADMIT_TYPES = ['nonop' => 'Medical (no operation)', 'emergency_postop' => 'After emergency surgery', 'elective_postop' => 'After planned surgery'];
    public const APACHE_BANDS = [[0, 9, '0–9'], [10, 19, '10–19'], [20, 29, '20–29'], [30, 71, '30 or more']];
    private const KEEP = 86400;
    /** Shortest first ICU day (hours from arrival to 07:00) that gets its own SOFA; shorter ones join the next day. */
    private const MIN_FIRST_DAY = 6;
    private const PARAMS = ['temperature' => 'Temperature', 'map' => 'Mean arterial pressure', 'heart_rate' => 'Heart rate', 'resp_rate' => 'Breathing rate',
        'oxygenation' => 'Oxygenation', 'acid' => 'Arterial pH', 'sodium' => 'Sodium', 'potassium' => 'Potassium', 'creatinine' => 'Creatinine',
        'hct' => 'Haematocrit', 'wbc' => 'White cells', 'gcs' => 'GCS'];

    // ------------------------------------------------------------------
    // Reading
    // ------------------------------------------------------------------

    /** Scores of every ICU stay of an admission (newest stay first), for the flowsheet. */
    public function forAdmission(int $admissionId, string $role): array
    {
        $db = Database::connection();
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $st = $db->prepare("SELECT * FROM icu_stays WHERE admission_id = :a ORDER BY in_at DESC");
        $st->execute(['a' => $admissionId]);
        $out = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $s) {
            $this->ensure($db, $s, $now);
            $saved = $this->saved($db, (int) $s['id']);
            $sofa = array_map(fn($r) => ['window_end' => $r['window_end'], 'score' => $r['score'] !== null ? (int) $r['score'] : null, 'organs' => (int) $r['parts'],
                'band' => self::band($r['score']), 'detail' => json_decode((string) $r['detail'], true)], array_values(array_filter($saved, fn($r) => $r['kind'] === 'sofa')));
            $live = null;
            if (!$s['out_at']) {
                $x = $this->sofaAt($db, $s, $now);
                $live = ['window_end' => $now, 'score' => $x['total'], 'organs' => $x['organs_scored'], 'band' => $x['band'], 'detail' => $x['organs'], 'live' => true];
            }
            $ap = array_values(array_filter($saved, fn($r) => $r['kind'] === 'apache2'))[0] ?? null;
            $apache = $ap ? json_decode((string) $ap['detail'], true) + ['saved' => true] : $this->apache($db, $s, $now) + ['saved' => false];
            $out[] = [
                'stay_id' => (int) $s['id'], 'in_at' => $s['in_at'], 'out_at' => $s['out_at'], 'source' => $s['source'],
                'sofa' => $sofa, 'sofa_live' => $live, 'apache' => $apache,
                'can_answer' => in_array($role, self::ANSWER_ROLES, true),
            ];
        }
        return ['stays' => $out, 'admit_types' => self::ADMIT_TYPES];
    }

    /** APACHE II for the board card: score, predicted mortality, whether the 24 h are over. */
    public function apacheBrief(PDO $db, int $stayId, string $now): ?array
    {
        $s = $this->stay($db, $stayId);
        if (!$s) {
            return null;
        }
        $this->ensure($db, $s, $now);
        $st = $db->prepare("SELECT detail FROM icu_scores WHERE stay_id = :s AND kind = 'apache2' LIMIT 1");
        $st->execute(['s' => $stayId]);
        $d = $st->fetchColumn();
        $a = $d ? json_decode((string) $d, true) : $this->apache($db, $s, $now);
        return ['score' => $a['score'], 'predicted' => $a['predicted_mortality'], 'complete' => $a['complete'], 'missing' => count($a['missing']),
            'answered' => $a['answers']['chronic'] !== null];
    }

    /** Saved scores of many stays, for the report: [stay_id => [apache, predicted, apache_parts, sofa_first, sofa_max, sofa_days]]. */
    public function summaries(PDO $db, array $stayIds): array
    {
        $out = [];
        if (!$stayIds) {
            return $out;
        }
        $rows = $db->query(
            "SELECT stay_id, kind, window_end, score, parts, predicted_mortality FROM icu_scores WHERE stay_id IN (" . implode(',', array_map('intval', $stayIds)) . ") ORDER BY stay_id, window_end"
        )->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $r) {
            $id = (int) $r['stay_id'];
            $out[$id] ??= ['apache' => null, 'predicted' => null, 'sofa_first' => null, 'sofa_max' => null, 'sofa_days' => 0];
            if ($r['kind'] === 'apache2') {
                $out[$id]['apache'] = $r['score'] !== null ? (int) $r['score'] : null;
                $out[$id]['predicted'] = $r['predicted_mortality'] !== null ? (float) $r['predicted_mortality'] : null;
            } elseif ($r['score'] !== null) {
                $out[$id]['sofa_days']++;
                $out[$id]['sofa_first'] ??= (int) $r['score'];
                $out[$id]['sofa_max'] = max($out[$id]['sofa_max'] ?? 0, (int) $r['score']);
            }
        }
        return $out;
    }

    // ------------------------------------------------------------------
    // The doctor's APACHE answers
    // ------------------------------------------------------------------

    /** data: stay_id, chronic (1 | 0), admit_type (nonop | emergency_postop | elective_postop), arf (1 | 0). */
    public function saveAnswers(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::ANSWER_ROLES, true)) {
            return ['success' => false, 'message' => 'The APACHE II questions are answered by a doctor.', 'forbidden' => true];
        }
        $db = Database::connection();
        $s = $this->stay($db, (int) ($data['stay_id'] ?? 0));
        if (!$s) {
            return ['success' => false, 'message' => 'ICU stay not found.', 'not_found' => true];
        }
        $errors = [];
        $yn = function ($k) use ($data, &$errors) {
            $v = $data[$k] ?? '';
            if (!in_array((string) $v, ['0', '1'], true) && !is_bool($v)) {
                $errors[$k] = 'Yes or no.';
                return null;
            }
            return (int) (bool) $v;
        };
        $chronic = $yn('chronic');
        $arf = $yn('arf');
        $type = (string) ($data['admit_type'] ?? '');
        if (!isset(self::ADMIT_TYPES[$type])) {
            $errors['admit_type'] = 'Medical, after emergency surgery, or after planned surgery?';
        }
        if ($errors) {
            return ['success' => false, 'message' => count($errors) > 1 ? 'Answer all three questions.' : reset($errors), 'errors' => $errors];
        }
        $db->prepare("UPDATE icu_stays SET apache_chronic = :c, apache_admit = :t, apache_arf = :r, apache_by = :u, apache_at = NOW() WHERE id = :id")
            ->execute(['c' => $chronic, 't' => $type, 'r' => $arf, 'u' => (int) $actor['id'], 'id' => $s['id']]);
        $db->prepare("DELETE FROM icu_scores WHERE stay_id = :s AND kind = 'apache2'")->execute(['s' => $s['id']]);
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $this->ensure($db, $this->stay($db, (int) $s['id']), $now, true);
        $a = $this->apache($db, $this->stay($db, (int) $s['id']), $now);
        return ['success' => true, 'message' => "APACHE II answers saved: score {$a['score']}" . ($a['complete'] ? '' : ' so far') . '.', 'data' => $a];
    }

    // ------------------------------------------------------------------
    // Saving
    // ------------------------------------------------------------------

    /** Save (or work out again) the SOFA of each finished ICU day and the APACHE II once its 24 h are over. */
    public function ensure(PDO $db, array $stay, string $now, bool $force = false): void
    {
        $saved = [];
        foreach ($this->saved($db, (int) $stay['id']) as $r) {
            $saved["{$r['kind']}|{$r['window_end']}"] = $r;
        }
        $want = [];
        foreach ($this->sofaPoints($stay, $now) as $p) {
            $want["sofa|{$p}"] = ['sofa', $p];
        }
        $apEnd = self::plus($stay['in_at'], 86400);
        if ($stay['out_at'] && $stay['out_at'] < $apEnd) {
            $apEnd = $stay['out_at'];
        }
        if ($apEnd <= $now) {
            $want["apache2|{$apEnd}"] = ['apache2', $apEnd];
        }
        // Work the scores out each time (reads only); write only what is new, changed, or now final -- in one commit.
        $writes = [];
        foreach (array_diff_key($saved, $want) as $r) {
            $writes[] = ['delete', (int) $r['id']];
        }
        foreach ($want as $key => [$kind, $end]) {
            $r = $saved[$key] ?? null;
            if ($r && !$force && self::ts($r['computed_at']) >= self::ts($end) + self::KEEP) {
                continue; // final
            }
            if ($kind === 'sofa') {
                $x = $this->sofaAt($db, $stay, $end);
                $row = ['sc' => $x['total'], 'p' => $x['organs_scored'], 'pm' => null, 'd' => json_encode($x['organs'], JSON_UNESCAPED_UNICODE)];
            } else {
                $x = $this->apache($db, $stay, $now);
                $row = ['sc' => $x['score'], 'p' => $x['found'], 'pm' => $x['predicted_mortality'], 'd' => json_encode($x, JSON_UNESCAPED_UNICODE)];
            }
            $same = $r && (string) $r['score'] === (string) $row['sc'] && (int) $r['parts'] === (int) $row['p']
                && (string) ($r['predicted_mortality'] ?? '') === (string) ($row['pm'] === null ? '' : number_format($row['pm'], 1, '.', '')) && $r['detail'] === $row['d'];
            $final = self::ts($now) >= self::ts($end) + self::KEEP;
            if (!$same || $final || $force) {
                $writes[] = ['save', ['s' => $stay['id'], 'a' => $stay['admission_id'], 'k' => $kind, 'w' => $end] + $row];
            }
        }
        if (!$writes) {
            return;
        }
        $owns = !$db->inTransaction();
        $owns && $db->beginTransaction();
        try {
            $up = $db->prepare(
                "INSERT INTO icu_scores (stay_id, admission_id, kind, window_end, score, parts, predicted_mortality, detail, computed_at)
                 VALUES (:s, :a, :k, :w, :sc, :p, :pm, :d, NOW())
                 ON DUPLICATE KEY UPDATE score = VALUES(score), parts = VALUES(parts), predicted_mortality = VALUES(predicted_mortality), detail = VALUES(detail), computed_at = NOW()"
            );
            foreach ($writes as [$op, $x]) {
                $op === 'delete' ? $db->prepare("DELETE FROM icu_scores WHERE id = :id")->execute(['id' => $x]) : $up->execute($x);
            }
            $owns && $db->commit();
        } catch (\Throwable $e) {
            $owns && $db->rollBack();
            throw $e;
        }
    }

    /** Ends of the ICU days of a stay: each 07:00 after arrival (the first one at least 6 h after), then leaving the ICU. */
    public function sofaPoints(array $stay, string $now): array
    {
        $end = $stay['out_at'] ?: $now;
        $d = substr($stay['in_at'], 0, 10) . sprintf(' %02d:00:00', IcuService::DAY_START);
        while (self::ts($d) - self::ts($stay['in_at']) < self::MIN_FIRST_DAY * 3600) {
            $d = self::plus($d, 86400);
        }
        $points = [];
        while ($d <= $end) {
            $points[] = $d;
            $d = self::plus($d, 86400);
        }
        if ($stay['out_at'] && (!$points || end($points) !== $stay['out_at'])) {
            $points[] = $stay['out_at'];
        }
        return $points;
    }

    /** The bedside SOFA of the 24 h up to $end, counting only time in the ICU. */
    public function sofaAt(PDO $db, array $stay, string $end): array
    {
        $board = new IcuBoardService();
        $aid = (int) $stay['admission_id'];
        $inHour = substr($stay['in_at'], 0, 13) . ':00:00';
        $entries = array_values(array_filter($board->entries($db, $aid, $end), fn($e) => $e['hour_at'] >= $inHour));
        $from = max($stay['in_at'], self::plus($end, -86400));
        return $board->sofa($db, ['admission_id' => $aid, 'patient_id' => $stay['patient_id'], 'admission_date' => $stay['in_at']], $entries,
            $board->dripsWindow($db, $aid, $from, $end), $stay, $end);
    }

    // ------------------------------------------------------------------
    // APACHE II
    // ------------------------------------------------------------------

    /** APACHE II of the first 24 h of a stay (so far, when the 24 h aren't over). */
    public function apache(PDO $db, array $stay, string $now): array
    {
        $start = $stay['in_at'];
        $full = self::plus($start, 86400);
        $end = min($full, $stay['out_at'] ?: $now, $now);
        $complete = $end === $full || ($stay['out_at'] && $stay['out_at'] <= $now);
        $aid = (int) $stay['admission_id'];
        $inHour = substr($start, 0, 13) . ':00:00';

        $v = $db->prepare(
            "SELECT taken_at, temperature_c, heart_rate, resp_rate, bp_systolic, bp_diastolic FROM inpatient_vitals
             WHERE admission_id = :a AND voided_at IS NULL AND taken_at >= :f AND taken_at <= :t"
        );
        $v->execute(['a' => $aid, 'f' => $inHour, 't' => $end]);
        $vitals = $v->fetchAll(PDO::FETCH_ASSOC);
        $h = $db->prepare("SELECT hour_at, gcs_e, gcs_v, gcs_m, gcs_intubated, o2_device, o2_flow, fio2 FROM icu_hourly WHERE admission_id = :a AND voided_at IS NULL AND hour_at >= :f AND hour_at <= :t");
        $h->execute(['a' => $aid, 'f' => $inHour, 't' => $end]);
        $hours = $h->fetchAll(PDO::FETCH_ASSOC);
        $labs = $this->allLabs($db, (int) $stay['patient_id'], substr(self::plus($start, -6 * 3600), 0, 10), substr($end, 0, 10));
        $answers = $this->answers($db, $stay);

        $p = [];
        $worst = function (string $key, array $values, callable $points, callable $show, string $how) use (&$p) {
            $best = null;
            foreach ($values as $x) {
                $pt = $points($x);
                if ($best === null || $pt > $best[0]) {
                    $best = [$pt, $x];
                }
            }
            $p[$key] = $best ? ['points' => $best[0], 'value' => $show($best[1]), 'how' => $how] : ['points' => 0, 'value' => null, 'how' => $how, 'missing' => true];
        };
        $col = fn($rows, $k) => array_values(array_map('floatval', array_filter(array_column($rows, $k), fn($x) => $x !== null && $x !== '')));
        $maps = array_values(array_filter(array_map(fn($r) => $r['bp_systolic'] !== null && $r['bp_diastolic'] !== null ? round(($r['bp_systolic'] + 2 * $r['bp_diastolic']) / 3) : null, $vitals), fn($x) => $x !== null));

        $worst('temperature', $col($vitals, 'temperature_c'), fn($x) => $x >= 41 ? 4 : ($x >= 39 ? 3 : ($x >= 38.5 ? 1 : ($x >= 36 ? 0 : ($x >= 34 ? 1 : ($x >= 32 ? 2 : ($x >= 30 ? 3 : 4)))))),
            fn($x) => "{$x} °C", 'Highest or lowest');
        $worst('map', $maps, fn($x) => $x >= 160 ? 4 : ($x >= 130 ? 3 : ($x >= 110 ? 2 : ($x >= 70 ? 0 : ($x >= 50 ? 2 : 4)))), fn($x) => "MAP {$x}", 'mmHg');
        $worst('heart_rate', $col($vitals, 'heart_rate'), fn($x) => $x >= 180 ? 4 : ($x >= 140 ? 3 : ($x >= 110 ? 2 : ($x >= 70 ? 0 : ($x >= 55 ? 2 : ($x >= 40 ? 3 : 4))))),
            fn($x) => "HR {$x}", '/min');
        $worst('resp_rate', $col($vitals, 'resp_rate'), fn($x) => $x >= 50 ? 4 : ($x >= 35 ? 3 : ($x >= 25 ? 1 : ($x >= 12 ? 0 : ($x >= 10 ? 1 : ($x >= 6 ? 2 : 4))))),
            fn($x) => "RR {$x}", '/min (ventilated or not)');

        // Oxygenation: each PaO2 with the highest FiO2 charted that day (A-aDO2 when FiO2 >= 50%, else the PaO2).
        $fio2ByDay = [];
        foreach ($hours as $e) {
            $f = IcuBoardService::fio2($e + ['fio2' => $e['fio2'] !== null ? (int) $e['fio2'] : null, 'o2_flow' => $e['o2_flow'] !== null ? (float) $e['o2_flow'] : null]);
            if ($f !== null) {
                $d = substr($e['hour_at'], 0, 10);
                $fio2ByDay[$d] = max($fio2ByDay[$d] ?? 0, $f);
            }
        }
        $paco2 = $labs['paco2'][0]['value'] ?? 40.0;
        $ox = [];
        foreach ($labs['pao2'] ?? [] as $l) {
            $f = $fio2ByDay[$l['date']] ?? ($fio2ByDay ? max($fio2ByDay) : null);
            $ox[] = ['pao2' => $l['value'], 'fio2' => $f];
        }
        $worst('oxygenation', $ox, function ($x) use ($paco2) {
            if ($x['fio2'] !== null && $x['fio2'] >= 50) {
                $aa = ($x['fio2'] / 100) * 713 - $paco2 / 0.8 - $x['pao2'];
                return $aa >= 500 ? 4 : ($aa >= 350 ? 3 : ($aa >= 200 ? 2 : 0));
            }
            return $x['pao2'] > 70 ? 0 : ($x['pao2'] >= 61 ? 1 : ($x['pao2'] >= 55 ? 3 : 4));
        }, function ($x) use ($paco2) {
            if ($x['fio2'] !== null && $x['fio2'] >= 50) {
                return 'A-aDO₂ ' . round(($x['fio2'] / 100) * 713 - $paco2 / 0.8 - $x['pao2']) . " (FiO₂ {$x['fio2']}%)";
            }
            return "PaO₂ {$x['pao2']}" . ($x['fio2'] !== null ? " (FiO₂ {$x['fio2']}%)" : ' (FiO₂ not charted)');
        }, 'Blood gas');

        if (!empty($labs['ph'])) {
            $worst('acid', array_column($labs['ph'], 'value'), fn($x) => $x >= 7.7 ? 4 : ($x >= 7.6 ? 3 : ($x >= 7.5 ? 1 : ($x >= 7.33 ? 0 : ($x >= 7.25 ? 2 : ($x >= 7.15 ? 3 : 4))))),
                fn($x) => "pH {$x}", 'Blood gas');
        } else {
            $worst('acid', array_column($labs['hco3'] ?? [], 'value'), fn($x) => $x >= 52 ? 4 : ($x >= 41 ? 3 : ($x >= 32 ? 1 : ($x >= 22 ? 0 : ($x >= 18 ? 2 : ($x >= 15 ? 3 : 4))))),
                fn($x) => "HCO₃ {$x}", 'No blood gas: serum bicarbonate');
        }
        $worst('sodium', array_column($labs['sodium'] ?? [], 'value'), fn($x) => $x >= 180 ? 4 : ($x >= 160 ? 3 : ($x >= 155 ? 2 : ($x >= 150 ? 1 : ($x >= 130 ? 0 : ($x >= 120 ? 2 : ($x >= 111 ? 3 : 4)))))),
            fn($x) => "Na {$x}", 'mmol/L');
        $worst('potassium', array_column($labs['potassium'] ?? [], 'value'), fn($x) => $x >= 7 ? 4 : ($x >= 6 ? 3 : ($x >= 5.5 ? 1 : ($x >= 3.5 ? 0 : ($x >= 3 ? 1 : ($x >= 2.5 ? 2 : 4))))),
            fn($x) => "K {$x}", 'mmol/L');
        $arf = $answers['arf'] === 1;
        $worst('creatinine', array_column($labs['creatinine'] ?? [], 'value'), fn($x) => ($x >= 3.5 ? 4 : ($x >= 2 ? 3 : ($x >= 1.5 ? 2 : ($x >= 0.6 ? 0 : 2)))) * ($arf ? 2 : 1),
            fn($x) => "Creatinine {$x}", $arf ? 'mg/dL, doubled: acute kidney failure' : 'mg/dL');
        $worst('hct', array_column($labs['hct'] ?? [], 'value'), fn($x) => $x >= 60 ? 4 : ($x >= 50 ? 2 : ($x >= 46 ? 1 : ($x >= 30 ? 0 : ($x >= 20 ? 2 : 4)))),
            fn($x) => "Hct {$x}%", '%');
        $worst('wbc', array_column($labs['wbc'] ?? [], 'value'), fn($x) => $x >= 40 ? 4 : ($x >= 20 ? 2 : ($x >= 15 ? 1 : ($x >= 3 ? 0 : ($x >= 1 ? 2 : 4)))),
            fn($x) => "WBC {$x}", '× 10³/µL');
        $gcs = [];
        $est = false;
        foreach ($hours as $e) {
            if ($e['gcs_e'] !== null && $e['gcs_m'] !== null) {
                $gcs[] = (int) $e['gcs_e'] + (int) $e['gcs_m'] + ($e['gcs_intubated'] ? 1 : (int) $e['gcs_v']);
                $est = $est || $e['gcs_intubated'];
            }
        }
        $worst('gcs', $gcs, fn($x) => 15 - $x, fn($x) => "GCS {$x}" . ($est ? ' (V=1, intubated)' : ''), '15 − lowest GCS');

        $age = $this->age($db, $stay);
        $agePts = $age === null ? 0 : ($age <= 44 ? 0 : ($age <= 54 ? 2 : ($age <= 64 ? 3 : ($age <= 74 ? 5 : 6))));
        $chronicPts = $answers['chronic'] === 1 ? ($answers['admit_type'] === 'elective_postop' ? 2 : 5) : 0;
        $aps = array_sum(array_column($p, 'points'));
        $score = $aps + $agePts + $chronicPts;
        $missing = array_keys(array_filter($p, fn($x) => !empty($x['missing'])));
        $logit = -3.517 + 0.146 * $score + ($answers['admit_type'] === 'emergency_postop' ? 0.603 : 0);
        $out = [];
        foreach (self::PARAMS as $k => $label) {
            $out[$k] = $p[$k] + ['label' => $label];
        }
        return [
            'score' => $score, 'aps' => $aps, 'age' => $age, 'age_points' => $agePts, 'chronic_points' => $chronicPts, 'params' => $out,
            'found' => 12 - count($missing), 'missing' => array_map(fn($k) => self::PARAMS[$k], $missing),
            'predicted_mortality' => round(100 / (1 + exp(-$logit)), 1), 'complete' => $complete, 'window' => [$start, $end],
            'answers' => $answers, 'admit_type_label' => self::ADMIT_TYPES[$answers['admit_type']],
        ];
    }

    /** The doctor's answers, else defaults (type of admission from where the patient came from). */
    private function answers(PDO $db, array $stay): array
    {
        $type = $stay['apache_admit'] ?? null;
        $guessed = false;
        if (!$type) {
            $guessed = true;
            $type = 'nonop';
            if ($stay['source'] === 'or' && $stay['source_id']) {
                $st = $db->prepare("SELECT case_priority FROM or_surgical_cases WHERE id = :id");
                $st->execute(['id' => $stay['source_id']]);
                $type = $st->fetchColumn() === 'Elective' ? 'elective_postop' : 'emergency_postop';
            } elseif ($stay['source'] === 'or') {
                $type = 'emergency_postop';
            }
        }
        return ['chronic' => $stay['apache_chronic'] !== null ? (int) $stay['apache_chronic'] : null, 'arf' => $stay['apache_arf'] !== null ? (int) $stay['apache_arf'] : null,
            'admit_type' => $type, 'admit_type_guessed' => $guessed, 'by' => $stay['apache_by'] ? $this->name($db, (int) $stay['apache_by']) : null, 'at' => $stay['apache_at']];
    }

    /** Every blood value of the APACHE labs between two dates (newest first). */
    private function allLabs(PDO $db, int $patientId, string $fromDate, string $toDate): array
    {
        $st = $db->prepare(
            "SELECT r.name, r.value, r.units, r.result_date FROM patient_procedure_results r JOIN patient_procedure_orders o ON o.id = r.patient_procedure_order_id
             WHERE o.patient_id = :p AND r.deleted_at IS NULL AND o.deleted_at IS NULL AND r.result_date >= :f AND r.result_date <= :t ORDER BY r.result_date DESC, r.id DESC"
        );
        $st->execute(['p' => $patientId, 'f' => $fromDate, 't' => $toDate]);
        $match = [
            'pao2' => '/\b(pao2|po2|pa ?o2|partial pressure of oxygen)\b/i', 'paco2' => '/\b(paco2|pco2|pa ?co2)\b/i',
            'ph' => '/(^|[\s(])ph($|[\s)])/i', 'hco3' => '/hco3|bicarbonate|total co2|\btco2\b/i',
            'sodium' => '/sodium|^\s*na\+?\s*$/i', 'potassium' => '/potassium|^\s*k\+?\s*$/i', 'creatinine' => '/creatinine(?!.*(clearance|ratio))/i',
            'hct' => '/hematocrit|haematocrit|\bhct\b|\bpcv\b/i', 'wbc' => '/\bwbc\b|white (blood )?cell|leu[ck]ocyte count|total leu[ck]ocyte/i',
        ];
        $out = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            if (preg_match(IcuBoardService::NOT_BLOOD, $r['name']) || !preg_match('/-?\d+(\.\d+)?/', (string) $r['value'], $m)) {
                continue;
            }
            foreach ($match as $k => $re) {
                if (!preg_match($re, $r['name'])) {
                    continue;
                }
                $v = (float) $m[0];
                if ($k === 'creatinine' && (stripos((string) $r['units'], 'mol') !== false || $v > 30)) {
                    $v = round($v / 88.4, 2);
                } elseif ($k === 'hct' && $v > 0 && $v < 1) {
                    $v = round($v * 100, 1);
                } elseif ($k === 'wbc' && $v > 1000) {
                    $v = round($v / 1000, 1);
                } elseif (in_array($k, ['pao2', 'paco2'], true) && stripos((string) $r['units'], 'kpa') !== false) {
                    $v = round($v * 7.50062);
                }
                if ($k === 'ph' && ($v < 6.5 || $v > 8)) {
                    continue;
                }
                $out[$k][] = ['value' => $v, 'date' => $r['result_date']];
                break;
            }
        }
        return $out;
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    public static function band($score): ?string
    {
        if ($score === null) {
            return null;
        }
        foreach (IcuBoardService::BANDS as [$min, $k]) {
            if ((int) $score >= $min) {
                return $k;
            }
        }
        return 'low';
    }

    private function saved(PDO $db, int $stayId): array
    {
        $st = $db->prepare("SELECT * FROM icu_scores WHERE stay_id = :s ORDER BY kind, window_end");
        $st->execute(['s' => $stayId]);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    private function stay(PDO $db, int $id): ?array
    {
        $st = $db->prepare("SELECT * FROM icu_stays WHERE id = :id");
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function age(PDO $db, array $stay): ?int
    {
        $st = $db->prepare("SELECT patient_age FROM inpatient_admissions WHERE id = :a");
        $st->execute(['a' => $stay['admission_id']]);
        $v = $st->fetchColumn();
        return $v !== null && $v !== false ? (int) $v : null;
    }

    private function name(PDO $db, int $id): ?string
    {
        $st = $db->prepare("SELECT " . IcuService::nameSql(':id'));
        $st->execute(['id' => $id]);
        return $st->fetchColumn() ?: null;
    }

    private static function plus(string $dt, int $seconds): string
    {
        return gmdate('Y-m-d H:i:s', self::ts($dt) + $seconds);
    }

    private static function ts(string $dt): int
    {
        return (new \DateTimeImmutable(substr($dt, 0, 19), new \DateTimeZone('UTC')))->getTimestamp();
    }
}
