<?php

namespace App\Modules\EquipmentAssets\Services;

use App\Core\AuditLogger;
use App\Core\AuditDiffService;
use App\Core\Database;
use App\Modules\EquipmentAssets\Models\EquipmentAsset;
use App\Modules\EquipmentAssets\Models\EquipmentMaintenanceLog;
use PDO;
use Throwable;

class EquipmentAssetService
{
    /**
     * List equipment assets with relational location data and calculated calibration flags.
     */
    public function list(array $filters = []): array
    {
        $sql = "SELECT e.*,
                       f.name AS facility_name,
                       d.name AS department_name,
                       b.building_name,
                       w.ward_name,
                       w.ward_type,
                       r.room_number,
                       r.room_type,
                       DATEDIFF(e.next_calibration_due, CURDATE()) AS days_until_calibration,
                       CASE 
                           WHEN e.next_calibration_due IS NOT NULL AND e.next_calibration_due < CURDATE() THEN 1 
                           ELSE 0 
                       END AS is_calibration_overdue,
                       (SELECT COUNT(*) FROM equipment_maintenance_logs l WHERE l.equipment_id = e.id) AS maintenance_logs_count
                FROM hospital_equipment_assets e
                LEFT JOIN facilities f ON f.id = e.facility_id
                LEFT JOIN departments d ON d.id = e.department_id
                LEFT JOIN hospital_buildings b ON b.id = e.building_id
                LEFT JOIN hospital_wards w ON w.id = e.ward_id
                LEFT JOIN hospital_rooms r ON r.id = e.room_id
                WHERE e.deleted_at IS NULL";

        $params = [];

        if (!empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';
            $sql .= " AND (e.asset_tag LIKE :search_tag 
                        OR e.name LIKE :search_name 
                        OR e.serial_number LIKE :search_sn 
                        OR e.model_number LIKE :search_model 
                        OR e.manufacturer LIKE :search_mfg)";
            $params['search_tag'] = $term;
            $params['search_name'] = $term;
            $params['search_sn'] = $term;
            $params['search_model'] = $term;
            $params['search_mfg'] = $term;
        }

        if (!empty($filters['category'])) {
            $sql .= " AND e.category = :category";
            $params['category'] = $filters['category'];
        }

        if (!empty($filters['status'])) {
            $sql .= " AND e.status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['criticality_level'])) {
            $sql .= " AND e.criticality_level = :criticality";
            $params['criticality'] = $filters['criticality_level'];
        }

        if (!empty($filters['department_id'])) {
            $sql .= " AND e.department_id = :department_id";
            $params['department_id'] = (int) $filters['department_id'];
        }

        if (!empty($filters['ward_id'])) {
            $sql .= " AND e.ward_id = :ward_id";
            $params['ward_id'] = (int) $filters['ward_id'];
        }

        // Calibration filtering
        if (!empty($filters['calibration_filter'])) {
            if ($filters['calibration_filter'] === 'overdue') {
                $sql .= " AND e.next_calibration_due IS NOT NULL AND e.next_calibration_due < CURDATE()";
            } elseif ($filters['calibration_filter'] === 'upcoming_30') {
                $sql .= " AND e.next_calibration_due IS NOT NULL AND e.next_calibration_due BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)";
            } elseif ($filters['calibration_filter'] === 'all_due') {
                $sql .= " AND e.next_calibration_due IS NOT NULL AND e.next_calibration_due <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND e.status != 'Decommissioned'";
            }
        }

        $sql .= " ORDER BY 
                    CASE 
                        WHEN e.status = 'Needs Calibration' THEN 1
                        WHEN e.status = 'Under Repair' THEN 2
                        WHEN e.status = 'Operational' THEN 3
                        ELSE 4 
                    END,
                    e.name ASC";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get real-time biomedical KPI metrics.
     */
    public function getMetrics(): array
    {
        $db = Database::connection();

        $total = (int) $db->query("SELECT COUNT(*) FROM hospital_equipment_assets WHERE deleted_at IS NULL")->fetchColumn();
        $operational = (int) $db->query("SELECT COUNT(*) FROM hospital_equipment_assets WHERE deleted_at IS NULL AND status = 'Operational'")->fetchColumn();
        $needsCalibration = (int) $db->query("SELECT COUNT(*) FROM hospital_equipment_assets WHERE deleted_at IS NULL AND (status = 'Needs Calibration' OR (next_calibration_due IS NOT NULL AND next_calibration_due < CURDATE() AND status != 'Decommissioned'))")->fetchColumn();
        $underRepair = (int) $db->query("SELECT COUNT(*) FROM hospital_equipment_assets WHERE deleted_at IS NULL AND status = 'Under Repair'")->fetchColumn();
        $decommissioned = (int) $db->query("SELECT COUNT(*) FROM hospital_equipment_assets WHERE deleted_at IS NULL AND status = 'Decommissioned'")->fetchColumn();
        $dueIn30Days = (int) $db->query("SELECT COUNT(*) FROM hospital_equipment_assets WHERE deleted_at IS NULL AND next_calibration_due IS NOT NULL AND next_calibration_due BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND status != 'Decommissioned'")->fetchColumn();
        $lifeCritical = (int) $db->query("SELECT COUNT(*) FROM hospital_equipment_assets WHERE deleted_at IS NULL AND criticality_level = 'Life Critical'")->fetchColumn();

        return [
            'total_assets'             => $total,
            'operational'              => $operational,
            'operational_rate'         => $total > 0 ? round(($operational / $total) * 100, 1) : 0,
            'needs_calibration'        => $needsCalibration,
            'due_in_30_days'           => $dueIn30Days,
            'under_repair'             => $underRepair,
            'decommissioned'           => $decommissioned,
            'out_of_service'           => $underRepair + $decommissioned,
            'life_critical_count'      => $lifeCritical,
        ];
    }

    /**
     * Get lookup master data for facilities, departments, buildings, wards, and rooms.
     */
    public function getLocations(): array
    {
        $db = Database::connection();

        $facilities = $db->query("SELECT id, name FROM facilities WHERE is_inactive = 0 AND deleted_at IS NULL ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);
        $departments = $db->query("SELECT id, name, type FROM departments WHERE deleted_at IS NULL ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);
        $buildings = $db->query("SELECT id, building_code, building_name FROM hospital_buildings WHERE is_active = 1 ORDER BY building_name")->fetchAll(PDO::FETCH_ASSOC);
        $wards = $db->query("SELECT id, ward_code, ward_name, ward_type FROM hospital_wards WHERE is_active = 1 ORDER BY ward_name")->fetchAll(PDO::FETCH_ASSOC);
        $rooms = $db->query("SELECT id, building_id, ward_id, room_number, room_name, room_type FROM hospital_rooms WHERE is_active = 1 ORDER BY room_number")->fetchAll(PDO::FETCH_ASSOC);

        return [
            'facilities'  => $facilities,
            'departments' => $departments,
            'buildings'   => $buildings,
            'wards'       => $wards,
            'rooms'       => $rooms
        ];
    }

    /**
     * Get single asset with complete details and maintenance history.
     */
    public function get(int $id): ?array
    {
        $db = Database::connection();

        $sql = "SELECT e.*,
                       f.name AS facility_name,
                       d.name AS department_name,
                       b.building_name,
                       w.ward_name,
                       r.room_number,
                       DATEDIFF(e.next_calibration_due, CURDATE()) AS days_until_calibration
                FROM hospital_equipment_assets e
                LEFT JOIN facilities f ON f.id = e.facility_id
                LEFT JOIN departments d ON d.id = e.department_id
                LEFT JOIN hospital_buildings b ON b.id = e.building_id
                LEFT JOIN hospital_wards w ON w.id = e.ward_id
                LEFT JOIN hospital_rooms r ON r.id = e.room_id
                WHERE e.id = :id AND e.deleted_at IS NULL LIMIT 1";

        $stmt = $db->prepare($sql);
        $stmt->execute(['id' => $id]);
        $asset = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$asset) {
            return null;
        }

        // Fetch maintenance logs
        $logStmt = $db->prepare("
            SELECT l.*, u.username as logged_by_username
            FROM equipment_maintenance_logs l
            LEFT JOIN users u ON u.id = l.created_by
            WHERE l.equipment_id = :id
            ORDER BY l.performed_date DESC, l.id DESC
            LIMIT 50
        ");
        $logStmt->execute(['id' => $id]);
        $asset['maintenance_logs'] = $logStmt->fetchAll(PDO::FETCH_ASSOC);

        return $asset;
    }

    /**
     * Create a new hospital equipment machinery asset.
     */
    public function create(array $data, int $userId): array
    {
        $errors = $this->validate($data);
        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors'  => $errors
            ];
        }

        $tag = !empty($data['asset_tag']) ? trim($data['asset_tag']) : $this->generateAssetTag($data['category'] ?? 'GEN');

        $payload = [
            'asset_tag'                => $tag,
            'name'                     => trim($data['name']),
            'category'                 => $data['category'] ?? 'Monitoring',
            'criticality_level'        => $data['criticality_level'] ?? 'Medium',
            'serial_number'            => !empty($data['serial_number']) ? trim($data['serial_number']) : null,
            'model_number'             => !empty($data['model_number']) ? trim($data['model_number']) : null,
            'manufacturer'             => !empty($data['manufacturer']) ? trim($data['manufacturer']) : null,
            'facility_id'              => !empty($data['facility_id']) ? (int) $data['facility_id'] : null,
            'department_id'            => !empty($data['department_id']) ? (int) $data['department_id'] : null,
            'building_id'              => !empty($data['building_id']) ? (int) $data['building_id'] : null,
            'ward_id'                  => !empty($data['ward_id']) ? (int) $data['ward_id'] : null,
            'room_id'                  => !empty($data['room_id']) ? (int) $data['room_id'] : null,
            'purchase_date'            => !empty($data['purchase_date']) ? $data['purchase_date'] : null,
            'purchase_cost'            => isset($data['purchase_cost']) && $data['purchase_cost'] !== '' ? (float) $data['purchase_cost'] : 0.00,
            'warranty_expiration_date' => !empty($data['warranty_expiration_date']) ? $data['warranty_expiration_date'] : null,
            'last_calibration_date'    => !empty($data['last_calibration_date']) ? $data['last_calibration_date'] : null,
            'next_calibration_due'     => !empty($data['next_calibration_due']) ? $data['next_calibration_due'] : null,
            'status'                   => $data['status'] ?? 'Operational',
            'status_reason'            => !empty($data['status_reason']) ? trim($data['status_reason']) : null,
            'notes'                    => !empty($data['notes']) ? trim($data['notes']) : null,
            'created_at'               => date('Y-m-d H:i:s'),
            'created_by'               => $userId
        ];

        try {
            $id = (new EquipmentAsset())->create($payload);

            if (!$id) {
                return ['success' => false, 'message' => 'Failed to create equipment asset record.'];
            }

            // Create initial log
            (new EquipmentMaintenanceLog())->create([
                'equipment_id'   => $id,
                'log_type'       => 'Inspection',
                'performed_by'   => 'Biomedical Asset Manager',
                'performed_date' => date('Y-m-d'),
                'result_status'  => 'Pass',
                'findings'       => 'Initial commissioning and asset catalog registration.',
                'created_at'     => date('Y-m-d H:i:s'),
                'created_by'     => $userId
            ]);

            AuditLogger::log(
                AuditLogger::CATEGORY_SECURITY,
                'EQUIPMENT_ASSET_CREATED',
                "Registered equipment asset '{$payload['name']}' (Tag: {$tag}, Category: {$payload['category']}).",
                null,
                $userId
            );

            AuditDiffService::recordDiff(
                'hospital_equipment_assets',
                (int) $id,
                'CREATE',
                null,
                $payload,
                $userId
            );

            return [
                'success' => true,
                'message' => "Equipment asset '{$payload['name']}' registered successfully with Tag {$tag}.",
                'data'    => ['id' => $id, 'asset_tag' => $tag]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Database error registering asset: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Update an existing hospital equipment asset.
     */
    public function update(int $id, array $data, int $userId): array
    {
        $existing = (new EquipmentAsset())->where('id', $id)->first();
        if (!$existing || $existing['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Equipment asset not found.'];
        }

        $errors = $this->validate($data, $id);
        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors'  => $errors
            ];
        }

        $oldStatus = $existing['status'];
        $newStatus = $data['status'] ?? $oldStatus;

        $payload = [
            'asset_tag'                => trim($data['asset_tag'] ?? $existing['asset_tag']),
            'name'                     => trim($data['name']),
            'category'                 => $data['category'] ?? $existing['category'],
            'criticality_level'        => $data['criticality_level'] ?? $existing['criticality_level'],
            'serial_number'            => !empty($data['serial_number']) ? trim($data['serial_number']) : null,
            'model_number'             => !empty($data['model_number']) ? trim($data['model_number']) : null,
            'manufacturer'             => !empty($data['manufacturer']) ? trim($data['manufacturer']) : null,
            'facility_id'              => !empty($data['facility_id']) ? (int) $data['facility_id'] : null,
            'department_id'            => !empty($data['department_id']) ? (int) $data['department_id'] : null,
            'building_id'              => !empty($data['building_id']) ? (int) $data['building_id'] : null,
            'ward_id'                  => !empty($data['ward_id']) ? (int) $data['ward_id'] : null,
            'room_id'                  => !empty($data['room_id']) ? (int) $data['room_id'] : null,
            'purchase_date'            => !empty($data['purchase_date']) ? $data['purchase_date'] : null,
            'purchase_cost'            => isset($data['purchase_cost']) && $data['purchase_cost'] !== '' ? (float) $data['purchase_cost'] : 0.00,
            'warranty_expiration_date' => !empty($data['warranty_expiration_date']) ? $data['warranty_expiration_date'] : null,
            'last_calibration_date'    => !empty($data['last_calibration_date']) ? $data['last_calibration_date'] : null,
            'next_calibration_due'     => !empty($data['next_calibration_due']) ? $data['next_calibration_due'] : null,
            'status'                   => $newStatus,
            'status_reason'            => !empty($data['status_reason']) ? trim($data['status_reason']) : null,
            'notes'                    => !empty($data['notes']) ? trim($data['notes']) : null,
            'updated_at'               => date('Y-m-d H:i:s'),
            'updated_by'               => $userId
        ];

        try {
            (new EquipmentAsset())->update($payload, $id);

            // If status changed, record a maintenance history audit
            if ($oldStatus !== $newStatus) {
                (new EquipmentMaintenanceLog())->create([
                    'equipment_id'   => $id,
                    'log_type'       => 'Status Change',
                    'performed_by'   => 'Biomedical Administrator',
                    'performed_date' => date('Y-m-d'),
                    'result_status'  => $newStatus === 'Operational' ? 'Pass' : 'Incomplete',
                    'findings'       => "Status updated from '{$oldStatus}' to '{$newStatus}'." . (!empty($payload['status_reason']) ? " Reason: {$payload['status_reason']}" : ''),
                    'created_at'     => date('Y-m-d H:i:s'),
                    'created_by'     => $userId
                ]);
            }

            AuditLogger::log(
                AuditLogger::CATEGORY_SECURITY,
                'EQUIPMENT_ASSET_UPDATED',
                "Updated equipment asset '{$payload['name']}' (ID: {$id}). Status: {$newStatus}.",
                null,
                $userId
            );

            AuditDiffService::recordDiff(
                'hospital_equipment_assets',
                $id,
                'UPDATE',
                $existing,
                $payload,
                $userId
            );

            return [
                'success' => true,
                'message' => "Equipment asset '{$payload['name']}' updated successfully."
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Database error updating asset: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Fast status transition (Operational, Needs Calibration, Under Repair, Decommissioned).
     */
    public function updateStatus(int $id, string $status, ?string $reason, int $userId): array
    {
        $validStatuses = ['Operational', 'Needs Calibration', 'Under Repair', 'Decommissioned'];
        if (!in_array($status, $validStatuses, true)) {
            return ['success' => false, 'message' => 'Invalid equipment status.'];
        }

        $existing = (new EquipmentAsset())->where('id', $id)->first();
        if (!$existing || $existing['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Equipment asset not found.'];
        }

        $oldStatus = $existing['status'];

        (new EquipmentAsset())->update([
            'status'        => $status,
            'status_reason' => $reason ?: null,
            'updated_at'    => date('Y-m-d H:i:s'),
            'updated_by'    => $userId
        ], $id);

        (new EquipmentMaintenanceLog())->create([
            'equipment_id'   => $id,
            'log_type'       => 'Status Change',
            'performed_by'   => 'Biomedical Engineering',
            'performed_date' => date('Y-m-d'),
            'result_status'  => $status === 'Operational' ? 'Pass' : 'Incomplete',
            'findings'       => "Machine status changed from '{$oldStatus}' to '{$status}'." . ($reason ? " Reason: {$reason}" : ''),
            'created_at'     => date('Y-m-d H:i:s'),
            'created_by'     => $userId
        ]);

        AuditLogger::log(
            AuditLogger::CATEGORY_SECURITY,
            'EQUIPMENT_STATUS_CHANGE',
            "Changed equipment asset ID #{$id} ({$existing['name']}) status to '{$status}'." . ($reason ? " Reason: {$reason}" : ""),
            null,
            $userId
        );

        AuditDiffService::recordDiff(
            'hospital_equipment_assets',
            $id,
            'UPDATE',
            ['status' => $existing['status'], 'status_reason' => $existing['status_reason']],
            ['status' => $status, 'status_reason' => $reason],
            $userId
        );

        return [
            'success' => true,
            'message' => "Asset status updated to {$status}."
        ];
    }

    /**
     * Record a calibration or preventive maintenance log entry.
     */
    public function recordLog(int $equipmentId, array $data, int $userId): array
    {
        $asset = (new EquipmentAsset())->where('id', $equipmentId)->first();
        if (!$asset || $asset['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Equipment asset not found.'];
        }

        if (empty($data['log_type']) || empty($data['performed_date'])) {
            return ['success' => false, 'message' => 'Log type and performed date are required.'];
        }

        $logType = $data['log_type'];
        $resultStatus = $data['result_status'] ?? 'Pass';
        $performedDate = $data['performed_date'];
        $nextDue = !empty($data['next_due_date']) ? $data['next_due_date'] : null;

        $logId = (new EquipmentMaintenanceLog())->create([
            'equipment_id'   => $equipmentId,
            'log_type'       => $logType,
            'performed_by'   => !empty($data['performed_by']) ? trim($data['performed_by']) : 'Certified Biomedical Technician',
            'performed_date' => $performedDate,
            'result_status'  => $resultStatus,
            'next_due_date'  => $nextDue,
            'cost'           => isset($data['cost']) && $data['cost'] !== '' ? (float) $data['cost'] : 0.00,
            'findings'       => !empty($data['findings']) ? trim($data['findings']) : null,
            'actions_taken'  => !empty($data['actions_taken']) ? trim($data['actions_taken']) : null,
            'created_at'     => date('Y-m-d H:i:s'),
            'created_by'     => $userId
        ]);

        // If Calibration passed, auto-update asset calibration dates and set status to Operational
        if ($logType === 'Calibration' && in_array($resultStatus, ['Pass', 'Pass with Recommendation'], true)) {
            $assetUpdate = [
                'last_calibration_date' => $performedDate,
                'updated_at'            => date('Y-m-d H:i:s'),
                'updated_by'            => $userId
            ];

            if ($nextDue) {
                $assetUpdate['next_calibration_due'] = $nextDue;
            } else {
                // Default to +6 months
                $assetUpdate['next_calibration_due'] = date('Y-m-d', strtotime('+6 months', strtotime($performedDate)));
            }

            if ($asset['status'] === 'Needs Calibration') {
                $assetUpdate['status'] = 'Operational';
                $assetUpdate['status_reason'] = 'Recalibrated and validated operational.';
            }

            (new EquipmentAsset())->update($assetUpdate, $equipmentId);
        }

        AuditLogger::log(
            AuditLogger::CATEGORY_SECURITY,
            'EQUIPMENT_LOG_RECORDED',
            "Recorded {$logType} ({$resultStatus}) for asset ID #{$equipmentId} ({$asset['name']}).",
            null,
            $userId
        );

        return [
            'success' => true,
            'message' => "Maintenance log recorded successfully.",
            'data'    => ['log_id' => $logId]
        ];
    }

    /**
     * Soft-delete an equipment asset.
     */
    public function delete(int $id, int $userId): array
    {
        $existing = (new EquipmentAsset())->where('id', $id)->first();
        if (!$existing || $existing['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Equipment asset not found.'];
        }

        (new EquipmentAsset())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $id);

        AuditLogger::log(
            AuditLogger::CATEGORY_SECURITY,
            'EQUIPMENT_ASSET_DELETED',
            "Deleted equipment asset ID #{$id} ({$existing['name']}).",
            null,
            $userId
        );

        return [
            'success' => true,
            'message' => "Asset '{$existing['name']}' archived successfully."
        ];
    }

    /**
     * Validation helper.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Equipment Name is required.';
        }

        if (empty($data['category'])) {
            $errors['category'] = 'Equipment Category is required.';
        } elseif (!in_array($data['category'], ['Diagnostic', 'Life Support', 'Surgical', 'Laboratory', 'Monitoring', 'General Facility'], true)) {
            $errors['category'] = 'Invalid equipment category.';
        }

        if (!empty($data['asset_tag'])) {
            $existing = (new EquipmentAsset())->where('asset_tag', trim($data['asset_tag']))->first();
            if ($existing && (int) $existing['id'] !== (int) $ignoreId && $existing['deleted_at'] === null) {
                $errors['asset_tag'] = 'Asset Tag / Barcode is already registered to another equipment.';
            }
        }

        return $errors;
    }

    /**
     * Generate sequential asset tag.
     */
    private function generateAssetTag(string $category): string
    {
        $catPrefixes = [
            'Life Support'     => 'VENT',
            'Monitoring'       => 'MON',
            'Surgical'         => 'SURG',
            'Diagnostic'       => 'DIAG',
            'Laboratory'       => 'LAB',
            'General Facility' => 'GEN'
        ];

        $prefix = $catPrefixes[$category] ?? 'EQ';
        $db = Database::connection();
        $count = (int) $db->query("SELECT COUNT(*) FROM hospital_equipment_assets")->fetchColumn() + 1;

        return "EQ-{$prefix}-" . str_pad((string) $count, 3, '0', STR_PAD_LEFT);
    }
}
