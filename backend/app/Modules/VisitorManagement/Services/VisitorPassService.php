<?php

declare(strict_types=1);

namespace App\Modules\VisitorManagement\Services;

use App\Core\AuditLogger;
use App\Core\Database;
use App\Modules\VisitorManagement\Models\VisitorPass;
use PDO;
use Throwable;

class VisitorPassService
{
    private PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::connection();
        if (date_default_timezone_get() === 'UTC') {
            date_default_timezone_set('Asia/Manila');
        }
    }

    /**
     * Generate next daily sequential pass number (e.g. VIS-2026-00001)
     */
    public function generatePassNumber(): string
    {
        $year = date('Y');
        $prefix = "VIS-{$year}-";

        $stmt = $this->db->prepare("
            SELECT pass_number 
            FROM visitor_passes 
            WHERE pass_number LIKE :prefix 
            ORDER BY id DESC 
            LIMIT 1
        ");
        $stmt->execute([':prefix' => "{$prefix}%"]);
        $lastPass = $stmt->fetchColumn();

        $nextSeq = 1;
        if ($lastPass && preg_match('/VIS-\d{4}-(\d+)/', (string) $lastPass, $matches)) {
            $nextSeq = (int) $matches[1] + 1;
        }

        return sprintf('%s%05d', $prefix, $nextSeq);
    }

    /**
     * Resolve ward visitor policy for a given ward ID or ward type
     */
    public function resolveWardPolicy(int $wardId): array
    {
        // 1. Direct ward policy
        $stmt = $this->db->prepare("SELECT * FROM ward_visitor_policies WHERE ward_id = :ward_id LIMIT 1");
        $stmt->execute([':ward_id' => $wardId]);
        $policy = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($policy) {
            return $policy;
        }

        // 2. Lookup ward type from hospital_wards
        $wardStmt = $this->db->prepare("SELECT ward_name, ward_type FROM hospital_wards WHERE id = :id LIMIT 1");
        $wardStmt->execute([':id' => $wardId]);
        $ward = $wardStmt->fetch(PDO::FETCH_ASSOC);

        if ($ward && !empty($ward['ward_type'])) {
            $typeStmt = $this->db->prepare("SELECT * FROM ward_visitor_policies WHERE ward_type = :type AND ward_id IS NULL LIMIT 1");
            $typeStmt->execute([':type' => $ward['ward_type']]);
            $typePolicy = $typeStmt->fetch(PDO::FETCH_ASSOC);
            if ($typePolicy) {
                return $typePolicy;
            }
        }

        // 3. General fallback policy
        $fallbackStmt = $this->db->query("SELECT * FROM ward_visitor_policies WHERE ward_type = 'General' AND ward_id IS NULL LIMIT 1");
        $fallback = $fallbackStmt ? $fallbackStmt->fetch(PDO::FETCH_ASSOC) : null;

        return $fallback ?: [
            'id'                          => 0,
            'ward_type'                   => 'General',
            'max_active_visitors_per_bed' => 2,
            'max_visit_duration_minutes'  => 120,
            'visiting_hours_start'        => '10:00:00',
            'visiting_hours_end'          => '20:00:00',
            'has_midday_break'            => 0,
            'visiting_hours_slot2_start'  => null,
            'visiting_hours_slot2_end'    => null,
            'allow_overnight_companion'   => 0,
            'min_visitor_age'             => 12,
            'notes'                       => 'Standard hospital visiting hours'
        ];
    }

    /**
     * Validate whether current time falls within authorized ward visiting hours
     */
    public function validateVisitingHours(array $policy, ?string $checkTime = null): array
    {
        $nowTimeStr = $checkTime ? date('H:i:s', strtotime($checkTime)) : date('H:i:s');
        $hasBreak = ((int) ($policy['has_midday_break'] ?? 0) === 1);

        $start1 = $policy['visiting_hours_start'];
        $end1 = $policy['visiting_hours_end'];

        $inSlot1 = ($nowTimeStr >= $start1 && $nowTimeStr <= $end1);
        $inSlot2 = false;

        $slotText = date('g:i A', strtotime($start1)) . " - " . date('g:i A', strtotime($end1));

        if ($hasBreak && !empty($policy['visiting_hours_slot2_start']) && !empty($policy['visiting_hours_slot2_end'])) {
            $start2 = $policy['visiting_hours_slot2_start'];
            $end2 = $policy['visiting_hours_slot2_end'];
            $inSlot2 = ($nowTimeStr >= $start2 && $nowTimeStr <= $end2);
            $slotText .= " & " . date('g:i A', strtotime($start2)) . " - " . date('g:i A', strtotime($end2));
        }

        $isValid = $inSlot1 || $inSlot2;

        return [
            'valid'        => $isValid,
            'current_time' => date('g:i A', strtotime($nowTimeStr)),
            'hours_text'   => $slotText,
            'error'        => $isValid ? null : "Current time (" . date('g:i A', strtotime($nowTimeStr)) . ") is outside authorized visiting hours ({$slotText})."
        ];
    }

    /**
     * Validate bedside active visitor quota (max concurrent visitors per bed)
     */
    public function validateBedsideQuota(int $admissionId, int $maxQuota, ?int $excludePassId = null): array
    {
        // Auto-expire any overdue active passes first
        $this->syncExpiredPasses();

        $sql = "
            SELECT id, pass_number, visitor_name, relationship_to_patient, check_in_time, valid_until
            FROM visitor_passes
            WHERE admission_id = :admission_id
              AND status = 'Active'
              AND check_out_time IS NULL
              AND valid_until > NOW()
              " . ($excludePassId ? "AND id != :exclude_id" : "") . "
        ";
        $params = [':admission_id' => $admissionId];
        if ($excludePassId) {
            $params[':exclude_id'] = $excludePassId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $activeVisitors = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $currentCount = count($activeVisitors);
        $isUnderQuota = ($currentCount < $maxQuota);

        $names = array_column($activeVisitors, 'visitor_name');
        $namesStr = !empty($names) ? implode(', ', $names) : 'None';

        return [
            'valid'           => $isUnderQuota,
            'current_count'   => $currentCount,
            'max_quota'       => $maxQuota,
            'active_visitors' => $activeVisitors,
            'error'           => $isUnderQuota ? null : "Bedside visitor quota reached ({$currentCount} of {$maxQuota} allowed active visitors). Currently at bedside: {$namesStr}."
        ];
    }

    /**
     * Issue a new hospital visitor pass
     */
    public function issuePass(array $data, array $user): array
    {
        // 1. Validate required fields
        $visitorName = trim((string) ($data['visitor_name'] ?? ''));
        $idType = trim((string) ($data['id_document_type'] ?? ''));
        $idNumber = trim((string) ($data['id_document_number'] ?? ''));
        $phone = trim((string) ($data['phone'] ?? ''));
        $admissionId = (int) ($data['admission_id'] ?? 0);
        $relationship = trim((string) ($data['relationship_to_patient'] ?? 'Relative'));
        $isEmergency = !empty($data['is_emergency_exception']);
        $notes = trim((string) ($data['notes'] ?? ''));

        if (empty($visitorName)) return ['success' => false, 'message' => 'Visitor full name is required.'];
        if (empty($idType)) return ['success' => false, 'message' => 'ID document type is required.'];
        if (empty($idNumber)) return ['success' => false, 'message' => 'ID document number is required.'];
        if (empty($phone)) return ['success' => false, 'message' => 'Visitor contact phone number is required.'];
        if ($admissionId <= 0) return ['success' => false, 'message' => 'Active patient admission selection is required.'];

        // 2. Fetch active admission & location
        $admStmt = $this->db->prepare("
            SELECT a.id, a.admission_number, a.patient_id, a.patient_name, a.status,
                   a.ward_id, a.bed_id,
                   w.ward_name, w.ward_code, w.ward_type,
                   b.bed_number, b.room_number
            FROM inpatient_admissions a
            JOIN hospital_wards w ON w.id = a.ward_id
            JOIN hospital_beds b ON b.id = a.bed_id
            WHERE a.id = :id
            LIMIT 1
        ");
        $admStmt->execute([':id' => $admissionId]);
        $admission = $admStmt->fetch(PDO::FETCH_ASSOC);

        if (!$admission) {
            return ['success' => false, 'message' => 'Inpatient admission record not found.'];
        }

        if ($admission['status'] !== 'Admitted') {
            return [
                'success' => false,
                'message' => "Cannot issue visitor pass: Patient is {$admission['status']} (not actively admitted in ward)."
            ];
        }

        // 3. Resolve Ward Policy & Validate Constraints
        $policy = $this->resolveWardPolicy((int) $admission['ward_id']);

        if (!$isEmergency) {
            // A. Check Visiting Hours
            $hoursCheck = $this->validateVisitingHours($policy);
            if (!$hoursCheck['valid']) {
                return [
                    'success' => false,
                    'message' => $hoursCheck['error'],
                    'code'    => 'VISITING_HOURS_RESTRICTION'
                ];
            }

            // B. Check Bedside Active Visitor Quota
            $maxQuota = (int) ($policy['max_active_visitors_per_bed'] ?? 2);
            $quotaCheck = $this->validateBedsideQuota($admissionId, $maxQuota);
            if (!$quotaCheck['valid']) {
                return [
                    'success' => false,
                    'message' => $quotaCheck['error'],
                    'code'    => 'BEDSIDE_QUOTA_EXCEEDED',
                    'quota'   => $quotaCheck
                ];
            }
        }

        // 4. Calculate validity duration
        $durationMinutes = (int) ($data['duration_minutes'] ?? $policy['max_visit_duration_minutes'] ?? 120);
        $durationMinutes = max(15, min(720, $durationMinutes)); // between 15 mins and 12 hours

        $passNumber = $this->generatePassNumber();
        $barcodeHash = hash('sha256', $passNumber . '|' . $visitorName . '|' . time());
        $validUntil = date('Y-m-d H:i:s', strtotime("+{$durationMinutes} minutes"));

        // 5. Insert Visitor Pass
        $insertStmt = $this->db->prepare("
            INSERT INTO visitor_passes (
                pass_number, barcode_hash, visitor_name, id_document_type, id_document_number,
                phone, email, patient_id, admission_id, ward_id, room_number, bed_number,
                relationship_to_patient, check_in_time, valid_until, status,
                is_emergency_exception, issued_by, notes, created_at, updated_at
            ) VALUES (
                :pass_number, :barcode_hash, :visitor_name, :id_doc_type, :id_doc_number,
                :phone, :email, :patient_id, :admission_id, :ward_id, :room_number, :bed_number,
                :relationship, NOW(), DATE_ADD(NOW(), INTERVAL :duration_minutes MINUTE), 'Active',
                :is_emergency, :issued_by, :notes, NOW(), NOW()
            )
        ");

        $insertStmt->execute([
            ':pass_number'        => $passNumber,
            ':barcode_hash'       => substr($barcodeHash, 0, 32),
            ':visitor_name'       => $visitorName,
            ':id_doc_type'        => $idType,
            ':id_doc_number'      => $idNumber,
            ':phone'              => $phone,
            ':email'              => !empty($data['email']) ? trim($data['email']) : null,
            ':patient_id'         => $admission['patient_id'],
            ':admission_id'       => $admissionId,
            ':ward_id'            => $admission['ward_id'],
            ':room_number'        => $admission['room_number'],
            ':bed_number'         => $admission['bed_number'],
            ':relationship'       => $relationship,
            ':duration_minutes'   => $durationMinutes,
            ':is_emergency'       => $isEmergency ? 1 : 0,
            ':issued_by'          => (int) ($user['id'] ?? 1),
            ':notes'              => $notes
        ]);

        $passId = (int) $this->db->lastInsertId();
        $pass = $this->getPassDetail($passId);

        // Security Audit Log
        AuditLogger::log(
            AuditLogger::CATEGORY_SECURITY,
            'VISITOR_PASS_ISSUED',
            "Issued visitor pass {$passNumber} for visitor '{$visitorName}' visiting patient '{$admission['patient_name']}' in {$admission['ward_name']} Room {$admission['room_number']}.",
            $passId,
            (int) ($user['id'] ?? 1)
        );

        return [
            'success'     => true,
            'message'     => "Visitor pass {$passNumber} issued successfully.",
            'pass_id'     => $passId,
            'pass_number' => $passNumber,
            'valid_until' => $validUntil,
            'pass'        => $pass
        ];
    }

    /**
     * Check-out visitor by pass ID or pass number / barcode
     */
    public function checkOutPass(string|int $passIdentifier, array $user): array
    {
        $pass = $this->findPassByIdentifier($passIdentifier);

        if (!$pass) {
            return ['success' => false, 'message' => 'Visitor pass not found.'];
        }

        if ($pass['status'] === 'Checked Out') {
            return [
                'success' => true,
                'message' => "Pass {$pass['pass_number']} was already checked out at {$pass['check_out_time']}.",
                'pass'    => $pass
            ];
        }

        $stmt = $this->db->prepare("
            UPDATE visitor_passes
            SET status = 'Checked Out',
                check_out_time = NOW(),
                checked_out_by = :user_id,
                updated_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            ':user_id' => (int) ($user['id'] ?? 1),
            ':id'      => $pass['id']
        ]);

        $updatedPass = $this->getPassDetail((int) $pass['id']);

        AuditLogger::log(
            AuditLogger::CATEGORY_SECURITY,
            'VISITOR_PASS_CHECKED_OUT',
            "Checked out visitor pass {$pass['pass_number']} ('{$pass['visitor_name']}').",
            (int) $pass['id'],
            (int) ($user['id'] ?? 1)
        );

        return [
            'success' => true,
            'message' => "Visitor pass {$pass['pass_number']} successfully checked out.",
            'pass'    => $updatedPass
        ];
    }

    /**
     * Security Checkpoint Barcode Scan Verification
     */
    public function verifyPass(string|int $identifier): array
    {
        $this->syncExpiredPasses();

        $pass = $this->findPassByIdentifier($identifier);

        if (!$pass) {
            return [
                'success'  => false,
                'is_valid' => false,
                'status'   => 'Not Found',
                'message'  => "Invalid or unrecognized visitor pass barcode: '{$identifier}'."
            ];
        }

        $isExpired = (strtotime($pass['valid_until']) < time() && $pass['status'] === 'Active');
        if ($isExpired) {
            $this->db->prepare("UPDATE visitor_passes SET status = 'Expired' WHERE id = :id")->execute([':id' => $pass['id']]);
            $pass['status'] = 'Expired';
        }

        $isValid = ($pass['status'] === 'Active');

        $statusColor = match ($pass['status']) {
            'Active'      => '#10b981',
            'Expired'     => '#f59e0b',
            'Revoked'     => '#f43f5e',
            'Checked Out' => '#64748b',
            default       => '#94a3b8'
        };

        return [
            'success'      => true,
            'is_valid'     => $isValid,
            'status'       => $pass['status'],
            'status_color' => $statusColor,
            'message'      => $isValid ? "Valid & Active Visitor Pass" : "Access Denied: Pass is {$pass['status']}",
            'pass'         => $pass
        ];
    }

    /**
     * Revoke visitor pass due to security / misconduct / infection risk
     */
    public function revokePass(int $passId, string $reason, array $user): array
    {
        $pass = $this->getPassDetail($passId);

        if (!$pass) {
            return ['success' => false, 'message' => 'Visitor pass not found.'];
        }

        $stmt = $this->db->prepare("
            UPDATE visitor_passes
            SET status = 'Revoked',
                check_out_time = COALESCE(check_out_time, NOW()),
                revoked_by = :user_id,
                revocation_reason = :reason,
                updated_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            ':user_id' => (int) ($user['id'] ?? 1),
            ':reason'  => $reason,
            ':id'      => $passId
        ]);

        AuditLogger::log(
            AuditLogger::CATEGORY_SECURITY,
            'VISITOR_PASS_REVOKED',
            "REVOKED visitor pass {$pass['pass_number']} for visitor '{$pass['visitor_name']}'. Reason: {$reason}",
            $passId,
            (int) ($user['id'] ?? 1)
        );

        return [
            'success' => true,
            'message' => "Visitor pass {$pass['pass_number']} has been revoked.",
            'pass'    => $this->getPassDetail($passId)
        ];
    }

    /**
     * Get active visitors live feed for security console
     */
    public function getActiveVisitors(?int $wardId = null, ?string $search = null): array
    {
        $this->syncExpiredPasses();

        $sql = "
            SELECT vp.*,
                   p.first_name AS patient_first_name,
                   p.last_name AS patient_last_name,
                   p.patient_no,
                   COALESCE(adm.patient_name, CONCAT(p.first_name, ' ', p.last_name)) AS display_patient_name,
                   adm.admission_number,
                   w.ward_name,
                   w.ward_code,
                   w.ward_type,
                   TIMESTAMPDIFF(MINUTE, vp.check_in_time, NOW()) AS elapsed_minutes,
                   TIMESTAMPDIFF(MINUTE, NOW(), vp.valid_until) AS remaining_minutes
            FROM visitor_passes vp
            LEFT JOIN patients p ON p.id = vp.patient_id
            LEFT JOIN inpatient_admissions adm ON adm.id = vp.admission_id
            LEFT JOIN hospital_wards w ON w.id = vp.ward_id
            WHERE vp.status = 'Active'
        ";

        $params = [];
        if (!empty($wardId)) {
            $sql .= " AND vp.ward_id = :ward_id";
            $params[':ward_id'] = $wardId;
        }

        if (!empty($search)) {
            $sql .= " AND (
                vp.pass_number LIKE :search OR
                vp.visitor_name LIKE :search OR
                vp.phone LIKE :search OR
                p.first_name LIKE :search OR
                p.last_name LIKE :search OR
                adm.patient_name LIKE :search OR
                vp.room_number LIKE :search OR
                vp.bed_number LIKE :search
            )";
            $params[':search'] = "%{$search}%";
        }

        $sql .= " ORDER BY vp.check_in_time DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * List all visitor passes (with filters for status, date, ward)
     */
    public function listPasses(array $filters = []): array
    {
        $this->syncExpiredPasses();

        $sql = "
            SELECT vp.*,
                   p.first_name AS patient_first_name,
                   p.last_name AS patient_last_name,
                   p.patient_no,
                   COALESCE(adm.patient_name, CONCAT(p.first_name, ' ', p.last_name)) AS display_patient_name,
                   adm.admission_number,
                   w.ward_name,
                   w.ward_code,
                   w.ward_type,
                   issuer.username AS issued_by_name,
                   checkout_user.username AS checked_out_by_name
            FROM visitor_passes vp
            LEFT JOIN patients p ON p.id = vp.patient_id
            LEFT JOIN inpatient_admissions adm ON adm.id = vp.admission_id
            LEFT JOIN hospital_wards w ON w.id = vp.ward_id
            LEFT JOIN users issuer ON issuer.id = vp.issued_by
            LEFT JOIN users checkout_user ON checkout_user.id = vp.checked_out_by
            WHERE 1=1
        ";

        $params = [];

        if (!empty($filters['status'])) {
            $sql .= " AND vp.status = :status";
            $params[':status'] = $filters['status'];
        }

        if (!empty($filters['ward_id'])) {
            $sql .= " AND vp.ward_id = :ward_id";
            $params[':ward_id'] = (int) $filters['ward_id'];
        }

        if (!empty($filters['admission_id'])) {
            $sql .= " AND vp.admission_id = :admission_id";
            $params[':admission_id'] = (int) $filters['admission_id'];
        }

        if (!empty($filters['date'])) {
            $sql .= " AND DATE(vp.check_in_time) = :date";
            $params[':date'] = $filters['date'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (
                vp.pass_number LIKE :search OR
                vp.visitor_name LIKE :search OR
                vp.phone LIKE :search OR
                p.first_name LIKE :search OR
                p.last_name LIKE :search OR
                adm.patient_name LIKE :search OR
                vp.room_number LIKE :search OR
                vp.bed_number LIKE :search
            )";
            $params[':search'] = "%{$filters['search']}%";
        }

        $sql .= " ORDER BY vp.id DESC LIMIT 200";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get Visitor Security Dashboard KPIs
     */
    public function getDashboardStats(): array
    {
        $this->syncExpiredPasses();

        $today = date('Y-m-d');

        $stmt = $this->db->prepare("
            SELECT 
                COUNT(CASE WHEN status = 'Active' THEN 1 END) AS active_visitors_count,
                COUNT(CASE WHEN DATE(check_in_time) = :today THEN 1 END) AS total_checked_in_today,
                COUNT(CASE WHEN DATE(check_out_time) = :today AND status = 'Checked Out' THEN 1 END) AS total_checked_out_today,
                COUNT(CASE WHEN status = 'Expired' AND DATE(valid_until) = :today THEN 1 END) AS expired_today_count,
                COUNT(CASE WHEN status = 'Revoked' THEN 1 END) AS revoked_count,
                COUNT(CASE WHEN is_emergency_exception = 1 AND DATE(check_in_time) = :today THEN 1 END) AS emergency_exceptions_today
            FROM visitor_passes
        ");
        $stmt->execute([':today' => $today]);
        $kpis = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        // Ward distribution of active visitors
        $wardStmt = $this->db->query("
            SELECT w.id AS ward_id, w.ward_name, w.ward_code, w.ward_type,
                   COUNT(vp.id) AS active_visitors
            FROM hospital_wards w
            LEFT JOIN visitor_passes vp ON vp.ward_id = w.id AND vp.status = 'Active'
            WHERE w.is_active = 1
            GROUP BY w.id, w.ward_name, w.ward_code, w.ward_type
            ORDER BY active_visitors DESC, w.ward_name ASC
        ");
        $wardDistribution = $wardStmt ? $wardStmt->fetchAll(PDO::FETCH_ASSOC) : [];

        return [
            'summary'           => [
                'active_visitors'           => (int) ($kpis['active_visitors_count'] ?? 0),
                'checked_in_today'          => (int) ($kpis['total_checked_in_today'] ?? 0),
                'checked_out_today'         => (int) ($kpis['total_checked_out_today'] ?? 0),
                'expired_today'             => (int) ($kpis['expired_today_count'] ?? 0),
                'revoked_count'             => (int) ($kpis['revoked_count'] ?? 0),
                'emergency_exceptions'      => (int) ($kpis['emergency_exceptions_today'] ?? 0)
            ],
            'ward_distribution' => $wardDistribution,
            'server_time'       => date('Y-m-d H:i:s')
        ];
    }

    /**
     * Active admissions list for reception pass-issuing dropdown
     */
    public function getActiveAdmissionsForDropdown(?string $search = null): array
    {
        $sql = "
            SELECT a.id AS admission_id,
                   a.admission_number,
                   a.patient_id,
                   a.patient_name,
                   a.patient_mrn,
                   w.id AS ward_id,
                   w.ward_name,
                   w.ward_code,
                   w.ward_type,
                   b.id AS bed_id,
                   b.bed_number,
                   b.room_number,
                   (
                       SELECT COUNT(*) 
                       FROM visitor_passes vp 
                       WHERE vp.admission_id = a.id 
                         AND vp.status = 'Active' 
                         AND vp.valid_until > NOW()
                   ) AS active_visitor_count,
                   (
                       SELECT p.max_active_visitors_per_bed 
                       FROM ward_visitor_policies p 
                       WHERE p.ward_id = a.ward_id OR p.ward_type = w.ward_type 
                       ORDER BY p.ward_id DESC 
                       LIMIT 1
                   ) AS max_quota
            FROM inpatient_admissions a
            JOIN hospital_wards w ON w.id = a.ward_id
            JOIN hospital_beds b ON b.id = a.bed_id
            WHERE a.status = 'Admitted'
        ";

        $params = [];
        if (!empty($search)) {
            $sql .= " AND (
                a.patient_name LIKE :search OR
                a.admission_number LIKE :search OR
                a.patient_mrn LIKE :search OR
                b.room_number LIKE :search OR
                b.bed_number LIKE :search
            )";
            $params[':search'] = "%{$search}%";
        }

        $sql .= " ORDER BY w.ward_name ASC, b.room_number ASC, b.bed_number ASC LIMIT 100";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Generate HTML thermal badge printing template (3" x 2" hospital badge)
     */
    public function generateThermalBadgeHtml(int $passId): string
    {
        $pass = $this->getPassDetail($passId);
        if (!$pass) {
            return "<html><body><h3>Visitor Pass Not Found</h3></body></html>";
        }

        $hospitalName = "USINTELLIX HEALTHCARE SYSTEM";
        $passNumber = htmlspecialchars($pass['pass_number']);
        $visitorName = htmlspecialchars($pass['visitor_name']);
        $relationship = htmlspecialchars($pass['relationship_to_patient']);
        $patientName = htmlspecialchars($pass['display_patient_name'] ?? $pass['patient_name'] ?? 'Inpatient');
        $wardName = htmlspecialchars($pass['ward_name'] ?? 'Ward');
        $roomNumber = htmlspecialchars($pass['room_number'] ?? 'TBA');
        $bedNumber = htmlspecialchars($pass['bed_number'] ?? 'TBA');
        $checkInFormatted = date('M d, Y h:i A', strtotime($pass['check_in_time']));
        $validUntilFormatted = date('h:i A', strtotime($pass['valid_until']));
        $validDateFormatted = date('M d, Y', strtotime($pass['valid_until']));
        $idType = htmlspecialchars($pass['id_document_type']);
        $phone = htmlspecialchars($pass['phone']);

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Visitor Badge - {$passNumber}</title>
    <style>
        @page {
            size: 80mm 60mm;
            margin: 0;
        }
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 5mm;
            width: 70mm;
            height: 50mm;
            box-sizing: border-box;
            background: #fff;
            color: #000;
        }
        .badge-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #000;
            padding-bottom: 2mm;
            margin-bottom: 2mm;
        }
        .hospital-title {
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .badge-type {
            font-size: 12px;
            font-weight: 900;
            background: #000;
            color: #fff;
            padding: 1px 5px;
            border-radius: 3px;
        }
        .visitor-section {
            margin-bottom: 2mm;
        }
        .visitor-name {
            font-size: 15px;
            font-weight: 800;
            line-height: 1.1;
            text-transform: uppercase;
        }
        .relationship-tag {
            font-size: 9px;
            font-weight: 700;
            color: #444;
        }
        .dest-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border: 1px solid #000;
            border-radius: 4px;
            padding: 2mm;
            margin-bottom: 2mm;
            background: #f8f8f8;
        }
        .dest-label {
            font-size: 8px;
            text-transform: uppercase;
            font-weight: 700;
            color: #555;
        }
        .dest-val {
            font-size: 12px;
            font-weight: 800;
        }
        .dest-patient {
            grid-column: 1 / -1;
            border-bottom: 1px dashed #ccc;
            padding-bottom: 1mm;
            margin-bottom: 1mm;
        }
        .footer-grid {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            font-size: 8px;
        }
        .expiry-box {
            border: 1.5px solid #000;
            padding: 1mm 2mm;
            border-radius: 3px;
            text-align: center;
        }
        .expiry-title {
            font-size: 7px;
            font-weight: 800;
            text-transform: uppercase;
        }
        .expiry-time {
            font-size: 13px;
            font-weight: 900;
        }
        .barcode-box {
            font-family: monospace;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1px;
            text-align: center;
        }
        .barcode-bars {
            font-size: 18px;
            letter-spacing: -1px;
            line-height: 1;
            font-family: 'Libre Barcode 39', 'Courier New', monospace;
        }
        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body onload="window.print()">
    <div class="badge-header">
        <div>
            <div class="hospital-title">{$hospitalName}</div>
            <div style="font-size: 8px; color: #555;">SECURITY VISITOR PASS</div>
        </div>
        <div class="badge-type">VISITOR</div>
    </div>

    <div class="visitor-section">
        <div class="visitor-name">{$visitorName}</div>
        <div class="relationship-tag">{$relationship} &bull; {$idType} verified</div>
    </div>

    <div class="dest-grid">
        <div class="dest-patient">
            <div class="dest-label">Visiting Inpatient:</div>
            <div class="dest-val">{$patientName}</div>
        </div>
        <div>
            <div class="dest-label">Ward:</div>
            <div class="dest-val">{$wardName}</div>
        </div>
        <div>
            <div class="dest-label">Room / Bed:</div>
            <div class="dest-val">Rm {$roomNumber} / Bed {$bedNumber}</div>
        </div>
    </div>

    <div class="footer-grid">
        <div class="barcode-box">
            <div class="barcode-bars">||||| | |||| || ||| ||||</div>
            <div>{$passNumber}</div>
            <div style="font-size: 7px; color: #666;">Issued: {$checkInFormatted}</div>
        </div>
        <div class="expiry-box">
            <div class="expiry-title">Valid Until</div>
            <div class="expiry-time">{$validUntilFormatted}</div>
            <div style="font-size: 8px;">{$validDateFormatted}</div>
        </div>
    </div>
</body>
</html>
HTML;
    }

    /**
     * Internal helper to find pass by ID, pass_number, or barcode
     */
    private function findPassByIdentifier(string|int $identifier): ?array
    {
        $id = is_numeric($identifier) ? (int) $identifier : 0;

        $stmt = $this->db->prepare("
            SELECT vp.*,
                   p.first_name AS patient_first_name,
                   p.last_name AS patient_last_name,
                   COALESCE(adm.patient_name, CONCAT(p.first_name, ' ', p.last_name)) AS display_patient_name,
                   adm.admission_number,
                   w.ward_name, w.ward_code, w.ward_type
            FROM visitor_passes vp
            LEFT JOIN patients p ON p.id = vp.patient_id
            LEFT JOIN inpatient_admissions adm ON adm.id = vp.admission_id
            LEFT JOIN hospital_wards w ON w.id = vp.ward_id
            WHERE vp.id = :id OR vp.pass_number = :pass_num OR vp.barcode_hash = :hash
            LIMIT 1
        ");
        $stmt->execute([
            ':id'       => $id,
            ':pass_num' => trim((string) $identifier),
            ':hash'     => trim((string) $identifier)
        ]);

        $pass = $stmt->fetch(PDO::FETCH_ASSOC);
        return $pass ?: null;
    }

    /**
     * Get single pass detail by ID
     */
    public function getPassDetail(int $passId): ?array
    {
        return $this->findPassByIdentifier($passId);
    }

    /**
     * Background sync: mark active passes that exceeded valid_until as 'Expired'
     */
    private function syncExpiredPasses(): void
    {
        $this->db->query("
            UPDATE visitor_passes
            SET status = 'Expired',
                updated_at = NOW()
            WHERE status = 'Active'
              AND valid_until < NOW()
        ");
    }
}
