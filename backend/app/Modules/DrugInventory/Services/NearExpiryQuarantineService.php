<?php

namespace App\Modules\DrugInventory\Services;

use App\Core\Database;
use App\Modules\StockLevels\Services\PharmacyReorderPolicyService;
use PDO;

/**
 * Service for Near-Expiry Automated Quarantine Lock (<60 days).
 *
 * Prevents dispensing of expired or near-expiry medicines by automatically
 * flagging lots expiring within <60 days as Quarantined (`is_quarantined = 1`,
 * `is_active = 0`), logging the event, and blocking them in both outpatient
 * and inpatient dispensing workflows.
 */
class NearExpiryQuarantineService
{
    public const DEFAULT_THRESHOLD_DAYS = 60;

    public static function ensureTableExists(?PDO $db = null): void
    {
        self::ensureTablesExist($db);
    }

    public static function ensureTablesExist(?PDO $db = null): void
    {
        $db = $db ?: Database::connection();

        $db->exec("
            CREATE TABLE IF NOT EXISTS `pharmacy_quarantine_logs` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `execution_type` ENUM('cron_nightly', 'manual_scan', 'lot_update', 'quarantine_release') NOT NULL DEFAULT 'cron_nightly',
                `threshold_days` INT UNSIGNED NOT NULL DEFAULT 60,
                `target_date` DATE NOT NULL,
                `lots_quarantined_count` INT UNSIGNED NOT NULL DEFAULT 0,
                `total_quantity_quarantined` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
                `executed_by` INT UNSIGNED NULL DEFAULT NULL,
                `executed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                `summary_notes` VARCHAR(500) NULL DEFAULT NULL,
                `details` LONGTEXT NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                KEY `idx_quarantine_logs_date` (`target_date`),
                KEY `idx_quarantine_logs_type` (`execution_type`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $db->exec("
            CREATE TABLE IF NOT EXISTS `pharmacy_quarantine_settings` (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `near_expiry_days` INT UNSIGNED NOT NULL DEFAULT 60,
                `auto_lock_enabled` TINYINT(1) NOT NULL DEFAULT 1,
                `allow_admin_override` TINYINT(1) NOT NULL DEFAULT 1,
                `last_cron_run_at` DATETIME NULL DEFAULT NULL,
                `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $db->exec("
            INSERT INTO `pharmacy_quarantine_settings` (`id`, `near_expiry_days`, `auto_lock_enabled`, `allow_admin_override`)
            SELECT 1, 60, 1, 1
            WHERE NOT EXISTS (SELECT 1 FROM `pharmacy_quarantine_settings` WHERE `id` = 1);
        ");
    }

    /**
     * Retrieve current quarantine threshold configuration.
     */
    public function getSettings(): array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $row = $db->query("SELECT * FROM pharmacy_quarantine_settings WHERE id = 1 LIMIT 1")->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return [
                'near_expiry_days' => self::DEFAULT_THRESHOLD_DAYS,
                'auto_lock_enabled' => true,
                'allow_admin_override' => true,
                'last_cron_run_at' => null
            ];
        }

        return [
            'near_expiry_days' => (int) $row['near_expiry_days'],
            'auto_lock_enabled' => (bool) $row['auto_lock_enabled'],
            'allow_admin_override' => (bool) $row['allow_admin_override'],
            'last_cron_run_at' => $row['last_cron_run_at']
        ];
    }

    /**
     * Run the automated near-expiry quarantine scan across all warehouses.
     * Flag lots expiring in <60 days (or configured threshold) as quarantined.
     */
    public function runQuarantineScan(
        ?int $thresholdDays = null,
        string $executionType = 'cron_nightly',
        ?int $userId = null
    ): array {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $settings = $this->getSettings();
        $days = ($thresholdDays !== null && $thresholdDays > 0) ? $thresholdDays : ($settings['near_expiry_days'] ?: self::DEFAULT_THRESHOLD_DAYS);
        $today = date('Y-m-d');
        $cutoffDate = date('Y-m-d', strtotime("+{$days} days"));
        $now = date('Y-m-d H:i:s');

        $ownsTx = !$db->inTransaction();
        if ($ownsTx) {
            $db->beginTransaction();
        }

        try {
            // Find lots expiring on or before cutoff date that are not yet quarantined or still marked active
            $stmt = $db->prepare("
                SELECT dil.id, dil.drug_id, dil.warehouse_id, dil.lot_number, dil.quantity_on_hand, dil.expires_date,
                       dil.is_active, dil.is_quarantined, dil.quarantine_reason,
                       d.name AS drug_name, du.name AS unit_name, w.name AS warehouse_name
                FROM drug_inventory_lots dil
                JOIN drugs d ON d.id = dil.drug_id
                LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
                JOIN warehouses w ON w.id = dil.warehouse_id
                WHERE dil.deleted_at IS NULL
                  AND dil.quantity_on_hand > 0
                  AND dil.expires_date IS NOT NULL
                  AND dil.expires_date <= :cutoff
                  AND (dil.is_quarantined = 0 OR dil.is_active = 1)
                ORDER BY dil.expires_date ASC, dil.id ASC
                FOR UPDATE
            ");
            $stmt->execute(['cutoff' => $cutoffDate]);
            $candidates = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $quarantinedCount = 0;
            $quarantinedQty = 0.0;
            $affectedLots = [];
            $affectedWarehouseIds = [];

            $updateStmt = $db->prepare("
                UPDATE drug_inventory_lots
                SET is_quarantined = 1,
                    is_active = 0,
                    quarantine_reason = :reason,
                    quarantined_at = :now,
                    quarantined_by = :user,
                    updated_at = :now2,
                    updated_by = :user2
                WHERE id = :id
            ");

            foreach ($candidates as $c) {
                $exp = $c['expires_date'];
                $diffDays = (int) (new \DateTime($exp))->diff(new \DateTime($today))->format('%r%a');
                // diffDays <= 0 means already expired, positive means in future
                $isExpired = ($exp < $today);

                $reason = $isExpired
                    ? "Expired on {$exp} (Past expiry)"
                    : "Near-Expiry (<{$days} days: expires {$exp}, in " . abs($diffDays) . " day(s))";

                $updateStmt->execute([
                    'reason' => $reason,
                    'now' => $now,
                    'user' => $userId ?: 1,
                    'now2' => $now,
                    'user2' => $userId ?: 1,
                    'id' => (int) $c['id']
                ]);

                $quarantinedCount++;
                $quarantinedQty += (float) $c['quantity_on_hand'];
                $affectedWarehouseIds[(int) $c['warehouse_id']] = true;

                $affectedLots[] = [
                    'lot_id' => (int) $c['id'],
                    'drug_id' => (int) $c['drug_id'],
                    'drug_name' => $c['drug_name'],
                    'warehouse_name' => $c['warehouse_name'],
                    'lot_number' => $c['lot_number'],
                    'quantity_on_hand' => (float) $c['quantity_on_hand'],
                    'unit_name' => $c['unit_name'] ?: 'units',
                    'expires_date' => $exp,
                    'days_remaining' => $isExpired ? 0 : abs($diffDays),
                    'is_expired' => $isExpired,
                    'reason' => $reason
                ];
            }

            // Record execution in log
            $summary = "Quarantine scan ({$executionType}, threshold <{$days}d): {$quarantinedCount} lot(s) locked ({$quarantinedQty} units).";
            $db->prepare("
                INSERT INTO pharmacy_quarantine_logs
                    (execution_type, threshold_days, target_date, lots_quarantined_count, total_quantity_quarantined, executed_by, executed_at, summary_notes, details)
                VALUES
                    (:type, :days, :tdate, :lcount, :tqty, :user, :now, :summary, :details)
            ")->execute([
                'type' => $executionType,
                'days' => $days,
                'tdate' => $today,
                'lcount' => $quarantinedCount,
                'tqty' => round($quarantinedQty, 3),
                'user' => $userId ?: null,
                'now' => $now,
                'summary' => $summary,
                'details' => json_encode($affectedLots)
            ]);
            $logId = (int) $db->lastInsertId();

            // Update settings last_cron_run_at
            $db->prepare("UPDATE pharmacy_quarantine_settings SET last_cron_run_at = :now WHERE id = 1")
               ->execute(['now' => $now]);

            if ($ownsTx) {
                $db->commit();
            }

            // Trigger reorder evaluation for warehouses where usable stock changed
            $reorderTriggers = [];
            foreach (array_keys($affectedWarehouseIds) as $whId) {
                try {
                    $reorderEval = (new PharmacyReorderPolicyService())->evaluateAndTriggerReorder(
                        $whId,
                        $userId ?: 1,
                        'near_expiry_quarantine'
                    );
                    if (!empty($reorderEval['draft_pr_number'])) {
                        $reorderTriggers[] = "Draft PR {$reorderEval['draft_pr_number']} raised for {$reorderEval['warehouse_name']}";
                    }
                } catch (\Throwable $e) {}
            }

            return [
                'success' => true,
                'message' => $summary . ($reorderTriggers ? ' ' . implode(', ', $reorderTriggers) : ''),
                'data' => [
                    'log_id' => $logId,
                    'threshold_days' => $days,
                    'cutoff_date' => $cutoffDate,
                    'lots_quarantined_count' => $quarantinedCount,
                    'total_quantity_quarantined' => round($quarantinedQty, 3),
                    'affected_lots' => $affectedLots,
                    'reorder_triggers' => $reorderTriggers
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
     * List all currently quarantined or near-expiry lots.
     */
    public function listQuarantinedLots(array $filters = []): array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $today = date('Y-m-d');
        $settings = $this->getSettings();
        $threshold = $settings['near_expiry_days'] ?: self::DEFAULT_THRESHOLD_DAYS;
        $cutoffDate = date('Y-m-d', strtotime("+{$threshold} days"));

        $where = [
            'dil.deleted_at IS NULL',
            'dil.quantity_on_hand > 0',
            '(dil.is_quarantined = 1 OR (dil.expires_date IS NOT NULL AND dil.expires_date <= :cutoff))'
        ];
        $params = ['cutoff' => $cutoffDate];

        if (!empty($filters['warehouse_id'])) {
            $where[] = 'dil.warehouse_id = :wh';
            $params['wh'] = (int) $filters['warehouse_id'];
        }
        if (!empty($filters['drug_id'])) {
            $where[] = 'dil.drug_id = :drug';
            $params['drug'] = (int) $filters['drug_id'];
        }

        $whereSql = implode(' AND ', $where);

        $stmt = $db->prepare("
            SELECT dil.id, dil.drug_id, dil.warehouse_id, dil.lot_number, dil.quantity_on_hand,
                   dil.expires_date, dil.is_active, dil.is_quarantined, dil.quarantine_reason,
                   dil.quarantined_at,
                   d.name AS drug_name, d.generic_name, d.strength,
                   du.name AS unit_name,
                   w.name AS warehouse_name,
                   DATEDIFF(dil.expires_date, :today) AS days_until_expiry,
                   (SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                    FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                    WHERE u.id = dil.quarantined_by LIMIT 1) AS quarantined_by_name
            FROM drug_inventory_lots dil
            JOIN drugs d ON d.id = dil.drug_id
            LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
            JOIN warehouses w ON w.id = dil.warehouse_id
            WHERE {$whereSql}
            ORDER BY dil.expires_date ASC, dil.id ASC
        ");
        $stmt->execute(array_merge($params, ['today' => $today]));
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stats = [
            'total_quarantined_lots' => count($rows),
            'total_quarantined_quantity' => 0.0,
            'expired_count' => 0,
            'under_30_days_count' => 0,
            'under_60_days_count' => 0
        ];

        $items = array_map(function ($r) use (&$stats, $today) {
            $qty = (float) $r['quantity_on_hand'];
            $stats['total_quarantined_quantity'] += $qty;
            $days = $r['days_until_expiry'] !== null ? (int) $r['days_until_expiry'] : 999;

            if ($days < 0) {
                $stats['expired_count']++;
                $urgency = 'expired';
            } elseif ($days <= 30) {
                $stats['under_30_days_count']++;
                $urgency = 'critical';
            } else {
                $stats['under_60_days_count']++;
                $urgency = 'warning';
            }

            return [
                'id' => (int) $r['id'],
                'drug_id' => (int) $r['drug_id'],
                'drug_name' => $r['drug_name'],
                'generic_name' => $r['generic_name'],
                'strength' => $r['strength'],
                'unit_name' => $r['unit_name'] ?: 'units',
                'warehouse_id' => (int) $r['warehouse_id'],
                'warehouse_name' => $r['warehouse_name'],
                'lot_number' => $r['lot_number'],
                'quantity_on_hand' => $qty,
                'expires_date' => $r['expires_date'],
                'days_until_expiry' => $days,
                'urgency' => $urgency,
                'is_quarantined' => (bool) $r['is_quarantined'],
                'is_active' => (bool) $r['is_active'],
                'quarantine_reason' => $r['quarantine_reason'] ?: ($days < 0 ? 'Expired' : "Near-Expiry (<{$days}d)"),
                'quarantined_at' => $r['quarantined_at'],
                'quarantined_by_name' => $r['quarantined_by_name'] ?: 'System Nightly Cron'
            ];
        }, $rows);

        $stats['total_quarantined_quantity'] = round($stats['total_quarantined_quantity'], 3);

        return [
            'settings' => $settings,
            'stats' => $stats,
            'lots' => $items
        ];
    }

    /**
     * Release a lot from quarantine with mandatory documented clinical reason.
     */
    public function releaseQuarantine(int $lotId, string $clinicalReason, int $userId): array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $reason = trim($clinicalReason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Please provide a documented clinical or administrative reason to release this lot from quarantine.'];
        }

        $stmt = $db->prepare("SELECT * FROM drug_inventory_lots WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $lotId]);
        $lot = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$lot) {
            return ['success' => false, 'message' => 'Inventory lot not found.'];
        }

        $now = date('Y-m-d H:i:s');
        $note = "Quarantine released by User #{$userId}: {$reason}";

        $db->prepare("
            UPDATE drug_inventory_lots
            SET is_quarantined = 0,
                is_active = 1,
                quarantine_reason = :note,
                updated_at = :now,
                updated_by = :user
            WHERE id = :id
        ")->execute([
            'note' => mb_substr($note, 0, 255),
            'now' => $now,
            'user' => $userId,
            'id' => $lotId
        ]);

        $db->prepare("
            INSERT INTO pharmacy_quarantine_logs
                (execution_type, threshold_days, target_date, lots_quarantined_count, total_quantity_quarantined, executed_by, executed_at, summary_notes, details)
            VALUES
                ('quarantine_release', 60, CURDATE(), 1, :qty, :user, :now, :summary, :details)
        ")->execute([
            'qty' => (float) $lot['quantity_on_hand'],
            'user' => $userId,
            'now' => $now,
            'summary' => "Lot {$lot['lot_number']} quarantine released: {$reason}",
            'details' => json_encode(['lot_id' => $lotId, 'reason' => $reason, 'lot_number' => $lot['lot_number']])
        ]);

        return ['success' => true, 'message' => "Lot {$lot['lot_number']} released from quarantine."];
    }

    /**
     * Get recent quarantine scan logs.
     */
    public function getLogs(int $limit = 20): array
    {
        $db = Database::connection();
        self::ensureTablesExist($db);

        $stmt = $db->prepare("
            SELECT l.*,
                   (SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                    FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                    WHERE u.id = l.executed_by LIMIT 1) AS executed_by_name
            FROM pharmacy_quarantine_logs l
            ORDER BY l.executed_at DESC, l.id DESC
            LIMIT :lim
        ");
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return array_map(function ($r) {
            $r['id'] = (int) $r['id'];
            $r['threshold_days'] = (int) $r['threshold_days'];
            $r['lots_quarantined_count'] = (int) $r['lots_quarantined_count'];
            $r['total_quantity_quarantined'] = (float) $r['total_quantity_quarantined'];
            $r['executed_by_name'] = $r['executed_by_name'] ?: 'System Nightly Cron';
            $r['details'] = $r['details'] ? json_decode($r['details'], true) : [];
            return $r;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Check if a lot is blocked from dispensing due to quarantine or near-expiry (<60 days).
     */
    public static function isLotBlocked(array $lot, int $thresholdDays = 60): ?string
    {
        if (!empty($lot['is_quarantined'])) {
            return $lot['quarantine_reason'] ?: "Lot is flagged under Quarantine Lock.";
        }

        if (isset($lot['is_active']) && (int) $lot['is_active'] === 0) {
            return "Lot is marked inactive / quarantined.";
        }

        if (!empty($lot['expires_date'])) {
            $today = date('Y-m-d');
            if ($lot['expires_date'] < $today) {
                return "Lot expired on {$lot['expires_date']}. Dispensing expired stock is prohibited.";
            }

            $cutoff = date('Y-m-d', strtotime("+{$thresholdDays} days"));
            if ($lot['expires_date'] <= $cutoff) {
                $days = (int) (new \DateTime($lot['expires_date']))->diff(new \DateTime($today))->format('%a');
                return "Near-Expiry Quarantine Lock: Lot expires on {$lot['expires_date']} ({$days} days remaining, threshold <{$thresholdDays} days).";
            }
        }

        return null;
    }
}
