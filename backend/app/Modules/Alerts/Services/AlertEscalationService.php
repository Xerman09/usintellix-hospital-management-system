<?php

namespace App\Modules\Alerts\Services;

use App\Core\Database;
use PDO;

/**
 * Escalation: an urgent / critical alert nobody acknowledges in time goes to the next
 * level of its chain. The chain is set per alert type; '*' is the default for every type
 * without its own policy (a type with its own inactive policy is not escalated).
 *
 * run() is called from the bell's poll (at most every 30 seconds, whoever is logged in)
 * and from backend/cron/alert_escalation.php for a scheduled task.
 */
class AlertEscalationService
{
    public const DEFAULT_TYPE = '*';
    public const MAX_STEPS = 6;
    public const THROTTLE_SECONDS = 30;

    /**
     * Escalate every overdue alert by one level. Returns what was escalated.
     * @return array<int, array{alert_id: int, level: int, to: string}>
     */
    public function run(bool $force = false): array
    {
        $db = Database::connection();
        if (!$force && !$this->claimRun($db)) {
            return [];
        }
        $policies = $this->loadPolicies($db);
        if (!$policies) {
            return [];
        }

        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $stmt = $db->query(
            "SELECT id, alert_type, urgency, created_at, escalation_level, last_escalated_at FROM alerts
             WHERE requires_ack = 1 AND acknowledged_at IS NULL AND resolved_at IS NULL
               AND urgency IN ('urgent', 'critical') AND (expires_at IS NULL OR expires_at > NOW())
             ORDER BY id"
        );
        $done = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $a) {
            $step = $this->dueStep($a, $policies, $now);
            if ($step && ($r = $this->escalate($db, (int) $a['id'], (int) $a['escalation_level'], $step))) {
                $done[] = $r;
                if ($a['alert_type'] === 'critical_lab') {
                    // The Critical TAT report shows the escalation.
                    try {
                        (new \App\Modules\LabRanges\Services\CriticalLabService())->onEscalated((int) $a['id'], $r['to']);
                    } catch (\Throwable $e) {
                        error_log('critical TAT escalation note failed: ' . $e->getMessage());
                    }
                }
            }
        }
        return $done;
    }

    /** The policy that applies to an alert type (its own, else the default), or null. */
    public function policyFor(string $type, ?array $policies = null): ?array
    {
        $policies ??= $this->loadPolicies(Database::connection());
        return $policies[$type] ?? $policies[self::DEFAULT_TYPE] ?? null;
    }

    /**
     * For the alert's detail: the next level and when it fires, if it is still open.
     * @return array{level: int, at: string, to: string, minutes_left: int}|null
     */
    public function next(array $alert): ?array
    {
        if (!$alert['open'] || !in_array($alert['urgency'], ['urgent', 'critical'], true)) {
            return null;
        }
        $policy = $this->policyFor($alert['type']);
        if (!$this->applies($policy, $alert['urgency'])) {
            return null;
        }
        $step = $policy['steps'][(int) $alert['escalation_level']] ?? null;
        if (!$step) {
            return null;
        }
        $db = Database::connection();
        $base = $alert['last_escalated_at'] ?: $alert['created_at'];
        $at = date('Y-m-d H:i:s', strtotime($base) + $step['wait_minutes'] * 60);
        $now = strtotime((string) $db->query("SELECT NOW()")->fetchColumn());
        return ['level' => (int) $alert['escalation_level'] + 1, 'at' => $at, 'to' => $step['label'],
            'minutes_left' => max(0, (int) ceil((strtotime($at) - $now) / 60))];
    }

    /** The escalations that already happened for an alert. */
    public function history(int $alertId): array
    {
        $stmt = Database::connection()->prepare("SELECT level, escalated_at, waited_minutes, target_label FROM alert_escalations WHERE alert_id = :id ORDER BY level");
        $stmt->execute(['id' => $alertId]);
        return array_map(fn($r) => ['level' => (int) $r['level'], 'escalated_at' => $r['escalated_at'], 'waited_minutes' => (int) $r['waited_minutes'], 'to' => $r['target_label']],
            $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    // ------------------------------------------------------------------
    // Settings (admin)
    // ------------------------------------------------------------------

    /** Every policy with its steps, plus the alert types that still use the default. */
    public function settings(): array
    {
        $policies = $this->loadPolicies(Database::connection(), true);
        $out = [];
        foreach ($policies as $type => $p) {
            $out[] = $p + ['type_label' => $type === self::DEFAULT_TYPE ? 'All other alert types (default)' : (AlertService::TYPES[$type] ?? $type)];
        }
        usort($out, fn($a, $b) => ($a['alert_type'] === self::DEFAULT_TYPE ? -1 : ($b['alert_type'] === self::DEFAULT_TYPE ? 1 : strcmp($a['type_label'], $b['type_label']))));
        return [
            'policies' => $out,
            'types' => AlertService::TYPES,
            'unconfigured_types' => array_values(array_diff(array_keys(AlertService::TYPES), array_keys($policies))),
        ];
    }

    /**
     * Create or replace a policy. data: alert_type, applies_to (critical|urgent), is_active,
     * steps: [{wait_minutes, target_type (user|role|department), target_id?, target_role?}]
     */
    public function save(array $data, int $userId): array
    {
        $db = Database::connection();
        $errors = [];
        $type = trim((string) ($data['alert_type'] ?? ''));
        if ($type !== self::DEFAULT_TYPE && !array_key_exists($type, AlertService::TYPES)) {
            $errors['alert_type'] = 'Choose an alert type.';
        }
        $appliesTo = (string) ($data['applies_to'] ?? 'critical');
        if (!in_array($appliesTo, ['critical', 'urgent'], true)) {
            $errors['applies_to'] = 'Choose critical only, or urgent and critical.';
        }
        $active = !empty($data['is_active']);
        $steps = [];
        $raw = is_array($data['steps'] ?? null) ? array_values($data['steps']) : [];
        if (count($raw) > self::MAX_STEPS) {
            $errors['steps'] = 'At most ' . self::MAX_STEPS . ' levels.';
        }
        if ($active && !$raw) {
            $errors['steps'] = 'Add at least one level, or turn escalation off for this type.';
        }
        foreach ($raw as $i => $s) {
            $n = $i + 1;
            $wait = filter_var($s['wait_minutes'] ?? null, FILTER_VALIDATE_INT);
            if ($wait === false || $wait < 1 || $wait > 1440) {
                $errors["steps.{$i}.wait_minutes"] = "Level {$n}: wait 1 to 1440 minutes.";
            }
            $tt = (string) ($s['target_type'] ?? '');
            $target = ['target_type' => $tt, 'target_id' => null, 'target_role' => null];
            if ($tt === 'role') {
                $role = trim((string) ($s['target_role'] ?? ''));
                $q = $db->prepare("SELECT 1 FROM roles WHERE name = :n AND deleted_at IS NULL");
                $q->execute(['n' => $role]);
                if ($role === '' || $role === 'patient' || !$q->fetchColumn()) {
                    $errors["steps.{$i}.target"] = "Level {$n}: choose a role.";
                }
                $target['target_role'] = $role;
            } elseif ($tt === 'user' || $tt === 'department') {
                $id = (int) ($s['target_id'] ?? 0);
                $q = $db->prepare($tt === 'user' ? "SELECT 1 FROM users WHERE id = :id AND deleted_at IS NULL" : "SELECT 1 FROM departments WHERE id = :id AND deleted_at IS NULL");
                $q->execute(['id' => $id]);
                if (!$q->fetchColumn()) {
                    $errors["steps.{$i}.target"] = "Level {$n}: choose " . ($tt === 'user' ? 'a person.' : 'a unit.');
                }
                $target['target_id'] = $id;
            } else {
                $errors["steps.{$i}.target"] = "Level {$n}: choose who it goes to.";
            }
            $steps[] = $target + ['wait_minutes' => (int) $wait];
        }
        if ($errors) {
            return ['success' => false, 'message' => 'Check the escalation settings.', 'errors' => $errors];
        }

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT alert_policy');
        try {
            $db->prepare(
                "INSERT INTO alert_escalation_policies (alert_type, applies_to, is_active, updated_by, updated_at, created_at)
                 VALUES (:t, :a, :act, :by, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE applies_to = VALUES(applies_to), is_active = VALUES(is_active), updated_by = VALUES(updated_by), updated_at = NOW()"
            )->execute(['t' => $type, 'a' => $appliesTo, 'act' => $active ? 1 : 0, 'by' => $userId ?: null]);
            $q = $db->prepare("SELECT id FROM alert_escalation_policies WHERE alert_type = :t");
            $q->execute(['t' => $type]);
            $policyId = (int) $q->fetchColumn();
            $db->prepare("DELETE FROM alert_escalation_steps WHERE policy_id = :p")->execute(['p' => $policyId]);
            $ins = $db->prepare(
                "INSERT INTO alert_escalation_steps (policy_id, step_no, wait_minutes, target_type, target_id, target_role)
                 VALUES (:p, :n, :w, :tt, :tid, :tr)"
            );
            foreach ($steps as $i => $s) {
                $ins->execute(['p' => $policyId, 'n' => $i + 1, 'w' => $s['wait_minutes'], 'tt' => $s['target_type'], 'tid' => $s['target_id'], 'tr' => $s['target_role']]);
            }
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT alert_policy');
        } catch (\Throwable $e) {
            $owns ? ($db->inTransaction() && $db->rollBack()) : $db->exec('ROLLBACK TO SAVEPOINT alert_policy');
            throw $e;
        }
        return ['success' => true, 'message' => 'Escalation saved.', 'data' => ['id' => $policyId]];
    }

    /** Remove a type's own policy (it goes back to the default). The default can't be removed. */
    public function remove(string $type): array
    {
        if ($type === self::DEFAULT_TYPE) {
            return ['success' => false, 'message' => 'The default can\'t be removed. Turn it off instead.'];
        }
        $stmt = Database::connection()->prepare("DELETE FROM alert_escalation_policies WHERE alert_type = :t");
        $stmt->execute(['t' => $type]);
        if (!$stmt->rowCount()) {
            return ['success' => false, 'message' => 'Policy not found.', 'not_found' => true];
        }
        return ['success' => true, 'message' => 'Removed. This type now uses the default.'];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** Only one request runs the check every THROTTLE_SECONDS. */
    private function claimRun(PDO $db): bool
    {
        $stmt = $db->prepare(
            "UPDATE alert_job_runs SET last_run_at = NOW()
             WHERE job = 'escalation' AND last_run_at <= DATE_SUB(NOW(), INTERVAL " . self::THROTTLE_SECONDS . " SECOND)"
        );
        $stmt->execute();
        return $stmt->rowCount() === 1;
    }

    private function applies(?array $policy, string $urgency): bool
    {
        return $policy && $policy['is_active'] && $policy['steps']
            && ($urgency === 'critical' || $policy['applies_to'] === 'urgent');
    }

    private function dueStep(array $a, array $policies, string $now): ?array
    {
        $policy = $this->policyFor($a['alert_type'], $policies);
        if (!$this->applies($policy, $a['urgency'])) {
            return null;
        }
        $step = $policy['steps'][(int) $a['escalation_level']] ?? null;
        if (!$step) {
            return null;
        }
        $base = $a['last_escalated_at'] ?: $a['created_at'];
        return strtotime($now) >= strtotime($base) + $step['wait_minutes'] * 60 ? $step : null;
    }

    private function escalate(PDO $db, int $alertId, int $fromLevel, array $step): ?array
    {
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT alert_escalate');
        try {
            // Someone may have acknowledged it, or another request escalated it, meanwhile.
            $stmt = $db->prepare(
                "SELECT escalation_level, created_at, last_escalated_at FROM alerts
                 WHERE id = :id AND acknowledged_at IS NULL AND resolved_at IS NULL FOR UPDATE"
            );
            $stmt->execute(['id' => $alertId]);
            $a = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$a || (int) $a['escalation_level'] !== $fromLevel) {
                $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT alert_escalate');
                return null;
            }
            $level = $fromLevel + 1;
            $now = (string) $db->query("SELECT NOW()")->fetchColumn();
            $waited = (int) round((strtotime($now) - strtotime($a['last_escalated_at'] ?: $a['created_at'])) / 60);

            $db->prepare(
                "INSERT INTO alert_targets (alert_id, target_type, target_id, target_role, escalation_level) VALUES (:a, :t, :id, :role, :lvl)"
            )->execute(['a' => $alertId, 't' => $step['target_type'], 'id' => $step['target_id'], 'role' => $step['target_role'], 'lvl' => $level]);
            $db->prepare("UPDATE alerts SET escalation_level = :lvl, last_escalated_at = :now WHERE id = :id")
                ->execute(['lvl' => $level, 'now' => $now, 'id' => $alertId]);
            $db->prepare(
                "INSERT INTO alert_escalations (alert_id, level, escalated_at, waited_minutes, target_label) VALUES (:a, :lvl, :now, :w, :label)"
            )->execute(['a' => $alertId, 'lvl' => $level, 'now' => $now, 'w' => $waited, 'label' => mb_substr($step['label'], 0, 255)]);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT alert_escalate');
            return ['alert_id' => $alertId, 'level' => $level, 'to' => $step['label']];
        } catch (\Throwable $e) {
            $owns ? ($db->inTransaction() && $db->rollBack()) : $db->exec('ROLLBACK TO SAVEPOINT alert_escalate');
            throw $e;
        }
    }

    /** @return array<string, array> keyed by alert_type, each with 'steps' (0-based, in order) */
    private function loadPolicies(PDO $db, bool $withInactive = true): array
    {
        $policies = [];
        $rows = $db->query(
            "SELECT p.*, " . self::userNameSql('p.updated_by') . " AS updated_by_name FROM alert_escalation_policies p ORDER BY p.id"
        )->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $p) {
            $policies[$p['alert_type']] = [
                'id' => (int) $p['id'], 'alert_type' => $p['alert_type'], 'applies_to' => $p['applies_to'],
                'is_active' => (int) $p['is_active'] === 1, 'updated_at' => $p['updated_at'], 'updated_by_name' => $p['updated_by'] ? $p['updated_by_name'] : null,
                'steps' => [],
            ];
        }
        if (!$policies) {
            return [];
        }
        $steps = $db->query(
            "SELECT s.*, CASE s.target_type
                    WHEN 'user' THEN " . self::userNameSql('s.target_id') . "
                    WHEN 'department' THEN (SELECT d.name FROM departments d WHERE d.id = s.target_id) END AS name,
                    p.alert_type
             FROM alert_escalation_steps s JOIN alert_escalation_policies p ON p.id = s.policy_id
             ORDER BY s.policy_id, s.step_no"
        )->fetchAll(PDO::FETCH_ASSOC);
        foreach ($steps as $s) {
            $policies[$s['alert_type']]['steps'][] = [
                'step_no' => (int) $s['step_no'], 'wait_minutes' => (int) $s['wait_minutes'],
                'target_type' => $s['target_type'], 'target_id' => $s['target_id'] !== null ? (int) $s['target_id'] : null,
                'target_role' => $s['target_role'],
                'label' => match ($s['target_type']) {
                    'role' => 'All ' . ucwords(str_replace('_', ' ', (string) $s['target_role'])) . 's',
                    'department' => ($s['name'] ?: 'Unit #' . $s['target_id']) . ' (unit)',
                    default => $s['name'] ?: 'User #' . $s['target_id'],
                },
            ];
        }
        return $policies;
    }

    private static function userNameSql(string $column): string
    {
        // Own aliases (nu / ne) so a caller's "u.id" can't be captured by this subquery.
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL
                 WHERE nu.id = {$column} LIMIT 1)";
    }
}
