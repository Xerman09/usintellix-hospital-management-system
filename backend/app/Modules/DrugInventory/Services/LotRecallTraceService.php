<?php

declare(strict_types=1);

namespace App\Modules\DrugInventory\Services;

use App\Core\Database;
use PDO;

/**
 * Service for the Lot Recall Trace Engine (pharmacy_lot_recalls).
 *
 * Provides:
 *   1. Instant multi-source trace by manufacturer lot number.
 *   2. Immediate breakdown of remaining on-hand hospital stock by storage location/warehouse.
 *   3. Complete patient distribution history across Outpatient Pharmacy and Inpatient MAR.
 *   4. Patient phone directory (Mobile, Home, Work, Emergency contact) for outreach.
 *   5. Instant hospital-wide quarantine lock for on-hand stock.
 *   6. Outreach tracking (contacted, voicemail, returned, adverse event).
 */
class LotRecallTraceService
{
    public static function ensureTablesExist(?PDO $db = null): void
    {
        $db = $db ?: Database::connection();
        $db->exec("
            CREATE TABLE IF NOT EXISTS `pharmacy_lot_recalls` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `recall_reference` VARCHAR(50) NOT NULL,
                `lot_number` VARCHAR(100) NOT NULL,
                `drug_id` INT UNSIGNED NULL DEFAULT NULL,
                `drug_name` VARCHAR(255) NULL DEFAULT NULL,
                `recall_class` ENUM('Class I', 'Class II', 'Class III') NOT NULL DEFAULT 'Class II',
                `recall_reason` TEXT NOT NULL,
                `manufacturer_name` VARCHAR(150) NULL DEFAULT NULL,
                `fda_advisory_ref` VARCHAR(120) NULL DEFAULT NULL,
                `status` ENUM('active', 'quarantined', 'patient_outreach_in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'active',
                `remaining_stock_units` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
                `affected_warehouses_count` INT UNSIGNED NOT NULL DEFAULT 0,
                `affected_patients_count` INT UNSIGNED NOT NULL DEFAULT 0,
                `total_dispensed_units` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
                `contacted_patients_count` INT UNSIGNED NOT NULL DEFAULT 0,
                `initiated_by` INT UNSIGNED NULL DEFAULT NULL,
                `initiated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `closed_by` INT UNSIGNED NULL DEFAULT NULL,
                `closed_at` DATETIME NULL DEFAULT NULL,
                `action_notes` TEXT NULL DEFAULT NULL,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uq_pharmacy_lot_recall_ref` (`recall_reference`),
                KEY `idx_pharmacy_lot_recall_lot` (`lot_number`),
                KEY `idx_pharmacy_lot_recall_drug` (`drug_id`),
                KEY `idx_pharmacy_lot_recall_status` (`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $db->exec("
            CREATE TABLE IF NOT EXISTS `pharmacy_lot_recall_outreach` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `recall_id` INT UNSIGNED NULL DEFAULT NULL,
                `lot_number` VARCHAR(100) NOT NULL,
                `patient_id` INT NOT NULL,
                `dispense_source` VARCHAR(50) NOT NULL DEFAULT 'Outpatient Pharmacy',
                `dispense_reference` VARCHAR(100) NULL DEFAULT NULL,
                `dispensed_date` DATE NULL DEFAULT NULL,
                `dispensed_quantity` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
                `outreach_status` ENUM('pending', 'contacted_informed', 'voicemail_left', 'unreachable', 'product_returned', 'replacement_dispensed', 'adverse_event') NOT NULL DEFAULT 'pending',
                `contacted_phone` VARCHAR(50) NULL DEFAULT NULL,
                `contact_attempt_count` INT UNSIGNED NOT NULL DEFAULT 0,
                `last_contact_attempt_at` DATETIME NULL DEFAULT NULL,
                `contacted_by` INT UNSIGNED NULL DEFAULT NULL,
                `patient_response_notes` TEXT NULL DEFAULT NULL,
                `units_returned` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
                `replacement_issued` TINYINT(1) NOT NULL DEFAULT 0,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_recall_outreach_recall` (`recall_id`),
                KEY `idx_recall_outreach_lot` (`lot_number`),
                KEY `idx_recall_outreach_patient` (`patient_id`),
                KEY `idx_recall_outreach_status` (`outreach_status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }

    /**
     * Search lots for autocomplete in the trace dashboard.
     */
    public function searchLots(string $query, int $limit = 20): array
    {
        $db = Database::connection();
        $q = trim($query);

        $sql = "
            SELECT DISTINCT
                dil.lot_number,
                d.id AS drug_id,
                d.name AS drug_name,
                d.generic_name,
                d.strength,
                COALESCE(u.name, 'units') AS unit_name,
                SUM(CASE WHEN dil.deleted_at IS NULL THEN dil.quantity_on_hand ELSE 0 END) AS total_on_hand,
                MAX(dil.expires_date) AS expires_date,
                MAX(dil.is_quarantined) AS is_quarantined,
                (SELECT COUNT(DISTINCT r.id) FROM pharmacy_lot_recalls r WHERE r.lot_number = dil.lot_number AND r.status != 'closed') AS active_recalls_count
            FROM drug_inventory_lots dil
            JOIN drugs d ON d.id = dil.drug_id
            LEFT JOIN amount_units u ON u.id = d.dispensing_unit_id
            WHERE dil.lot_number LIKE :q
               OR d.name LIKE :q2
               OR d.generic_name LIKE :q3
            GROUP BY dil.lot_number, d.id, d.name, d.generic_name, d.strength, u.name
            ORDER BY dil.lot_number ASC
            LIMIT :lim
        ";

        $stmt = $db->prepare($sql);
        $stmt->bindValue(':q', "%{$q}%");
        $stmt->bindValue(':q2', "%{$q}%");
        $stmt->bindValue(':q3', "%{$q}%");
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return array_map(function ($r) {
            $r['drug_id'] = (int) $r['drug_id'];
            $r['total_on_hand'] = (float) $r['total_on_hand'];
            $r['is_quarantined'] = (bool) $r['is_quarantined'];
            $r['active_recalls_count'] = (int) $r['active_recalls_count'];
            return $r;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Trace a specific lot number:
     *   - Remaining hospital stock by warehouse
     *   - Complete patient distribution history with outreach phone numbers
     *   - Existing recall status & outreach progress
     */
    public function traceLot(string $lotNumber, ?int $drugId = null): array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $lotNumber = trim($lotNumber);
        if ($lotNumber === '') {
            return [
                'success' => false,
                'message' => 'Please provide a valid lot number to trace.'
            ];
        }

        // 1. Fetch matching drug(s) associated with this lot
        $drugParams = ['lot' => $lotNumber];
        $drugWhere = "dil.lot_number = :lot";
        if ($drugId && $drugId > 0) {
            $drugWhere .= " AND dil.drug_id = :did";
            $drugParams['did'] = $drugId;
        }

        $drugStmt = $db->prepare("
            SELECT DISTINCT
                d.id AS drug_id,
                d.name AS drug_name,
                d.generic_name,
                d.strength,
                COALESCE(u.name, 'units') AS unit_name,
                d.dosage_form_id,
                COALESCE(s.name, d.manufacturer, '—') AS primary_supplier_name
            FROM drug_inventory_lots dil
            JOIN drugs d ON d.id = dil.drug_id
            LEFT JOIN amount_units u ON u.id = d.dispensing_unit_id
            LEFT JOIN suppliers s ON s.id = d.preferred_supplier_id
            WHERE {$drugWhere}
            LIMIT 1
        ");
        $drugStmt->execute($drugParams);
        $drugInfo = $drugStmt->fetch(PDO::FETCH_ASSOC);

        // 2. Fetch Hospital On-Hand Stock by Warehouse
        $stockStmt = $db->prepare("
            SELECT
                dil.id AS lot_id,
                dil.warehouse_id,
                w.name AS warehouse_name,
                w.code AS warehouse_code,
                dil.lot_number,
                dil.quantity_on_hand,
                dil.expires_date,
                dil.is_quarantined,
                dil.quarantine_reason,
                dil.quarantined_at,
                dil.is_active,
                DATEDIFF(dil.expires_date, CURDATE()) AS days_to_expiry
            FROM drug_inventory_lots dil
            JOIN warehouses w ON w.id = dil.warehouse_id
            WHERE dil.lot_number = :lot
              AND dil.deleted_at IS NULL
            ORDER BY w.name ASC
        ");
        $stockStmt->execute(['lot' => $lotNumber]);
        $stockRows = $stockStmt->fetchAll(PDO::FETCH_ASSOC);

        $totalRemainingStock = 0.0;
        $totalQuarantinedStock = 0.0;
        $unquarantinedUnits = 0.0;
        $warehousesCount = count($stockRows);

        $hospitalStock = [];
        foreach ($stockRows as $row) {
            $qty = (float) $row['quantity_on_hand'];
            $isQuarantined = (bool) $row['is_quarantined'];
            $totalRemainingStock += $qty;
            if ($isQuarantined) {
                $totalQuarantinedStock += $qty;
            } else {
                $unquarantinedUnits += $qty;
            }

            $hospitalStock[] = [
                'lot_id' => (int) $row['lot_id'],
                'warehouse_id' => (int) $row['warehouse_id'],
                'warehouse_name' => $row['warehouse_name'],
                'warehouse_code' => $row['warehouse_code'],
                'lot_number' => $row['lot_number'],
                'quantity_on_hand' => $qty,
                'expires_date' => $row['expires_date'],
                'days_to_expiry' => $row['days_to_expiry'] !== null ? (int) $row['days_to_expiry'] : null,
                'is_quarantined' => $isQuarantined,
                'quarantine_reason' => $row['quarantine_reason'],
                'quarantined_at' => $row['quarantined_at'],
                'is_active' => (bool) $row['is_active']
            ];
        }

        // 3. Fetch Existing Recall Record & Outreach entries
        $recallStmt = $db->prepare("
            SELECT r.*,
                   " . self::userNameSql('r.initiated_by') . " AS initiated_by_name,
                   " . self::userNameSql('r.closed_by') . " AS closed_by_name
            FROM pharmacy_lot_recalls r
            WHERE r.lot_number = :lot
            ORDER BY r.id DESC
            LIMIT 1
        ");
        $recallStmt->execute(['lot' => $lotNumber]);
        $activeRecall = $recallStmt->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($activeRecall) {
            $activeRecall['id'] = (int) $activeRecall['id'];
            $activeRecall['remaining_stock_units'] = (float) $activeRecall['remaining_stock_units'];
            $activeRecall['affected_patients_count'] = (int) $activeRecall['affected_patients_count'];
            $activeRecall['total_dispensed_units'] = (float) $activeRecall['total_dispensed_units'];
            $activeRecall['contacted_patients_count'] = (int) $activeRecall['contacted_patients_count'];
        }

        // 4. Fetch Complete Patient Distribution History:
        // Sources: Outpatient Pharmacy Dispenses + Inpatient MAR Administrations
        $docSql = self::userNameSql('rx.prescriber_user_id');
        $dispenserSql = self::userNameSql('pd.created_by');

        $outpatientStmt = $db->prepare("
            SELECT
                'Outpatient Pharmacy' AS dispense_source,
                p.id AS patient_id,
                p.patient_no,
                CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                p.birthdate,
                p.sex,
                pc.mobile_phone,
                pc.home_phone,
                pc.work_phone,
                pc.email,
                CONCAT_WS(', ', NULLIF(pc.address_line, ''), NULLIF(pc.city, ''), NULLIF(pc.province, '')) AS address,
                pec.contact_name AS emergency_contact_name,
                pec.relationship AS emergency_contact_relationship,
                pec.phone AS emergency_contact_phone,
                pd.id AS dispense_id,
                pd.dispense_number AS reference_number,
                pd.dispensed_date,
                pdi.created_at AS dispensed_at,
                pdi.quantity AS quantity_dispensed,
                pdi.unit_cost,
                rx.rx_number,
                {$docSql} AS prescribing_doctor,
                {$dispenserSql} AS dispensing_staff,
                w.name AS dispensed_warehouse_name
            FROM prescription_dispense_items pdi
            JOIN prescription_dispenses pd ON pd.id = pdi.dispense_id AND pd.status = 'completed'
            JOIN drug_inventory_lots dil ON dil.id = pdi.lot_id
            JOIN patients p ON p.id = pd.patient_id
            LEFT JOIN patient_contacts pc ON pc.patient_id = p.id
            LEFT JOIN patient_emergency_contacts pec ON pec.patient_id = p.id
            LEFT JOIN prescriptions rx ON rx.id = pd.prescription_id
            LEFT JOIN warehouses w ON w.id = pd.warehouse_id
            WHERE dil.lot_number = :lot
            ORDER BY pd.dispensed_date DESC, pd.id DESC
        ");
        $outpatientStmt->execute(['lot' => $lotNumber]);
        $outpatientRows = $outpatientStmt->fetchAll(PDO::FETCH_ASSOC);

        // Inpatient MAR Administrations
        $adminNurseSql = self::userNameSql('ima.recorded_by');
        $inpatientStmt = $db->prepare("
            SELECT
                'Inpatient Ward MAR' AS dispense_source,
                p.id AS patient_id,
                p.patient_no,
                CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                p.birthdate,
                p.sex,
                pc.mobile_phone,
                pc.home_phone,
                pc.work_phone,
                pc.email,
                CONCAT_WS(', ', NULLIF(pc.address_line, ''), NULLIF(pc.city, ''), NULLIF(pc.province, '')) AS address,
                pec.contact_name AS emergency_contact_name,
                pec.relationship AS emergency_contact_relationship,
                pec.phone AS emergency_contact_phone,
                imal.administration_id AS dispense_id,
                CONCAT('MAR-ADM-', ima.admission_id) AS reference_number,
                DATE(imal.created_at) AS dispensed_date,
                imal.created_at AS dispensed_at,
                imal.quantity AS quantity_dispensed,
                imal.unit_cost,
                CONCAT('IPD-ORDER-', ima.order_id) AS rx_number,
                'Attending Physician' AS prescribing_doctor,
                {$adminNurseSql} AS dispensing_staff,
                w.name AS dispensed_warehouse_name
            FROM inpatient_med_admin_lots imal
            JOIN inpatient_med_administrations ima ON ima.id = imal.administration_id AND imal.returned_at IS NULL
            JOIN admissions adm ON adm.id = ima.admission_id
            JOIN patients p ON p.id = adm.patient_id
            LEFT JOIN patient_contacts pc ON pc.patient_id = p.id
            LEFT JOIN patient_emergency_contacts pec ON pec.patient_id = p.id
            JOIN drug_inventory_lots dil ON dil.id = imal.lot_id
            LEFT JOIN warehouses w ON w.id = dil.warehouse_id
            WHERE dil.lot_number = :lot
            ORDER BY imal.created_at DESC
        ");
        $inpatientRows = [];
        try {
            $inpatientStmt->execute(['lot' => $lotNumber]);
            $inpatientRows = $inpatientStmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {}

        // Combine distributions and attach outreach statuses
        $allDispensed = array_merge($outpatientRows, $inpatientRows);

        // Fetch outreach status map for this lot
        $outreachStmt = $db->prepare("
            SELECT *
            FROM pharmacy_lot_recall_outreach
            WHERE lot_number = :lot
        ");
        $outreachStmt->execute(['lot' => $lotNumber]);
        $outreachRecords = $outreachStmt->fetchAll(PDO::FETCH_ASSOC);
        $outreachMap = [];
        foreach ($outreachRecords as $rec) {
            $key = $rec['patient_id'] . '_' . ($rec['dispense_reference'] ?: '');
            $outreachMap[$key] = $rec;
            $outreachMap['pat_' . $rec['patient_id']] = $rec;
        }

        $patientList = [];
        $totalDispensedQty = 0.0;
        $uniquePatients = [];
        $contactedCount = 0;

        foreach ($allDispensed as $row) {
            $pid = (int) $row['patient_id'];
            $uniquePatients[$pid] = true;
            $qty = (float) $row['quantity_dispensed'];
            $totalDispensedQty += $qty;

            // Age calculation
            $age = null;
            if (!empty($row['birthdate'])) {
                try {
                    $age = (new \DateTime($row['birthdate']))->diff(new \DateTime())->y;
                } catch (\Throwable $e) {}
            }

            // Determine outreach status
            $outKey = $pid . '_' . ($row['reference_number'] ?: '');
            $outreach = $outreachMap[$outKey] ?? $outreachMap['pat_' . $pid] ?? null;

            $status = $outreach ? $outreach['outreach_status'] : 'pending';
            if (in_array($status, ['contacted_informed', 'product_returned', 'replacement_dispensed', 'adverse_event'], true)) {
                $contactedCount++;
            }

            // Preferred phone priority: Mobile -> Home -> Work -> Emergency
            $primaryPhone = $row['mobile_phone'] ?: ($row['home_phone'] ?: ($row['work_phone'] ?: ($row['emergency_contact_phone'] ?: null)));

            $patientList[] = [
                'outreach_id' => $outreach ? (int) $outreach['id'] : null,
                'patient_id' => $pid,
                'patient_no' => $row['patient_no'],
                'patient_name' => trim($row['patient_name']),
                'sex' => $row['sex'],
                'age' => $age,
                'birthdate' => $row['birthdate'],
                'primary_phone' => $primaryPhone ?: 'None Recorded',
                'mobile_phone' => $row['mobile_phone'],
                'home_phone' => $row['home_phone'],
                'work_phone' => $row['work_phone'],
                'emergency_contact' => $row['emergency_contact_phone']
                    ? "{$row['emergency_contact_name']} ({$row['emergency_contact_relationship']}): {$row['emergency_contact_phone']}"
                    : null,
                'email' => $row['email'],
                'address' => $row['address'] ?: 'None Recorded',
                'dispense_source' => $row['dispense_source'],
                'dispense_id' => (int) $row['dispense_id'],
                'reference_number' => $row['reference_number'],
                'dispensed_date' => $row['dispensed_date'],
                'dispensed_at' => $row['dispensed_at'],
                'quantity_dispensed' => $qty,
                'rx_number' => $row['rx_number'] ?: '—',
                'prescribing_doctor' => trim($row['prescribing_doctor']) ?: 'Physician',
                'dispensing_staff' => trim($row['dispensing_staff']) ?: 'Pharmacist',
                'dispensed_warehouse_name' => $row['dispensed_warehouse_name'] ?: 'Pharmacy',
                'outreach_status' => $status,
                'last_contact_attempt_at' => $outreach['last_contact_attempt_at'] ?? null,
                'contact_attempt_count' => (int) ($outreach['contact_attempt_count'] ?? 0),
                'patient_response_notes' => $outreach['patient_response_notes'] ?? null,
                'units_returned' => (float) ($outreach['units_returned'] ?? 0),
                'replacement_issued' => (bool) ($outreach['replacement_issued'] ?? false)
            ];
        }

        return [
            'success' => true,
            'lot_number' => $lotNumber,
            'drug' => $drugInfo ?: [
                'drug_id' => null,
                'drug_name' => 'Uncataloged / Multiple Products',
                'generic_name' => '—',
                'strength' => '—',
                'unit_name' => 'units',
                'primary_supplier_name' => '—'
            ],
            'hospital_stock' => [
                'warehouses_count' => $warehousesCount,
                'total_remaining_units' => round($totalRemainingStock, 3),
                'total_quarantined_units' => round($totalQuarantinedStock, 3),
                'unquarantined_units' => round($unquarantinedUnits, 3),
                'all_quarantined' => ($unquarantinedUnits <= 0 && $warehousesCount > 0),
                'breakdown' => $hospitalStock
            ],
            'patient_distribution' => [
                'total_dispensed_units' => round($totalDispensedQty, 3),
                'unique_patients_count' => count($uniquePatients),
                'total_dispense_records' => count($patientList),
                'contacted_count' => $contactedCount,
                'pending_outreach_count' => count($patientList) - $contactedCount,
                'patients' => $patientList
            ],
            'active_recall' => $activeRecall
        ];
    }

    /**
     * Quarantine all hospital stock for this lot across all warehouses immediately.
     */
    public function quarantineLotStock(string $lotNumber, string $reason, int $userId): array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $lotNumber = trim($lotNumber);
        $reason = trim($reason) ?: 'Immediate Manufacturer / Regulatory Lot Quarantine';

        if ($lotNumber === '') {
            return ['success' => false, 'message' => 'Lot number is required.'];
        }

        $now = date('Y-m-d H:i:s');

        // Find matching lots
        $stmt = $db->prepare("
            SELECT id, warehouse_id, quantity_on_hand, is_quarantined
            FROM drug_inventory_lots
            WHERE lot_number = :lot
              AND deleted_at IS NULL
        ");
        $stmt->execute(['lot' => $lotNumber]);
        $lots = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($lots)) {
            return ['success' => false, 'message' => "No active hospital stock records found for lot '{$lotNumber}'."];
        }

        $upStmt = $db->prepare("
            UPDATE drug_inventory_lots
            SET is_quarantined = 1,
                is_active = 0,
                quarantine_reason = :reason,
                quarantined_at = :now,
                quarantined_by = :user,
                updated_at = :now,
                updated_by = :user
            WHERE id = :id
        ");

        $affectedCount = 0;
        $totalQty = 0.0;
        foreach ($lots as $l) {
            $upStmt->execute([
                'reason' => mb_substr($reason, 0, 255),
                'now' => $now,
                'user' => $userId ?: 1,
                'id' => (int) $l['id']
            ]);
            $affectedCount++;
            $totalQty += (float) $l['quantity_on_hand'];
        }

        // Log into pharmacy_quarantine_logs
        $db->prepare("
            INSERT INTO pharmacy_quarantine_logs
                (execution_type, threshold_days, target_date, lots_quarantined_count, total_quantity_quarantined, executed_by, executed_at, summary_notes, details)
            VALUES
                ('lot_recall_quarantine', 0, CURDATE(), :cnt, :qty, :user, :now, :summary, :details)
        ")->execute([
            'cnt' => $affectedCount,
            'qty' => $totalQty,
            'user' => $userId ?: 1,
            'now' => $now,
            'summary' => "Manual lot quarantine lock applied to lot {$lotNumber}: {$reason}",
            'details' => json_encode(['lot_number' => $lotNumber, 'reason' => $reason, 'affected_lots' => array_column($lots, 'id')])
        ]);

        return [
            'success' => true,
            'message' => "Quarantine lock applied to lot {$lotNumber}. {$affectedCount} storage lot(s) ({$totalQty} units) locked across all hospital locations.",
            'affected_count' => $affectedCount,
            'total_quantity_quarantined' => $totalQty
        ];
    }

    /**
     * Create a formal Lot Recall and seed outreach tasks for all affected patients.
     */
    public function createRecall(array $data, int $userId): array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $lotNumber = trim((string) ($data['lot_number'] ?? ''));
        $recallClass = $data['recall_class'] ?? 'Class II';
        $reason = trim((string) ($data['recall_reason'] ?? $data['reason'] ?? ''));
        $manufacturer = trim((string) ($data['manufacturer_name'] ?? ''));
        $fdaRef = trim((string) ($data['fda_advisory_ref'] ?? ''));
        $notes = trim((string) ($data['action_notes'] ?? $data['notes'] ?? ''));

        if ($lotNumber === '') {
            return ['success' => false, 'message' => 'Please provide a valid lot number.'];
        }
        if ($reason === '') {
            return ['success' => false, 'message' => 'Please provide the clinical/manufacturer reason for the recall.'];
        }

        // Perform instant trace to capture stock and patient snapshot
        $trace = $this->traceLot($lotNumber);
        $hospitalStock = $trace['hospital_stock'];
        $patientDist = $trace['patient_distribution'];
        $drugInfo = $trace['drug'];

        // Automatically quarantine all remaining on-hand stock
        $this->quarantineLotStock($lotNumber, "Manufacturer Recall ({$recallClass}): {$reason}", $userId);

        $now = date('Y-m-d H:i:s');
        $recallRef = 'REC-' . date('Y') . '-' . str_pad((string) mt_rand(1, 99999), 5, '0', STR_PAD_LEFT);

        $stmt = $db->prepare("
            INSERT INTO pharmacy_lot_recalls (
                recall_reference, lot_number, drug_id, drug_name, recall_class,
                recall_reason, manufacturer_name, fda_advisory_ref, status,
                remaining_stock_units, affected_warehouses_count, affected_patients_count,
                total_dispensed_units, contacted_patients_count, initiated_by, initiated_at, action_notes
            ) VALUES (
                :ref, :lot, :did, :dname, :class,
                :reason, :mfg, :fda, 'quarantined',
                :stock, :wh_count, :pat_count,
                :disp_units, 0, :user, :now, :notes
            )
        ");
        $stmt->execute([
            'ref' => $recallRef,
            'lot' => $lotNumber,
            'did' => $drugInfo['drug_id'] ?? null,
            'dname' => $drugInfo['drug_name'] ?? null,
            'class' => $recallClass,
            'reason' => $reason,
            'mfg' => $manufacturer ?: null,
            'fda' => $fdaRef ?: null,
            'stock' => $hospitalStock['total_remaining_units'],
            'wh_count' => $hospitalStock['warehouses_count'],
            'pat_count' => $patientDist['unique_patients_count'],
            'disp_units' => $patientDist['total_dispensed_units'],
            'user' => $userId ?: 1,
            'now' => $now,
            'notes' => $notes ?: null
        ]);
        $recallId = (int) $db->lastInsertId();

        // Format clean reference number
        $cleanRef = 'REC-' . date('Y') . '-' . str_pad((string) $recallId, 5, '0', STR_PAD_LEFT);
        $db->prepare("UPDATE pharmacy_lot_recalls SET recall_reference = :ref WHERE id = :id")
           ->execute(['ref' => $cleanRef, 'id' => $recallId]);

        // Seed outreach records for each dispensed patient
        $outreachInsert = $db->prepare("
            INSERT INTO pharmacy_lot_recall_outreach (
                recall_id, lot_number, patient_id, dispense_source, dispense_reference,
                dispensed_date, dispensed_quantity, outreach_status, contacted_phone,
                contact_attempt_count, created_at
            ) VALUES (
                :rid, :lot, :pid, :source, :ref,
                :date, :qty, 'pending', :phone,
                0, :now
            )
        ");

        $seededCount = 0;
        foreach ($patientDist['patients'] as $pat) {
            $outreachInsert->execute([
                'rid' => $recallId,
                'lot' => $lotNumber,
                'pid' => $pat['patient_id'],
                'source' => $pat['dispense_source'],
                'ref' => $pat['reference_number'],
                'date' => $pat['dispensed_date'],
                'qty' => $pat['quantity_dispensed'],
                'phone' => $pat['primary_phone'] !== 'None Recorded' ? $pat['primary_phone'] : null,
                'now' => $now
            ]);
            $seededCount++;
        }

        return [
            'success' => true,
            'message' => "Formal Lot Recall {$cleanRef} initialized. All on-hand units locked ({$hospitalStock['total_remaining_units']} units across {$hospitalStock['warehouses_count']} location(s)). {$seededCount} patient outreach records created.",
            'recall_id' => $recallId,
            'recall_reference' => $cleanRef,
            'affected_patients_count' => $patientDist['unique_patients_count'],
            'remaining_stock_units' => $hospitalStock['total_remaining_units']
        ];
    }

    /**
     * Update outreach attempt status for a dispensed patient.
     */
    public function updateOutreachStatus(int $outreachId, array $data, int $userId): array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $status = $data['outreach_status'] ?? 'contacted_informed';
        $phone = trim((string) ($data['contacted_phone'] ?? ''));
        $notes = trim((string) ($data['patient_response_notes'] ?? ''));
        $unitsReturned = (float) ($data['units_returned'] ?? 0);
        $replacementIssued = !empty($data['replacement_issued']) ? 1 : 0;
        $now = date('Y-m-d H:i:s');

        $stmt = $db->prepare("SELECT * FROM pharmacy_lot_recall_outreach WHERE id = :id");
        $stmt->execute(['id' => $outreachId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return ['success' => false, 'message' => 'Patient outreach record not found.'];
        }

        $attempts = (int) $row['contact_attempt_count'] + 1;

        $db->prepare("
            UPDATE pharmacy_lot_recall_outreach
            SET outreach_status = :status,
                contacted_phone = CASE WHEN :phone != '' THEN :phone ELSE contacted_phone END,
                patient_response_notes = :notes,
                units_returned = :returned,
                replacement_issued = :rep,
                contact_attempt_count = :attempts,
                last_contact_attempt_at = :now,
                contacted_by = :user,
                updated_at = :now
            WHERE id = :id
        ")->execute([
            'status' => $status,
            'phone' => $phone,
            'notes' => $notes ?: null,
            'returned' => $unitsReturned,
            'rep' => $replacementIssued,
            'attempts' => $attempts,
            'user' => $userId ?: 1,
            'now' => $now,
            'id' => $outreachId
        ]);

        // Update recall summary stats if linked to recall_id
        if (!empty($row['recall_id'])) {
            $db->prepare("
                UPDATE pharmacy_lot_recalls
                SET contacted_patients_count = (
                    SELECT COUNT(DISTINCT patient_id)
                    FROM pharmacy_lot_recall_outreach
                    WHERE recall_id = :rid
                      AND outreach_status IN ('contacted_informed', 'product_returned', 'replacement_dispensed', 'adverse_event')
                )
                WHERE id = :rid
            ")->execute(['rid' => $row['recall_id']]);
        }

        return [
            'success' => true,
            'message' => "Patient outreach documented as '{$status}'. Total contact attempts: {$attempts}."
        ];
    }

    /**
     * List all lot recalls with metrics.
     */
    public function listRecalls(array $filters = []): array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $where = [];
        $params = [];

        if (!empty($filters['status'])) {
            $where[] = 'r.status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['lot_number'])) {
            $where[] = 'r.lot_number LIKE :lot';
            $params['lot'] = '%' . trim($filters['lot_number']) . '%';
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $initSql = self::userNameSql('r.initiated_by');

        $stmt = $db->prepare("
            SELECT r.*,
                   d.name AS catalog_drug_name,
                   d.generic_name,
                   d.strength,
                   {$initSql} AS initiated_by_name
            FROM pharmacy_lot_recalls r
            LEFT JOIN drugs d ON d.id = r.drug_id
            {$whereClause}
            ORDER BY r.initiated_at DESC, r.id DESC
        ");
        $stmt->execute($params);

        return array_map(function ($r) {
            $r['id'] = (int) $r['id'];
            $r['remaining_stock_units'] = (float) $r['remaining_stock_units'];
            $r['affected_warehouses_count'] = (int) $r['affected_warehouses_count'];
            $r['affected_patients_count'] = (int) $r['affected_patients_count'];
            $r['total_dispensed_units'] = (float) $r['total_dispensed_units'];
            $r['contacted_patients_count'] = (int) $r['contacted_patients_count'];
            $r['initiated_by_name'] = trim($r['initiated_by_name']) ?: 'Staff';
            return $r;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Export complete patient distribution & outreach roster for a lot as CSV.
     */
    public function exportOutreachCsv(string $lotNumber): string
    {
        $trace = $this->traceLot($lotNumber);
        $patients = $trace['patient_distribution']['patients'];
        $drug = $trace['drug'];

        $out = fopen('php://memory', 'w+');

        // CSV Header
        fputcsv($out, [
            'Recall Lot Number',
            'Drug Name',
            'Patient MRN',
            'Patient Name',
            'Age',
            'Gender',
            'Primary Phone',
            'Mobile Phone',
            'Home Phone',
            'Emergency Contact & Phone',
            'Email',
            'Mailing Address',
            'Dispense Source',
            'Reference #',
            'Dispensed Date',
            'Quantity Dispensed',
            'Prescribing Doctor',
            'Dispensing Staff',
            'Outreach Status',
            'Last Contact Date',
            'Outreach Response Notes'
        ]);

        foreach ($patients as $p) {
            fputcsv($out, [
                $lotNumber,
                $drug['drug_name'],
                $p['patient_no'],
                $p['patient_name'],
                $p['age'] !== null ? $p['age'] : '—',
                ucfirst($p['sex']),
                $p['primary_phone'],
                $p['mobile_phone'] ?: '—',
                $p['home_phone'] ?: '—',
                $p['emergency_contact'] ?: '—',
                $p['email'] ?: '—',
                $p['address'],
                $p['dispense_source'],
                $p['reference_number'],
                $p['dispensed_date'],
                $p['quantity_dispensed'],
                $p['prescribing_doctor'],
                $p['dispensing_staff'],
                ucwords(str_replace('_', ' ', $p['outreach_status'])),
                $p['last_contact_attempt_at'] ?: '—',
                $p['patient_response_notes'] ?: '—'
            ]);
        }

        rewind($out);
        $csv = stream_get_contents($out);
        fclose($out);

        return $csv;
    }
}
