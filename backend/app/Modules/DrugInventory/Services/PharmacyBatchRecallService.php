<?php

namespace App\Modules\DrugInventory\Services;

use App\Core\Database;
use PDO;

/**
 * Service for managing Drug Batch / Lot Recalls & Quarantine.
 *
 * Responsibilities:
 *   1. Track manufacturer and regulatory (FDA) drug batch recalls (Class I, II, III).
 *   2. Immediately quarantine all active on-hand lots across storage locations (warehouses).
 *   3. Trace all patients who were already dispensed the recalled medication/lot.
 *   4. Prevent dispensing or stock transfer of recalled lots.
 */
class PharmacyBatchRecallService
{
    /**
     * CREATE TABLE is DDL, and MySQL implicitly COMMITs on DDL -- even when
     * "IF NOT EXISTS" changes nothing. Running this inside a transaction
     * therefore commits it early, releases its row locks and drops its
     * savepoints. isLotRecalled() calls this once per candidate lot from
     * inside DispensingService::dispense()'s transaction, so the guard below
     * is what keeps that transaction alive (the same pattern
     * PrescriptionVerificationService already uses).
     */
    private static bool $schemaChecked = false;

    public static function ensureTableExists(?PDO $db = null): void
    {
        if (self::$schemaChecked) {
            return;
        }
        self::$schemaChecked = true;

        $db = $db ?: Database::connection();
        $db->exec("
            CREATE TABLE IF NOT EXISTS `pharmacy_batch_recalls` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `recall_number` VARCHAR(40) NOT NULL,
                `drug_id` INT UNSIGNED NOT NULL,
                `lot_number` VARCHAR(100) NOT NULL,
                `recall_class` ENUM('Class I', 'Class II', 'Class III') NOT NULL DEFAULT 'Class II',
                `reason` TEXT NOT NULL,
                `fda_advisory_ref` VARCHAR(120) NULL DEFAULT NULL,
                `status` ENUM('active', 'quarantined', 'returned_to_supplier', 'closed') NOT NULL DEFAULT 'active',
                `quarantined_lots_count` INT UNSIGNED NOT NULL DEFAULT 0,
                `quarantined_quantity` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
                `affected_patients_count` INT UNSIGNED NOT NULL DEFAULT 0,
                `initiated_by` INT UNSIGNED NULL DEFAULT NULL,
                `initiated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `closed_by` INT UNSIGNED NULL DEFAULT NULL,
                `closed_at` DATETIME NULL DEFAULT NULL,
                `notes` TEXT NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uq_pharmacy_recall_number` (`recall_number`),
                KEY `idx_pharmacy_recall_drug_lot` (`drug_id`, `lot_number`),
                KEY `idx_pharmacy_recall_status` (`status`)
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
     * List all batch recalls with drug details and metrics.
     */
    public function listRecalls(array $filters = []): array
    {
        $db = Database::connection();
        self::ensureTableExists($db);

        $where = [];
        $params = [];

        if (!empty($filters['status'])) {
            $where[] = 'r.status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['drug_id'])) {
            $where[] = 'r.drug_id = :drug_id';
            $params['drug_id'] = (int) $filters['drug_id'];
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $userSql = self::userNameSql('r.initiated_by');

        $stmt = $db->prepare("
            SELECT r.*,
                   d.name AS drug_name,
                   d.generic_name,
                   d.strength,
                   du.name AS unit_name,
                   {$userSql} AS initiated_by_name
            FROM pharmacy_batch_recalls r
            JOIN drugs d ON d.id = r.drug_id
            LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
            {$whereClause}
            ORDER BY r.initiated_at DESC, r.id DESC
        ");
        $stmt->execute($params);

        return array_map(function ($row) {
            $row['id'] = (int) $row['id'];
            $row['drug_id'] = (int) $row['drug_id'];
            $row['quarantined_lots_count'] = (int) $row['quarantined_lots_count'];
            $row['quarantined_quantity'] = (float) $row['quarantined_quantity'];
            $row['affected_patients_count'] = (int) $row['affected_patients_count'];
            $row['initiated_by_name'] = trim($row['initiated_by_name']) ?: 'Staff';
            return $row;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Check if a specific drug & lot number is currently under active recall.
     */
    public static function isLotRecalled(int $drugId, string $lotNumber): ?array
    {
        $db = Database::connection();
        self::ensureTableExists($db);

        $stmt = $db->prepare("
            SELECT id, recall_number, recall_class, reason, status
            FROM pharmacy_batch_recalls
            WHERE drug_id = :drug_id
              AND lot_number = :lot_number
              AND status IN ('active', 'quarantined')
            ORDER BY id DESC
            LIMIT 1
        ");
        $stmt->execute(['drug_id' => $drugId, 'lot_number' => trim($lotNumber)]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /**
     * Initiate a batch recall:
     *   1. Inserts into pharmacy_batch_recalls
     *   2. Finds and marks matching drug_inventory_lots inactive/quarantined
     *   3. Scans for all patients previously dispensed this lot
     */
    public function createRecall(array $data, int $userId): array
    {
        $db = Database::connection();
        self::ensureTableExists($db);

        $drugId = (int) ($data['drug_id'] ?? 0);
        $lotNumber = trim((string) ($data['lot_number'] ?? ''));
        $recallClass = $data['recall_class'] ?? 'Class II';
        $reason = trim((string) ($data['reason'] ?? ''));
        $fdaRef = !empty($data['fda_advisory_ref']) ? trim((string) $data['fda_advisory_ref']) : null;
        $notes = !empty($data['notes']) ? trim((string) $data['notes']) : null;

        if ($drugId <= 0) {
            return ['success' => false, 'message' => 'Please select a valid drug.'];
        }
        if ($lotNumber === '') {
            return ['success' => false, 'message' => 'Please enter the recalled lot number.'];
        }
        if ($reason === '') {
            return ['success' => false, 'message' => 'Please enter the reason for the recall.'];
        }

        // Check if active recall already exists for this lot
        $existing = self::isLotRecalled($drugId, $lotNumber);
        if ($existing) {
            return ['success' => false, 'message' => "An active recall ({$existing['recall_number']}) already exists for this batch/lot."];
        }

        $now = date('Y-m-d H:i:s');
        $ownsTx = !$db->inTransaction();
        if ($ownsTx) {
            $db->beginTransaction();
        }

        try {
            // Find existing on-hand stock for this lot across all warehouses
            $lotStmt = $db->prepare("
                SELECT id, warehouse_id, quantity_on_hand, is_active
                FROM drug_inventory_lots
                WHERE drug_id = :drug_id
                  AND lot_number = :lot_number
                  AND deleted_at IS NULL
                FOR UPDATE
            ");
            $lotStmt->execute(['drug_id' => $drugId, 'lot_number' => $lotNumber]);
            $matchingLots = $lotStmt->fetchAll(PDO::FETCH_ASSOC);

            $quarantinedCount = 0;
            $quarantinedQty = 0.0;
            $lotIds = [];

            $deactivateStmt = $db->prepare("
                UPDATE drug_inventory_lots
                SET is_active = 0,
                    updated_at = :now,
                    updated_by = :user
                WHERE id = :id
            ");

            foreach ($matchingLots as $l) {
                $qty = (float) $l['quantity_on_hand'];
                if ($qty > 0) {
                    $quarantinedQty += $qty;
                }
                $quarantinedCount++;
                $lotIds[] = (int) $l['id'];

                $deactivateStmt->execute([
                    'now' => $now,
                    'user' => $userId ?: 1,
                    'id' => (int) $l['id']
                ]);
            }

            // Find all affected patients who were previously dispensed this lot
            $affectedPatients = $this->traceAffectedPatients($drugId, $lotNumber);
            $affectedCount = count($affectedPatients);

            // Generate recall number
            $recallNumber = 'RCL-' . date('Y') . '-' . str_pad((string) (mt_rand(1, 99999)), 5, '0', STR_PAD_LEFT);

            $insertStmt = $db->prepare("
                INSERT INTO pharmacy_batch_recalls (
                    recall_number, drug_id, lot_number, recall_class, reason,
                    fda_advisory_ref, status, quarantined_lots_count, quarantined_quantity,
                    affected_patients_count, initiated_by, initiated_at, notes
                ) VALUES (
                    :num, :drug_id, :lot, :class, :reason,
                    :fda, 'quarantined', :q_count, :q_qty,
                    :p_count, :user, :now, :notes
                )
            ");
            $insertStmt->execute([
                'num' => $recallNumber,
                'drug_id' => $drugId,
                'lot' => $lotNumber,
                'class' => $recallClass,
                'reason' => $reason,
                'fda' => $fdaRef,
                'q_count' => $quarantinedCount,
                'q_qty' => round($quarantinedQty, 3),
                'p_count' => $affectedCount,
                'user' => $userId ?: 1,
                'now' => $now,
                'notes' => $notes
            ]);
            $recallId = (int) $db->lastInsertId();

            // Format precise recall number with insert ID
            $formattedNumber = 'RCL-' . date('Y') . '-' . str_pad((string) $recallId, 5, '0', STR_PAD_LEFT);
            $db->prepare("UPDATE pharmacy_batch_recalls SET recall_number = :num WHERE id = :id")
               ->execute(['num' => $formattedNumber, 'id' => $recallId]);

            if ($ownsTx) {
                $db->commit();
            }

            return [
                'success' => true,
                'message' => "Batch Recall {$formattedNumber} initiated. {$quarantinedCount} storage lot(s) ({$quarantinedQty} units) immediately quarantined. {$affectedCount} dispensed patient(s) identified for notification.",
                'data' => [
                    'id' => $recallId,
                    'recall_number' => $formattedNumber,
                    'quarantined_lots_count' => $quarantinedCount,
                    'quarantined_quantity' => round($quarantinedQty, 3),
                    'affected_patients_count' => $affectedCount,
                    'affected_patients' => $affectedPatients
                ]
            ];
        } catch (\Throwable $e) {
            if ($ownsTx && $db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Trace all patients who were dispensed medication from a recalled batch/lot.
     */
    public function traceAffectedPatients(int $drugId, string $lotNumber): array
    {
        $db = Database::connection();

        $docSql = self::userNameSql('rx.prescriber_user_id');

        $stmt = $db->prepare("
            SELECT DISTINCT
                p.id AS patient_id,
                p.patient_no,
                CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                COALESCE(pc.mobile_phone, pc.home_phone, pc.work_phone) AS phone_number,
                p.sex,
                p.birthdate,
                pd.id AS dispense_id,
                pd.dispense_number,
                pd.dispensed_date,
                pdi.quantity AS quantity_dispensed,
                rx.rx_number,
                {$docSql} AS prescribing_doctor,
                w.name AS dispensed_warehouse_name
            FROM prescription_dispense_items pdi
            JOIN prescription_dispenses pd ON pd.id = pdi.dispense_id AND pd.status = 'completed'
            JOIN drug_inventory_lots dil ON dil.id = pdi.lot_id
            JOIN patients p ON p.id = pd.patient_id
            LEFT JOIN patient_contacts pc ON pc.patient_id = p.id
            JOIN prescriptions rx ON rx.id = pd.prescription_id
            LEFT JOIN warehouses w ON w.id = pd.warehouse_id
            WHERE dil.drug_id = :drug_id
              AND dil.lot_number = :lot_number
            ORDER BY pd.dispensed_date DESC, pd.id DESC
        ");
        $stmt->execute(['drug_id' => $drugId, 'lot_number' => trim($lotNumber)]);

        return array_map(function ($row) {
            $age = null;
            if (!empty($row['birthdate'])) {
                try {
                    $age = (new \DateTime($row['birthdate']))->diff(new \DateTime())->y;
                } catch (\Throwable $e) {}
            }
            return [
                'patient_id' => (int) $row['patient_id'],
                'patient_no' => $row['patient_no'],
                'patient_name' => trim($row['patient_name']),
                'phone_number' => $row['phone_number'] ?: '—',
                'sex' => $row['sex'],
                'age' => $age,
                'dispense_id' => (int) $row['dispense_id'],
                'dispense_number' => $row['dispense_number'],
                'dispensed_date' => $row['dispensed_date'],
                'quantity_dispensed' => (float) $row['quantity_dispensed'],
                'rx_number' => $row['rx_number'],
                'prescribing_doctor' => trim($row['prescribing_doctor']) ?: 'Staff',
                'dispensed_warehouse_name' => $row['dispensed_warehouse_name'] ?: 'Pharmacy'
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Get complete details of a recall, including quarantined lots & affected patients.
     */
    public function getRecallDetails(int $id): ?array
    {
        $db = Database::connection();
        self::ensureTableExists($db);

        $initSql = self::userNameSql('r.initiated_by');
        $closedSql = self::userNameSql('r.closed_by');

        $stmt = $db->prepare("
            SELECT r.*,
                   d.name AS drug_name,
                   d.generic_name,
                   d.strength,
                   du.name AS unit_name,
                   {$initSql} AS initiated_by_name,
                   {$closedSql} AS closed_by_name
            FROM pharmacy_batch_recalls r
            JOIN drugs d ON d.id = r.drug_id
            LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
            WHERE r.id = :id
        ");
        $stmt->execute(['id' => $id]);
        $recall = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$recall) {
            return null;
        }

        $recall['id'] = (int) $recall['id'];
        $recall['drug_id'] = (int) $recall['drug_id'];
        $recall['quarantined_lots_count'] = (int) $recall['quarantined_lots_count'];
        $recall['quarantined_quantity'] = (float) $recall['quarantined_quantity'];
        $recall['affected_patients_count'] = (int) $recall['affected_patients_count'];

        // Fetch on-hand lots for this recalled batch
        $lotStmt = $db->prepare("
            SELECT dil.id, dil.warehouse_id, w.name AS warehouse_name,
                   dil.lot_number, dil.quantity_on_hand, dil.expires_date, dil.is_active
            FROM drug_inventory_lots dil
            JOIN warehouses w ON w.id = dil.warehouse_id
            WHERE dil.drug_id = :drug_id
              AND dil.lot_number = :lot_number
              AND dil.deleted_at IS NULL
            ORDER BY w.name ASC
        ");
        $lotStmt->execute(['drug_id' => $recall['drug_id'], 'lot_number' => $recall['lot_number']]);
        $quarantinedLots = array_map(function ($l) {
            return [
                'id' => (int) $l['id'],
                'warehouse_id' => (int) $l['warehouse_id'],
                'warehouse_name' => $l['warehouse_name'],
                'lot_number' => $l['lot_number'],
                'quantity_on_hand' => (float) $l['quantity_on_hand'],
                'expires_date' => $l['expires_date'],
                'is_active' => (bool) $l['is_active']
            ];
        }, $lotStmt->fetchAll(PDO::FETCH_ASSOC));

        // Fetch patients who received this lot
        $affectedPatients = $this->traceAffectedPatients($recall['drug_id'], $recall['lot_number']);

        return [
            'recall' => $recall,
            'quarantined_lots' => $quarantinedLots,
            'affected_patients' => $affectedPatients
        ];
    }

    /**
     * Update status of recall: 'quarantined', 'returned_to_supplier', 'closed'
     */
    public function updateRecallStatus(int $id, string $status, ?string $notes, int $userId): array
    {
        $db = Database::connection();
        self::ensureTableExists($db);

        $validStatuses = ['active', 'quarantined', 'returned_to_supplier', 'closed'];
        if (!in_array($status, $validStatuses, true)) {
            return ['success' => false, 'message' => 'Invalid recall status.'];
        }

        $now = date('Y-m-d H:i:s');
        $isClosing = ($status === 'closed');

        $stmt = $db->prepare("
            UPDATE pharmacy_batch_recalls
            SET status = :status,
                notes = COALESCE(:notes, notes),
                closed_at = CASE WHEN :is_closing = 1 THEN :now ELSE closed_at END,
                closed_by = CASE WHEN :is_closing = 1 THEN :user ELSE closed_by END
            WHERE id = :id
        ");
        $stmt->execute([
            'status' => $status,
            'notes' => $notes ? trim($notes) : null,
            'is_closing' => $isClosing ? 1 : 0,
            'now' => $now,
            'user' => $userId ?: 1,
            'id' => $id
        ]);

        return ['success' => true, 'message' => "Batch recall status updated to {$status}."];
    }
}
