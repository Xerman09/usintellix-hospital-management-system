<?php

namespace App\Modules\EquipmentAssets\Services;

use App\Core\AuditLogger;
use App\Core\Database;
use App\Modules\EquipmentAssets\Models\BiomedMaintenanceSchedule;
use App\Modules\EquipmentAssets\Models\BiomedWorkOrder;
use App\Modules\EquipmentAssets\Models\EquipmentAsset;
use PDO;
use Throwable;

class BiomedicalMaintenanceService
{
    /**
     * Generate sequential PM schedule code e.g. PMS-2026-0005
     */
    public function generateScheduleCode(PDO $pdo): string
    {
        $year = (int) date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
            VALUES ('BIOMED_PM', ?, 1)
            ON DUPLICATE KEY UPDATE `last_number` = `last_number` + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("
            SELECT `last_number` FROM `billing_tariff_counters`
            WHERE `counter_type` = 'BIOMED_PM' AND `year` = ?
        ");
        $sel->execute([$year]);
        $num = (int)$sel->fetchColumn();

        return sprintf("PMS-%d-%04d", $year, $num);
    }

    /**
     * Generate sequential Work Order number e.g. WO-2026-0005
     */
    public function generateWorkOrderNumber(PDO $pdo): string
    {
        $year = (int) date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
            VALUES ('BIOMED_WO', ?, 1)
            ON DUPLICATE KEY UPDATE `last_number` = `last_number` + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("
            SELECT `last_number` FROM `billing_tariff_counters`
            WHERE `counter_type` = 'BIOMED_WO' AND `year` = ?
        ");
        $sel->execute([$year]);
        $num = (int)$sel->fetchColumn();

        return sprintf("WO-%d-%04d", $year, $num);
    }

    /**
     * Generate sequential Breakdown Ticket number e.g. TKT-2026-0005
     */
    public function generateTicketNumber(PDO $pdo): string
    {
        $year = (int) date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
            VALUES ('BIOMED_TKT', ?, 1)
            ON DUPLICATE KEY UPDATE `last_number` = `last_number` + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("
            SELECT `last_number` FROM `billing_tariff_counters`
            WHERE `counter_type` = 'BIOMED_TKT' AND `year` = ?
        ");
        $sel->execute([$year]);
        $num = (int)$sel->fetchColumn();

        return sprintf("TKT-%d-%04d", $year, $num);
    }

    /**
     * Retrieve executive summary KPIs for PM Calendar and maintenance fleet.
     */
    public function getPMCalendarSummary(): array
    {
        $pdo = Database::connection();

        $sql = "
            SELECT
                COUNT(*) as total_schedules,
                SUM(CASE WHEN s.status = 'active' THEN 1 ELSE 0 END) as active_schedules,
                SUM(CASE WHEN s.status = 'active' AND s.criticality_tier = 'life_critical' THEN 1 ELSE 0 END) as life_critical_schedules,
                SUM(CASE WHEN s.status = 'active' AND s.next_due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_schedules,
                SUM(CASE WHEN s.status = 'active' AND s.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as due_in_30_days,
                SUM(CASE WHEN s.status = 'active' AND YEAR(s.next_due_date) = YEAR(CURDATE()) AND MONTH(s.next_due_date) = MONTH(CURDATE()) THEN 1 ELSE 0 END) as due_this_month
            FROM biomed_maintenance_schedules s
        ";

        $summary = $pdo->query($sql)->fetch(PDO::FETCH_ASSOC);

        // Open work orders
        $woSql = "
            SELECT
                COUNT(*) as total_work_orders,
                SUM(CASE WHEN status IN ('scheduled', 'in_progress', 'pending_parts') THEN 1 ELSE 0 END) as open_work_orders,
                SUM(CASE WHEN status = 'completed_passed' THEN 1 ELSE 0 END) as completed_work_orders,
                SUM(CASE WHEN status = 'failed_quarantined' THEN 1 ELSE 0 END) as quarantined_work_orders,
                SUM(CASE WHEN ticket_number IS NOT NULL AND status IN ('scheduled', 'in_progress', 'pending_parts') THEN 1 ELSE 0 END) as active_breakdown_tickets,
                SUM(CASE WHEN ticket_number IS NOT NULL AND priority = 'stat_life_critical' AND status IN ('scheduled', 'in_progress', 'pending_parts') THEN 1 ELSE 0 END) as critical_life_support_down
            FROM biomed_work_orders
        ";
        $woSummary = $pdo->query($woSql)->fetch(PDO::FETCH_ASSOC);

        $totalActive = (int)($summary['active_schedules'] ?? 0);
        $overdue = (int)($summary['overdue_schedules'] ?? 0);
        $complianceRate = $totalActive > 0 ? round((($totalActive - $overdue) / $totalActive) * 100, 1) : 100.0;

        return [
            'total_schedules'        => (int)($summary['total_schedules'] ?? 0),
            'active_schedules'       => $totalActive,
            'life_critical_schedules'=> (int)($summary['life_critical_schedules'] ?? 0),
            'overdue_schedules'      => $overdue,
            'due_in_30_days'         => (int)($summary['due_in_30_days'] ?? 0),
            'due_this_month'         => (int)($summary['due_this_month'] ?? 0),
            'compliance_rate'        => $complianceRate,
            'total_work_orders'      => (int)($woSummary['total_work_orders'] ?? 0),
            'open_work_orders'       => (int)($woSummary['open_work_orders'] ?? 0),
            'completed_work_orders'  => (int)($woSummary['completed_work_orders'] ?? 0),
            'quarantined_work_orders'=> (int)($woSummary['quarantined_work_orders'] ?? 0),
            'active_breakdown_tickets'=> (int)($woSummary['active_breakdown_tickets'] ?? 0),
            'critical_life_support_down'=> (int)($woSummary['critical_life_support_down'] ?? 0),
        ];
    }

    /**
     * Retrieve executive summary KPIs specifically for Breakdown Ticketing & Urgent Repairs.
     */
    public function getBreakdownSummary(): array
    {
        $pdo = Database::connection();

        $sql = "
            SELECT
                COUNT(*) as total_tickets,
                SUM(CASE WHEN status IN ('scheduled', 'in_progress', 'pending_parts') THEN 1 ELSE 0 END) as active_tickets,
                SUM(CASE WHEN priority = 'stat_life_critical' AND status IN ('scheduled', 'in_progress', 'pending_parts') THEN 1 ELSE 0 END) as stat_life_critical_down,
                SUM(CASE WHEN priority = 'urgent' AND status IN ('scheduled', 'in_progress', 'pending_parts') THEN 1 ELSE 0 END) as urgent_down,
                SUM(CASE WHEN priority = 'routine' AND status IN ('scheduled', 'in_progress', 'pending_parts') THEN 1 ELSE 0 END) as routine_down,
                SUM(CASE WHEN status = 'completed_passed' THEN 1 ELSE 0 END) as completed_tickets,
                SUM(total_cost) as total_repair_costs,
                AVG(CASE WHEN downtime_hours > 0 THEN downtime_hours ELSE NULL END) as avg_downtime_hours
            FROM biomed_work_orders
            WHERE ticket_number IS NOT NULL OR work_order_type = 'breakdown_emergency_repair'
        ";

        $summary = $pdo->query($sql)->fetch(PDO::FETCH_ASSOC);

        // Assets currently under repair in hospital
        $assetSql = "SELECT COUNT(*) FROM hospital_equipment_assets WHERE status = 'Under Repair' AND deleted_at IS NULL";
        $underRepairCount = (int)$pdo->query($assetSql)->fetchColumn();

        return [
            'total_tickets'            => (int)($summary['total_tickets'] ?? 0),
            'active_tickets'           => (int)($summary['active_tickets'] ?? 0),
            'stat_life_critical_down'  => (int)($summary['stat_life_critical_down'] ?? 0),
            'urgent_down'              => (int)($summary['urgent_down'] ?? 0),
            'routine_down'             => (int)($summary['routine_down'] ?? 0),
            'completed_tickets'        => (int)($summary['completed_tickets'] ?? 0),
            'total_repair_costs'       => (float)($summary['total_repair_costs'] ?? 0.0),
            'avg_downtime_hours'       => round((float)($summary['avg_downtime_hours'] ?? 0.0), 1),
            'under_repair_assets_count'=> $underRepairCount
        ];
    }

    /**
     * List Preventive Maintenance schedules with relational equipment data and due status.
     */
    public function listSchedules(array $filters = []): array
    {
        $pdo = Database::connection();

        $sql = "
            SELECT
                s.*,
                e.asset_tag,
                e.name AS equipment_name,
                e.category AS equipment_category,
                e.criticality_level AS equipment_criticality,
                e.serial_number,
                e.model_number,
                e.manufacturer,
                e.status AS equipment_status,
                d.name AS department_name,
                w.ward_name,
                DATEDIFF(s.next_due_date, CURDATE()) AS days_until_due,
                CASE
                    WHEN s.status = 'active' AND s.next_due_date < CURDATE() THEN 'overdue'
                    WHEN s.status = 'active' AND s.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 14 DAY) THEN 'due_soon'
                    WHEN s.status = 'active' AND s.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 'upcoming_30'
                    ELSE 'on_schedule'
                END AS urgency_status,
                (SELECT COUNT(*) FROM biomed_work_orders wo WHERE wo.schedule_id = s.id) AS work_orders_count
            FROM biomed_maintenance_schedules s
            INNER JOIN hospital_equipment_assets e ON e.id = s.asset_id
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN hospital_wards w ON w.id = e.ward_id
            WHERE 1=1
        ";

        $params = [];

        if (!empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';
            $sql .= " AND (
                s.schedule_code LIKE :search_code OR
                s.title LIKE :search_title OR
                s.assigned_engineer_name LIKE :search_eng OR
                s.vendor_or_contractor_name LIKE :search_vnd OR
                e.asset_tag LIKE :search_tag OR
                e.name LIKE :search_eq_name OR
                e.serial_number LIKE :search_sn OR
                e.model_number LIKE :search_model
            )";
            $params['search_code'] = $term;
            $params['search_title'] = $term;
            $params['search_eng'] = $term;
            $params['search_vnd'] = $term;
            $params['search_tag'] = $term;
            $params['search_eq_name'] = $term;
            $params['search_sn'] = $term;
            $params['search_model'] = $term;
        }

        if (!empty($filters['maintenance_type'])) {
            $sql .= " AND s.maintenance_type = :maint_type";
            $params['maint_type'] = $filters['maintenance_type'];
        }

        if (!empty($filters['frequency'])) {
            $sql .= " AND s.frequency = :frequency";
            $params['frequency'] = $filters['frequency'];
        }

        if (!empty($filters['criticality_tier'])) {
            $sql .= " AND s.criticality_tier = :crit_tier";
            $params['crit_tier'] = $filters['criticality_tier'];
        }

        if (!empty($filters['status'])) {
            $sql .= " AND s.status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['asset_id'])) {
            $sql .= " AND s.asset_id = :asset_id";
            $params['asset_id'] = (int) $filters['asset_id'];
        }

        if (!empty($filters['due_filter'])) {
            if ($filters['due_filter'] === 'overdue') {
                $sql .= " AND s.status = 'active' AND s.next_due_date < CURDATE()";
            } elseif ($filters['due_filter'] === 'due_soon') {
                $sql .= " AND s.status = 'active' AND s.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 14 DAY)";
            } elseif ($filters['due_filter'] === 'due_30') {
                $sql .= " AND s.status = 'active' AND s.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)";
            }
        }

        $sql .= " ORDER BY s.next_due_date ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['task_checklist'] = !empty($row['task_checklist_json']) ? json_decode($row['task_checklist_json'], true) : [];
            $row['task_count'] = is_array($row['task_checklist']) ? count($row['task_checklist']) : 0;
        }

        return $rows;
    }

    /**
     * Get single PM schedule by ID with full details and related work orders.
     */
    public function getSchedule(int $id): ?array
    {
        $pdo = Database::connection();

        $sql = "
            SELECT
                s.*,
                e.asset_tag,
                e.name AS equipment_name,
                e.category AS equipment_category,
                e.criticality_level AS equipment_criticality,
                e.serial_number,
                e.model_number,
                e.manufacturer,
                e.status AS equipment_status,
                e.last_calibration_date,
                e.next_calibration_due,
                d.name AS department_name,
                w.ward_name,
                DATEDIFF(s.next_due_date, CURDATE()) AS days_until_due
            FROM biomed_maintenance_schedules s
            INNER JOIN hospital_equipment_assets e ON e.id = s.asset_id
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN hospital_wards w ON w.id = e.ward_id
            WHERE s.id = ?
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $schedule = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$schedule) {
            return null;
        }

        $schedule['task_checklist'] = !empty($schedule['task_checklist_json'])
            ? json_decode($schedule['task_checklist_json'], true)
            : [];

        // Fetch recent work orders under this schedule
        $woSql = "
            SELECT * FROM biomed_work_orders
            WHERE schedule_id = ?
            ORDER BY scheduled_date DESC, id DESC
            LIMIT 10
        ";
        $woStmt = $pdo->prepare($woSql);
        $woStmt->execute([$id]);
        $schedule['recent_work_orders'] = $woStmt->fetchAll(PDO::FETCH_ASSOC);

        return $schedule;
    }

    /**
     * Create a new PM schedule.
     */
    public function createSchedule(array $data, int $userId): array
    {
        $pdo = Database::connection();

        if (empty($data['asset_id'])) {
            return ['success' => false, 'message' => 'Valid equipment asset is required.'];
        }
        if (empty($data['title'])) {
            return ['success' => false, 'message' => 'Schedule title is required.'];
        }
        if (empty($data['next_due_date'])) {
            return ['success' => false, 'message' => 'Next PM due date is required.'];
        }

        // Verify equipment asset exists
        $assetStmt = $pdo->prepare("SELECT id, name, asset_tag, criticality_level FROM hospital_equipment_assets WHERE id = ?");
        $assetStmt->execute([(int)$data['asset_id']]);
        $asset = $assetStmt->fetch(PDO::FETCH_ASSOC);
        if (!$asset) {
            return ['success' => false, 'message' => 'Specified equipment asset does not exist.'];
        }

        // Format frequency intervals
        $frequency = $data['frequency'] ?? 'annual';
        $intervalMonths = match ($frequency) {
            'monthly'     => 1,
            'bi_monthly'  => 2,
            'quarterly'   => 3,
            'semi_annual' => 6,
            'annual'      => 12,
            'biennial'    => 24,
            default       => 12
        };

        // Determine default checklist if none supplied
        $checklist = $data['task_checklist'] ?? [];
        if (empty($checklist)) {
            $checklist = [
                ['task_no' => 1, 'task_name' => 'Visual Physical Inspection', 'standards_or_tolerance' => 'No cracks, fluid ingress, or cable fraying', 'is_critical' => true],
                ['task_no' => 2, 'task_name' => 'IEC 62353 Electrical Safety Test', 'standards_or_tolerance' => 'Chassis leakage < 100 uA, Ground resistance < 0.200 Ohm', 'is_critical' => true],
                ['task_no' => 3, 'task_name' => 'Internal Calibration & Diagnostic Run', 'standards_or_tolerance' => 'OEM tolerance within +/- 3%', 'is_critical' => true],
                ['task_no' => 4, 'task_name' => 'Battery / Auxiliary Backup Check', 'standards_or_tolerance' => 'Holds minimum rated load for >= 30 mins', 'is_critical' => false],
                ['task_no' => 5, 'task_name' => 'Firmware & Alarm Functional Verification', 'standards_or_tolerance' => 'Audio/visual high-priority alarms trigger properly', 'is_critical' => true]
            ];
        }

        $checklistJson = json_encode($checklist, JSON_UNESCAPED_UNICODE);
        $scheduleCode = $this->generateScheduleCode($pdo);

        $pdo->beginTransaction();
        try {
            $sql = "
                INSERT INTO biomed_maintenance_schedules (
                    schedule_code,
                    asset_id,
                    title,
                    maintenance_type,
                    frequency,
                    interval_months,
                    criticality_tier,
                    estimated_duration_hours,
                    last_performed_date,
                    next_due_date,
                    grace_period_days,
                    service_provider_type,
                    vendor_or_contractor_name,
                    contact_phone_or_email,
                    assigned_engineer_staff_id,
                    assigned_engineer_name,
                    task_checklist_json,
                    safety_standards_reference,
                    status,
                    is_auto_generate_work_order,
                    notes
                ) VALUES (
                    :schedule_code,
                    :asset_id,
                    :title,
                    :maintenance_type,
                    :frequency,
                    :interval_months,
                    :criticality_tier,
                    :estimated_duration_hours,
                    :last_performed_date,
                    :next_due_date,
                    :grace_period_days,
                    :service_provider_type,
                    :vendor_or_contractor_name,
                    :contact_phone_or_email,
                    :assigned_engineer_staff_id,
                    :assigned_engineer_name,
                    :task_checklist_json,
                    :safety_standards_reference,
                    :status,
                    :is_auto_generate_work_order,
                    :notes
                )
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'schedule_code'              => $scheduleCode,
                'asset_id'                   => (int)$data['asset_id'],
                'title'                      => trim($data['title']),
                'maintenance_type'           => $data['maintenance_type'] ?? 'preventive_maintenance',
                'frequency'                  => $frequency,
                'interval_months'            => $intervalMonths,
                'criticality_tier'           => $data['criticality_tier'] ?? 'life_critical',
                'estimated_duration_hours'   => (float)($data['estimated_duration_hours'] ?? 2.0),
                'last_performed_date'        => !empty($data['last_performed_date']) ? $data['last_performed_date'] : null,
                'next_due_date'              => $data['next_due_date'],
                'grace_period_days'          => (int)($data['grace_period_days'] ?? 14),
                'service_provider_type'      => $data['service_provider_type'] ?? 'in_house_biomed',
                'vendor_or_contractor_name'  => $data['vendor_or_contractor_name'] ?? 'In-House Biomedical Engineering',
                'contact_phone_or_email'     => $data['contact_phone_or_email'] ?? null,
                'assigned_engineer_staff_id' => !empty($data['assigned_engineer_staff_id']) ? (int)$data['assigned_engineer_staff_id'] : null,
                'assigned_engineer_name'     => $data['assigned_engineer_name'] ?? 'Engr. David Santos, CBET',
                'task_checklist_json'        => $checklistJson,
                'safety_standards_reference' => $data['safety_standards_reference'] ?? 'IEC 62353 / NFPA 99 / AAMI',
                'status'                     => $data['status'] ?? 'active',
                'is_auto_generate_work_order'=> isset($data['is_auto_generate_work_order']) ? (int)(bool)$data['is_auto_generate_work_order'] : 1,
                'notes'                      => $data['notes'] ?? null,
            ]);

            $newId = (int)$pdo->lastInsertId();

            // Auto-generate initial work order if requested
            if (!empty($data['is_auto_generate_work_order'])) {
                $this->spawnWorkOrderFromSchedule($pdo, $newId, $data['next_due_date'], $data['title']);
            }

            $pdo->commit();

            AuditLogger::log('create', 'biomed_maintenance_schedules', $newId, null, [
                'schedule_code' => $scheduleCode,
                'asset_tag' => $asset['asset_tag'],
                'title' => $data['title'],
                'next_due_date' => $data['next_due_date']
            ]);

            return [
                'success' => true,
                'message' => "Preventive Maintenance schedule {$scheduleCode} created successfully.",
                'data'    => $this->getSchedule($newId)
            ];
        } catch (Throwable $e) {
            $pdo->rollBack();
            return ['success' => false, 'message' => 'Failed to create PM schedule: ' . $e->getMessage()];
        }
    }

    /**
     * Update an existing PM schedule.
     */
    public function updateSchedule(int $id, array $data, int $userId): array
    {
        $pdo = Database::connection();

        $existing = $this->getSchedule($id);
        if (!$existing) {
            return ['success' => false, 'message' => 'PM schedule not found.'];
        }

        $frequency = $data['frequency'] ?? $existing['frequency'];
        $intervalMonths = match ($frequency) {
            'monthly'     => 1,
            'bi_monthly'  => 2,
            'quarterly'   => 3,
            'semi_annual' => 6,
            'annual'      => 12,
            'biennial'    => 24,
            default       => (int)($existing['interval_months'] ?? 12)
        };

        $checklistJson = isset($data['task_checklist'])
            ? json_encode($data['task_checklist'], JSON_UNESCAPED_UNICODE)
            : $existing['task_checklist_json'];

        $sql = "
            UPDATE biomed_maintenance_schedules SET
                title = :title,
                maintenance_type = :maintenance_type,
                frequency = :frequency,
                interval_months = :interval_months,
                criticality_tier = :criticality_tier,
                estimated_duration_hours = :estimated_duration_hours,
                last_performed_date = :last_performed_date,
                next_due_date = :next_due_date,
                grace_period_days = :grace_period_days,
                service_provider_type = :service_provider_type,
                vendor_or_contractor_name = :vendor_or_contractor_name,
                contact_phone_or_email = :contact_phone_or_email,
                assigned_engineer_name = :assigned_engineer_name,
                task_checklist_json = :task_checklist_json,
                safety_standards_reference = :safety_standards_reference,
                status = :status,
                is_auto_generate_work_order = :is_auto_generate_work_order,
                notes = :notes
            WHERE id = :id
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'title'                      => trim($data['title'] ?? $existing['title']),
            'maintenance_type'           => $data['maintenance_type'] ?? $existing['maintenance_type'],
            'frequency'                  => $frequency,
            'interval_months'            => $intervalMonths,
            'criticality_tier'           => $data['criticality_tier'] ?? $existing['criticality_tier'],
            'estimated_duration_hours'   => (float)($data['estimated_duration_hours'] ?? $existing['estimated_duration_hours']),
            'last_performed_date'        => !empty($data['last_performed_date']) ? $data['last_performed_date'] : $existing['last_performed_date'],
            'next_due_date'              => $data['next_due_date'] ?? $existing['next_due_date'],
            'grace_period_days'          => (int)($data['grace_period_days'] ?? $existing['grace_period_days']),
            'service_provider_type'      => $data['service_provider_type'] ?? $existing['service_provider_type'],
            'vendor_or_contractor_name'  => $data['vendor_or_contractor_name'] ?? $existing['vendor_or_contractor_name'],
            'contact_phone_or_email'     => $data['contact_phone_or_email'] ?? $existing['contact_phone_or_email'],
            'assigned_engineer_name'     => $data['assigned_engineer_name'] ?? $existing['assigned_engineer_name'],
            'task_checklist_json'        => $checklistJson,
            'safety_standards_reference' => $data['safety_standards_reference'] ?? $existing['safety_standards_reference'],
            'status'                     => $data['status'] ?? $existing['status'],
            'is_auto_generate_work_order'=> isset($data['is_auto_generate_work_order']) ? (int)(bool)$data['is_auto_generate_work_order'] : (int)$existing['is_auto_generate_work_order'],
            'notes'                      => $data['notes'] ?? $existing['notes'],
            'id'                         => $id
        ]);

        AuditLogger::log('update', 'biomed_maintenance_schedules', $id, $existing, $data);

        return [
            'success' => true,
            'message' => "PM Schedule {$existing['schedule_code']} updated successfully.",
            'data'    => $this->getSchedule($id)
        ];
    }

    /**
     * Delete or retire a PM schedule.
     */
    public function deleteSchedule(int $id, int $userId): array
    {
        $pdo = Database::connection();
        $existing = $this->getSchedule($id);
        if (!$existing) {
            return ['success' => false, 'message' => 'PM schedule not found.'];
        }

        $stmt = $pdo->prepare("DELETE FROM biomed_maintenance_schedules WHERE id = ?");
        $stmt->execute([$id]);

        AuditLogger::log('delete', 'biomed_maintenance_schedules', $id, $existing, null);

        return ['success' => true, 'message' => "PM schedule {$existing['schedule_code']} deleted successfully."];
    }

    /**
     * Get PM Calendar events formatted for calendar rendering.
     */
    public function getPMCalendarEvents(?int $year = null, ?int $month = null): array
    {
        $pdo = Database::connection();

        $sql = "
            SELECT
                s.id,
                s.schedule_code,
                s.title,
                s.maintenance_type,
                s.frequency,
                s.criticality_tier,
                s.estimated_duration_hours,
                s.next_due_date,
                s.last_performed_date,
                s.assigned_engineer_name,
                s.vendor_or_contractor_name,
                s.status,
                e.id AS asset_id,
                e.asset_tag,
                e.name AS equipment_name,
                e.model_number,
                e.category AS equipment_category,
                d.name AS department_name,
                w.ward_name,
                DATEDIFF(s.next_due_date, CURDATE()) AS days_until_due
            FROM biomed_maintenance_schedules s
            INNER JOIN hospital_equipment_assets e ON e.id = s.asset_id
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN hospital_wards w ON w.id = e.ward_id
            WHERE s.status = 'active'
        ";

        $params = [];
        if ($year && $month) {
            $sql .= " AND YEAR(s.next_due_date) = :year AND MONTH(s.next_due_date) = :month";
            $params['year'] = $year;
            $params['month'] = $month;
        }

        $sql .= " ORDER BY s.next_due_date ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Also fetch scheduled work orders
        $woSql = "
            SELECT
                w.id,
                w.work_order_number,
                w.ticket_number,
                w.work_order_type,
                w.priority,
                w.scheduled_date,
                w.lead_engineer_name,
                w.status AS wo_status,
                e.asset_tag,
                e.name AS equipment_name
            FROM biomed_work_orders w
            INNER JOIN hospital_equipment_assets e ON e.id = w.asset_id
            WHERE 1=1
        ";
        $woParams = [];
        if ($year && $month) {
            $woSql .= " AND YEAR(w.scheduled_date) = :wo_year AND MONTH(w.scheduled_date) = :wo_month";
            $woParams['wo_year'] = $year;
            $woParams['wo_month'] = $month;
        }
        $woSql .= " ORDER BY w.scheduled_date ASC";

        $woStmt = $pdo->prepare($woSql);
        $woStmt->execute($woParams);
        $workOrders = $woStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'schedules'   => $schedules,
            'work_orders' => $workOrders
        ];
    }

    /**
     * List Biomedical Work Orders.
     */
    public function listWorkOrders(array $filters = []): array
    {
        $pdo = Database::connection();

        $sql = "
            SELECT
                wo.*,
                e.asset_tag,
                e.name AS equipment_name,
                e.category AS equipment_category,
                e.criticality_level AS equipment_criticality,
                e.serial_number,
                e.model_number,
                e.manufacturer,
                e.status AS equipment_status,
                s.schedule_code,
                s.title AS schedule_title,
                s.frequency AS schedule_frequency,
                d.name AS department_name,
                w.ward_name
            FROM biomed_work_orders wo
            INNER JOIN hospital_equipment_assets e ON e.id = wo.asset_id
            LEFT JOIN biomed_maintenance_schedules s ON s.id = wo.schedule_id
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN hospital_wards w ON w.id = e.ward_id
            WHERE 1=1
        ";

        $params = [];

        if (!empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';
            $sql .= " AND (
                wo.work_order_number LIKE :search_wo OR
                wo.ticket_number LIKE :search_tkt OR
                wo.lead_engineer_name LIKE :search_eng OR
                wo.reported_by_staff_name LIKE :search_rep OR
                wo.breakdown_symptom LIKE :search_symp OR
                e.asset_tag LIKE :search_tag OR
                e.name LIKE :search_name OR
                e.serial_number LIKE :search_sn OR
                e.model_number LIKE :search_model
            )";
            $params['search_wo'] = $term;
            $params['search_tkt'] = $term;
            $params['search_eng'] = $term;
            $params['search_rep'] = $term;
            $params['search_symp'] = $term;
            $params['search_tag'] = $term;
            $params['search_name'] = $term;
            $params['search_sn'] = $term;
            $params['search_model'] = $term;
        }

        if (!empty($filters['status'])) {
            $sql .= " AND wo.status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['priority'])) {
            $sql .= " AND wo.priority = :priority";
            $params['priority'] = $filters['priority'];
        }

        if (!empty($filters['work_order_type'])) {
            $sql .= " AND wo.work_order_type = :wo_type";
            $params['wo_type'] = $filters['work_order_type'];
        }

        if (!empty($filters['asset_id'])) {
            $sql .= " AND wo.asset_id = :asset_id";
            $params['asset_id'] = (int)$filters['asset_id'];
        }

        if (!empty($filters['only_tickets'])) {
            $sql .= " AND wo.ticket_number IS NOT NULL";
        }

        $sql .= " ORDER BY 
            CASE 
                WHEN wo.priority = 'stat_life_critical' THEN 1 
                WHEN wo.priority = 'urgent' THEN 2 
                ELSE 3 
            END ASC,
            wo.scheduled_date DESC, wo.id DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['checklist_audit'] = !empty($row['checklist_audit_json']) ? json_decode($row['checklist_audit_json'], true) : [];
            $row['parts_replaced'] = !empty($row['parts_replaced_json']) ? json_decode($row['parts_replaced_json'], true) : [];
        }

        return $rows;
    }

    /**
     * Get single work order details.
     */
    public function getWorkOrder(int $id): ?array
    {
        $pdo = Database::connection();

        $sql = "
            SELECT
                wo.*,
                e.asset_tag,
                e.name AS equipment_name,
                e.category AS equipment_category,
                e.criticality_level AS equipment_criticality,
                e.serial_number,
                e.model_number,
                e.manufacturer,
                e.status AS equipment_status,
                e.status_reason AS equipment_status_reason,
                s.schedule_code,
                s.title AS schedule_title,
                s.frequency AS schedule_frequency,
                s.task_checklist_json AS schedule_checklist_template,
                d.name AS department_name,
                w.ward_name
            FROM biomed_work_orders wo
            INNER JOIN hospital_equipment_assets e ON e.id = wo.asset_id
            LEFT JOIN biomed_maintenance_schedules s ON s.id = wo.schedule_id
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN hospital_wards w ON w.id = e.ward_id
            WHERE wo.id = ?
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $row['checklist_audit'] = !empty($row['checklist_audit_json']) ? json_decode($row['checklist_audit_json'], true) : [];
        $row['parts_replaced'] = !empty($row['parts_replaced_json']) ? json_decode($row['parts_replaced_json'], true) : [];

        return $row;
    }

    /**
     * Spawn a work order from a PM schedule.
     */
    public function spawnWorkOrderFromSchedule(PDO $pdo, int $scheduleId, string $scheduledDate, ?string $notes = null): string
    {
        $scheduleStmt = $pdo->prepare("SELECT * FROM biomed_maintenance_schedules WHERE id = ?");
        $scheduleStmt->execute([$scheduleId]);
        $schedule = $scheduleStmt->fetch(PDO::FETCH_ASSOC);

        if (!$schedule) {
            throw new \Exception("Schedule ID {$scheduleId} not found");
        }

        $woNumber = $this->generateWorkOrderNumber($pdo);

        // Convert schedule task checklist to initial audit format
        $templateTasks = !empty($schedule['task_checklist_json']) ? json_decode($schedule['task_checklist_json'], true) : [];
        $initialAudit = [];
        if (is_array($templateTasks)) {
            foreach ($templateTasks as $t) {
                $initialAudit[] = [
                    'task_no'                => $t['task_no'] ?? 1,
                    'task_name'              => $t['task_name'] ?? '',
                    'standards_or_tolerance' => $t['standards_or_tolerance'] ?? '',
                    'is_critical'            => $t['is_critical'] ?? false,
                    'status'                 => 'pending',
                    'notes'                  => ''
                ];
            }
        }

        $priority = match ($schedule['criticality_tier']) {
            'life_critical' => 'stat_life_critical',
            'high'          => 'urgent',
            default         => 'scheduled_pm'
        };

        $sql = "
            INSERT INTO biomed_work_orders (
                work_order_number,
                schedule_id,
                asset_id,
                work_order_type,
                priority,
                scheduled_date,
                lead_engineer_name,
                service_vendor_name,
                checklist_audit_json,
                status,
                findings
            ) VALUES (
                :wo_no,
                :schedule_id,
                :asset_id,
                'preventive_maintenance',
                :priority,
                :scheduled_date,
                :engineer,
                :vendor,
                :checklist_json,
                'scheduled',
                :notes
            )
        ";

        $ins = $pdo->prepare($sql);
        $ins->execute([
            'wo_no'          => $woNumber,
            'schedule_id'    => $scheduleId,
            'asset_id'       => $schedule['asset_id'],
            'priority'       => $priority,
            'scheduled_date' => $scheduledDate,
            'engineer'       => $schedule['assigned_engineer_name'] ?? 'Engr. David Santos, CBET',
            'vendor'         => $schedule['vendor_or_contractor_name'],
            'checklist_json' => json_encode($initialAudit, JSON_UNESCAPED_UNICODE),
            'notes'          => $notes ?? "Triggered from PM Schedule {$schedule['schedule_code']}: {$schedule['title']}"
        ]);

        return $woNumber;
    }

    /**
     * Create Breakdown Ticket: Alerts Biomedical Engineering, logs symptom and clinical impact,
     * and AUTOMATICALLY flips machine status in hospital_equipment_assets to "Under Repair"
     * with clinical lockout reason so clinicians/nurses cannot assign it to a patient.
     */
    public function createBreakdownTicket(array $data, int $userId): array
    {
        $pdo = Database::connection();

        if (empty($data['asset_id'])) {
            return ['success' => false, 'message' => 'Target equipment asset is required.'];
        }
        if (empty($data['breakdown_symptom'])) {
            return ['success' => false, 'message' => 'Breakdown symptom or alarm description is required.'];
        }

        $assetStmt = $pdo->prepare("SELECT id, asset_tag, name, category, criticality_level, status FROM hospital_equipment_assets WHERE id = ?");
        $assetStmt->execute([(int)$data['asset_id']]);
        $asset = $assetStmt->fetch(PDO::FETCH_ASSOC);

        if (!$asset) {
            return ['success' => false, 'message' => 'Equipment asset not found.'];
        }

        // Map urgency priority:
        // 🔴 stat_life_critical ("Critical Life Support Down")
        // 🟠 urgent ("High Priority")
        // 🟡 routine ("Routine")
        $priority = $data['priority'] ?? 'urgent';
        if (!in_array($priority, ['stat_life_critical', 'urgent', 'routine'])) {
            $priority = ($asset['criticality_level'] === 'Life Critical') ? 'stat_life_critical' : 'urgent';
        }

        $pdo->beginTransaction();
        try {
            $ticketNumber = $this->generateTicketNumber($pdo);
            $woNumber = $this->generateWorkOrderNumber($pdo);
            $reportedAt = !empty($data['reported_at']) ? $data['reported_at'] : date('Y-m-d H:i:s');
            $scheduledDate = date('Y-m-d', strtotime($reportedAt));

            $reportedBy = trim($data['reported_by_staff_name'] ?? 'Clinical Staff');
            $role = trim($data['reported_by_role'] ?? 'Nurse');
            $dept = trim($data['reporting_ward_or_dept'] ?? 'Clinical Unit');
            $symptom = trim($data['breakdown_symptom']);
            $clinicalImpact = trim($data['clinical_impact'] ?? '');
            $engineer = trim($data['lead_engineer_name'] ?? 'Engr. David Santos, CBET (Biomedical Lead)');

            // 1. Insert Breakdown Work Order
            $sqlWo = "
                INSERT INTO biomed_work_orders (
                    work_order_number,
                    ticket_number,
                    asset_id,
                    work_order_type,
                    priority,
                    scheduled_date,
                    started_at,
                    lead_engineer_name,
                    service_vendor_name,
                    reported_by_staff_name,
                    reported_by_role,
                    reporting_ward_or_dept,
                    reported_at,
                    breakdown_symptom,
                    clinical_impact,
                    electrical_safety_passed,
                    calibration_passed,
                    findings,
                    status
                ) VALUES (
                    :wo_no,
                    :ticket_no,
                    :asset_id,
                    'breakdown_emergency_repair',
                    :priority,
                    :scheduled_date,
                    NOW(),
                    :lead_engineer,
                    'In-House Biomedical Engineering Bay',
                    :reported_by,
                    :reported_role,
                    :reporting_dept,
                    :reported_at,
                    :symptom,
                    :clinical_impact,
                    0,
                    0,
                    :findings,
                    'in_progress'
                )
            ";

            $stmtWo = $pdo->prepare($sqlWo);
            $stmtWo->execute([
                'wo_no'           => $woNumber,
                'ticket_no'       => $ticketNumber,
                'asset_id'        => $asset['id'],
                'priority'        => $priority,
                'scheduled_date'  => $scheduledDate,
                'lead_engineer'   => $engineer,
                'reported_by'     => $reportedBy,
                'reported_role'   => $role,
                'reporting_dept'  => $dept,
                'reported_at'     => $reportedAt,
                'symptom'         => $symptom,
                'clinical_impact' => $clinicalImpact,
                'findings'        => "Emergency Breakdown Ticket logged by {$reportedBy} ({$role}) at {$dept}: {$symptom}"
            ]);

            $newWoId = (int)$pdo->lastInsertId();

            // 2. AUTOMATICALLY FLIP MACHINE STATUS TO "Under Repair" (CLINICAL LOCKOUT)
            $lockoutReason = "CLINICAL LOCKOUT: Active Breakdown Ticket {$ticketNumber} ({$symptom}) - Reported by {$reportedBy}";
            $updAsset = $pdo->prepare("
                UPDATE hospital_equipment_assets
                SET status = 'Under Repair',
                    status_reason = ?
                WHERE id = ?
            ");
            $updAsset->execute([$lockoutReason, $asset['id']]);

            // 3. Log into equipment_maintenance_logs
            $logSql = "
                INSERT INTO equipment_maintenance_logs (
                    equipment_id,
                    log_type,
                    performed_by,
                    performed_date,
                    result_status,
                    findings,
                    actions_taken
                ) VALUES (
                    :eq_id,
                    'Repair',
                    :performed_by,
                    CURDATE(),
                    'Fail',
                    :findings,
                    :actions
                )
            ";
            $logStmt = $pdo->prepare($logSql);
            $logStmt->execute([
                'eq_id'        => $asset['id'],
                'performed_by' => "{$reportedBy} ({$role})",
                'findings'     => "Breakdown Alert: {$symptom}. Clinical Impact: {$clinicalImpact}",
                'actions'      => "Machine automatically locked out to 'Under Repair'. Dispatched Work Order {$woNumber} to {$engineer}."
            ]);

            $pdo->commit();

            AuditLogger::log(
                AuditLogger::CATEGORY_CLINICAL,
                'BREAKDOWN_TICKET_CREATED',
                "Breakdown Ticket {$ticketNumber} created for {$asset['asset_tag']}: {$symptom}",
                null,
                $userId
            );

            return [
                'success' => true,
                'message' => "Breakdown Ticket {$ticketNumber} created. Machine {$asset['asset_tag']} locked out to Under Repair.",
                'data'    => $this->getWorkOrder($newWoId)
            ];
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return ['success' => false, 'message' => 'Failed to create breakdown ticket: ' . $e->getMessage()];
        }
    }

    /**
     * Resolve Breakdown Ticket: Logs root-cause diagnostics, spare parts replaced,
     * labor hours, electrical safety testing, and supervisor signoff.
     * When completed and verified with electrical safety/calibration pass,
     * automatically clears the clinical lockout and flips machine back to "Operational".
     */
    public function resolveBreakdownTicket(int $id, array $data, int $userId): array
    {
        $pdo = Database::connection();

        $existing = $this->getWorkOrder($id);
        if (!$existing) {
            return ['success' => false, 'message' => 'Breakdown ticket/work order not found.'];
        }

        $newStatus = $data['status'] ?? 'completed_passed';
        $completedAt = !empty($data['completed_at']) ? $data['completed_at'] : date('Y-m-d H:i:s');

        // Calculate downtime hours if reported_at is present
        $downtimeHours = isset($data['downtime_hours']) ? (float)$data['downtime_hours'] : 0.0;
        if ($downtimeHours <= 0 && !empty($existing['reported_at'])) {
            $diffSeconds = strtotime($completedAt) - strtotime($existing['reported_at']);
            $downtimeHours = round(max(0, $diffSeconds / 3600), 2);
        }

        $partsJson = isset($data['parts_replaced'])
            ? json_encode($data['parts_replaced'], JSON_UNESCAPED_UNICODE)
            : $existing['parts_replaced_json'];

        $elecPass = isset($data['electrical_safety_passed']) ? (int)(bool)$data['electrical_safety_passed'] : 1;
        $calibPass = isset($data['calibration_passed']) ? (int)(bool)$data['calibration_passed'] : 1;

        $pdo->beginTransaction();
        try {
            $sql = "
                UPDATE biomed_work_orders SET
                    status = :status,
                    completed_at = :completed_at,
                    lead_engineer_name = :lead_engineer_name,
                    root_cause_diagnostics = :root_cause_diagnostics,
                    corrective_actions = :corrective_actions,
                    findings = :findings,
                    parts_replaced_json = :parts_replaced_json,
                    labor_hours = :labor_hours,
                    downtime_hours = :downtime_hours,
                    total_cost = :total_cost,
                    chassis_leakage_microamp = :chassis_leakage_microamp,
                    ground_resistance_ohms = :ground_resistance_ohms,
                    electrical_safety_passed = :electrical_safety_passed,
                    calibration_passed = :calibration_passed,
                    supervisor_signoff_by = :supervisor_signoff_by,
                    supervisor_signed_at = :supervisor_signed_at
                WHERE id = :id
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'status'                 => $newStatus,
                'completed_at'           => ($newStatus === 'completed_passed') ? $completedAt : null,
                'lead_engineer_name'     => $data['lead_engineer_name'] ?? $existing['lead_engineer_name'],
                'root_cause_diagnostics' => $data['root_cause_diagnostics'] ?? $existing['root_cause_diagnostics'],
                'corrective_actions'     => $data['corrective_actions'] ?? $existing['corrective_actions'],
                'findings'               => $data['findings'] ?? $existing['findings'],
                'parts_replaced_json'    => $partsJson,
                'labor_hours'            => isset($data['labor_hours']) ? (float)$data['labor_hours'] : (float)$existing['labor_hours'],
                'downtime_hours'         => $downtimeHours,
                'total_cost'             => isset($data['total_cost']) ? (float)$data['total_cost'] : (float)$existing['total_cost'],
                'chassis_leakage_microamp' => isset($data['chassis_leakage_microamp']) ? (float)$data['chassis_leakage_microamp'] : $existing['chassis_leakage_microamp'],
                'ground_resistance_ohms' => isset($data['ground_resistance_ohms']) ? (float)$data['ground_resistance_ohms'] : $existing['ground_resistance_ohms'],
                'electrical_safety_passed' => $elecPass,
                'calibration_passed'     => $calibPass,
                'supervisor_signoff_by'  => $data['supervisor_signoff_by'] ?? $existing['supervisor_signoff_by'],
                'supervisor_signed_at'   => !empty($data['supervisor_signoff_by']) ? date('Y-m-d H:i:s') : $existing['supervisor_signed_at'],
                'id'                     => $id
            ]);

            // If repairs passed electrical safety & calibration, CLEAR CLINICAL LOCKOUT!
            if ($newStatus === 'completed_passed' && $elecPass === 1 && $calibPass === 1) {
                $compDate = date('Y-m-d', strtotime($completedAt));
                $calibDue = date('Y-m-d', strtotime("+12 months", strtotime($compDate)));

                $updAsset = $pdo->prepare("
                    UPDATE hospital_equipment_assets
                    SET status = 'Operational',
                        status_reason = NULL,
                        last_calibration_date = ?,
                        next_calibration_due = ?
                    WHERE id = ?
                ");
                $updAsset->execute([$compDate, $calibDue, $existing['asset_id']]);

                // Record maintenance pass log
                $logSql = "
                    INSERT INTO equipment_maintenance_logs (
                        equipment_id,
                        log_type,
                        performed_by,
                        performed_date,
                        result_status,
                        cost,
                        findings,
                        actions_taken
                    ) VALUES (
                        :eq_id,
                        'Repair',
                        :performed_by,
                        :perf_date,
                        'Pass',
                        :cost,
                        :findings,
                        :actions
                    )
                ";
                $logStmt = $pdo->prepare($logSql);
                $logStmt->execute([
                    'eq_id'        => $existing['asset_id'],
                    'performed_by' => $data['lead_engineer_name'] ?? $existing['lead_engineer_name'],
                    'perf_date'    => $compDate,
                    'cost'         => (float)($data['total_cost'] ?? $existing['total_cost']),
                    'findings'     => "Repair Completed: " . ($data['root_cause_diagnostics'] ?? $existing['root_cause_diagnostics']),
                    'actions'      => "Parts replaced, IEC 62353 safety analyzer test passed. Machine released back to Operational service."
                ]);
            } elseif ($newStatus === 'failed_quarantined' || $elecPass === 0 || $calibPass === 0) {
                // If electrical safety or calibration failed, KEEP QUARANTINED!
                $updAsset = $pdo->prepare("
                    UPDATE hospital_equipment_assets
                    SET status = 'Needs Calibration',
                        status_reason = 'QUARANTINE TAG: Failed post-repair electrical safety or calibration verification.'
                    WHERE id = ?
                ");
                $updAsset->execute([$existing['asset_id']]);
            }

            $pdo->commit();

            AuditLogger::log(
                AuditLogger::CATEGORY_CLINICAL,
                'BREAKDOWN_TICKET_RESOLVED',
                "Breakdown Ticket {$existing['work_order_number']} resolved for {$existing['asset_tag']}. Status: {$newStatus}",
                null,
                $userId
            );

            return [
                'success' => true,
                'message' => "Breakdown ticket {$existing['work_order_number']} updated successfully. Equipment status synchronized.",
                'data'    => $this->getWorkOrder($id)
            ];
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return ['success' => false, 'message' => 'Failed to resolve breakdown ticket: ' . $e->getMessage()];
        }
    }

    /**
     * Create Work Order manually or ad-hoc.
     */
    public function createWorkOrder(array $data, int $userId): array
    {
        $pdo = Database::connection();

        if (empty($data['asset_id'])) {
            return ['success' => false, 'message' => 'Equipment asset is required.'];
        }
        if (empty($data['scheduled_date'])) {
            return ['success' => false, 'message' => 'Scheduled date is required.'];
        }

        $woNumber = $this->generateWorkOrderNumber($pdo);

        $checklistAuditJson = isset($data['checklist_audit'])
            ? json_encode($data['checklist_audit'], JSON_UNESCAPED_UNICODE)
            : null;

        $partsJson = isset($data['parts_replaced'])
            ? json_encode($data['parts_replaced'], JSON_UNESCAPED_UNICODE)
            : null;

        $sql = "
            INSERT INTO biomed_work_orders (
                work_order_number,
                schedule_id,
                asset_id,
                work_order_type,
                priority,
                scheduled_date,
                lead_engineer_name,
                service_vendor_name,
                checklist_audit_json,
                electrical_safety_passed,
                calibration_passed,
                chassis_leakage_microamp,
                ground_resistance_ohms,
                parts_replaced_json,
                labor_hours,
                total_cost,
                findings,
                corrective_actions,
                status
            ) VALUES (
                :wo_no,
                :schedule_id,
                :asset_id,
                :work_order_type,
                :priority,
                :scheduled_date,
                :lead_engineer_name,
                :service_vendor_name,
                :checklist_audit_json,
                :electrical_safety_passed,
                :calibration_passed,
                :chassis_leakage_microamp,
                :ground_resistance_ohms,
                :parts_replaced_json,
                :labor_hours,
                :total_cost,
                :findings,
                :corrective_actions,
                :status
            )
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            'wo_no'                    => $woNumber,
            'schedule_id'              => !empty($data['schedule_id']) ? (int)$data['schedule_id'] : null,
            'asset_id'                 => (int)$data['asset_id'],
            'work_order_type'          => $data['work_order_type'] ?? 'preventive_maintenance',
            'priority'                 => $data['priority'] ?? 'routine',
            'scheduled_date'           => $data['scheduled_date'],
            'lead_engineer_name'       => $data['lead_engineer_name'] ?? 'Engr. David Santos, CBET',
            'service_vendor_name'      => $data['service_vendor_name'] ?? null,
            'checklist_audit_json'     => $checklistAuditJson,
            'electrical_safety_passed' => isset($data['electrical_safety_passed']) ? (int)(bool)$data['electrical_safety_passed'] : 1,
            'calibration_passed'       => isset($data['calibration_passed']) ? (int)(bool)$data['calibration_passed'] : 1,
            'chassis_leakage_microamp' => !empty($data['chassis_leakage_microamp']) ? (float)$data['chassis_leakage_microamp'] : null,
            'ground_resistance_ohms'   => !empty($data['ground_resistance_ohms']) ? (float)$data['ground_resistance_ohms'] : null,
            'parts_replaced_json'      => $partsJson,
            'labor_hours'              => (float)($data['labor_hours'] ?? 0.0),
            'total_cost'               => (float)($data['total_cost'] ?? 0.0),
            'findings'                 => $data['findings'] ?? null,
            'corrective_actions'       => $data['corrective_actions'] ?? null,
            'status'                   => $data['status'] ?? 'scheduled',
        ]);

        $newId = (int)$pdo->lastInsertId();

        AuditLogger::log('create', 'biomed_work_orders', $newId, null, [
            'work_order_number' => $woNumber,
            'asset_id' => $data['asset_id']
        ]);

        return [
            'success' => true,
            'message' => "Work order {$woNumber} created successfully.",
            'data'    => $this->getWorkOrder($newId)
        ];
    }

    /**
     * Update Work Order, including completing, passing calibration, and updating asset lifecycle.
     */
    public function updateWorkOrder(int $id, array $data, int $userId): array
    {
        // If this work order is a breakdown ticket, route to resolveBreakdownTicket for specialized handling
        if (!empty($data['is_breakdown']) || !empty($data['root_cause_diagnostics']) || !empty($data['ticket_number'])) {
            return $this->resolveBreakdownTicket($id, $data, $userId);
        }

        $pdo = Database::connection();

        $existing = $this->getWorkOrder($id);
        if (!$existing) {
            return ['success' => false, 'message' => 'Work order not found.'];
        }

        $newStatus = $data['status'] ?? $existing['status'];
        $completedAt = $existing['completed_at'];

        if ($newStatus === 'completed_passed' && empty($completedAt)) {
            $completedAt = date('Y-m-d H:i:s');
        }

        $checklistAuditJson = isset($data['checklist_audit'])
            ? json_encode($data['checklist_audit'], JSON_UNESCAPED_UNICODE)
            : $existing['checklist_audit_json'];

        $partsJson = isset($data['parts_replaced'])
            ? json_encode($data['parts_replaced'], JSON_UNESCAPED_UNICODE)
            : $existing['parts_replaced_json'];

        $pdo->beginTransaction();
        try {
            $sql = "
                UPDATE biomed_work_orders SET
                    status = :status,
                    started_at = :started_at,
                    completed_at = :completed_at,
                    lead_engineer_name = :lead_engineer_name,
                    service_vendor_name = :service_vendor_name,
                    checklist_audit_json = :checklist_audit_json,
                    electrical_safety_passed = :electrical_safety_passed,
                    calibration_passed = :calibration_passed,
                    chassis_leakage_microamp = :chassis_leakage_microamp,
                    ground_resistance_ohms = :ground_resistance_ohms,
                    parts_replaced_json = :parts_replaced_json,
                    labor_hours = :labor_hours,
                    total_cost = :total_cost,
                    findings = :findings,
                    corrective_actions = :corrective_actions,
                    supervisor_signoff_by = :supervisor_signoff_by,
                    supervisor_signed_at = :supervisor_signed_at
                WHERE id = :id
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                'status'                   => $newStatus,
                'started_at'               => $data['started_at'] ?? $existing['started_at'],
                'completed_at'             => $completedAt,
                'lead_engineer_name'       => $data['lead_engineer_name'] ?? $existing['lead_engineer_name'],
                'service_vendor_name'      => $data['service_vendor_name'] ?? $existing['service_vendor_name'],
                'checklist_audit_json'     => $checklistAuditJson,
                'electrical_safety_passed' => isset($data['electrical_safety_passed']) ? (int)(bool)$data['electrical_safety_passed'] : (int)$existing['electrical_safety_passed'],
                'calibration_passed'       => isset($data['calibration_passed']) ? (int)(bool)$data['calibration_passed'] : (int)$existing['calibration_passed'],
                'chassis_leakage_microamp' => isset($data['chassis_leakage_microamp']) ? (float)$data['chassis_leakage_microamp'] : $existing['chassis_leakage_microamp'],
                'ground_resistance_ohms'   => isset($data['ground_resistance_ohms']) ? (float)$data['ground_resistance_ohms'] : $existing['ground_resistance_ohms'],
                'parts_replaced_json'      => $partsJson,
                'labor_hours'              => isset($data['labor_hours']) ? (float)$data['labor_hours'] : (float)$existing['labor_hours'],
                'total_cost'               => isset($data['total_cost']) ? (float)$data['total_cost'] : (float)$existing['total_cost'],
                'findings'                 => $data['findings'] ?? $existing['findings'],
                'corrective_actions'       => $data['corrective_actions'] ?? $existing['corrective_actions'],
                'supervisor_signoff_by'    => $data['supervisor_signoff_by'] ?? $existing['supervisor_signoff_by'],
                'supervisor_signed_at'     => !empty($data['supervisor_signoff_by']) && empty($existing['supervisor_signed_at']) ? date('Y-m-d H:i:s') : $existing['supervisor_signed_at'],
                'id'                       => $id
            ]);

            // If work order completed with pass, advance PM schedule and equipment calibration dates
            if ($newStatus === 'completed_passed') {
                $compDate = date('Y-m-d', strtotime($completedAt));

                // 1. Advance Schedule if linked
                if (!empty($existing['schedule_id'])) {
                    $schStmt = $pdo->prepare("SELECT interval_months FROM biomed_maintenance_schedules WHERE id = ?");
                    $schStmt->execute([$existing['schedule_id']]);
                    $intervalMonths = (int)$schStmt->fetchColumn() ?: 12;

                    $nextDue = date('Y-m-d', strtotime("+{$intervalMonths} months", strtotime($compDate)));

                    $updSch = $pdo->prepare("
                        UPDATE biomed_maintenance_schedules
                        SET last_performed_date = ?, next_due_date = ?
                        WHERE id = ?
                    ");
                    $updSch->execute([$compDate, $nextDue, $existing['schedule_id']]);
                }

                // 2. Update equipment asset calibration & status
                $calibDue = date('Y-m-d', strtotime("+12 months", strtotime($compDate)));
                $updAsset = $pdo->prepare("
                    UPDATE hospital_equipment_assets
                    SET last_calibration_date = ?,
                        next_calibration_due = ?,
                        status = 'Operational',
                        status_reason = NULL
                    WHERE id = ?
                ");
                $updAsset->execute([$compDate, $calibDue, $existing['asset_id']]);
            } elseif ($newStatus === 'failed_quarantined') {
                // If failed safety/calibration, quarantine the equipment immediately!
                $updAsset = $pdo->prepare("
                    UPDATE hospital_equipment_assets
                    SET status = 'Needs Calibration',
                        status_reason = 'Failed Biomedical Safety/Calibration Inspection. Tagged Out.'
                    WHERE id = ?
                ");
                $updAsset->execute([$existing['asset_id']]);
            }

            $pdo->commit();

            AuditLogger::log(
                AuditLogger::CATEGORY_CLINICAL,
                'WORK_ORDER_COMPLETED',
                "Work Order {$existing['work_order_number']} completed for {$existing['asset_tag']}. Status: {$newStatus}",
                null,
                $userId
            );

            return [
                'success' => true,
                'message' => "Work order {$existing['work_order_number']} updated successfully.",
                'data'    => $this->getWorkOrder($id)
            ];
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            return ['success' => false, 'message' => 'Failed to update work order: ' . $e->getMessage()];
        }
    }
}
