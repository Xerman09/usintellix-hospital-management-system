<?php

namespace App\Modules\Lab\Services;

use App\Core\Database;
use App\Modules\LabRanges\Services\LabFlagService;
use App\Modules\PatientProcedureResults\Services\PatientProcedureResultService;
use PDO;

/**
 * Lab department (module 14, Phase 2: result entry and verification).
 *
 *   * queue() -- "to enter" (collected specimens, by accession number, with their tests), "to verify" (results
 *     entered, critical ones first, with the patient's previous result of each analyte), "released" (last 24 h).
 *   * form() / save() -- the lab types the results of a specimen's tests: the analytes of each test (its discrete
 *     results, with units and reference range), flagged normal / abnormal / critical as typed. Save as a draft, or
 *     submit for verification.
 *   * verify() -- a medical technologist checks and releases: the values go to patient_procedure_results through
 *     PatientProcedureResultService::saveForOrder, which alerts critical values (module 6) and delivers to the
 *     results inbox (module 7). returnSet() sends results back to the bench with a reason.
 *   * A released result can be corrected: a new version (with the reason) goes through entry and verification again;
 *     its release replaces the results (the inbox marks them corrected; an unacknowledged critical alert that no
 *     longer applies is closed).
 *   * staff() / saveStaff() -- which lab users are medical technologists (admin).
 */
class LabResultService
{
    public const ENTER_ROLES = ['admin', 'lab_technician'];
    public const VERIFY_ROLES = ['lab_technician'];
    private const EDITABLE = ['draft', 'returned'];

    // ------------------------------------------------------------------
    // Queues
    // ------------------------------------------------------------------

    /** view: enter | verify | released; filters: section, q. */
    public function queue(string $view, array $f, array $actor): array
    {
        $db = Database::connection();
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $view = in_array($view, ['enter', 'verify', 'released'], true) ? $view : 'enter';
        $section = (string) ($f['section'] ?? '');
        $q = trim((string) ($f['q'] ?? ''));
        $items = $view === 'enter' ? $this->toEnter($db, $section, $q, $now) : $this->sets($db, $view, $section, $q, $now);
        $c = $db->query(
            "SELECT
               (SELECT COUNT(*) FROM patient_procedure_orders o WHERE o.deleted_at IS NULL AND o.lab_request_id IS NOT NULL AND o.status = 'collected'
                  AND NOT EXISTS (SELECT 1 FROM lab_result_sets s WHERE s.order_id = o.id AND s.status = 'entered')) AS to_enter,
               (SELECT COUNT(*) FROM lab_result_sets WHERE status = 'entered') AS to_verify,
               (SELECT COUNT(DISTINCT s.id) FROM lab_result_sets s JOIN lab_result_values v ON v.set_id = s.id WHERE s.status = 'entered' AND v.flag = 'critical') AS critical,
               (SELECT COUNT(*) FROM lab_result_sets WHERE status = 'returned') AS returned,
               (SELECT COUNT(*) FROM lab_result_sets WHERE status IN ('released', 'superseded') AND verified_at >= CURDATE()) AS released_today"
        )->fetch(PDO::FETCH_ASSOC);
        return ['view' => $view, 'now' => $now, 'items' => $items, 'counts' => array_map('intval', $c),
            'can_enter' => in_array($actor['role'] ?? '', self::ENTER_ROLES, true), 'can_verify' => $this->canVerify($db, $actor)];
    }

    /** Collected specimens with tests not yet entered (or a correction / returned results), by specimen. */
    private function toEnter(PDO $db, string $section, string $q, string $now): array
    {
        $rows = $db->query(
            "SELECT o.id AS order_id, o.status AS order_status, o.specimen_id, c.name, c.identifying_code, c.lab_section,
                    (SELECT s.id FROM lab_result_sets s WHERE s.order_id = o.id ORDER BY s.version DESC LIMIT 1) AS set_id
             FROM patient_procedure_orders o JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             WHERE o.deleted_at IS NULL AND o.lab_request_id IS NOT NULL AND o.specimen_id IS NOT NULL AND o.status IN ('collected', 'resulted', 'reviewed')"
        )->fetchAll(PDO::FETCH_ASSOC);
        $bySpec = [];
        foreach ($rows as $r) {
            $set = $r['set_id'] ? $this->set($db, (int) $r['set_id']) : null;
            $state = $set['status'] ?? null;
            // Waiting for entry: collected and nothing entered yet / a draft / sent back; or a correction in progress.
            $open = $r['order_status'] === 'collected' ? in_array($state, [null, 'draft', 'returned'], true) : in_array($state, self::EDITABLE, true);
            if (!$open || ($section !== '' && $r['lab_section'] !== $section)) {
                continue;
            }
            $bySpec[(int) $r['specimen_id']][] = ['order_id' => (int) $r['order_id'], 'name' => $r['name'], 'code' => $r['identifying_code'], 'section' => $r['lab_section'],
                'state' => $state, 'version' => $set ? (int) $set['version'] : null, 'return_reason' => $set['return_reason'] ?? null,
                'correction' => $set && (int) $set['version'] > 1, 'saved_at' => $set['saved_at'] ?? null];
        }
        $out = [];
        foreach ($bySpec as $sid => $tests) {
            $s = $this->specimen($db, $sid);
            if (!$s || $s['voided_at']) {
                continue;
            }
            if ($q !== '' && !$this->matches($s, $q)) {
                continue;
            }
            $out[] = ['specimen' => $this->specimenOut($s), 'patient' => $this->patientOut($s), 'priority' => $s['priority'], 'location' => $s['location'],
                'request_no' => $s['request_no'], 'clinical_info' => $s['clinical_info'], 'tests' => $tests,
                'minutes' => intdiv(strtotime($now . ' UTC') - strtotime($s['collected_at'] . ' UTC'), 60)];
        }
        usort($out, fn($a, $b) => [self::rank($a['priority']), $a['specimen']['collected_at']] <=> [self::rank($b['priority']), $b['specimen']['collected_at']]);
        return $out;
    }

    /** Result sets waiting for verification (critical first) or released in the last 24 h. */
    private function sets(PDO $db, string $view, string $section, string $q, string $now): array
    {
        $sql = $view === 'verify'
            ? "SELECT s.id FROM lab_result_sets s WHERE s.status = 'entered' ORDER BY s.entered_at"
            : "SELECT s.id FROM lab_result_sets s WHERE s.status IN ('released', 'superseded') AND s.verified_at >= NOW() - INTERVAL 24 HOUR ORDER BY s.verified_at DESC LIMIT 300";
        $out = [];
        foreach ($db->query($sql)->fetchAll(PDO::FETCH_COLUMN) as $id) {
            $x = $this->setOut($db, (int) $id, $view === 'verify');
            if (!$x || ($section !== '' && $x['test']['section'] !== $section)) {
                continue;
            }
            $s = $this->specimen($db, (int) $x['specimen_id']);
            if ($q !== '' && (!$s || !$this->matches($s, $q))) {
                continue;
            }
            $out[] = $x;
        }
        if ($view === 'verify') {
            usort($out, fn($a, $b) => [-$a['critical'], self::rank($a['priority']), $a['entered_at']] <=> [-$b['critical'], self::rank($b['priority']), $b['entered_at']]);
        }
        return $out;
    }

    // ------------------------------------------------------------------
    // Entry
    // ------------------------------------------------------------------

    /** The entry form for tests (order_ids), all on one specimen. correct = start a correction of released results. */
    public function form(array $orderIds, bool $correct, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::ENTER_ROLES, true)) {
            return ['success' => false, 'message' => 'Results are entered by the lab.', 'forbidden' => true];
        }
        $db = Database::connection();
        $ids = array_values(array_unique(array_filter(array_map('intval', $orderIds))));
        if (!$ids) {
            return ['success' => false, 'message' => 'Choose the tests.'];
        }
        $flagger = new LabFlagService();
        $tests = [];
        $specimenId = null;
        foreach ($ids as $id) {
            $o = $this->order($db, $id);
            if (!$o || !$o['lab_request_id'] || !$o['specimen_id']) {
                return ['success' => false, 'message' => 'Test not found (or not collected by the lab).', 'not_found' => true];
            }
            $specimenId ??= (int) $o['specimen_id'];
            $cur = $this->latest($db, $id);
            $released = $cur && in_array($cur['status'], ['released', 'superseded'], true);
            if ($o['status'] === 'collected' && $cur && $cur['status'] === 'entered') {
                return ['success' => false, 'message' => "{$o['name']} is waiting for verification."];
            }
            if ($released && !$correct) {
                return ['success' => false, 'message' => "{$o['name']} is already released. Use “Correct” to change it."];
            }
            if (!$released && $correct) {
                $correct = $cur && in_array($cur['status'], self::EDITABLE, true) && (int) $cur['version'] > 1;
            }
            $values = $cur ? $this->values($db, (int) $cur['id']) : [];
            if (!$values) {
                $values = array_map(fn($t) => ['code' => $t['identifying_code'], 'name' => $t['name'], 'value' => '', 'units' => $t['default_units'],
                    'reference_range' => $t['default_range'] ?: $this->rangeText($flagger, $t['name'], $t['default_units']), 'is_abnormal' => 0, 'comment' => null,
                    'flag' => null, 'flag_detail' => null], $this->template($db, (int) $o['config_id']));
            }
            if (!$values) {
                $values = [['code' => $o['code'], 'name' => $o['name'], 'value' => '', 'units' => $o['default_units'], 'reference_range' => $o['default_range'],
                    'is_abnormal' => 0, 'comment' => null, 'flag' => null, 'flag_detail' => null]];
            }
            $tests[] = ['order_id' => $id, 'name' => $o['name'], 'code' => $o['code'], 'section' => $o['lab_section'], 'state' => $cur['status'] ?? null,
                'version' => $cur ? (int) $cur['version'] : null, 'correcting' => $released || ($cur && (int) $cur['version'] > 1 && in_array($cur['status'], self::EDITABLE, true)),
                'return_reason' => ($cur['status'] ?? null) === 'returned' ? $cur['return_reason'] : null, 'correction_reason' => $released ? null : ($cur['correction_reason'] ?? null), 'comment' => $released ? null : ($cur['comment'] ?? null),
                'values' => array_map(fn($v) => $v + ['previous' => $this->previous($db, (int) $o['patient_id'], $id, $v['name'])], $values)];
        }
        $s = $this->specimen($db, $specimenId);
        return ['success' => true, 'message' => 'Ready.', 'data' => ['specimen' => $this->specimenOut($s), 'patient' => $this->patientOut($s), 'priority' => $s['priority'],
            'location' => $s['location'], 'clinical_info' => $s['clinical_info'], 'tests' => $tests]];
    }

    /**
     * data: tests [{order_id, values [{code, name, value, units, reference_range, is_abnormal, comment}], comment, correction_reason}],
     * submit (1 = send for verification, else a draft).
     */
    public function save(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::ENTER_ROLES, true)) {
            return ['success' => false, 'message' => 'Results are entered by the lab.', 'forbidden' => true];
        }
        $db = Database::connection();
        $submit = !empty($data['submit']);
        $tests = (array) ($data['tests'] ?? []);
        if (!$tests) {
            return ['success' => false, 'message' => 'Nothing to save.'];
        }
        $errors = [];
        $plan = [];
        foreach ($tests as $i => $t) {
            $o = $this->order($db, (int) ($t['order_id'] ?? 0));
            if (!$o || !$o['lab_request_id'] || !$o['specimen_id']) {
                return ['success' => false, 'message' => 'Test not found.', 'not_found' => true];
            }
            $cur = $this->latest($db, (int) $o['id']);
            $released = $cur && in_array($cur['status'], ['released', 'superseded'], true);
            if ($cur && $cur['status'] === 'entered') {
                return ['success' => false, 'message' => "{$o['name']} is already waiting for verification."];
            }
            if (!$released && $o['status'] !== 'collected' && !($cur && in_array($cur['status'], self::EDITABLE, true))) {
                return ['success' => false, 'message' => "{$o['name']} can't be resulted now."];
            }
            $correction = $released || ($cur && (int) $cur['version'] > 1);
            $reason = trim((string) ($t['correction_reason'] ?? ($cur['correction_reason'] ?? '')));
            if ($correction && ($reason === '' || mb_strlen($reason) > 255)) {
                $errors["tests.{$i}.correction_reason"] = "Why correct {$o['name']}?";
            }
            $rows = [];
            foreach ((array) ($t['values'] ?? []) as $k => $v) {
                $name = trim((string) ($v['name'] ?? ''));
                $value = trim((string) ($v['value'] ?? ''));
                if ($name === '' && $value === '') {
                    continue;
                }
                if ($name === '') {
                    $errors["tests.{$i}.values.{$k}.name"] = 'Name of the result?';
                }
                foreach (['name' => 255, 'value' => 100, 'units' => 50, 'reference_range' => 100, 'comment' => 255] as $f => $max) {
                    if (mb_strlen(trim((string) ($v[$f] ?? ''))) > $max) {
                        $errors["tests.{$i}.values.{$k}.{$f}"] = "At most {$max} characters.";
                    }
                }
                $rows[] = ['code' => trim((string) ($v['code'] ?? '')) ?: null, 'name' => $name, 'value' => $value !== '' ? $value : null,
                    'units' => trim((string) ($v['units'] ?? '')) ?: null, 'reference_range' => trim((string) ($v['reference_range'] ?? '')) ?: null,
                    'is_abnormal' => (int) !empty($v['is_abnormal']), 'comment' => trim((string) ($v['comment'] ?? '')) ?: null];
            }
            if ($submit && !array_filter($rows, fn($r) => $r['value'] !== null)) {
                $errors["tests.{$i}.values"] = "Type at least one result for {$o['name']}.";
            }
            $comment = trim((string) ($t['comment'] ?? ''));
            if (mb_strlen($comment) > 1000) {
                $errors["tests.{$i}.comment"] = 'At most 1000 characters.';
            }
            $plan[] = [$o, $cur, $released, $correction ? $reason : null, $rows, $comment !== '' ? $comment : null];
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $flagger = new LabFlagService();
        $critical = [];
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT lab_res_save');
        try {
            foreach ($plan as [$o, $cur, $released, $reason, $rows, $comment]) {
                if (!$cur || $released) {
                    $version = $cur ? (int) $cur['version'] + 1 : 1;
                    $db->prepare("INSERT INTO lab_result_sets (order_id, version, status, created_at) VALUES (:o, :v, 'draft', NOW())")->execute(['o' => $o['id'], 'v' => $version]);
                    $sid = (int) $db->lastInsertId();
                } else {
                    $sid = (int) $cur['id'];
                }
                $db->prepare("DELETE FROM lab_result_values WHERE set_id = :s")->execute(['s' => $sid]);
                $ins = $db->prepare(
                    "INSERT INTO lab_result_values (set_id, seq, code, name, value, units, reference_range, is_abnormal, flag, flag_detail, comment)
                     VALUES (:s, :q, :c, :n, :v, :u, :r, :a, :f, :d, :cm)"
                );
                foreach ($rows as $k => $r) {
                    $fl = $flagger->flag($r);
                    $ins->execute(['s' => $sid, 'q' => $k, 'c' => $r['code'], 'n' => $r['name'], 'v' => $r['value'], 'u' => $r['units'], 'r' => $r['reference_range'],
                        'a' => $r['is_abnormal'], 'f' => $fl['flag'], 'd' => $fl['detail'], 'cm' => $r['comment']]);
                    if ($fl['flag'] === 'critical') {
                        $critical[] = trim("{$r['name']} {$r['value']} {$r['units']}") . " ({$fl['detail']})";
                    }
                }
                $db->prepare(
                    "UPDATE lab_result_sets SET status = :st, comment = :cm, correction_reason = :cr, saved_by = :u, saved_at = NOW(),
                        entered_by = IF(:sub = 1, :u2, entered_by), entered_at = IF(:sub2 = 1, NOW(), entered_at) WHERE id = :id"
                )->execute(['st' => $submit ? 'entered' : ($cur && $cur['status'] === 'returned' && !$released ? 'returned' : 'draft'), 'cm' => $comment, 'cr' => $reason,
                    'u' => (int) $actor['id'], 'sub' => (int) $submit, 'u2' => (int) $actor['id'], 'sub2' => (int) $submit, 'id' => $sid]);
            }
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT lab_res_save');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT lab_res_save');
            throw $e;
        }
        $n = count($plan);
        $msg = $submit ? "{$n} test" . ($n === 1 ? '' : 's') . ' sent for verification.' : 'Draft saved.';
        if ($critical) {
            $msg .= ' CRITICAL: ' . implode('; ', $critical) . '. It is alerted to the doctor when released — verify it first.';
        }
        return ['success' => true, 'message' => $msg, 'data' => ['critical' => $critical]];
    }

    // ------------------------------------------------------------------
    // Verification
    // ------------------------------------------------------------------

    /** Verify and release a result set: to the chart, critical alerts, results inbox. */
    public function verify(int $setId, array $actor): array
    {
        $db = Database::connection();
        if (!$this->canVerify($db, $actor)) {
            return ['success' => false, 'message' => 'Results are verified by a medical technologist (set up under Lab staff).', 'forbidden' => true];
        }
        $s = $this->set($db, $setId);
        if (!$s || $s['status'] !== 'entered') {
            return ['success' => false, 'message' => 'These results are not waiting for verification.', 'not_found' => true];
        }
        $o = $this->order($db, (int) $s['order_id']);
        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();
        $rows = array_values(array_map(fn($v) => ['code' => $v['code'], 'name' => $v['name'], 'value' => $v['value'], 'units' => $v['units'],
            'reference_range' => $v['reference_range'], 'is_abnormal' => (int) $v['is_abnormal'], 'result_date' => $today],
            array_filter($this->values($db, $setId), fn($v) => $v['value'] !== null && $v['value'] !== '')));
        if (!$rows) {
            return ['success' => false, 'message' => 'No result values to release.'];
        }
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT lab_verify');
        try {
            $r = (new PatientProcedureResultService())->saveForOrder((int) $s['order_id'], $rows, (int) $actor['id']);
            if (!$r['success']) {
                $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT lab_verify');
                return $r;
            }
            $db->prepare("UPDATE lab_result_sets SET status = 'superseded' WHERE order_id = :o AND status = 'released'")->execute(['o' => $s['order_id']]);
            $db->prepare("UPDATE lab_result_sets SET status = 'released', verified_by = :u, verified_at = NOW() WHERE id = :id")->execute(['u' => (int) $actor['id'], 'id' => $setId]);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT lab_verify');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT lab_verify');
            throw $e;
        }
        $what = (int) $s['version'] > 1 ? 'Corrected result released' : 'Released';
        return ['success' => true, 'message' => "{$o['name']}: {$what}. " . preg_replace('/^Results saved\.\s*/', '', $r['message']), 'data' => $r['data'] ?? null];
    }

    /** Send results back to the bench (re-run, check the sample ...). */
    public function returnSet(int $setId, string $reason, array $actor): array
    {
        $db = Database::connection();
        if (!$this->canVerify($db, $actor)) {
            return ['success' => false, 'message' => 'Only a medical technologist can return results.', 'forbidden' => true];
        }
        $s = $this->set($db, $setId);
        if (!$s || $s['status'] !== 'entered') {
            return ['success' => false, 'message' => 'These results are not waiting for verification.', 'not_found' => true];
        }
        $reason = trim($reason);
        if ($reason === '' || mb_strlen($reason) > 255) {
            return ['success' => false, 'message' => 'What should the bench check or redo?', 'errors' => ['reason' => 'Required.']];
        }
        $db->prepare("UPDATE lab_result_sets SET status = 'returned', returned_by = :u, returned_at = NOW(), return_reason = :r WHERE id = :id")
            ->execute(['u' => (int) $actor['id'], 'r' => $reason, 'id' => $setId]);
        return ['success' => true, 'message' => 'Returned to the bench.'];
    }

    // ------------------------------------------------------------------
    // Lab staff
    // ------------------------------------------------------------------

    public function staff(): array
    {
        return Database::connection()->query(
            "SELECT u.id, " . LabService::nameSql('u.id') . " AS name, u.username, COALESCE(ls.med_tech, 0) AS med_tech, ls.license_no
             FROM users u JOIN roles r ON r.id = u.role_id LEFT JOIN lab_staff ls ON ls.user_id = u.id
             WHERE u.deleted_at IS NULL AND r.name = 'lab_technician' ORDER BY name"
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    /** data: user_id, med_tech, license_no (required for a medical technologist). Admin. */
    public function saveStaff(array $data, array $actor): array
    {
        if (($actor['role'] ?? '') !== 'admin') {
            return ['success' => false, 'message' => 'Lab staff are set up by an admin.', 'forbidden' => true];
        }
        $uid = (int) ($data['user_id'] ?? 0);
        if (!in_array($uid, array_map(fn($s) => (int) $s['id'], $this->staff()), true)) {
            return ['success' => false, 'message' => 'Choose a lab user.', 'errors' => ['user_id' => 'Required.']];
        }
        $mt = (int) !empty($data['med_tech']);
        $lic = trim((string) ($data['license_no'] ?? ''));
        if ($mt && ($lic === '' || mb_strlen($lic) > 50)) {
            return ['success' => false, 'message' => 'A medical technologist needs a licence number.', 'errors' => ['license_no' => 'Required.']];
        }
        Database::connection()->prepare(
            "INSERT INTO lab_staff (user_id, med_tech, license_no, updated_by, updated_at) VALUES (:u, :m, :l, :by, NOW())
             ON DUPLICATE KEY UPDATE med_tech = VALUES(med_tech), license_no = VALUES(license_no), updated_by = VALUES(updated_by), updated_at = NOW()"
        )->execute(['u' => $uid, 'm' => $mt, 'l' => $lic !== '' ? $lic : null, 'by' => (int) $actor['id']]);
        return ['success' => true, 'message' => $mt ? 'Medical technologist: may verify and release results.' : 'Lab technician: enters results (not verify).'];
    }

    public function canVerify(PDO $db, array $actor): bool
    {
        if (!in_array($actor['role'] ?? '', self::VERIFY_ROLES, true)) {
            return false;
        }
        $st = $db->prepare("SELECT med_tech FROM lab_staff WHERE user_id = :u");
        $st->execute(['u' => (int) ($actor['id'] ?? 0)]);
        return (int) $st->fetchColumn() === 1;
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    private function setOut(PDO $db, int $id, bool $withPrevious): ?array
    {
        $s = $this->set($db, $id);
        if (!$s) {
            return null;
        }
        $o = $this->order($db, (int) $s['order_id']);
        $sp = $this->specimen($db, (int) $o['specimen_id']);
        $values = $this->values($db, $id);
        if ($withPrevious) {
            foreach ($values as &$v) {
                $v['previous'] = $this->previous($db, (int) $o['patient_id'], (int) $o['id'], $v['name']);
            }
            unset($v);
        }
        return [
            'id' => $id, 'order_id' => (int) $o['id'], 'version' => (int) $s['version'], 'status' => $s['status'], 'comment' => $s['comment'], 'correction_reason' => $s['correction_reason'],
            'test' => ['name' => $o['name'], 'code' => $o['code'], 'section' => $o['lab_section']], 'specimen_id' => (int) $o['specimen_id'],
            'specimen' => $sp ? $this->specimenOut($sp) : null, 'patient' => $sp ? $this->patientOut($sp) : null, 'priority' => $sp['priority'] ?? 'routine', 'location' => $sp['location'] ?? null,
            'values' => $values, 'critical' => count(array_filter($values, fn($v) => $v['flag'] === 'critical')),
            'abnormal' => count(array_filter($values, fn($v) => $v['flag'] === 'abnormal')),
            'entered_at' => $s['entered_at'], 'entered_by' => $s['entered_by'] ? $this->userName($db, (int) $s['entered_by']) : null,
            'verified_at' => $s['verified_at'], 'verified_by' => $s['verified_by'] ? $this->userName($db, (int) $s['verified_by']) : null,
        ];
    }

    private function values(PDO $db, int $setId): array
    {
        $st = $db->prepare("SELECT code, name, value, units, reference_range, is_abnormal, flag, flag_detail, comment FROM lab_result_values WHERE set_id = :s ORDER BY seq, id");
        $st->execute(['s' => $setId]);
        return array_map(fn($v) => ['is_abnormal' => (int) $v['is_abnormal']] + $v, $st->fetchAll(PDO::FETCH_ASSOC));
    }

    /** The test's analytes (its discrete results). */
    private function template(PDO $db, int $configId): array
    {
        $st = $db->prepare("SELECT name, identifying_code, default_units, default_range FROM procedure_order_configs WHERE parent_id = :p AND procedure_tier = 'discrete_result' AND deleted_at IS NULL ORDER BY sequence, id");
        $st->execute(['p' => $configId]);
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    /** "low-high" from the admin's range when the test has none. */
    private function rangeText(LabFlagService $f, string $name, ?string $units): ?string
    {
        $m = $f->match(null, $name, $units);
        $r = $m['range'] ?? null;
        if (!$r || !$m['units_ok'] || $r['normal_low'] === null || $r['normal_high'] === null) {
            return null;
        }
        $fmt = fn($v) => rtrim(rtrim(number_format((float) $v, 4, '.', ''), '0'), '.');
        return $fmt($r['normal_low']) . '-' . $fmt($r['normal_high']);
    }

    /** The patient's last released result of an analyte (another order), for the delta check. */
    private function previous(PDO $db, int $patientId, int $orderId, string $name): ?array
    {
        $st = $db->prepare(
            "SELECT r.value, r.units, r.flag, COALESCE(o.reported_at, r.created_at) AS at FROM patient_procedure_results r JOIN patient_procedure_orders o ON o.id = r.patient_procedure_order_id
             WHERE o.patient_id = :p AND o.id <> :o AND o.deleted_at IS NULL AND r.deleted_at IS NULL AND LOWER(r.name) = LOWER(:n) AND r.value IS NOT NULL
             ORDER BY COALESCE(o.reported_at, r.created_at) DESC, r.id DESC LIMIT 1"
        );
        $st->execute(['p' => $patientId, 'o' => $orderId, 'n' => $name]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function order(PDO $db, int $id): ?array
    {
        $st = $db->prepare(
            "SELECT o.*, c.id AS config_id, c.name, c.identifying_code AS code, c.lab_section, c.default_units, c.default_range FROM patient_procedure_orders o
             JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id WHERE o.id = :id AND o.deleted_at IS NULL"
        );
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function latest(PDO $db, int $orderId): ?array
    {
        $st = $db->prepare("SELECT * FROM lab_result_sets WHERE order_id = :o ORDER BY version DESC LIMIT 1");
        $st->execute(['o' => $orderId]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function set(PDO $db, int $id): ?array
    {
        $st = $db->prepare("SELECT * FROM lab_result_sets WHERE id = :id");
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function specimen(PDO $db, int $id): ?array
    {
        $st = $db->prepare(
            "SELECT s.*, r.request_no, r.priority, r.location, r.clinical_info, " . LabService::nameSql('s.collected_by') . " AS collected_by_name,
                    p.patient_no, p.first_name, p.middle_name, p.last_name, p.sex, p.birthdate
             FROM lab_specimens s JOIN lab_requests r ON r.id = s.request_id JOIN patients p ON p.id = s.patient_id WHERE s.id = :id"
        );
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function specimenOut(array $s): array
    {
        return ['id' => (int) $s['id'], 'accession_no' => $s['accession_no'], 'container' => $s['container'], 'container_label' => LabService::CONTAINERS[$s['container']][0] ?? $s['container'],
            'specimen_type' => $s['specimen_type'], 'collected_at' => $s['collected_at'], 'collected_by' => $s['collected_by_name']];
    }

    private function patientOut(array $s): array
    {
        $age = $s['birthdate'] ? (new \DateTimeImmutable($s['birthdate']))->diff(new \DateTimeImmutable('today'))->y : null;
        return ['id' => (int) $s['patient_id'], 'name' => trim(preg_replace('/\s+/', ' ', "{$s['first_name']} {$s['middle_name']} {$s['last_name']}")), 'mrn' => $s['patient_no'],
            'sex' => $s['sex'], 'birthdate' => $s['birthdate'], 'age' => $age];
    }

    private function matches(array $s, string $q): bool
    {
        $hay = strtolower("{$s['first_name']} {$s['middle_name']} {$s['last_name']} {$s['patient_no']} {$s['request_no']} {$s['accession_no']}");
        return str_contains($hay, strtolower($q)) || (preg_replace('/\D/', '', $q) !== '' && str_contains($s['accession_no'], preg_replace('/\D/', '', $q)));
    }

    private static function rank(?string $p): int
    {
        return ['stat' => 0, 'urgent' => 1][$p] ?? 2;
    }

    private function userName(PDO $db, int $id): ?string
    {
        $st = $db->prepare("SELECT " . LabService::nameSql(':id'));
        $st->execute(['id' => $id]);
        return $st->fetchColumn() ?: null;
    }
}
