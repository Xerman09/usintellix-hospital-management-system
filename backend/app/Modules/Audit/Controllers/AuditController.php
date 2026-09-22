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

    /**
     * Retrieve 6-year retention policy metrics and compliance status (§ 164.316(b)(2)(i)).
     */
    public function retentionPolicy(): void
    {
        $status = \App\Core\AuditRetentionGuard::getRetentionStatus();
        $this->success($status, 'Retention policy status retrieved successfully.');
    }

    /**
     * Export HIPAA audit report as CSV with compliance headers and cryptographic hashes.
     */
    public function exportCsv(): void
    {
        $request = new Request();
        $db = Database::connection();
        $user = \App\Core\Session::get('user');
        $username = is_array($user) ? ($user['username'] ?? 'admin') : 'admin';
        $userRole = is_array($user) ? ($user['role'] ?? 'admin') : 'admin';

        [$whereClause, $params, $filterSummary] = $this->buildFilterConditions($request);

        // Fetch logs for export (chronological order for audit trails)
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
                ORDER BY l.id ASC
                LIMIT 10000";

        $stmt = $db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue(':' . $k, $v);
        }
        $stmt->execute();
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $totalExported = count($logs);

        // Verification status for export certificate
        $verification = AuditLogger::verifyIntegrity(count($logs));
        $chainStatus = ($verification['valid'] ?? false) ? 'CRYPTOGRAPHICALLY VERIFIED (UNBROKEN)' : 'INTEGRITY ALERT DETECTED';

        $timestamp = date('Y-m-d H:i:s');
        $filename = 'HIPAA_Audit_Report_' . date('Ymd_His') . '.csv';

        // Build CSV with official OCR Compliance Header Comments
        $csvLines = [];
        $csvLines[] = "# ==============================================================================";
        $csvLines[] = "# USINTELLIX HOSPITAL MANAGEMENT SYSTEM - HIPAA COMPLIANCE AUDIT TRAIL EXPORT";
        $csvLines[] = "# Statutory Citation : 45 CFR § 164.312(b) & § 164.316(b)(2)(i)";
        $csvLines[] = "# Retention Standard : Mandatory 6-Year Immutable Retention";
        $csvLines[] = "# Export Timestamp   : {$timestamp} UTC";
        $csvLines[] = "# Exported By        : {$username} (Role: {$userRole})";
        $csvLines[] = "# Active Filters     : {$filterSummary}";
        $csvLines[] = "# SHA-256 HMAC Chain : {$chainStatus}";
        $csvLines[] = "# Total Records      : {$totalExported}";
        $csvLines[] = "# Notice             : STRICTLY CONFIDENTIAL. Contains Protected Health Information (PHI).";
        $csvLines[] = "# ==============================================================================";

        // Header columns
        $headers = [
            'Log ID',
            'Timestamp (UTC)',
            'Event Category',
            'Action',
            'User ID',
            'Username',
            'User Role',
            'Patient ID',
            'Patient Name',
            'Details / Clinical Justification',
            'Client IP Address',
            'User Agent',
            'SHA-256 HMAC Tamper Hash'
        ];
        $csvLines[] = $this->formatCsvRow($headers);

        foreach ($logs as $log) {
            $patientName = ($log['patient_last_name'] || $log['patient_first_name'])
                ? trim(($log['patient_last_name'] ?? '') . ', ' . ($log['patient_first_name'] ?? ''))
                : 'N/A';

            $row = [
                $log['id'],
                $log['created_at'],
                $log['event_category'],
                $log['action'],
                $log['user_id'] ?: 'System',
                $log['username'] ?: 'System',
                $log['user_role'] ?: 'System',
                $log['patient_id'] ?: 'N/A',
                $patientName,
                $log['description'],
                $log['ip_address'],
                $log['user_agent'],
                $log['tamper_hash']
            ];
            $csvLines[] = $this->formatCsvRow($row);
        }

        $csvContent = implode("\r\n", $csvLines) . "\r\n";

        // Audit the export event
        AuditLogger::log(
            AuditLogger::CATEGORY_EXPORT,
            AuditLogger::ACTION_AUDIT_EXPORT_CSV,
            "HIPAA Compliance Audit Report exported to CSV ({$totalExported} records). Filter: {$filterSummary}"
        );

        // If direct download requested via stream query parameter
        if ($request->input('download') === '1') {
            header('Content-Type: text/csv; charset=UTF-8');
            header("Content-Disposition: attachment; filename=\"{$filename}\"");
            header('X-HIPAA-Retention-Policy: 45-CFR-164.316-b-2-i-6-Years');
            echo "\xEF\xBB\xBF"; // UTF-8 BOM
            echo $csvContent;
            exit;
        }

        $this->success([
            'csv' => $csvContent,
            'filename' => $filename,
            'total_records' => $totalExported,
            'chain_status' => $chainStatus
        ], 'HIPAA Audit CSV report generated successfully.');
    }

    /**
     * Retrieve full compliance dataset for PDF report generation.
     */
    public function exportReportData(): void
    {
        $request = new Request();
        $db = Database::connection();
        $user = \App\Core\Session::get('user');
        $username = is_array($user) ? ($user['username'] ?? 'admin') : 'admin';
        $userRole = is_array($user) ? ($user['role'] ?? 'admin') : 'admin';

        [$whereClause, $params, $filterSummary] = $this->buildFilterConditions($request);

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
                ORDER BY l.id ASC
                LIMIT 5000";

        $stmt = $db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue(':' . $k, $v);
        }
        $stmt->execute();
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $totalExported = count($logs);

        $verification = AuditLogger::verifyIntegrity(min(5000, max(50, $totalExported)));
        $retention = \App\Core\AuditRetentionGuard::getRetentionStatus();

        // Audit the PDF report export event
        AuditLogger::log(
            AuditLogger::CATEGORY_EXPORT,
            AuditLogger::ACTION_AUDIT_EXPORT_PDF,
            "HIPAA Compliance Audit Report generated for PDF ({$totalExported} records). Filter: {$filterSummary}"
        );

        $this->success([
            'logs' => $logs,
            'total' => $totalExported,
            'filter_summary' => $filterSummary,
            'verification' => $verification,
            'retention' => $retention,
            'exported_at' => date('Y-m-d H:i:s'),
            'exported_by' => [
                'username' => $username,
                'role' => $userRole
            ],
            'hospital' => [
                'name' => 'USIntellix Healthcare System',
                'facility_id' => 'FAC-USINT-2026',
                'certification' => 'HIPAA Security & Privacy Compliance Audit Trail'
            ]
        ], 'HIPAA Audit Report data generated successfully.');
    }

    /**
     * Build parameterized SQL filter conditions from request.
     */
    private function buildFilterConditions(Request $request): array
    {
        $category = trim((string) $request->input('category', ''));
        $action = trim((string) $request->input('action', ''));
        $patientId = (int) $request->input('patient_id', 0);
        $userId = (int) $request->input('user_id', 0);
        $dateFrom = trim((string) $request->input('date_from', ''));
        $dateTo = trim((string) $request->input('date_to', ''));
        $search = trim((string) $request->input('search', ''));

        $conditions = [];
        $params = [];
        $filterParts = [];

        if (!empty($category)) {
            $conditions[] = "l.event_category = :category";
            $params['category'] = $category;
            $filterParts[] = "Category: {$category}";
        }

        if (!empty($action)) {
            $conditions[] = "l.action = :action";
            $params['action'] = $action;
            $filterParts[] = "Action: {$action}";
        }

        if ($patientId > 0) {
            $conditions[] = "l.patient_id = :patient_id";
            $params['patient_id'] = $patientId;
            $filterParts[] = "Patient ID: {$patientId}";
        }

        if ($userId > 0) {
            $conditions[] = "l.user_id = :user_id";
            $params['user_id'] = $userId;
            $filterParts[] = "User ID: {$userId}";
        }

        if (!empty($dateFrom)) {
            $conditions[] = "l.created_at >= :date_from";
            $params['date_from'] = $dateFrom . ' 00:00:00';
            $filterParts[] = "From: {$dateFrom}";
        }

        if (!empty($dateTo)) {
            $conditions[] = "l.created_at <= :date_to";
            $params['date_to'] = $dateTo . ' 23:59:59';
            $filterParts[] = "To: {$dateTo}";
        }

        if (!empty($search)) {
            $conditions[] = "(l.description LIKE :search OR u.username LIKE :search OR p.first_name LIKE :search OR p.last_name LIKE :search)";
            $params['search'] = '%' . $search . '%';
            $filterParts[] = "Keyword: '{$search}'";
        }

        $whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";
        $filterSummary = !empty($filterParts) ? implode("; ", $filterParts) : "All Records (No Filter)";

        return [$whereClause, $params, $filterSummary];
    }

    /**
     * Format an array into an RFC 4180 compliant CSV line.
     */
    private function formatCsvRow(array $fields): string
    {
        $escaped = array_map(function ($field) {
            $val = (string) ($field ?? '');
            if (strpbrk($val, "\",\r\n") !== false || str_starts_with($val, '#')) {
                return '"' . str_replace('"', '""', $val) . '"';
            }
            return $val;
        }, $fields);

        return implode(',', $escaped);
    }
}
