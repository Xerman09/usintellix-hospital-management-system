<?php

namespace App\Modules\Alerts\Services;

use App\Core\Database;
use PDO;

/**
 * Alert center: the one alert service every module uses.
 *
 * Raise from any module:
 *   AlertService::raise([
 *       'type' => 'critical_lab', 'urgency' => 'critical', 'title' => 'Potassium 6.9',
 *       'body' => '...', 'patient_id' => 5, 'link' => ['patient_id' => 5],
 *       'targets' => [['user' => 11], ['role' => 'nurse'], ['department' => 7]],   // or [['everyone' => true]]
 *       'source_type' => 'lab_results', 'source_id' => 99, 'dedupe_key' => 'lab:99',
 *   ], $userId);
 *
 * Urgent and critical alerts must be acknowledged; the first acknowledgement closes the alert
 * for everyone it went to. Info alerts are just marked read per person. Every recipient's
 * delivery (reached their screen), seen, read (opened) and acknowledgement is recorded.
 */
class AlertService
{
    public const URGENCIES = ['info', 'urgent', 'critical'];
    public const TARGET_TYPES = ['user', 'role', 'department', 'everyone'];

    /** Alert types and their labels. Other modules add theirs here. */
    public const TYPES = [
        'manual'       => 'Message',
        'system'       => 'System',
        'critical_lab' => 'Critical lab result',
        'code_blue'    => 'Code Blue',
        'low_stock'    => 'Low stock',
        'vitals'       => 'Vital signs',
        'medication'   => 'Medication',
        'or_case'      => 'Surgery',
        'task'         => 'Task',
        'assignment'   => 'Patient assignment',
    ];

    /** Roles that never get staff alerts ("everyone" means all staff). */
    private const NON_STAFF_ROLES = ['patient'];

    /** Links an alert may carry -- each one the screen knows how to open. */
    private const LINK_KEYS = ['tab', 'patient_id', 'or_case'];

    // ------------------------------------------------------------------
    // Raising and closing (used by other modules)
    // ------------------------------------------------------------------

    /**
     * @return array{success: bool, message: string, data?: array, errors?: array}
     *         data: id, duplicate (an open alert with the same dedupe_key already exists)
     */
    public static function raise(array $data, ?int $createdBy = null): array
    {
        $errors = [];
        $type = trim((string) ($data['type'] ?? 'manual'));
        if (!preg_match('/^[a-z][a-z0-9_]{1,59}$/', $type)) {
            $errors['type'] = 'Alert type must be a short code (letters, numbers, _).';
        }
        $urgency = (string) ($data['urgency'] ?? 'info');
        if (!in_array($urgency, self::URGENCIES, true)) {
            $errors['urgency'] = 'Urgency must be info, urgent or critical.';
        }
        $title = trim((string) ($data['title'] ?? ''));
        if ($title === '') {
            $errors['title'] = 'Enter what the alert is about.';
        }
        $body = trim((string) ($data['body'] ?? ''));
        if (mb_strlen($body) > 2000) {
            $errors['body'] = 'Keep the details under 2000 characters.';
        }

        $db = Database::connection();
        $targets = self::normalizeTargets($db, $data['targets'] ?? [], $errors);

        $patientId = !empty($data['patient_id']) ? (int) $data['patient_id'] : null;
        if ($patientId) {
            $stmt = $db->prepare("SELECT id FROM patients WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute(['id' => $patientId]);
            if (!$stmt->fetchColumn()) {
                $errors['patient_id'] = 'Patient not found.';
            }
        }

        $link = self::normalizeLink($data['link'] ?? null, $patientId);
        $expires = null;
        if (!empty($data['expires_at'])) {
            $ts = strtotime((string) $data['expires_at']);
            if ($ts === false) {
                $errors['expires_at'] = 'Invalid expiry time.';
            } else {
                $expires = date('Y-m-d H:i:s', $ts);
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => 'The alert could not be sent.', 'errors' => $errors];
        }

        $dedupe = isset($data['dedupe_key']) && $data['dedupe_key'] !== '' ? mb_substr((string) $data['dedupe_key'], 0, 150) : null;
        if ($dedupe) {
            $stmt = $db->prepare(
                "SELECT id FROM alerts WHERE dedupe_key = :k AND acknowledged_at IS NULL AND resolved_at IS NULL
                   AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY id DESC LIMIT 1"
            );
            $stmt->execute(['k' => $dedupe]);
            $existing = $stmt->fetchColumn();
            if ($existing) {
                return ['success' => true, 'message' => 'This alert is already open.', 'data' => ['id' => (int) $existing, 'duplicate' => true]];
            }
        }

        // Urgent and critical alerts always need an acknowledgement; info alerts only if asked.
        $requiresAck = $urgency !== 'info' || !empty($data['requires_ack']);

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT alert_raise');
        try {
            $stmt = $db->prepare(
                "INSERT INTO alerts (alert_type, urgency, title, body, patient_id, link_json, source_type, source_id, dedupe_key,
                                     requires_ack, expires_at, created_by, created_at)
                 VALUES (:type, :urgency, :title, :body, :patient, :link, :stype, :sid, :dedupe, :ack, :expires, :by, NOW())"
            );
            $stmt->execute([
                'type' => $type, 'urgency' => $urgency, 'title' => mb_substr($title, 0, 200), 'body' => $body !== '' ? $body : null,
                'patient' => $patientId, 'link' => $link ? json_encode($link) : null,
                'stype' => isset($data['source_type']) ? mb_substr((string) $data['source_type'], 0, 60) : null,
                'sid' => isset($data['source_id']) ? (int) $data['source_id'] : null,
                'dedupe' => $dedupe, 'ack' => $requiresAck ? 1 : 0, 'expires' => $expires, 'by' => $createdBy ?: null,
            ]);
            $id = (int) $db->lastInsertId();

            $ins = $db->prepare("INSERT INTO alert_targets (alert_id, target_type, target_id, target_role) VALUES (:a, :t, :id, :role)");
            foreach ($targets as $t) {
                $ins->execute(['a' => $id, 't' => $t['type'], 'id' => $t['id'], 'role' => $t['role']]);
            }
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT alert_raise');
        } catch (\Throwable $e) {
            if ($owns) {
                if ($db->inTransaction()) {
                    $db->rollBack();
                }
            } else {
                $db->exec('ROLLBACK TO SAVEPOINT alert_raise');
            }
            throw $e;
        }

        return ['success' => true, 'message' => 'Alert sent.', 'data' => ['id' => $id, 'duplicate' => false]];
    }

    /**
     * Close the open alerts a record raised once the condition is gone (e.g. stock refilled).
     * Returns how many were closed.
     */
    public static function resolveBySource(string $sourceType, int $sourceId, ?int $userId = null, string $note = '', ?string $alertType = null): int
    {
        $db = Database::connection();
        $sql = "UPDATE alerts SET resolved_at = NOW(), resolved_by = :by, resolve_note = :note
                WHERE source_type = :st AND source_id = :sid AND acknowledged_at IS NULL AND resolved_at IS NULL";
        $params = ['by' => $userId ?: null, 'note' => $note !== '' ? mb_substr($note, 0, 255) : null, 'st' => $sourceType, 'sid' => $sourceId];
        if ($alertType !== null) {
            $sql .= " AND alert_type = :type";
            $params['type'] = $alertType;
        }
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /** Same, by dedupe key. */
    public static function resolveByKey(string $dedupeKey, ?int $userId = null, string $note = ''): int
    {
        $stmt = Database::connection()->prepare(
            "UPDATE alerts SET resolved_at = NOW(), resolved_by = :by, resolve_note = :note
             WHERE dedupe_key = :k AND acknowledged_at IS NULL AND resolved_at IS NULL"
        );
        $stmt->execute(['by' => $userId ?: null, 'note' => $note !== '' ? mb_substr($note, 0, 255) : null, 'k' => $dedupeKey]);
        return $stmt->rowCount();
    }

    // ------------------------------------------------------------------
    // The signed-in person's alerts (bell, pop-ups, list)
    // ------------------------------------------------------------------

    /**
     * What the bell needs, called every few seconds: unread count, the open alerts that must
     * be acknowledged (pop-ups), and the latest few. Everything returned is marked delivered.
     */
    public function poll(array $user): array
    {
        if (!$this->isStaff($user)) {
            return ['unread' => 0, 'popups' => [], 'latest' => [], 'server_time' => self::dbNow()];
        }
        // Escalate overdue alerts first (at most every 30 s, whoever polls), so a newly
        // escalated alert reaches the next person on this very poll.
        try {
            (new AlertEscalationService())->run();
        } catch (\Throwable $e) {
            error_log('Alert escalation failed: ' . $e->getMessage());
        }
        $db = Database::connection();
        [$where, $params] = $this->visibleWhere($db, $user);
        $uid = (int) $user['id'];

        $stmt = $db->prepare(
            "SELECT COUNT(*) FROM alerts a LEFT JOIN alert_receipts r ON r.alert_id = a.id AND r.user_id = :me
             WHERE {$where} AND r.read_at IS NULL AND a.resolved_at IS NULL
               AND NOT (a.requires_ack = 1 AND a.acknowledged_at IS NOT NULL)"
        );
        $stmt->execute($params + ['me' => $uid]);
        $unread = (int) $stmt->fetchColumn();

        // Urgent / critical still waiting for someone to acknowledge.
        $popups = $this->fetch($db, $user, "{$where} AND a.requires_ack = 1 AND a.acknowledged_at IS NULL AND a.resolved_at IS NULL", $params,
            "FIELD(a.urgency, 'critical', 'urgent', 'info'), a.id DESC", 20);
        $latest = $this->fetch($db, $user, $where, $params, 'a.id DESC', 8);

        $this->stamp($db, array_merge(array_column($popups, 'id'), array_column($latest, 'id')), $uid, 'delivered_at');

        return ['unread' => $unread, 'popups' => $popups, 'latest' => $latest, 'server_time' => self::dbNow()];
    }

    /**
     * The full list. Filters: status (all / unread / open = waiting for acknowledgement / closed),
     * urgency, type, q, page.
     */
    public function list(array $user, array $filters): array
    {
        if (!$this->isStaff($user)) {
            return ['rows' => [], 'total' => 0, 'page' => 1, 'per_page' => 25];
        }
        $db = Database::connection();
        $status = (string) ($filters['status'] ?? 'all');
        if ($status === 'sent') {
            // Alerts I sent (to anyone), to follow whether they were seen / acknowledged.
            [$where, $params] = ['a.created_by = :sent_by', ['sent_by' => (int) $user['id']]];
        } else {
            [$where, $params] = $this->visibleWhere($db, $user);
        }
        $params['me'] = (int) $user['id'];

        if ($status === 'unread') {
            $where .= " AND r.read_at IS NULL AND a.resolved_at IS NULL AND NOT (a.requires_ack = 1 AND a.acknowledged_at IS NOT NULL)";
        } elseif ($status === 'open') {
            $where .= " AND a.requires_ack = 1 AND a.acknowledged_at IS NULL AND a.resolved_at IS NULL";
        } elseif ($status === 'closed') {
            $where .= " AND (a.acknowledged_at IS NOT NULL OR a.resolved_at IS NOT NULL)";
        }
        if (in_array($filters['urgency'] ?? '', self::URGENCIES, true)) {
            $where .= " AND a.urgency = :urg";
            $params['urg'] = $filters['urgency'];
        }
        if (!empty($filters['type']) && is_string($filters['type'])) {
            $where .= " AND a.alert_type = :type";
            $params['type'] = $filters['type'];
        }
        $q = trim((string) ($filters['q'] ?? ''));
        if ($q !== '') {
            $where .= " AND (a.title LIKE :q OR a.body LIKE :q)";
            $params['q'] = '%' . $q . '%';
        }

        $stmt = $db->prepare("SELECT COUNT(*) FROM alerts a LEFT JOIN alert_receipts r ON r.alert_id = a.id AND r.user_id = :me WHERE {$where}");
        $stmt->execute($params);
        $total = (int) $stmt->fetchColumn();

        $perPage = 25;
        $page = max(1, (int) ($filters['page'] ?? 1));
        unset($params['me']);
        $rows = $this->fetch($db, $user, $where, $params, 'a.id DESC', $perPage, ($page - 1) * $perPage);

        return ['rows' => $rows, 'total' => $total, 'page' => $page, 'per_page' => $perPage];
    }

    /**
     * One alert with its full trail: who it was for, who it reached, who saw / opened /
     * acknowledged it and when. Recipients see alerts sent to them; admins see any.
     */
    public function detail(int $id, array $user): ?array
    {
        $db = Database::connection();
        if (!$this->canSee($db, $id, $user)) {
            return null;
        }
        $rows = $this->fetch($db, $user, 'a.id = :id', ['id' => $id], 'a.id', 1);
        if (!$rows) {
            return null;
        }
        $alert = $rows[0];

        $stmt = $db->prepare(
            "SELECT t.target_type, t.target_id, t.target_role, t.escalation_level,
                    CASE t.target_type
                        WHEN 'user' THEN " . self::userNameSql('t.target_id') . "
                        WHEN 'department' THEN (SELECT d.name FROM departments d WHERE d.id = t.target_id)
                        ELSE NULL END AS name
             FROM alert_targets t WHERE t.alert_id = :id ORDER BY t.id"
        );
        $stmt->execute(['id' => $id]);
        $alert['targets'] = array_map(fn($t) => [
            'type' => $t['target_type'], 'id' => $t['target_id'] !== null ? (int) $t['target_id'] : null,
            'role' => $t['target_role'], 'label' => self::targetLabel($t), 'escalation_level' => (int) $t['escalation_level'],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $escalation = new AlertEscalationService();
        $alert['escalations'] = $escalation->history($id);
        $alert['next_escalation'] = $escalation->next($alert);

        $stmt = $db->prepare(
            "SELECT r.user_id, " . self::userNameSql('r.user_id') . " AS name, r.delivered_at, r.seen_at, r.read_at, r.acknowledged_at
             FROM alert_receipts r WHERE r.alert_id = :id ORDER BY COALESCE(r.acknowledged_at, r.read_at, r.seen_at, r.delivered_at)"
        );
        $stmt->execute(['id' => $id]);
        $alert['receipts'] = array_map(fn($r) => $r + ['user_id' => (int) $r['user_id']], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return $alert;
    }

    /** The bell list or pop-up was shown: mark these seen. */
    public function markSeen(array $ids, array $user): int
    {
        $db = Database::connection();
        $ids = array_values(array_filter(array_map('intval', $ids), fn($id) => $id > 0 && $this->canSee($db, $id, $user, false)));
        $this->stamp($db, $ids, (int) $user['id'], 'seen_at');
        return count($ids);
    }

    /** Opened (clicked) -- also counts as seen. */
    public function markRead(int $id, array $user): array
    {
        $db = Database::connection();
        if (!$this->canSee($db, $id, $user, false)) {
            return ['success' => false, 'message' => 'Alert not found.', 'not_found' => true];
        }
        $this->stamp($db, [$id], (int) $user['id'], 'seen_at');
        $this->stamp($db, [$id], (int) $user['id'], 'read_at');
        return ['success' => true, 'message' => 'Marked as read.'];
    }

    /** Mark every alert sent to me read (alerts still waiting for an acknowledgement stay open). */
    public function markAllRead(array $user): array
    {
        if (!$this->isStaff($user)) {
            return ['success' => true, 'message' => 'Nothing to mark.', 'data' => ['count' => 0]];
        }
        $db = Database::connection();
        [$where, $params] = $this->visibleWhere($db, $user);
        $stmt = $db->prepare(
            "SELECT a.id FROM alerts a LEFT JOIN alert_receipts r ON r.alert_id = a.id AND r.user_id = :me
             WHERE {$where} AND r.read_at IS NULL AND NOT (a.requires_ack = 1 AND a.acknowledged_at IS NULL AND a.resolved_at IS NULL)"
        );
        $stmt->execute($params + ['me' => (int) $user['id']]);
        $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
        $this->stamp($db, $ids, (int) $user['id'], 'seen_at');
        $this->stamp($db, $ids, (int) $user['id'], 'read_at');
        return ['success' => true, 'message' => count($ids) . ' marked as read.', 'data' => ['count' => count($ids)]];
    }

    /** Acknowledge an urgent / critical alert. The first acknowledgement closes it for everyone. */
    public function acknowledge(int $id, array $user, string $note = ''): array
    {
        $db = Database::connection();
        if (!$this->canSee($db, $id, $user, false)) {
            return ['success' => false, 'message' => 'Alert not found.', 'not_found' => true];
        }
        $note = trim($note);
        if (mb_strlen($note) > 500) {
            return ['success' => false, 'message' => 'Keep the note under 500 characters.', 'errors' => ['note' => 'Too long.']];
        }
        $uid = (int) $user['id'];

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT alert_ack');
        try {
            $stmt = $db->prepare("SELECT id, requires_ack, acknowledged_at, acknowledged_by, resolved_at FROM alerts WHERE id = :id FOR UPDATE");
            $stmt->execute(['id' => $id]);
            $a = $stmt->fetch(PDO::FETCH_ASSOC);
            $already = null;
            if ($a['acknowledged_at']) {
                $already = 'Already acknowledged by ' . $this->userName($db, (int) $a['acknowledged_by']) . ' at ' . date('g:i A', strtotime($a['acknowledged_at'])) . '.';
            } elseif ($a['resolved_at']) {
                $already = 'This alert was already closed.';
            } else {
                $db->prepare("UPDATE alerts SET acknowledged_at = NOW(), acknowledged_by = :by, ack_note = :note WHERE id = :id")
                    ->execute(['by' => $uid, 'note' => $note !== '' ? $note : null, 'id' => $id]);
            }
            foreach (['seen_at', 'read_at'] as $col) {
                $this->stamp($db, [$id], $uid, $col);
            }
            if (!$already) {
                $this->stamp($db, [$id], $uid, 'acknowledged_at');
            }
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT alert_ack');
        } catch (\Throwable $e) {
            if ($owns) {
                if ($db->inTransaction()) {
                    $db->rollBack();
                }
            } else {
                $db->exec('ROLLBACK TO SAVEPOINT alert_ack');
            }
            throw $e;
        }

        return ['success' => true, 'message' => $already ?? 'Acknowledged.', 'data' => ['already' => $already !== null]];
    }

    /** For the send form: roles, departments, staff, types. */
    public function options(): array
    {
        $db = Database::connection();
        $roles = $db->query("SELECT name FROM roles WHERE deleted_at IS NULL ORDER BY name")->fetchAll(PDO::FETCH_COLUMN);
        $departments = $db->query("SELECT id, name FROM departments WHERE deleted_at IS NULL AND status = 'active' ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);
        $users = $db->query(
            "SELECT u.id, " . self::userNameSql('u.id') . " AS name, r.name AS role
             FROM users u JOIN roles r ON r.id = u.role_id
             WHERE u.deleted_at IS NULL AND r.name NOT IN ('" . implode("','", self::NON_STAFF_ROLES) . "')
             ORDER BY name"
        )->fetchAll(PDO::FETCH_ASSOC);
        return [
            'roles' => array_values(array_diff($roles, self::NON_STAFF_ROLES)),
            'departments' => array_map(fn($d) => ['id' => (int) $d['id'], 'name' => $d['name']], $departments),
            'users' => array_map(fn($u) => ['id' => (int) $u['id'], 'name' => $u['name'], 'role' => $u['role']], $users),
            'types' => self::TYPES,
            'urgencies' => self::URGENCIES,
        ];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** "Now" by the database clock, which stamps every alert (PHP's timezone may differ). */
    private static function dbNow(): string
    {
        return (string) Database::connection()->query("SELECT NOW()")->fetchColumn();
    }

    private function isStaff(array $user): bool
    {
        return !empty($user['id']) && !in_array((string) ($user['role'] ?? ''), self::NON_STAFF_ROLES, true);
    }

    /** The departments (units) this person works in. */
    private function departments(PDO $db, int $userId): array
    {
        $stmt = $db->prepare("SELECT DISTINCT department_id FROM employees WHERE user_id = :u AND deleted_at IS NULL AND department_id IS NOT NULL");
        $stmt->execute(['u' => $userId]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /** WHERE clause for "alerts sent to this person" (not expired). */
    private function visibleWhere(PDO $db, array $user): array
    {
        $deps = $this->departments($db, (int) $user['id']);
        $depSql = $deps ? 'OR (t.target_type = \'department\' AND t.target_id IN (' . implode(',', $deps) . '))' : '';
        $where = "(a.expires_at IS NULL OR a.expires_at > NOW())
                  AND EXISTS (SELECT 1 FROM alert_targets t WHERE t.alert_id = a.id AND (
                        t.target_type = 'everyone'
                     OR (t.target_type = 'user' AND t.target_id = :vis_uid)
                     OR (t.target_type = 'role' AND t.target_role = :vis_role)
                     {$depSql}))";
        return [$where, ['vis_uid' => (int) $user['id'], 'vis_role' => (string) ($user['role'] ?? '')]];
    }

    private function canSee(PDO $db, int $id, array $user, bool $adminAny = true): bool
    {
        if ($id <= 0 || empty($user['id'])) {
            return false;
        }
        if ($adminAny) {
            // Detail: admins see any alert, and the sender sees what they sent.
            $stmt = $db->prepare("SELECT created_by FROM alerts WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $createdBy = $stmt->fetchColumn();
            if ($createdBy !== false && (($user['role'] ?? '') === 'admin' || (int) $createdBy === (int) $user['id'])) {
                return true;
            }
        }
        if (!$this->isStaff($user)) {
            return false;
        }
        [$where, $params] = $this->visibleWhere($db, $user);
        $stmt = $db->prepare("SELECT 1 FROM alerts a WHERE a.id = :id AND {$where}");
        $stmt->execute($params + ['id' => $id]);
        return (bool) $stmt->fetchColumn();
    }

    private function fetch(PDO $db, array $user, string $where, array $params, string $order, int $limit, int $offset = 0): array
    {
        $stmt = $db->prepare(
            "SELECT a.*, r.delivered_at AS my_delivered_at, r.seen_at AS my_seen_at, r.read_at AS my_read_at,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name, p.patient_no,
                    " . self::userNameSql('a.acknowledged_by') . " AS acknowledged_by_name,
                    " . self::userNameSql('a.created_by') . " AS created_by_name
             FROM alerts a
             LEFT JOIN alert_receipts r ON r.alert_id = a.id AND r.user_id = :me
             LEFT JOIN patients p ON p.id = a.patient_id
             WHERE {$where}
             ORDER BY {$order}
             LIMIT " . (int) $limit . " OFFSET " . (int) $offset
        );
        $stmt->execute($params + ['me' => (int) $user['id']]);
        return array_map(fn($a) => $this->shape($a), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function shape(array $a): array
    {
        $open = (int) $a['requires_ack'] === 1 && !$a['acknowledged_at'] && !$a['resolved_at'];
        return [
            'id' => (int) $a['id'],
            'type' => $a['alert_type'],
            'type_label' => self::TYPES[$a['alert_type']] ?? ucwords(str_replace('_', ' ', $a['alert_type'])),
            'urgency' => $a['urgency'],
            'title' => $a['title'],
            'body' => $a['body'],
            'patient_id' => $a['patient_id'] !== null ? (int) $a['patient_id'] : null,
            'patient_name' => $a['patient_id'] !== null ? ($a['patient_name'] ?: null) : null,
            'patient_no' => $a['patient_no'] ?? null,
            'link' => $a['link_json'] ? json_decode($a['link_json'], true) : null,
            'requires_ack' => (int) $a['requires_ack'] === 1,
            'open' => $open,
            'acknowledged_at' => $a['acknowledged_at'],
            'acknowledged_by' => $a['acknowledged_by'] !== null ? (int) $a['acknowledged_by'] : null,
            'acknowledged_by_name' => $a['acknowledged_by_name'],
            'ack_note' => $a['ack_note'],
            'resolved_at' => $a['resolved_at'],
            'resolve_note' => $a['resolve_note'],
            'created_at' => $a['created_at'],
            'created_by_name' => $a['created_by'] !== null ? $a['created_by_name'] : 'System',
            'escalation_level' => (int) ($a['escalation_level'] ?? 0),
            'last_escalated_at' => $a['last_escalated_at'] ?? null,
            'read' => $a['my_read_at'] !== null || (!$open && ($a['acknowledged_at'] || $a['resolved_at'])),
            'my_seen_at' => $a['my_seen_at'],
            'my_read_at' => $a['my_read_at'],
        ];
    }

    /** Record a receipt time for this person (first time only). */
    private function stamp(PDO $db, array $ids, int $userId, string $column): void
    {
        if (!$ids || !in_array($column, ['delivered_at', 'seen_at', 'read_at', 'acknowledged_at'], true)) {
            return;
        }
        $insert = $column === 'delivered_at' ? 'delivered_at' : "delivered_at, {$column}";
        $values = $column === 'delivered_at' ? 'NOW()' : 'NOW(), NOW()';
        $stmt = $db->prepare(
            "INSERT INTO alert_receipts (alert_id, user_id, {$insert}) VALUES (:a, :u, {$values})
             ON DUPLICATE KEY UPDATE {$column} = COALESCE({$column}, NOW()), delivered_at = COALESCE(delivered_at, NOW())"
        );
        foreach (array_unique($ids) as $id) {
            $stmt->execute(['a' => (int) $id, 'u' => $userId]);
        }
    }

    private static function normalizeTargets(PDO $db, $raw, array &$errors): array
    {
        $out = [];
        $raw = is_array($raw) ? $raw : [];
        foreach ($raw as $t) {
            if (!is_array($t)) {
                continue;
            }
            // Accept both {"user": 5} and {"type": "user", "id": 5}.
            if (isset($t['type'])) {
                $type = (string) $t['type'];
                $value = $type === 'role' ? ($t['role'] ?? $t['id'] ?? null) : ($t['id'] ?? null);
            } else {
                $type = (string) array_key_first($t);
                $value = $t[$type] ?? null;
            }
            if (!in_array($type, self::TARGET_TYPES, true)) {
                $errors['targets'] = 'Unknown recipient type.';
                continue;
            }
            if ($type === 'everyone') {
                $out['everyone'] = ['type' => 'everyone', 'id' => null, 'role' => null];
            } elseif ($type === 'role') {
                $role = trim((string) $value);
                $stmt = $db->prepare("SELECT name FROM roles WHERE name = :n AND deleted_at IS NULL");
                $stmt->execute(['n' => $role]);
                if ($role === '' || !$stmt->fetchColumn() || in_array($role, self::NON_STAFF_ROLES, true)) {
                    $errors['targets'] = "Unknown role: {$role}.";
                    continue;
                }
                $out['role:' . $role] = ['type' => 'role', 'id' => null, 'role' => $role];
            } else {
                $id = (int) $value;
                $sql = $type === 'user' ? "SELECT id FROM users WHERE id = :id AND deleted_at IS NULL"
                    : "SELECT id FROM departments WHERE id = :id AND deleted_at IS NULL";
                $stmt = $db->prepare($sql);
                $stmt->execute(['id' => $id]);
                if ($id <= 0 || !$stmt->fetchColumn()) {
                    $errors['targets'] = $type === 'user' ? 'Recipient not found.' : 'Unit not found.';
                    continue;
                }
                $out[$type . ':' . $id] = ['type' => $type, 'id' => $id, 'role' => null];
            }
        }
        if (!$out && empty($errors['targets'])) {
            $errors['targets'] = 'Choose who the alert is for.';
        }
        return array_values($out);
    }

    private static function normalizeLink($link, ?int $patientId): ?array
    {
        if (is_string($link) && $link !== '') {
            $decoded = json_decode($link, true);
            $link = is_array($decoded) ? $decoded : null;
        }
        $out = [];
        if (is_array($link)) {
            foreach (self::LINK_KEYS as $k) {
                if (isset($link[$k]) && $link[$k] !== '') {
                    $out[$k] = $k === 'tab' ? preg_replace('/[^a-z0-9_]/', '', strtolower((string) $link[$k])) : (int) $link[$k];
                }
            }
        }
        if (!$out && $patientId) {
            $out['patient_id'] = $patientId;
        }
        return $out ?: null;
    }

    private static function targetLabel(array $t): string
    {
        return match ($t['target_type']) {
            'everyone' => 'Everyone (all staff)',
            'role' => 'All ' . ucwords(str_replace('_', ' ', (string) $t['target_role'])) . 's',
            'department' => ($t['name'] ?: 'Unit #' . $t['target_id']) . ' (unit)',
            default => $t['name'] ?: 'User #' . $t['target_id'],
        };
    }

    private function userName(PDO $db, int $id): string
    {
        $stmt = $db->query("SELECT " . self::userNameSql((string) $id));
        return (string) ($stmt->fetchColumn() ?: 'someone');
    }

    private static function userNameSql(string $column): string
    {
        // Own aliases (nu / ne) so a caller's "u.id" can't be captured by this subquery.
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL
                 WHERE nu.id = {$column} LIMIT 1)";
    }
}
