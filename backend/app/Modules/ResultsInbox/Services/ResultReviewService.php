<?php

namespace App\Modules\ResultsInbox\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use PDO;

/**
 * Results sign-off (module 7, Phase 2).
 *
 *   * A doctor marks an order's results reviewed, with an optional action (repeat test, call the
 *     patient, ...) and comment. The order's status becomes "reviewed"; every sign-off is kept
 *     (result_reviews).
 *   * Results changed after the sign-off (a corrected result) need a new review.
 *   * Results not reviewed within general_settings.result_review_days days are flagged: in the
 *     inbox ("To review"), on Patient Results, and with an alert to the ordering doctor (else the
 *     patient's own doctor). Admin sees every overdue result.
 */
class ResultReviewService
{
    /** Who signs results off. */
    public const REVIEW_ROLES = ['doctor', 'clinician'];
    public const ACTIONS = [
        'none' => 'No action needed',
        'repeat_test' => 'Repeat test',
        'call_patient' => 'Call patient',
        'follow_up' => 'Follow-up visit',
        'change_treatment' => 'Change treatment',
        'refer' => 'Refer',
        'other' => 'Other (see comment)',
    ];
    public const DEFAULT_DAYS = 3;
    public const MAX_DAYS = 60;
    private const THROTTLE_SECONDS = 300;

    public static function days(): int
    {
        try {
            $d = Database::connection()->query("SELECT result_review_days FROM general_settings ORDER BY id LIMIT 1")->fetchColumn();
        } catch (\Throwable $e) {
            $d = false;   // column not there yet (schema 264 not applied)
        }
        return $d !== false && (int) $d > 0 ? (int) $d : self::DEFAULT_DAYS;
    }

    /** Admin: after how many days unreviewed results are flagged. */
    public function saveDays($days, array $user): array
    {
        if (($user['role'] ?? '') !== 'admin') {
            return ['success' => false, 'message' => 'Only an administrator can change this.', 'forbidden' => true];
        }
        $raw = trim((string) $days);
        if (!ctype_digit($raw) || (int) $raw < 1 || (int) $raw > self::MAX_DAYS) {
            return ['success' => false, 'message' => 'Enter a number of days from 1 to ' . self::MAX_DAYS . '.', 'errors' => ['days' => 'Enter 1 to ' . self::MAX_DAYS . '.']];
        }
        Database::connection()->prepare("UPDATE general_settings SET result_review_days = :d")->execute(['d' => (int) $raw]);
        return ['success' => true, 'message' => "Results not reviewed after {$raw} day" . ((int) $raw > 1 ? 's' : '') . ' are flagged.', 'data' => ['days' => (int) $raw]];
    }

    /**
     * Called when an order's results are saved (hash of the results; null = no results left).
     * Changed results restart the review clock and need a new sign-off.
     */
    public function resultsChanged(int $orderId, ?string $hash): void
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT results_hash, reviewed_at FROM patient_procedure_orders WHERE id = :id");
        $stmt->execute(['id' => $orderId]);
        $o = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$o) {
            return;
        }
        if ($o['results_hash'] === $hash) {
            if ($hash !== null && $o['reviewed_at']) {
                // Saved again unchanged: still reviewed (saving sets the status back to "resulted").
                $db->prepare("UPDATE patient_procedure_orders SET status = 'reviewed' WHERE id = :id")->execute(['id' => $orderId]);
            }
            return;
        }
        $db->prepare(
            "UPDATE patient_procedure_orders SET results_hash = :h, results_at = IF(:h2 IS NULL, NULL, NOW()),
                    reviewed_at = NULL, reviewed_by = NULL, review_action = NULL, review_comment = NULL WHERE id = :id"
        )->execute(['h' => $hash, 'h2' => $hash, 'id' => $orderId]);
        if ($o['results_hash']) {
            AlertService::resolveByKey(self::key($orderId, $o['results_hash']), null, 'Results changed');
        }
    }

    /** Sign off an order's results. data: action (ACTIONS, default none), comment? (required for "other"). */
    public function review(int $orderId, array $data, array $user): array
    {
        if (!in_array($user['role'] ?? '', self::REVIEW_ROLES, true)) {
            return ['success' => false, 'message' => 'Only a doctor can mark results reviewed.', 'forbidden' => true];
        }
        $db = Database::connection();
        $stmt = $db->prepare("SELECT id, results_hash, results_at, deleted_at FROM patient_procedure_orders WHERE id = :id");
        $stmt->execute(['id' => $orderId]);
        $o = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$o || $o['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Order not found.', 'not_found' => true];
        }
        $count = $db->prepare("SELECT COUNT(*) FROM patient_procedure_results WHERE patient_procedure_order_id = :id AND deleted_at IS NULL");
        $count->execute(['id' => $orderId]);
        if (!(int) $count->fetchColumn()) {
            return ['success' => false, 'message' => 'There are no results to review yet.'];
        }
        $action = (string) ($data['action'] ?? '') ?: 'none';
        $comment = trim((string) ($data['comment'] ?? ''));
        $errors = [];
        if (!isset(self::ACTIONS[$action])) {
            $errors['action'] = 'Choose an action.';
        }
        if ($action === 'other' && $comment === '') {
            $errors['comment'] = 'Say what is to be done.';
        }
        if (mb_strlen($comment) > 1000) {
            $errors['comment'] = 'Keep it under 1000 characters.';
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $uid = (int) $user['id'];
        $db->prepare(
            "UPDATE patient_procedure_orders SET status = 'reviewed', reviewed_at = :t, reviewed_by = :u, review_action = :a, review_comment = :c,
                    results_at = COALESCE(results_at, :t2), updated_at = :t3, updated_by = :u2 WHERE id = :id"
        )->execute(['t' => $now, 'u' => $uid, 'a' => $action, 'c' => $comment !== '' ? $comment : null, 't2' => $now, 't3' => $now, 'u2' => $uid, 'id' => $orderId]);
        $db->prepare("INSERT INTO result_reviews (order_id, reviewed_by, action, comment, results_hash, reviewed_at) VALUES (:o, :u, :a, :c, :h, :t)")
            ->execute(['o' => $orderId, 'u' => $uid, 'a' => $action, 'c' => $comment !== '' ? $comment : null, 'h' => $o['results_hash'], 't' => $now]);
        // Reviewing it means it was seen.
        $db->prepare("UPDATE results_inbox SET opened_at = COALESCE(opened_at, :t) WHERE order_id = :o AND user_id = :u")->execute(['t' => $now, 'o' => $orderId, 'u' => $uid]);
        if ($o['results_hash']) {
            AlertService::resolveByKey(self::key($orderId, $o['results_hash']), $uid, 'Reviewed');
        }
        return ['success' => true, 'message' => 'Marked reviewed' . ($action !== 'none' ? ': ' . self::ACTIONS[$action] : '') . '.', 'data' => $this->status($orderId, $user)];
    }

    /** The order's sign-off for the result view: current review, earlier ones, overdue, may this person sign it off. */
    public function status(int $orderId, array $user): array
    {
        $db = Database::connection();
        $days = self::days();
        $stmt = $db->prepare(
            "SELECT o.reviewed_at, o.review_action, o.review_comment, o.results_at, " . self::nameSql('o.reviewed_by') . " AS reviewed_by_name,
                    (o.reviewed_at IS NULL AND o.results_at < NOW() - INTERVAL {$days} DAY) AS overdue, TIMESTAMPDIFF(DAY, o.results_at, NOW()) AS days_waiting
             FROM patient_procedure_orders o WHERE o.id = :id"
        );
        $stmt->execute(['id' => $orderId]);
        $o = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
        $h = $db->prepare(
            "SELECT r.reviewed_at, r.action, r.comment, " . self::nameSql('r.reviewed_by') . " AS reviewed_by_name
             FROM result_reviews r WHERE r.order_id = :id ORDER BY r.id DESC LIMIT 10"
        );
        $h->execute(['id' => $orderId]);
        $history = array_map(fn($r) => $r + ['action_label' => self::ACTIONS[$r['action']] ?? $r['action']], $h->fetchAll(PDO::FETCH_ASSOC));
        return [
            'reviewed' => !empty($o['reviewed_at']), 'reviewed_at' => $o['reviewed_at'] ?? null, 'reviewed_by_name' => $o['reviewed_by_name'] ?? null,
            'action' => $o['review_action'] ?? null, 'action_label' => isset($o['review_action']) ? (self::ACTIONS[$o['review_action']] ?? $o['review_action']) : null,
            'comment' => $o['review_comment'] ?? null, 'results_at' => $o['results_at'] ?? null,
            'overdue' => (int) ($o['overdue'] ?? 0) === 1, 'days_waiting' => isset($o['days_waiting']) ? (int) $o['days_waiting'] : null, 'review_days' => $days,
            'can_review' => in_array($user['role'] ?? '', self::REVIEW_ROLES, true), 'actions' => self::ACTIONS,
            // Earlier sign-offs (of results since corrected), not the current one.
            'history' => !empty($o['reviewed_at']) ? array_slice($history, 1) : $history,
        ];
    }

    /**
     * Flag results not reviewed in time: one alert per order (and result version) to the ordering
     * doctor, else the patient's own doctor. Runs from the bell's poll (every 5 minutes at most)
     * and from cron/result_review_overdue.php.
     */
    public function runOverdue(bool $force = false): array
    {
        $db = Database::connection();
        if (!$force && !$this->claimRun($db)) {
            return [];
        }
        $days = self::days();
        $rows = $db->query(
            "SELECT o.id, o.patient_id, o.results_hash, TIMESTAMPDIFF(DAY, o.results_at, NOW()) AS waiting, c.name AS test_name,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name
             FROM patient_procedure_orders o JOIN patients p ON p.id = o.patient_id AND p.deleted_at IS NULL
             LEFT JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             WHERE o.deleted_at IS NULL AND o.reviewed_at IS NULL AND o.results_hash IS NOT NULL
               AND o.results_at < NOW() - INTERVAL {$days} DAY
             ORDER BY o.results_at LIMIT 500"
        )->fetchAll(PDO::FETCH_ASSOC);
        $seen = $db->prepare("SELECT 1 FROM alerts WHERE dedupe_key = :k LIMIT 1");
        $who = $db->prepare("SELECT user_id, reason FROM results_inbox WHERE order_id = :o AND reason IN ('ordering', 'primary')");
        $raised = [];
        foreach ($rows as $r) {
            $key = self::key((int) $r['id'], $r['results_hash']);
            $seen->execute(['k' => $key]);
            if ($seen->fetchColumn()) {
                continue;   // already flagged (this version of the results)
            }
            $who->execute(['o' => $r['id']]);
            $by = [];
            foreach ($who->fetchAll(PDO::FETCH_ASSOC) as $w) {
                $by[$w['reason']][] = (int) $w['user_id'];
            }
            $users = $by['ordering'] ?? $by['primary'] ?? [];
            if (!$users) {
                continue;   // no doctor on record: shown on the admin's overdue list only
            }
            $res = AlertService::raise([
                'type' => 'result_review', 'urgency' => 'info',
                'title' => "Result not reviewed for {$r['waiting']} days: " . ($r['test_name'] ?: 'Result') . " — {$r['patient_name']}",
                'body' => "Results are to be reviewed within {$days} day" . ($days > 1 ? 's' : '') . '. Open it and mark it reviewed (with what is to be done, if anything).',
                'patient_id' => (int) $r['patient_id'], 'link' => ['result' => (int) $r['id']],
                'targets' => array_map(fn($u) => ['user' => $u], $users), 'source_type' => 'patient_procedure_orders', 'source_id' => (int) $r['id'],
                'dedupe_key' => $key,
            ]);
            if (!empty($res['success'])) {
                $raised[] = ['order_id' => (int) $r['id'], 'patient' => $r['patient_name'], 'test' => $r['test_name'], 'days' => (int) $r['waiting']];
            }
        }
        return $raised;
    }

    public static function key(int $orderId, string $hash): string
    {
        return "resultreview:{$orderId}:" . substr($hash, 0, 12);
    }

    private function claimRun(PDO $db): bool
    {
        $db->exec("INSERT IGNORE INTO alert_job_runs (job, last_run_at) VALUES ('result_review_overdue', '2000-01-01 00:00:00')");
        $stmt = $db->prepare(
            "UPDATE alert_job_runs SET last_run_at = NOW()
             WHERE job = 'result_review_overdue' AND last_run_at <= DATE_SUB(NOW(), INTERVAL " . self::THROTTLE_SECONDS . " SECOND)"
        );
        $stmt->execute();
        return $stmt->rowCount() === 1;
    }

    private static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL WHERE nu.id = {$column} LIMIT 1)";
    }
}
