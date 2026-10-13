<?php

namespace App\Modules\Lab\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use PDO;

/**
 * Lab department (module 14, Phase 1: specimen collection).
 *
 *   * order() -- a lab request from the clinic, the ER, a ward or the ICU: the tests (one patient_procedure_orders row
 *     each), priority (routine / urgent / STAT), clinical information, fasting, when to collect. Doctors order; nurses
 *     enter a verbal or protocol order for a named doctor. A STAT request alerts the lab.
 *   * worklist() -- the requests still to collect (STAT first, then by time due; overdue flagged) and the specimens
 *     collected today. Clinic orders placed on the patient's Procedures screen join it by themselves.
 *   * collect() -- the tests collected now, one specimen per tube (in order of draw), each with an accession number
 *     for its barcode label; who collected it, when, how, and that the patient's identity was checked.
 *   * voidSpecimen() -- collected in error: the tests go back to "to collect". labels() -- the label data (and the count
 *     of prints).
 */
class LabService
{
    public const ORDER_ROLES = ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse'];
    public const DOCTOR_ROLES = ['admin', 'doctor', 'clinician'];
    public const COLLECT_ROLES = ['admin', 'lab_technician', 'doctor', 'clinician', 'nurse', 'charge_nurse'];
    public const VIEW_ROLES = ['admin', 'lab_technician', 'doctor', 'clinician', 'nurse', 'charge_nurse'];
    public const PRIORITIES = ['stat' => 'STAT', 'urgent' => 'Urgent', 'routine' => 'Routine'];
    /** Minutes after "collect at" when a request counts as overdue. */
    public const OVERDUE = ['stat' => 30, 'urgent' => 60, 'routine' => 240];
    public const SOURCES = ['clinic' => 'Clinic', 'er' => 'ER', 'ward' => 'Ward', 'icu' => 'ICU', 'other' => 'Other'];
    public const MODES = ['written' => 'Doctor', 'verbal' => 'Verbal order', 'protocol' => 'Protocol / standing order'];
    /** code => [label, cap colour, specimen, order of draw (CLSI)] */
    public const CONTAINERS = [
        'culture' => ['Blood culture bottles', '#475569', 'Blood', 1],
        'citrate' => ['Light blue top (citrate)', '#38bdf8', 'Blood', 2],
        'red' => ['Red top (plain)', '#dc2626', 'Blood', 3],
        'sst' => ['Gold top (serum)', '#eab308', 'Blood', 3],
        'heparin' => ['Green top (heparin)', '#16a34a', 'Blood', 4],
        'edta' => ['Lavender top (EDTA)', '#a855f7', 'Blood', 5],
        'fluoride' => ['Grey top (fluoride)', '#9ca3af', 'Blood', 6],
        'abg' => ['Blood gas syringe', '#0f766e', 'Blood', 7],
        'urine' => ['Urine container', '#facc15', 'Urine', 8],
        'stool' => ['Stool container', '#92400e', 'Stool', 9],
        'sputum' => ['Sputum container', '#84cc16', 'Sputum', 10],
        'swab' => ['Swab', '#f97316', 'Swab', 11],
        'csf' => ['CSF tubes', '#e2e8f0', 'CSF', 12],
        'other' => ['Other container', '#6b7280', 'Other', 13],
    ];
    public const SECTIONS = ['hematology' => 'Hematology', 'coagulation' => 'Coagulation', 'chemistry' => 'Chemistry', 'blood_gas' => 'Blood gas',
        'urinalysis' => 'Urinalysis', 'microbiology' => 'Microbiology', 'serology' => 'Serology', 'blood_bank' => 'Blood bank', 'other' => 'Other'];
    public const METHODS = ['venipuncture' => 'Venipuncture', 'capillary' => 'Finger / heel prick', 'arterial' => 'Arterial puncture', 'line' => 'From a line (CVC / arterial)',
        'midstream' => 'Midstream urine', 'catheter' => 'From a urinary catheter', 'swab' => 'Swab', 'other' => 'Other'];
    private const OPEN_ER = "('waiting', 'triaged')";
    private const ACTIVE_ADM = "('Admitted', 'Pending Discharge')";

    // ------------------------------------------------------------------
    // Ordering
    // ------------------------------------------------------------------

    /** The orderable lab tests, by section / group. */
    public function catalog(): array
    {
        $rows = Database::connection()->query(
            "SELECT c.id, c.name, c.identifying_code, c.specimen_type, c.lab_container, c.lab_section, g.name AS group_name, c.sequence, g.sequence AS group_seq
             FROM procedure_order_configs c LEFT JOIN procedure_order_configs g ON g.id = c.parent_id AND g.deleted_at IS NULL
             WHERE c.deleted_at IS NULL AND c.procedure_tier = 'procedure_order' AND (c.order_test_type = 'Laboratory' OR c.lab_section IS NOT NULL OR c.lab_container IS NOT NULL)
             ORDER BY COALESCE(g.sequence, 999), g.name, c.sequence, c.name"
        )->fetchAll(PDO::FETCH_ASSOC);
        return array_map(fn($t) => ['id' => (int) $t['id'], 'name' => $t['name'], 'code' => $t['identifying_code'], 'group' => $t['group_name'] ?: 'Other tests',
            'container' => self::container($t), 'specimen' => $t['specimen_type']], $rows);
    }

    /** What the order dialog needs: the patient, where they are, tests already waiting, the doctors, the catalog. */
    public function orderContext(array $q, array $actor): ?array
    {
        $db = Database::connection();
        $ctx = $this->context($db, $q);
        if (!$ctx) {
            return null;
        }
        $pending = $db->prepare(
            "SELECT o.procedure_order_config_id AS test_id, c.name, o.status, r.request_no, r.ordered_at FROM patient_procedure_orders o
             JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id LEFT JOIN lab_requests r ON r.id = o.lab_request_id
             WHERE o.patient_id = :p AND o.deleted_at IS NULL AND o.status IN ('pending', 'collected') AND o.created_at >= NOW() - INTERVAL 1 DAY ORDER BY o.id DESC"
        );
        $pending->execute(['p' => $ctx['patient']['id']]);
        return $ctx + [
            'waiting' => $pending->fetchAll(PDO::FETCH_ASSOC),
            'catalog' => $this->catalog(),
            'doctors' => $this->doctors($db),
            'is_doctor' => in_array($actor['role'] ?? '', self::DOCTOR_ROLES, true),
            'options' => self::options(),
            'now' => (string) $db->query("SELECT NOW()")->fetchColumn(),
        ];
    }

    /**
     * data: patient_id | er_visit_id | admission_id, tests [config ids], priority, clinical_info, fasting, collect_at (blank = now),
     * order_mode + ordering_user_id (nurses: verbal / protocol for a named doctor), confirm (tests already waiting).
     */
    public function order(array $data, array $actor): array
    {
        $role = $actor['role'] ?? '';
        if (!in_array($role, self::ORDER_ROLES, true)) {
            return ['success' => false, 'message' => 'Lab tests are ordered by the doctors (or a nurse for a doctor).', 'forbidden' => true];
        }
        $db = Database::connection();
        $ctx = $this->context($db, $data);
        if (!$ctx) {
            return ['success' => false, 'message' => 'Patient not found.', 'not_found' => true];
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $errors = [];
        $ids = array_values(array_unique(array_map('intval', (array) ($data['tests'] ?? []))));
        $catalog = [];
        foreach ($this->catalog() as $t) {
            $catalog[$t['id']] = $t;
        }
        $tests = array_values(array_filter(array_map(fn($id) => $catalog[$id] ?? null, $ids)));
        if (!$tests || count($tests) !== count($ids)) {
            $errors['tests'] = 'Choose the tests.';
        }
        $priority = (string) ($data['priority'] ?? 'routine');
        if (!isset(self::PRIORITIES[$priority])) {
            $errors['priority'] = 'Routine, urgent or STAT?';
        }
        $collectAt = trim(str_replace('T', ' ', (string) ($data['collect_at'] ?? '')));
        if ($collectAt === '') {
            $collectAt = $now;
        } elseif (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', substr($collectAt, 0, 16)) || !strtotime($collectAt)) {
            $errors['collect_at'] = 'Use a real date and time.';
        } else {
            $collectAt = substr($collectAt, 0, 16) . ':00';
            if ($collectAt < substr($now, 0, 16) . ':00') {
                $collectAt = $now; // a time already past: collect now
            } elseif ($collectAt > gmdate('Y-m-d H:i:s', strtotime($now . ' UTC') + 7 * 86400)) {
                $errors['collect_at'] = 'At most a week ahead.';
            }
        }
        if ($priority === 'stat' && $collectAt > $now) {
            $collectAt = $now;
        }
        $isDoctor = in_array($role, self::DOCTOR_ROLES, true);
        $mode = $isDoctor ? (string) ($data['order_mode'] ?? 'written') : (string) ($data['order_mode'] ?? '');
        $orderingId = $isDoctor && $mode === 'written' ? (int) $actor['id'] : (int) ($data['ordering_user_id'] ?? 0);
        if (!isset(self::MODES[$mode]) || (!$isDoctor && $mode === 'written')) {
            $errors['order_mode'] = 'A verbal order or a protocol / standing order?';
        }
        if (!$isDoctor || $mode !== 'written') {
            if (!in_array($orderingId, array_map(fn($d) => (int) $d['id'], $this->doctors($db)), true)) {
                $errors['ordering_user_id'] = 'Which doctor ordered it?';
            }
        }
        $info = trim((string) ($data['clinical_info'] ?? ''));
        if (mb_strlen($info) > 500) {
            $errors['clinical_info'] = 'At most 500 characters.';
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        // The same test already waiting (ordered in the last day, not yet resulted)?
        $dupes = $db->prepare(
            "SELECT DISTINCT c.name FROM patient_procedure_orders o JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             WHERE o.patient_id = :p AND o.deleted_at IS NULL AND o.status IN ('pending', 'collected') AND o.created_at >= NOW() - INTERVAL 1 DAY
               AND o.procedure_order_config_id IN (" . implode(',', $ids) . ")"
        );
        $dupes->execute(['p' => $ctx['patient']['id']]);
        $dup = $dupes->fetchAll(PDO::FETCH_COLUMN);
        if ($dup && empty($data['confirm'])) {
            return ['success' => false, 'message' => 'Already ordered and not yet resulted: ' . implode(', ', $dup) . '. Order again anyway?', 'needs_confirm' => true, 'duplicates' => $dup];
        }

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT lab_order');
        try {
            $no = 'LR-' . $this->next($db, 'request', 3);
            $db->prepare(
                "INSERT INTO lab_requests (request_no, patient_id, source, er_visit_id, admission_id, location, priority, clinical_info, fasting, collect_at, order_mode,
                    ordering_user_id, ordered_by, ordered_at, status, created_at)
                 VALUES (:no, :p, :src, :er, :adm, :loc, :pr, :info, :f, :at, :mode, :ou, :by, NOW(), 'open', NOW())"
            )->execute(['no' => $no, 'p' => $ctx['patient']['id'], 'src' => $ctx['source'], 'er' => $ctx['er_visit_id'], 'adm' => $ctx['admission_id'], 'loc' => $ctx['location'],
                'pr' => $priority, 'info' => $info !== '' ? $info : null, 'f' => (int) !empty($data['fasting']), 'at' => $collectAt, 'mode' => $mode, 'ou' => $orderingId,
                'by' => (int) $actor['id']]);
            $rid = (int) $db->lastInsertId();
            $prov = $db->prepare("SELECT pr.id FROM providers pr JOIN employees e ON e.id = pr.employee_id WHERE e.user_id = :u AND pr.deleted_at IS NULL LIMIT 1");
            $prov->execute(['u' => $orderingId]);
            $providerId = $prov->fetchColumn() ?: null;
            $ins = $db->prepare(
                "INSERT INTO patient_procedure_orders (patient_id, procedure_order_config_id, provider_id, lab_request_id, priority, order_date, status, created_at, created_by)
                 VALUES (:p, :c, :pr, :r, :pri, CURDATE(), 'pending', NOW(), :u)"
            );
            foreach ($tests as $t) {
                $ins->execute(['p' => $ctx['patient']['id'], 'c' => $t['id'], 'pr' => $providerId, 'r' => $rid, 'pri' => $priority, 'u' => (int) $actor['id']]);
            }
            if ($priority === 'stat') {
                AlertService::raise([
                    'type' => 'lab_stat', 'urgency' => 'urgent',
                    'title' => "STAT lab to collect: " . implode(', ', array_map(fn($t) => $t['code'] ?: $t['name'], $tests)) . " — {$ctx['patient']['name']}" . ($ctx['location'] ? " ({$ctx['location']})" : ''),
                    'body' => "{$no}. Collect within " . self::OVERDUE['stat'] . " minutes." . ($info !== '' ? " {$info}" : ''),
                    'patient_id' => $ctx['patient']['id'], 'link' => ['tab' => 'lab_worklist'], 'targets' => [['role' => 'lab_technician']],
                    'source_type' => 'lab_requests', 'source_id' => $rid, 'dedupe_key' => "labstat:{$rid}",
                ]);
            }
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT lab_order');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT lab_order');
            throw $e;
        }
        $n = count($tests);
        return ['success' => true, 'message' => "{$no}: {$n} test" . ($n === 1 ? '' : 's') . ' sent to the lab worklist' . ($collectAt > $now ? ' (collect ' . substr($collectAt, 5, 11) . ')' : '') . '.',
            'data' => ['id' => $rid, 'request_no' => $no]];
    }

    /** data: order_id, reason -- cancel a test not collected yet (the request closes when nothing is left). */
    public function cancelTest(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::ORDER_ROLES, true)) {
            return ['success' => false, 'message' => 'Tests are cancelled by the doctors and nurses.', 'forbidden' => true];
        }
        $db = Database::connection();
        $st = $db->prepare("SELECT o.*, c.name FROM patient_procedure_orders o JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id WHERE o.id = :id AND o.deleted_at IS NULL");
        $st->execute(['id' => (int) ($data['order_id'] ?? 0)]);
        $o = $st->fetch(PDO::FETCH_ASSOC);
        if (!$o || !$o['lab_request_id'] || $o['status'] !== 'pending') {
            return ['success' => false, 'message' => 'Only a test not collected yet can be cancelled.', 'not_found' => true];
        }
        $reason = trim((string) ($data['reason'] ?? ''));
        if ($reason === '' || mb_strlen($reason) > 255) {
            return ['success' => false, 'message' => 'Why cancel it?', 'errors' => ['reason' => 'Required.']];
        }
        $db->prepare("UPDATE patient_procedure_orders SET status = 'cancelled', cancel_reason = :r, updated_at = NOW(), updated_by = :u WHERE id = :id")
            ->execute(['r' => $reason, 'u' => (int) $actor['id'], 'id' => $o['id']]);
        $this->refreshRequest($db, (int) $o['lab_request_id'], (int) $actor['id'], $reason);
        return ['success' => true, 'message' => "{$o['name']} cancelled."];
    }

    // ------------------------------------------------------------------
    // The worklist
    // ------------------------------------------------------------------

    /** filters: view (collect | collected), source, q (name, MRN, request or accession number). */
    public function worklist(array $f = []): array
    {
        $db = Database::connection();
        $this->adoptClinicOrders($db);
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $view = ($f['view'] ?? 'collect') === 'collected' ? 'collected' : 'collect';
        $where = [];
        $p = [];
        if (!empty($f['source']) && isset(self::SOURCES[$f['source']])) {
            $where[] = 'r.source = :src';
            $p['src'] = $f['source'];
        }
        $q = trim((string) ($f['q'] ?? ''));
        if ($q !== '') {
            $where[] = "(CONCAT_WS(' ', pt.first_name, pt.last_name) LIKE :q OR pt.patient_no LIKE :q2 OR r.request_no LIKE :q3
                OR EXISTS (SELECT 1 FROM lab_specimens s WHERE s.request_id = r.id AND s.accession_no LIKE :q4))";
            $p += ['q' => "%{$q}%", 'q2' => "%{$q}%", 'q3' => "%{$q}%", 'q4' => '%' . preg_replace('/\D/', '', $q) . '%'];
        }
        $cond = $where ? ' AND ' . implode(' AND ', $where) : '';
        if ($view === 'collect') {
            $sql = "SELECT r.* FROM lab_requests r JOIN patients pt ON pt.id = r.patient_id WHERE r.status = 'open'{$cond}
                    ORDER BY FIELD(r.priority, 'stat', 'urgent', 'routine'), r.collect_at, r.id";
        } else {
            $sql = "SELECT r.* FROM lab_requests r JOIN patients pt ON pt.id = r.patient_id
                    WHERE EXISTS (SELECT 1 FROM lab_specimens s WHERE s.request_id = r.id AND s.collected_at >= NOW() - INTERVAL 24 HOUR){$cond}
                    ORDER BY (SELECT MAX(s.collected_at) FROM lab_specimens s WHERE s.request_id = r.id) DESC LIMIT 200";
        }
        $st = $db->prepare($sql);
        $st->execute($p);
        $rows = array_map(fn($r) => $this->shapeRequest($db, $r, $now), $st->fetchAll(PDO::FETCH_ASSOC));
        if ($view === 'collect') {
            $rows = array_values(array_filter($rows, fn($r) => $r['tests_to_collect']));
        }
        $c = $db->query(
            "SELECT COUNT(*) AS open_, SUM(priority = 'stat') AS stat, SUM(collect_at <= NOW()) AS due,
                    SUM(TIMESTAMPDIFF(MINUTE, collect_at, NOW()) > CASE priority WHEN 'stat' THEN " . self::OVERDUE['stat'] . " WHEN 'urgent' THEN " . self::OVERDUE['urgent'] . " ELSE " . self::OVERDUE['routine'] . " END) AS overdue
             FROM lab_requests WHERE status = 'open'"
        )->fetch(PDO::FETCH_ASSOC);
        return ['view' => $view, 'now' => $now, 'requests' => $rows,
            'counts' => ['to_collect' => (int) $c['open_'], 'stat' => (int) $c['stat'], 'due' => (int) $c['due'], 'overdue' => (int) $c['overdue'],
                'collected_today' => (int) $db->query("SELECT COUNT(*) FROM lab_specimens WHERE voided_at IS NULL AND collected_at >= CURDATE()")->fetchColumn()],
            'options' => self::options(), 'collectors' => $this->collectors($db)];
    }

    // ------------------------------------------------------------------
    // Collection
    // ------------------------------------------------------------------

    /**
     * data: request_id, order_ids (the tests collected now), collected_at (blank = now), method, site, id_checked (1),
     * notes, collector_id (default: whoever records it).
     */
    public function collect(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::COLLECT_ROLES, true)) {
            return ['success' => false, 'message' => 'Specimens are collected by the lab, nurses and doctors.', 'forbidden' => true];
        }
        $db = Database::connection();
        $r = $this->request($db, (int) ($data['request_id'] ?? 0));
        if (!$r || $r['status'] !== 'open') {
            return ['success' => false, 'message' => 'This request has nothing left to collect.', 'not_found' => true];
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $tests = $this->tests($db, (int) $r['id']);
        $pending = [];
        foreach ($tests as $t) {
            if ($t['status'] === 'pending') {
                $pending[$t['id']] = $t;
            }
        }
        $ids = array_values(array_unique(array_map('intval', (array) ($data['order_ids'] ?? []))));
        $errors = [];
        if (!$ids || array_diff($ids, array_keys($pending))) {
            $errors['order_ids'] = 'Tick the tests collected now.';
        }
        if (empty($data['id_checked'])) {
            $errors['id_checked'] = "Check the patient's identity with two identifiers (name and date of birth or MRN on the wristband) before labelling.";
        }
        $at = trim(str_replace('T', ' ', (string) ($data['collected_at'] ?? '')));
        if ($at === '') {
            $at = $now;
        } elseif (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/', $at) || !strtotime($at)) {
            $errors['collected_at'] = 'Use a real date and time.';
        } else {
            $at = substr($at, 0, 16) . ':00';
            if ($at > $now) {
                $errors['collected_at'] = 'Not in the future.';
            } elseif (strtotime($at . ' UTC') < strtotime($r['ordered_at'] . ' UTC') - 3600) {
                $errors['collected_at'] = 'More than an hour before the order (' . substr($r['ordered_at'], 0, 16) . ').';
            }
        }
        $method = (string) ($data['method'] ?? '');
        if ($method !== '' && !isset(self::METHODS[$method])) {
            $errors['method'] = 'Choose how it was collected.';
        }
        $collector = (int) ($data['collector_id'] ?? 0) ?: (int) $actor['id'];
        if ($collector !== (int) $actor['id'] && !in_array($collector, array_map(fn($u) => (int) $u['id'], $this->collectors($db)), true)) {
            $errors['collector_id'] = 'Choose who collected it.';
        }
        foreach (['site' => 60, 'notes' => 255] as $k => $max) {
            if (mb_strlen(trim((string) ($data[$k] ?? ''))) > $max) {
                $errors[$k] = "At most {$max} characters.";
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        // One specimen per tube, in the order of draw.
        $byTube = [];
        foreach ($ids as $id) {
            $byTube[$pending[$id]['container']][] = $pending[$id];
        }
        uksort($byTube, fn($a, $b) => self::CONTAINERS[$a][3] <=> self::CONTAINERS[$b][3]);
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT lab_collect');
        $made = [];
        try {
            $sp = $db->prepare(
                "INSERT INTO lab_specimens (accession_no, request_id, patient_id, container, specimen_type, collected_at, collected_by, recorded_by, method, site, id_checked, notes, created_at)
                 VALUES (:acc, :r, :p, :c, :t, :at, :by, :rec, :m, :site, 1, :n, NOW())"
            );
            $upd = $db->prepare(
                "UPDATE patient_procedure_orders SET status = 'collected', specimen_id = :s, collected_at = :at, collected_by = :by, ext_time_collected = :at2, specimen = :lbl,
                    updated_at = NOW(), updated_by = :u WHERE id = :id AND status = 'pending'"
            );
            foreach ($byTube as $tube => $list) {
                $acc = $this->next($db, 'accession', 4, '');
                $site = trim((string) ($data['site'] ?? ''));
                $notes = trim((string) ($data['notes'] ?? ''));
                $sp->execute(['acc' => $acc, 'r' => $r['id'], 'p' => $r['patient_id'], 'c' => $tube, 't' => $list[0]['specimen'] ?: self::CONTAINERS[$tube][2], 'at' => $at,
                    'by' => $collector, 'rec' => (int) $actor['id'], 'm' => $method !== '' ? $method : null, 'site' => $site !== '' ? $site : null, 'n' => $notes !== '' ? $notes : null]);
                $sid = (int) $db->lastInsertId();
                foreach ($list as $t) {
                    $upd->execute(['s' => $sid, 'at' => $at, 'by' => $collector, 'at2' => $at, 'lbl' => mb_substr(self::CONTAINERS[$tube][0], 0, 100), 'u' => (int) $actor['id'], 'id' => $t['id']]);
                    if ($upd->rowCount() !== 1) {
                        throw new \RuntimeException('A test was collected by someone else just now. Refresh and try again.');
                    }
                }
                $made[] = $sid;
            }
            $this->refreshRequest($db, (int) $r['id']);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT lab_collect');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT lab_collect');
            if ($e instanceof \RuntimeException && !($e instanceof \PDOException)) {
                return ['success' => false, 'message' => $e->getMessage()];
            }
            throw $e;
        }
        $n = count($made);
        return ['success' => true, 'message' => "{$n} specimen" . ($n === 1 ? '' : 's') . ' collected. Print the labels and stick them on at the bedside.',
            'data' => ['specimens' => $this->labelData($db, $made)]];
    }

    /** Collected in error (wrong patient, wrong tube, not actually taken): the tests go back to "to collect". */
    public function voidSpecimen(int $id, string $reason, array $actor): array
    {
        $db = Database::connection();
        $s = $db->prepare("SELECT * FROM lab_specimens WHERE id = :id");
        $s->execute(['id' => $id]);
        $sp = $s->fetch(PDO::FETCH_ASSOC);
        if (!$sp || $sp['voided_at']) {
            return ['success' => false, 'message' => 'Specimen not found.', 'not_found' => true];
        }
        $mine = in_array((int) ($actor['id'] ?? 0), [(int) $sp['collected_by'], (int) $sp['recorded_by']], true);
        if (!$mine && !in_array($actor['role'] ?? '', ['admin', 'lab_technician', 'charge_nurse'], true)) {
            return ['success' => false, 'message' => 'Only the person who collected it, the lab, a charge nurse or an admin can void it.', 'forbidden' => true];
        }
        $reason = trim($reason);
        if ($reason === '' || mb_strlen($reason) > 255) {
            return ['success' => false, 'message' => 'Why void it?', 'errors' => ['reason' => 'Required.']];
        }
        $done = $db->prepare("SELECT COUNT(*) FROM patient_procedure_orders WHERE specimen_id = :s AND deleted_at IS NULL AND status <> 'collected'");
        $done->execute(['s' => $id]);
        if ((int) $done->fetchColumn() > 0) {
            return ['success' => false, 'message' => 'The lab has already worked on this specimen.'];
        }
        $owns = !$db->inTransaction();
        $owns && $db->beginTransaction();
        try {
            $db->prepare("UPDATE lab_specimens SET voided_at = NOW(), voided_by = :u, void_reason = :r WHERE id = :id")->execute(['u' => (int) $actor['id'], 'r' => $reason, 'id' => $id]);
            $db->prepare("UPDATE patient_procedure_orders SET status = 'pending', specimen_id = NULL, collected_at = NULL, collected_by = NULL, ext_time_collected = NULL, specimen = NULL,
                updated_at = NOW(), updated_by = :u WHERE specimen_id = :s AND deleted_at IS NULL")->execute(['u' => (int) $actor['id'], 's' => $id]);
            $this->refreshRequest($db, (int) $sp['request_id']);
            $owns && $db->commit();
        } catch (\Throwable $e) {
            $owns && $db->rollBack();
            throw $e;
        }
        return ['success' => true, 'message' => "Specimen {$sp['accession_no']} voided: its tests are back on the worklist to collect."];
    }

    /** Label data for specimens (and count the print). */
    public function labels(array $ids, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::VIEW_ROLES, true)) {
            return ['success' => false, 'message' => 'Not allowed.', 'forbidden' => true];
        }
        $db = Database::connection();
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) {
            return ['success' => false, 'message' => 'Choose the specimens.'];
        }
        $db->exec("UPDATE lab_specimens SET labels_printed = labels_printed + 1, last_printed_at = NOW() WHERE voided_at IS NULL AND id IN (" . implode(',', $ids) . ")");
        return ['success' => true, 'message' => 'Labels ready.', 'data' => ['specimens' => $this->labelData($db, $ids)]];
    }

    public static function options(): array
    {
        return ['priorities' => self::PRIORITIES, 'sources' => self::SOURCES, 'modes' => self::MODES, 'containers' => self::CONTAINERS, 'sections' => self::SECTIONS,
            'methods' => self::METHODS, 'overdue' => self::OVERDUE];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** The tube a test goes in: set on the test, else guessed from its name and specimen. */
    public static function container(array $t): string
    {
        if (!empty($t['lab_container']) && isset(self::CONTAINERS[$t['lab_container']])) {
            return $t['lab_container'];
        }
        $n = strtolower(($t['name'] ?? '') . ' ' . ($t['specimen_type'] ?? ''));
        $rules = [
            'culture' => '/blood culture/', 'urine' => '/urine|urinalysis/', 'stool' => '/stool|fecal|faecal/', 'sputum' => '/sputum/', 'csf' => '/\bcsf\b|cerebrospinal/',
            'swab' => '/swab/', 'abg' => '/blood gas|\babg\b|\bvbg\b/', 'citrate' => '/\b(pt|inr|aptt|ptt)\b|prothrombin|d-?dimer|fibrinogen|coag/',
            'edta' => '/\bcbc\b|blood count|hemoglobin|haemoglobin|hba1c|\besr\b|platelet|blood typ|crossmatch|smear|coombs|reticulocyte/',
            'fluoride' => '/glucose|sugar|\bfbs\b|\brbs\b|lactate/', 'heparin' => '/troponin/', 'sst' => '/serum|blood|plasma/',
        ];
        foreach ($rules as $k => $re) {
            if (preg_match($re, $n)) {
                return $k;
            }
        }
        return 'other';
    }

    /** Patient, source and location from er_visit_id / admission_id / patient_id. */
    private function context(PDO $db, array $q): ?array
    {
        $erId = (int) ($q['er_visit_id'] ?? 0);
        $admId = (int) ($q['admission_id'] ?? 0);
        $pid = (int) ($q['patient_id'] ?? 0);
        $source = 'clinic';
        $location = null;
        if ($erId) {
            $st = $db->prepare("SELECT v.*, b.name AS bed_name FROM er_visits v LEFT JOIN er_beds b ON b.id = v.er_bed_id WHERE v.id = :id AND v.status IN " . self::OPEN_ER);
            $st->execute(['id' => $erId]);
            $v = $st->fetch(PDO::FETCH_ASSOC);
            if (!$v) {
                return null;
            }
            $pid = (int) $v['patient_id'];
            $source = 'er';
            $location = 'ER · ' . ($v['bed_name'] ?: 'waiting room');
        } elseif ($admId) {
            $st = $db->prepare(
                "SELECT a.*, w.ward_name, w.ward_type, b.bed_number FROM inpatient_admissions a JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id
                 WHERE a.id = :id AND a.status IN " . self::ACTIVE_ADM
            );
            $st->execute(['id' => $admId]);
            $a = $st->fetch(PDO::FETCH_ASSOC);
            if (!$a || !$a['patient_id']) {
                return null;
            }
            $pid = (int) $a['patient_id'];
            $source = $a['ward_type'] === 'ICU' ? 'icu' : 'ward';
            $location = "{$a['ward_name']} · {$a['bed_number']}";
        }
        $p = $db->prepare("SELECT id, patient_no, first_name, middle_name, last_name, sex, birthdate FROM patients WHERE id = :id AND deleted_at IS NULL");
        $p->execute(['id' => $pid]);
        $pt = $p->fetch(PDO::FETCH_ASSOC);
        if (!$pt) {
            return null;
        }
        return ['patient' => self::patientOut($pt), 'source' => $source, 'source_label' => self::SOURCES[$source], 'location' => $location,
            'er_visit_id' => $erId ?: null, 'admission_id' => $admId ?: null];
    }

    private static function patientOut(array $p): array
    {
        $age = null;
        if ($p['birthdate']) {
            $age = (new \DateTimeImmutable($p['birthdate']))->diff(new \DateTimeImmutable('today'))->y;
        }
        return ['id' => (int) $p['id'], 'name' => trim(preg_replace('/\s+/', ' ', "{$p['first_name']} {$p['middle_name']} {$p['last_name']}")),
            'last_name' => $p['last_name'], 'first_name' => $p['first_name'], 'mrn' => $p['patient_no'], 'sex' => $p['sex'], 'birthdate' => $p['birthdate'], 'age' => $age];
    }

    /** A request for the worklist: patient, where they are now, tests (with tubes), specimens, due / overdue. */
    private function shapeRequest(PDO $db, array $r, string $now): array
    {
        $p = $db->prepare("SELECT id, patient_no, first_name, middle_name, last_name, sex, birthdate FROM patients WHERE id = :id");
        $p->execute(['id' => $r['patient_id']]);
        $tests = $this->tests($db, (int) $r['id']);
        $sp = $db->prepare(
            "SELECT s.*, " . self::nameSql('s.collected_by') . " AS collected_by_name FROM lab_specimens s WHERE s.request_id = :r ORDER BY s.collected_at, s.id"
        );
        $sp->execute(['r' => $r['id']]);
        $late = intdiv(strtotime($now . ' UTC') - strtotime($r['collect_at'] . ' UTC'), 60);
        $todo = array_values(array_filter($tests, fn($t) => $t['status'] === 'pending'));
        return [
            'id' => (int) $r['id'], 'request_no' => $r['request_no'], 'priority' => $r['priority'], 'source' => $r['source'], 'source_label' => self::SOURCES[$r['source']] ?? $r['source'],
            'location' => $this->whereNow($db, $r) ?? $r['location'], 'ordered_location' => $r['location'], 'clinical_info' => $r['clinical_info'], 'fasting' => (bool) $r['fasting'],
            'ordered_at' => $r['ordered_at'], 'collect_at' => $r['collect_at'], 'due' => $r['collect_at'] <= $now, 'minutes_waiting' => max(0, $late),
            'overdue' => $r['status'] === 'open' && $late > (self::OVERDUE[$r['priority']] ?? 240), 'order_mode' => $r['order_mode'],
            'ordering_doctor' => $r['ordering_user_id'] ? $this->userName($db, (int) $r['ordering_user_id']) : null,
            'ordered_by' => $r['ordered_by'] ? $this->userName($db, (int) $r['ordered_by']) : null, 'status' => $r['status'],
            'patient' => self::patientOut($p->fetch(PDO::FETCH_ASSOC)), 'tests' => $tests, 'tests_to_collect' => count($todo),
            'specimens' => array_map(fn($s) => ['id' => (int) $s['id'], 'accession_no' => $s['accession_no'], 'container' => $s['container'],
                'container_label' => self::CONTAINERS[$s['container']][0] ?? $s['container'], 'collected_at' => $s['collected_at'], 'collected_by' => $s['collected_by_name'],
                'method' => $s['method'] ? (self::METHODS[$s['method']] ?? $s['method']) : null, 'site' => $s['site'], 'labels_printed' => (int) $s['labels_printed'],
                'voided' => $s['voided_at'] !== null, 'void_reason' => $s['void_reason'],
                'tests' => array_values(array_map(fn($t) => $t['code'] ?: $t['name'], array_filter($tests, fn($t) => $t['specimen_id'] === (int) $s['id'])))], $sp->fetchAll(PDO::FETCH_ASSOC)),
        ];
    }

    private function tests(PDO $db, int $requestId): array
    {
        $st = $db->prepare(
            "SELECT o.id, o.status, o.specimen_id, o.cancel_reason, o.collected_at, c.id AS test_id, c.name, c.identifying_code, c.specimen_type, c.lab_container, c.lab_section
             FROM patient_procedure_orders o JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             WHERE o.lab_request_id = :r AND o.deleted_at IS NULL ORDER BY o.id"
        );
        $st->execute(['r' => $requestId]);
        return array_map(fn($t) => ['id' => (int) $t['id'], 'test_id' => (int) $t['test_id'], 'name' => $t['name'], 'code' => $t['identifying_code'], 'status' => $t['status'],
            'container' => self::container($t), 'specimen' => $t['specimen_type'] && $t['specimen_type'] !== 'Not Applicable' ? $t['specimen_type'] : null,
            'section' => $t['lab_section'], 'specimen_id' => $t['specimen_id'] !== null ? (int) $t['specimen_id'] : null, 'cancel_reason' => $t['cancel_reason']],
            $st->fetchAll(PDO::FETCH_ASSOC));
    }

    /** Where the patient is now (ER bed / ward bed), when the request came from there. */
    private function whereNow(PDO $db, array $r): ?string
    {
        if ($r['admission_id']) {
            $st = $db->prepare("SELECT w.ward_name, b.bed_number, a.status FROM inpatient_admissions a JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id WHERE a.id = :id");
            $st->execute(['id' => $r['admission_id']]);
            $a = $st->fetch(PDO::FETCH_ASSOC);
            return $a && in_array($a['status'], ['Admitted', 'Pending Discharge'], true) ? "{$a['ward_name']} · {$a['bed_number']}" : null;
        }
        if ($r['er_visit_id']) {
            $st = $db->prepare("SELECT v.status, b.name FROM er_visits v LEFT JOIN er_beds b ON b.id = v.er_bed_id WHERE v.id = :id");
            $st->execute(['id' => $r['er_visit_id']]);
            $v = $st->fetch(PDO::FETCH_ASSOC);
            return $v && in_array($v['status'], ['waiting', 'triaged'], true) ? 'ER · ' . ($v['name'] ?: 'waiting room') : null;
        }
        return null;
    }

    /** Open / collected / cancelled from its tests; the STAT alert closes once nothing is left to collect. */
    private function refreshRequest(PDO $db, int $id, ?int $by = null, ?string $reason = null): void
    {
        $st = $db->prepare("SELECT SUM(status = 'pending') AS todo, SUM(status NOT IN ('pending', 'cancelled')) AS done FROM patient_procedure_orders WHERE lab_request_id = :r AND deleted_at IS NULL");
        $st->execute(['r' => $id]);
        $c = $st->fetch(PDO::FETCH_ASSOC);
        $status = (int) $c['todo'] > 0 ? 'open' : ((int) $c['done'] > 0 ? 'collected' : 'cancelled');
        $db->prepare("UPDATE lab_requests SET status = :s, cancelled_at = IF(:s2 = 'cancelled', NOW(), NULL), cancelled_by = IF(:s3 = 'cancelled', :by, NULL),
            cancel_reason = IF(:s4 = 'cancelled', :r, NULL) WHERE id = :id")
            ->execute(['s' => $status, 's2' => $status, 's3' => $status, 'by' => $by, 's4' => $status, 'r' => $reason, 'id' => $id]);
        if ($status !== 'open') {
            $db->prepare("UPDATE alerts SET resolved_at = NOW(), resolve_note = :n WHERE dedupe_key = :k AND resolved_at IS NULL")
                ->execute(['n' => $status === 'collected' ? 'Collected' : 'Cancelled', 'k' => "labstat:{$id}"]);
        }
    }

    /**
     * Lab tests ordered on the patient's Procedures screen (clinic) in the last 3 days without a request: one request
     * per patient, order date and person who ordered, so they reach the worklist too.
     */
    private function adoptClinicOrders(PDO $db): void
    {
        $rows = $db->query(
            "SELECT o.id, o.patient_id, o.order_date, o.created_by, o.created_at, o.provider_id FROM patient_procedure_orders o JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             WHERE o.lab_request_id IS NULL AND o.deleted_at IS NULL AND o.status = 'pending' AND o.created_at >= NOW() - INTERVAL 3 DAY
               AND (c.order_test_type = 'Laboratory' OR c.lab_section IS NOT NULL OR c.lab_container IS NOT NULL) ORDER BY o.id"
        )->fetchAll(PDO::FETCH_ASSOC);
        $groups = [];
        foreach ($rows as $o) {
            $groups["{$o['patient_id']}|{$o['order_date']}|{$o['created_by']}"][] = $o;
        }
        foreach ($groups as $list) {
            $o = $list[0];
            $doc = $o['provider_id'] ? $db->query("SELECT e.user_id FROM providers pr JOIN employees e ON e.id = pr.employee_id WHERE pr.id = " . (int) $o['provider_id'])->fetchColumn() : null;
            $db->prepare(
                "INSERT INTO lab_requests (request_no, patient_id, source, priority, collect_at, order_mode, ordering_user_id, ordered_by, ordered_at, status, created_at)
                 VALUES (:no, :p, 'clinic', 'routine', :at, 'written', :ou, :by, :at2, 'open', NOW())"
            )->execute(['no' => 'LR-' . $this->next($db, 'request', 3), 'p' => $o['patient_id'], 'at' => $o['created_at'] ?: date('Y-m-d H:i:s'), 'ou' => $doc ?: $o['created_by'],
                'by' => $o['created_by'], 'at2' => $o['created_at'] ?: date('Y-m-d H:i:s')]);
            $rid = (int) $db->lastInsertId();
            $db->exec("UPDATE patient_procedure_orders SET lab_request_id = {$rid}, priority = 'routine' WHERE id IN (" . implode(',', array_map(fn($x) => (int) $x['id'], $list)) . ")");
        }
    }

    private function labelData(PDO $db, array $ids): array
    {
        $out = [];
        foreach ($ids as $id) {
            $st = $db->prepare(
                "SELECT s.*, r.request_no, r.priority, r.location, r.source, " . self::nameSql('s.collected_by') . " AS collected_by_name,
                        p.id AS pid, p.patient_no, p.first_name, p.middle_name, p.last_name, p.sex, p.birthdate
                 FROM lab_specimens s JOIN lab_requests r ON r.id = s.request_id JOIN patients p ON p.id = s.patient_id WHERE s.id = :id"
            );
            $st->execute(['id' => $id]);
            $s = $st->fetch(PDO::FETCH_ASSOC);
            if (!$s) {
                continue;
            }
            $t = $db->prepare("SELECT COALESCE(NULLIF(c.identifying_code, ''), c.name) FROM patient_procedure_orders o JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
                WHERE o.specimen_id = :s AND o.deleted_at IS NULL ORDER BY o.id");
            $t->execute(['s' => $id]);
            $out[] = ['id' => (int) $s['id'], 'accession_no' => $s['accession_no'], 'request_no' => $s['request_no'], 'priority' => $s['priority'],
                'container' => $s['container'], 'container_label' => self::CONTAINERS[$s['container']][0] ?? $s['container'], 'colour' => self::CONTAINERS[$s['container']][1] ?? '#6b7280',
                'specimen_type' => $s['specimen_type'], 'collected_at' => $s['collected_at'], 'collected_by' => $s['collected_by_name'], 'location' => $s['location'],
                'tests' => $t->fetchAll(PDO::FETCH_COLUMN), 'voided' => $s['voided_at'] !== null, 'labels_printed' => (int) $s['labels_printed'],
                'patient' => self::patientOut(['id' => $s['pid'], 'patient_no' => $s['patient_no'], 'first_name' => $s['first_name'], 'middle_name' => $s['middle_name'],
                    'last_name' => $s['last_name'], 'sex' => $s['sex'], 'birthdate' => $s['birthdate']])];
        }
        return $out;
    }

    /** The day's next number: request "YYMMDD-NNN" / accession "YYMMDDNNNN". */
    private function next(PDO $db, string $kind, int $digits, string $sep = '-'): string
    {
        $db->prepare("INSERT INTO lab_counters (kind, day, last_no) VALUES (:k, CURDATE(), LAST_INSERT_ID(1)) ON DUPLICATE KEY UPDATE last_no = LAST_INSERT_ID(last_no + 1)")
            ->execute(['k' => $kind]);
        $n = (int) $db->query("SELECT LAST_INSERT_ID()")->fetchColumn();
        return $db->query("SELECT DATE_FORMAT(CURDATE(), '%y%m%d')")->fetchColumn() . $sep . str_pad((string) $n, $digits, '0', STR_PAD_LEFT);
    }

    private function request(PDO $db, int $id): ?array
    {
        $st = $db->prepare("SELECT * FROM lab_requests WHERE id = :id");
        $st->execute(['id' => $id]);
        return $st->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function doctors(PDO $db): array
    {
        return $db->query(
            "SELECT u.id, " . self::nameSql('u.id') . " AS name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.deleted_at IS NULL AND r.name IN ('doctor', 'clinician') ORDER BY name"
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    /** Staff who may have collected a specimen. */
    private function collectors(PDO $db): array
    {
        return $db->query(
            "SELECT u.id, " . self::nameSql('u.id') . " AS name, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id
             WHERE u.deleted_at IS NULL AND r.name IN ('lab_technician', 'nurse', 'charge_nurse', 'doctor', 'clinician') ORDER BY name"
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    private function userName(PDO $db, int $id): ?string
    {
        $st = $db->prepare("SELECT " . self::nameSql(':id'));
        $st->execute(['id' => $id]);
        return $st->fetchColumn() ?: null;
    }

    public static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL WHERE nu.id = {$column} LIMIT 1)";
    }
}
