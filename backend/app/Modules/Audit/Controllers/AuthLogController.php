<?php

declare(strict_types=1);

namespace App\Modules\Audit\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Database;
use App\Core\Session;
use App\Core\AuditLogger;
use PDO;
use Throwable;

class AuthLogController extends Controller
{
    /**
     * List unified authentication events or active sessions with security metrics.
     * Route: GET /auth-logs
     */
    public function index(): void
    {
        $request = new Request();
        $db = Database::connection();

        $subTab = trim((string) $request->input('subtab', 'events'));
        $page = max(1, (int) $request->input('page', 1));
        $limit = min(100, max(5, (int) $request->input('limit', 20)));
        $offset = ($page - 1) * $limit;

        $action = trim((string) $request->input('action', ''));
        $status = trim((string) $request->input('status', ''));
        $userId = (int) $request->input('user_id', 0);
        $dateFrom = trim((string) $request->input('date_from', ''));
        $dateTo = trim((string) $request->input('date_to', ''));
        $search = trim((string) $request->input('search', ''));

        try {
            // 1. Calculate Real-Time Security Metrics
            $metrics = $this->calculateMetrics($db);

            if ($subTab === 'sessions') {
                // Query user_session_histories
                $conditions = [];
                $params = [];

                if ($status === 'active') {
                    $conditions[] = "s.is_active = 1";
                } elseif ($status === 'inactive' || $status === 'closed') {
                    $conditions[] = "s.is_active = 0";
                }

                if ($userId > 0) {
                    $conditions[] = "s.user_id = :user_id";
                    $params['user_id'] = $userId;
                }

                if (!empty($dateFrom)) {
                    $conditions[] = "s.login_at >= :date_from";
                    $params['date_from'] = $dateFrom . ' 00:00:00';
                }

                if (!empty($dateTo)) {
                    $conditions[] = "s.login_at <= :date_to";
                    $params['date_to'] = $dateTo . ' 23:59:59';
                }

                if (!empty($search)) {
                    $conditions[] = "(
                        u.username LIKE :search 
                        OR e.first_name LIKE :search 
                        OR e.last_name LIKE :search 
                        OR s.ip_address LIKE :search 
                        OR s.device_type LIKE :search 
                        OR s.session_id LIKE :search
                        OR s.revocation_reason LIKE :search
                    )";
                    $params['search'] = '%' . $search . '%';
                }

                $whereClause = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

                // Total count
                $countSql = "
                    SELECT COUNT(*) 
                    FROM `user_session_histories` s
                    LEFT JOIN `users` u ON u.id = s.user_id
                    LEFT JOIN `employees` e ON e.user_id = u.id
                    {$whereClause}
                ";
                $countStmt = $db->prepare($countSql);
                foreach ($params as $k => $v) {
                    $countStmt->bindValue(':' . $k, $v);
                }
                $countStmt->execute();
                $total = (int) $countStmt->fetchColumn();

                // Records
                $sql = "
                    SELECT 
                        s.id,
                        s.user_id,
                        s.session_id,
                        s.ip_address,
                        s.user_agent,
                        s.device_type,
                        s.login_at,
                        s.last_activity_at,
                        s.logout_at,
                        s.is_active,
                        s.revoked_by,
                        s.revocation_reason,
                        u.username,
                        u.status AS user_status,
                        r.name AS role_name,
                        TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))) AS full_name,
                        e.employee_no,
                        admin_u.username AS revoked_by_username
                    FROM `user_session_histories` s
                    LEFT JOIN `users` u ON u.id = s.user_id
                    LEFT JOIN `roles` r ON r.id = u.role_id
                    LEFT JOIN `employees` e ON e.user_id = u.id
                    LEFT JOIN `users` admin_u ON admin_u.id = s.revoked_by
                    {$whereClause}
                    ORDER BY s.is_active DESC, s.last_activity_at DESC
                    LIMIT :limit OFFSET :offset
                ";

                $stmt = $db->prepare($sql);
                foreach ($params as $k => $v) {
                    $stmt->bindValue(':' . $k, $v);
                }
                $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
                $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
                $stmt->execute();
                $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

            } else {
                // Query authentication & security events from hipaa_audit_logs
                $conditions = [];
                $params = [];

                if (!empty($action)) {
                    $conditions[] = "l.action = :action";
                    $params['action'] = $action;
                } else {
                    $conditions[] = "(
                        l.event_category = 'AUTHENTICATION' 
                        OR l.action IN ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', '2FA_OTP_VERIFIED', 'INACTIVITY_LOGOUT', 'SESSION_REVOKED')
                    )";
                }

                if ($userId > 0) {
                    $conditions[] = "l.user_id = :user_id";
                    $params['user_id'] = $userId;
                }

                if (!empty($dateFrom)) {
                    $conditions[] = "l.created_at >= :date_from";
                    $params['date_from'] = $dateFrom . ' 00:00:00';
                }

                if (!empty($dateTo)) {
                    $conditions[] = "l.created_at <= :date_to";
                    $params['date_to'] = $dateTo . ' 23:59:59';
                }

                if (!empty($search)) {
                    $conditions[] = "(
                        l.description LIKE :search 
                        OR l.ip_address LIKE :search 
                        OR l.user_role LIKE :search 
                        OR u.username LIKE :search 
                        OR e.first_name LIKE :search 
                        OR e.last_name LIKE :search
                    )";
                    $params['search'] = '%' . $search . '%';
                }

                $whereClause = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

                // Total count
                $countSql = "
                    SELECT COUNT(*) 
                    FROM `hipaa_audit_logs` l
                    LEFT JOIN `users` u ON u.id = l.user_id
                    LEFT JOIN `employees` e ON e.user_id = u.id
                    {$whereClause}
                ";
                $countStmt = $db->prepare($countSql);
                foreach ($params as $k => $v) {
                    $countStmt->bindValue(':' . $k, $v);
                }
                $countStmt->execute();
                $total = (int) $countStmt->fetchColumn();

                // Records
                $sql = "
                    SELECT 
                        l.id,
                        l.user_id,
                        l.user_role,
                        l.event_category,
                        l.action,
                        l.description,
                        l.ip_address,
                        l.user_agent,
                        l.tamper_hash,
                        l.created_at,
                        u.username,
                        TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))) AS full_name,
                        e.employee_no
                    FROM `hipaa_audit_logs` l
                    LEFT JOIN `users` u ON u.id = l.user_id
                    LEFT JOIN `employees` e ON e.user_id = u.id
                    {$whereClause}
                    ORDER BY l.id DESC
                    LIMIT :limit OFFSET :offset
                ";

                $stmt = $db->prepare($sql);
                foreach ($params as $k => $v) {
                    $stmt->bindValue(':' . $k, $v);
                }
                $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
                $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
                $stmt->execute();
                $records = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }

            $totalPages = $total > 0 ? (int) ceil($total / $limit) : 1;

            $this->success([
                'subtab'     => $subTab,
                'records'    => $records,
                'pagination' => [
                    'page'        => $page,
                    'limit'       => $limit,
                    'total'       => $total,
                    'total_pages' => $totalPages,
                ],
                'metrics'    => $metrics,
            ], 'Authentication log records retrieved successfully.');

        } catch (Throwable $e) {
            $this->error('Failed to retrieve authentication logs: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Terminate / Revoke an active user session immediately.
     * Route: POST /auth-logs/revoke-session
     */
    public function revokeSession(): void
    {
        $request = new Request();
        $sessionId = (int) $request->input('id', 0);
        $reason = trim((string) $request->input('reason', 'Administrator Revocation'));

        if ($sessionId <= 0) {
            $this->error('Valid session ID is required.', 422);
            return;
        }

        try {
            $db = Database::connection();
            $adminUser = Session::get('user');
            $adminId = isset($adminUser['id']) ? (int) $adminUser['id'] : 1;

            // Check session
            $checkStmt = $db->prepare("
                SELECT s.*, u.username 
                FROM `user_session_histories` s
                LEFT JOIN `users` u ON u.id = s.user_id
                WHERE s.id = :id
                LIMIT 1
            ");
            $checkStmt->execute(['id' => $sessionId]);
            $session = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if (!$session) {
                $this->error('Session history record not found.', 404);
                return;
            }

            if ((int) $session['is_active'] === 0) {
                $this->error('Session is already terminated or revoked.', 400);
                return;
            }

            // Update session to revoked
            $updateStmt = $db->prepare("
                UPDATE `user_session_histories` 
                SET `is_active` = 0,
                    `logout_at` = NOW(),
                    `revoked_by` = :admin_id,
                    `revocation_reason` = :reason
                WHERE `id` = :id
            ");
            $updateStmt->execute([
                'admin_id' => $adminId,
                'reason'   => $reason,
                'id'       => $sessionId,
            ]);

            // Log security event in HIPAA audit log
            AuditLogger::log(
                AuditLogger::CATEGORY_SECURITY,
                'SESSION_REVOKED',
                "Administrator revoked active user session #{$sessionId} for user '{$session['username']}'. Reason: {$reason}",
                null,
                $adminId,
                'admin'
            );

            $this->success([
                'session_id' => $sessionId,
                'username'   => $session['username'],
                'reason'     => $reason,
            ], "Active session for user '{$session['username']}' has been revoked successfully.");

        } catch (Throwable $e) {
            $this->error('Failed to revoke session: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get unified dashboard KPIs across Authentication, Diffs, and Cryptographic Chaining.
     * Route: GET /system-logs/summary
     */
    public function summary(): void
    {
        try {
            $db = Database::connection();
            $metrics = $this->calculateMetrics($db);

            $this->success($metrics, 'Unified system logs summary metrics loaded successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to load system logs summary: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Compute comprehensive metrics for the Unified Console.
     */
    private function calculateMetrics(PDO $db): array
    {
        // Active sessions
        $activeSessions = (int) $db->query("
            SELECT COUNT(*) FROM `user_session_histories` WHERE `is_active` = 1
        ")->fetchColumn();

        // 24h successful logins
        $successLogins24h = (int) $db->query("
            SELECT COUNT(*) FROM `hipaa_audit_logs` 
            WHERE `action` = 'LOGIN_SUCCESS' AND `created_at` >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ")->fetchColumn();

        // 24h failed logins
        $failedLogins24h = (int) $db->query("
            SELECT COUNT(*) FROM `hipaa_audit_logs` 
            WHERE `action` = 'LOGIN_FAILED' AND `created_at` >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        ")->fetchColumn();

        // Locked / Suspended accounts
        $lockedAccounts = (int) $db->query("
            SELECT COUNT(*) FROM `users` WHERE `is_locked` = 1 OR `status` = 'locked' OR `status` = 'suspended'
        ")->fetchColumn();

        // Total HMAC Audit Trail Records
        $totalHmacLogs = (int) $db->query("
            SELECT COUNT(*) FROM `hipaa_audit_logs`
        ")->fetchColumn();

        // Total Data Change Diffs
        $totalDiffs = (int) $db->query("
            SELECT COUNT(*) FROM `audit_trail_diffs`
        ")->fetchColumn();

        // Total Session Histories Recorded
        $totalSessions = (int) $db->query("
            SELECT COUNT(*) FROM `user_session_histories`
        ")->fetchColumn();

        return [
            'active_sessions'      => $activeSessions,
            'success_logins_24h'   => $successLogins24h,
            'failed_logins_24h'    => $failedLogins24h,
            'locked_accounts'      => $lockedAccounts,
            'total_hmac_logs'      => $totalHmacLogs,
            'total_data_diffs'     => $totalDiffs,
            'total_sessions'       => $totalSessions,
            'retention_guaranteed' => true,
            'retention_years'      => 6,
        ];
    }
}
