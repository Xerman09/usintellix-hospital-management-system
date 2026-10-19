<?php

namespace App\Modules\PatientFlow\Services;

use App\Core\Database;
use App\Modules\Appointments\Models\Appointment;
use App\Modules\PatientFlow\Models\AppointmentQueueToken;
use App\Modules\PatientFlow\Models\PatientFlow;
use PDO;

class QueueTokenService
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /**
     * Verify whether a room ID exists in rooms table
     */
    private function resolveValidRoomId(?int $roomId): ?int
    {
        if (!$roomId) return null;
        $stmt = $this->db->prepare("SELECT id FROM rooms WHERE id = :id");
        $stmt->execute([':id' => $roomId]);
        $val = $stmt->fetchColumn();
        return $val ? (int)$val : null;
    }

    /**
     * Resolve department code and ID for an appointment / provider
     */
    public function resolveDepartment(?int $appointmentId, array $data = []): array
    {
        // 1. Explicitly provided in payload
        if (!empty($data['department_id'])) {
            $stmt = $this->db->prepare("SELECT id, name, code FROM departments WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute([':id' => (int)$data['department_id']]);
            $dept = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($dept) {
                return [
                    'id'   => (int)$dept['id'],
                    'code' => strtoupper($dept['code'] ?: 'OPD'),
                    'name' => $dept['name']
                ];
            }
        }

        if (!empty($data['department_code'])) {
            $code = strtoupper(trim($data['department_code']));
            $stmt = $this->db->prepare("SELECT id, name, code FROM departments WHERE code = :code AND deleted_at IS NULL");
            $stmt->execute([':code' => $code]);
            $dept = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($dept) {
                return [
                    'id'   => (int)$dept['id'],
                    'code' => strtoupper($dept['code']),
                    'name' => $dept['name']
                ];
            }
            return ['id' => null, 'code' => $code, 'name' => $code];
        }

        // 2. Resolve via appointment provider
        $providerId = (int)($data['provider_id'] ?? 0);
        if (!$providerId && $appointmentId) {
            $app = (new Appointment())->where('id', $appointmentId)->first();
            if ($app) {
                $providerId = (int)($app['provider_id'] ?? 0);
            }
        }

        if ($providerId) {
            $stmt = $this->db->prepare("
                SELECT d.id, d.name, d.code, pr.specialty
                FROM providers pr
                LEFT JOIN employees e ON e.id = pr.employee_id
                LEFT JOIN departments d ON d.id = e.department_id AND d.deleted_at IS NULL
                WHERE pr.id = :provider_id
            ");
            $stmt->execute([':provider_id' => $providerId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!empty($row['code'])) {
                return [
                    'id'   => (int)$row['id'],
                    'code' => strtoupper($row['code']),
                    'name' => $row['name']
                ];
            }

            // Check specialty keyword fallback
            if (!empty($row['specialty'])) {
                $spec = strtolower($row['specialty']);
                if (str_contains($spec, 'cardio')) return ['id' => 4, 'code' => 'CARD', 'name' => 'Cardiology'];
                if (str_contains($spec, 'pedi'))   return ['id' => 5, 'code' => 'PEDI', 'name' => 'Pediatrics'];
                if (str_contains($spec, 'surg'))   return ['id' => 6, 'code' => 'SURG', 'name' => 'General Surgery'];
                if (str_contains($spec, 'ob') || str_contains($spec, 'gyn')) return ['id' => 10, 'code' => 'OBGYN', 'name' => 'Obstetrics & Gynecology'];
                if (str_contains($spec, 'ortho'))  return ['id' => 11, 'code' => 'ORTHO', 'name' => 'Orthopedics'];
                if (str_contains($spec, 'intern') || str_contains($spec, 'adult')) return ['id' => 3, 'code' => 'INTMED', 'name' => 'Internal Medicine'];
            }
        }

        // 3. Fallback: Default to Outpatient Clinic (OPD)
        $stmt = $this->db->prepare("SELECT id, name, code FROM departments WHERE code = 'OPD' AND deleted_at IS NULL LIMIT 1");
        $stmt->execute();
        $defaultDept = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'id'   => $defaultDept ? (int)$defaultDept['id'] : null,
            'code' => $defaultDept ? strtoupper($defaultDept['code']) : 'OPD',
            'name' => $defaultDept ? $defaultDept['name'] : 'Outpatient Department'
        ];
    }

    /**
     * Generate daily sequential queue token upon reception check-in
     */
    public function generateTokenForCheckIn(int $appointmentId, array $data, array $user, ?int $patientFlowId = null): array
    {
        $appointment = (new Appointment())->where('id', $appointmentId)->first();
        if (!$appointment) {
            return ['success' => false, 'message' => 'Appointment record not found.'];
        }

        $patientId = (int)$appointment['patient_id'];
        $providerId = (int)$appointment['provider_id'];
        $facilityId = $appointment['facility_id'] ? (int)$appointment['facility_id'] : null;
        $roomId = $appointment['room_id'] ? (int)$appointment['room_id'] : null;
        $today = date('Y-m-d');

        // Check if token already exists today for this appointment
        $existing = (new AppointmentQueueToken())
            ->where('appointment_id', $appointmentId)
            ->where('token_date', $today)
            ->first();

        if ($existing && $existing['status'] !== 'cancelled') {
            return [
                'success' => true,
                'message' => 'Existing queue token retrieved.',
                'token'   => $this->getTokenDetail((int)$existing['id']),
                'token_number' => $existing['token_number']
            ];
        }

        // Resolve Department
        $dept = $this->resolveDepartment($appointmentId, $data);
        $deptCode = $dept['code'];
        $deptId   = $dept['id'];

        $priority = $data['priority'] ?? 'routine';
        if (!in_array($priority, ['routine', 'urgent', 'priority', 'senior_pwd', 'vip'], true)) {
            $priority = 'routine';
        }

        // Concurrency-safe sequential numbering: find max sequence today for this department
        $stmt = $this->db->prepare("
            SELECT MAX(sequence_number) FROM appointment_queue_tokens
            WHERE department_code = :dept_code AND token_date = :token_date
        ");
        $stmt->execute([
            ':dept_code'   => $deptCode,
            ':token_date'  => $today
        ]);
        $currentMax = (int)$stmt->fetchColumn();
        $nextSeq = $currentMax + 1;

        // Loop safety to guarantee uniqueness against race conditions
        do {
            $tokenNumber = sprintf('%s-%03d', $deptCode, $nextSeq);
            $checkStmt = $this->db->prepare("
                SELECT COUNT(*) FROM appointment_queue_tokens
                WHERE department_code = :dept_code AND token_date = :token_date AND sequence_number = :seq
            ");
            $checkStmt->execute([
                ':dept_code'  => $deptCode,
                ':token_date' => $today,
                ':seq'        => $nextSeq
            ]);
            if ((int)$checkStmt->fetchColumn() === 0) {
                break;
            }
            $nextSeq++;
        } while (true);

        // Estimate wait time based on preceding waiting patients in department
        $waitStmt = $this->db->prepare("
            SELECT COUNT(*) FROM appointment_queue_tokens
            WHERE department_code = :dept_code AND token_date = :token_date
              AND status IN ('waiting', 'called')
        ");
        $waitStmt->execute([':dept_code' => $deptCode, ':token_date' => $today]);
        $waitingCount = (int)$waitStmt->fetchColumn();
        $estimatedWait = max(10, $waitingCount * 12); // ~12 minutes per consultation

        $notes = $data['notes'] ?? $appointment['reason'] ?? null;
        $issuedBy = (int)($user['id'] ?? 1);

        $insertStmt = $this->db->prepare("
            INSERT INTO appointment_queue_tokens (
                token_number, token_date, sequence_number, department_id, department_code,
                appointment_id, patient_flow_id, patient_id, provider_id, facility_id, room_id,
                priority, status, call_counter, estimated_wait_minutes, notes, issued_at, issued_by
            ) VALUES (
                :token_number, :token_date, :sequence_number, :department_id, :department_code,
                :appointment_id, :patient_flow_id, :patient_id, :provider_id, :facility_id, :room_id,
                :priority, 'waiting', 0, :estimated_wait_minutes, :notes, NOW(), :issued_by
            )
        ");

        $insertStmt->execute([
            ':token_number'           => $tokenNumber,
            ':token_date'             => $today,
            ':sequence_number'        => $nextSeq,
            ':department_id'          => $deptId,
            ':department_code'        => $deptCode,
            ':appointment_id'         => $appointmentId,
            ':patient_flow_id'        => $patientFlowId,
            ':patient_id'             => $patientId,
            ':provider_id'            => $providerId,
            ':facility_id'            => $facilityId,
            ':room_id'                => $roomId,
            ':priority'               => $priority,
            ':estimated_wait_minutes' => $estimatedWait,
            ':notes'                  => $notes,
            ':issued_by'              => $issuedBy
        ]);

        $tokenId = (int)$this->db->lastInsertId();

        // If patient_flow_id is already present, link it
        if ($patientFlowId) {
            $this->db->prepare("
                UPDATE patient_flow
                SET queue_token_id = :token_id, token_number = :token_number, priority = :priority
                WHERE id = :flow_id
            ")->execute([
                ':token_id'     => $tokenId,
                ':token_number' => $tokenNumber,
                ':priority'     => $priority,
                ':flow_id'      => $patientFlowId
            ]);
        }

        $tokenDetail = $this->getTokenDetail($tokenId);

        return [
            'success'                => true,
            'message'                => "Daily queue token {$tokenNumber} generated successfully.",
            'token_id'               => $tokenId,
            'token_number'           => $tokenNumber,
            'sequence_number'        => $nextSeq,
            'department_code'        => $deptCode,
            'department_name'        => $dept['name'],
            'estimated_wait_minutes' => $estimatedWait,
            'token'                  => $tokenDetail
        ];
    }

    /**
     * Call token on PA / audio announcement / waiting room display
     */
    public function callToken(int $tokenId, array $user, ?int $roomId = null): array
    {
        $token = $this->getTokenDetail($tokenId);
        if (!$token) {
            return ['success' => false, 'message' => 'Queue token not found.'];
        }

        $validRoomId = $this->resolveValidRoomId($roomId);
        $roomName = 'Consultation Room';
        if ($validRoomId) {
            $stmt = $this->db->prepare("SELECT name FROM rooms WHERE id = :id");
            $stmt->execute([':id' => $validRoomId]);
            $r = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($r) $roomName = $r['name'];
        } elseif ($token['room_name'] && $token['room_name'] !== 'No room assigned') {
            $roomName = $token['room_name'];
        }

        $userId = (int)($user['id'] ?? 1);

        $updateStmt = $this->db->prepare("
            UPDATE appointment_queue_tokens
            SET status = 'called',
                call_counter = call_counter + 1,
                called_at = NOW(),
                called_by = :user_id,
                room_id = COALESCE(:room_id, room_id)
            WHERE id = :id
        ");
        $updateStmt->execute([
            ':user_id' => $userId,
            ':room_id' => $validRoomId,
            ':id'      => $tokenId
        ]);

        $updatedToken = $this->getTokenDetail($tokenId);
        $callCount = $updatedToken['call_counter'];

        $announcement = "Now calling token {$updatedToken['token_number']} ({$updatedToken['patient_name']}) to {$roomName}" . ($callCount > 1 ? " (Call #{$callCount})" : "");

        return [
            'success'           => true,
            'message'           => $announcement,
            'announcement_text' => $announcement,
            'room_name'         => $roomName,
            'call_counter'      => $callCount,
            'token'             => $updatedToken
        ];
    }

    /**
     * Mark token in consultation (roomed with provider)
     */
    public function serveToken(int $tokenId, array $user, ?int $roomId = null): array
    {
        $token = $this->getTokenDetail($tokenId);
        if (!$token) {
            return ['success' => false, 'message' => 'Queue token not found.'];
        }

        $validRoomId = $this->resolveValidRoomId($roomId);
        $userId = (int)($user['id'] ?? 1);

        $stmt = $this->db->prepare("
            UPDATE appointment_queue_tokens
            SET status = 'in_consultation',
                service_started_at = COALESCE(service_started_at, NOW()),
                wait_time_minutes = TIMESTAMPDIFF(MINUTE, issued_at, NOW()),
                room_id = COALESCE(:room_id, room_id)
            WHERE id = :id
        ");
        $stmt->execute([
            ':room_id' => $validRoomId,
            ':id'      => $tokenId
        ]);

        // Sync with patient_flow if linked
        if ($token['patient_flow_id']) {
            $this->db->prepare("
                UPDATE patient_flow
                SET stage = 'with_provider',
                    provider_at = COALESCE(provider_at, NOW()),
                    room_id = COALESCE(:room_id, room_id)
                WHERE id = :flow_id
            ")->execute([
                ':room_id' => $validRoomId,
                ':flow_id' => $token['patient_flow_id']
            ]);
        }

        return [
            'success' => true,
            'message' => "Patient token {$token['token_number']} is now in consultation.",
            'token'   => $this->getTokenDetail($tokenId)
        ];
    }

    /**
     * Complete consultation for token
     */
    public function completeToken(int $tokenId, array $user): array
    {
        $token = $this->getTokenDetail($tokenId);
        if (!$token) {
            return ['success' => false, 'message' => 'Queue token not found.'];
        }

        $this->db->prepare("
            UPDATE appointment_queue_tokens
            SET status = 'completed',
                service_completed_at = NOW(),
                service_duration_minutes = TIMESTAMPDIFF(MINUTE, COALESCE(service_started_at, NOW()), NOW())
            WHERE id = :id
        ")->execute([':id' => $tokenId]);

        // Sync with patient_flow
        if ($token['patient_flow_id']) {
            $this->db->prepare("
                UPDATE patient_flow
                SET stage = 'checked_out',
                    checked_out_at = NOW()
                WHERE id = :flow_id
            ")->execute([':flow_id' => $token['patient_flow_id']]);
        }

        return [
            'success' => true,
            'message' => "Token {$token['token_number']} consultation completed.",
            'token'   => $this->getTokenDetail($tokenId)
        ];
    }

    /**
     * Mark token as No-Show or Cancelled
     */
    public function cancelOrNoShow(int $tokenId, string $status, array $user, string $notes = ''): array
    {
        if (!in_array($status, ['no_show', 'cancelled'], true)) {
            $status = 'cancelled';
        }

        $token = $this->getTokenDetail($tokenId);
        if (!$token) {
            return ['success' => false, 'message' => 'Queue token not found.'];
        }

        $this->db->prepare("
            UPDATE appointment_queue_tokens
            SET status = :status,
                notes = CONCAT(COALESCE(notes, ''), ' [', :status, ': ', :notes, ']')
            WHERE id = :id
        ")->execute([
            ':status' => $status,
            ':notes'  => $notes,
            ':id'     => $tokenId
        ]);

        return [
            'success' => true,
            'message' => "Token {$token['token_number']} marked as {$status}."
        ];
    }

    /**
     * Get real-time queue display board data (for waiting room TVs and nurse dashboards)
     */
    public function getQueueDisplayBoard(?int $facilityId = null, ?string $departmentCode = null): array
    {
        $today = date('Y-m-d');
        $params = [':today' => $today];
        $deptWhere = "";
        if (!empty($departmentCode)) {
            $deptWhere = " AND qt.department_code = :dept_code";
            $params[':dept_code'] = strtoupper($departmentCode);
        }

        // 1. Now Calling Tokens
        $callingStmt = $this->db->prepare("
            SELECT qt.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no,
                   COALESCE(r.name, 'Consultation Room') AS room_name,
                   d.name AS department_name
            FROM appointment_queue_tokens qt
            JOIN patients p ON p.id = qt.patient_id
            LEFT JOIN rooms r ON r.id = qt.room_id
            LEFT JOIN departments d ON d.id = qt.department_id
            WHERE qt.token_date = :today AND qt.status = 'called' {$deptWhere}
            ORDER BY qt.called_at DESC
            LIMIT 8
        ");
        $callingStmt->execute($params);
        $nowCalling = $callingStmt->fetchAll(PDO::FETCH_ASSOC);

        // 2. Up Next / Waiting Tokens
        $waitingStmt = $this->db->prepare("
            SELECT qt.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no,
                   COALESCE(r.name, 'TBA') AS room_name,
                   d.name AS department_name
            FROM appointment_queue_tokens qt
            JOIN patients p ON p.id = qt.patient_id
            LEFT JOIN rooms r ON r.id = qt.room_id
            LEFT JOIN departments d ON d.id = qt.department_id
            WHERE qt.token_date = :today AND qt.status = 'waiting' {$deptWhere}
            ORDER BY CASE WHEN qt.priority IN ('urgent', 'vip') THEN 1 
                          WHEN qt.priority = 'senior_pwd' THEN 2 
                          WHEN qt.priority = 'priority' THEN 3 
                          ELSE 4 END ASC,
                     qt.sequence_number ASC
            LIMIT 15
        ");
        $waitingStmt->execute($params);
        $upNext = $waitingStmt->fetchAll(PDO::FETCH_ASSOC);

        // 3. Current In-Consultation
        $consultStmt = $this->db->prepare("
            SELECT qt.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no,
                   COALESCE(r.name, 'Consultation Room') AS room_name,
                   d.name AS department_name
            FROM appointment_queue_tokens qt
            JOIN patients p ON p.id = qt.patient_id
            LEFT JOIN rooms r ON r.id = qt.room_id
            LEFT JOIN departments d ON d.id = qt.department_id
            WHERE qt.token_date = :today AND qt.status = 'in_consultation' {$deptWhere}
            ORDER BY qt.service_started_at DESC
            LIMIT 8
        ");
        $consultStmt->execute($params);
        $inConsultation = $consultStmt->fetchAll(PDO::FETCH_ASSOC);

        // 4. Queue Summary KPIs
        $statsStmt = $this->db->prepare("
            SELECT 
                COUNT(*) AS total_issued_today,
                SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) AS waiting_count,
                SUM(CASE WHEN status = 'called' THEN 1 ELSE 0 END) AS called_count,
                SUM(CASE WHEN status = 'in_consultation' THEN 1 ELSE 0 END) AS consultation_count,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
                ROUND(AVG(CASE WHEN wait_time_minutes IS NOT NULL THEN wait_time_minutes ELSE NULL END), 1) AS avg_wait_minutes
            FROM appointment_queue_tokens
            WHERE token_date = :today
        ");
        $statsStmt->execute([':today' => $today]);
        $kpi = $statsStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        // 5. Active Department Breakdown
        $deptStmt = $this->db->prepare("
            SELECT 
                qt.department_code,
                COALESCE(d.name, qt.department_code) AS department_name,
                COUNT(*) AS total_tokens,
                SUM(CASE WHEN qt.status = 'waiting' THEN 1 ELSE 0 END) AS waiting_count,
                SUM(CASE WHEN qt.status = 'called' THEN 1 ELSE 0 END) AS called_count,
                SUM(CASE WHEN qt.status = 'in_consultation' THEN 1 ELSE 0 END) AS in_consultation_count
            FROM appointment_queue_tokens qt
            LEFT JOIN departments d ON d.id = qt.department_id
            WHERE qt.token_date = :today
            GROUP BY qt.department_code, d.name
            ORDER BY waiting_count DESC, total_tokens DESC
        ");
        $deptStmt->execute([':today' => $today]);
        $departments = $deptStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'server_time'     => date('Y-m-d H:i:s'),
            'today'           => $today,
            'now_calling'     => $nowCalling,
            'up_next'         => $upNext,
            'in_consultation' => $inConsultation,
            'summary'         => [
                'total_issued_today' => (int)($kpi['total_issued_today'] ?? 0),
                'waiting_count'      => (int)($kpi['waiting_count'] ?? 0),
                'called_count'       => (int)($kpi['called_count'] ?? 0),
                'consultation_count' => (int)($kpi['consultation_count'] ?? 0),
                'completed_count'    => (int)($kpi['completed_count'] ?? 0),
                'avg_wait_minutes'   => (float)($kpi['avg_wait_minutes'] ?? 0)
            ],
            'departments'     => $departments
        ];
    }

    /**
     * Fetch detailed token information
     */
    public function getTokenDetail(int $tokenId): ?array
    {
        $stmt = $this->db->prepare("
            SELECT qt.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no, p.birthdate, p.sex AS patient_gender,
                   COALESCE(r.name, 'No room assigned') AS room_name,
                   d.name AS department_name,
                   CONCAT(e.first_name, ' ', e.last_name) AS provider_name,
                   f.name AS facility_name,
                   a.appointment_time, a.reason AS appointment_reason
            FROM appointment_queue_tokens qt
            JOIN patients p ON p.id = qt.patient_id
            LEFT JOIN rooms r ON r.id = qt.room_id
            LEFT JOIN departments d ON d.id = qt.department_id
            LEFT JOIN providers pr ON pr.id = qt.provider_id
            LEFT JOIN employees e ON e.id = pr.employee_id
            LEFT JOIN facilities f ON f.id = qt.facility_id
            LEFT JOIN appointments a ON a.id = qt.appointment_id
            WHERE qt.id = :id
        ");
        $stmt->execute([':id' => $tokenId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /**
     * List tokens with filter options
     */
    public function listTokens(array $filters = []): array
    {
        $date = $filters['date'] ?? date('Y-m-d');
        $params = [':token_date' => $date];
        $sql = "
            SELECT qt.*,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.patient_no,
                   COALESCE(r.name, 'No room') AS room_name,
                   d.name AS department_name,
                   CONCAT(e.first_name, ' ', e.last_name) AS provider_name
            FROM appointment_queue_tokens qt
            JOIN patients p ON p.id = qt.patient_id
            LEFT JOIN rooms r ON r.id = qt.room_id
            LEFT JOIN departments d ON d.id = qt.department_id
            LEFT JOIN providers pr ON pr.id = qt.provider_id
            LEFT JOIN employees e ON e.id = pr.employee_id
            WHERE qt.token_date = :token_date
        ";

        if (!empty($filters['department_code'])) {
            $sql .= " AND qt.department_code = :dept_code";
            $params[':dept_code'] = strtoupper($filters['department_code']);
        }
        if (!empty($filters['status'])) {
            $sql .= " AND qt.status = :status";
            $params[':status'] = $filters['status'];
        }
        if (!empty($filters['priority'])) {
            $sql .= " AND qt.priority = :priority";
            $params[':priority'] = $filters['priority'];
        }

        $sql .= " ORDER BY qt.sequence_number ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Render printable thermal token slip HTML
     */
    public function generateTokenSlipHtml(int $tokenId): string
    {
        $token = $this->getTokenDetail($tokenId);
        if (!$token) {
            return "<h3>Queue token not found.</h3>";
        }

        $issuedTime = date('h:i A', strtotime($token['issued_at']));
        $tokenDate = date('M d, Y', strtotime($token['token_date']));
        $patientName = htmlspecialchars($token['patient_name']);
        $patientNo = htmlspecialchars($token['patient_no'] ?? '--');
        $deptName = htmlspecialchars($token['department_name'] ?: $token['department_code']);
        $providerName = htmlspecialchars($token['provider_name'] ?: 'Attending Staff');
        $tokenNumber = htmlspecialchars($token['token_number']);
        $roomName = htmlspecialchars($token['room_name']);
        $priorityLabel = strtoupper($token['priority']);
        $waitEst = (int)$token['estimated_wait_minutes'];

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Queue Token {$tokenNumber}</title>
    <style>
        body {
            font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 18px;
            background: #fff;
            color: #000;
            display: flex;
            justify-content: center;
        }
        .slip-box {
            width: 300px;
            text-align: center;
            border: 2px dashed #000;
            padding: 16px;
            border-radius: 8px;
        }
        .hospital-title {
            font-size: 16px;
            font-weight: 800;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }
        .dept-title {
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        .token-num-box {
            margin: 14px 0;
            padding: 12px 6px;
            background: #f1f5f9;
            border: 2px solid #000;
            border-radius: 6px;
        }
        .token-num {
            font-size: 38px;
            font-weight: 900;
            letter-spacing: 1px;
            line-height: 1;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .priority-badge {
            display: inline-block;
            margin-top: 6px;
            font-size: 11px;
            font-weight: 800;
            padding: 2px 8px;
            background: #000;
            color: #fff;
            border-radius: 4px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            margin: 4px 0;
            border-bottom: 1px dotted #ccc;
            padding-bottom: 2px;
        }
        .barcode-mock {
            margin-top: 14px;
            font-size: 28px;
            letter-spacing: 4px;
            font-family: monospace;
        }
        .footer-note {
            font-size: 10px;
            margin-top: 10px;
            color: #555;
        }
        @media print {
            body { padding: 0; }
            .slip-box { border: 1px dashed #000; width: 100%; max-width: 320px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="slip-box">
        <div class="hospital-title">USINTELLIX HEALTH SYSTEM</div>
        <div class="dept-title">{$deptName}</div>
        <div style="font-size: 11px; color: #444;">Outpatient Queue Check-In</div>

        <div class="token-num-box">
            <div style="font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase;">YOUR QUEUE NUMBER</div>
            <div class="token-num">{$tokenNumber}</div>
            <div class="priority-badge">{$priorityLabel}</div>
        </div>

        <div class="info-row">
            <span>Patient:</span>
            <strong>{$patientName}</strong>
        </div>
        <div class="info-row">
            <span>Patient ID:</span>
            <span>{$patientNo}</span>
        </div>
        <div class="info-row">
            <span>Provider:</span>
            <span>{$providerName}</span>
        </div>
        <div class="info-row">
            <span>Assigned Room:</span>
            <strong>{$roomName}</strong>
        </div>
        <div class="info-row">
            <span>Date &amp; Time:</span>
            <span>{$tokenDate} {$issuedTime}</span>
        </div>
        <div class="info-row">
            <span>Est. Wait Time:</span>
            <strong>~{$waitEst} mins</strong>
        </div>

        <div class="barcode-mock">||| | ||||| | |||</div>
        <div style="font-size: 10px; font-family: monospace;">*{$tokenNumber}*</div>

        <div class="footer-note">
            Please watch the waiting room TV monitors.<br>
            Your number will be called when provider is ready.
        </div>

        <div class="no-print" style="margin-top: 16px;">
            <button onclick="window.print()" style="padding: 6px 14px; font-weight: 700; cursor: pointer;">Print Slip</button>
        </div>
    </div>
    <script>
        window.onload = function() {
            if (window.location.search.includes('autoprint=1')) {
                window.print();
            }
        };
    </script>
</body>
</html>
HTML;
    }
}
