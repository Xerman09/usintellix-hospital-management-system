<?php

namespace App\Modules\MyWork\Services;

use App\Core\Database;
use App\Modules\InpatientOrders\Services\MarService;
use App\Modules\InpatientOrders\Services\MedOrderService;
use App\Modules\InpatientOrders\Services\RestockService;
use App\Modules\InpatientVitals\Services\InpatientVitalsService;
use App\Modules\NursingStaff\Services\NursingShiftService;
use App\Modules\ResultsInbox\Services\ResultsInboxService;
use PDO;

/**
 * My Work (module 8, Phase 1): the first screen after login, what is assigned to me today.
 *
 *   nurse / charge nurse -- my patients this shift, medicines due, vitals due, tasks
 *   CNA                  -- my patients, vitals due, tasks (no medicines)
 *   doctor / clinician   -- my patients (admitted), results to review, today's appointments, OR cases
 *   pharmacist           -- medicine orders to verify, ward restock requests
 *   lab technician       -- pending lab and radiology orders
 *   admin                -- the hospital's pharmacy and lab queues
 *
 * Each section is read from the module that owns it (the MAR, vital signs, results inbox, ...),
 * so the numbers match what those screens show.
 */
class MyWorkService
{
    public const VIEWS = [
        'nurse' => 'nurse', 'charge_nurse' => 'nurse', 'cna' => 'cna',
        'doctor' => 'doctor', 'clinician' => 'doctor',
        'pharmacist' => 'pharmacy', 'lab_technician' => 'lab', 'admin' => 'admin',
    ];
    /** OR cases this many days ahead are listed too (today first). */
    private const OR_DAYS_AHEAD = 1;

    public function forUser(array $user): array
    {
        $role = (string) ($user['role'] ?? '');
        $view = self::VIEWS[$role] ?? null;
        $db = Database::connection();
        $out = [
            'view' => $view, 'role' => $role, 'name' => $this->userName($db, (int) ($user['id'] ?? 0)),
            'today' => (string) $db->query("SELECT CURDATE()")->fetchColumn(), 'now' => (string) $db->query("SELECT NOW()")->fetchColumn(),
            'sections' => [],
        ];
        $s = [];
        switch ($view) {
            case 'nurse':
            case 'cna':
                $s = $this->nurse($user, $view === 'cna');
                $out['shift'] = $s['_shift'];
                unset($s['_shift']);
                break;
            case 'doctor':
                $s = $this->doctor($db, $user);
                break;
            case 'pharmacy':
                $s = ['verify' => $this->toVerify(), 'restock' => $this->restock()];
                break;
            case 'lab':
                $s = $this->lab($db);
                break;
            case 'admin':
                $s = ['verify' => $this->toVerify(), 'restock' => $this->restock()] + $this->lab($db);
                break;
        }
        if ($view) {
            // Tasks for everyone: tasks given to me (or my role / as the patient's nurse), and reminders due.
            $s['work_tasks'] = (new TaskService())->forUser($user);
            if (!isset($s['tasks'])) {
                $s['tasks'] = $this->tasks($user, []);
            }
        }
        $out['sections'] = $s;
        return $out;
    }

    // ------------------------------------------------------------------
    // Nurse / CNA
    // ------------------------------------------------------------------

    private function nurse(array $user, bool $cna): array
    {
        $mine = (new NursingShiftService())->mine($user);
        $ids = array_map(fn($p) => $p['admission_id'], $mine['patients']);
        $vitals = $ids ? (new InpatientVitalsService())->summaries($ids) : [];
        $meds = [];
        $totals = ['late' => 0, 'due' => 0, 'upcoming' => 0];
        if (!$cna && $ids) {
            $board = (new MarService())->board(['ward_id' => 'mine'], $user);
            foreach ($board['patients'] as $p) {
                $meds[$p['admission_id']] = $p;
            }
            $totals = array_intersect_key($board['totals'], $totals);
        }
        $patients = [];
        foreach ($mine['patients'] as $p) {
            $id = $p['admission_id'];
            $v = $vitals[$id] ?? null;
            $m = $meds[$id] ?? null;
            $patients[] = [
                'admission_id' => $id, 'patient_id' => $p['patient_id'], 'patient_name' => $p['patient_name'], 'patient_mrn' => $p['patient_mrn'],
                'ward' => $p['ward'], 'room' => $p['room'], 'bed' => $p['bed'], 'diagnosis' => $p['diagnosis'], 'isolation' => $p['isolation'],
                'my_role' => $p['my_role'], 'nurse_name' => $p['nurse_name'], 'cna_name' => $p['cna_name'],
                'vitals' => $v ? ['state' => $v['status']['state'], 'next_due' => $v['status']['next_due'], 'minutes' => $v['status']['minutes'], 'never' => $v['status']['never'],
                    'news2' => $v['news2'] ? ['score' => $v['news2']['score'], 'risk' => $v['news2']['risk'], 'label' => $v['news2']['risk_label']] : null] : null,
                // Medicines are given by the patient's nurse (not the CNA).
                'meds' => $m && $m['is_mine'] ? ['late' => $m['counts']['late'], 'due' => $m['counts']['due'], 'next_due_at' => $m['next_due_at'],
                    'late_high_alert' => $m['late_high_alert']] : null,
                'handover' => $p['incoming_handover'],
            ];
        }
        $order = ['overdue' => 0, 'due' => 1, 'due_soon' => 2];
        $vitalsDue = array_values(array_filter($patients, fn($p) => $p['vitals'] && isset($order[$p['vitals']['state']])));
        usort($vitalsDue, fn($a, $b) => [$order[$a['vitals']['state']], $a['vitals']['next_due']] <=> [$order[$b['vitals']['state']], $b['vitals']['next_due']]);
        $medsDue = array_values(array_filter($patients, fn($p) => $p['meds'] && ($p['meds']['late'] || $p['meds']['due'])));
        usort($medsDue, fn($a, $b) => [-$a['meds']['late'], -$a['meds']['due']] <=> [-$b['meds']['late'], -$b['meds']['due']]);

        $out = [
            '_shift' => ['date' => $mine['current']['date'], 'name' => $mine['current']['shift']['name'] ?? null,
                'start' => $mine['current']['shift']['start'] ?? null, 'end' => $mine['current']['shift']['end'] ?? null],
            'patients' => ['items' => $patients, 'count' => count($patients)],
            'vitals' => ['items' => $vitalsDue, 'overdue' => count(array_filter($vitalsDue, fn($p) => $p['vitals']['state'] === 'overdue')),
                'due' => count(array_filter($vitalsDue, fn($p) => $p['vitals']['state'] === 'due')),
                'due_soon' => count(array_filter($vitalsDue, fn($p) => $p['vitals']['state'] === 'due_soon'))],
            'tasks' => $this->tasks($user, $patients),
        ];
        if (!$cna) {
            $out['meds'] = ['items' => $medsDue, 'late' => (int) $totals['late'], 'due' => (int) $totals['due'], 'upcoming' => (int) $totals['upcoming']];
        }
        return $out;
    }

    /** Hand-overs to read for my patients, and reminders sent to me that are due (or overdue). */
    private function tasks(array $user, array $patients): array
    {
        $items = [];
        foreach ($patients as $p) {
            if ($p['handover'] && !$p['handover']['received']) {
                $items[] = ['type' => 'handover', 'title' => "Read the hand-over for {$p['patient_name']}", 'admission_id' => $p['admission_id'],
                    'patient_id' => $p['patient_id'], 'detail' => trim("{$p['ward']} {$p['bed']}") . ($p['handover']['written_by_name'] ? " · from {$p['handover']['written_by_name']}" : ''),
                    'overdue' => false];
            }
        }
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT r.id, r.body, r.due_date, r.priority, r.patient_id, NULLIF(TRIM(CONCAT(pt.first_name, ' ', pt.last_name)), '') AS patient_name,
                    (r.due_date < CURDATE()) AS overdue,
                    COALESCE(NULLIF(TRIM(CONCAT(se.first_name, ' ', se.last_name)), ''), su.username) AS sender_name
             FROM reminder_recipients rr JOIN reminders r ON r.id = rr.reminder_id AND r.deleted_at IS NULL
             LEFT JOIN patients pt ON pt.id = r.patient_id
             LEFT JOIN users su ON su.id = r.sender_id LEFT JOIN employees se ON se.user_id = su.id AND se.deleted_at IS NULL
             WHERE rr.user_id = :u AND rr.completed_at IS NULL AND (r.due_date IS NULL OR r.due_date <= CURDATE())
             ORDER BY r.due_date IS NULL, r.due_date, FIELD(r.priority, 'high', 'medium', 'low'), r.id LIMIT 30"
        );
        $stmt->execute(['u' => (int) $user['id']]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $items[] = ['type' => 'reminder', 'id' => (int) $r['id'], 'title' => $r['body'], 'priority' => $r['priority'], 'due_date' => $r['due_date'],
                'patient_id' => $r['patient_id'] !== null ? (int) $r['patient_id'] : null, 'patient_name' => $r['patient_name'],
                'detail' => ($r['sender_name'] ? "From {$r['sender_name']}" : ''), 'overdue' => (int) $r['overdue'] === 1];
        }
        return ['items' => $items, 'count' => count($items)];
    }

    // ------------------------------------------------------------------
    // Doctor
    // ------------------------------------------------------------------

    private function doctor(PDO $db, array $user): array
    {
        $uid = (int) $user['id'];
        $me = $db->prepare(
            "SELECT p.id AS provider_id, e.first_name, e.last_name FROM users u
             LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL LEFT JOIN providers p ON p.employee_id = e.id
             WHERE u.id = :u LIMIT 1"
        );
        $me->execute(['u' => $uid]);
        $me = $me->fetch(PDO::FETCH_ASSOC) ?: [];
        $providerId = (int) ($me['provider_id'] ?? 0);

        // Admitted patients: mine on record, or the attending physician written on the admission.
        $first = trim((string) ($me['first_name'] ?? ''));
        $last = trim((string) ($me['last_name'] ?? ''));
        $byName = mb_strlen($last) >= 2 ? " OR (a.attending_physician LIKE :ln" . ($first !== '' ? " AND a.attending_physician LIKE :fn" : '') . ")" : '';
        $stmt = $db->prepare(
            "SELECT a.id FROM inpatient_admissions a LEFT JOIN patients p ON p.id = a.patient_id
             JOIN hospital_beds b ON b.id = a.bed_id
             WHERE a.status IN ('Admitted', 'Pending Discharge') AND ((:pid > 0 AND p.provider_id = :pid2){$byName})
             ORDER BY a.ward_id, b.room_number, b.bed_number"
        );
        $params = ['pid' => $providerId, 'pid2' => $providerId];
        if ($byName) {
            $params['ln'] = '%' . $last . '%';
            if ($first !== '') {
                $params['fn'] = '%' . $first . '%';
            }
        }
        $stmt->execute($params);
        $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
        $sum = $ids ? (new InpatientVitalsService())->summaries($ids) : [];
        $crit = [];
        if ($sum) {
            $pids = array_filter(array_map(fn($v) => $v['patient_id'], $sum));
            if ($pids) {
                $crit = $db->query(
                    "SELECT patient_id, COUNT(*) FROM alerts WHERE alert_type = 'critical_lab' AND acknowledged_at IS NULL AND resolved_at IS NULL
                       AND patient_id IN (" . implode(',', array_map('intval', $pids)) . ") GROUP BY patient_id"
                )->fetchAll(PDO::FETCH_KEY_PAIR);
            }
        }
        $patients = array_values(array_map(fn($v) => [
            'admission_id' => $v['admission_id'], 'patient_id' => $v['patient_id'], 'patient_name' => $v['patient_name'], 'patient_mrn' => $v['patient_mrn'],
            'ward' => $v['ward'], 'room' => $v['room'], 'bed' => $v['bed'], 'isolation' => $v['isolation'], 'status' => $v['admission_status'],
            'nurse_name' => $v['nurse_name'],
            'news2' => $v['news2'] ? ['score' => $v['news2']['score'], 'risk' => $v['news2']['risk'], 'label' => $v['news2']['risk_label']] : null,
            'vitals_state' => $v['status']['state'], 'critical_labs' => (int) ($crit[$v['patient_id']] ?? 0),
        ], $sum));
        // Sickest first: unacknowledged critical labs, then NEWS2.
        usort($patients, fn($a, $b) => [-$a['critical_labs'], -($a['news2']['score'] ?? -1)] <=> [-$b['critical_labs'], -($b['news2']['score'] ?? -1)]);

        $inbox = new ResultsInboxService();
        $review = $inbox->list($uid, 'review');

        $appts = [];
        if ($providerId) {
            $stmt = $db->prepare(
                "SELECT ap.id, ap.patient_id, ap.appointment_time, ap.is_all_day, ap.title, ap.reason, ap.status, p.patient_no,
                        TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name, vc.name AS visit_category
                 FROM appointments ap LEFT JOIN patients p ON p.id = ap.patient_id
                 LEFT JOIN visit_categories vc ON vc.id = ap.visit_category_id
                 WHERE ap.provider_id = :p AND ap.appointment_date = CURDATE() AND ap.deleted_at IS NULL AND COALESCE(ap.is_provider_block, 0) = 0
                   AND LOWER(COALESCE(ap.status, '')) NOT IN ('cancelled', 'canceled', 'no show', 'no_show', 'deleted')
                 ORDER BY ap.is_all_day DESC, ap.appointment_time"
            );
            $stmt->execute(['p' => $providerId]);
            $appts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        $stmt = $db->prepare(
            "SELECT c.id, c.case_number, c.patient_id, c.patient_name, c.procedure_name, c.or_suite_name, c.scheduled_date, c.scheduled_start_time,
                    c.scheduled_end_time, c.perioperative_stage, c.case_priority,
                    CASE WHEN c.lead_surgeon_user_id = :u1 THEN 'Surgeon' WHEN c.assistant_surgeon_user_id = :u2 THEN 'Assistant surgeon' ELSE 'Anesthesiologist' END AS my_role
             FROM or_surgical_cases c
             WHERE (c.lead_surgeon_user_id = :u3 OR c.assistant_surgeon_user_id = :u4 OR c.anesthesiologist_user_id = :u5)
               AND c.cancelled_at IS NULL AND c.scheduled_date BETWEEN CURDATE() AND CURDATE() + INTERVAL " . self::OR_DAYS_AHEAD . " DAY
             ORDER BY c.scheduled_date, c.scheduled_start_time"
        );
        $stmt->execute(['u1' => $uid, 'u2' => $uid, 'u3' => $uid, 'u4' => $uid, 'u5' => $uid]);
        $cases = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'patients' => ['items' => $patients, 'count' => count($patients), 'linked' => $providerId > 0 || $byName !== ''],
            'results' => ['items' => array_slice($review['items'], 0, 25), 'to_review' => $review['to_review'], 'overdue' => $review['review_overdue'],
                'new' => $review['new'], 'critical_new' => $review['critical'], 'review_days' => $review['review_days']],
            'appointments' => ['items' => array_map(fn($a) => [
                'id' => (int) $a['id'], 'patient_id' => $a['patient_id'] !== null ? (int) $a['patient_id'] : null, 'patient_no' => $a['patient_no'],
                'patient_name' => $a['patient_name'] ?: $a['title'], 'time' => (int) $a['is_all_day'] === 1 ? null : substr((string) $a['appointment_time'], 0, 5),
                'reason' => $a['reason'], 'status' => $a['status'], 'category' => $a['visit_category'],
            ], $appts), 'count' => count($appts), 'linked' => $providerId > 0],
            'or_cases' => ['items' => array_map(fn($c) => [
                'id' => (int) $c['id'], 'case_number' => $c['case_number'], 'patient_id' => $c['patient_id'] !== null ? (int) $c['patient_id'] : null,
                'patient_name' => $c['patient_name'], 'procedure' => $c['procedure_name'], 'suite' => $c['or_suite_name'], 'date' => $c['scheduled_date'],
                'start' => substr((string) $c['scheduled_start_time'], 0, 5), 'end' => substr((string) $c['scheduled_end_time'], 0, 5),
                'stage' => $c['perioperative_stage'], 'priority' => $c['case_priority'], 'my_role' => $c['my_role'],
            ], $cases), 'count' => count($cases)],
        ];
    }

    // ------------------------------------------------------------------
    // Pharmacy
    // ------------------------------------------------------------------

    private function toVerify(): array
    {
        $q = (new MedOrderService())->queue();
        return [
            'items' => array_map(fn($o) => [
                'id' => $o['id'], 'patient_id' => $o['patient_id'], 'patient_name' => $o['patient_name'], 'ward' => $o['ward'], 'bed' => $o['bed'],
                'summary' => $o['summary'], 'is_stat' => $o['is_stat'], 'high_alert' => $o['high_alert'], 'controlled' => $o['controlled'],
                'waiting_minutes' => $o['waiting_minutes'], 'ordered_by_name' => $o['ordered_by_name'],
                'warnings' => count($o['warnings_now'] ?? []),
            ], array_slice($q['orders'], 0, 50)),
            'count' => $q['count'], 'stat' => $q['stat'],
        ];
    }

    private function restock(): array
    {
        $q = (new RestockService())->queue();
        return [
            'items' => array_map(fn($r) => [
                'id' => $r['id'], 'st_number' => $r['st_number'], 'ward_name' => $r['ward_name'] ?: $r['to_name'], 'urgent' => $r['urgent'],
                'urgent_reason' => $r['urgent_reason'], 'is_auto' => $r['is_auto'], 'waiting_minutes' => $r['waiting_minutes'], 'lines' => count($r['lines']),
            ], $q['waiting']),
            'waiting' => $q['counts']['waiting'], 'urgent' => $q['counts']['urgent'], 'on_the_way' => $q['counts']['on_the_way'],
        ];
    }

    // ------------------------------------------------------------------
    // Lab / radiology
    // ------------------------------------------------------------------

    private function lab(PDO $db): array
    {
        $rows = $db->query(
            "SELECT o.id, o.patient_id, o.order_date, o.status, o.specimen, o.created_at, c.name AS test_name, p.patient_no,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name,
                    CASE WHEN COALESCE(c.order_test_type, pc.order_test_type) = 'Imaging' OR COALESCE(c.order_from, pc.order_from) = 'Radiology Department'
                         THEN 'radiology' ELSE 'lab' END AS kind,
                    NULLIF(TRIM(CONCAT(COALESCE(pe.first_name, ''), ' ', COALESCE(pe.last_name, ''))), '') AS ordering_doctor,
                    DATEDIFF(CURDATE(), o.order_date) AS days_waiting, w.ward_name, b.bed_number
             FROM patient_procedure_orders o
             JOIN patients p ON p.id = o.patient_id AND p.deleted_at IS NULL
             LEFT JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             LEFT JOIN procedure_order_configs pc ON pc.id = c.parent_id
             LEFT JOIN providers pr ON pr.id = o.provider_id LEFT JOIN employees pe ON pe.id = pr.employee_id
             LEFT JOIN inpatient_admissions a ON a.id = (SELECT MAX(x.id) FROM inpatient_admissions x WHERE x.patient_id = o.patient_id AND x.status IN ('Admitted', 'Pending Discharge'))
             LEFT JOIN hospital_wards w ON w.id = a.ward_id LEFT JOIN hospital_beds b ON b.id = a.bed_id
             WHERE o.deleted_at IS NULL AND o.status IN ('pending', 'collected')
             ORDER BY (a.id IS NULL), o.order_date, o.id
             LIMIT 300"
        )->fetchAll(PDO::FETCH_ASSOC);
        $shape = fn($r) => [
            'id' => (int) $r['id'], 'patient_id' => (int) $r['patient_id'], 'patient_no' => $r['patient_no'], 'patient_name' => $r['patient_name'],
            'test_name' => $r['test_name'], 'kind' => $r['kind'], 'status' => $r['status'], 'specimen' => $r['specimen'], 'order_date' => $r['order_date'],
            'days_waiting' => max(0, (int) $r['days_waiting']), 'ordering_doctor' => $r['ordering_doctor'],
            'location' => $r['ward_name'] ? trim($r['ward_name'] . ' ' . $r['bed_number']) : null,
        ];
        $lab = array_values(array_map($shape, array_filter($rows, fn($r) => $r['kind'] === 'lab')));
        $rad = array_values(array_map($shape, array_filter($rows, fn($r) => $r['kind'] === 'radiology')));
        $counts = fn(array $x) => ['count' => count($x), 'pending' => count(array_filter($x, fn($r) => $r['status'] === 'pending')),
            'collected' => count(array_filter($x, fn($r) => $r['status'] === 'collected'))];
        return ['lab' => ['items' => $lab] + $counts($lab), 'radiology' => ['items' => $rad] + $counts($rad)];
    }

    private function userName(PDO $db, int $userId): ?string
    {
        $stmt = $db->prepare(
            "SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
             FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL WHERE u.id = :id LIMIT 1"
        );
        $stmt->execute(['id' => $userId]);
        return $stmt->fetchColumn() ?: null;
    }
}
