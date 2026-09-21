<?php

namespace App\Modules\Audit\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Database;
use App\Core\AuditLogger;
use PDO;

class AuditController extends Controller
{
    /**
     * List HIPAA audit logs with pagination and filters (Admin only).
     */
    public function index(): void
    {
        $request = new Request();
        $db = Database::connection();

        $page = max(1, (int) $request->input('page', 1));
        $limit = min(100, max(10, (int) $request->input('limit', 25)));
        $offset = ($page - 1) * $limit;

        $category = trim((string) $request->input('category', ''));
        $action = trim((string) $request->input('action', ''));
        $patientId = (int) $request->input('patient_id', 0);
        $userId = (int) $request->input('user_id', 0);
        $dateFrom = trim((string) $request->input('date_from', ''));
        $dateTo = trim((string) $request->input('date_to', ''));
        $search = trim((string) $request->input('search', ''));

        $conditions = [];
        $params = [];

        if (!empty($category)) {
            $conditions[] = "l.event_category = :category";
            $params['category'] = $category;
        }

        if (!empty($action)) {
            $conditions[] = "l.action = :action";
            $params['action'] = $action;
        }

        if ($patientId > 0) {
            $conditions[] = "l.patient_id = :patient_id";
            $params['patient_id'] = $patientId;
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
            $conditions[] = "(l.description LIKE :search OR u.username LIKE :search OR p.first_name LIKE :search OR p.last_name LIKE :search)";
            $params['search'] = '%' . $search . '%';
        }

        $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

        // Total count
        $countSql = "SELECT COUNT(*) as total
                     FROM hipaa_audit_logs l
                     LEFT JOIN users u ON l.user_id = u.id
                     LEFT JOIN patients p ON l.patient_id = p.id
                     {$whereClause}";
        $stmtCount = $db->prepare($countSql);
        $stmtCount->execute($params);
        $total = (int) $stmtCount->fetch(PDO::FETCH_ASSOC)['total'];

        // Paginated query
        $sql = "SELECT 
                    l.id,
                    l.user_id,
                    l.user_role,
                    l.patient_id,
                    l.event_category,
                    l.action,
                    l.description,
                    l.ip_address,
                    l.user_agent,
                    l.tamper_hash,
                    l.created_at,
                    u.username,
                    p.first_name as patient_first_name,
                    p.last_name as patient_last_name
                FROM hipaa_audit_logs l
                LEFT JOIN users u ON l.user_id = u.id
                LEFT JOIN patients p ON l.patient_id = p.id
                {$whereClause}
                ORDER BY l.id DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue(':' . $k, $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $totalPages = $total > 0 ? (int) ceil($total / $limit) : 1;

        $this->success([
            'logs' => $logs,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => $totalPages
            ]
        ], 'Audit logs retrieved successfully.');
    }

    /**
     * Cryptographically verify the SHA-256 chain integrity of the HIPAA audit log table.
     */
    public function verify(): void
    {
        $verification = AuditLogger::verifyIntegrity();
        $this->success($verification, 'Chain integrity verification complete.');
    }
}
