<?php

namespace App\Modules\StockLevels\Services;

use App\Core\Database;
use PDO;

/**
 * Automated Reorder Thresholds & Safety Stock Service (pharmacy_reorder_policies).
 *
 * Formula:
 *   Reorder Point = (Avg Daily Consumption * Lead Time Days) + Safety Stock
 *
 * Responsibilities:
 *   1. Manage per-warehouse, per-drug reorder policies (`pharmacy_reorder_policies`)
 *      and synchronize computed `reorder_point` -> `warehouse_stock_levels.min_level`.
 *   2. Calculate 30-day observed daily consumption from `drug_stock_movements`.
 *   3. Evaluate usable stock against `reorder_point` in real time (on dispensing,
 *      stock adjustment, policy save, or manual check) and automatically generate
 *      reorder breach alerts (`pharmacy_reorder_alerts`) and Draft Purchase Requisitions
 *      (`purchase_requisitions` + `purchase_requisition_items`).
 */
class PharmacyReorderPolicyService
{
    private const EPSILON = 0.0005;

    public static function ensureTablesExist(?PDO $db = null): void
    {
        $db = $db ?: Database::connection();

        $db->exec("
            CREATE TABLE IF NOT EXISTS `pharmacy_reorder_policies` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `warehouse_id` INT UNSIGNED NOT NULL,
                `drug_id` INT UNSIGNED NOT NULL,
                `avg_daily_consumption` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
                `use_auto_consumption` TINYINT(1) NOT NULL DEFAULT 1,
                `lead_time_days` INT UNSIGNED NOT NULL DEFAULT 7,
                `safety_stock` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
                `reorder_point` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
                `max_stock_level` DECIMAL(12,3) NULL DEFAULT NULL,
                `reorder_quantity` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
                `auto_generate_draft_pr` TINYINT(1) NOT NULL DEFAULT 1,
                `is_active` TINYINT(1) NOT NULL DEFAULT 1,
                `last_breach_detected_at` DATETIME NULL DEFAULT NULL,
                `last_triggered_pr_id` INT UNSIGNED NULL DEFAULT NULL,
                `last_evaluated_at` DATETIME NULL DEFAULT NULL,
                `notes` VARCHAR(500) NULL DEFAULT NULL,
                `created_by` INT UNSIGNED NULL DEFAULT NULL,
                `updated_by` INT UNSIGNED NULL DEFAULT NULL,
                `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uq_pharmacy_reorder_wh_drug` (`warehouse_id`, `drug_id`),
                KEY `idx_pharmacy_reorder_wh` (`warehouse_id`, `is_active`),
                KEY `idx_pharmacy_reorder_drug` (`drug_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $db->exec("
            CREATE TABLE IF NOT EXISTS `pharmacy_reorder_alerts` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `policy_id` INT UNSIGNED NULL DEFAULT NULL,
                `warehouse_id` INT UNSIGNED NOT NULL,
                `drug_id` INT UNSIGNED NOT NULL,
                `usable_stock` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
                `reorder_point` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
                `suggested_order_qty` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
                `alert_status` ENUM('open', 'requisition_drafted', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
                `purchase_requisition_id` INT UNSIGNED NULL DEFAULT NULL,
                `pr_number` VARCHAR(40) NULL DEFAULT NULL,
                `trigger_source` VARCHAR(60) NOT NULL DEFAULT 'manual_check',
                `triggered_by` INT UNSIGNED NULL DEFAULT NULL,
                `triggered_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `resolved_at` DATETIME NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                KEY `idx_reorder_alerts_wh_status` (`warehouse_id`, `alert_status`),
                KEY `idx_reorder_alerts_drug` (`drug_id`, `alert_status`),
                KEY `idx_reorder_alerts_pr` (`purchase_requisition_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    /**
     * Formula: Reorder Point = (Avg Daily Consumption * Lead Time Days) + Safety Stock
     */
    public static function calculateReorderPoint(float $avgDailyConsumption, int $leadTimeDays, float $safetyStock): float
    {
        return round((max(0.0, $avgDailyConsumption) * max(0, $leadTimeDays)) + max(0.0, $safetyStock), 3);
    }

    /**
     * Compute 30-day average daily consumption per drug at a given warehouse
     * from `drug_stock_movements` (dispensed + transfer_out outflows).
     */
    public function compute30DayDailyConsumption(int $warehouseId): array
    {
        $db = Database::connection();
        $since = date('Y-m-d', strtotime('-30 days'));

        $stmt = $db->prepare("
            SELECT drug_id, SUM(ABS(quantity)) AS total_outflow_30d
            FROM drug_stock_movements
            WHERE warehouse_id = :wh
              AND movement_date >= :since
              AND movement_type IN ('dispensed', 'transfer_out')
              AND quantity < 0
            GROUP BY drug_id
        ");
        $stmt->execute(['wh' => $warehouseId, 'since' => $since]);

        $map = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $total30d = (float) $row['total_outflow_30d'];
            $map[(int) $row['drug_id']] = [
                'total_outflow_30d' => round($total30d, 3),
                'avg_daily_30d' => round($total30d / 30.0, 3),
            ];
        }

        return $map;
    }

    /**
     * Retrieve all reorder policies + active alerts for a warehouse.
     */
    public function getPoliciesForWarehouse(int $warehouseId): array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $consumption30d = $this->compute30DayDailyConsumption($warehouseId);

        $stmt = $db->prepare("
            SELECT p.*,
                   d.name AS drug_name,
                   d.generic_name,
                   d.strength,
                   du.name AS unit_name
            FROM pharmacy_reorder_policies p
            JOIN drugs d ON d.id = p.drug_id AND d.deleted_at IS NULL
            LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
            WHERE p.warehouse_id = :wh
            ORDER BY d.name ASC
        ");
        $stmt->execute(['wh' => $warehouseId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $policiesByDrug = [];
        foreach ($rows as $r) {
            $drugId = (int) $r['drug_id'];
            $obs = $consumption30d[$drugId] ?? ['total_outflow_30d' => 0.0, 'avg_daily_30d' => 0.0];
            $avgDaily = (float) $r['avg_daily_consumption'];
            if ((int) $r['use_auto_consumption'] === 1 && $obs['avg_daily_30d'] > 0 && $avgDaily <= 0) {
                $avgDaily = $obs['avg_daily_30d'];
            }
            $leadTime = (int) $r['lead_time_days'];
            $safety = (float) $r['safety_stock'];
            $rop = self::calculateReorderPoint($avgDaily, $leadTime, $safety);

            $policiesByDrug[$drugId] = [
                'id' => (int) $r['id'],
                'warehouse_id' => (int) $r['warehouse_id'],
                'drug_id' => $drugId,
                'drug_name' => $r['drug_name'],
                'generic_name' => $r['generic_name'],
                'strength' => $r['strength'],
                'unit_name' => $r['unit_name'],
                'avg_daily_consumption' => round($avgDaily, 3),
                'observed_30d_daily' => $obs['avg_daily_30d'],
                'total_outflow_30d' => $obs['total_outflow_30d'],
                'use_auto_consumption' => (bool) $r['use_auto_consumption'],
                'lead_time_days' => $leadTime,
                'safety_stock' => round($safety, 3),
                'reorder_point' => $rop,
                'max_stock_level' => $r['max_stock_level'] !== null ? round((float) $r['max_stock_level'], 3) : null,
                'reorder_quantity' => round((float) $r['reorder_quantity'], 3),
                'auto_generate_draft_pr' => (bool) $r['auto_generate_draft_pr'],
                'is_active' => (bool) $r['is_active'],
                'last_breach_detected_at' => $r['last_breach_detected_at'],
                'last_triggered_pr_id' => $r['last_triggered_pr_id'] ? (int) $r['last_triggered_pr_id'] : null,
                'last_evaluated_at' => $r['last_evaluated_at'],
                'notes' => $r['notes'],
            ];
        }

        // Active reorder alerts for this warehouse
        $alertStmt = $db->prepare("
            SELECT a.*,
                   d.name AS drug_name,
                   du.name AS unit_name,
                   r.status AS pr_status
            FROM pharmacy_reorder_alerts a
            JOIN drugs d ON d.id = a.drug_id
            LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
            LEFT JOIN purchase_requisitions r ON r.id = a.purchase_requisition_id AND r.deleted_at IS NULL
            WHERE a.warehouse_id = :wh
              AND a.alert_status IN ('open', 'requisition_drafted')
            ORDER BY a.triggered_at DESC, a.id DESC
        ");
        $alertStmt->execute(['wh' => $warehouseId]);
        $alerts = array_map(fn(array $a) => [
            'id' => (int) $a['id'],
            'policy_id' => $a['policy_id'] ? (int) $a['policy_id'] : null,
            'warehouse_id' => (int) $a['warehouse_id'],
            'drug_id' => (int) $a['drug_id'],
            'drug_name' => $a['drug_name'],
            'unit_name' => $a['unit_name'],
            'usable_stock' => (float) $a['usable_stock'],
            'reorder_point' => (float) $a['reorder_point'],
            'suggested_order_qty' => (float) $a['suggested_order_qty'],
            'alert_status' => $a['alert_status'],
            'purchase_requisition_id' => $a['purchase_requisition_id'] ? (int) $a['purchase_requisition_id'] : null,
            'pr_number' => $a['pr_number'],
            'pr_status' => $a['pr_status'] ?? null,
            'trigger_source' => $a['trigger_source'],
            'triggered_at' => $a['triggered_at'],
        ], $alertStmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'policies_by_drug' => $policiesByDrug,
            'consumption_30d_by_drug' => $consumption30d,
            'active_alerts' => $alerts,
        ];
    }

    /**
     * Save or update reorder policies for a warehouse, sync `warehouse_stock_levels.min_level = reorder_point`,
     * and evaluate reorder thresholds immediately.
     */
    public function savePolicies(int $warehouseId, array $policies, int $userId): array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $whStmt = $db->prepare("SELECT id, name FROM warehouses WHERE id = :id AND deleted_at IS NULL");
        $whStmt->execute(['id' => $warehouseId]);
        $warehouse = $whStmt->fetch(PDO::FETCH_ASSOC);
        if (!$warehouse) {
            return ['success' => false, 'message' => 'Storage location not found.', 'not_found' => true];
        }

        if (!$policies) {
            return ['success' => false, 'message' => 'No reorder policy changes provided.'];
        }

        $now = date('Y-m-d H:i:s');
        $ownsTx = !$db->inTransaction();
        if ($ownsTx) {
            $db->beginTransaction();
        }

        try {
            $upsertPolicy = $db->prepare("
                INSERT INTO pharmacy_reorder_policies
                    (warehouse_id, drug_id, avg_daily_consumption, use_auto_consumption, lead_time_days,
                     safety_stock, reorder_point, max_stock_level, reorder_quantity, auto_generate_draft_pr,
                     is_active, notes, created_by, updated_by, created_at, updated_at)
                VALUES
                    (:wh, :drug, :adc, :auto_c, :lead, :safety, :rop, :max_lvl, :roq, :auto_pr,
                     1, :notes, :user1, :user2, :now1, :now2)
                ON DUPLICATE KEY UPDATE
                    avg_daily_consumption = VALUES(avg_daily_consumption),
                    use_auto_consumption = VALUES(use_auto_consumption),
                    lead_time_days = VALUES(lead_time_days),
                    safety_stock = VALUES(safety_stock),
                    reorder_point = VALUES(reorder_point),
                    max_stock_level = VALUES(max_stock_level),
                    reorder_quantity = VALUES(reorder_quantity),
                    auto_generate_draft_pr = VALUES(auto_generate_draft_pr),
                    is_active = 1,
                    notes = COALESCE(VALUES(notes), notes),
                    updated_by = VALUES(updated_by),
                    updated_at = VALUES(updated_at)
            ");

            $upsertLevel = $db->prepare("
                INSERT INTO warehouse_stock_levels (warehouse_id, drug_id, min_level, max_level, created_at, created_by)
                VALUES (:wh, :drug, :min_lvl, :max_lvl, :now1, :user1)
                ON DUPLICATE KEY UPDATE
                    min_level = VALUES(min_level),
                    max_level = COALESCE(VALUES(max_level), max_level),
                    updated_at = :now2,
                    updated_by = :user2
            ");

            $savedCount = 0;
            $savedDrugIds = [];

            foreach ($policies as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $drugId = (int) ($row['drug_id'] ?? 0);
                if ($drugId <= 0) {
                    continue;
                }

                $adc = max(0.0, round((float) ($row['avg_daily_consumption'] ?? 0), 3));
                $lead = max(0, (int) ($row['lead_time_days'] ?? 7));
                $safety = max(0.0, round((float) ($row['safety_stock'] ?? 0), 3));
                $rop = self::calculateReorderPoint($adc, $lead, $safety);

                $rawMax = $row['max_stock_level'] ?? $row['max_level'] ?? null;
                $maxLevel = ($rawMax !== null && $rawMax !== '' && is_numeric($rawMax))
                    ? max($rop, round((float) $rawMax, 3))
                    : null;

                $rawRoq = $row['reorder_quantity'] ?? null;
                $roq = ($rawRoq !== null && $rawRoq !== '' && is_numeric($rawRoq) && (float) $rawRoq > 0)
                    ? round((float) $rawRoq, 3)
                    : round(max($maxLevel !== null ? ($maxLevel - $rop) : ($adc * max(7, $lead)), $rop, 10.0), 3);

                $useAuto = isset($row['use_auto_consumption']) ? ((bool) $row['use_auto_consumption'] ? 1 : 0) : 1;
                $autoPr = isset($row['auto_generate_draft_pr']) ? ((bool) $row['auto_generate_draft_pr'] ? 1 : 0) : 1;
                $notes = isset($row['notes']) && trim((string) $row['notes']) !== '' ? mb_substr(trim((string) $row['notes']), 0, 500) : null;

                $upsertPolicy->execute([
                    'wh' => $warehouseId,
                    'drug' => $drugId,
                    'adc' => $adc,
                    'auto_c' => $useAuto,
                    'lead' => $lead,
                    'safety' => $safety,
                    'rop' => $rop,
                    'max_lvl' => $maxLevel,
                    'roq' => $roq,
                    'auto_pr' => $autoPr,
                    'notes' => $notes,
                    'user1' => $userId ?: null,
                    'user2' => $userId ?: null,
                    'now1' => $now,
                    'now2' => $now,
                ]);

                // Sync Reorder Point into warehouse_stock_levels.min_level
                $upsertLevel->execute([
                    'wh' => $warehouseId,
                    'drug' => $drugId,
                    'min_lvl' => $rop,
                    'max_lvl' => $maxLevel,
                    'now1' => $now,
                    'user1' => $userId ?: null,
                    'now2' => $now,
                    'user2' => $userId ?: null,
                ]);

                $savedCount++;
                $savedDrugIds[] = $drugId;
            }

            if ($ownsTx) {
                $db->commit();
            }
        } catch (\Throwable $e) {
            if ($ownsTx && $db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }

        // Automatically evaluate thresholds & generate draft PR for any breached items
        $evaluation = $this->evaluateAndTriggerReorder($warehouseId, $userId, 'policy_update', $savedDrugIds);

        $msg = "{$savedCount} reorder " . ($savedCount === 1 ? 'policy' : 'policies') . " saved (Reorder Point = Avg Daily Consumption × Lead Time + Safety Stock).";
        if (!empty($evaluation['draft_pr_number'])) {
            $msg .= " Stock breach detected: Draft Purchase Requisition {$evaluation['draft_pr_number']} automatically generated/updated ({$evaluation['drafted_items_count']} item(s)).";
        } elseif (($evaluation['breached_count'] ?? 0) > 0) {
            $msg .= " {$evaluation['breached_count']} item(s) currently at or below Reorder Point.";
        }

        return [
            'success' => true,
            'message' => $msg,
            'data' => [
                'saved_count' => $savedCount,
                'evaluation' => $evaluation,
            ],
        ];
    }

    /**
     * Evaluate usable stock against Reorder Point (`reorder_point = (avg_daily_consumption * lead_time_days) + safety_stock`)
     * for a warehouse. When usable stock <= reorder_point:
     *   - Creates/updates an active record in `pharmacy_reorder_alerts`
     *   - Automatically generates or appends to an open Draft Purchase Requisition (`purchase_requisitions`)
     *     when `auto_generate_draft_pr = 1` and the drug is not already sufficiently requested on an open PR.
     */
    public function evaluateAndTriggerReorder(
        int $warehouseId,
        int $userId = 1,
        string $triggerSource = 'manual_check',
        array $filterDrugIds = []
    ): array {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $whStmt = $db->prepare("SELECT id, name, department_id FROM warehouses WHERE id = :id AND deleted_at IS NULL");
        $whStmt->execute(['id' => $warehouseId]);
        $warehouse = $whStmt->fetch(PDO::FETCH_ASSOC);
        if (!$warehouse) {
            return [
                'warehouse_id' => $warehouseId,
                'breached_count' => 0,
                'drafted_items_count' => 0,
                'draft_pr_id' => null,
                'draft_pr_number' => null,
                'breached_items' => [],
            ];
        }

        $today = date('Y-m-d');
        $now = date('Y-m-d H:i:s');
        $effectiveUserId = $userId > 0 ? $userId : 1;

        // Ensure policies exist for any warehouse_stock_levels not yet in pharmacy_reorder_policies
        $db->prepare("
            INSERT INTO pharmacy_reorder_policies
                (warehouse_id, drug_id, avg_daily_consumption, use_auto_consumption, lead_time_days, safety_stock, reorder_point, max_stock_level, reorder_quantity, auto_generate_draft_pr, is_active, notes)
            SELECT
                wsl.warehouse_id,
                wsl.drug_id,
                ROUND(GREATEST(wsl.min_level * 0.60 / 7, 1.000), 3),
                1,
                7,
                ROUND(wsl.min_level * 0.40, 3),
                wsl.min_level,
                wsl.max_level,
                ROUND(GREATEST(COALESCE(wsl.max_level, wsl.min_level * 2) - wsl.min_level, wsl.min_level, 10), 3),
                1,
                1,
                'Auto-synced from warehouse_stock_levels'
            FROM warehouse_stock_levels wsl
            WHERE wsl.warehouse_id = :wh
            ON DUPLICATE KEY UPDATE
                warehouse_id = VALUES(warehouse_id)
        ")->execute(['wh' => $warehouseId]);

        $drugFilterSql = '';
        if (!empty($filterDrugIds)) {
            $cleanIds = array_values(array_unique(array_filter(array_map('intval', $filterDrugIds), fn($v) => $v > 0)));
            if ($cleanIds) {
                $drugFilterSql = ' AND p.drug_id IN (' . implode(',', $cleanIds) . ')';
            }
        }

        // Load active policies + usable stock
        $stmt = $db->prepare("
            SELECT p.*,
                   d.name AS drug_name,
                   d.is_active AS drug_is_active,
                   d.allow_inventory,
                   d.package_quantity,
                   du.name AS unit_name,
                   COALESCE(stock.usable_stock, 0) AS usable_stock
            FROM pharmacy_reorder_policies p
            JOIN drugs d ON d.id = p.drug_id AND d.deleted_at IS NULL
            LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
            LEFT JOIN (
                SELECT drug_id,
                       SUM(CASE WHEN expires_date IS NULL OR expires_date >= :today THEN quantity_on_hand ELSE 0 END) AS usable_stock
                FROM drug_inventory_lots
                WHERE warehouse_id = :wh1 AND deleted_at IS NULL AND is_active = 1
                GROUP BY drug_id
            ) stock ON stock.drug_id = p.drug_id
            WHERE p.warehouse_id = :wh2
              AND p.is_active = 1
              AND d.is_active = 1
              {$drugFilterSql}
            ORDER BY d.name ASC
        ");
        $stmt->execute(['today' => $today, 'wh1' => $warehouseId, 'wh2' => $warehouseId]);
        $policies = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Check existing open Purchase Requisition quantities for this warehouse
        $openPrStmt = $db->prepare("
            SELECT i.drug_id, i.base_quantity, r.id AS pr_id, r.pr_number, r.status
            FROM purchase_requisition_items i
            JOIN purchase_requisitions r ON r.id = i.purchase_requisition_id
            WHERE r.warehouse_id = :wh
              AND r.deleted_at IS NULL
              AND r.status IN ('draft', 'submitted', 'approved')
            ORDER BY r.id DESC
        ");
        $openPrStmt->execute(['wh' => $warehouseId]);
        $openPrByDrug = [];
        foreach ($openPrStmt->fetchAll(PDO::FETCH_ASSOC) as $prRow) {
            $dId = (int) $prRow['drug_id'];
            if (!isset($openPrByDrug[$dId])) {
                $openPrByDrug[$dId] = [
                    'pr_id' => (int) $prRow['pr_id'],
                    'pr_number' => $prRow['pr_number'],
                    'status' => $prRow['status'],
                    'requested_qty' => 0.0,
                ];
            }
            $openPrByDrug[$dId]['requested_qty'] += (float) $prRow['base_quantity'];
        }

        $breachedItems = [];
        $itemsToDraftPr = [];

        $updateEvalStmt = $db->prepare("
            UPDATE pharmacy_reorder_policies
            SET reorder_point = :rop,
                last_evaluated_at = :now,
                last_breach_detected_at = CASE WHEN :breached = 1 THEN :now2 ELSE last_breach_detected_at END
            WHERE id = :id
        ");

        $resolveAlertStmt = $db->prepare("
            UPDATE pharmacy_reorder_alerts
            SET alert_status = 'resolved', resolved_at = :now
            WHERE warehouse_id = :wh AND drug_id = :drug AND alert_status IN ('open', 'requisition_drafted')
        ");

        foreach ($policies as $p) {
            $policyId = (int) $p['id'];
            $drugId = (int) $p['drug_id'];
            $usable = round((float) $p['usable_stock'], 3);
            $rop = self::calculateReorderPoint(
                (float) $p['avg_daily_consumption'],
                (int) $p['lead_time_days'],
                (float) $p['safety_stock']
            );

            // Breached if reorder_point > 0 and usable_stock <= reorder_point
            $isBreached = ($rop > self::EPSILON) && ($usable <= $rop + self::EPSILON);

            $updateEvalStmt->execute([
                'rop' => $rop,
                'now' => $now,
                'breached' => $isBreached ? 1 : 0,
                'now2' => $now,
                'id' => $policyId,
            ]);

            if (!$isBreached) {
                $resolveAlertStmt->execute(['now' => $now, 'wh' => $warehouseId, 'drug' => $drugId]);
                continue;
            }

            // Determine suggested order quantity:
            // Enough to reach max_stock_level (or reorder_point + reorder_quantity), at least reorder_quantity
            $maxLvl = $p['max_stock_level'] !== null ? (float) $p['max_stock_level'] : null;
            $roq = (float) $p['reorder_quantity'];
            $targetStock = $maxLvl !== null && $maxLvl > $rop ? $maxLvl : ($rop + max($roq, $rop * 0.5, 10.0));
            $rawNeeded = max($targetStock - $usable, $roq, 1.0);
            $alreadyRequested = $openPrByDrug[$drugId]['requested_qty'] ?? 0.0;
            $netSuggested = round(max(0.0, $rawNeeded - $alreadyRequested), 3);

            $breachEntry = [
                'policy_id' => $policyId,
                'drug_id' => $drugId,
                'drug_name' => $p['drug_name'],
                'unit_name' => $p['unit_name'],
                'usable_stock' => $usable,
                'avg_daily_consumption' => (float) $p['avg_daily_consumption'],
                'lead_time_days' => (int) $p['lead_time_days'],
                'safety_stock' => (float) $p['safety_stock'],
                'reorder_point' => $rop,
                'suggested_order_qty' => round($rawNeeded, 3),
                'net_to_order_qty' => $netSuggested,
                'existing_pr_id' => $openPrByDrug[$drugId]['pr_id'] ?? null,
                'existing_pr_number' => $openPrByDrug[$drugId]['pr_number'] ?? null,
                'auto_generate_draft_pr' => (bool) $p['auto_generate_draft_pr'],
            ];

            $breachedItems[] = $breachEntry;

            if ((bool) $p['auto_generate_draft_pr'] && (int) $p['allow_inventory'] === 1 && $netSuggested > self::EPSILON) {
                $itemsToDraftPr[] = $breachEntry;
            }
        }

        $draftPrId = null;
        $draftPrNumber = null;
        $draftedCount = 0;

        if (!empty($itemsToDraftPr)) {
            $prResult = $this->createOrAppendAutoDraftRequisition(
                $db,
                $warehouse,
                $itemsToDraftPr,
                $effectiveUserId,
                $triggerSource,
                $now
            );
            $draftPrId = $prResult['pr_id'];
            $draftPrNumber = $prResult['pr_number'];
            $draftedCount = $prResult['items_count'];
        }

        // Upsert active alerts for all breached items
        foreach ($breachedItems as &$bItem) {
            $prIdForAlert = $bItem['existing_pr_id'] ?: $draftPrId;
            $prNumForAlert = $bItem['existing_pr_number'] ?: $draftPrNumber;
            $statusForAlert = $prIdForAlert ? 'requisition_drafted' : 'open';

            $bItem['pr_id'] = $prIdForAlert;
            $bItem['pr_number'] = $prNumForAlert;
            $bItem['alert_status'] = $statusForAlert;

            $existingAlertStmt = $db->prepare("
                SELECT id FROM pharmacy_reorder_alerts
                WHERE warehouse_id = :wh AND drug_id = :drug AND alert_status IN ('open', 'requisition_drafted')
                ORDER BY id DESC LIMIT 1
            ");
            $existingAlertStmt->execute(['wh' => $warehouseId, 'drug' => $bItem['drug_id']]);
            $existingAlertId = $existingAlertStmt->fetchColumn();

            if ($existingAlertId) {
                $db->prepare("
                    UPDATE pharmacy_reorder_alerts
                    SET usable_stock = :usable,
                        reorder_point = :rop,
                        suggested_order_qty = :qty,
                        alert_status = :status,
                        purchase_requisition_id = COALESCE(:pr_id, purchase_requisition_id),
                        pr_number = COALESCE(:pr_num, pr_number)
                    WHERE id = :id
                ")->execute([
                    'usable' => $bItem['usable_stock'],
                    'rop' => $bItem['reorder_point'],
                    'qty' => $bItem['suggested_order_qty'],
                    'status' => $statusForAlert,
                    'pr_id' => $prIdForAlert,
                    'pr_num' => $prNumForAlert,
                    'id' => (int) $existingAlertId,
                ]);
            } else {
                $db->prepare("
                    INSERT INTO pharmacy_reorder_alerts
                        (policy_id, warehouse_id, drug_id, usable_stock, reorder_point, suggested_order_qty,
                         alert_status, purchase_requisition_id, pr_number, trigger_source, triggered_by, triggered_at)
                    VALUES
                        (:pid, :wh, :drug, :usable, :rop, :qty, :status, :pr_id, :pr_num, :src, :user, :now)
                ")->execute([
                    'pid' => $bItem['policy_id'],
                    'wh' => $warehouseId,
                    'drug' => $bItem['drug_id'],
                    'usable' => $bItem['usable_stock'],
                    'rop' => $bItem['reorder_point'],
                    'qty' => $bItem['suggested_order_qty'],
                    'status' => $statusForAlert,
                    'pr_id' => $prIdForAlert,
                    'pr_num' => $prNumForAlert,
                    'src' => $triggerSource,
                    'user' => $effectiveUserId,
                    'now' => $now,
                ]);
            }

            if ($prIdForAlert) {
                $db->prepare("UPDATE pharmacy_reorder_policies SET last_triggered_pr_id = :pr_id WHERE id = :id")
                    ->execute(['pr_id' => $prIdForAlert, 'id' => $bItem['policy_id']]);
            }
        }
        unset($bItem);

        return [
            'warehouse_id' => $warehouseId,
            'warehouse_name' => $warehouse['name'],
            'breached_count' => count($breachedItems),
            'drafted_items_count' => $draftedCount,
            'draft_pr_id' => $draftPrId,
            'draft_pr_number' => $draftPrNumber,
            'breached_items' => $breachedItems,
        ];
    }

    /**
     * Create a new Draft Purchase Requisition or append newly breached items to today's
     * open auto-generated Draft Purchase Requisition for the warehouse.
     */
    private function createOrAppendAutoDraftRequisition(
        PDO $db,
        array $warehouse,
        array $itemsToDraft,
        int $userId,
        string $triggerSource,
        string $now
    ): array {
        $warehouseId = (int) $warehouse['id'];

        // Resolve department_id (warehouse's department, else Pharmacy Services dept, else first active dept)
        $departmentId = !empty($warehouse['department_id']) ? (int) $warehouse['department_id'] : 0;
        if ($departmentId <= 0) {
            $departmentId = (int) $db->query("
                SELECT id FROM departments
                WHERE deleted_at IS NULL
                ORDER BY (name LIKE '%Pharmacy%') DESC, id ASC
                LIMIT 1
            ")->fetchColumn();
        }

        $ownsTx = !$db->inTransaction();
        if ($ownsTx) {
            $db->beginTransaction();
        }

        try {
            // Check if there is already an open auto-generated draft PR for this warehouse
            $existingDraftStmt = $db->prepare("
                SELECT id, pr_number
                FROM purchase_requisitions
                WHERE warehouse_id = :wh
                  AND status = 'draft'
                  AND deleted_at IS NULL
                  AND reason LIKE '[AUTO-REORDER]%'
                ORDER BY id DESC
                LIMIT 1
                FOR UPDATE
            ");
            $existingDraftStmt->execute(['wh' => $warehouseId]);
            $existingDraft = $existingDraftStmt->fetch(PDO::FETCH_ASSOC);

            if ($existingDraft) {
                $prId = (int) $existingDraft['id'];
                $prNumber = $existingDraft['pr_number'];
            } else {
                $neededBy = date('Y-m-d', strtotime('+7 days'));
                $reason = "[AUTO-REORDER] Automated Draft Purchase Requisition triggered by {$triggerSource} when stock breached Reorder Point = (Avg Daily Consumption × Lead Time Days) + Safety Stock at {$warehouse['name']}.";

                $db->prepare("
                    INSERT INTO purchase_requisitions
                        (pr_number, department_id, warehouse_id, needed_by, priority, reason, status, created_at, created_by, updated_at, updated_by)
                    VALUES
                        (:tmp, :dept, :wh, :needed, 'urgent', :reason, 'draft', :now1, :user1, :now2, :user2)
                ")->execute([
                    'tmp' => 'TMP-' . bin2hex(random_bytes(5)),
                    'dept' => $departmentId,
                    'wh' => $warehouseId,
                    'needed' => $neededBy,
                    'reason' => $reason,
                    'now1' => $now,
                    'user1' => $userId,
                    'now2' => $now,
                    'user2' => $userId,
                ]);

                $prId = (int) $db->lastInsertId();
                $prNumber = 'PR-' . date('Y') . '-' . str_pad((string) $prId, 5, '0', STR_PAD_LEFT);
                $db->prepare("UPDATE purchase_requisitions SET pr_number = :num WHERE id = :id")
                    ->execute(['num' => $prNumber, 'id' => $prId]);

                $db->prepare("
                    INSERT INTO purchase_requisition_history (purchase_requisition_id, action, notes, user_id, created_at)
                    VALUES (:id, 'created', :notes, :user, :now)
                ")->execute([
                    'id' => $prId,
                    'notes' => "Auto-generated by Reorder Policy Engine ({$triggerSource})",
                    'user' => $userId,
                    'now' => $now,
                ]);
            }

            // Get current max line_no and existing drug_ids on this draft PR
            $lineStmt = $db->prepare("
                SELECT drug_id, id, line_no
                FROM purchase_requisition_items
                WHERE purchase_requisition_id = :id
            ");
            $lineStmt->execute(['id' => $prId]);
            $existingLines = $lineStmt->fetchAll(PDO::FETCH_ASSOC);
            $maxLineNo = 0;
            $lineByDrug = [];
            foreach ($existingLines as $el) {
                $maxLineNo = max($maxLineNo, (int) $el['line_no']);
                $lineByDrug[(int) $el['drug_id']] = (int) $el['id'];
            }

            $insertItem = $db->prepare("
                INSERT INTO purchase_requisition_items
                    (purchase_requisition_id, line_no, drug_id, order_unit, units_per_package, quantity, base_quantity, notes, created_at)
                VALUES
                    (:req, :line_no, :drug, 'unit', NULL, :qty, :base, :notes, :now)
            ");

            $addedCount = 0;
            foreach ($itemsToDraft as $item) {
                $dId = (int) $item['drug_id'];
                $qty = round((float) $item['net_to_order_qty'], 3);
                if ($qty <= self::EPSILON) {
                    continue;
                }

                $note = sprintf(
                    'Usable: %s <= ROP: %s (ADC %s/d x %dd + SS %s)',
                    rtrim(rtrim(number_format($item['usable_stock'], 3), '0'), '.'),
                    rtrim(rtrim(number_format($item['reorder_point'], 3), '0'), '.'),
                    rtrim(rtrim(number_format($item['avg_daily_consumption'], 3), '0'), '.'),
                    $item['lead_time_days'],
                    rtrim(rtrim(number_format($item['safety_stock'], 3), '0'), '.')
                );

                if (isset($lineByDrug[$dId])) {
                    $db->prepare("
                        UPDATE purchase_requisition_items
                        SET quantity = quantity + :qty,
                            base_quantity = base_quantity + :base,
                            notes = :notes
                        WHERE id = :id
                    ")->execute([
                        'qty' => $qty,
                        'base' => $qty,
                        'notes' => mb_substr($note, 0, 255),
                        'id' => $lineByDrug[$dId],
                    ]);
                } else {
                    $maxLineNo++;
                    $insertItem->execute([
                        'req' => $prId,
                        'line_no' => $maxLineNo,
                        'drug' => $dId,
                        'qty' => $qty,
                        'base' => $qty,
                        'notes' => mb_substr($note, 0, 255),
                        'now' => $now,
                    ]);
                }
                $addedCount++;
            }

            if ($ownsTx) {
                $db->commit();
            }

            return [
                'pr_id' => $prId,
                'pr_number' => $prNumber,
                'items_count' => $addedCount,
            ];
        } catch (\Throwable $e) {
            if ($ownsTx && $db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }
}
