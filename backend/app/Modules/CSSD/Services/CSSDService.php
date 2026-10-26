<?php

namespace App\Modules\CSSD\Services;

use App\Core\Database;
use PDO;
use Throwable;

class CSSDService
{
    /**
     * Generate Sequential Physical Tray Barcode: TRAY-YYYY-0001
     */
    public static function generateTrayBarcode(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
            VALUES ('CSSD_TRAY', ?, 1)
            ON DUPLICATE KEY UPDATE `last_number` = `last_number` + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("
            SELECT `last_number` FROM `billing_tariff_counters`
            WHERE `counter_type` = 'CSSD_TRAY' AND `year` = ?
        ");
        $sel->execute([$year]);
        $num = (int)$sel->fetchColumn();

        return sprintf("TRAY-%d-%04d", $year, $num);
    }

    /**
     * Generate Sequential Sterilization Batch Number: BATCH-YYYY-0001
     */
    public static function generateBatchNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
            VALUES ('CSSD_BATCH', ?, 1)
            ON DUPLICATE KEY UPDATE `last_number` = `last_number` + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("
            SELECT `last_number` FROM `billing_tariff_counters`
            WHERE `counter_type` = 'CSSD_BATCH' AND `year` = ?
        ");
        $sel->execute([$year]);
        $num = (int)$sel->fetchColumn();

        return sprintf("BATCH-%d-%04d", $year, $num);
    }

    /**
     * Generate Sequential OT Dispatch Number: DISP-YYYY-0001
     */
    public static function generateDispatchNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
            VALUES ('CSSD_DISPATCH', ?, 1)
            ON DUPLICATE KEY UPDATE `last_number` = `last_number` + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("
            SELECT `last_number` FROM `billing_tariff_counters`
            WHERE `counter_type` = 'CSSD_DISPATCH' AND `year` = ?
        ");
        $sel->execute([$year]);
        $num = (int)$sel->fetchColumn();

        return sprintf("DISP-%d-%04d", $year, $num);
    }

    /**
     * Generate Sequential Tray Return Number: RET-YYYY-0001
     */
    public static function generateReturnNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
            VALUES ('CSSD_RETURN', ?, 1)
            ON DUPLICATE KEY UPDATE `last_number` = `last_number` + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("
            SELECT `last_number` FROM `billing_tariff_counters`
            WHERE `counter_type` = 'CSSD_RETURN' AND `year` = ?
        ");
        $sel->execute([$year]);
        $num = (int)$sel->fetchColumn();

        return sprintf("RET-%d-%04d", $year, $num);
    }

    /**
     * Generate Sequential Missing Instrument Incident Number: INC-YYYY-0001
     */
    public static function generateIncidentNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
            VALUES ('CSSD_INCIDENT', ?, 1)
            ON DUPLICATE KEY UPDATE `last_number` = `last_number` + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("
            SELECT `last_number` FROM `billing_tariff_counters`
            WHERE `counter_type` = 'CSSD_INCIDENT' AND `year` = ?
        ");
        $sel->execute([$year]);
        $num = (int)$sel->fetchColumn();

        return sprintf("INC-%d-%04d", $year, $num);
    }

    /**
     * Executive Overview & Instrument Sterilization KPIs
     */
    public function getExecutiveMetrics(): array
    {
        $pdo = Database::connection();

        // Physical Tray Status Breakdown
        $sql = "
            SELECT
                COUNT(*) as total_trays,
                SUM(CASE WHEN current_status = 'sterile_stored' THEN 1 ELSE 0 END) as sterile_ready_count,
                SUM(CASE WHEN current_status IN ('dispatched_surgery', 'in_surgery') THEN 1 ELSE 0 END) as active_surgery_count,
                SUM(CASE WHEN current_status IN ('dirty_received', 'decontaminating', 'assembled_wrapped', 'sterilizing') THEN 1 ELSE 0 END) as processing_count,
                SUM(CASE WHEN current_status IN ('quarantined_missing_item', 'maintenance_repair') THEN 1 ELSE 0 END) as quarantined_count,
                SUM(CASE WHEN sterile_expiry_date IS NOT NULL AND sterile_expiry_date < CURRENT_DATE AND current_status = 'sterile_stored' THEN 1 ELSE 0 END) as expired_sterile_count,
                SUM(total_sterilization_cycles) as total_cycles_run
            FROM `cssd_physical_trays`
        ";
        $m = $pdo->query($sql)->fetch(PDO::FETCH_ASSOC) ?: [];

        $totalMasterTrays = (int)$pdo->query("SELECT COUNT(*) FROM `cssd_master_trays` WHERE status = 'active'")->fetchColumn();
        $totalManifestInstruments = (int)$pdo->query("SELECT SUM(quantity_required) FROM `cssd_master_tray_items`")->fetchColumn();

        // Autoclave Batch Breakdown
        $batchSql = "
            SELECT
                COUNT(*) as total_batches,
                SUM(CASE WHEN batch_status = 'released_sterile' THEN 1 ELSE 0 END) as released_batches_count,
                SUM(CASE WHEN batch_status = 'cycle_passed_quarantined_bi' THEN 1 ELSE 0 END) as incubating_batches_count,
                SUM(CASE WHEN batch_status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_batches_count,
                SUM(CASE WHEN batch_status = 'batch_failed_quarantined' THEN 1 ELSE 0 END) as failed_batches_count
            FROM `cssd_sterilization_batches`
        ";
        $b = $pdo->query($batchSql)->fetch(PDO::FETCH_ASSOC) ?: [];

        // Machines Overview
        $machSql = "
            SELECT
                COUNT(*) as total_machines,
                SUM(CASE WHEN status IN ('ready', 'in_cycle') THEN 1 ELSE 0 END) as active_machines,
                SUM(CASE WHEN daily_bowie_dick_passed = 1 THEN 1 ELSE 0 END) as bowie_dick_passed_count
            FROM `cssd_sterilizer_machines`
        ";
        $mac = $pdo->query($machSql)->fetch(PDO::FETCH_ASSOC) ?: [];

        // Specialty Breakdown
        $specSql = "
            SELECT
                mt.department_specialty,
                COUNT(pt.id) as physical_tray_count,
                SUM(CASE WHEN pt.current_status = 'sterile_stored' THEN 1 ELSE 0 END) as sterile_count
            FROM `cssd_master_trays` mt
            LEFT JOIN `cssd_physical_trays` pt ON mt.id = pt.master_tray_id
            GROUP BY mt.department_specialty
            ORDER BY physical_tray_count DESC
        ";
        $specialties = $pdo->query($specSql)->fetchAll(PDO::FETCH_ASSOC);

        // OT Distribution & Missing Instrument Metrics
        $dispSql = "
            SELECT
                COUNT(*) as total_dispatches,
                SUM(CASE WHEN dispatch_status IN ('dispatched_in_transit', 'received_in_or', 'in_surgery') THEN 1 ELSE 0 END) as active_dispatches,
                SUM(CASE WHEN DATE(dispatched_at) = CURRENT_DATE THEN 1 ELSE 0 END) as dispatches_today
            FROM `cssd_ot_dispatches`
        ";
        $disp = $pdo->query($dispSql)->fetch(PDO::FETCH_ASSOC) ?: [];

        $retSql = "
            SELECT
                COUNT(*) as total_returns,
                SUM(CASE WHEN DATE(received_at) = CURRENT_DATE THEN 1 ELSE 0 END) as returns_today,
                SUM(CASE WHEN is_rsi_alert_triggered = 1 THEN 1 ELSE 0 END) as total_rsi_returns
            FROM `cssd_tray_return_reconciliations`
        ";
        $ret = $pdo->query($retSql)->fetch(PDO::FETCH_ASSOC) ?: [];

        $incSql = "
            SELECT
                COUNT(*) as total_incidents,
                SUM(CASE WHEN investigation_status NOT IN ('resolved_closed', 'found_in_or_linens') THEN 1 ELSE 0 END) as open_incidents_count,
                SUM(CASE WHEN severity_level = 'critical_rsi_alert' AND investigation_status NOT IN ('resolved_closed', 'found_in_or_linens') THEN 1 ELSE 0 END) as critical_rsi_active_count,
                SUM(CASE WHEN investigation_status = 'active_search_in_or' THEN 1 ELSE 0 END) as or_search_active_count,
                SUM(CASE WHEN investigation_status = 'sent_for_repair' THEN 1 ELSE 0 END) as repair_queue_count
            FROM `cssd_missing_instrument_logs`
        ";
        $inc = $pdo->query($incSql)->fetch(PDO::FETCH_ASSOC) ?: [];

        return [
            'total_master_trays' => $totalMasterTrays,
            'total_physical_trays' => (int)($m['total_trays'] ?? 0),
            'sterile_ready_count' => (int)($m['sterile_ready_count'] ?? 0),
            'active_surgery_count' => (int)($m['active_surgery_count'] ?? 0),
            'processing_count' => (int)($m['processing_count'] ?? 0),
            'quarantined_count' => (int)($m['quarantined_count'] ?? 0),
            'expired_sterile_count' => (int)($m['expired_sterile_count'] ?? 0),
            'total_cycles_run' => (int)($m['total_cycles_run'] ?? 0),
            'total_manifest_instruments' => $totalManifestInstruments,
            'total_batches' => (int)($b['total_batches'] ?? 0),
            'released_batches_count' => (int)($b['released_batches_count'] ?? 0),
            'incubating_batches_count' => (int)($b['incubating_batches_count'] ?? 0),
            'in_progress_batches_count' => (int)($b['in_progress_batches_count'] ?? 0),
            'failed_batches_count' => (int)($b['failed_batches_count'] ?? 0),
            'total_machines' => (int)($mac['total_machines'] ?? 0),
            'active_machines' => (int)($mac['active_machines'] ?? 0),
            'bowie_dick_passed_count' => (int)($mac['bowie_dick_passed_count'] ?? 0),
            'specialty_distribution' => $specialties,
            'total_dispatches' => (int)($disp['total_dispatches'] ?? 0),
            'active_dispatches' => (int)($disp['active_dispatches'] ?? 0),
            'dispatches_today' => (int)($disp['dispatches_today'] ?? 0),
            'total_returns' => (int)($ret['total_returns'] ?? 0),
            'returns_today' => (int)($ret['returns_today'] ?? 0),
            'total_rsi_returns' => (int)($ret['total_rsi_returns'] ?? 0),
            'total_incidents' => (int)($inc['total_incidents'] ?? 0),
            'open_incidents_count' => (int)($inc['open_incidents_count'] ?? 0),
            'critical_rsi_active_count' => (int)($inc['critical_rsi_active_count'] ?? 0),
            'or_search_active_count' => (int)($inc['or_search_active_count'] ?? 0),
            'repair_queue_count' => (int)($inc['repair_queue_count'] ?? 0)
        ];
    }

    /**
     * List Master Surgical Trays Catalog
     */
    public function listMasterTrays(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();
        $where = ["1=1"];
        $params = [];

        if (!empty($filters['specialty'])) {
            $where[] = "mt.department_specialty = ?";
            $params[] = $filters['specialty'];
        }

        if (!empty($filters['category'])) {
            $where[] = "mt.category = ?";
            $params[] = $filters['category'];
        }

        if (!empty($filters['status'])) {
            $where[] = "mt.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['q'])) {
            $where[] = "(mt.tray_code LIKE ? OR mt.name LIKE ? OR mt.instructions LIKE ?)";
            $term = '%' . trim($filters['q']) . '%';
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = implode(" AND ", $where);

        // Count
        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM `cssd_master_trays` mt WHERE {$whereClause}");
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        // Paginated records with count of circulating physical trays
        $offset = ($page - 1) * $perPage;
        $sql = "
            SELECT
                mt.*,
                COUNT(pt.id) as circulating_trays_count,
                SUM(CASE WHEN pt.current_status = 'sterile_stored' THEN 1 ELSE 0 END) as sterile_ready_count,
                SUM(CASE WHEN pt.current_status IN ('dispatched_surgery', 'in_surgery') THEN 1 ELSE 0 END) as in_surgery_count,
                SUM(CASE WHEN pt.current_status = 'quarantined_missing_item' THEN 1 ELSE 0 END) as quarantined_count
            FROM `cssd_master_trays` mt
            LEFT JOIN `cssd_physical_trays` pt ON mt.id = pt.master_tray_id
            WHERE {$whereClause}
            GROUP BY mt.id
            ORDER BY mt.tray_code ASC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'records' => $records
        ];
    }

    /**
     * Get Master Tray with Full Itemized Manifest
     */
    public function getMasterTrayDetail(int $id): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("SELECT * FROM `cssd_master_trays` WHERE id = ?");
        $stmt->execute([$id]);
        $tray = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$tray) return null;

        $itemsStmt = $pdo->prepare("
            SELECT * FROM `cssd_master_tray_items`
            WHERE master_tray_id = ?
            ORDER BY item_seq ASC, id ASC
        ");
        $itemsStmt->execute([$id]);
        $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        // Associated physical trays
        $physStmt = $pdo->prepare("
            SELECT * FROM `cssd_physical_trays`
            WHERE master_tray_id = ?
            ORDER BY tray_barcode ASC
        ");
        $physStmt->execute([$id]);
        $physicalTrays = $physStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'master_tray' => $tray,
            'manifest_items' => $items,
            'physical_trays' => $physicalTrays
        ];
    }

    /**
     * Save Master Tray and Piece-by-Piece Manifest
     */
    public function saveMasterTray(array $data): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $id = !empty($data['id']) ? (int)$data['id'] : null;
            $trayCode = trim($data['tray_code'] ?? '');
            $name = trim($data['name'] ?? '');
            $specialty = trim($data['department_specialty'] ?? 'General Surgery');
            $category = $data['category'] ?? 'major_surgical';
            $modality = $data['sterilization_modality'] ?? 'steam_autoclave';
            $temp = (float)($data['target_temp_celsius'] ?? 134.00);
            $expMin = (float)($data['target_exposure_minutes'] ?? 4.00);
            $psi = (float)($data['target_pressure_psi'] ?? 30.50);
            $wrapper = $data['standard_wrapper_type'] ?? 'rigid_container';
            $shelfDays = max(1, (int)($data['shelf_life_days'] ?? 30));
            $instructions = $data['instructions'] ?? null;
            $status = $data['status'] ?? 'active';

            if (empty($name)) {
                throw new \InvalidArgumentException("Master surgical tray name is required.");
            }

            if (!$id) {
                if (empty($trayCode)) {
                    // Generate code e.g. MST-SURG-01
                    $prefix = 'MST-' . strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $specialty), 0, 3));
                    $count = (int)$pdo->query("SELECT COUNT(*) FROM cssd_master_trays WHERE tray_code LIKE '{$prefix}%'")->fetchColumn() + 1;
                    $trayCode = sprintf("%s-%02d", $prefix, $count);
                }

                $stmt = $pdo->prepare("
                    INSERT INTO `cssd_master_trays` (
                        `tray_code`, `name`, `department_specialty`, `category`, `total_pieces`,
                        `sterilization_modality`, `target_temp_celsius`, `target_exposure_minutes`,
                        `target_pressure_psi`, `standard_wrapper_type`, `shelf_life_days`, `instructions`, `status`
                    ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $trayCode, $name, $specialty, $category, $modality,
                    $temp, $expMin, $psi, $wrapper, $shelfDays, $instructions, $status
                ]);
                $id = (int)$pdo->lastInsertId();
            } else {
                $stmt = $pdo->prepare("
                    UPDATE `cssd_master_trays` SET
                        `tray_code` = ?,
                        `name` = ?,
                        `department_specialty` = ?,
                        `category` = ?,
                        `sterilization_modality` = ?,
                        `target_temp_celsius` = ?,
                        `target_exposure_minutes` = ?,
                        `target_pressure_psi` = ?,
                        `standard_wrapper_type` = ?,
                        `shelf_life_days` = ?,
                        `instructions` = ?,
                        `status` = ?
                    WHERE `id` = ?
                ");
                $stmt->execute([
                    $trayCode, $name, $specialty, $category, $modality,
                    $temp, $expMin, $psi, $wrapper, $shelfDays, $instructions, $status, $id
                ]);
            }

            // Sync Manifest Items if provided
            $totalPieces = 0;
            if (isset($data['items']) && is_array($data['items'])) {
                $pdo->prepare("DELETE FROM `cssd_master_tray_items` WHERE master_tray_id = ?")->execute([$id]);

                $stmtItem = $pdo->prepare("
                    INSERT INTO `cssd_master_tray_items` (
                        `master_tray_id`, `item_seq`, `instrument_name`, `instrument_type`,
                        `quantity_required`, `size_or_gauge`, `critical_inspection_point`, `is_critical_count`
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");

                $seq = 1;
                foreach ($data['items'] as $item) {
                    $instName = trim($item['instrument_name'] ?? '');
                    if (empty($instName)) continue;

                    $type = $item['instrument_type'] ?? 'clamping_occluding';
                    $qty = max(1, (int)($item['quantity_required'] ?? 1));
                    $size = trim($item['size_or_gauge'] ?? '');
                    $inspect = trim($item['critical_inspection_point'] ?? '');
                    $isCritical = !empty($item['is_critical_count']) ? 1 : 0;

                    $stmtItem->execute([
                        $id, $seq++, $instName, $type, $qty, $size, $inspect, $isCritical
                    ]);
                    $totalPieces += $qty;
                }

                // Update total_pieces on master tray
                $pdo->prepare("UPDATE `cssd_master_trays` SET `total_pieces` = ? WHERE `id` = ?")->execute([$totalPieces, $id]);
            } else {
                $totalPieces = (int)$pdo->query("SELECT SUM(quantity_required) FROM cssd_master_tray_items WHERE master_tray_id = {$id}")->fetchColumn();
                $pdo->prepare("UPDATE `cssd_master_trays` SET `total_pieces` = ? WHERE `id` = ?")->execute([$totalPieces, $id]);
            }

            $pdo->commit();

            return [
                'id' => $id,
                'tray_code' => $trayCode,
                'total_pieces' => $totalPieces,
                'message' => "Master tray manifest '{$name}' saved successfully with {$totalPieces} instruments."
            ];
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Delete Master Tray
     */
    public function deleteMasterTray(int $id): bool
    {
        $pdo = Database::connection();
        // Check for circulating physical trays
        $count = (int)$pdo->query("SELECT COUNT(*) FROM cssd_physical_trays WHERE master_tray_id = {$id}")->fetchColumn();
        if ($count > 0) {
            throw new \RuntimeException("Cannot delete master tray with {$count} circulating physical trays. Retire or archive instead.");
        }

        $pdo->beginTransaction();
        try {
            $pdo->prepare("DELETE FROM cssd_master_tray_items WHERE master_tray_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM cssd_master_trays WHERE id = ?")->execute([$id]);
            $pdo->commit();
            return true;
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * List Circulating Physical Trays
     */
    public function listPhysicalTrays(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();
        $where = ["1=1"];
        $params = [];

        if (!empty($filters['status'])) {
            $where[] = "pt.current_status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['master_tray_id'])) {
            $where[] = "pt.master_tray_id = ?";
            $params[] = (int)$filters['master_tray_id'];
        }

        if (!empty($filters['specialty'])) {
            $where[] = "mt.department_specialty = ?";
            $params[] = $filters['specialty'];
        }

        if (!empty($filters['location'])) {
            $where[] = "pt.current_location LIKE ?";
            $params[] = '%' . trim($filters['location']) . '%';
        }

        if (!empty($filters['q'])) {
            $term = '%' . trim($filters['q']) . '%';
            $where[] = "(pt.tray_barcode LIKE ? OR pt.serial_number LIKE ? OR mt.name LIKE ? OR pt.assigned_or_suite LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = implode(" AND ", $where);

        $countStmt = $pdo->prepare("
            SELECT COUNT(*) FROM `cssd_physical_trays` pt
            JOIN `cssd_master_trays` mt ON pt.master_tray_id = mt.id
            WHERE {$whereClause}
        ");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $offset = ($page - 1) * $perPage;
        $sql = "
            SELECT
                pt.*,
                mt.tray_code as master_tray_code,
                mt.name as master_tray_name,
                mt.department_specialty,
                mt.category as master_category,
                mt.total_pieces as manifest_pieces,
                mt.shelf_life_days,
                mt.standard_wrapper_type,
                mt.sterilization_modality
            FROM `cssd_physical_trays` pt
            JOIN `cssd_master_trays` mt ON pt.master_tray_id = mt.id
            WHERE {$whereClause}
            ORDER BY pt.current_status ASC, pt.tray_barcode ASC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'records' => $records
        ];
    }

    /**
     * Get Physical Tray Detail with Lifecycle Movement History
     */
    public function getPhysicalTrayDetail(int $id): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT
                pt.*,
                mt.tray_code as master_tray_code,
                mt.name as master_tray_name,
                mt.department_specialty,
                mt.category,
                mt.total_pieces as manifest_pieces,
                mt.standard_wrapper_type,
                mt.target_temp_celsius,
                mt.target_exposure_minutes,
                mt.target_pressure_psi,
                mt.instructions
            FROM `cssd_physical_trays` pt
            JOIN `cssd_master_trays` mt ON pt.master_tray_id = mt.id
            WHERE pt.id = ?
        ");
        $stmt->execute([$id]);
        $tray = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$tray) return null;

        // Fetch Piece-by-piece manifest
        $itemsStmt = $pdo->prepare("
            SELECT * FROM `cssd_master_tray_items`
            WHERE master_tray_id = ?
            ORDER BY item_seq ASC
        ");
        $itemsStmt->execute([$tray['master_tray_id']]);
        $manifest = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch Movement & Decontamination Lifecycle Events
        $eventStmt = $pdo->prepare("
            SELECT * FROM `cssd_tray_lifecycle_events`
            WHERE physical_tray_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 50
        ");
        $eventStmt->execute([$id]);
        $events = $eventStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'tray' => $tray,
            'manifest' => $manifest,
            'lifecycle_events' => $events
        ];
    }

    /**
     * Register New Barcoded Physical Tray
     */
    public function registerPhysicalTray(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $masterTrayId = (int)($data['master_tray_id'] ?? 0);
            if ($masterTrayId <= 0) {
                throw new \InvalidArgumentException("Master tray selection is required.");
            }

            $master = $pdo->query("SELECT * FROM cssd_master_trays WHERE id = {$masterTrayId}")->fetch(PDO::FETCH_ASSOC);
            if (!$master) {
                throw new \RuntimeException("Master surgical tray not found.");
            }

            $barcode = !empty($data['tray_barcode']) ? trim($data['tray_barcode']) : self::generateTrayBarcode($pdo);
            $serial = !empty($data['serial_number']) ? trim($data['serial_number']) : null;
            $status = $data['current_status'] ?? 'sterile_stored';
            $location = trim($data['current_location'] ?? 'CSSD Sterile Core Rack A-1');
            $technician = trim($data['packaging_technician_name'] ?? 'CSSD Assembly Tech');
            $verifier = trim($data['assembly_verified_by'] ?? 'CSSD Supervisor');
            $notes = $data['notes'] ?? 'New circulating instrument tray instantiated.';

            $lastSterilized = ($status === 'sterile_stored') ? date('Y-m-d H:i:s') : null;
            $expiryDate = ($status === 'sterile_stored') ? date('Y-m-d', strtotime("+{$master['shelf_life_days']} days")) : null;

            $stmt = $pdo->prepare("
                INSERT INTO `cssd_physical_trays` (
                    `tray_barcode`, `master_tray_id`, `serial_number`, `current_status`,
                    `current_location`, `last_sterilized_at`, `sterile_expiry_date`,
                    `packaging_technician_name`, `assembly_verified_by`, `instrument_count_verified`,
                    `total_sterilization_cycles`, `notes`, `created_at`, `updated_at`
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, NOW(), NOW())
            ");
            $stmt->execute([
                $barcode, $masterTrayId, $serial, $status, $location,
                $lastSterilized, $expiryDate, $technician, $verifier, $notes
            ]);
            $physId = (int)$pdo->lastInsertId();

            // Record initial event log
            $pdo->prepare("
                INSERT INTO `cssd_tray_lifecycle_events` (
                    `physical_tray_id`, `event_type`, `from_status`, `to_status`,
                    `location`, `operator_name`, `instruments_verified_count`, `notes`
                ) VALUES (?, 'sterile_shelved', NULL, ?, ?, ?, ?, ?)
            ")->execute([
                $physId, $status, $location, $technician, $master['total_pieces'], $notes
            ]);

            $pdo->commit();

            return [
                'id' => $physId,
                'tray_barcode' => $barcode,
                'message' => "Physical surgical tray {$barcode} registered successfully."
            ];
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Transition Tray Lifecycle Status
     * (Dirty -> Decontaminating -> Assembled & Wrapped -> Sterilizing -> Sterile -> In Surgery)
     */
    public function updateTrayStatus(
        int $trayId,
        string $newStatus,
        string $location,
        string $operatorName,
        ?string $notes = null,
        bool $countVerified = true,
        ?string $assignedSuite = null,
        ?string $batchId = null
    ): array {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $current = $pdo->query("
                SELECT pt.*, mt.shelf_life_days, mt.total_pieces
                FROM cssd_physical_trays pt
                JOIN cssd_master_trays mt ON pt.master_tray_id = mt.id
                WHERE pt.id = {$trayId}
            ")->fetch(PDO::FETCH_ASSOC);

            if (!$current) {
                throw new \RuntimeException("Physical tray not found.");
            }

            $fromStatus = $current['current_status'];
            $shelfDays = (int)($current['shelf_life_days'] ?? 30);
            $totalPieces = (int)($current['total_pieces'] ?? 0);

            // Determine if sterilizing or sterile
            $lastSterilized = $current['last_sterilized_at'];
            $sterileExpiry = $current['sterile_expiry_date'];
            $totalCycles = (int)$current['total_sterilization_cycles'];

            // Map event type
            $eventType = 'sterile_shelved';
            switch ($newStatus) {
                case 'dirty_received':
                case 'returned_dirty':
                    $eventType = 'returned_to_cssd';
                    break;
                case 'decontaminating':
                    $eventType = 'wash_disinfection_completed';
                    break;
                case 'assembled_wrapped':
                    $eventType = 'wrapped_sealed';
                    break;
                case 'sterilizing':
                    $eventType = 'sterilization_started';
                    $totalCycles++;
                    break;
                case 'sterile_stored':
                    $eventType = 'sterilization_passed';
                    $lastSterilized = date('Y-m-d H:i:s');
                    $sterileExpiry = date('Y-m-d', strtotime("+{$shelfDays} days"));
                    break;
                case 'dispatched_surgery':
                    $eventType = 'dispatched_to_or';
                    break;
                case 'in_surgery':
                    $eventType = 'or_count_in';
                    break;
                case 'quarantined_missing_item':
                    $eventType = 'quarantined';
                    break;
                case 'maintenance_repair':
                    $eventType = 'maintenance';
                    break;
            }

            $assigned = $assignedSuite ?? ($newStatus === 'sterile_stored' ? null : $current['assigned_or_suite']);
            $batch = $batchId ?? $current['last_sterilization_batch_id'];

            $stmt = $pdo->prepare("
                UPDATE `cssd_physical_trays` SET
                    `current_status` = ?,
                    `current_location` = ?,
                    `assigned_or_suite` = ?,
                    `last_sterilization_batch_id` = ?,
                    `last_sterilized_at` = ?,
                    `sterile_expiry_date` = ?,
                    `instrument_count_verified` = ?,
                    `total_sterilization_cycles` = ?,
                    `notes` = ?,
                    `updated_at` = NOW()
                WHERE `id` = ?
            ");
            $stmt->execute([
                $newStatus, $location, $assigned, $batch,
                $lastSterilized, $sterileExpiry, $countVerified ? 1 : 0,
                $totalCycles, $notes, $trayId
            ]);

            // Insert audit event
            $stmtEvent = $pdo->prepare("
                INSERT INTO `cssd_tray_lifecycle_events` (
                    `physical_tray_id`, `event_type`, `from_status`, `to_status`,
                    `location`, `operator_name`, `instruments_verified_count`, `notes`
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtEvent->execute([
                $trayId, $eventType, $fromStatus, $newStatus,
                $location, $operatorName, $countVerified ? $totalPieces : ($totalPieces - 1), $notes
            ]);

            $pdo->commit();

            return [
                'tray_id' => $trayId,
                'barcode' => $current['tray_barcode'],
                'from_status' => $fromStatus,
                'to_status' => $newStatus,
                'location' => $location,
                'sterile_expiry_date' => $sterileExpiry,
                'message' => "Tray {$current['tray_barcode']} transitioned to '{$newStatus}' at {$location}."
            ];
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Delete Physical Tray
     */
    public function deletePhysicalTray(int $id): bool
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();
        try {
            $pdo->prepare("DELETE FROM `cssd_tray_lifecycle_events` WHERE physical_tray_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM `cssd_physical_trays` WHERE id = ?")->execute([$id]);
            $pdo->commit();
            return true;
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * UI Metadata
     */
    public function getMetadata(): array
    {
        $pdo = Database::connection();

        $specialties = [
            'General Surgery' => 'General Surgery & Abdominal',
            'Obstetrics & Gynecology' => 'Obstetrics & Gynecology (Maternity)',
            'Orthopedic Surgery' => 'Orthopedic Surgery & Trauma',
            'Cardiovascular & Thoracic' => 'Cardiovascular & Thoracic',
            'ENT & Head/Neck' => 'ENT & Head / Neck',
            'Neurosurgery' => 'Neurosurgery & Spine',
            'Ophthalmology' => 'Ophthalmology (Eye)',
            'Urology' => 'Urology & Renal',
            'Emergency & Trauma' => 'Emergency Department & Trauma Bay'
        ];

        $categories = [
            'major_surgical' => 'Major Surgical Set',
            'minor_surgical' => 'Minor Surgical Set',
            'laparoscopic_endoscopic' => 'Laparoscopic & Endoscopic',
            'orthopedic_trauma' => 'Orthopedic Bone & Trauma',
            'maternity_obgyn' => 'Maternity & C-Section',
            'specialized_micro' => 'Specialized Micro-Surgical'
        ];

        $statuses = [
            'sterile_stored' => 'Sterile & Ready (Sterile Core Storage)',
            'dispatched_surgery' => 'Dispatched to OR Suite',
            'in_surgery' => 'In Surgery (Sterile Field Open)',
            'returned_dirty' => 'Returned Dirty (Post-Op Intake)',
            'dirty_received' => 'Dirty / Sorting in Decontamination',
            'decontaminating' => 'Decontaminating (Enzymatic / Ultrasonic Wash)',
            'assembled_wrapped' => 'Assembled & Wrapped (Class 5 Verified)',
            'sterilizing' => 'In Autoclave Sterilizer Chamber',
            'quarantined_missing_item' => 'Quarantined (Missing Item / Damaged)',
            'maintenance_repair' => 'Maintenance / Sharpening Out of Service'
        ];

        $wrapperTypes = [
            'rigid_container' => 'Rigid Filtered Container (Aluminum / Steel)',
            'non_woven_sms' => 'Double Non-Woven SMS Polypropylene Wrap',
            'crepe_paper' => 'Medical Grade Crepe Barrier Paper',
            'tyvek_pouch' => 'Tyvek / Peel Pouch (Heat Sealed)'
        ];

        $instrumentTypes = [
            'cutting_dissecting' => 'Cutting & Dissecting (Scissors, Scalpels, Curettes, Osteotomes)',
            'clamping_occluding' => 'Clamping & Occluding (Hemostats, Vascular Clamps, Kelly, Crile)',
            'grasping_holding' => 'Grasping & Holding (Tissue Forceps, Towel Clamps, Babcock, Allis)',
            'retracting_exposing' => 'Retracting & Exposing (Balfour, Deaver, Richardson, Hohmann)',
            'suturing_stapling' => 'Suturing & Stapling (Needle Holders, Wire Twisters)',
            'suctioning_probing' => 'Suctioning & Probing (Poole, Yankauer, Frazier, Dilators)',
            'miscellaneous' => 'Miscellaneous Accessories (Mallets, Rulers, Containers)'
        ];

        $modalities = [
            'steam_autoclave' => 'High-Vacuum Steam Autoclave (134°C, 30 PSI)',
            'ethylene_oxide_eto' => 'Ethylene Oxide (EtO Gas - Low Temp)',
            'hydrogen_peroxide_plasma' => 'Hydrogen Peroxide Vapor Plasma (V-Pro / Sterrad)',
            'dry_heat' => 'Dry Heat Sterilization'
        ];

        $masterTrays = $pdo->query("SELECT id, tray_code, name, department_specialty, total_pieces FROM cssd_master_trays WHERE status = 'active' ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);

        $machines = $pdo->query("SELECT id, machine_code, machine_name, sterilization_type, status, daily_bowie_dick_passed FROM cssd_sterilizer_machines ORDER BY machine_name ASC")->fetchAll(PDO::FETCH_ASSOC);

        $cycleTypes = [
            'wrapped_instruments_134c' => 'Wrapped Surgical Sets (134°C, 2.2 bar, 18 min)',
            'unwrapped_flash_134c' => 'Emergency Flash Sterilization (134°C, 4 min)',
            'prion_inactivation_134c' => 'Extended Prion Inactivation (134°C, 18 min)',
            'delicate_plastics_121c' => 'Delicate Plastics & Rubber (121°C, 30 min)',
            'plasma_standard' => 'H2O2 Plasma Standard (55°C, 45 min)',
            'plasma_advanced' => 'H2O2 Plasma Lumen Advanced (55°C, 60 min)'
        ];

        $batchStatuses = [
            'released_sterile' => 'Released Sterile (Parameters, Integrator & Spore Pass)',
            'cycle_passed_quarantined_bi' => 'In Spore Quarantine (Awaiting BI Incubation)',
            'in_progress' => 'In Sterilization Cycle (Plateau Phase)',
            'batch_failed_quarantined' => 'Failed & Quarantined (Safety Lockout)',
            'cycle_aborted' => 'Cycle Aborted (Chamber / Pressure Error)'
        ];

        $sporeResults = [
            'no_growth_negative' => 'No Growth / Negative (100% Spore Destruction - PASS)',
            'growth_positive' => 'Growth / Positive (STERILIZATION FAILURE - CRITICAL ALERT)',
            'incubating_pending' => 'Incubating (24h Biological Incubator @ 56°C)',
            'not_run' => 'Not Run for this Cycle'
        ];

        $chemicalClasses = [
            'class_5_integrator' => 'Class 5 Chemical Integrator (Steam/Time/Temp)',
            'class_6_emulating' => 'Class 6 Emulating Indicator (Cycle-Specific)',
            'class_4_multi_variable' => 'Class 4 Multi-Variable Indicator Strip',
            'none' => 'None / Ambient'
        ];

        return [
            'specialties' => $specialties,
            'categories' => $categories,
            'statuses' => $statuses,
            'wrapper_types' => $wrapperTypes,
            'instrument_types' => $instrumentTypes,
            'modalities' => $modalities,
            'master_trays' => $masterTrays,
            'machines' => $machines,
            'cycle_types' => $cycleTypes,
            'batch_statuses' => $batchStatuses,
            'spore_results' => $sporeResults,
            'chemical_classes' => $chemicalClasses
        ];
    }

    /**
     * List Sterilizer Equipment Machines
     */
    public function listMachines(): array
    {
        $pdo = Database::connection();
        $sql = "
            SELECT
                m.*,
                (SELECT COUNT(*) FROM cssd_sterilization_batches WHERE sterilizer_machine_id = m.id) as batch_count,
                (SELECT COUNT(*) FROM cssd_sterilization_batches WHERE sterilizer_machine_id = m.id AND sterilization_date = CURRENT_DATE) as today_cycles
            FROM `cssd_sterilizer_machines` m
            ORDER BY m.machine_code ASC
        ";
        return $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Save Sterilizer Equipment Machine
     */
    public function saveMachine(array $data): array
    {
        $pdo = Database::connection();
        $id = !empty($data['id']) ? (int)$data['id'] : null;
        $code = trim($data['machine_code'] ?? '');
        $name = trim($data['machine_name'] ?? '');
        $type = $data['sterilization_type'] ?? 'steam_autoclave';
        $location = trim($data['location'] ?? 'CSSD Sterilizer Core');
        $serial = trim($data['serial_number'] ?? '');
        $mfg = trim($data['manufacturer'] ?? 'Getinge');
        $model = trim($data['model_number'] ?? '');
        $volume = (float)($data['chamber_volume_liters'] ?? 450.00);
        $temp = (float)($data['max_operating_temp_c'] ?? 138.00);
        $pressure = (float)($data['max_operating_pressure_bar'] ?? 3.20);
        $status = $data['status'] ?? 'ready';
        $notes = $data['notes'] ?? null;

        if (empty($name)) {
            throw new \InvalidArgumentException("Sterilizer machine name is required.");
        }

        if (!$id) {
            if (empty($code)) {
                $count = (int)$pdo->query("SELECT COUNT(*) FROM cssd_sterilizer_machines")->fetchColumn() + 1;
                $code = sprintf("STER-%02d", $count);
            }
            $stmt = $pdo->prepare("
                INSERT INTO `cssd_sterilizer_machines` (
                    `machine_code`, `machine_name`, `sterilization_type`, `location`,
                    `serial_number`, `manufacturer`, `model_number`, `chamber_volume_liters`,
                    `max_operating_temp_c`, `max_operating_pressure_bar`, `status`, `notes`
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$code, $name, $type, $location, $serial, $mfg, $model, $volume, $temp, $pressure, $status, $notes]);
            $id = (int)$pdo->lastInsertId();
        } else {
            $stmt = $pdo->prepare("
                UPDATE `cssd_sterilizer_machines` SET
                    `machine_code` = ?, `machine_name` = ?, `sterilization_type` = ?,
                    `location` = ?, `serial_number` = ?, `manufacturer` = ?,
                    `model_number` = ?, `chamber_volume_liters` = ?, `max_operating_temp_c` = ?,
                    `max_operating_pressure_bar` = ?, `status` = ?, `notes` = ?,
                    `updated_at` = NOW()
                WHERE `id` = ?
            ");
            $stmt->execute([$code, $name, $type, $location, $serial, $mfg, $model, $volume, $temp, $pressure, $status, $notes, $id]);
        }

        return ['id' => $id, 'machine_code' => $code, 'message' => "Sterilizer machine '{$name}' saved successfully."];
    }

    /**
     * Record Daily Bowie-Dick Air Removal Test
     */
    public function recordBowieDickTest(int $machineId, string $result, string $technician, ?string $notes = null): bool
    {
        $pdo = Database::connection();
        $isPassed = ($result === 'pass') ? 1 : 0;
        $machineStatus = $isPassed ? 'ready' : 'quarantined_spore_failure';

        $stmt = $pdo->prepare("
            UPDATE `cssd_sterilizer_machines` SET
                `daily_bowie_dick_passed` = ?,
                `last_bowie_dick_at` = NOW(),
                `status` = ?,
                `notes` = CONCAT(IFNULL(notes, ''), '\n[Bowie-Dick Test]: ', ?, ' by ', ?, ' at ', NOW())
            WHERE `id` = ?
        ");
        return $stmt->execute([$isPassed, $machineStatus, strtoupper($result) . ($notes ? " - {$notes}" : ''), $technician, $machineId]);
    }

    /**
     * List Autoclave Sterilization Batches
     */
    public function listBatches(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();
        $where = ["1=1"];
        $params = [];

        if (!empty($filters['machine_id'])) {
            $where[] = "b.sterilizer_machine_id = ?";
            $params[] = (int)$filters['machine_id'];
        }

        if (!empty($filters['batch_status'])) {
            $where[] = "b.batch_status = ?";
            $params[] = $filters['batch_status'];
        }

        if (!empty($filters['cycle_type'])) {
            $where[] = "b.cycle_type = ?";
            $params[] = $filters['cycle_type'];
        }

        if (!empty($filters['spore_result'])) {
            $where[] = "b.biological_spore_result = ?";
            $params[] = $filters['spore_result'];
        }

        if (!empty($filters['date'])) {
            $where[] = "b.sterilization_date = ?";
            $params[] = $filters['date'];
        }

        if (!empty($filters['q'])) {
            $term = '%' . trim($filters['q']) . '%';
            $where[] = "(b.batch_number LIKE ? OR m.machine_name LIKE ? OR b.operator_name LIKE ? OR b.release_notes LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = implode(" AND ", $where);

        $countStmt = $pdo->prepare("
            SELECT COUNT(*) FROM `cssd_sterilization_batches` b
            JOIN `cssd_sterilizer_machines` m ON b.sterilizer_machine_id = m.id
            WHERE {$whereClause}
        ");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $offset = ($page - 1) * $perPage;
        $sql = "
            SELECT
                b.*,
                m.machine_code,
                m.machine_name,
                m.sterilization_type,
                (SELECT COUNT(*) FROM cssd_sterilization_batch_items WHERE batch_id = b.id) as items_loaded_count
            FROM `cssd_sterilization_batches` b
            JOIN `cssd_sterilizer_machines` m ON b.sterilizer_machine_id = m.id
            WHERE {$whereClause}
            ORDER BY b.cycle_start_time DESC, b.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'records' => $records
        ];
    }

    /**
     * Get Sterilization Batch Detail with Loaded Items
     */
    public function getBatchDetail(int $id): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT
                b.*,
                m.machine_code,
                m.machine_name,
                m.sterilization_type,
                m.chamber_volume_liters,
                m.location as machine_location
            FROM `cssd_sterilization_batches` b
            JOIN `cssd_sterilizer_machines` m ON b.sterilizer_machine_id = m.id
            WHERE b.id = ?
        ");
        $stmt->execute([$id]);
        $batch = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$batch) return null;

        // Fetch loaded items
        $itemStmt = $pdo->prepare("
            SELECT
                bi.*,
                pt.current_status as physical_tray_status,
                pt.current_location as physical_tray_location,
                mt.name as master_tray_name,
                mt.total_pieces as manifest_pieces
            FROM `cssd_sterilization_batch_items` bi
            LEFT JOIN `cssd_physical_trays` pt ON bi.physical_tray_id = pt.id
            LEFT JOIN `cssd_master_trays` mt ON pt.master_tray_id = mt.id
            WHERE bi.batch_id = ?
            ORDER BY bi.id ASC
        ");
        $itemStmt->execute([$id]);
        $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'batch' => $batch,
            'items' => $items
        ];
    }

    /**
     * Save / Execute Sterilization Batch
     */
    public function saveBatch(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $id = !empty($data['id']) ? (int)$data['id'] : null;
            $machineId = (int)($data['sterilizer_machine_id'] ?? 0);
            if ($machineId <= 0) {
                throw new \InvalidArgumentException("Sterilizer equipment selection is required.");
            }

            $machine = $pdo->query("SELECT * FROM cssd_sterilizer_machines WHERE id = {$machineId}")->fetch(PDO::FETCH_ASSOC);
            if (!$machine) {
                throw new \RuntimeException("Sterilizer machine not found.");
            }

            $batchNumber = !empty($data['batch_number']) ? trim($data['batch_number']) : self::generateBatchNumber($pdo);
            $cycleNo = max(1, (int)($data['cycle_number'] ?? ($machine['total_completed_cycles'] + 1)));
            $cycleType = $data['cycle_type'] ?? 'wrapped_instruments_134c';
            $startTime = !empty($data['cycle_start_time']) ? $data['cycle_start_time'] : date('Y-m-d H:i:s');
            $endTime = !empty($data['cycle_end_time']) ? $data['cycle_end_time'] : date('Y-m-d H:i:s', strtotime('+55 minutes'));
            $operator = trim($data['operator_name'] ?? 'CSSD Autoclave Operator');
            $supervisor = trim($data['supervisor_verified_by'] ?? 'CSSD Supervisor');

            // Physical Parameters
            $peakTemp = (float)($data['peak_temperature_celsius'] ?? 134.00);
            $pressure = (float)($data['pressure_bar'] ?? 2.20);
            $holdDuration = (float)($data['hold_duration_minutes'] ?? 18.00);
            $vacuumLeak = (float)($data['vacuum_leak_rate_mbar_min'] ?? 0.80);

            // Indicators
            $bowieDick = $data['bowie_dick_test_result'] ?? 'pass';
            $chemClass = $data['chemical_indicator_class'] ?? 'class_5_integrator';
            $chemResult = $data['chemical_indicator_result'] ?? 'pass';
            $biLot = trim($data['biological_indicator_lot'] ?? '3M-Attest-BI-4921B');
            $sporeOrg = trim($data['biological_spore_organism'] ?? 'Geobacillus stearothermophilus');
            $sporeResult = $data['biological_spore_result'] ?? 'no_growth_negative';
            $sporeHours = (float)($data['spore_incubation_hours'] ?? 24.0);
            $sporeReadAt = ($sporeResult === 'no_growth_negative' || $sporeResult === 'growth_positive') ? date('Y-m-d H:i:s') : null;
            $sporeReadBy = $sporeReadAt ? trim($data['spore_read_by'] ?? 'Microbiology QA Officer') : null;

            // Determine Batch Status
            $status = $data['batch_status'] ?? 'released_sterile';
            if ($bowieDick === 'fail' || $chemResult === 'fail' || $sporeResult === 'growth_positive') {
                $status = 'batch_failed_quarantined';
            } elseif ($sporeResult === 'incubating_pending') {
                $status = 'cycle_passed_quarantined_bi';
            }

            $sterDate = !empty($data['sterilization_date']) ? $data['sterilization_date'] : date('Y-m-d');
            $shelfLifeDays = max(1, (int)($data['sterile_shelf_life_days'] ?? 180)); // 6 months standard
            $expiryDate = date('Y-m-d', strtotime("{$sterDate} +{$shelfLifeDays} days"));
            $notes = $data['release_notes'] ?? null;

            $items = $data['items'] ?? [];
            $totalTrays = 0;
            $totalPacks = 0;
            foreach ($items as $it) {
                if (($it['item_type'] ?? 'instrument_tray') === 'instrument_tray') {
                    $totalTrays++;
                } else {
                    $totalPacks++;
                }
            }

            if (!$id) {
                $stmt = $pdo->prepare("
                    INSERT INTO `cssd_sterilization_batches` (
                        `batch_number`, `sterilizer_machine_id`, `cycle_number`, `cycle_type`,
                        `cycle_start_time`, `cycle_end_time`, `operator_user_id`, `operator_name`,
                        `supervisor_verified_by`, `peak_temperature_celsius`, `pressure_bar`,
                        `hold_duration_minutes`, `vacuum_leak_rate_mbar_min`, `bowie_dick_test_result`,
                        `chemical_indicator_class`, `chemical_indicator_result`, `biological_indicator_lot`,
                        `biological_spore_organism`, `biological_spore_result`, `spore_incubation_hours`,
                        `spore_read_at`, `spore_read_by`, `batch_status`, `total_trays_loaded`,
                        `total_packs_loaded`, `sterilization_date`, `sterile_shelf_life_days`,
                        `sterility_expiry_date`, `release_notes`
                    ) VALUES (
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?,
                        ?, ?
                    )
                ");
                $stmt->execute([
                    $batchNumber, $machineId, $cycleNo, $cycleType,
                    $startTime, $endTime, $userId, $operator,
                    $supervisor, $peakTemp, $pressure,
                    $holdDuration, $vacuumLeak, $bowieDick,
                    $chemClass, $chemResult, $biLot,
                    $sporeOrg, $sporeResult, $sporeHours,
                    $sporeReadAt, $sporeReadBy, $status, $totalTrays,
                    $totalPacks, $sterDate, $shelfLifeDays,
                    $expiryDate, $notes
                ]);
                $id = (int)$pdo->lastInsertId();

                // Increment completed cycles on machine
                $pdo->prepare("UPDATE `cssd_sterilizer_machines` SET `total_completed_cycles` = `total_completed_cycles` + 1 WHERE id = ?")->execute([$machineId]);
            } else {
                $stmt = $pdo->prepare("
                    UPDATE `cssd_sterilization_batches` SET
                        `sterilizer_machine_id` = ?, `cycle_number` = ?, `cycle_type` = ?,
                        `cycle_start_time` = ?, `cycle_end_time` = ?, `operator_name` = ?,
                        `supervisor_verified_by` = ?, `peak_temperature_celsius` = ?, `pressure_bar` = ?,
                        `hold_duration_minutes` = ?, `vacuum_leak_rate_mbar_min` = ?, `bowie_dick_test_result` = ?,
                        `chemical_indicator_class` = ?, `chemical_indicator_result` = ?, `biological_indicator_lot` = ?,
                        `biological_spore_organism` = ?, `biological_spore_result` = ?, `spore_incubation_hours` = ?,
                        `spore_read_at` = ?, `spore_read_by` = ?, `batch_status` = ?, `total_trays_loaded` = ?,
                        `total_packs_loaded` = ?, `sterilization_date` = ?, `sterile_shelf_life_days` = ?,
                        `sterility_expiry_date` = ?, `release_notes` = ?, `updated_at` = NOW()
                    WHERE `id` = ?
                ");
                $stmt->execute([
                    $machineId, $cycleNo, $cycleType,
                    $startTime, $endTime, $operator,
                    $supervisor, $peakTemp, $pressure,
                    $holdDuration, $vacuumLeak, $bowieDick,
                    $chemClass, $chemResult, $biLot,
                    $sporeOrg, $sporeResult, $sporeHours,
                    $sporeReadAt, $sporeReadBy, $status, $totalTrays,
                    $totalPacks, $sterDate, $shelfLifeDays,
                    $expiryDate, $notes, $id
                ]);
            }

            // Sync Loaded Batch Items
            if (!empty($items)) {
                $pdo->prepare("DELETE FROM `cssd_sterilization_batch_items` WHERE batch_id = ?")->execute([$id]);

                $stmtItem = $pdo->prepare("
                    INSERT INTO `cssd_sterilization_batch_items` (
                        `batch_id`, `physical_tray_id`, `item_barcode`, `item_description`,
                        `item_type`, `wrapper_type`, `load_rack_shelf`, `item_sterility_expiry_date`
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");

                foreach ($items as $it) {
                    $physId = !empty($it['physical_tray_id']) ? (int)$it['physical_tray_id'] : null;
                    $barcode = trim($it['item_barcode'] ?? '');
                    $desc = trim($it['item_description'] ?? '');

                    if ($physId && (empty($barcode) || empty($desc))) {
                        $trayRow = $pdo->query("
                            SELECT pt.tray_barcode, mt.name as master_name
                            FROM cssd_physical_trays pt
                            LEFT JOIN cssd_master_trays mt ON pt.master_tray_id = mt.id
                            WHERE pt.id = {$physId}
                        ")->fetch(PDO::FETCH_ASSOC);

                        if ($trayRow) {
                            if (empty($barcode)) $barcode = $trayRow['tray_barcode'];
                            if (empty($desc)) $desc = $trayRow['master_name'] ?? 'Surgical Instrument Set';
                        }
                    }

                    if (empty($barcode)) {
                        $barcode = 'PKG-' . rand(1000, 9999);
                    }
                    if (empty($desc)) {
                        $desc = 'Surgical Instrument Package';
                    }

                    $type = $it['item_type'] ?? 'instrument_tray';
                    $wrapper = $it['wrapper_type'] ?? 'rigid_container';
                    $shelf = $it['load_rack_shelf'] ?? ($it['shelf_position'] ?? 'Rack 1 - Middle Tier');

                    $stmtItem->execute([
                        $id, $physId, $barcode, $desc,
                        $type, $wrapper, $shelf, $expiryDate
                    ]);

                    // Automatically update linked physical tray lifecycle
                    if ($physId) {
                        if ($status === 'released_sterile') {
                            $pdo->prepare("
                                UPDATE `cssd_physical_trays` SET
                                    `current_status` = 'sterile_stored',
                                    `current_location` = 'CSSD Sterile Core Rack A-1',
                                    `last_sterilization_batch_id` = ?,
                                    `last_sterilization_cycle_no` = ?,
                                    `last_sterilized_at` = NOW(),
                                    `sterile_expiry_date` = ?,
                                    `chemical_indicator_result` = 'passed',
                                    `biological_spore_result` = ?,
                                    `total_sterilization_cycles` = `total_sterilization_cycles` + 1,
                                    `updated_at` = NOW()
                                WHERE id = ?
                            ")->execute([$batchNumber, "CYC-{$cycleNo}", $expiryDate, $sporeResult, $physId]);

                            // Log event
                            $pdo->prepare("
                                INSERT INTO `cssd_tray_lifecycle_events` (
                                    `physical_tray_id`, `event_type`, `from_status`, `to_status`,
                                    `location`, `operator_name`, `notes`
                                ) VALUES (?, 'sterilization_passed', 'sterilizing', 'sterile_stored', 'CSSD Sterile Core', ?, ?)
                            ")->execute([$physId, $operator, "Sterilized in batch {$batchNumber} (134C, 2.2 bar, 18m). 6-month sterile expiry."]);
                        } elseif ($status === 'batch_failed_quarantined') {
                            $pdo->prepare("
                                UPDATE `cssd_physical_trays` SET
                                    `current_status` = 'quarantined_missing_item',
                                    `current_location` = 'CSSD Quality Quarantine Shelf Q-1',
                                    `chemical_indicator_result` = 'failed',
                                    `biological_spore_result` = ?,
                                    `notes` = CONCAT('SAFETY QUARANTINE: Batch ', ?, ' failed sterilization quality validation.')
                                WHERE id = ?
                            ")->execute([$sporeResult, $batchNumber, $physId]);

                            $pdo->prepare("
                                INSERT INTO `cssd_tray_lifecycle_events` (
                                    `physical_tray_id`, `event_type`, `from_status`, `to_status`,
                                    `location`, `operator_name`, `notes`
                                ) VALUES (?, 'quarantined', 'sterilizing', 'quarantined_missing_item', 'CSSD Quarantine Q-1', ?, ?)
                            ")->execute([$physId, $operator, "Batch {$batchNumber} failed QA. Spore/indicator lockout."]);
                        } elseif ($status === 'cycle_passed_quarantined_bi') {
                            $pdo->prepare("
                                UPDATE `cssd_physical_trays` SET
                                    `current_status` = 'sterilizing',
                                    `current_location` = 'CSSD Cooling & Biological Hold Bay',
                                    `last_sterilization_batch_id` = ?,
                                    `chemical_indicator_result` = 'passed',
                                    `biological_spore_result` = 'incubating'
                                WHERE id = ?
                            ")->execute([$batchNumber, $physId]);
                        }
                    }
                }
            }

            $pdo->commit();

            return [
                'id' => $id,
                'batch_number' => $batchNumber,
                'batch_status' => $status,
                'sterility_expiry_date' => $expiryDate,
                'message' => "Autoclave batch #{$batchNumber} saved with status: {$status}."
            ];
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Verify Biological Spore Indicator (Geobacillus stearothermophilus)
     */
    public function verifySporeResult(int $batchId, string $sporeResult, string $readBy, ?string $notes = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $batch = $pdo->query("SELECT * FROM cssd_sterilization_batches WHERE id = {$batchId}")->fetch(PDO::FETCH_ASSOC);
            if (!$batch) {
                throw new \RuntimeException("Sterilization batch not found.");
            }

            $newBatchStatus = ($sporeResult === 'no_growth_negative') ? 'released_sterile' : (($sporeResult === 'growth_positive') ? 'batch_failed_quarantined' : $batch['batch_status']);

            $stmt = $pdo->prepare("
                UPDATE `cssd_sterilization_batches` SET
                    `biological_spore_result` = ?,
                    `spore_read_at` = NOW(),
                    `spore_read_by` = ?,
                    `batch_status` = ?,
                    `release_notes` = CONCAT(IFNULL(release_notes, ''), '\n[Spore Verification]: ', ?, ' by ', ?, ' at ', NOW()),
                    `updated_at` = NOW()
                WHERE id = ?
            ");
            $stmt->execute([$sporeResult, $readBy, $newBatchStatus, strtoupper($sporeResult) . ($notes ? " ({$notes})" : ''), $readBy, $batchId]);

            // If negative pass: release all associated physical trays
            if ($sporeResult === 'no_growth_negative') {
                $trays = $pdo->query("SELECT physical_tray_id FROM cssd_sterilization_batch_items WHERE batch_id = {$batchId} AND physical_tray_id IS NOT NULL")->fetchAll(PDO::FETCH_COLUMN);
                foreach ($trays as $physId) {
                    $pdo->prepare("
                        UPDATE `cssd_physical_trays` SET
                            `current_status` = 'sterile_stored',
                            `biological_spore_result` = 'negative_pass',
                            `updated_at` = NOW()
                        WHERE id = ?
                    ")->execute([$physId]);

                    $pdo->prepare("
                        INSERT INTO `cssd_tray_lifecycle_events` (
                            `physical_tray_id`, `event_type`, `from_status`, `to_status`,
                            `location`, `operator_name`, `notes`
                        ) VALUES (?, 'sterile_shelved', 'sterilizing', 'sterile_stored', 'CSSD Sterile Core', ?, 'Biological spore test NEGATIVE (Geobacillus stearothermophilus: No Growth). Released.')
                    ")->execute([$physId, $readBy]);
                }
            } elseif ($sporeResult === 'growth_positive') {
                // Spore growth positive: quarantine all trays immediately!
                $trays = $pdo->query("SELECT physical_tray_id FROM cssd_sterilization_batch_items WHERE batch_id = {$batchId} AND physical_tray_id IS NOT NULL")->fetchAll(PDO::FETCH_COLUMN);
                foreach ($trays as $physId) {
                    $pdo->prepare("
                        UPDATE `cssd_physical_trays` SET
                            `current_status` = 'quarantined_missing_item',
                            `biological_spore_result` = 'positive_fail',
                            `notes` = 'CRITICAL SPORE FAILURE: Biological indicator showed growth. Instrument recall initiated!'
                        WHERE id = ?
                    ")->execute([$physId]);
                }
            }

            $pdo->commit();

            return [
                'batch_id' => $batchId,
                'spore_result' => $sporeResult,
                'batch_status' => $newBatchStatus,
                'message' => "Biological indicator spore result recorded as '{$sporeResult}'. Batch status updated to '{$newBatchStatus}'."
            ];
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Thermal Barcode Label Generator Data
     */
    public function getThermalLabelData(int $batchId, ?int $batchItemId = null): array
    {
        $pdo = Database::connection();
        $batch = $this->getBatchDetail($batchId);
        if (!$batch) {
            throw new \RuntimeException("Batch not found.");
        }

        $b = $batch['batch'];
        $items = $batch['items'];
        if ($batchItemId) {
            $items = array_values(array_filter($items, fn($it) => (int)$it['id'] === (int)$batchItemId));
        }

        $labels = [];
        foreach ($items as $it) {
            $labels[] = [
                'batch_number' => $b['batch_number'],
                'item_barcode' => $it['item_barcode'],
                'item_description' => $it['item_description'],
                'item_type' => $it['item_type'],
                'wrapper_type' => $it['wrapper_type'],
                'load_rack_shelf' => $it['load_rack_shelf'],
                'machine_code' => $b['machine_code'],
                'machine_name' => $b['machine_name'],
                'cycle_number' => $b['cycle_number'],
                'cycle_type' => $b['cycle_type'],
                'peak_temperature_celsius' => $b['peak_temperature_celsius'],
                'pressure_bar' => $b['pressure_bar'],
                'hold_duration_minutes' => $b['hold_duration_minutes'],
                'sterilization_date' => $b['sterilization_date'],
                'sterile_shelf_life_days' => $b['sterile_shelf_life_days'],
                'sterility_expiry_date' => $b['sterility_expiry_date'],
                'bowie_dick_result' => strtoupper($b['bowie_dick_test_result']),
                'chemical_indicator_class' => $b['chemical_indicator_class'],
                'chemical_indicator_result' => strtoupper($b['chemical_indicator_result']),
                'spore_organism' => $b['biological_spore_organism'],
                'spore_result' => ($b['biological_spore_result'] === 'no_growth_negative' ? 'NEGATIVE / NO GROWTH (PASS)' : strtoupper($b['biological_spore_result'])),
                'operator_name' => $b['operator_name'],
                'supervisor_name' => $b['supervisor_verified_by'] ?? 'CSSD QA Lead',
                'hospital_name' => 'USINTELLIX HOSPITAL SYSTEM',
                'department' => 'Central Sterile Supply Department (CSSD)'
            ];
        }

        return [
            'batch' => $b,
            'labels' => $labels
        ];
    }

    /**
     * =========================================================================
     * OT DISTRIBUTION, SCAN RETURNS & MISSING INSTRUMENT LOGGING
     * =========================================================================
     */

    /**
     * Get Available Sterile Trays for OR Dispatch
     */
    public function getAvailableTraysForDispatch(): array
    {
        $pdo = Database::connection();
        $sql = "
            SELECT
                pt.id,
                pt.tray_barcode,
                pt.master_tray_id,
                mt.name as master_tray_name,
                mt.tray_code,
                mt.department_specialty,
                mt.category,
                mt.total_pieces,
                pt.current_status,
                pt.current_location,
                pt.sterile_expiry_date,
                pt.chemical_indicator_result,
                pt.biological_spore_result,
                DATEDIFF(pt.sterile_expiry_date, CURRENT_DATE) as days_until_expiry
            FROM `cssd_physical_trays` pt
            JOIN `cssd_master_trays` mt ON pt.master_tray_id = mt.id
            WHERE pt.current_status = 'sterile_stored'
              AND (pt.sterile_expiry_date IS NULL OR pt.sterile_expiry_date >= CURRENT_DATE)
            ORDER BY mt.name ASC, pt.tray_barcode ASC
        ";
        return $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get OR Suites & Active Surgical Cases for Dispatch Target
     */
    public function getORSuitesAndCases(): array
    {
        $pdo = Database::connection();

        $suites = [
            'OR Suite 1 - General Surgery',
            'OR Suite 2 - Ortho & Trauma',
            'OR Suite 3 - OB-GYN & C-Section',
            'OR Suite 4 - Neurosurgery & Spine',
            'Labor & Delivery OR 1',
            'Emergency Minor OR',
            'Endoscopy & GI Suite',
            'Cath Lab / Interventional Suite'
        ];

        // Fetch active/scheduled surgical cases
        $cases = [];
        try {
            $cases = $pdo->query("
                SELECT
                    id,
                    case_number,
                    patient_id,
                    patient_name,
                    patient_mrn,
                    or_suite_name,
                    procedure_name,
                    lead_surgeon,
                    circulating_nurse,
                    scrub_nurse,
                    perioperative_stage,
                    case_priority
                FROM `or_surgical_cases`
                WHERE perioperative_stage NOT IN ('Transferred / Discharged', 'Cancelled')
                ORDER BY scheduled_date ASC, scheduled_start_time ASC
                LIMIT 50
            ")->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            // If table differs or empty, provide empty array
            $cases = [];
        }

        return [
            'or_suites' => $suites,
            'surgical_cases' => $cases
        ];
    }

    /**
     * List OT Surgical Dispatches
     */
    public function listDispatches(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();
        $where = ["1=1"];
        $params = [];

        if (!empty($filters['search'])) {
            $term = "%" . trim($filters['search']) . "%";
            $where[] = "(d.dispatch_number LIKE ? OR d.tray_barcode LIKE ? OR d.patient_name LIKE ? OR d.procedure_name LIKE ? OR d.primary_surgeon LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        if (!empty($filters['dispatch_status'])) {
            $where[] = "d.dispatch_status = ?";
            $params[] = $filters['dispatch_status'];
        }

        if (!empty($filters['or_suite_name'])) {
            $where[] = "d.or_suite_name LIKE ?";
            $params[] = "%" . $filters['or_suite_name'] . "%";
        }

        if (!empty($filters['case_priority'])) {
            $where[] = "d.case_priority = ?";
            $params[] = $filters['case_priority'];
        }

        $whereClause = implode(" AND ", $where);

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM `cssd_ot_dispatches` d WHERE {$whereClause}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $offset = ($page - 1) * $perPage;
        $sql = "
            SELECT
                d.*,
                pt.serial_number as tray_serial_number,
                pt.current_status as tray_current_status,
                pt.current_location as tray_current_location,
                mt.name as master_tray_name,
                mt.tray_code as master_tray_code,
                mt.total_pieces,
                mt.department_specialty
            FROM `cssd_ot_dispatches` d
            JOIN `cssd_physical_trays` pt ON d.physical_tray_id = pt.id
            JOIN `cssd_master_trays` mt ON pt.master_tray_id = mt.id
            WHERE {$whereClause}
            ORDER BY d.dispatched_at DESC, d.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'records' => $records
        ];
    }

    /**
     * Get OT Dispatch Detail
     */
    public function getDispatchDetail(int $id): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT
                d.*,
                pt.serial_number as tray_serial_number,
                pt.current_status as tray_current_status,
                pt.current_location as tray_current_location,
                pt.last_sterilization_batch_id,
                mt.name as master_tray_name,
                mt.tray_code as master_tray_code,
                mt.total_pieces,
                mt.department_specialty,
                mt.category
            FROM `cssd_ot_dispatches` d
            JOIN `cssd_physical_trays` pt ON d.physical_tray_id = pt.id
            JOIN `cssd_master_trays` mt ON pt.master_tray_id = mt.id
            WHERE d.id = ?
        ");
        $stmt->execute([$id]);
        $dispatch = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$dispatch) return null;

        // Fetch piece-by-piece manifest items for this tray
        $manifestStmt = $pdo->prepare("
            SELECT * FROM `cssd_master_tray_items`
            WHERE master_tray_id = ?
            ORDER BY item_seq ASC
        ");
        $manifestStmt->execute([$dispatch['master_tray_id']]);
        $items = $manifestStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch any return or incident linked to this dispatch
        $returns = $pdo->prepare("SELECT * FROM `cssd_tray_return_reconciliations` WHERE dispatch_id = ?");
        $returns->execute([$id]);

        $incidents = $pdo->prepare("SELECT * FROM `cssd_missing_instrument_logs` WHERE dispatch_id = ?");
        $incidents->execute([$id]);

        return [
            'dispatch' => $dispatch,
            'manifest_items' => $items,
            'returns' => $returns->fetchAll(PDO::FETCH_ASSOC),
            'incidents' => $incidents->fetchAll(PDO::FETCH_ASSOC)
        ];
    }

    /**
     * Dispatch Sterile Tray to OR Suite
     */
    public function dispatchTray(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $physicalTrayId = !empty($data['physical_tray_id']) ? (int)$data['physical_tray_id'] : null;
            $trayBarcode = trim($data['tray_barcode'] ?? '');

            if (!$physicalTrayId && !empty($trayBarcode)) {
                $sel = $pdo->prepare("SELECT id FROM cssd_physical_trays WHERE tray_barcode = ?");
                $sel->execute([$trayBarcode]);
                $physicalTrayId = (int)$sel->fetchColumn();
            }

            if (!$physicalTrayId) {
                throw new \InvalidArgumentException("Physical tray selection is required.");
            }

            // Lock tray record
            $stmt = $pdo->prepare("
                SELECT pt.*, mt.name as master_name, mt.total_pieces
                FROM cssd_physical_trays pt
                JOIN cssd_master_trays mt ON pt.master_tray_id = mt.id
                WHERE pt.id = ? FOR UPDATE
            ");
            $stmt->execute([$physicalTrayId]);
            $tray = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$tray) {
                throw new \RuntimeException("Physical tray not found.");
            }

            // Check shelf-life sterility
            $today = date('Y-m-d');
            if (!empty($tray['sterile_expiry_date']) && $tray['sterile_expiry_date'] < $today) {
                $override = !empty($data['allow_expired_override']);
                if (!$override) {
                    throw new \RuntimeException("SAFETY LOCKOUT: Tray {$tray['tray_barcode']} has expired sterile shelf life ({$tray['sterile_expiry_date']}). Cannot dispatch unsterile instrumentation.");
                }
            }

            $dispatchNo = self::generateDispatchNumber($pdo);
            $orSuite = trim($data['or_suite_name'] ?? 'OR Suite 1 - General Surgery');
            $caseId = !empty($data['surgical_case_id']) ? (int)$data['surgical_case_id'] : null;
            $caseNo = !empty($data['surgical_case_number']) ? trim($data['surgical_case_number']) : null;
            $patientId = !empty($data['patient_id']) ? (int)$data['patient_id'] : null;
            $patientName = trim($data['patient_name'] ?? '');
            $procedure = trim($data['procedure_name'] ?? 'Surgical Procedure');
            $surgeon = trim($data['primary_surgeon'] ?? '');
            $circulator = trim($data['circulating_nurse'] ?? '');
            $scrub = trim($data['scrub_nurse'] ?? '');
            $dispatchedBy = trim($data['dispatched_by_name'] ?? 'CSSD Dispatch Specialist');
            $receivedBy = trim($data['received_by_name'] ?? '');
            $priority = $data['case_priority'] ?? 'elective';
            $cartBarcode = trim($data['transport_container_barcode'] ?? '');
            $notes = $data['notes'] ?? null;

            $initialStatus = !empty($receivedBy) ? 'received_in_or' : 'dispatched_in_transit';
            $receivedAt = !empty($receivedBy) ? date('Y-m-d H:i:s') : null;

            $insert = $pdo->prepare("
                INSERT INTO `cssd_ot_dispatches` (
                    `dispatch_number`, `physical_tray_id`, `tray_barcode`, `master_tray_id`,
                    `surgical_case_id`, `surgical_case_number`, `or_suite_name`, `patient_id`,
                    `patient_name`, `procedure_name`, `primary_surgeon`, `circulating_nurse`,
                    `scrub_nurse`, `dispatched_by_name`, `dispatched_by_user_id`, `received_by_name`,
                    `dispatched_at`, `received_in_or_at`, `sterility_verified`, `chemical_indicator_checked`,
                    `sterile_expiry_date`, `dispatch_status`, `case_priority`,
                    `transport_container_barcode`, `notes`
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    NOW(), ?, 1, 1,
                    ?, ?, ?,
                    ?, ?
                )
            ");
            $insert->execute([
                $dispatchNo, $physicalTrayId, $tray['tray_barcode'], $tray['master_tray_id'],
                $caseId, $caseNo, $orSuite, $patientId,
                $patientName, $procedure, $surgeon, $circulator,
                $scrub, $dispatchedBy, $userId, $receivedBy ?: null,
                $receivedAt,
                $tray['sterile_expiry_date'], $initialStatus, $priority,
                $cartBarcode ?: null, $notes
            ]);
            $dispatchId = (int)$pdo->lastInsertId();

            // Update physical tray status
            $trayNewStatus = ($initialStatus === 'received_in_or') ? 'in_surgery' : 'dispatched_surgery';
            $pdo->prepare("
                UPDATE `cssd_physical_trays` SET
                    `current_status` = ?,
                    `current_location` = ?,
                    `assigned_or_suite` = ?,
                    `updated_at` = NOW()
                WHERE id = ?
            ")->execute([$trayNewStatus, $orSuite, $orSuite, $physicalTrayId]);

            // Lifecycle event
            $pdo->prepare("
                INSERT INTO `cssd_tray_lifecycle_events` (
                    `physical_tray_id`, `event_type`, `from_status`, `to_status`,
                    `location`, `operator_name`, `instruments_verified_count`, `notes`
                ) VALUES (?, 'dispatched_to_or', ?, ?, ?, ?, ?, ?)
            ")->execute([
                $physicalTrayId, $tray['current_status'], $trayNewStatus,
                $orSuite, $dispatchedBy, $tray['total_pieces'],
                "Dispatched to {$orSuite} for {$procedure}. Dispatch #{$dispatchNo}."
            ]);

            $pdo->commit();

            return [
                'success' => true,
                'dispatch_id' => $dispatchId,
                'dispatch_number' => $dispatchNo,
                'tray_barcode' => $tray['tray_barcode'],
                'target_suite' => $orSuite,
                'message' => "Sterile set {$tray['tray_barcode']} dispatched to {$orSuite} successfully."
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Confirm OR Receipt & Handover Sign-off
     */
    public function receiveTrayInOR(int $dispatchId, string $receivedBy, ?string $notes = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $stmt = $pdo->prepare("SELECT * FROM cssd_ot_dispatches WHERE id = ? FOR UPDATE");
            $stmt->execute([$dispatchId]);
            $dispatch = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$dispatch) {
                throw new \RuntimeException("Dispatch record not found.");
            }

            $pdo->prepare("
                UPDATE `cssd_ot_dispatches` SET
                    `dispatch_status` = 'received_in_or',
                    `received_by_name` = ?,
                    `received_in_or_at` = NOW(),
                    `notes` = CONCAT(IFNULL(notes, ''), '\n[OR Handover]: Received by ', ?, ' at ', NOW()),
                    `updated_at` = NOW()
                WHERE id = ?
            ")->execute([$receivedBy, $receivedBy, $dispatchId]);

            // Update physical tray to in_surgery
            $pdo->prepare("
                UPDATE `cssd_physical_trays` SET
                    `current_status` = 'in_surgery',
                    `updated_at` = NOW()
                WHERE id = ?
            ")->execute([$dispatch['physical_tray_id']]);

            // Lifecycle event
            $pdo->prepare("
                INSERT INTO `cssd_tray_lifecycle_events` (
                    `physical_tray_id`, `event_type`, `from_status`, `to_status`,
                    `location`, `operator_name`, `notes`
                ) VALUES (?, 'or_count_in', 'dispatched_surgery', 'in_surgery', ?, ?, ?)
            ")->execute([
                $dispatch['physical_tray_id'], $dispatch['or_suite_name'],
                $receivedBy, "Custody accepted in {$dispatch['or_suite_name']}. Seal opened for case."
            ]);

            $pdo->commit();

            return [
                'success' => true,
                'dispatch_id' => $dispatchId,
                'dispatch_status' => 'received_in_or',
                'message' => "Tray {$dispatch['tray_barcode']} confirmed received in {$dispatch['or_suite_name']} by {$receivedBy}."
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Get Tray Manifest & Piece Count Checklist for Return Scanning
     */
    public function getTrayManifestForReturn(string $query): array
    {
        $pdo = Database::connection();
        $query = trim($query);

        $stmt = $pdo->prepare("
            SELECT
                pt.*,
                mt.name as master_tray_name,
                mt.tray_code as master_tray_code,
                mt.total_pieces,
                mt.department_specialty,
                mt.category
            FROM `cssd_physical_trays` pt
            JOIN `cssd_master_trays` mt ON pt.master_tray_id = mt.id
            WHERE pt.tray_barcode = ? OR pt.id = ?
        ");
        $stmt->execute([$query, is_numeric($query) ? (int)$query : 0]);
        $tray = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$tray) {
            throw new \RuntimeException("Physical tray '{$query}' not found.");
        }

        // Fetch piece-by-piece manifest
        $itemsStmt = $pdo->prepare("
            SELECT
                id, item_seq, instrument_name, instrument_type,
                quantity_required, size_or_gauge, critical_inspection_point, is_critical_count
            FROM `cssd_master_tray_items`
            WHERE master_tray_id = ?
            ORDER BY item_seq ASC, id ASC
        ");
        $itemsStmt->execute([$tray['master_tray_id']]);
        $manifest = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch latest active dispatch if available
        $dispStmt = $pdo->prepare("
            SELECT * FROM `cssd_ot_dispatches`
            WHERE physical_tray_id = ?
            ORDER BY dispatched_at DESC
            LIMIT 1
        ");
        $dispStmt->execute([$tray['id']]);
        $latestDispatch = $dispStmt->fetch(PDO::FETCH_ASSOC);

        return [
            'tray' => $tray,
            'manifest_items' => $manifest,
            'latest_dispatch' => $latestDispatch
        ];
    }

    /**
     * List Tray Return Reconciliations
     */
    public function listReturns(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();
        $where = ["1=1"];
        $params = [];

        if (!empty($filters['search'])) {
            $term = "%" . trim($filters['search']) . "%";
            $where[] = "(r.return_number LIKE ? OR r.tray_barcode LIKE ? OR r.returned_from_or_suite LIKE ? OR r.received_by_cssd_tech LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        if (!empty($filters['reconciliation_status'])) {
            $where[] = "r.reconciliation_status = ?";
            $params[] = $filters['reconciliation_status'];
        }

        if (isset($filters['is_rsi_alert_triggered']) && $filters['is_rsi_alert_triggered'] !== '') {
            $where[] = "r.is_rsi_alert_triggered = ?";
            $params[] = (int)$filters['is_rsi_alert_triggered'];
        }

        $whereClause = implode(" AND ", $where);

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM `cssd_tray_return_reconciliations` r WHERE {$whereClause}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $offset = ($page - 1) * $perPage;
        $sql = "
            SELECT
                r.*,
                pt.serial_number as tray_serial_number,
                mt.name as master_tray_name,
                mt.tray_code as master_tray_code,
                d.dispatch_number,
                d.procedure_name,
                d.primary_surgeon
            FROM `cssd_tray_return_reconciliations` r
            JOIN `cssd_physical_trays` pt ON r.physical_tray_id = pt.id
            JOIN `cssd_master_trays` mt ON pt.master_tray_id = mt.id
            LEFT JOIN `cssd_ot_dispatches` d ON r.dispatch_id = d.id
            WHERE {$whereClause}
            ORDER BY r.received_at DESC, r.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'records' => $records
        ];
    }

    /**
     * Get Tray Return Detail
     */
    public function getReturnDetail(int $id): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT
                r.*,
                pt.serial_number as tray_serial_number,
                pt.current_status as tray_current_status,
                mt.name as master_tray_name,
                mt.tray_code as master_tray_code,
                mt.department_specialty,
                d.dispatch_number,
                d.procedure_name,
                d.primary_surgeon,
                d.circulating_nurse,
                d.scrub_nurse
            FROM `cssd_tray_return_reconciliations` r
            JOIN `cssd_physical_trays` pt ON r.physical_tray_id = pt.id
            JOIN `cssd_master_trays` mt ON pt.master_tray_id = mt.id
            LEFT JOIN `cssd_ot_dispatches` d ON r.dispatch_id = d.id
            WHERE r.id = ?
        ");
        $stmt->execute([$id]);
        $return = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$return) return null;

        $incidents = $pdo->prepare("SELECT * FROM `cssd_missing_instrument_logs` WHERE return_id = ?");
        $incidents->execute([$id]);

        return [
            'return' => $return,
            'checklist_items' => json_decode($return['checklist_audit_json'] ?? '[]', true) ?: [],
            'incidents' => $incidents->fetchAll(PDO::FETCH_ASSOC)
        ];
    }

    /**
     * Scan Dirty Tray Return & Execute Piece-by-Piece Manifest Reconciliation
     */
    public function reconcileTrayReturn(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $physicalTrayId = !empty($data['physical_tray_id']) ? (int)$data['physical_tray_id'] : null;
            $trayBarcode = trim($data['tray_barcode'] ?? '');

            if (!$physicalTrayId && !empty($trayBarcode)) {
                $sel = $pdo->prepare("SELECT id FROM cssd_physical_trays WHERE tray_barcode = ?");
                $sel->execute([$trayBarcode]);
                $physicalTrayId = (int)$sel->fetchColumn();
            }

            if (!$physicalTrayId) {
                throw new \InvalidArgumentException("Physical tray identification is required.");
            }

            // Lock tray record
            $stmt = $pdo->prepare("
                SELECT pt.*, mt.name as master_name, mt.total_pieces
                FROM cssd_physical_trays pt
                JOIN cssd_master_trays mt ON pt.master_tray_id = mt.id
                WHERE pt.id = ? FOR UPDATE
            ");
            $stmt->execute([$physicalTrayId]);
            $tray = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$tray) {
                throw new \RuntimeException("Physical tray not found.");
            }

            // Find linked dispatch if not provided
            $dispatchId = !empty($data['dispatch_id']) ? (int)$data['dispatch_id'] : null;
            if (!$dispatchId) {
                $dispSel = $pdo->prepare("
                    SELECT id FROM cssd_ot_dispatches
                    WHERE physical_tray_id = ? AND dispatch_status IN ('dispatched_in_transit', 'received_in_or', 'in_surgery')
                    ORDER BY dispatched_at DESC LIMIT 1
                ");
                $dispSel->execute([$physicalTrayId]);
                $dispatchId = (int)$dispSel->fetchColumn() ?: null;
            }

            $dispatch = null;
            if ($dispatchId) {
                $dStmt = $pdo->prepare("SELECT * FROM cssd_ot_dispatches WHERE id = ?");
                $dStmt->execute([$dispatchId]);
                $dispatch = $dStmt->fetch(PDO::FETCH_ASSOC);
            }

            $returnNo = self::generateReturnNumber($pdo);
            $fromSuite = trim($data['returned_from_or_suite'] ?? ($dispatch['or_suite_name'] ?? 'Operating Theater'));
            $returnedBy = trim($data['returned_by_name'] ?? ($dispatch['circulating_nurse'] ?? 'OR Nurse / Orderly'));
            $receivedBy = trim($data['received_by_cssd_tech'] ?? 'CSSD Decon Tech');
            $bioburden = $data['bioburden_level'] ?? 'moderate';
            $deconBay = trim($data['decon_bay_assigned'] ?? 'Decon Sink Bay 1 / Ultrasonic Washer');
            $notes = $data['notes'] ?? null;

            // Audit checklist items
            $checklist = $data['checklist_items'] ?? [];
            $expectedPieces = (int)$tray['total_pieces'];
            $missingItems = [];
            $damagedItems = [];
            $countedPieces = 0;

            foreach ($checklist as $item) {
                $status = $item['status'] ?? 'present';
                if ($status === 'present') {
                    $countedPieces++;
                } elseif ($status === 'missing') {
                    $missingItems[] = $item;
                } elseif ($status === 'damaged') {
                    $countedPieces++; // physically present, but damaged
                    $damagedItems[] = $item;
                }
            }

            // If no explicit checklist passed, fallback to numeric counts
            if (empty($checklist)) {
                $countedPieces = isset($data['counted_pieces']) ? (int)$data['counted_pieces'] : $expectedPieces;
                $missingCount = isset($data['missing_count']) ? (int)$data['missing_count'] : max(0, $expectedPieces - $countedPieces);
                $damagedCount = (int)($data['damaged_count'] ?? 0);
            } else {
                $missingCount = count($missingItems);
                $damagedCount = count($damagedItems);
            }

            $hasMissing = ($missingCount > 0);
            $hasDamaged = ($damagedCount > 0);

            // Determine status and RSI alert
            $reconciliationStatus = 'reconciled_complete';
            $isRSI = 0;

            if ($hasMissing) {
                $reconciliationStatus = 'quarantined_safety_incident';
                $isRSI = 1; // Any missing instrument post-op triggers Retained Surgical Item investigation!
            } elseif ($hasDamaged) {
                $reconciliationStatus = 'damaged_instruments_detected';
            }

            // Insert Return Record
            $insertRet = $pdo->prepare("
                INSERT INTO `cssd_tray_return_reconciliations` (
                    `return_number`, `dispatch_id`, `physical_tray_id`, `tray_barcode`,
                    `surgical_case_id`, `returned_from_or_suite`, `returned_by_name`,
                    `received_by_cssd_tech`, `received_by_user_id`, `received_at`,
                    `expected_pieces`, `counted_pieces`, `missing_count`, `damaged_count`,
                    `bioburden_level`, `reconciliation_status`, `is_rsi_alert_triggered`,
                    `checklist_audit_json`, `decon_bay_assigned`, `notes`
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, NOW(),
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?
                )
            ");
            $insertRet->execute([
                $returnNo, $dispatchId, $physicalTrayId, $tray['tray_barcode'],
                $dispatch['surgical_case_id'] ?? null, $fromSuite, $returnedBy,
                $receivedBy, $userId,
                $expectedPieces, $countedPieces, $missingCount, $damagedCount,
                $bioburden, $reconciliationStatus, $isRSI,
                json_encode($checklist), $deconBay, $notes
            ]);
            $returnId = (int)$pdo->lastInsertId();

            // Created incidents list
            $createdIncidentIds = [];

            // Auto-create Missing Instrument Incidents
            if ($hasMissing) {
                foreach ($missingItems as $mItem) {
                    $incNo = self::generateIncidentNumber($pdo);
                    $instName = trim($mItem['instrument_name'] ?? 'Unspecified Surgical Instrument');
                    $instType = $mItem['instrument_type'] ?? 'clamping_occluding';
                    $masterItemId = !empty($mItem['id']) ? (int)$mItem['id'] : null;

                    $stmtInc = $pdo->prepare("
                        INSERT INTO `cssd_missing_instrument_logs` (
                            `incident_number`, `return_id`, `dispatch_id`, `physical_tray_id`,
                            `tray_barcode`, `master_tray_name`, `master_tray_item_id`, `instrument_name`,
                            `instrument_type`, `quantity_missing`, `quantity_damaged`, `incident_type`,
                            `severity_level`, `or_suite_name`, `surgical_case_id`, `patient_mrn`,
                            `lead_surgeon`, `circulating_nurse`, `scrub_nurse`, `investigation_status`,
                            `xray_ordered`, `reported_at`, `reported_by_name`, `resolution_notes`
                        ) VALUES (
                            ?, ?, ?, ?,
                            ?, ?, ?, ?,
                            ?, 1, 0, 'retained_surgical_item_risk',
                            'critical_rsi_alert', ?, ?, ?,
                            ?, ?, ?, 'active_search_in_or',
                            1, NOW(), ?, ?
                        )
                    ");
                    $stmtInc->execute([
                        $incNo, $returnId, $dispatchId, $physicalTrayId,
                        $tray['tray_barcode'], $tray['master_name'], $masterItemId, $instName,
                        $instType, $fromSuite, $dispatch['surgical_case_id'] ?? null, $dispatch['patient_mrn'] ?? null,
                        $dispatch['primary_surgeon'] ?? 'Attending Surgeon',
                        $dispatch['circulating_nurse'] ?? $returnedBy,
                        $dispatch['scrub_nurse'] ?? 'Scrub Nurse',
                        $receivedBy,
                        "CRITICAL RET-ALERT: Missing '{$instName}' during return count from {$fromSuite}. Immediate OR search & X-Ray check initiated."
                    ]);
                    $createdIncidentIds[] = (int)$pdo->lastInsertId();
                }

                // If surgical case linked, flag count_issue in or_surgical_cases
                if (!empty($dispatch['surgical_case_id'])) {
                    $pdo->prepare("UPDATE `or_surgical_cases` SET `count_issue` = 1 WHERE id = ?")->execute([$dispatch['surgical_case_id']]);
                }
            }

            // Auto-create Damaged Instrument Records
            if ($hasDamaged) {
                foreach ($damagedItems as $dItem) {
                    $incNo = self::generateIncidentNumber($pdo);
                    $instName = trim($dItem['instrument_name'] ?? 'Damaged Surgical Instrument');
                    $instType = $dItem['instrument_type'] ?? 'clamping_occluding';
                    $masterItemId = !empty($dItem['id']) ? (int)$dItem['id'] : null;
                    $damageNote = trim($dItem['damage_note'] ?? ($dItem['incident'] ?? 'Damaged/bent during surgical manipulation.'));

                    $stmtDam = $pdo->prepare("
                        INSERT INTO `cssd_missing_instrument_logs` (
                            `incident_number`, `return_id`, `dispatch_id`, `physical_tray_id`,
                            `tray_barcode`, `master_tray_name`, `master_tray_item_id`, `instrument_name`,
                            `instrument_type`, `quantity_missing`, `quantity_damaged`, `incident_type`,
                            `severity_level`, `or_suite_name`, `surgical_case_id`, `lead_surgeon`,
                            `circulating_nurse`, `investigation_status`, `reported_at`, `reported_by_name`,
                            `resolution_notes`
                        ) VALUES (
                            ?, ?, ?, ?,
                            ?, ?, ?, ?,
                            ?, 0, 1, 'damaged_blunt_cracked',
                            'minor_maintenance', ?, ?, ?,
                            ?, 'sent_for_repair', NOW(), ?,
                            ?
                        )
                    ");
                    $stmtDam->execute([
                        $incNo, $returnId, $dispatchId, $physicalTrayId,
                        $tray['tray_barcode'], $tray['master_name'], $masterItemId, $instName,
                        $instType, $fromSuite, $dispatch['surgical_case_id'] ?? null,
                        $dispatch['primary_surgeon'] ?? 'Attending Surgeon',
                        $dispatch['circulating_nurse'] ?? $returnedBy,
                        $receivedBy,
                        "Instrument damage reported: {$damageNote}. Tagged for repair / sharpening."
                    ]);
                    $createdIncidentIds[] = (int)$pdo->lastInsertId();
                }
            }

            // Update Physical Tray Lifecycle
            if ($hasMissing) {
                $trayStatus = 'quarantined_missing_item';
                $trayLocation = 'CSSD Quarantine Biohazard Shelf Q-1';
                $missingNotes = "Quarantined post-return: {$missingCount} missing pieces. Missing: " . implode(', ', array_column($missingItems, 'instrument_name'));

                $pdo->prepare("
                    UPDATE `cssd_physical_trays` SET
                        `current_status` = ?,
                        `current_location` = ?,
                        `instrument_count_verified` = 0,
                        `missing_pieces_notes` = ?,
                        `updated_at` = NOW()
                    WHERE id = ?
                ")->execute([$trayStatus, $trayLocation, $missingNotes, $physicalTrayId]);

                $pdo->prepare("
                    INSERT INTO `cssd_tray_lifecycle_events` (
                        `physical_tray_id`, `event_type`, `from_status`, `to_status`,
                        `location`, `operator_name`, `instruments_verified_count`, `notes`
                    ) VALUES (?, 'quarantined', ?, ?, ?, ?, ?, ?)
                ")->execute([
                    $physicalTrayId, $tray['current_status'], $trayStatus,
                    $trayLocation, $receivedBy, $countedPieces,
                    "SAFETY LOCKOUT: {$missingCount} missing piece(s) detected during return scan. Incident #{$returnNo}."
                ]);
            } else {
                $trayStatus = 'dirty_received';
                $trayLocation = $deconBay;

                $pdo->prepare("
                    UPDATE `cssd_physical_trays` SET
                        `current_status` = ?,
                        `current_location` = ?,
                        `instrument_count_verified` = 1,
                        `missing_pieces_notes` = NULL,
                        `updated_at` = NOW()
                    WHERE id = ?
                ")->execute([$trayStatus, $trayLocation, $physicalTrayId]);

                $pdo->prepare("
                    INSERT INTO `cssd_tray_lifecycle_events` (
                        `physical_tray_id`, `event_type`, `from_status`, `to_status`,
                        `location`, `operator_name`, `instruments_verified_count`, `notes`
                    ) VALUES (?, 'returned_to_cssd', ?, ?, ?, ?, ?, ?)
                ")->execute([
                    $physicalTrayId, $tray['current_status'], $trayStatus,
                    $trayLocation, $receivedBy, $countedPieces,
                    "Return scan complete. All {$countedPieces}/{$expectedPieces} pieces reconciled. Assigned to {$deconBay}."
                ]);
            }

            // Update dispatch status if linked
            if ($dispatchId) {
                $dispatchFinalStatus = $hasMissing ? 'quarantined_incident' : 'returned_to_cssd';
                $pdo->prepare("
                    UPDATE `cssd_ot_dispatches` SET
                        `dispatch_status` = ?,
                        `updated_at` = NOW()
                    WHERE id = ?
                ")->execute([$dispatchFinalStatus, $dispatchId]);
            }

            $pdo->commit();

            return [
                'success' => true,
                'return_id' => $returnId,
                'return_number' => $returnNo,
                'tray_barcode' => $tray['tray_barcode'],
                'expected_pieces' => $expectedPieces,
                'counted_pieces' => $countedPieces,
                'missing_count' => $missingCount,
                'damaged_count' => $damagedCount,
                'is_rsi_alert_triggered' => $isRSI,
                'reconciliation_status' => $reconciliationStatus,
                'tray_status' => $trayStatus,
                'incident_ids' => $createdIncidentIds,
                'message' => $hasMissing
                    ? "CRITICAL RET-ALERT: Return scanned with {$missingCount} MISSING pieces. Retained Surgical Item investigation and quarantine triggered."
                    : "Return scanned successfully. All {$countedPieces} instruments accounted for. Transferred to decontamination."
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * List Missing Instrument Incidents & RSI Safety Log
     */
    public function listMissingInstrumentIncidents(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();
        $where = ["1=1"];
        $params = [];

        if (!empty($filters['search'])) {
            $term = "%" . trim($filters['search']) . "%";
            $where[] = "(inc.incident_number LIKE ? OR inc.tray_barcode LIKE ? OR inc.instrument_name LIKE ? OR inc.or_suite_name LIKE ? OR inc.lead_surgeon LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        if (!empty($filters['investigation_status'])) {
            $where[] = "inc.investigation_status = ?";
            $params[] = $filters['investigation_status'];
        }

        if (!empty($filters['severity_level'])) {
            $where[] = "inc.severity_level = ?";
            $params[] = $filters['severity_level'];
        }

        if (!empty($filters['or_suite_name'])) {
            $where[] = "inc.or_suite_name LIKE ?";
            $params[] = "%" . $filters['or_suite_name'] . "%";
        }

        $whereClause = implode(" AND ", $where);

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM `cssd_missing_instrument_logs` inc WHERE {$whereClause}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $offset = ($page - 1) * $perPage;
        $sql = "
            SELECT
                inc.*,
                pt.serial_number as tray_serial_number,
                pt.current_status as tray_current_status,
                r.return_number,
                d.dispatch_number,
                d.procedure_name
            FROM `cssd_missing_instrument_logs` inc
            JOIN `cssd_physical_trays` pt ON inc.physical_tray_id = pt.id
            LEFT JOIN `cssd_tray_return_reconciliations` r ON inc.return_id = r.id
            LEFT JOIN `cssd_ot_dispatches` d ON inc.dispatch_id = d.id
            WHERE {$whereClause}
            ORDER BY
                CASE WHEN inc.severity_level = 'critical_rsi_alert' THEN 1 ELSE 2 END,
                inc.reported_at DESC, inc.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'records' => $records
        ];
    }

    /**
     * Get Incident Detail
     */
    public function getIncidentDetail(int $id): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT
                inc.*,
                pt.serial_number as tray_serial_number,
                pt.current_status as tray_current_status,
                pt.current_location as tray_current_location,
                r.return_number,
                r.bioburden_level,
                d.dispatch_number,
                d.procedure_name,
                d.surgical_case_number
            FROM `cssd_missing_instrument_logs` inc
            JOIN `cssd_physical_trays` pt ON inc.physical_tray_id = pt.id
            LEFT JOIN `cssd_tray_return_reconciliations` r ON inc.return_id = r.id
            LEFT JOIN `cssd_ot_dispatches` d ON inc.dispatch_id = d.id
            WHERE inc.id = ?
        ");
        $stmt->execute([$id]);
        $inc = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$inc) return null;

        return $inc;
    }

    /**
     * Update Missing Instrument Investigation & Resolution
     */
    public function updateIncidentResolution(int $id, array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $stmt = $pdo->prepare("SELECT * FROM cssd_missing_instrument_logs WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $inc = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$inc) {
                throw new \RuntimeException("Incident record not found.");
            }

            $status = $data['investigation_status'] ?? $inc['investigation_status'];
            $xrayOrdered = isset($data['xray_ordered']) ? (int)$data['xray_ordered'] : $inc['xray_ordered'];
            $xrayFindings = $data['xray_findings'] ?? $inc['xray_findings'];
            $xrayTime = (!empty($xrayFindings) && empty($inc['xray_performed_at'])) ? date('Y-m-d H:i:s') : $inc['xray_performed_at'];
            $foundLoc = $data['found_location_details'] ?? $inc['found_location_details'];
            $investigator = trim($data['investigated_by_name'] ?? ($inc['investigated_by_name'] ?? 'CSSD QA Specialist'));
            $resNotes = $data['resolution_notes'] ?? $inc['resolution_notes'];
            $corrective = $data['corrective_action'] ?? $inc['corrective_action'];

            $isResolved = in_array($status, [
                'resolved_closed',
                'found_in_or_linens',
                'found_in_trash_bin',
                'xray_negative_cavity_clear',
                'confirmed_lost_written_off',
                'replaced_with_new_stock'
            ]);
            $resolvedAt = $isResolved ? date('Y-m-d H:i:s') : null;

            $update = $pdo->prepare("
                UPDATE `cssd_missing_instrument_logs` SET
                    `investigation_status` = ?,
                    `xray_ordered` = ?,
                    `xray_findings` = ?,
                    `xray_performed_at` = ?,
                    `found_location_details` = ?,
                    `investigated_by_name` = ?,
                    `resolved_at` = ?,
                    `resolution_notes` = ?,
                    `corrective_action` = ?,
                    `updated_at` = NOW()
                WHERE id = ?
            ");
            $update->execute([
                $status, $xrayOrdered, $xrayFindings, $xrayTime,
                $foundLoc, $investigator, $resolvedAt,
                $resNotes, $corrective, $id
            ]);

            // Check if all missing incidents for the physical tray have now been resolved
            $openCount = (int)$pdo->query("
                SELECT COUNT(*) FROM `cssd_missing_instrument_logs`
                WHERE physical_tray_id = {$inc['physical_tray_id']}
                  AND investigation_status IN ('active_search_in_or', 'portable_xray_ordered')
            ")->fetchColumn();

            if ($openCount === 0) {
                // Tray is cleared to leave quarantine!
                $pdo->prepare("
                    UPDATE `cssd_physical_trays` SET
                        `current_status` = 'dirty_received',
                        `current_location` = 'CSSD Decontamination Wash Bay',
                        `instrument_count_verified` = 1,
                        `missing_pieces_notes` = 'All missing piece incidents investigated and resolved. Cleared for decontamination.',
                        `updated_at` = NOW()
                    WHERE id = ? AND current_status = 'quarantined_missing_item'
                ")->execute([$inc['physical_tray_id']]);

                // Lifecycle event
                $pdo->prepare("
                    INSERT INTO `cssd_tray_lifecycle_events` (
                        `physical_tray_id`, `event_type`, `from_status`, `to_status`,
                        `location`, `operator_name`, `notes`
                    ) VALUES (?, 'wash_disinfection_completed', 'quarantined_missing_item', 'dirty_received', 'CSSD Decon Bay', ?, ?)
                ")->execute([
                    $inc['physical_tray_id'], $investigator,
                    "Incident #{$inc['incident_number']} resolved ({$status}). Tray released from quarantine to decontamination."
                ]);
            }

            $pdo->commit();

            return [
                'success' => true,
                'incident_id' => $id,
                'investigation_status' => $status,
                'is_resolved' => $isResolved,
                'tray_quarantine_cleared' => ($openCount === 0),
                'message' => "Incident #{$inc['incident_number']} updated successfully. Status: {$status}."
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
}
