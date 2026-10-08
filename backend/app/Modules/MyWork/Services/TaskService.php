<?php

namespace App\Modules\MyWork\Services;

use App\Core\Database;
use App\Core\RoleAccess;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\InpatientOrders\Services\MedOrderService;
use App\Modules\NursingStaff\Services\NursingShiftService;
use App\Modules\NursingStaff\Services\NursingStaffService;
use PDO;

/**
 * Tasks (module 8, Phase 2): work with a due time, assigned to
 *   user          -- one person;
 *   role          -- anyone with that role (nursing roles: the staff of the patient's ward);
 *   patient_nurse -- the admitted patient's nurse this shift, whoever that is when the task is
 *                    due (else the ward's nurses).
 * Open tasks show on My Work. Past their due time they raise one alert (the "task" type) to
 * whoever the task is for; completing it records who and when (with an optional note) and
 * closes the alert.
 */
class TaskService
{
    public const ASSIGN_TYPES = ['user', 'role', 'patient_nurse'];
    public const PRIORITIES = ['routine' => 'Routine', 'urgent' => 'Urgent'];
    /** Roles a task can go to. */
    public const ROLES = [
        'nurse' => 'Nurses', 'charge_nurse' => 'Charge nurse', 'cna' => 'CNAs', 'doctor' => 'Doctors', 'clinician' => 'Clinicians',
        'pharmacist' => 'Pharmacy', 'lab_technician' => 'Lab', 'receptionist' => 'Reception', 'admin' => 'Administrators',
    ];
    /** Roles whose role tasks are limited to the patient's ward (their ward links). */
    private const WARD_ROLES = ['nurse', 'charge_nurse', 'cna'];
    /** Who may cancel or change anyone's task (besides the person who created it). */
    private const MANAGERS = ['admin', 'charge_nurse'];
    private const STAFF = ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'cna', 'pharmacist', 'lab_technician', 'receptionist', 'staff', 'accountant'];
    private const THROTTLE_SECONDS = 60;
    /** Done tasks stay listed (as done) this long. */
    private const DONE_HOURS = 12;

    // ------------------------------------------------------------------
    // Lists
    // ------------------------------------------------------------------

    /**
     * For My Work. mine: open tasks for me (overdue first, then by due time) and those done in the
     * last hours; assigned: tasks I gave others (open, and done lately: who did them, when).
     */
    public function forUser(array $user): array
    {
        $db = Database::connection();
        [$mineSql, $params] = $this->visibleSql($db, $user);
        $mine = $this->fetch($db, "({$mineSql}) AND (t.status = 'open' OR (t.status = 'done' AND t.completed_at >= NOW() - INTERVAL " . self::DONE_HOURS . " HOUR))",
            $params, "t.status = 'open' DESC, t.due_at < NOW() DESC, t.priority = 'urgent' DESC, t.due_at, t.id");
        $assigned = $this->fetch($db, "t.created_by = :me AND (t.status = 'open' OR t.completed_at >= NOW() - INTERVAL 24 HOUR OR t.cancelled_at >= NOW() - INTERVAL 24 HOUR)",
            ['me' => (int) $user['id']], "t.status = 'open' DESC, t.due_at, t.id");
        $open = array_values(array_filter($mine, fn($t) => $t['status'] === 'open'));
        return [
            'items' => $open, 'done' => array_values(array_filter($mine, fn($t) => $t['status'] === 'done')),
            'assigned' => $assigned,
            'count' => count($open), 'overdue' => count(array_filter($open, fn($t) => $t['overdue'])),
            'now' => (string) $db->query("SELECT NOW()")->fetchColumn(),
        ];
    }

    /** A patient's tasks (open, and done / cancelled in the last day). */
    public function forPatient(int $patientId, array $user): array
    {
        $db = Database::connection();
        $rows = $this->fetch($db, "t.patient_id = :p AND (t.status = 'open' OR COALESCE(t.completed_at, t.cancelled_at) >= NOW() - INTERVAL 24 HOUR)",
            ['p' => $patientId], "t.status = 'open' DESC, t.due_at, t.id");
        return array_map(fn($t) => $t + ['can_complete' => $t['status'] === 'open' && $this->canComplete($db, $t, $user)], $rows);
    }

    /** What the "New task" form needs: roles, staff, admitted patients. */
    public function options(): array
    {
        $db = Database::connection();
        $staff = $db->query(
            "SELECT u.id, r.name AS role, COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username) AS name
             FROM users u JOIN roles r ON r.id = u.role_id LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
             WHERE u.deleted_at IS NULL AND r.name <> 'patient' ORDER BY name"
        )->fetchAll(PDO::FETCH_ASSOC);
        $patients = $db->query(
            "SELECT a.id AS admission_id, a.patient_id, a.patient_name, w.ward_name, b.bed_number
             FROM inpatient_admissions a JOIN hospital_wards w ON w.id = a.ward_id JOIN hospital_beds b ON b.id = a.bed_id
             WHERE a.status IN ('Admitted', 'Pending Discharge') ORDER BY w.ward_name, b.room_number, b.bed_number"
        )->fetchAll(PDO::FETCH_ASSOC);
        return [
            'roles' => self::ROLES, 'priorities' => self::PRIORITIES,
            'staff' => array_map(fn($s) => ['id' => (int) $s['id'], 'name' => $s['name'], 'role' => $s['role']], $staff),
            'patients' => array_map(fn($p) => ['admission_id' => (int) $p['admission_id'], 'patient_id' => $p['patient_id'] !== null ? (int) $p['patient_id'] : null,
                'name' => $p['patient_name'], 'ward' => $p['ward_name'], 'bed' => $p['bed_number']], $patients),
            'now' => (string) $db->query("SELECT NOW()")->fetchColumn(),
        ];
    }

    // ------------------------------------------------------------------
    // Create / change / complete / cancel
    // ------------------------------------------------------------------

    /**
     * data: id? (change an open task), title, details?, admission_id? | patient_id?, assign_type (user | role | patient_nurse),
     *       assigned_user_id | assigned_role, due_at (YYYY-MM-DD HH:MM), priority?
     */
    public function save(array $data, array $user): array
    {
        $db = Database::connection();
        $uid = (int) ($user['id'] ?? 0);
        if (!in_array($user['role'] ?? '', self::STAFF, true)) {
            return ['success' => false, 'message' => 'Only staff can give tasks.', 'forbidden' => true];
        }
        $existing = null;
        if (!empty($data['id'])) {
            $existing = $this->find($db, (int) $data['id']);
            if (!$existing) {
                return ['success' => false, 'message' => 'Task not found.', 'not_found' => true];
            }
            if ($existing['status'] !== 'open') {
                return ['success' => false, 'message' => 'This task is already ' . ($existing['status'] === 'done' ? 'done' : 'cancelled') . '.'];
            }
            if ((int) $existing['created_by'] !== $uid && !in_array($user['role'] ?? '', self::MANAGERS, true)) {
                return ['success' => false, 'message' => 'Only the person who gave the task (or the charge nurse) can change it.', 'forbidden' => true];
            }
        }
        $errors = [];
        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '') {
            $errors['title'] = 'What is to be done?';
        } elseif (mb_strlen($title) > 200) {
            $errors['title'] = 'Keep it under 200 characters.';
        }
        $details = trim((string) ($data['details'] ?? ''));
        if (mb_strlen($details) > 1000) {
            $errors['details'] = 'Keep it under 1000 characters.';
        }
        // Patient: an admission (ward known) or any patient.
        $admissionId = (int) ($data['admission_id'] ?? 0) ?: null;
        $patientId = (int) ($data['patient_id'] ?? 0) ?: null;
        $wardId = null;
        if ($admissionId) {
            $a = $db->prepare("SELECT patient_id, ward_id FROM inpatient_admissions WHERE id = :id AND status IN ('Admitted', 'Pending Discharge')");
            $a->execute(['id' => $admissionId]);
            $adm = $a->fetch(PDO::FETCH_ASSOC);
            if (!$adm) {
                $errors['admission_id'] = 'That patient is not admitted.';
            } else {
                $patientId = $adm['patient_id'] !== null ? (int) $adm['patient_id'] : null;
                $wardId = (int) $adm['ward_id'];
            }
        } elseif ($patientId) {
            $p = $db->prepare("SELECT id FROM patients WHERE id = :id AND deleted_at IS NULL");
            $p->execute(['id' => $patientId]);
            if (!$p->fetchColumn()) {
                $errors['patient_id'] = 'Patient not found.';
            }
        }
        $type = (string) ($data['assign_type'] ?? '');
        $toUser = null;
        $toRole = null;
        if (!in_array($type, self::ASSIGN_TYPES, true)) {
            $errors['assign_type'] = 'Who is the task for?';
        } elseif ($type === 'user') {
            $toUser = (int) ($data['assigned_user_id'] ?? 0);
            $u = $db->prepare("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = :id AND u.deleted_at IS NULL AND r.name <> 'patient'");
            $u->execute(['id' => $toUser]);
            if (!$u->fetchColumn()) {
                $errors['assigned_user_id'] = 'Choose the person.';
            }
        } elseif ($type === 'role') {
            $toRole = (string) ($data['assigned_role'] ?? '');
            if (!isset(self::ROLES[$toRole])) {
                $errors['assigned_role'] = 'Choose the role.';
            }
        } elseif (!$admissionId) {
            $errors['assign_type'] = '"The patient\'s nurse" needs an admitted patient.';
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $raw = str_replace('T', ' ', trim((string) ($data['due_at'] ?? '')));
        $due = preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/', $raw) ? substr($raw . ':00', 0, 19) : null;
        if (!$due || strtotime($due) === false) {
            $errors['due_at'] = 'When is it due?';
        } elseif (!$existing && strtotime($due) < strtotime($now) - 300) {
            $errors['due_at'] = 'That time has passed.';
        } elseif (strtotime($due) > strtotime($now) + 60 * 86400) {
            $errors['due_at'] = 'Within the next 60 days.';
        }
        $priority = (string) ($data['priority'] ?? 'routine') ?: 'routine';
        if (!isset(self::PRIORITIES[$priority])) {
            $errors['priority'] = 'Routine or urgent.';
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $values = [
            'title' => $title, 'details' => $details !== '' ? $details : null, 'p' => $patientId, 'a' => $admissionId,
            'w' => in_array($toRole, self::WARD_ROLES, true) || $type === 'patient_nurse' ? $wardId : null,
            'type' => $type, 'u' => $toUser, 'r' => $toRole, 'due' => $due, 'pri' => $priority, 'now' => $now,
        ];
        if ($existing) {
            $db->prepare(
                "UPDATE clinical_tasks SET title = :title, details = :details, patient_id = :p, admission_id = :a, ward_id = :w, assign_type = :type,
                        assigned_user_id = :u, assigned_role = :r, due_at = :due, priority = :pri, updated_at = :now,
                        overdue_alerted_at = IF(:due2 > :now2, NULL, overdue_alerted_at) WHERE id = :id"
            )->execute($values + ['due2' => $due, 'now2' => $now, 'id' => $existing['id']]);
            $id = (int) $existing['id'];
            if ($due > $now) {
                // Moved later or to someone else: the overdue alert no longer stands.
                AlertService::resolveByKey(self::key($id), $uid, 'Task changed');
            }
        } else {
            $db->prepare(
                "INSERT INTO clinical_tasks (title, details, patient_id, admission_id, ward_id, assign_type, assigned_user_id, assigned_role, due_at, priority, created_by, created_at)
                 VALUES (:title, :details, :p, :a, :w, :type, :u, :r, :due, :pri, :by, :now)"
            )->execute($values + ['by' => $uid]);
            $id = (int) $db->lastInsertId();
        }
        $task = $this->fetch($db, 't.id = :id', ['id' => $id], 't.id')[0];
        return ['success' => true, 'message' => ($existing ? 'Task changed' : 'Task given') . ": {$task['title']} — {$task['assignee_label']}, due " . date('g:i A', strtotime($due)) . '.', 'data' => $task];
    }

    /** Mark done: who and when are recorded (note optional). */
    public function complete(int $id, string $note, array $user): array
    {
        $db = Database::connection();
        $t = $this->find($db, $id);
        if (!$t) {
            return ['success' => false, 'message' => 'Task not found.', 'not_found' => true];
        }
        if ($t['status'] !== 'open') {
            return ['success' => false, 'message' => $t['status'] === 'done' ? 'Already done.' : 'This task was cancelled.'];
        }
        if (!$this->canComplete($db, $t, $user)) {
            return ['success' => false, 'message' => 'This task is not yours.', 'forbidden' => true];
        }
        $note = trim($note);
        if (mb_strlen($note) > 500) {
            return ['success' => false, 'message' => 'Keep the note under 500 characters.', 'errors' => ['note' => 'Too long.']];
        }
        $stmt = $db->prepare("UPDATE clinical_tasks SET status = 'done', completed_by = :u, completed_at = NOW(), completion_note = :n WHERE id = :id AND status = 'open'");
        $stmt->execute(['u' => (int) $user['id'], 'n' => $note !== '' ? $note : null, 'id' => $id]);
        if ($stmt->rowCount() !== 1) {
            return ['success' => false, 'message' => 'Someone else just completed it.'];
        }
        AlertService::resolveByKey(self::key($id), (int) $user['id'], 'Task done');
        $done = $this->fetch($db, 't.id = :id', ['id' => $id], 't.id')[0];
        return ['success' => true, 'message' => "Done: {$done['title']} ({$done['completed_by_name']}, " . date('g:i A', strtotime($done['completed_at'])) . ').', 'data' => $done];
    }

    /** Cancel (the person who gave it, or the charge nurse / admin). */
    public function cancel(int $id, string $reason, array $user): array
    {
        $db = Database::connection();
        $t = $this->find($db, $id);
        if (!$t) {
            return ['success' => false, 'message' => 'Task not found.', 'not_found' => true];
        }
        if ($t['status'] !== 'open') {
            return ['success' => false, 'message' => 'This task is no longer open.'];
        }
        if ((int) $t['created_by'] !== (int) $user['id'] && !in_array($user['role'] ?? '', self::MANAGERS, true)) {
            return ['success' => false, 'message' => 'Only the person who gave the task (or the charge nurse) can cancel it.', 'forbidden' => true];
        }
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Why is it cancelled?', 'errors' => ['reason' => 'Required.']];
        }
        $db->prepare("UPDATE clinical_tasks SET status = 'cancelled', cancelled_by = :u, cancelled_at = NOW(), cancel_reason = :r WHERE id = :id")
            ->execute(['u' => (int) $user['id'], 'r' => mb_substr($reason, 0, 300), 'id' => $id]);
        AlertService::resolveByKey(self::key($id), (int) $user['id'], 'Task cancelled');
        return ['success' => true, 'message' => 'Task cancelled.', 'data' => $this->fetch($db, 't.id = :id', ['id' => $id], 't.id')[0]];
    }

    // ------------------------------------------------------------------
    // Overdue
    // ------------------------------------------------------------------

    /** Open tasks past their due time: one alert each, to whoever the task is for. From the bell's poll (every minute at most) and cron. */
    public function runOverdue(bool $force = false): array
    {
        $db = Database::connection();
        if (!$force && !$this->claimRun($db)) {
            return [];
        }
        $rows = $this->fetch($db, "t.status = 'open' AND t.due_at < NOW() AND t.overdue_alerted_at IS NULL", [], 't.due_at LIMIT 200');
        $out = [];
        foreach ($rows as $t) {
            $targets = $this->targets($db, $t);
            $where = $t['patient_name'] ? " — {$t['patient_name']}" . ($t['location'] ? " ({$t['location']})" : '') : '';
            $res = AlertService::raise([
                'type' => 'task', 'urgency' => $t['priority'] === 'urgent' ? 'urgent' : 'info',
                'title' => "Task overdue: {$t['title']}{$where}",
                'body' => 'Was due ' . date('g:i A', strtotime($t['due_at'])) . " ({$t['assignee_label']}). Given by " . ($t['created_by_name'] ?: 'someone')
                    . '.' . ($t['details'] ? " {$t['details']}" : '') . ' Mark it done on My Work.',
                'patient_id' => $t['patient_id'], 'link' => ['tab' => 'my_work'], 'targets' => $targets,
                'source_type' => 'clinical_tasks', 'source_id' => $t['id'], 'dedupe_key' => self::key($t['id']),
            ]);
            $db->prepare("UPDATE clinical_tasks SET overdue_alerted_at = NOW() WHERE id = :id")->execute(['id' => $t['id']]);
            if (!empty($res['success'])) {
                $out[] = ['id' => $t['id'], 'title' => $t['title'], 'to' => $t['assignee_label']];
            } else {
                error_log('task overdue alert not sent: ' . json_encode($res));
            }
        }
        return $out;
    }

    public static function key(int $id): string
    {
        return "task:{$id}";
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** Who the overdue alert goes to. */
    private function targets(PDO $db, array $t): array
    {
        if ($t['assign_type'] === 'user' && $t['assigned_user_id']) {
            return [['user' => $t['assigned_user_id']]];
        }
        if ($t['assign_type'] === 'patient_nurse' && $t['admission_id']) {
            return (new MedOrderService())->nurseTargets($t['admission_id']);
        }
        if ($t['assigned_role'] && $t['ward_id'] && in_array($t['assigned_role'], self::WARD_ROLES, true)) {
            $stmt = $db->prepare(
                "SELECT x.user_id FROM nurse_ward_assignments x JOIN users u ON u.id = x.user_id AND u.deleted_at IS NULL JOIN roles r ON r.id = u.role_id
                 WHERE x.ward_id = :w AND r.name IN (" . implode(',', array_map(fn($r) => $db->quote($r), $this->rolesCounting($t['assigned_role']))) . ")"
            );
            $stmt->execute(['w' => $t['ward_id']]);
            $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
            if ($ids) {
                return array_map(fn($u) => ['user' => $u], $ids);
            }
        }
        return [['role' => $t['assigned_role'] ?: 'nurse']];
    }

    /** Roles that count as $role (a charge nurse counts as a nurse). */
    private function rolesCounting(string $role): array
    {
        return array_values(array_filter(array_keys(self::ROLES), fn($r) => in_array($role, RoleAccess::effectiveRoles($r), true)));
    }

    /**
     * SQL for "tasks for me": mine by name; my role's (ward-limited for nursing roles with ward
     * links); "the patient's nurse" when I am that nurse this shift (or, with no nurse assigned,
     * a nurse of the ward).
     */
    private function visibleSql(PDO $db, array $user): array
    {
        $uid = (int) $user['id'];
        $role = (string) ($user['role'] ?? '');
        $roles = RoleAccess::effectiveRoles($role);
        $wards = (new NursingStaffService())->wardIds($uid);
        $cur = (new NursingShiftService())->current();
        $inRoles = implode(',', array_map(fn($r) => $db->quote($r), $roles));
        $wardOk = $wards ? "(t.ward_id IS NULL OR t.ward_id IN (" . implode(',', $wards) . "))" : '1';
        $nursing = (bool) array_intersect($roles, self::WARD_ROLES);
        $isNurse = (bool) array_intersect($roles, ['nurse']);
        $sql = "(t.assign_type = 'user' AND t.assigned_user_id = :me_u)
             OR (t.assign_type = 'role' AND t.assigned_role IN ({$inRoles})" . ($nursing ? " AND {$wardOk}" : '') . ")
             OR (t.assign_type = 'patient_nurse' AND (
                    EXISTS (SELECT 1 FROM nurse_patient_assignments n WHERE n.admission_id = t.admission_id AND n.shift_date = :sd AND n.shift_id = :ss AND n.nurse_user_id = :me_n)"
            . ($isNurse ? "
                    OR (NOT EXISTS (SELECT 1 FROM nurse_patient_assignments n WHERE n.admission_id = t.admission_id AND n.shift_date = :sd2 AND n.shift_id = :ss2 AND n.nurse_user_id IS NOT NULL)
                        AND {$wardOk})" : '') . "))";
        $params = ['me_u' => $uid, 'me_n' => $uid, 'sd' => $cur['date'], 'ss' => (int) ($cur['shift']['id'] ?? 0)];
        if ($isNurse) {
            $params += ['sd2' => $cur['date'], 'ss2' => (int) ($cur['shift']['id'] ?? 0)];
        }
        return [$sql, $params];
    }

    private function canComplete(PDO $db, array $t, array $user): bool
    {
        if ((int) $t['created_by'] === (int) $user['id'] || in_array($user['role'] ?? '', self::MANAGERS, true)) {
            return true;
        }
        [$sql, $params] = $this->visibleSql($db, $user);
        $stmt = $db->prepare("SELECT 1 FROM clinical_tasks t WHERE t.id = :tid AND ({$sql})");
        $stmt->execute($params + ['tid' => $t['id']]);
        return (bool) $stmt->fetchColumn();
    }

    private function find(PDO $db, int $id): ?array
    {
        $r = $this->fetch($db, 't.id = :id', ['id' => $id], 't.id');
        return $r[0] ?? null;
    }

    private function fetch(PDO $db, string $where, array $params, string $order): array
    {
        $stmt = $db->prepare(
            "SELECT t.*, (t.status = 'open' AND t.due_at < NOW()) AS is_overdue, TIMESTAMPDIFF(MINUTE, t.due_at, NOW()) AS minutes_late,
                    COALESCE(a.patient_name, NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), '')) AS patient_name, p.patient_no,
                    w.ward_name, b.bed_number,
                    " . self::nameSql('t.assigned_user_id') . " AS assigned_user_name, " . self::nameSql('t.created_by') . " AS created_by_name,
                    " . self::nameSql('t.completed_by') . " AS completed_by_name, " . self::nameSql('t.cancelled_by') . " AS cancelled_by_name,
                    (SELECT " . self::nameSql('n.nurse_user_id') . " FROM nurse_patient_assignments n WHERE n.admission_id = t.admission_id
                       AND n.shift_date = :fsd AND n.shift_id = :fss LIMIT 1) AS patient_nurse_name
             FROM clinical_tasks t
             LEFT JOIN patients p ON p.id = t.patient_id
             LEFT JOIN inpatient_admissions a ON a.id = t.admission_id
             LEFT JOIN hospital_wards w ON w.id = COALESCE(a.ward_id, t.ward_id) LEFT JOIN hospital_beds b ON b.id = a.bed_id
             WHERE {$where} ORDER BY {$order}"
        );
        $cur = (new NursingShiftService())->current();
        $stmt->execute($params + ['fsd' => $cur['date'], 'fss' => (int) ($cur['shift']['id'] ?? 0)]);
        return array_map(fn($t) => [
            'id' => (int) $t['id'], 'title' => $t['title'], 'details' => $t['details'],
            'patient_id' => $t['patient_id'] !== null ? (int) $t['patient_id'] : null, 'patient_no' => $t['patient_no'], 'patient_name' => $t['patient_name'],
            'admission_id' => $t['admission_id'] !== null ? (int) $t['admission_id'] : null, 'ward_id' => $t['ward_id'] !== null ? (int) $t['ward_id'] : null,
            'location' => $t['ward_name'] ? trim($t['ward_name'] . ' ' . ($t['bed_number'] ?? '')) : null,
            'assign_type' => $t['assign_type'], 'assigned_user_id' => $t['assigned_user_id'] !== null ? (int) $t['assigned_user_id'] : null,
            'assigned_role' => $t['assigned_role'], 'assignee_label' => $this->assigneeLabel($t),
            'due_at' => $t['due_at'], 'priority' => $t['priority'], 'status' => $t['status'],
            'overdue' => (int) $t['is_overdue'] === 1, 'minutes_late' => (int) $t['is_overdue'] === 1 ? (int) $t['minutes_late'] : 0,
            'created_by' => (int) $t['created_by'], 'created_by_name' => $t['created_by_name'], 'created_at' => $t['created_at'],
            'completed_at' => $t['completed_at'], 'completed_by_name' => $t['completed_at'] ? $t['completed_by_name'] : null, 'completion_note' => $t['completion_note'],
            'cancelled_at' => $t['cancelled_at'], 'cancelled_by_name' => $t['cancelled_at'] ? $t['cancelled_by_name'] : null, 'cancel_reason' => $t['cancel_reason'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function assigneeLabel(array $t): string
    {
        return match ($t['assign_type']) {
            'user' => $t['assigned_user_name'] ?: 'Someone',
            'patient_nurse' => "The patient's nurse" . ($t['patient_nurse_name'] ? " ({$t['patient_nurse_name']})" : ''),
            default => (self::ROLES[$t['assigned_role']] ?? $t['assigned_role']) . ($t['ward_name'] && in_array($t['assigned_role'], self::WARD_ROLES, true) ? ", {$t['ward_name']}" : ''),
        };
    }

    private function claimRun(PDO $db): bool
    {
        $db->exec("INSERT IGNORE INTO alert_job_runs (job, last_run_at) VALUES ('task_overdue', '2000-01-01 00:00:00')");
        $stmt = $db->prepare("UPDATE alert_job_runs SET last_run_at = NOW() WHERE job = 'task_overdue' AND last_run_at <= DATE_SUB(NOW(), INTERVAL " . self::THROTTLE_SECONDS . " SECOND)");
        $stmt->execute();
        return $stmt->rowCount() === 1;
    }

    private static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL WHERE nu.id = {$column} LIMIT 1)";
    }
}
