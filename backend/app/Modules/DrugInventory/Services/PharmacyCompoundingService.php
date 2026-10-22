<?php

declare(strict_types=1);

namespace App\Modules\DrugInventory\Services;

use App\Core\Database;
use PDO;

/**
 * Service for Extemporaneous Compounding & Specialized Formulations.
 * (pharmacy_compounding_records, pharmacy_compounding_ingredients, pharmacy_compounding_formulas)
 *
 * Responsibilities:
 *   1. Extemporaneous compounding workbook for IV admixtures, TPN, oncology dilutions, and pediatric suspensions.
 *   2. Master formula management with standard yields, default BUDs, and cleanroom hood specs.
 *   3. Raw ingredient batch lot tracking and consumption ledger.
 *   4. Beyond-Use Date (BUD) calculation and expiry monitoring.
 *   5. Mandatory dual pharmacist sign-offs (Preparation + Verification/Visual Inspection).
 */
class PharmacyCompoundingService
{
    public static function ensureTablesExist(?PDO $db = null): void
    {
        $db = $db ?: Database::connection();
        $db->exec("
            CREATE TABLE IF NOT EXISTS `pharmacy_compounding_formulas` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `formula_code` VARCHAR(50) NOT NULL,
                `name` VARCHAR(255) NOT NULL,
                `formulation_type` ENUM('iv_admixture', 'tpn', 'oncology_dilution', 'pediatric_suspension', 'ophthalmic', 'topical', 'other') NOT NULL DEFAULT 'iv_admixture',
                `target_drug_id` INT NULL DEFAULT NULL,
                `standard_yield_quantity` DECIMAL(12,3) NOT NULL DEFAULT 1.000,
                `yield_unit` VARCHAR(50) NOT NULL DEFAULT 'mL',
                `default_bud_hours` INT UNSIGNED NOT NULL DEFAULT 24,
                `default_storage_condition` VARCHAR(150) NOT NULL DEFAULT 'Refrigerate (2-8°C)',
                `default_cleanroom_hood` VARCHAR(100) NULL DEFAULT 'Laminar Flow Hood LFH-01',
                `standard_sop_instructions` TEXT NULL DEFAULT NULL,
                `is_sterile` TINYINT(1) NOT NULL DEFAULT 1,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `created_by` INT UNSIGNED NULL DEFAULT NULL,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uq_compounding_formula_code` (`formula_code`),
                KEY `idx_compounding_formula_type` (`formulation_type`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $db->exec("
            CREATE TABLE IF NOT EXISTS `pharmacy_compounding_records` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `compounding_number` VARCHAR(50) NOT NULL,
                `formula_id` INT UNSIGNED NULL DEFAULT NULL,
                `formulation_name` VARCHAR(255) NOT NULL,
                `formulation_type` ENUM('iv_admixture', 'tpn', 'oncology_dilution', 'pediatric_suspension', 'ophthalmic', 'topical', 'other') NOT NULL DEFAULT 'iv_admixture',
                `patient_id` INT NULL DEFAULT NULL,
                `prescription_id` INT NULL DEFAULT NULL,
                `encounter_id` INT NULL DEFAULT NULL,
                `admission_id` INT NULL DEFAULT NULL,
                `yield_quantity` DECIMAL(12,3) NOT NULL DEFAULT 1.000,
                `yield_unit` VARCHAR(50) NOT NULL DEFAULT 'mL',
                `cleanroom_hood_number` VARCHAR(100) NOT NULL,
                `cleanroom_suite` VARCHAR(100) NOT NULL DEFAULT 'Central Pharmacy Cleanroom Suite',
                `prepared_at` DATETIME NOT NULL,
                `beyond_use_date` DATETIME NOT NULL,
                `storage_condition` VARCHAR(150) NOT NULL DEFAULT 'Refrigerate (2-8°C)',
                `special_instructions` TEXT NULL DEFAULT NULL,
                `visual_inspection_checks` JSON NULL DEFAULT NULL,
                `status` ENUM('draft', 'prepared', 'inspected_approved', 'inspected_rejected', 'dispensed', 'discarded', 'voided') NOT NULL DEFAULT 'prepared',
                `resulting_lot_id` INT NULL DEFAULT NULL,
                `resulting_lot_number` VARCHAR(100) NULL DEFAULT NULL,
                `prepared_by_user_id` INT UNSIGNED NOT NULL,
                `preparation_notes` TEXT NULL DEFAULT NULL,
                `inspected_by_user_id` INT UNSIGNED NULL DEFAULT NULL,
                `inspected_at` DATETIME NULL DEFAULT NULL,
                `inspection_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
                `inspection_notes` TEXT NULL DEFAULT NULL,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uq_compounding_number` (`compounding_number`),
                KEY `idx_compounding_patient` (`patient_id`),
                KEY `idx_compounding_prescription` (`prescription_id`),
                KEY `idx_compounding_status` (`status`),
                KEY `idx_compounding_bud` (`beyond_use_date`),
                KEY `idx_compounding_prepared_at` (`prepared_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $db->exec("
            CREATE TABLE IF NOT EXISTS `pharmacy_compounding_ingredients` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `compounding_id` INT UNSIGNED NOT NULL,
                `drug_id` INT NULL DEFAULT NULL,
                `ingredient_name` VARCHAR(255) NOT NULL,
                `source_lot_id` INT NULL DEFAULT NULL,
                `source_lot_number` VARCHAR(100) NOT NULL,
                `source_lot_expiry` DATE NULL DEFAULT NULL,
                `source_warehouse_id` INT NULL DEFAULT NULL,
                `quantity_consumed` DECIMAL(12,3) NOT NULL,
                `unit` VARCHAR(50) NOT NULL,
                `unit_cost` DECIMAL(12,4) NULL DEFAULT 0.0000,
                `total_cost` DECIMAL(12,2) NULL DEFAULT 0.00,
                `notes` VARCHAR(255) NULL DEFAULT NULL,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `idx_comp_ing_record` (`compounding_id`),
                KEY `idx_comp_ing_lot` (`source_lot_id`),
                KEY `idx_comp_ing_lot_number` (`source_lot_number`),
                CONSTRAINT `fk_comp_ing_record` FOREIGN KEY (`compounding_id`) REFERENCES `pharmacy_compounding_records` (`id`) ON DELETE CASCADE
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
     * List compounding records with filters and calculated expiry badges.
     */
    public function listRecords(array $filters = []): array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $where = [];
        $params = [];

        if (!empty($filters['status'])) {
            $where[] = 'r.status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['formulation_type'])) {
            $where[] = 'r.formulation_type = :type';
            $params['type'] = $filters['formulation_type'];
        }

        if (!empty($filters['patient_id'])) {
            $where[] = 'r.patient_id = :pid';
            $params['pid'] = (int) $filters['patient_id'];
        }

        if (!empty($filters['search'])) {
            $where[] = '(r.compounding_number LIKE :search OR r.formulation_name LIKE :search2 OR p.patient_no LIKE :search3 OR p.first_name LIKE :search4 OR p.last_name LIKE :search5)';
            $params['search'] = '%' . trim($filters['search']) . '%';
            $params['search2'] = '%' . trim($filters['search']) . '%';
            $params['search3'] = '%' . trim($filters['search']) . '%';
            $params['search4'] = '%' . trim($filters['search']) . '%';
            $params['search5'] = '%' . trim($filters['search']) . '%';
        }

        $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
        $prepUserSql = self::userNameSql('r.prepared_by_user_id');
        $inspectUserSql = self::userNameSql('r.inspected_by_user_id');

        $stmt = $db->prepare("
            SELECT r.*,
                   p.patient_no,
                   CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                   p.birthdate,
                   p.sex,
                   f.formula_code,
                   {$prepUserSql} AS prepared_by_name,
                   {$inspectUserSql} AS inspected_by_name,
                   (SELECT COUNT(*) FROM pharmacy_compounding_ingredients i WHERE i.compounding_id = r.id) AS ingredients_count,
                   (SELECT COALESCE(SUM(total_cost), 0) FROM pharmacy_compounding_ingredients i WHERE i.compounding_id = r.id) AS total_ingredients_cost,
                   TIMESTAMPDIFF(HOUR, NOW(), r.beyond_use_date) AS hours_until_bud
            FROM pharmacy_compounding_records r
            LEFT JOIN patients p ON p.id = r.patient_id
            LEFT JOIN pharmacy_compounding_formulas f ON f.id = r.formula_id
            {$whereClause}
            ORDER BY r.prepared_at DESC, r.id DESC
        ");
        $stmt->execute($params);

        return array_map(function ($r) {
            $r['id'] = (int) $r['id'];
            $r['formula_id'] = $r['formula_id'] ? (int) $r['formula_id'] : null;
            $r['patient_id'] = $r['patient_id'] ? (int) $r['patient_id'] : null;
            $r['yield_quantity'] = (float) $r['yield_quantity'];
            $r['ingredients_count'] = (int) $r['ingredients_count'];
            $r['total_ingredients_cost'] = (float) $r['total_ingredients_cost'];
            $r['hours_until_bud'] = $r['hours_until_bud'] !== null ? (int) $r['hours_until_bud'] : null;
            $r['is_expired'] = ($r['hours_until_bud'] !== null && $r['hours_until_bud'] <= 0);
            $r['visual_inspection_checks'] = $r['visual_inspection_checks'] ? json_decode($r['visual_inspection_checks'], true) : [];
            return $r;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Get detailed compounding record with all raw ingredient batch lots and dual signatures.
     */
    public function getRecordDetails(int $id): ?array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $prepUserSql = self::userNameSql('r.prepared_by_user_id');
        $inspectUserSql = self::userNameSql('r.inspected_by_user_id');

        $stmt = $db->prepare("
            SELECT r.*,
                   p.patient_no,
                   CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS patient_name,
                   p.birthdate,
                   p.sex,
                   f.formula_code,
                   f.standard_sop_instructions,
                   {$prepUserSql} AS prepared_by_name,
                   {$inspectUserSql} AS inspected_by_name,
                   TIMESTAMPDIFF(HOUR, NOW(), r.beyond_use_date) AS hours_until_bud
            FROM pharmacy_compounding_records r
            LEFT JOIN patients p ON p.id = r.patient_id
            LEFT JOIN pharmacy_compounding_formulas f ON f.id = r.formula_id
            WHERE r.id = :id
        ");
        $stmt->execute(['id' => $id]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$record) {
            return null;
        }

        $record['id'] = (int) $record['id'];
        $record['formula_id'] = $record['formula_id'] ? (int) $record['formula_id'] : null;
        $record['patient_id'] = $record['patient_id'] ? (int) $record['patient_id'] : null;
        $record['yield_quantity'] = (float) $record['yield_quantity'];
        $record['hours_until_bud'] = $record['hours_until_bud'] !== null ? (int) $record['hours_until_bud'] : null;
        $record['is_expired'] = ($record['hours_until_bud'] !== null && $record['hours_until_bud'] <= 0);
        $record['visual_inspection_checks'] = $record['visual_inspection_checks'] ? json_decode($record['visual_inspection_checks'], true) : [];

        // Fetch ingredients
        $ingStmt = $db->prepare("
            SELECT i.*,
                   w.name AS warehouse_name,
                   d.name AS catalog_drug_name
            FROM pharmacy_compounding_ingredients i
            LEFT JOIN warehouses w ON w.id = i.source_warehouse_id
            LEFT JOIN drugs d ON d.id = i.drug_id
            WHERE i.compounding_id = :cid
            ORDER BY i.id ASC
        ");
        $ingStmt->execute(['cid' => $id]);
        $ingredients = array_map(function ($ing) {
            $ing['id'] = (int) $ing['id'];
            $ing['compounding_id'] = (int) $ing['compounding_id'];
            $ing['drug_id'] = $ing['drug_id'] ? (int) $ing['drug_id'] : null;
            $ing['quantity_consumed'] = (float) $ing['quantity_consumed'];
            $ing['unit_cost'] = (float) $ing['unit_cost'];
            $ing['total_cost'] = (float) $ing['total_cost'];
            return $ing;
        }, $ingStmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'record' => $record,
            'ingredients' => $ingredients
        ];
    }

    /**
     * List active master compounding formulas.
     */
    public function listFormulas(?string $formulationType = null): array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $sql = "SELECT f.* FROM pharmacy_compounding_formulas f WHERE f.is_active = 1";
        $params = [];
        if ($formulationType) {
            $sql .= " AND f.formulation_type = :type";
            $params['type'] = $formulationType;
        }
        $sql .= " ORDER BY f.formulation_type ASC, f.name ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        return array_map(function ($f) {
            $f['id'] = (int) $f['id'];
            $f['standard_yield_quantity'] = (float) $f['standard_yield_quantity'];
            $f['default_bud_hours'] = (int) $f['default_bud_hours'];
            $f['is_sterile'] = (bool) $f['is_sterile'];
            return $f;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Create an Extemporaneous Compounding record with ingredient consumption tracking.
     */
    public function createRecord(array $data, int $userId): array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $formulationName = trim((string) ($data['formulation_name'] ?? ''));
        $formulationType = $data['formulation_type'] ?? 'iv_admixture';
        $formulaId = !empty($data['formula_id']) ? (int) $data['formula_id'] : null;
        $patientId = !empty($data['patient_id']) ? (int) $data['patient_id'] : null;
        $prescriptionId = !empty($data['prescription_id']) ? (int) $data['prescription_id'] : null;
        $yieldQty = (float) ($data['yield_quantity'] ?? 1.0);
        $yieldUnit = trim((string) ($data['yield_unit'] ?? 'mL')) ?: 'mL';
        $cleanroomHood = trim((string) ($data['cleanroom_hood_number'] ?? ''));
        $cleanroomSuite = trim((string) ($data['cleanroom_suite'] ?? 'Central Pharmacy Cleanroom Suite'));
        $preparedAt = !empty($data['prepared_at']) ? $data['prepared_at'] : date('Y-m-d H:i:s');
        $storageCondition = trim((string) ($data['storage_condition'] ?? 'Refrigerate (2-8°C)'));
        $specialInstructions = trim((string) ($data['special_instructions'] ?? ''));
        $prepNotes = trim((string) ($data['preparation_notes'] ?? ''));
        $ingredients = is_array($data['ingredients'] ?? null) ? $data['ingredients'] : [];

        if ($formulationName === '') {
            return ['success' => false, 'message' => 'Formulation name is required.'];
        }
        if ($cleanroomHood === '') {
            return ['success' => false, 'message' => 'Cleanroom Hood / BSC identifier is required for sterile/extemporaneous compounding.'];
        }
        if ($yieldQty <= 0) {
            return ['success' => false, 'message' => 'Yield quantity must be greater than zero.'];
        }
        if (empty($ingredients)) {
            return ['success' => false, 'message' => 'Please document at least one raw ingredient with batch lot number.'];
        }

        // Calculate Beyond-Use Date (BUD)
        $bud = null;
        if (!empty($data['beyond_use_date'])) {
            $bud = $data['beyond_use_date'];
        } else {
            $budHours = !empty($data['bud_hours']) ? (int) $data['bud_hours'] : 24;
            $bud = date('Y-m-d H:i:s', strtotime($preparedAt . " +{$budHours} hours"));
        }

        $now = date('Y-m-d H:i:s');
        $compoundingNum = 'CMP-' . date('Y') . '-' . str_pad((string) mt_rand(1, 99999), 5, '0', STR_PAD_LEFT);

        $ownsTx = !$db->inTransaction();
        if ($ownsTx) {
            $db->beginTransaction();
        }

        try {
            $stmt = $db->prepare("
                INSERT INTO pharmacy_compounding_records (
                    compounding_number, formula_id, formulation_name, formulation_type,
                    patient_id, prescription_id, yield_quantity, yield_unit,
                    cleanroom_hood_number, cleanroom_suite, prepared_at, beyond_use_date,
                    storage_condition, special_instructions, status,
                    prepared_by_user_id, preparation_notes, inspection_status
                ) VALUES (
                    :num, :fid, :name, :type,
                    :pid, :rx, :yield_qty, :unit,
                    :hood, :suite, :prep_at, :bud,
                    :storage, :instruct, 'prepared',
                    :prep_user, :prep_notes, 'pending'
                )
            ");
            $stmt->execute([
                'num' => $compoundingNum,
                'fid' => $formulaId,
                'name' => $formulationName,
                'type' => $formulationType,
                'pid' => $patientId,
                'rx' => $prescriptionId,
                'yield_qty' => $yieldQty,
                'unit' => $yieldUnit,
                'hood' => $cleanroomHood,
                'suite' => $cleanroomSuite,
                'prep_at' => $preparedAt,
                'bud' => $bud,
                'storage' => $storageCondition,
                'instruct' => $specialInstructions ?: null,
                'prep_user' => $userId ?: 1,
                'prep_notes' => $prepNotes ?: null
            ]);
            $recordId = (int) $db->lastInsertId();

            // Set formatted sequential compounding number
            $seqNumber = 'CMP-' . date('Y') . '-' . str_pad((string) $recordId, 5, '0', STR_PAD_LEFT);
            $db->prepare("UPDATE pharmacy_compounding_records SET compounding_number = :num, resulting_lot_number = :lot WHERE id = :id")
               ->execute([
                   'num' => $seqNumber,
                   'lot' => 'LOT-' . $seqNumber,
                   'id' => $recordId
               ]);

            // Insert ingredients
            $ingStmt = $db->prepare("
                INSERT INTO pharmacy_compounding_ingredients (
                    compounding_id, drug_id, ingredient_name, source_lot_id,
                    source_lot_number, source_lot_expiry, source_warehouse_id,
                    quantity_consumed, unit, unit_cost, total_cost, notes
                ) VALUES (
                    :cid, :did, :name, :lot_id,
                    :lot_num, :exp, :wid,
                    :qty, :unit, :cost, :tot, :notes
                )
            ");

            foreach ($ingredients as $ing) {
                $ingName = trim((string) ($ing['ingredient_name'] ?? ''));
                $lotNum = trim((string) ($ing['source_lot_number'] ?? ''));
                $qty = (float) ($ing['quantity_consumed'] ?? 0);
                $unit = trim((string) ($ing['unit'] ?? 'mL'));
                $unitCost = (float) ($ing['unit_cost'] ?? 0.0);
                $totCost = round($qty * $unitCost, 2);

                if ($ingName === '' || $lotNum === '' || $qty <= 0) {
                    continue;
                }

                $ingStmt->execute([
                    'cid' => $recordId,
                    'did' => !empty($ing['drug_id']) ? (int) $ing['drug_id'] : null,
                    'name' => $ingName,
                    'lot_id' => !empty($ing['source_lot_id']) ? (int) $ing['source_lot_id'] : null,
                    'lot_num' => $lotNum,
                    'exp' => !empty($ing['source_lot_expiry']) ? $ing['source_lot_expiry'] : null,
                    'wid' => !empty($ing['source_warehouse_id']) ? (int) $ing['source_warehouse_id'] : null,
                    'qty' => $qty,
                    'unit' => $unit,
                    'cost' => $unitCost,
                    'tot' => $totCost,
                    'notes' => !empty($ing['notes']) ? trim((string) $ing['notes']) : null
                ]);
            }

            if ($ownsTx) {
                $db->commit();
            }

            return [
                'success' => true,
                'message' => "Compounding record {$seqNumber} prepared successfully. Awaiting second pharmacist dual inspection sign-off.",
                'compounding_id' => $recordId,
                'compounding_number' => $seqNumber,
                'beyond_use_date' => $bud
            ];
        } catch (\Throwable $e) {
            if ($ownsTx && $db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Dual Pharmacist Inspection & Verification Sign-Off.
     * Enforces dual control: The verifying pharmacist cannot be the same user who prepared it
     * (unless authorized emergency override flag is supplied).
     */
    public function inspectRecord(int $recordId, array $data, int $verifierUserId): array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $stmt = $db->prepare("SELECT * FROM pharmacy_compounding_records WHERE id = :id");
        $stmt->execute(['id' => $recordId]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$record) {
            return ['success' => false, 'message' => 'Compounding record not found.'];
        }

        $prepUserId = (int) $record['prepared_by_user_id'];
        $allowSelfSign = !empty($data['emergency_self_sign_override']);

        if ($prepUserId === $verifierUserId && !$allowSelfSign) {
            return [
                'success' => false,
                'message' => 'Dual Sign-Off Mandate: The verifying inspection pharmacist must be different from the preparing pharmacist.'
            ];
        }

        $decision = $data['decision'] ?? 'approved'; // 'approved' or 'rejected'
        if (!in_array($decision, ['approved', 'rejected'], true)) {
            return ['success' => false, 'message' => 'Invalid inspection decision.'];
        }

        $checklist = [
            'particulate_free' => !empty($data['particulate_free']),
            'container_intact' => !empty($data['container_intact']),
            'labeling_correct' => !empty($data['labeling_correct']),
            'volume_verified' => !empty($data['volume_verified']),
            'bud_verified' => !empty($data['bud_verified'])
        ];

        $notes = trim((string) ($data['inspection_notes'] ?? ''));
        $now = date('Y-m-d H:i:s');
        $newStatus = ($decision === 'approved') ? 'inspected_approved' : 'inspected_rejected';

        $db->prepare("
            UPDATE pharmacy_compounding_records
            SET inspected_by_user_id = :user,
                inspected_at = :now,
                inspection_status = :dec,
                status = :status,
                visual_inspection_checks = :checks,
                inspection_notes = :notes,
                updated_at = :now
            WHERE id = :id
        ")->execute([
            'user' => $verifierUserId ?: 1,
            'now' => $now,
            'dec' => $decision,
            'status' => $newStatus,
            'checks' => json_encode($checklist),
            'notes' => $notes ?: null,
            'id' => $recordId
        ]);

        return [
            'success' => true,
            'message' => ($decision === 'approved')
                ? "Dual verification signed and approved. Formulation {$record['compounding_number']} released for dispensing."
                : "Compounding record {$record['compounding_number']} rejected upon visual inspection.",
            'status' => $newStatus
        ];
    }

    /**
     * Get printable compounding label data with Beyond-Use Date & dual signatures.
     */
    public function getLabelData(int $recordId): ?array
    {
        $details = $this->getRecordDetails($recordId);
        if (!$details) return null;

        $r = $details['record'];
        $ingredients = $details['ingredients'];

        return [
            'compounding_number' => $r['compounding_number'],
            'resulting_lot_number' => $r['resulting_lot_number'],
            'formulation_name' => $r['formulation_name'],
            'formulation_type' => ucwords(str_replace('_', ' ', $r['formulation_type'])),
            'patient_name' => $r['patient_name'] ?: 'WARD FLOOR STOCK',
            'patient_no' => $r['patient_no'] ?: 'STOCK',
            'yield_quantity' => $r['yield_quantity'] . ' ' . $r['yield_unit'],
            'prepared_at' => $r['prepared_at'],
            'beyond_use_date' => $r['beyond_use_date'],
            'storage_condition' => $r['storage_condition'],
            'cleanroom_hood_number' => $r['cleanroom_hood_number'],
            'cleanroom_suite' => $r['cleanroom_suite'],
            'special_instructions' => $r['special_instructions'],
            'prepared_by' => $r['prepared_by_name'] ?: 'Pharmacist',
            'inspected_by' => $r['inspected_by_name'] ?: 'Pending Second Check',
            'inspection_status' => $r['inspection_status'],
            'ingredients' => array_map(function ($i) {
                return [
                    'name' => $i['ingredient_name'],
                    'lot' => $i['source_lot_number'],
                    'qty' => $i['quantity_consumed'] . ' ' . $i['unit']
                ];
            }, $ingredients)
        ];
    }
}
