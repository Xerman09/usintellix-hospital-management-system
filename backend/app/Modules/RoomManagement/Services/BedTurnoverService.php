<?php

namespace App\Modules\RoomManagement\Services;

use App\Core\Database;
use App\Modules\RoomManagement\Models\BedTurnoverLog;
use PDO;
use Exception;

class BedTurnoverService
{
    private PDO $db;

    public function __construct()
    {
        $this->db = Database::connection();
    }

    /**
     * Generate unique turnover number: TRN-YYYYMMDD-XXXX
     */
    public function generateTurnoverNumber(): string
    {
        $datePrefix = date('Ymd');
        $stmt = $this->db->prepare("
            SELECT COUNT(*) FROM bed_turnover_logs
            WHERE turnover_number LIKE :prefix
        ");
        $stmt->execute([':prefix' => "TRN-{$datePrefix}-%"]);
        $count = (int) $stmt->fetchColumn();

        return sprintf('TRN-%s-%04d', $datePrefix, $count + 1);
    }

    /**
     * Create/Initiate a bed turnover log (e.g. upon discharge, transfer, or manual trigger)
     */
    public function initiateTurnover(int $bedId, ?int $admissionId = null, ?int $userId = null, string $priority = 'Routine', string $cleaningType = 'Routine Turnover', ?string $notes = null): array
    {
        // 1. Fetch bed details
        $bStmt = $this->db->prepare("
            SELECT b.*, r.id AS room_id, r.building_id, w.id AS ward_id
            FROM hospital_beds b
            LEFT JOIN hospital_rooms r ON b.room_id = r.id
            LEFT JOIN hospital_wards w ON b.ward_id = w.id
            WHERE b.id = :id
        ");
        $bStmt->execute([':id' => $bedId]);
        $bed = $bStmt->fetch(PDO::FETCH_ASSOC);

        if (!$bed) {
            return ['success' => false, 'message' => "Bed #{$bedId} not found."];
        }

        // 2. Check if there is already an active (uncompleted) turnover log for this bed
        $actStmt = $this->db->prepare("
            SELECT * FROM bed_turnover_logs
            WHERE bed_id = :bed_id 
              AND status NOT IN ('Completed / Available', 'Cancelled')
            ORDER BY id DESC LIMIT 1
        ");
        $actStmt->execute([':bed_id' => $bedId]);
        $existing = $actStmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            // Already active in pipeline
            return [
                'success' => true,
                'message' => "Bed #{$bed['bed_number']} already has an active turnover in progress (#{$existing['turnover_number']}).",
                'turnover' => $this->getTurnoverDetail((int)$existing['id']),
                'already_active' => true
            ];
        }

        // 3. Mark bed status as Dirty / Turnover and clear current_admission_id
        $this->db->prepare("
            UPDATE hospital_beds 
            SET status = 'Dirty / Turnover', current_admission_id = NULL, updated_at = NOW() 
            WHERE id = :id
        ")->execute([':id' => $bedId]);

        // Sync room status if room exists
        if (!empty($bed['room_id'])) {
            $this->syncRoomStatus((int)$bed['room_id']);
        }

        // Determine default target SLA based on priority & cleaning type
        $targetSla = 45; // Default 45 mins
        if ($priority === 'STAT') {
            $targetSla = 25;
        } elseif ($priority === 'Urgent') {
            $targetSla = 35;
        }
        if ($cleaningType === 'Terminal Cleaning' || $cleaningType === 'Isolation Deep Sanitize') {
            $targetSla = max($targetSla, 60);
        }

        $turnoverNumber = $this->generateTurnoverNumber();

        $insStmt = $this->db->prepare("
            INSERT INTO bed_turnover_logs (
                turnover_number, bed_id, room_id, ward_id, admission_id,
                vacated_at, vacated_by, cleaning_priority, cleaning_type,
                status, target_sla_minutes, is_sla_breached, notes
            ) VALUES (
                :turnover_number, :bed_id, :room_id, :ward_id, :admission_id,
                NOW(), :vacated_by, :cleaning_priority, :cleaning_type,
                'Vacated / Dirty', :target_sla, 0, :notes
            )
        ");

        $insStmt->execute([
            ':turnover_number'   => $turnoverNumber,
            ':bed_id'             => $bedId,
            ':room_id'            => $bed['room_id'] ?: null,
            ':ward_id'            => $bed['ward_id'] ?: null,
            ':admission_id'       => $admissionId,
            ':vacated_by'         => $userId,
            ':cleaning_priority'  => in_array($priority, ['Routine', 'Urgent', 'STAT']) ? $priority : 'Routine',
            ':cleaning_type'      => in_array($cleaningType, ['Routine Turnover', 'Terminal Cleaning', 'Isolation Deep Sanitize', 'Biohazard / Spill']) ? $cleaningType : 'Routine Turnover',
            ':target_sla'         => $targetSla,
            ':notes'              => $notes
        ]);

        $turnoverId = (int)$this->db->lastInsertId();

        return [
            'success' => true,
            'message' => "Bed #{$bed['bed_number']} turnover pipeline initiated (#{$turnoverNumber}).",
            'turnover_id' => $turnoverId,
            'turnover_number' => $turnoverNumber,
            'turnover' => $this->getTurnoverDetail($turnoverId)
        ];
    }

    /**
     * List turnover logs with real-time SLA metrics and filtering
     */
    public function listTurnovers(array $filters = []): array
    {
        $sql = "
            SELECT t.*,
                   b.bed_number, b.bed_type, b.room_number AS bed_room_number,
                   w.ward_name, w.ward_code,
                   r.room_number, r.room_name, r.room_type, r.floor_number,
                   bldg.building_name, bldg.building_code,
                   a.admission_number, a.patient_name, a.patient_mrn,
                   TIMESTAMPDIFF(MINUTE, t.vacated_at, COALESCE(t.released_at, NOW())) AS elapsed_turnover_minutes,
                   CASE 
                       WHEN t.cleaning_started_at IS NOT NULL 
                       THEN TIMESTAMPDIFF(MINUTE, t.cleaning_started_at, COALESCE(t.cleaning_completed_at, NOW()))
                       ELSE NULL
                   END AS elapsed_cleaning_minutes
            FROM bed_turnover_logs t
            JOIN hospital_beds b ON t.bed_id = b.id
            LEFT JOIN hospital_wards w ON t.ward_id = w.id
            LEFT JOIN hospital_rooms r ON t.room_id = r.id
            LEFT JOIN hospital_buildings bldg ON r.building_id = bldg.id
            LEFT JOIN inpatient_admissions a ON t.admission_id = a.id
            WHERE 1=1
        ";

        $params = [];

        if (!empty($filters['status'])) {
            $sql .= " AND t.status = :status";
            $params[':status'] = $filters['status'];
        } elseif (!empty($filters['active_only'])) {
            $sql .= " AND t.status NOT IN ('Completed / Available', 'Cancelled')";
        }

        if (!empty($filters['stage'])) {
            if ($filters['stage'] === 'active') {
                $sql .= " AND t.status NOT IN ('Completed / Available', 'Cancelled')";
            } elseif ($filters['stage'] === 'dirty') {
                $sql .= " AND t.status = 'Vacated / Dirty'";
            } elseif ($filters['stage'] === 'cleaning') {
                $sql .= " AND t.status = 'Cleaning In-Progress'";
            } elseif ($filters['stage'] === 'inspection') {
                $sql .= " AND t.status = 'Sanitized / Pending Inspection'";
            } elseif ($filters['stage'] === 'completed') {
                $sql .= " AND t.status = 'Completed / Available'";
            }
        }

        if (!empty($filters['priority'])) {
            $sql .= " AND t.cleaning_priority = :priority";
            $params[':priority'] = $filters['priority'];
        }

        if (!empty($filters['cleaning_type'])) {
            $sql .= " AND t.cleaning_type = :cleaning_type";
            $params[':cleaning_type'] = $filters['cleaning_type'];
        }

        if (!empty($filters['ward_id'])) {
            $sql .= " AND t.ward_id = :ward_id";
            $params[':ward_id'] = (int)$filters['ward_id'];
        }

        if (!empty($filters['building_id'])) {
            $sql .= " AND r.building_id = :building_id";
            $params[':building_id'] = (int)$filters['building_id'];
        }

        if (!empty($filters['search'])) {
            $s = '%' . trim($filters['search']) . '%';
            $sql .= " AND (t.turnover_number LIKE :s1 OR b.bed_number LIKE :s2 OR r.room_number LIKE :s3 OR t.assigned_evs_staff_name LIKE :s4 OR t.cleaned_by LIKE :s5 OR a.patient_name LIKE :s6)";
            $params[':s1'] = $s;
            $params[':s2'] = $s;
            $params[':s3'] = $s;
            $params[':s4'] = $s;
            $params[':s5'] = $s;
            $params[':s6'] = $s;
        }

        $sql .= "
            ORDER BY 
                CASE t.cleaning_priority 
                    WHEN 'STAT' THEN 1 
                    WHEN 'Urgent' THEN 2 
                    ELSE 3 
                END ASC,
                CASE t.status
                    WHEN 'Vacated / Dirty' THEN 1
                    WHEN 'Cleaning In-Progress' THEN 2
                    WHEN 'Sanitized / Pending Inspection' THEN 3
                    WHEN 'Inspection Failed' THEN 4
                    ELSE 5
                END ASC,
                t.vacated_at DESC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Process rows and decode checklist JSON & calculate live SLA breach
        foreach ($rows as &$row) {
            $row['checklist'] = !empty($row['checklist']) ? json_decode($row['checklist'], true) : [];
            $targetSla = (int)$row['target_sla_minutes'];
            $elapsed = (int)$row['elapsed_turnover_minutes'];
            $isBreached = ($row['status'] === 'Completed / Available') ? (bool)$row['is_sla_breached'] : ($elapsed > $targetSla);
            $row['is_sla_breached'] = $isBreached;
            $row['sla_remaining_minutes'] = max(0, $targetSla - $elapsed);
        }

        return $rows;
    }

    /**
     * Get detail of a single turnover log
     */
    public function getTurnoverDetail(int $id): ?array
    {
        $stmt = $this->db->prepare("
            SELECT t.*,
                   b.bed_number, b.bed_type, b.room_number AS bed_room_number, b.status AS bed_current_status,
                   w.ward_name, w.ward_code,
                   r.room_number, r.room_name, r.room_type, r.floor_number,
                   bldg.building_name, bldg.building_code,
                   a.admission_number, a.patient_name, a.patient_mrn,
                   TIMESTAMPDIFF(MINUTE, t.vacated_at, COALESCE(t.released_at, NOW())) AS elapsed_turnover_minutes,
                   CASE 
                       WHEN t.cleaning_started_at IS NOT NULL 
                       THEN TIMESTAMPDIFF(MINUTE, t.cleaning_started_at, COALESCE(t.cleaning_completed_at, NOW()))
                       ELSE NULL
                   END AS elapsed_cleaning_minutes
            FROM bed_turnover_logs t
            JOIN hospital_beds b ON t.bed_id = b.id
            LEFT JOIN hospital_wards w ON t.ward_id = w.id
            LEFT JOIN hospital_rooms r ON t.room_id = r.id
            LEFT JOIN hospital_buildings bldg ON r.building_id = bldg.id
            LEFT JOIN inpatient_admissions a ON t.admission_id = a.id
            WHERE t.id = :id
        ");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) return null;

        $row['checklist'] = !empty($row['checklist']) ? json_decode($row['checklist'], true) : [];
        $targetSla = (int)$row['target_sla_minutes'];
        $elapsed = (int)$row['elapsed_turnover_minutes'];
        $isBreached = ($row['status'] === 'Completed / Available') ? (bool)$row['is_sla_breached'] : ($elapsed > $targetSla);
        $row['is_sla_breached'] = $isBreached;
        $row['sla_remaining_minutes'] = max(0, $targetSla - $elapsed);

        return $row;
    }

    /**
     * Get aggregate statistics for EVS pipeline dashboard
     */
    public function getStats(): array
    {
        $statsStmt = $this->db->query("
            SELECT
                COUNT(*) AS total_logs,
                SUM(CASE WHEN status = 'Vacated / Dirty' THEN 1 ELSE 0 END) AS pending_dirty,
                SUM(CASE WHEN status = 'Cleaning In-Progress' THEN 1 ELSE 0 END) AS in_progress,
                SUM(CASE WHEN status = 'Sanitized / Pending Inspection' THEN 1 ELSE 0 END) AS pending_inspection,
                SUM(CASE WHEN status = 'Inspection Failed' THEN 1 ELSE 0 END) AS inspection_failed,
                SUM(CASE WHEN status = 'Completed / Available' AND DATE(released_at) = CURDATE() THEN 1 ELSE 0 END) AS completed_today,
                AVG(CASE WHEN status = 'Completed / Available' AND cleaning_duration_minutes IS NOT NULL THEN cleaning_duration_minutes ELSE NULL END) AS avg_cleaning_minutes,
                AVG(CASE WHEN status = 'Completed / Available' AND turnover_duration_minutes IS NOT NULL THEN turnover_duration_minutes ELSE NULL END) AS avg_turnover_minutes,
                SUM(CASE WHEN status = 'Completed / Available' AND is_sla_breached = 0 THEN 1 ELSE 0 END) AS completed_within_sla,
                SUM(CASE WHEN status = 'Completed / Available' THEN 1 ELSE 0 END) AS total_completed,
                SUM(CASE WHEN status NOT IN ('Completed / Available', 'Cancelled') AND TIMESTAMPDIFF(MINUTE, vacated_at, NOW()) > target_sla_minutes THEN 1 ELSE 0 END) AS active_sla_breaches
            FROM bed_turnover_logs
        ");

        $s = $statsStmt->fetch(PDO::FETCH_ASSOC);

        $totalCompleted = (int)($s['total_completed'] ?? 0);
        $completedWithinSla = (int)($s['completed_within_sla'] ?? 0);
        $slaRate = $totalCompleted > 0 ? round(($completedWithinSla / $totalCompleted) * 100, 1) : 100.0;

        return [
            'pending_dirty'         => (int)($s['pending_dirty'] ?? 0),
            'in_progress'           => (int)($s['in_progress'] ?? 0),
            'pending_inspection'    => (int)($s['pending_inspection'] ?? 0),
            'inspection_failed'     => (int)($s['inspection_failed'] ?? 0),
            'completed_today'       => (int)($s['completed_today'] ?? 0),
            'active_turnovers'      => (int)($s['pending_dirty'] ?? 0) + (int)($s['in_progress'] ?? 0) + (int)($s['pending_inspection'] ?? 0) + (int)($s['inspection_failed'] ?? 0),
            'avg_cleaning_minutes'  => round((float)($s['avg_cleaning_minutes'] ?? 0), 1),
            'avg_turnover_minutes'  => round((float)($s['avg_turnover_minutes'] ?? 0), 1),
            'sla_compliance_rate'   => $slaRate,
            'active_sla_breaches'   => (int)($s['active_sla_breaches'] ?? 0)
        ];
    }

    /**
     * Assign staff to turnover task
     */
    public function assignStaff(int $turnoverId, array $data): array
    {
        $log = $this->getTurnoverDetail($turnoverId);
        if (!$log) {
            return ['success' => false, 'message' => 'Turnover log not found.'];
        }

        $staffId = !empty($data['staff_id']) ? (int)$data['staff_id'] : null;
        $staffName = trim((string)($data['staff_name'] ?? ''));

        if (empty($staffName)) {
            return ['success' => false, 'message' => 'EVS staff name is required.'];
        }

        $priority = !empty($data['cleaning_priority']) ? $data['cleaning_priority'] : $log['cleaning_priority'];
        $cleaningType = !empty($data['cleaning_type']) ? $data['cleaning_type'] : $log['cleaning_type'];
        $targetSla = !empty($data['target_sla_minutes']) ? (int)$data['target_sla_minutes'] : $log['target_sla_minutes'];
        $notes = isset($data['notes']) ? trim((string)$data['notes']) : $log['notes'];

        $stmt = $this->db->prepare("
            UPDATE bed_turnover_logs
            SET assigned_evs_staff_id = :staff_id,
                assigned_evs_staff_name = :staff_name,
                cleaning_priority = :priority,
                cleaning_type = :cleaning_type,
                target_sla_minutes = :target_sla,
                notes = :notes,
                updated_at = NOW()
            WHERE id = :id
        ");

        $stmt->execute([
            ':staff_id'      => $staffId,
            ':staff_name'    => $staffName,
            ':priority'      => in_array($priority, ['Routine', 'Urgent', 'STAT']) ? $priority : 'Routine',
            ':cleaning_type' => in_array($cleaningType, ['Routine Turnover', 'Terminal Cleaning', 'Isolation Deep Sanitize', 'Biohazard / Spill']) ? $cleaningType : 'Routine Turnover',
            ':target_sla'    => max(10, $targetSla),
            ':notes'         => $notes,
            ':id'            => $turnoverId
        ]);

        return [
            'success' => true,
            'message' => "Bed turnover assigned to {$staffName}.",
            'turnover' => $this->getTurnoverDetail($turnoverId)
        ];
    }

    /**
     * Start cleaning
     */
    public function startCleaning(int $turnoverId, array $data): array
    {
        $log = $this->getTurnoverDetail($turnoverId);
        if (!$log) {
            return ['success' => false, 'message' => 'Turnover log not found.'];
        }

        if ($log['status'] === 'Completed / Available') {
            return ['success' => false, 'message' => 'Turnover has already been completed and bed released.'];
        }

        $cleanedBy = !empty($data['cleaned_by']) ? trim($data['cleaned_by']) : ($log['assigned_evs_staff_name'] ?: 'EVS Team Member');
        $notes = isset($data['notes']) ? trim((string)$data['notes']) : $log['notes'];

        $stmt = $this->db->prepare("
            UPDATE bed_turnover_logs
            SET status = 'Cleaning In-Progress',
                cleaning_started_at = COALESCE(cleaning_started_at, NOW()),
                cleaned_by = :cleaned_by,
                notes = :notes,
                updated_at = NOW()
            WHERE id = :id
        ");

        $stmt->execute([
            ':cleaned_by' => $cleanedBy,
            ':notes'      => $notes,
            ':id'         => $turnoverId
        ]);

        return [
            'success' => true,
            'message' => "Cleaning started for bed #{$log['bed_number']}.",
            'turnover' => $this->getTurnoverDetail($turnoverId)
        ];
    }

    /**
     * Complete cleaning and submit sanitization checklist
     */
    public function completeCleaning(int $turnoverId, array $data): array
    {
        $log = $this->getTurnoverDetail($turnoverId);
        if (!$log) {
            return ['success' => false, 'message' => 'Turnover log not found.'];
        }

        if ($log['status'] === 'Completed / Available') {
            return ['success' => false, 'message' => 'Turnover has already been completed and bed released.'];
        }

        $checklist = $data['checklist'] ?? [];
        $checklistJson = !empty($checklist) ? json_encode($checklist, JSON_UNESCAPED_UNICODE) : null;
        $notes = isset($data['notes']) ? trim((string)$data['notes']) : $log['notes'];
        $cleanedBy = !empty($data['cleaned_by']) ? trim($data['cleaned_by']) : ($log['cleaned_by'] ?: $log['assigned_evs_staff_name']);

        // Calculate cleaning duration
        $startedAt = $log['cleaning_started_at'] ?: date('Y-m-d H:i:s');
        $durationMinutes = max(1, (int) round((time() - strtotime($startedAt)) / 60));

        $stmt = $this->db->prepare("
            UPDATE bed_turnover_logs
            SET status = 'Sanitized / Pending Inspection',
                cleaning_completed_at = NOW(),
                cleaning_duration_minutes = :duration,
                cleaned_by = :cleaned_by,
                checklist = :checklist,
                notes = :notes,
                updated_at = NOW()
            WHERE id = :id
        ");

        $stmt->execute([
            ':duration'   => $durationMinutes,
            ':cleaned_by' => $cleanedBy,
            ':checklist'  => $checklistJson,
            ':notes'      => $notes,
            ':id'         => $turnoverId
        ]);

        return [
            'success' => true,
            'message' => "Bed #{$log['bed_number']} sanitized and marked pending inspection.",
            'turnover' => $this->getTurnoverDetail($turnoverId)
        ];
    }

    /**
     * Inspect and release bed to Available (or fail and flag for re-cleaning)
     */
    public function inspectAndRelease(int $turnoverId, array $data, ?int $userId = null): array
    {
        $log = $this->getTurnoverDetail($turnoverId);
        if (!$log) {
            return ['success' => false, 'message' => 'Turnover log not found.'];
        }

        $inspectionStatus = trim((string)($data['inspection_status'] ?? 'Passed'));
        $inspectorName = trim((string)($data['inspector_name'] ?? 'Charge Nurse / EVS Supervisor'));
        $notes = isset($data['notes']) ? trim((string)$data['notes']) : $log['notes'];

        if (!in_array($inspectionStatus, ['Passed', 'Failed'], true)) {
            return ['success' => false, 'message' => 'Inspection status must be Passed or Failed.'];
        }

        if ($inspectionStatus === 'Passed') {
            // Bed passes terminal inspection: Release to Available!
            $vacatedTime = strtotime($log['vacated_at']);
            $totalTurnoverMinutes = max(1, (int) round((time() - $vacatedTime) / 60));
            $isBreached = ($totalTurnoverMinutes > (int)$log['target_sla_minutes']) ? 1 : 0;

            $stmt = $this->db->prepare("
                UPDATE bed_turnover_logs
                SET status = 'Completed / Available',
                    inspection_status = 'Passed',
                    inspected_at = NOW(),
                    inspected_by = :inspected_by,
                    inspector_name = :inspector_name,
                    released_at = NOW(),
                    turnover_duration_minutes = :turnover_duration,
                    is_sla_breached = :is_sla_breached,
                    notes = :notes,
                    updated_at = NOW()
                WHERE id = :id
            ");

            $stmt->execute([
                ':inspected_by'       => $userId,
                ':inspector_name'     => $inspectorName,
                ':turnover_duration'  => $totalTurnoverMinutes,
                ':is_sla_breached'    => $isBreached,
                ':notes'              => $notes,
                ':id'                 => $turnoverId
            ]);

            // UPDATE HOSPITAL BED STATUS TO AVAILABLE
            $this->db->prepare("
                UPDATE hospital_beds 
                SET status = 'Available', current_admission_id = NULL, updated_at = NOW() 
                WHERE id = :id
            ")->execute([':id' => $log['bed_id']]);

            // Sync room status
            if (!empty($log['room_id'])) {
                $this->syncRoomStatus((int)$log['room_id']);
            }

            return [
                'success' => true,
                'message' => "Bed #{$log['bed_number']} verified and released to AVAILABLE.",
                'turnover' => $this->getTurnoverDetail($turnoverId)
            ];
        } else {
            // Inspection Failed: Needs re-cleaning
            $stmt = $this->db->prepare("
                UPDATE bed_turnover_logs
                SET status = 'Inspection Failed',
                    inspection_status = 'Failed',
                    inspected_at = NOW(),
                    inspected_by = :inspected_by,
                    inspector_name = :inspector_name,
                    notes = :notes,
                    updated_at = NOW()
                WHERE id = :id
            ");

            $stmt->execute([
                ':inspected_by'   => $userId,
                ':inspector_name' => $inspectorName,
                ':notes'          => $notes ? "INSPECTION FAILED: {$notes}" : "Sanitization standards not met. Re-cleaning required.",
                ':id'             => $turnoverId
            ]);

            return [
                'success' => true,
                'message' => "Inspection recorded as FAILED. Bed #{$log['bed_number']} remains out of service for re-cleaning.",
                'turnover' => $this->getTurnoverDetail($turnoverId)
            ];
        }
    }

    /**
     * Cancel turnover
     */
    public function cancelTurnover(int $turnoverId, string $reason): array
    {
        $log = $this->getTurnoverDetail($turnoverId);
        if (!$log) {
            return ['success' => false, 'message' => 'Turnover log not found.'];
        }

        $this->db->prepare("
            UPDATE bed_turnover_logs
            SET status = 'Cancelled',
                notes = CONCAT(COALESCE(notes, ''), ' [Cancelled: ', :reason, ']'),
                updated_at = NOW()
            WHERE id = :id
        ")->execute([
            ':reason' => $reason,
            ':id'     => $turnoverId
        ]);

        return ['success' => true, 'message' => "Turnover #{$log['turnover_number']} cancelled."];
    }

    /**
     * Helper to synchronize room status based on beds in that room
     */
    private function syncRoomStatus(int $roomId): void
    {
        $stmt = $this->db->prepare("SELECT status FROM hospital_beds WHERE room_id = :room_id AND is_active = 1");
        $stmt->execute([':room_id' => $roomId]);
        $beds = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (empty($beds)) return;

        $total = count($beds);
        $counts = array_count_values($beds);
        $occ = $counts['Occupied'] ?? 0;
        $avail = $counts['Available'] ?? 0;
        $dirty = $counts['Dirty / Turnover'] ?? 0;
        $maint = $counts['Maintenance'] ?? 0;

        $newStatus = 'Available';
        if ($maint === $total) {
            $newStatus = 'Maintenance';
        } elseif ($occ === $total) {
            $newStatus = 'Occupied';
        } elseif ($occ > 0 && ($occ + $dirty + $maint) < $total) {
            $newStatus = 'Partially Occupied';
        } elseif ($dirty > 0 && $occ === 0 && $avail === 0) {
            $newStatus = 'Dirty / Turnover';
        } elseif ($occ > 0) {
            $newStatus = 'Partially Occupied';
        }

        $this->db->prepare("UPDATE hospital_rooms SET status = :status, updated_at = NOW() WHERE id = :id")
                 ->execute([':status' => $newStatus, ':id' => $roomId]);
    }
}
