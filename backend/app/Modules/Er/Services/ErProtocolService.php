<?php

namespace App\Modules\Er\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use PDO;

/**
 * ER (module 12, Phase 3: time-critical protocols).
 *
 *   * Chest pain (possible heart attack), stroke and sepsis, each a timed checklist. Started at triage
 *     (suggested from the complaint and the vital signs; chest pain in the complaint starts it unless
 *     unticked) or later from the board.
 *   * The clock: chest pain and stroke count from arrival ("door to ECG", "door to needle"); sepsis from
 *     when it was recognised (triage, or when it was started later).
 *   * Each step: done (when it was really done -- it may have been charted later -- and a result where
 *     it matters, e.g. ECG: STEMI), or "not needed" where that is allowed. Some fill in by themselves:
 *     "seen by a doctor" from the board, blood glucose from triage.
 *   * runTimers() (with the waiting-time check, every minute): a step past its target -> an alert
 *     (er_protocol) to the patient's doctor (no doctor yet: the ER team's doctors, else all doctors) and
 *     the patient's nurse, once per step. It closes when the step is done or the protocol ends.
 */
class ErProtocolService
{
    public const ROLES = ['admin', 'nurse', 'charge_nurse', 'doctor', 'clinician'];

    /**
     * Step fields: label; target (minutes from the clock, or none); result (choose one, required);
     * number [min, max, unit, decimals] (required); input 'lkw' (last known well); na (label of the
     * "not needed" button); when [step, eq|gt, value] (only shown then); auto (doctor | glucose);
     * orders (words that find the matching lab / imaging order); hint.
     */
    public const PROTOCOLS = [
        'chest_pain' => [
            'label' => 'Chest pain', 'clock' => 'arrival',
            'about' => 'Possible heart attack: ECG within 10 minutes of arrival, troponin, aspirin. STEMI on the ECG: reperfusion within 90 minutes.',
            'steps' => [
                'ecg' => ['label' => '12-lead ECG done and shown to a doctor', 'target' => 10, 'result' => ['STEMI', 'No STEMI'], 'orders' => ['ecg', 'electrocardio', 'ekg']],
                'troponin' => ['label' => 'Troponin blood test sent', 'target' => 20, 'orders' => ['troponin']],
                'troponin_result' => ['label' => 'Troponin result seen by the doctor', 'target' => 60, 'result' => ['Normal', 'Raised'], 'orders' => ['troponin']],
                'aspirin' => ['label' => 'Aspirin given', 'na' => 'Not given (allergy, contraindicated, already taken)'],
                'reperfusion' => ['label' => 'Reperfusion started (cath lab or thrombolysis)', 'target' => 90, 'when' => ['ecg', 'eq', 'STEMI'],
                    'hint' => 'STEMI: door to balloon within 90 minutes (thrombolysis within 30 if there is no cath lab).'],
            ],
        ],
        'stroke' => [
            'label' => 'Stroke', 'clock' => 'arrival',
            'about' => 'Possible stroke: doctor within 10 minutes, CT head within 25, read within 45, thrombolysis decided within 60 — if within 4.5 hours of when the patient was last known well.',
            'steps' => [
                'lkw' => ['label' => 'Last known well — time recorded', 'input' => 'lkw'],
                'doctor' => ['label' => 'Seen by a doctor', 'target' => 10, 'auto' => 'doctor'],
                'glucose' => ['label' => 'Blood glucose checked', 'number' => [10, 1500, 'mg/dL', 0], 'auto' => 'glucose'],
                'nihss' => ['label' => 'NIH stroke scale (NIHSS) scored', 'number' => [0, 42, 'points', 0]],
                'ct' => ['label' => 'CT head done', 'target' => 25, 'orders' => ['ct ', 'ct-', 'head', 'brain', 'cranial']],
                'ct_read' => ['label' => 'CT read', 'target' => 45, 'result' => ['No bleed', 'Bleed']],
                'lysis' => ['label' => 'Thrombolysis given — or decided against', 'target' => 60, 'result' => ['Given', 'Not eligible'],
                    'hint' => 'Door to needle within 60 minutes.'],
            ],
        ],
        'sepsis' => [
            'label' => 'Sepsis', 'clock' => 'start',
            'about' => 'Possible sepsis — the hour-1 bundle: lactate, blood cultures before antibiotics, antibiotics, fluids for low BP or lactate 4 or more.',
            'steps' => [
                'lactate' => ['label' => 'Lactate measured', 'target' => 60, 'number' => [0, 30, 'mmol/L', 1], 'orders' => ['lactate', 'lactic']],
                'cultures' => ['label' => 'Blood cultures taken (before antibiotics)', 'target' => 60, 'orders' => ['culture']],
                'antibiotics' => ['label' => 'Broad-spectrum antibiotics given', 'target' => 60],
                'fluids' => ['label' => 'IV fluids 30 mL/kg started', 'target' => 60, 'na' => 'Not needed (BP normal, lactate under 4)'],
                'pressors' => ['label' => 'Vasopressors started (MAP under 65 after fluids)', 'na' => 'Not needed'],
                'repeat_lactate' => ['label' => 'Lactate re-measured', 'target' => 360, 'when' => ['lactate', 'gt', 2], 'number' => [0, 30, 'mmol/L', 1],
                    'hint' => 'The first lactate was over 2 mmol/L.'],
            ],
        ],
    ];

    /** Words in the complaint that suggest the protocol (sepsis also looks at the vital signs). */
    public const KEYWORDS = [
        'chest_pain' => ['chest pain', 'chest tightness', 'chest pressure', 'chest discomfort', 'chest heaviness', 'pain in the chest', 'pain in chest', 'angina', 'heart attack', 'stemi'],
        'stroke' => ['stroke', 'slurred', 'facial droop', 'face droop', 'drooping', 'one-sided weakness', 'one sided weakness', 'weakness on one side', 'hemiparesis', 'hemiplegia',
            'aphasia', "can't speak", 'cannot speak', 'unable to speak', 'cva', 'tia', 'sudden weakness', 'sudden numbness'],
        'sepsis' => ['sepsis', 'septic', 'infection', 'infected', 'fever', 'febrile', 'pneumonia', 'uti', 'urinary infection', 'cellulitis', 'abscess', 'chills', 'rigors'],
    ];

    private const OPEN_VISIT = ['waiting', 'triaged'];

    private static ?array $targetCache = null;

    public static function options(): array
    {
        $t = self::targets();
        $out = [];
        foreach (self::PROTOCOLS as $k => $p) {
            $steps = [];
            foreach ($p['steps'] as $sk => $s) {
                $steps[$sk] = ['label' => $s['label'], 'target' => $t[$k][$sk] ?? null, 'default_target' => $s['target'] ?? null];
            }
            $out[$k] = ['label' => $p['label'], 'about' => $p['about'], 'clock' => $p['clock'], 'keywords' => self::KEYWORDS[$k], 'steps' => $steps];
        }
        return $out;
    }

    /** [protocol => [step => minutes]] for the timed steps: the built-in targets with the admin's changes. */
    public static function targets(): array
    {
        if (self::$targetCache === null) {
            $t = [];
            foreach (self::PROTOCOLS as $k => $p) {
                foreach ($p['steps'] as $sk => $s) {
                    if (isset($s['target'])) {
                        $t[$k][$sk] = $s['target'];
                    }
                }
            }
            foreach (Database::connection()->query("SELECT protocol, step_key, minutes FROM er_protocol_targets")->fetchAll(PDO::FETCH_ASSOC) as $r) {
                if (isset($t[$r['protocol']][$r['step_key']])) {
                    $t[$r['protocol']][$r['step_key']] = (int) $r['minutes'];
                }
            }
            self::$targetCache = $t;
        }
        return self::$targetCache;
    }

    /**
     * Which protocols the complaint and vital signs point to: [protocol => why].
     * vs: temperature_c, heart_rate, resp_rate, bp_systolic, gcs (nulls allowed).
     */
    public static function suggest(string $complaint, array $vs): array
    {
        $c = ' ' . mb_strtolower($complaint) . ' ';
        $hit = function (string $k) use ($c): ?string {
            foreach (self::KEYWORDS[$k] as $w) {
                if (preg_match('/(?<![a-z])' . preg_quote($w, '/') . '(?![a-z])/u', $c)) {
                    return $w;
                }
            }
            return null;
        };
        $out = [];
        foreach (['chest_pain', 'stroke'] as $k) {
            if ($w = $hit($k)) {
                $out[$k] = "“{$w}” in the complaint";
            }
        }
        $t = $vs['temperature_c'] ?? null;
        $hr = $vs['heart_rate'] ?? null;
        $rr = $vs['resp_rate'] ?? null;
        $sbp = $vs['bp_systolic'] ?? null;
        $gcs = $vs['gcs'] ?? null;
        $word = $hit('sepsis');
        $infection = $word !== null || ($t !== null && ($t >= 38.3 || $t < 36));
        $sirs = (int) ($t !== null && ($t > 38 || $t < 36)) + (int) ($hr !== null && $hr > 90) + (int) ($rr !== null && $rr > 20);
        $qsofa = (int) ($rr !== null && $rr >= 22) + (int) ($sbp !== null && $sbp <= 100) + (int) ($gcs !== null && $gcs < 15);
        if ($infection && ($sirs >= 2 || $qsofa >= 2)) {
            $out['sepsis'] = ($word !== null ? "“{$word}”" : "temperature {$t}°") . ($qsofa >= 2 ? " and qSOFA {$qsofa}" : " and {$sirs} SIRS signs");
        }
        return $out;
    }

    // ------------------------------------------------------------------
    // Start, steps, stop
    // ------------------------------------------------------------------

    /** Start a protocol on an open ER visit. $via: triage (the clock for sepsis = $clockAt, the triage time) | board. */
    public function start(int $visitId, string $protocol, array $actor, string $via = 'board', ?string $triageAt = null): array
    {
        if (!in_array($actor['role'] ?? '', self::ROLES, true)) {
            return ['success' => false, 'message' => 'Protocols are started by the ER nurses and doctors.', 'forbidden' => true];
        }
        if (!isset(self::PROTOCOLS[$protocol])) {
            return ['success' => false, 'message' => 'Choose the protocol.', 'errors' => ['protocol' => 'Required.']];
        }
        $db = Database::connection();
        $st = $db->prepare("SELECT * FROM er_visits WHERE id = :id");
        $st->execute(['id' => $visitId]);
        $v = $st->fetch(PDO::FETCH_ASSOC);
        if (!$v) {
            return ['success' => false, 'message' => 'ER visit not found.', 'not_found' => true];
        }
        if (!in_array($v['status'], self::OPEN_VISIT, true)) {
            return ['success' => false, 'message' => 'This ER visit is closed.'];
        }
        $def = self::PROTOCOLS[$protocol];
        $dup = $db->prepare("SELECT id FROM er_protocols WHERE visit_id = :v AND protocol = :p AND status IN ('active', 'complete')");
        $dup->execute(['v' => $visitId, 'p' => $protocol]);
        if ($dup->fetchColumn()) {
            return ['success' => false, 'message' => "The {$def['label']} protocol is already running for this patient."];
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $clock = $def['clock'] === 'arrival' ? $v['arrived_at'] : ($via === 'triage' && $triageAt ? $triageAt : $now);
        $db->prepare(
            "INSERT INTO er_protocols (visit_id, protocol, status, clock_at, started_via, started_by, started_at) VALUES (:v, :p, 'active', :c, :via, :u, :now)"
        )->execute(['v' => $visitId, 'p' => $protocol, 'c' => $clock, 'via' => $via === 'triage' ? 'triage' : 'board', 'u' => (int) $actor['id'], 'now' => $now]);
        $id = (int) $db->lastInsertId();
        $ins = $db->prepare("INSERT IGNORE INTO er_protocol_steps (protocol_id, step_key) VALUES (:p, :k)");
        foreach (array_keys($def['steps']) as $k) {
            $ins->execute(['p' => $id, 'k' => $k]);
        }
        $this->sync($db, $v);
        return ['success' => true, 'message' => "{$def['label']} protocol started" . ($def['clock'] === 'arrival' ? ' — the clock runs from arrival (' . substr($v['arrived_at'], 11, 5) . ').' : '.'),
            'data' => (new ErService())->show($visitId)];
    }

    /**
     * Record a step. data: protocol_id, step, action (done | na | undo), value? (result / number /
     * last known well "YYYY-MM-DDTHH:MM" or "unknown"), time? (HH:MM when it was really done; blank = now).
     */
    public function step(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::ROLES, true)) {
            return ['success' => false, 'message' => 'Protocol steps are recorded by the ER nurses and doctors.', 'forbidden' => true];
        }
        $db = Database::connection();
        $p = $this->protocolRow($db, (int) ($data['protocol_id'] ?? 0));
        if (!$p) {
            return ['success' => false, 'message' => 'Protocol not found.', 'not_found' => true];
        }
        if ($p['status'] === 'stopped') {
            return ['success' => false, 'message' => 'This protocol was stopped.'];
        }
        $def = self::PROTOCOLS[$p['protocol']] ?? null;
        $key = (string) ($data['step'] ?? '');
        $s = $def['steps'][$key] ?? null;
        if (!$s) {
            return ['success' => false, 'message' => 'Step not found.', 'errors' => ['step' => 'Required.']];
        }
        $db->prepare("INSERT IGNORE INTO er_protocol_steps (protocol_id, step_key) VALUES (:p, :k)")->execute(['p' => $p['id'], 'k' => $key]);
        $action = (string) ($data['action'] ?? '');
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        if ($action === 'undo') {
            $db->prepare("UPDATE er_protocol_steps SET status = 'pending', value = NULL, done_at = NULL, recorded_by = :u, recorded_at = :now WHERE protocol_id = :p AND step_key = :k")
                ->execute(['u' => (int) $actor['id'], 'now' => $now, 'p' => $p['id'], 'k' => $key]);
            $this->settle($db, (int) $p['id']);
            return ['success' => true, 'message' => "Undone: {$s['label']}.", 'data' => (new ErService())->show((int) $p['visit_id'])];
        }
        if (!in_array($action, ['done', 'na'], true)) {
            return ['success' => false, 'message' => 'Done, or not needed?', 'errors' => ['action' => 'Required.']];
        }
        if ($action === 'na' && empty($s['na'])) {
            return ['success' => false, 'message' => 'This step can\'t be skipped. If the protocol doesn\'t apply, stop it.'];
        }
        $value = null;
        $raw = trim((string) ($data['value'] ?? ''));
        if ($action === 'done') {
            if (isset($s['result'])) {
                if (!in_array($raw, $s['result'], true)) {
                    return ['success' => false, 'message' => 'Choose the result: ' . implode(' or ', $s['result']) . '.', 'errors' => ['value' => 'Required.']];
                }
                $value = $raw;
            } elseif (isset($s['number'])) {
                [$min, $max, $unit, $dec] = $s['number'];
                if ($raw === '' || !is_numeric($raw) || (float) $raw < $min || (float) $raw > $max || ($dec === 0 && floor((float) $raw) != (float) $raw)) {
                    return ['success' => false, 'message' => "Enter the value ({$min}–{$max} {$unit}).", 'errors' => ['value' => 'Required.']];
                }
                $value = $dec === 0 ? (string) (int) $raw : (string) round((float) $raw, $dec);
            } elseif (($s['input'] ?? '') === 'lkw') {
                if (strtolower($raw) === 'unknown') {
                    $value = 'Unknown';
                } else {
                    $lkw = str_replace('T', ' ', $raw);
                    if (!preg_match('/^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):[0-5]\d$/', $lkw) || date('Y-m-d H:i', strtotime($lkw)) !== $lkw) {
                        return ['success' => false, 'message' => 'When was the patient last known well? (date and time, or "unknown")', 'errors' => ['value' => 'Required.']];
                    }
                    if ($lkw . ':00' > $now) {
                        return ['success' => false, 'message' => 'Last known well can\'t be in the future.', 'errors' => ['value' => 'Future.']];
                    }
                    if (strtotime($now) - strtotime($lkw) > 7 * 86400) {
                        return ['success' => false, 'message' => 'More than a week ago: record it as unknown and note it.', 'errors' => ['value' => 'Too old.']];
                    }
                    $value = $lkw;
                }
            }
        }
        $doneAt = $now;
        $t = trim((string) ($data['time'] ?? ''));
        if ($t !== '' && ($s['input'] ?? '') !== 'lkw') {
            if (!preg_match('/^([01]\d|2[0-3]):([0-5]\d)$/', $t)) {
                return ['success' => false, 'message' => 'Time as HH:MM.', 'errors' => ['time' => 'HH:MM.']];
            }
            $c = substr($now, 0, 10) . " {$t}:00";
            if ($c > $now) {
                $c = (new \DateTimeImmutable(substr($now, 0, 10), new \DateTimeZone('UTC')))->modify('-1 day')->format('Y-m-d') . " {$t}:00";
            }
            // An ECG may come in with the ambulance: up to an hour before arrival.
            $earliest = (new \DateTimeImmutable($p['arrived_at'], new \DateTimeZone('UTC')))->modify('-60 minutes')->format('Y-m-d H:i:s');
            if ($c < $earliest) {
                return ['success' => false, 'message' => 'That time is before the patient arrived (' . substr($p['arrived_at'], 11, 5) . ').', 'errors' => ['time' => 'Too early.']];
            }
            $doneAt = $c;
        }
        $db->prepare(
            "UPDATE er_protocol_steps SET status = :s, value = :v, done_at = :d, recorded_by = :u, recorded_at = :now WHERE protocol_id = :p AND step_key = :k"
        )->execute(['s' => $action, 'v' => $value, 'd' => $doneAt, 'u' => (int) $actor['id'], 'now' => $now, 'p' => $p['id'], 'k' => $key]);
        $this->settle($db, (int) $p['id']);
        $msg = $action === 'na' ? "Not needed: {$s['label']}." : "Done: {$s['label']}" . ($value !== null ? " — {$value}" : '') . ' at ' . substr($doneAt, 11, 5) . '.';
        if ($p['protocol'] === 'chest_pain' && $key === 'ecg' && $value === 'STEMI') {
            $msg .= ' STEMI: start reperfusion (door to balloon 90 min).';
        }
        return ['success' => true, 'message' => $msg, 'data' => (new ErService())->show((int) $p['visit_id'])];
    }

    /** data: protocol_id, reason (e.g. ruled out) */
    public function stop(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::ROLES, true)) {
            return ['success' => false, 'message' => 'Protocols are stopped by the ER nurses and doctors.', 'forbidden' => true];
        }
        $db = Database::connection();
        $p = $this->protocolRow($db, (int) ($data['protocol_id'] ?? 0));
        if (!$p) {
            return ['success' => false, 'message' => 'Protocol not found.', 'not_found' => true];
        }
        if ($p['status'] === 'stopped') {
            return ['success' => false, 'message' => 'This protocol was already stopped.'];
        }
        $reason = trim((string) ($data['reason'] ?? ''));
        if ($reason === '') {
            return ['success' => false, 'message' => 'Why stop it? (e.g. ruled out, other diagnosis)', 'errors' => ['reason' => 'Required.']];
        }
        $db->prepare("UPDATE er_protocols SET status = 'stopped', stopped_at = NOW(), stopped_by = :u, stop_reason = :r WHERE id = :id")
            ->execute(['u' => (int) $actor['id'], 'r' => mb_substr($reason, 0, 255), 'id' => $p['id']]);
        $this->closeAlerts($db, (int) $p['id']);
        return ['success' => true, 'message' => self::PROTOCOLS[$p['protocol']]['label'] . ' protocol stopped.', 'data' => (new ErService())->show((int) $p['visit_id'])];
    }

    /** Admin: data.targets {protocol: {step: minutes}} for the timed steps. */
    public function saveTargets(array $data, array $actor): array
    {
        $errors = [];
        $vals = [];
        foreach (self::targets() as $k => $steps) {
            foreach ($steps as $sk => $cur) {
                $raw = $data['targets'][$k][$sk] ?? null;
                if ($raw === null) {
                    continue;
                }
                if ($raw === '' || !ctype_digit((string) $raw) || (int) $raw < 1 || (int) $raw > 1440) {
                    $errors["targets.{$k}.{$sk}"] = self::PROTOCOLS[$k]['label'] . ' — ' . self::PROTOCOLS[$k]['steps'][$sk]['label'] . ': minutes (1–1440).';
                    continue;
                }
                $vals[] = [$k, $sk, (int) $raw];
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $st = Database::connection()->prepare(
            "INSERT INTO er_protocol_targets (protocol, step_key, minutes, updated_by, updated_at) VALUES (:p, :k, :m, :u, NOW())
             ON DUPLICATE KEY UPDATE minutes = VALUES(minutes), updated_by = VALUES(updated_by), updated_at = NOW()"
        );
        foreach ($vals as [$k, $sk, $m]) {
            $st->execute(['p' => $k, 'k' => $sk, 'm' => $m, 'u' => (int) $actor['id']]);
        }
        self::$targetCache = null;
        return ['success' => true, 'message' => 'Protocol targets saved.', 'data' => (new ErBoardService())->settings()];
    }

    // ------------------------------------------------------------------
    // Reading
    // ------------------------------------------------------------------

    /** The visit's protocols (running first), each with its checklist. $v: the er_visits row. */
    public function forVisit(array $v): array
    {
        $db = Database::connection();
        $st = $db->prepare(
            "SELECT p.*, TIMESTAMPDIFF(MINUTE, p.clock_at, NOW()) AS elapsed, " . ErBoardService::nameSql('p.started_by') . " AS started_by_name,
                    " . ErBoardService::nameSql('p.stopped_by') . " AS stopped_by_name
             FROM er_protocols p WHERE p.visit_id = :v ORDER BY p.status = 'stopped', p.started_at"
        );
        $st->execute(['v' => $v['id']]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
        if (!$rows) {
            return [];
        }
        if (in_array($v['status'], self::OPEN_VISIT, true) && array_filter($rows, fn($r) => $r['status'] === 'active')) {
            $this->sync($db, $v);
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $orders = $this->orders($db, $v);
        $out = [];
        foreach ($rows as $p) {
            $out[] = $this->shape($db, $p, $orders, $now, in_array($v['status'], self::OPEN_VISIT, true));
        }
        return $out;
    }

    private function shape(PDO $db, array $p, array $orders, string $now, bool $open): array
    {
        $def = self::PROTOCOLS[$p['protocol']];
        $targets = self::targets()[$p['protocol']] ?? [];
        $st = $db->prepare(
            "SELECT s.*, TIMESTAMPDIFF(MINUTE, :c, s.done_at) AS minutes, " . ErBoardService::nameSql('s.recorded_by') . " AS recorded_by_name
             FROM er_protocol_steps s WHERE s.protocol_id = :p"
        );
        $st->execute(['c' => $p['clock_at'], 'p' => $p['id']]);
        $rows = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $rows[$r['step_key']] = $r;
        }
        $elapsed = (int) $p['elapsed'];
        $running = $p['status'] === 'active' && $open;
        $steps = [];
        $late = 0;
        $next = null;
        foreach ($def['steps'] as $k => $s) {
            $r = $rows[$k] ?? ['status' => 'pending', 'value' => null, 'done_at' => null, 'minutes' => null, 'recorded_by' => null, 'recorded_by_name' => null, 'alert_at' => null];
            if (!self::visible($s, $rows)) {
                continue;
            }
            $target = $targets[$k] ?? null;
            $pending = $r['status'] === 'pending';
            $isLate = $pending && $running && $target !== null && $elapsed >= $target;
            $late += (int) $isLate;
            $step = [
                'key' => $k, 'label' => $s['label'], 'hint' => $s['hint'] ?? null, 'target' => $target,
                'due_at' => $target !== null ? self::plus($p['clock_at'], $target) : null,
                'status' => $r['status'], 'value' => $r['value'], 'done_at' => $r['done_at'],
                'minutes' => $r['done_at'] !== null ? max(0, (int) $r['minutes']) : null,
                'remaining' => $pending && $target !== null ? $target - $elapsed : null,
                'late' => $isLate, 'done_late' => !$pending && $r['status'] === 'done' && $target !== null && (int) $r['minutes'] > $target,
                'auto' => !$pending && $r['recorded_by'] === null, 'recorded_by_name' => $r['recorded_by'] ? $r['recorded_by_name'] : null,
                'result' => $s['result'] ?? null, 'number' => isset($s['number']) ? ['min' => $s['number'][0], 'max' => $s['number'][1], 'unit' => $s['number'][2], 'decimals' => $s['number'][3]] : null,
                'input' => $s['input'] ?? null, 'na' => $s['na'] ?? null, 'alerted' => $r['alert_at'] !== null,
                'orders' => isset($s['orders']) ? self::matchOrders($orders, $s['orders']) : [],
            ];
            if (($s['input'] ?? '') === 'lkw' && $r['status'] === 'done' && $r['value'] !== 'Unknown' && $r['value'] !== null) {
                // Thrombolysis is usually given within 4.5 hours of last known well.
                $end = self::plus($r['value'] . ':00', 270);
                $step['window_end'] = $end;
                $step['window_left'] = self::diff($now, $end);
            }
            if ($running && $pending && $target !== null && ($next === null || $target < $next['target'])) {
                $next = ['key' => $k, 'label' => $s['label'], 'target' => $target, 'remaining' => $target - $elapsed];
            }
            $steps[] = $step;
        }
        return [
            'id' => (int) $p['id'], 'protocol' => $p['protocol'], 'label' => $def['label'], 'about' => $def['about'], 'status' => $p['status'],
            'clock' => $def['clock'], 'clock_at' => $p['clock_at'], 'elapsed' => $elapsed, 'started_at' => $p['started_at'], 'started_via' => $p['started_via'],
            'started_by_name' => $p['started_by_name'], 'completed_at' => $p['completed_at'],
            'stopped_at' => $p['stopped_at'], 'stopped_by_name' => $p['stopped_at'] ? $p['stopped_by_name'] : null, 'stop_reason' => $p['stop_reason'],
            'steps' => $steps, 'late' => $late, 'next' => $next,
            'done' => count(array_filter($steps, fn($s) => $s['status'] !== 'pending')), 'total' => count($steps),
        ];
    }

    // ------------------------------------------------------------------
    // Timers and alerts
    // ------------------------------------------------------------------

    /** Steps past their target -> an alert (once per step). Runs with the waiting-time check. Returns the alerts sent. */
    public function runTimers(): array
    {
        $db = Database::connection();
        $rows = $db->query(
            "SELECT p.id, p.protocol, p.clock_at, TIMESTAMPDIFF(MINUTE, p.clock_at, NOW()) AS elapsed, v.id AS visit_id, v.visit_no, v.patient_id, v.status AS visit_status,
                    v.arrived_at, v.doctor_at, v.doctor_user_id, v.nurse_user_id, p2.first_name, p2.last_name, b.name AS bed_name
             FROM er_protocols p JOIN er_visits v ON v.id = p.visit_id JOIN patients p2 ON p2.id = v.patient_id LEFT JOIN er_beds b ON b.id = v.er_bed_id
             WHERE p.status = 'active' AND v.status IN ('waiting', 'triaged')"
        )->fetchAll(PDO::FETCH_ASSOC);
        $sent = [];
        $synced = [];
        $teamDoctors = null;
        foreach ($rows as $p) {
            if (!isset($synced[$p['visit_id']])) {
                $this->sync($db, ['id' => $p['visit_id'], 'doctor_at' => $p['doctor_at'], 'status' => $p['visit_status']]);
                $synced[$p['visit_id']] = true;
            }
            $def = self::PROTOCOLS[$p['protocol']] ?? null;
            if (!$def) {
                continue;
            }
            $st = $db->prepare("SELECT * FROM er_protocol_steps WHERE protocol_id = :p");
            $st->execute(['p' => $p['id']]);
            $steps = [];
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $steps[$r['step_key']] = $r;
            }
            $targets = self::targets()[$p['protocol']] ?? [];
            foreach ($def['steps'] as $k => $s) {
                $r = $steps[$k] ?? null;
                $target = $targets[$k] ?? null;
                if (!$r || $r['status'] !== 'pending' || $r['alert_at'] !== null || $target === null || (int) $p['elapsed'] < $target || !self::visible($s, $steps)) {
                    continue;
                }
                $teamDoctors ??= array_map('intval', $db->query(
                    "SELECT s.user_id FROM er_staff s JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL JOIN roles r ON r.id = u.role_id WHERE r.name IN ('doctor', 'clinician')"
                )->fetchAll(PDO::FETCH_COLUMN));
                $targetsTo = $p['doctor_user_id'] ? [['user' => (int) $p['doctor_user_id']]]
                    : ($teamDoctors ? array_map(fn($u) => ['user' => $u], $teamDoctors) : [['role' => 'doctor']]);
                if ($p['nurse_user_id']) {
                    $targetsTo[] = ['user' => (int) $p['nurse_user_id']];
                }
                $who = trim("{$p['first_name']} {$p['last_name']}");
                $where = $p['bed_name'] ? " ({$p['bed_name']})" : ' (waiting room)';
                $from = $def['clock'] === 'arrival' ? 'arrival at ' . substr($p['arrived_at'], 11, 5) : 'the start at ' . substr($p['clock_at'], 11, 5);
                $res = AlertService::raise([
                    'type' => 'er_protocol', 'urgency' => 'urgent',
                    'title' => "{$def['label']} protocol: {$s['label']} — late ({$p['elapsed']} min, target {$target}) — {$who}{$where}",
                    'body' => "{$p['visit_no']}. Target: within {$target} min of {$from}." . (!empty($s['hint']) ? " {$s['hint']}" : '') . ' Record it on the ER board when done.',
                    'patient_id' => (int) $p['patient_id'], 'link' => ['tab' => 'er'], 'targets' => $targetsTo,
                    'source_type' => 'er_protocols', 'source_id' => (int) $p['id'], 'dedupe_key' => "erproto:{$p['id']}:{$k}",
                ]);
                $db->prepare("UPDATE er_protocol_steps SET alert_at = NOW() WHERE id = :id")->execute(['id' => $r['id']]);
                $sent[] = ['visit' => $p['visit_no'], 'stage' => "{$p['protocol']}:{$k}", 'ok' => !empty($res['success'])];
            }
        }
        // Alerts whose step is done / not needed, or whose protocol or visit has ended: closed.
        foreach ($db->query("SELECT DISTINCT source_id FROM alerts WHERE alert_type = 'er_protocol' AND resolved_at IS NULL")->fetchAll(PDO::FETCH_COLUMN) as $id) {
            $this->closeAlerts($db, (int) $id);
        }
        return $sent;
    }

    /** Close a protocol's "late" alerts that no longer apply (acknowledged or not). */
    public function closeAlerts(PDO $db, int $protocolId): void
    {
        $p = $this->protocolRow($db, $protocolId);
        $resolve = $db->prepare("UPDATE alerts SET resolved_at = NOW(), resolve_note = :n WHERE dedupe_key = :k AND resolved_at IS NULL");
        $ended = !$p || $p['status'] !== 'active' || !in_array($p['visit_status'], self::OPEN_VISIT, true);
        $st = $db->prepare("SELECT * FROM er_protocol_steps WHERE protocol_id = :p");
        $st->execute(['p' => $protocolId]);
        $rows = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $rows[$r['step_key']] = $r;
        }
        $defs = $p ? (self::PROTOCOLS[$p['protocol']]['steps'] ?? []) : [];
        foreach ($rows as $k => $s) {
            // A step that no longer applies (e.g. the ECG result changed from STEMI) is closed too.
            $hidden = isset($defs[$k]) && !self::visible($defs[$k], $rows);
            if ($ended || $s['status'] !== 'pending' || $hidden) {
                $resolve->execute(['k' => "erproto:{$protocolId}:{$k}",
                    'n' => $ended ? ($p && $p['status'] === 'stopped' ? 'Protocol stopped' : ($p && $p['status'] === 'complete' ? 'Protocol complete' : 'ER visit closed'))
                        : ($s['status'] === 'done' ? 'Done' : ($s['status'] === 'na' ? 'Not needed' : 'No longer needed'))]);
            }
        }
    }

    /** Close every protocol alert of a visit (the visit closed). */
    public function closeVisitAlerts(PDO $db, int $visitId): void
    {
        $st = $db->prepare("SELECT id FROM er_protocols WHERE visit_id = :v");
        $st->execute(['v' => $visitId]);
        foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $id) {
            $this->closeAlerts($db, (int) $id);
        }
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** Steps that fill in by themselves: "seen by a doctor" (the board), blood glucose (triage). $v needs id, doctor_at. */
    private function sync(PDO $db, array $v): void
    {
        $st = $db->prepare(
            "SELECT s.id, s.step_key, p.protocol, p.id AS protocol_id FROM er_protocol_steps s JOIN er_protocols p ON p.id = s.protocol_id
             WHERE p.visit_id = :v AND p.status = 'active' AND s.status = 'pending'"
        );
        $st->execute(['v' => $v['id']]);
        $glucose = null;
        $touched = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $s) {
            $auto = self::PROTOCOLS[$s['protocol']]['steps'][$s['step_key']]['auto'] ?? null;
            $set = null;
            if ($auto === 'doctor' && !empty($v['doctor_at'])) {
                $set = [$v['doctor_at'], null];
            } elseif ($auto === 'glucose') {
                if ($glucose === null) {
                    $g = $db->prepare("SELECT blood_glucose, triaged_at FROM er_triage WHERE visit_id = :v AND blood_glucose IS NOT NULL ORDER BY triaged_at, id LIMIT 1");
                    $g->execute(['v' => $v['id']]);
                    $glucose = $g->fetch(PDO::FETCH_ASSOC) ?: false;
                }
                if ($glucose) {
                    $set = [$glucose['triaged_at'], (string) (int) $glucose['blood_glucose']];
                }
            }
            if ($set) {
                $db->prepare("UPDATE er_protocol_steps SET status = 'done', done_at = :d, value = :val, recorded_by = NULL, recorded_at = NOW() WHERE id = :id AND status = 'pending'")
                    ->execute(['d' => $set[0], 'val' => $set[1], 'id' => $s['id']]);
                $touched[$s['protocol_id']] = true;
            }
        }
        foreach (array_keys($touched) as $pid) {
            $this->settle($db, (int) $pid);
        }
    }

    /** After a step changes: complete when nothing shown is pending (back to running if something is again); close its alerts. */
    private function settle(PDO $db, int $protocolId): void
    {
        $p = $this->protocolRow($db, $protocolId);
        if (!$p || $p['status'] === 'stopped') {
            return;
        }
        $st = $db->prepare("SELECT * FROM er_protocol_steps WHERE protocol_id = :p");
        $st->execute(['p' => $protocolId]);
        $rows = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $rows[$r['step_key']] = $r;
        }
        $pending = false;
        foreach (self::PROTOCOLS[$p['protocol']]['steps'] as $k => $s) {
            if (self::visible($s, $rows) && ($rows[$k]['status'] ?? 'pending') === 'pending') {
                $pending = true;
            }
        }
        if (!$pending && $p['status'] === 'active') {
            $db->prepare("UPDATE er_protocols SET status = 'complete', completed_at = NOW() WHERE id = :id")->execute(['id' => $protocolId]);
        } elseif ($pending && $p['status'] === 'complete') {
            $db->prepare("UPDATE er_protocols SET status = 'active', completed_at = NULL WHERE id = :id")->execute(['id' => $protocolId]);
        }
        $this->closeAlerts($db, $protocolId);
    }

    /** A step with "when" shows only once the step it depends on has that result. $rows: step_key => row. */
    private static function visible(array $s, array $rows): bool
    {
        if (empty($s['when'])) {
            return true;
        }
        [$dep, $op, $val] = $s['when'];
        $r = $rows[$dep] ?? null;
        if (!$r || $r['status'] !== 'done' || $r['value'] === null) {
            return false;
        }
        return $op === 'gt' ? is_numeric($r['value']) && (float) $r['value'] > $val : $r['value'] === $val;
    }

    /** The patient's labs and imaging ordered since the day of arrival: [name, status]. */
    private function orders(PDO $db, array $v): array
    {
        $st = $db->prepare(
            "SELECT COALESCE(c.name, '') AS name, COALESCE(pc.name, '') AS parent, o.status FROM patient_procedure_orders o
             LEFT JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id LEFT JOIN procedure_order_configs pc ON pc.id = c.parent_id
             WHERE o.patient_id = :p AND o.deleted_at IS NULL AND o.order_date >= DATE(:a) ORDER BY o.id"
        );
        $st->execute(['p' => $v['patient_id'] ?? 0, 'a' => $v['arrived_at'] ?? date('Y-m-d')]);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    private static function matchOrders(array $orders, array $words): array
    {
        $out = [];
        foreach ($orders as $o) {
            $hay = ' ' . mb_strtolower($o['name'] . ' ' . $o['parent']) . ' ';
            foreach ($words as $w) {
                if (str_contains($hay, $w)) {
                    $out[] = ['name' => $o['name'] ?: $o['parent'], 'status' => $o['status']];
                    break;
                }
            }
        }
        return $out;
    }

    private function protocolRow(PDO $db, int $id): ?array
    {
        $st = $db->prepare("SELECT p.*, v.status AS visit_status, v.arrived_at, v.patient_id FROM er_protocols p JOIN er_visits v ON v.id = p.visit_id WHERE p.id = :id");
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /** Minutes from one DB time to another, as wall-clock time. */
    private static function diff(string $from, string $to): int
    {
        $utc = new \DateTimeZone('UTC');
        return (int) round(((new \DateTimeImmutable($to, $utc))->getTimestamp() - (new \DateTimeImmutable($from, $utc))->getTimestamp()) / 60);
    }

    /** A DB time + minutes, as wall-clock time (no daylight-saving shifts). */
    private static function plus(string $dt, int $minutes): string
    {
        return (new \DateTimeImmutable($dt, new \DateTimeZone('UTC')))->modify("+{$minutes} minutes")->format('Y-m-d H:i:s');
    }
}
