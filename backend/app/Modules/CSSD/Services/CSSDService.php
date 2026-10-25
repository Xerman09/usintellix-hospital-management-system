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
            'specialty_distribution' => $specialties
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

        return [
            'specialties' => $specialties,
            'categories' => $categories,
            'statuses' => $statuses,
            'wrapper_types' => $wrapperTypes,
            'instrument_types' => $instrumentTypes,
            'modalities' => $modalities,
            'master_trays' => $masterTrays
        ];
    }
}
