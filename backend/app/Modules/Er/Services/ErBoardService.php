<?php

namespace App\Modules\Er\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use PDO;

/**
 * ER (module 12, Phase 2: the tracking board).
 *
 *   * ER beds (admin): resuscitation, acute, fast track, observation bays.
 *   * assign() -- a patient's bed (or back to the waiting room), doctor and nurse. The first doctor
 *     assigned means the patient was seen: the wait ends there.
 *   * wait() -- per visit: the stage (triage: arrival -> triage; doctor: arrival -> seen), minutes so
 *     far (or until seen), the target for that acuity, and whether it is over.
 *   * orders() -- labs and imaging ordered since arrival: pending / done.
 *   * runWaits() -- past the target: an alert (er_wait) to the ER team (er_staff; nobody on the team:
 *     charge nurses, and doctors once triaged) and the patient's nurse. Once per stage; again only when
 *     re-triage makes it more urgent. The alert closes when the patient is triaged / seen / leaves.
 *   * tv() -- the ER tracking board TV: beds and the waiting room, initials only.
 */
class ErBoardService
{
    public const AREAS = ['resus' => 'Resuscitation', 'acute' => 'Acute', 'fast_track' => 'Fast track', 'observation' => 'Observation', 'other' => 'Other'];
    public const ASSIGN_ROLES = ['admin', 'nurse', 'charge_nurse', 'doctor', 'clinician'];
    private const DOCTOR_ROLES = ['doctor', 'clinician'];
    private const NURSE_ROLES = ['nurse', 'charge_nurse'];
    private const JOB_SECONDS = 60;

    private static ?array $targetCache = null;

    // ------------------------------------------------------------------
    // Waiting times
    // ------------------------------------------------------------------

    /** [acuity => minutes], acuity 0 = arrival to triage. */
    public static function targets(): array
    {
        if (self::$targetCache === null) {
            $t = [0 => 10, 1 => 0, 2 => 10, 3 => 30, 4 => 60, 5 => 120];
            foreach (Database::connection()->query("SELECT acuity, minutes FROM er_wait_targets")->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $t[(int) $r['acuity']] = (int) $r['minutes'];
            }
            self::$targetCache = $t;
        }
        return self::$targetCache;
    }

    /**
     * The wait of a visit row (needs status, acuity, minutes_to_doctor, minutes_since_arrival, doctor_at):
     * stage triage | doctor | seen | closed, minutes, target, over.
     */
    public static function wait(array $v): array
    {
        $t = self::targets();
        $since = (int) $v['minutes_since_arrival'];
        if (!in_array($v['status'], ['waiting', 'triaged'], true)) {
            return ['stage' => 'closed', 'minutes' => $since, 'target' => null, 'over' => false];
        }
        if ($v['status'] === 'waiting') {
            return ['stage' => 'triage', 'minutes' => $since, 'target' => $t[0], 'over' => $since >= $t[0]];
        }
        $target = $t[(int) $v['acuity']] ?? null;
        if ($v['doctor_at'] !== null) {
            $m = (int) $v['minutes_to_doctor'];
            return ['stage' => 'seen', 'minutes' => $m, 'target' => $target, 'over' => $target !== null && $m > $target];
        }
        return ['stage' => 'doctor', 'minutes' => $since, 'target' => $target, 'over' => $target !== null && $since >= $target];
    }

    public function saveTargets(array $data, array $actor): array
    {
        $errors = [];
        $vals = [];
        foreach (range(0, 5) as $a) {
            $raw = $data['targets'][$a] ?? ($data['targets'][(string) $a] ?? null);
            if ($raw === null || $raw === '' || !ctype_digit((string) $raw) || (int) $raw > 1440) {
                $errors["targets.{$a}"] = ($a === 0 ? 'Triage' : "Level {$a}") . ': minutes (0–1440).';
                continue;
            }
            $vals[$a] = (int) $raw;
        }
        if (!$errors) {
            for ($a = 2; $a <= 5; $a++) {
                if ($vals[$a] < $vals[$a - 1]) {
                    $errors["targets.{$a}"] = "Level {$a} can't be shorter than level " . ($a - 1) . '.';
                }
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $st = Database::connection()->prepare(
            "INSERT INTO er_wait_targets (acuity, minutes, updated_by, updated_at) VALUES (:a, :m, :u, NOW())
             ON DUPLICATE KEY UPDATE minutes = VALUES(minutes), updated_by = VALUES(updated_by), updated_at = NOW()"
        );
        foreach ($vals as $a => $m) {
            $st->execute(['a' => $a, 'm' => $m, 'u' => (int) $actor['id']]);
        }
        self::$targetCache = null;
        return ['success' => true, 'message' => 'Waiting-time targets saved.', 'data' => $this->settings()];
    }

    // ------------------------------------------------------------------
    // Bed, doctor, nurse
    // ------------------------------------------------------------------

    /** data: id, and any of: er_bed_id ('' = waiting room), doctor_user_id ('' = none), nurse_user_id ('' = none), me (doctor | nurse: assign myself) */
    public function assign(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::ASSIGN_ROLES, true)) {
            return ['success' => false, 'message' => 'Beds, doctors and nurses are assigned by the ER nurses and doctors.', 'forbidden' => true];
        }
        $db = Database::connection();
        $st = $db->prepare("SELECT * FROM er_visits WHERE id = :id");
        $st->execute(['id' => (int) ($data['id'] ?? 0)]);
        $v = $st->fetch(PDO::FETCH_ASSOC);
        if (!$v) {
            return ['success' => false, 'message' => 'ER visit not found.', 'not_found' => true];
        }
        if (!in_array($v['status'], ['waiting', 'triaged'], true)) {
            return ['success' => false, 'message' => 'This ER visit is closed.'];
        }
        $me = (string) ($data['me'] ?? '');
        if ($me === 'doctor') {
            if (!in_array($actor['role'], self::DOCTOR_ROLES, true)) {
                return ['success' => false, 'message' => 'Only a doctor can take the patient as their doctor.', 'forbidden' => true];
            }
            $data['doctor_user_id'] = (int) $actor['id'];
        } elseif ($me === 'nurse') {
            if (!in_array($actor['role'], self::NURSE_ROLES, true)) {
                return ['success' => false, 'message' => 'Only a nurse can take the patient as their nurse.', 'forbidden' => true];
            }
            $data['nurse_user_id'] = (int) $actor['id'];
        }
        $set = [];
        $params = ['id' => $v['id']];
        $errors = [];
        $msgs = [];
        if (array_key_exists('er_bed_id', $data)) {
            $bed = (int) $data['er_bed_id'] ?: null;
            if ($bed) {
                $b = $db->prepare("SELECT name, is_active FROM er_beds WHERE id = :id");
                $b->execute(['id' => $bed]);
                $row = $b->fetch(PDO::FETCH_ASSOC);
                if (!$row || !(int) $row['is_active']) {
                    $errors['er_bed_id'] = 'Bed not found.';
                } else {
                    $busy = $db->prepare("SELECT visit_no FROM er_visits WHERE er_bed_id = :b AND status IN ('waiting', 'triaged') AND id <> :v LIMIT 1");
                    $busy->execute(['b' => $bed, 'v' => $v['id']]);
                    if ($o = $busy->fetchColumn()) {
                        $errors['er_bed_id'] = "{$row['name']} is taken ({$o}).";
                    } else {
                        $msgs[] = "Bed: {$row['name']}";
                    }
                }
            } else {
                $msgs[] = 'Back to the waiting room';
            }
            if ((int) $v['er_bed_id'] !== (int) $bed) {
                $set[] = 'er_bed_id = :bed, bed_at = ' . ($bed ? 'NOW()' : 'NULL');
                $params['bed'] = $bed;
            }
        }
        foreach (['doctor_user_id' => [self::DOCTOR_ROLES, 'doctor'], 'nurse_user_id' => [self::NURSE_ROLES, 'nurse']] as $f => [$roles, $word]) {
            if (!array_key_exists($f, $data)) {
                continue;
            }
            $uid = (int) $data[$f] ?: null;
            if ($uid) {
                $u = $db->prepare("SELECT r.name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = :id AND u.deleted_at IS NULL");
                $u->execute(['id' => $uid]);
                if (!in_array($u->fetchColumn(), $roles, true)) {
                    $errors[$f] = "Choose a {$word}.";
                    continue;
                }
            }
            $set[] = "{$f} = :{$f}";
            $params[$f] = $uid;
            $msgs[] = ucfirst($word) . ': ' . ($uid ? $this->name($db, $uid) : 'none');
            if ($f === 'doctor_user_id' && $uid && $v['doctor_at'] === null) {
                $set[] = 'doctor_at = NOW()';   // seen: the wait ends
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        if ($set) {
            $db->prepare("UPDATE er_visits SET " . implode(', ', $set) . " WHERE id = :id")->execute($params);
        }
        $this->closeAlerts($db, (int) $v['id']);
        return ['success' => true, 'message' => $msgs ? implode(' · ', $msgs) . '.' : 'No change.', 'data' => (new ErService())->show((int) $v['id'])];
    }

    // ------------------------------------------------------------------
    // Labs and imaging
    // ------------------------------------------------------------------

    /** visit id => [lab_pending, lab_done, imaging_pending, imaging_done], for orders since the day of arrival. */
    public function orders(array $visitIds): array
    {
        if (!$visitIds) {
            return [];
        }
        $in = implode(',', array_map('intval', $visitIds));
        $rows = Database::connection()->query(
            "SELECT v.id AS visit_id,
                    CASE WHEN COALESCE(c.order_test_type, pc.order_test_type) = 'Imaging' OR COALESCE(c.order_from, pc.order_from) = 'Radiology Department'
                         THEN 'imaging' ELSE 'lab' END AS kind,
                    SUM(o.status IN ('pending', 'collected')) AS pending, SUM(o.status IN ('resulted', 'reviewed')) AS done
             FROM er_visits v JOIN patient_procedure_orders o ON o.patient_id = v.patient_id AND o.deleted_at IS NULL AND o.order_date >= DATE(v.arrived_at)
             LEFT JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id LEFT JOIN procedure_order_configs pc ON pc.id = c.parent_id
             WHERE v.id IN ({$in}) GROUP BY v.id, kind"
        )->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r['visit_id']] ??= ['lab_pending' => 0, 'lab_done' => 0, 'imaging_pending' => 0, 'imaging_done' => 0];
            $out[(int) $r['visit_id']][$r['kind'] . '_pending'] = (int) $r['pending'];
            $out[(int) $r['visit_id']][$r['kind'] . '_done'] = (int) $r['done'];
        }
        return $out;
    }

    // ------------------------------------------------------------------
    // Waiting-time alerts
    // ------------------------------------------------------------------

    /** Throttled to once a minute unless $force (the cron script). Returns the alerts sent. */
    public function runWaits(bool $force = false): array
    {
        $db = Database::connection();
        if (!$force) {
            $db->exec("INSERT IGNORE INTO alert_job_runs (job, last_run_at) VALUES ('er_wait', '2000-01-01 00:00:00')");
            $c = $db->prepare("UPDATE alert_job_runs SET last_run_at = NOW() WHERE job = 'er_wait' AND last_run_at <= NOW() - INTERVAL " . self::JOB_SECONDS . " SECOND");
            $c->execute();
            if ($c->rowCount() !== 1) {
                return [];
            }
        }
        $rows = $db->query(
            "SELECT v.*, TIMESTAMPDIFF(MINUTE, v.arrived_at, NOW()) AS minutes_since_arrival, TIMESTAMPDIFF(MINUTE, v.arrived_at, v.doctor_at) AS minutes_to_doctor,
                    p.first_name, p.last_name, p.registration_status, b.name AS bed_name
             FROM er_visits v JOIN patients p ON p.id = v.patient_id LEFT JOIN er_beds b ON b.id = v.er_bed_id
             WHERE v.status IN ('waiting', 'triaged')"
        )->fetchAll(PDO::FETCH_ASSOC);
        $team = array_map('intval', $db->query("SELECT s.user_id FROM er_staff s JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL")->fetchAll(PDO::FETCH_COLUMN));
        $sent = [];
        foreach ($rows as $v) {
            $w = self::wait($v);
            if (!$w['over']) {
                continue;
            }
            $who = trim("{$v['first_name']} {$v['last_name']}");
            $where = $v['bed_name'] ? " ({$v['bed_name']})" : ' (waiting room)';
            $targets = array_map(fn($u) => ['user' => $u], $team);
            if ($v['nurse_user_id']) {
                $targets[] = ['user' => (int) $v['nurse_user_id']];
            }
            if ($w['stage'] === 'triage' && $v['triage_alert_at'] === null) {
                if (!$team) {
                    $targets[] = ['role' => 'charge_nurse'];
                }
                $res = AlertService::raise([
                    'type' => 'er_wait', 'urgency' => 'urgent',
                    'title' => "ER: not triaged after {$w['minutes']} min — {$who}{$where}",
                    'body' => "{$v['visit_no']} arrived " . substr($v['arrived_at'], 11, 5) . " ({$v['arrival_mode']}). Triage target: {$w['target']} min.",
                    'patient_id' => (int) $v['patient_id'], 'link' => ['tab' => 'er'], 'targets' => $targets,
                    'source_type' => 'er_visits', 'source_id' => (int) $v['id'], 'dedupe_key' => "erwait:{$v['id']}:triage",
                ]);
                $db->prepare("UPDATE er_visits SET triage_alert_at = NOW() WHERE id = :id")->execute(['id' => $v['id']]);
                $sent[] = ['visit' => $v['visit_no'], 'stage' => 'triage', 'ok' => !empty($res['success'])];
            } elseif ($w['stage'] === 'doctor' && ($v['doctor_alert_at'] === null || (int) $v['acuity'] < (int) $v['doctor_alert_acuity'])) {
                if (!$team) {
                    $targets[] = ['role' => 'doctor'];
                    $targets[] = ['role' => 'charge_nurse'];
                }
                $a = (int) $v['acuity'];
                $db->prepare("UPDATE alerts SET resolved_at = NOW(), resolve_note = 'More urgent after re-triage' WHERE dedupe_key = :k AND resolved_at IS NULL")
                    ->execute(['k' => "erwait:{$v['id']}:doctor"]);
                $res = AlertService::raise([
                    'type' => 'er_wait', 'urgency' => $a === 1 ? 'critical' : ($a <= 3 ? 'urgent' : 'info'),
                    'title' => $a === 1 && $w['target'] === 0
                        ? "ER level 1 — doctor needed now: {$who}{$where}"
                        : "ER level {$a}: no doctor after {$w['minutes']} min — {$who}{$where}",
                    'body' => "{$v['visit_no']}, triaged level {$a} (" . (ErService::ACUITY[$a]['label'] ?? '') . "). Target: seen within {$w['target']} min of arrival."
                        . ' Assign a doctor on the ER board.',
                    'patient_id' => (int) $v['patient_id'], 'link' => ['tab' => 'er'], 'targets' => $targets,
                    'source_type' => 'er_visits', 'source_id' => (int) $v['id'], 'dedupe_key' => "erwait:{$v['id']}:doctor",
                ]);
                $db->prepare("UPDATE er_visits SET doctor_alert_at = NOW(), doctor_alert_acuity = :a WHERE id = :id")->execute(['a' => $a, 'id' => $v['id']]);
                $sent[] = ['visit' => $v['visit_no'], 'stage' => 'doctor', 'acuity' => $a, 'ok' => !empty($res['success'])];
            }
        }
        // Alerts whose wait is over (triaged, seen, left): closed.
        foreach ($db->query("SELECT DISTINCT source_id FROM alerts WHERE alert_type = 'er_wait' AND resolved_at IS NULL")->fetchAll(PDO::FETCH_COLUMN) as $id) {
            $this->closeAlerts($db, (int) $id);
        }
        return $sent;
    }

    /** Close a visit's waiting-time alerts that no longer apply. */
    public function closeAlerts(PDO $db, int $visitId): void
    {
        $st = $db->prepare("SELECT status, doctor_at FROM er_visits WHERE id = :id");
        $st->execute(['id' => $visitId]);
        $v = $st->fetch(PDO::FETCH_ASSOC);
        // Acknowledged or not: once the wait is over, the alert is done.
        $resolve = $db->prepare("UPDATE alerts SET resolved_at = NOW(), resolve_note = :n WHERE dedupe_key = :k AND resolved_at IS NULL");
        if (!$v || $v['status'] !== 'waiting') {
            $resolve->execute(['k' => "erwait:{$visitId}:triage", 'n' => $v && $v['status'] === 'triaged' ? 'Triaged' : 'Closed']);
        }
        if (!$v || $v['doctor_at'] !== null || !in_array($v['status'], ['waiting', 'triaged'], true)) {
            $resolve->execute(['k' => "erwait:{$visitId}:doctor", 'n' => $v && $v['doctor_at'] !== null ? 'Seen by a doctor' : 'Closed']);
        }
    }

    // ------------------------------------------------------------------
    // Settings (admin): beds, targets, the ER team
    // ------------------------------------------------------------------

    public function settings(): array
    {
        $db = Database::connection();
        return [
            'beds' => $this->beds(true),
            'areas' => self::AREAS,
            'targets' => self::targets(),
            'team' => $db->query(
                "SELECT s.user_id, r.name AS role, " . self::nameSql('s.user_id') . " AS name FROM er_staff s JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL
                 LEFT JOIN roles r ON r.id = u.role_id ORDER BY r.name, name"
            )->fetchAll(PDO::FETCH_ASSOC),
            'staff' => $this->staffOptions(),
        ];
    }

    /** Doctors and nurses (for the team and for assigning). ER team first. */
    public function staffOptions(): array
    {
        return array_map(fn($r) => ['id' => (int) $r['id'], 'name' => $r['name'], 'role' => $r['role'], 'er_team' => (bool) $r['er_team']],
            Database::connection()->query(
                "SELECT u.id, " . self::nameSql('u.id') . " AS name, r.name AS role, (s.id IS NOT NULL) AS er_team
                 FROM users u JOIN roles r ON r.id = u.role_id LEFT JOIN er_staff s ON s.user_id = u.id
                 WHERE u.deleted_at IS NULL AND r.name IN ('doctor', 'clinician', 'nurse', 'charge_nurse') ORDER BY er_team DESC, name"
            )->fetchAll(PDO::FETCH_ASSOC));
    }

    public function beds(bool $all = false): array
    {
        return array_map(fn($b) => ['id' => (int) $b['id'], 'name' => $b['name'], 'area' => $b['area'], 'area_label' => self::AREAS[$b['area']] ?? $b['area'],
            'sort_order' => (int) $b['sort_order'], 'is_active' => (bool) $b['is_active'], 'visit_id' => $b['visit_id'] !== null ? (int) $b['visit_id'] : null],
            Database::connection()->query(
                "SELECT b.*, (SELECT v.id FROM er_visits v WHERE v.er_bed_id = b.id AND v.status IN ('waiting', 'triaged') LIMIT 1) AS visit_id
                 FROM er_beds b" . ($all ? '' : ' WHERE b.is_active = 1') . " ORDER BY FIELD(b.area, 'resus', 'acute', 'fast_track', 'observation', 'other'), b.sort_order, b.name"
            )->fetchAll(PDO::FETCH_ASSOC));
    }

    /** data: id?, name, area, sort_order?, is_active? ; or prefix + count + area to add several ("Bay" + 6 = Bay 1..Bay 6). */
    public function saveBed(array $data, array $actor): array
    {
        $db = Database::connection();
        $area = (string) ($data['area'] ?? 'acute');
        if (!isset(self::AREAS[$area])) {
            return ['success' => false, 'message' => 'Choose the area.', 'errors' => ['area' => 'Required.']];
        }
        if (isset($data['count'])) {
            $prefix = trim((string) ($data['prefix'] ?? ''));
            $count = (int) $data['count'];
            if ($prefix === '' || mb_strlen($prefix) > 30) {
                return ['success' => false, 'message' => 'Name the beds, e.g. "Bay" or "Resus".', 'errors' => ['prefix' => 'Required.']];
            }
            if ($count < 1 || $count > 50) {
                return ['success' => false, 'message' => 'How many beds (1–50)?', 'errors' => ['count' => '1–50.']];
            }
            $next = 1;
            $st = $db->prepare("INSERT IGNORE INTO er_beds (name, area, sort_order, is_active, created_by, created_at) VALUES (:n, :a, :s, 1, :u, NOW())");
            $added = 0;
            for ($i = 0; $added < $count && $i < 200; $i++, $next++) {
                $st->execute(['n' => "{$prefix} {$next}", 'a' => $area, 's' => $next, 'u' => (int) $actor['id']]);
                $added += $st->rowCount();
            }
            return ['success' => true, 'message' => "{$added} bed" . ($added === 1 ? '' : 's') . ' added.', 'data' => $this->settings()];
        }
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '' || mb_strlen($name) > 40) {
            return ['success' => false, 'message' => 'Name the bed (up to 40 characters).', 'errors' => ['name' => 'Required.']];
        }
        $id = (int) ($data['id'] ?? 0);
        $dup = $db->prepare("SELECT id FROM er_beds WHERE name = :n AND id <> :id");
        $dup->execute(['n' => $name, 'id' => $id]);
        if ($dup->fetchColumn()) {
            return ['success' => false, 'message' => 'There is already a bed with that name.', 'errors' => ['name' => 'Taken.']];
        }
        $active = !array_key_exists('is_active', $data) || !empty($data['is_active']) && (string) $data['is_active'] !== '0';
        if ($id) {
            if (!$active) {
                $busy = $db->prepare("SELECT 1 FROM er_visits WHERE er_bed_id = :b AND status IN ('waiting', 'triaged')");
                $busy->execute(['b' => $id]);
                if ($busy->fetchColumn()) {
                    return ['success' => false, 'message' => 'A patient is in this bed: move them first.'];
                }
            }
            $db->prepare("UPDATE er_beds SET name = :n, area = :a, sort_order = :s, is_active = :act WHERE id = :id")
                ->execute(['n' => $name, 'a' => $area, 's' => (int) ($data['sort_order'] ?? 0), 'act' => $active ? 1 : 0, 'id' => $id]);
        } else {
            $db->prepare("INSERT INTO er_beds (name, area, sort_order, is_active, created_by, created_at) VALUES (:n, :a, :s, 1, :u, NOW())")
                ->execute(['n' => $name, 'a' => $area, 's' => (int) ($data['sort_order'] ?? 0), 'u' => (int) $actor['id']]);
        }
        return ['success' => true, 'message' => 'Bed saved.', 'data' => $this->settings()];
    }

    public function setTeam(int $userId, bool $on, array $actor): array
    {
        $db = Database::connection();
        if ($on) {
            $u = $db->prepare("SELECT r.name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = :id AND u.deleted_at IS NULL");
            $u->execute(['id' => $userId]);
            if (!in_array($u->fetchColumn(), array_merge(self::DOCTOR_ROLES, self::NURSE_ROLES), true)) {
                return ['success' => false, 'message' => 'Choose a doctor or nurse.', 'errors' => ['user_id' => 'Required.']];
            }
            $db->prepare("INSERT IGNORE INTO er_staff (user_id, added_by, added_at) VALUES (:u, :by, NOW())")->execute(['u' => $userId, 'by' => (int) $actor['id']]);
        } else {
            $db->prepare("DELETE FROM er_staff WHERE user_id = :u")->execute(['u' => $userId]);
        }
        return ['success' => true, 'message' => $on ? 'Added to the ER team.' : 'Removed from the ER team.', 'data' => $this->settings()];
    }

    // ------------------------------------------------------------------
    // The TV
    // ------------------------------------------------------------------

    /** The ER tracking board TV: beds (free ones too) and the waiting room; initials, no names or complaints. */
    public function tv(): array
    {
        $board = (new ErService())->board();
        $byBed = [];
        $waiting = [];
        foreach ($board['visits'] as $v) {
            $row = [
                'initials' => self::initials($v['patient']), 'age' => $v['patient']['age'], 'sex' => strtoupper(substr((string) $v['patient']['sex'], 0, 1)),
                'unidentified' => $v['patient']['registration_status'] === 'unidentified',
                'acuity' => $v['acuity'], 'status' => $v['status'], 'minutes_in_er' => $v['minutes_in_er'],
                'wait' => $v['wait'], 'doctor' => $v['doctor_name'], 'nurse' => $v['nurse_name'], 'orders' => $v['orders'],
            ];
            if ($v['er_bed_id']) {
                $byBed[$v['er_bed_id']] = $row;
            } else {
                $waiting[] = $row;
            }
        }
        $beds = array_map(fn($b) => ['name' => $b['name'], 'area' => $b['area_label'], 'patient' => $byBed[$b['id']] ?? null], $this->beds());
        $c = $board['counts'];
        return ['beds' => $beds, 'waiting' => $waiting, 'counts' => $c + ['free_beds' => count(array_filter($beds, fn($b) => !$b['patient']))],
            'targets' => self::targets()];
    }

    private static function initials(array $p): string
    {
        if ($p['registration_status'] === 'unidentified') {
            return 'Unknown';
        }
        $parts = preg_split('/\s+/', trim((string) $p['name']));
        return mb_strtoupper(mb_substr($parts[0] ?? '', 0, 1) . '.' . mb_substr(end($parts) ?: '', 0, 1) . '.');
    }

    private function name(PDO $db, int $id): string
    {
        $st = $db->prepare("SELECT " . self::nameSql(':id'));
        $st->execute(['id' => $id]);
        return (string) $st->fetchColumn();
    }

    public static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL WHERE nu.id = {$column} LIMIT 1)";
    }
}
