<?php

namespace App\Modules\Portal\Controllers;

use App\Core\Controller;
use App\Core\Database;
use App\Core\Request;
use App\Core\Session;
use PDO;

class PortalController extends Controller
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * GET /portal/audits
     * Returns real audit logs from portal_audit_logs joined with patient details
     */
    public function audits(): void
    {
        $patientNo = isset($_GET['patient_no']) ? trim((string) $_GET['patient_no']) : null;
        $patientId = isset($_GET['patient_id']) && is_numeric($_GET['patient_id']) ? (int) $_GET['patient_id'] : null;

        $where = [];
        $params = [];

        if (!empty($patientNo)) {
            $where[] = "p.patient_no = ?";
            $params[] = $patientNo;
        } elseif (!empty($patientId)) {
            $where[] = "a.patient_id = ?";
            $params[] = $patientId;
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        $sql = "
            SELECT 
                a.id,
                a.patient_id,
                a.user_id,
                a.event_type,
                a.description,
                a.ip_address,
                a.status,
                a.created_at,
                CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                p.patient_no,
                u.username AS staff_username
            FROM portal_audit_logs a
            LEFT JOIN patients p ON a.patient_id = p.id
            LEFT JOIN users u ON a.user_id = u.id
            {$whereClause}
            ORDER BY a.id DESC
            LIMIT 50
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->success($logs, 'Portal audits retrieved successfully.');
    }

    /**
     * GET /portal/signatures
     * Returns real patients and their digital signature on file status
     */
    public function signatures(): void
    {
        $patientNo = isset($_GET['patient_no']) ? trim((string) $_GET['patient_no']) : null;
        $patientId = isset($_GET['patient_id']) && is_numeric($_GET['patient_id']) ? (int) $_GET['patient_id'] : null;

        $where = ["p.deleted_at IS NULL"];
        $params = [];

        if (!empty($patientNo)) {
            $where[] = "p.patient_no = ?";
            $params[] = $patientNo;
        } elseif (!empty($patientId)) {
            $where[] = "p.id = ?";
            $params[] = $patientId;
        }

        $whereClause = "WHERE " . implode(" AND ", $where);

        $sql = "
            SELECT 
                p.id AS patient_id,
                p.patient_no,
                p.first_name,
                p.last_name,
                p.birthdate,
                p.created_at AS enrolled_at,
                p.signature,
                CASE 
                    WHEN p.signature IS NOT NULL AND p.signature != '' THEN 1 
                    ELSE 0 
                END AS has_signature,
                'HIPAA Patient Consent & General Medical Authorization' AS form_title
            FROM patients p
            {$whereClause}
            ORDER BY has_signature DESC, p.id DESC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $signatures = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->success($signatures, 'Portal signatures on file retrieved successfully.');
    }

    /**
     * GET /portal/mail
     * Returns real messages from database messages table
     */
    public function mail(): void
    {
        $patientNo = isset($_GET['patient_no']) ? trim((string) $_GET['patient_no']) : null;
        $patientId = isset($_GET['patient_id']) && is_numeric($_GET['patient_id']) ? (int) $_GET['patient_id'] : null;

        $where = ["m.deleted_at IS NULL"];
        $params = [];

        if (!empty($patientNo)) {
            $where[] = "(p.patient_no = ? OR m.body LIKE ?)";
            $params[] = $patientNo;
            $params[] = "%" . $patientNo . "%";
        } elseif (!empty($patientId)) {
            $where[] = "m.patient_id = ?";
            $params[] = $patientId;
        }

        $whereClause = "WHERE " . implode(" AND ", $where);

        $sql = "
            SELECT 
                m.id,
                m.conversation_id,
                m.sender_id,
                m.body,
                m.created_at,
                u.username AS sender_username,
                r.name AS sender_role,
                CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                p.patient_no
            FROM messages m
            LEFT JOIN users u ON m.sender_id = u.id
            LEFT JOIN roles r ON u.role_id = r.id
            LEFT JOIN patients p ON m.patient_id = p.id
            {$whereClause}
            ORDER BY m.id DESC
            LIMIT 30
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $messages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->success($messages, 'Portal messages retrieved successfully.');
    }

    /**
     * POST /portal/mail
     * Sends a new secure portal message
     */
    public function sendMail(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $body = trim((string) $request->input('body', ''));
        $conversationId = (int) $request->input('conversation_id', 1);
        $patientId = $request->input('patient_id') ? (int) $request->input('patient_id') : null;

        if (empty($body)) {
            $this->error('Message body cannot be empty.', 422);
            return;
        }

        $now = date('Y-m-d H:i:s');
        $stmt = $this->db->prepare("
            INSERT INTO messages (conversation_id, sender_id, patient_id, body, created_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $conversationId,
            $user['id'] ?? 1,
            $patientId,
            $body,
            $now,
            $user['id'] ?? 1
        ]);

        // Also log to portal_audit_logs
        $auditStmt = $this->db->prepare("
            INSERT INTO portal_audit_logs (patient_id, user_id, event_type, description, ip_address, status, created_at)
            VALUES (?, ?, 'Secure Message Dispatched', ?, '127.0.0.1', 'Success', ?)
        ");
        $auditStmt->execute([
            $patientId,
            $user['id'] ?? 1,
            "Secure message sent by " . ($user['username'] ?? 'Staff'),
            $now
        ]);

        $this->success(['id' => (int) $this->db->lastInsertId()], 'Secure message sent successfully.');
    }
}