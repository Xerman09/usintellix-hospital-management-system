<?php

namespace App\Modules\StockLevels\Services;

use App\Core\Database;
use PDO;

/**
 * Pharmacy > Stock Levels: the minimum (reorder point) and optional
 * maximum of each item at each storage location (warehouse_stock_levels,
 * the same rows the Storage Locations "Stock Check" edits one at a time).
 *
 *   * levels()   -- one location: every inventory item with its stock,
 *                   minimum, maximum and status, for setting levels in bulk.
 *   * save()     -- sets / changes / clears many items' levels at once.
 *   * copy()     -- copies one location's levels to another.
 *   * lowStock() -- every location's items below their minimum (what the
 *                   pharmacy dashboard lists).
 *
 * Status is worked out from usable stock -- on hand minus expired lots --
 * because expired stock can't be issued:
 *   out  -- minimum above 0 and no usable stock
 *   low  -- usable stock below the minimum
 *   over -- above the maximum
 *   ok   -- otherwise;  no_level -- no minimum set here.
 * Quantities are in each item's dispensing unit.
 */
class StockLevelService
{
    public const VIEW_ROLES = ['admin', 'receptionist', 'doctor'];

    public const EDIT_ROLES = ['admin'];

    private const EPSILON = 0.0005;

    /** Locations for the pickers, with how many items are set / below minimum. */
    public function options(): array
    {
        $summary = $this->lowStock([]);

        return [
            'locations' => array_map(fn($l) => [
                'id' => $l['id'], 'name' => $l['name'], 'code' => $l['code'], 'location_type' => $l['location_type'],
                'is_active' => $l['is_active'], 'counts' => $l['counts']
            ], $summary['locations'])
        ];
    }

    /** Filters: none yet. Every inventory item, plus anything with stock or a level at the location. */
    public function levels(int $warehouseId): ?array
    {
        $location = $this->location($warehouseId);

        if (!$location) {
            return null;
        }

        $items = $this->rows([$warehouseId], false)[$warehouseId] ?? [];

        return [
            'location' => $location,
            'items' => $items,
            'counts' => $this->counts($items)
        ];
    }

    /**
     * levels: [{drug_id, min_level, max_level}]. A blank min_level clears
     * that item's level here. All or nothing.
     */
    public function save(int $warehouseId, array $levels, int $userId): array
    {
        if (!$this->location($warehouseId)) {
            return ['success' => false, 'message' => 'Storage location not found.', 'not_found' => true];
        }

        if (!$levels) {
            return ['success' => false, 'message' => 'There are no changes to save.'];
        }

        $db = Database::connection();
        $drugIds = array_values(array_unique(array_filter(array_map(fn($l) => (int) ($l['drug_id'] ?? 0), $levels))));
        $known = $drugIds
            ? array_flip(array_map('intval', $db->query("SELECT id FROM drugs WHERE deleted_at IS NULL AND id IN (" . implode(',', $drugIds) . ")")->fetchAll(PDO::FETCH_COLUMN)))
            : [];

        $errors = [];
        $upserts = [];
        $removals = [];
        $seen = [];

        foreach ($levels as $level) {
            $drugId = (int) ($level['drug_id'] ?? 0);

            if (!$drugId || !isset($known[$drugId])) {
                $errors["{$drugId}"] = 'This item no longer exists.';
                continue;
            }
            if (isset($seen[$drugId])) {
                $errors["{$drugId}"] = 'This item is listed twice.';
                continue;
            }
            $seen[$drugId] = true;

            $rawMin = trim((string) ($level['min_level'] ?? ''));
            $rawMax = trim((string) ($level['max_level'] ?? ''));

            if ($rawMin === '') {
                if ($rawMax !== '') {
                    $errors["{$drugId}"] = 'Enter a minimum, or clear the maximum too.';
                    continue;
                }
                $removals[] = $drugId;
                continue;
            }

            if (!is_numeric($rawMin) || (float) $rawMin < 0) {
                $errors["{$drugId}"] = 'The minimum must be 0 or more.';
                continue;
            }

            $min = round((float) $rawMin, 3);
            $max = null;

            if ($rawMax !== '') {
                if (!is_numeric($rawMax) || (float) $rawMax < 0) {
                    $errors["{$drugId}"] = 'The maximum must be 0 or more, or blank.';
                    continue;
                }
                $max = round((float) $rawMax, 3);
                if ($max < $min) {
                    $errors["{$drugId}"] = 'The maximum can\'t be below the minimum.';
                    continue;
                }
            }

            $upserts[] = ['drug_id' => $drugId, 'min' => $min, 'max' => $max];
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Some levels need fixing.', 'errors' => $errors];
        }

        $now = date('Y-m-d H:i:s');
        $ownsTransaction = $this->begin($db);

        try {
            $upsert = $db->prepare(
                "INSERT INTO warehouse_stock_levels (warehouse_id, drug_id, min_level, max_level, created_at, created_by)
                 VALUES (:w, :d, :min, :max, :now, :user)
                 ON DUPLICATE KEY UPDATE updated_at = IF(min_level <=> VALUES(min_level) AND max_level <=> VALUES(max_level), updated_at, :now2),
                                         updated_by = IF(min_level <=> VALUES(min_level) AND max_level <=> VALUES(max_level), updated_by, :user2),
                                         min_level = VALUES(min_level), max_level = VALUES(max_level)"
            );
            foreach ($upserts as $u) {
                $upsert->execute(['w' => $warehouseId, 'd' => $u['drug_id'], 'min' => $u['min'], 'max' => $u['max'],
                    'now' => $now, 'user' => $userId, 'now2' => $now, 'user2' => $userId]);
            }

            $removed = 0;
            if ($removals) {
                $stmt = $db->prepare("DELETE FROM warehouse_stock_levels WHERE warehouse_id = :w AND drug_id IN (" . implode(',', $removals) . ")");
                $stmt->execute(['w' => $warehouseId]);
                $removed = $stmt->rowCount();
            }

            $this->commit($db, $ownsTransaction);
        } catch (\Throwable $e) {
            $this->rollBack($db, $ownsTransaction);
            throw $e;
        }

        $parts = [];
        if ($upserts) $parts[] = count($upserts) . ' level' . (count($upserts) === 1 ? '' : 's') . ' saved';
        if ($removed) $parts[] = "{$removed} cleared";

        return ['success' => true, 'message' => ucfirst(implode(', ', $parts ?: ['Nothing changed'])) . '.', 'data' => ['saved' => count($upserts), 'removed' => $removed]];
    }

    /** Copies from_warehouse's levels to to_warehouse. overwrite = also replace levels already set there. */
    public function copy(int $fromId, int $toId, bool $overwrite, int $userId): array
    {
        if (!$this->location($fromId) || !$this->location($toId)) {
            return ['success' => false, 'message' => 'Storage location not found.'];
        }
        if ($fromId === $toId) {
            return ['success' => false, 'message' => 'Choose a different location to copy from.'];
        }

        $db = Database::connection();
        $now = date('Y-m-d H:i:s');
        $ownsTransaction = $this->begin($db);

        try {
            $stmt = $db->prepare(
                "SELECT s.drug_id, s.min_level, s.max_level, t.id AS existing_id
                 FROM warehouse_stock_levels s
                 JOIN drugs d ON d.id = s.drug_id AND d.deleted_at IS NULL
                 LEFT JOIN warehouse_stock_levels t ON t.warehouse_id = :to AND t.drug_id = s.drug_id
                 WHERE s.warehouse_id = :from
                 FOR UPDATE"
            );
            $stmt->execute(['from' => $fromId, 'to' => $toId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $added = 0;
            $replaced = 0;
            $skipped = 0;
            $insert = $db->prepare(
                "INSERT INTO warehouse_stock_levels (warehouse_id, drug_id, min_level, max_level, created_at, created_by)
                 VALUES (:w, :d, :min, :max, :now, :user)"
            );
            $update = $db->prepare(
                "UPDATE warehouse_stock_levels SET min_level = :min, max_level = :max, updated_at = :now, updated_by = :user WHERE id = :id"
            );

            foreach ($rows as $r) {
                if ($r['existing_id'] === null) {
                    $insert->execute(['w' => $toId, 'd' => $r['drug_id'], 'min' => $r['min_level'], 'max' => $r['max_level'], 'now' => $now, 'user' => $userId]);
                    $added++;
                } elseif ($overwrite) {
                    $update->execute(['min' => $r['min_level'], 'max' => $r['max_level'], 'now' => $now, 'user' => $userId, 'id' => $r['existing_id']]);
                    $replaced++;
                } else {
                    $skipped++;
                }
            }

            $this->commit($db, $ownsTransaction);
        } catch (\Throwable $e) {
            $this->rollBack($db, $ownsTransaction);
            throw $e;
        }

        if (!$rows) {
            return ['success' => false, 'message' => 'That location has no levels set to copy.'];
        }

        $parts = ["{$added} added"];
        if ($replaced) $parts[] = "{$replaced} replaced";
        if ($skipped) $parts[] = "{$skipped} already set and kept";

        return ['success' => true, 'message' => 'Levels copied: ' . implode(', ', $parts) . '.', 'data' => compact('added', 'replaced', 'skipped')];
    }

    /**
     * Filters: warehouse_id?. Per active location: counts and the items
     * that are out or below their minimum, worst first.
     */
    public function lowStock(array $filters): array
    {
        $db = Database::connection();
        $where = ['w.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['warehouse_id'])) {
            $where[] = 'w.id = :w';
            $params['w'] = (int) $filters['warehouse_id'];
        }

        $stmt = $db->prepare(
            "SELECT w.id, w.name, w.code, w.location_type, w.is_active,
                    " . self::userNameSql('w.custodian_user_id') . " AS custodian_name
             FROM warehouses w WHERE " . implode(' AND ', $where) . " ORDER BY w.name"
        );
        $stmt->execute($params);
        $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $rows = $locations ? $this->rows(array_map(fn($l) => (int) $l['id'], $locations), true) : [];
        $out = [];
        $totals = ['locations_with_low' => 0, 'out' => 0, 'low' => 0, 'tracked' => 0];

        foreach ($locations as $l) {
            $items = $rows[(int) $l['id']] ?? [];
            $counts = $this->counts($items);
            $below = array_values(array_filter($items, fn($i) => in_array($i['status'], ['out', 'low'], true)));

            // Out first, then the biggest shortfall against the minimum.
            usort($below, fn($a, $b) => [$a['status'] !== 'out', $a['usable'] / max($a['min_level'], self::EPSILON), $a['drug_name']]
                <=> [$b['status'] !== 'out', $b['usable'] / max($b['min_level'], self::EPSILON), $b['drug_name']]);

            $totals['out'] += $counts['out'];
            $totals['low'] += $counts['low'];
            $totals['tracked'] += $counts['tracked'];
            if ($below) $totals['locations_with_low']++;

            $out[] = [
                'id' => (int) $l['id'], 'name' => $l['name'], 'code' => $l['code'], 'location_type' => $l['location_type'],
                'is_active' => (bool) $l['is_active'], 'custodian_name' => $l['custodian_name'],
                'counts' => $counts, 'items' => $below
            ];
        }

        return ['locations' => $out, 'totals' => $totals];
    }

    /**
     * warehouse_id => item rows. $onlyLevels: just items with a level set
     * (low stock); otherwise every inventory item too (for setting levels).
     */
    private function rows(array $warehouseIds, bool $onlyLevels): array
    {
        $db = Database::connection();
        $in = implode(',', array_map('intval', $warehouseIds));
        $today = date('Y-m-d');

        $stock = [];
        foreach ($db->query(
            "SELECT warehouse_id, drug_id, SUM(quantity_on_hand) AS on_hand,
                    SUM(CASE WHEN expires_date IS NOT NULL AND expires_date < " . $db->quote($today) . " THEN quantity_on_hand ELSE 0 END) AS expired,
                    MIN(CASE WHEN quantity_on_hand > 0 AND (expires_date IS NULL OR expires_date >= " . $db->quote($today) . ") THEN expires_date END) AS next_expiry
             FROM drug_inventory_lots
             WHERE warehouse_id IN ({$in}) AND deleted_at IS NULL AND is_active = 1
             GROUP BY warehouse_id, drug_id"
        )->fetchAll(PDO::FETCH_ASSOC) as $s) {
            $stock[$s['warehouse_id']][$s['drug_id']] = $s;
        }

        $levels = [];
        foreach ($db->query(
            "SELECT l.*, " . self::userNameSql('COALESCE(l.updated_by, l.created_by)') . " AS set_by
             FROM warehouse_stock_levels l WHERE l.warehouse_id IN ({$in})"
        )->fetchAll(PDO::FETCH_ASSOC) as $l) {
            $levels[$l['warehouse_id']][$l['drug_id']] = $l;
        }

        // On the way: sent on a stock transfer, not yet received.
        $incoming = [];
        foreach ($db->query(
            "SELECT t.to_warehouse_id, x.drug_id, SUM(x.quantity_sent) AS qty
             FROM stock_transfer_lots x JOIN stock_transfers t ON t.id = x.stock_transfer_id
             WHERE t.status = 'in_transit' AND t.deleted_at IS NULL AND t.to_warehouse_id IN ({$in})
             GROUP BY t.to_warehouse_id, x.drug_id"
        )->fetchAll(PDO::FETCH_ASSOC) as $x) {
            $incoming[$x['to_warehouse_id']][$x['drug_id']] = (float) $x['qty'];
        }

        // Asked for: open requests to this location not sent yet.
        $requested = [];
        foreach ($db->query(
            "SELECT t.to_warehouse_id, i.drug_id, SUM(i.quantity) AS qty
             FROM stock_transfer_items i JOIN stock_transfers t ON t.id = i.stock_transfer_id
             WHERE t.status = 'requested' AND t.deleted_at IS NULL AND t.to_warehouse_id IN ({$in})
             GROUP BY t.to_warehouse_id, i.drug_id"
        )->fetchAll(PDO::FETCH_ASSOC) as $x) {
            $requested[$x['to_warehouse_id']][$x['drug_id']] = (float) $x['qty'];
        }

        $drugs = $db->query(
            "SELECT d.id, d.name, d.generic_name, d.strength, d.product_type, d.is_active, d.allow_inventory, d.min_level_global,
                    du.name AS unit_name, dc.name AS category_name
             FROM drugs d
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN drug_categories dc ON dc.id = d.category_id
             WHERE d.deleted_at IS NULL
             ORDER BY d.name"
        )->fetchAll(PDO::FETCH_ASSOC);

        $out = [];
        foreach ($warehouseIds as $w) {
            $out[$w] = [];
            foreach ($drugs as $d) {
                $s = $stock[$w][$d['id']] ?? null;
                $l = $levels[$w][$d['id']] ?? null;
                $onHand = $s ? round((float) $s['on_hand'], 3) : 0.0;

                if ($onlyLevels ? !$l : (!$l && $onHand <= self::EPSILON && !($d['is_active'] && $d['allow_inventory']))) {
                    continue;
                }
                // Low stock only counts items still in use.
                if ($onlyLevels && !$d['is_active']) {
                    continue;
                }

                $expired = $s ? round((float) $s['expired'], 3) : 0.0;
                $usable = round($onHand - $expired, 3);
                $min = $l ? (float) $l['min_level'] : null;
                $max = $l && $l['max_level'] !== null ? (float) $l['max_level'] : null;
                $coming = $incoming[$w][$d['id']] ?? 0.0;

                if ($min === null) {
                    $status = 'no_level';
                } elseif ($min > 0 && $usable <= self::EPSILON) {
                    $status = 'out';
                } elseif ($usable < $min - self::EPSILON) {
                    $status = 'low';
                } elseif ($max !== null && $usable > $max + self::EPSILON) {
                    $status = 'over';
                } else {
                    $status = 'ok';
                }

                $out[$w][] = [
                    'drug_id' => (int) $d['id'],
                    'drug_name' => $d['name'],
                    'generic_name' => $d['generic_name'],
                    'strength' => $d['strength'],
                    'category_name' => $d['category_name'],
                    'product_type' => $d['product_type'],
                    'unit_name' => $d['unit_name'],
                    'is_active' => (bool) $d['is_active'],
                    'on_hand' => $onHand,
                    'expired' => $expired,
                    'usable' => $usable,
                    'next_expiry' => $s['next_expiry'] ?? null,
                    'incoming' => $coming,
                    'requested' => $requested[$w][$d['id']] ?? 0.0,
                    'min_level' => $min,
                    'max_level' => $max,
                    'status' => $status,
                    'shortfall' => $min !== null && $usable < $min ? round($min - $usable, 3) : 0.0,
                    // Enough to bring it up to the maximum (or the minimum), less what's already on the way.
                    'suggested_qty' => in_array($status, ['out', 'low'], true) ? max(0.0, round(($max ?? $min) - $usable - $coming, 3)) : 0.0,
                    'catalog_reorder_level' => (float) $d['min_level_global'],
                    'level_set_by' => $l['set_by'] ?? null,
                    'level_updated_at' => $l ? ($l['updated_at'] ?? $l['created_at']) : null
                ];
            }
        }

        return $out;
    }

    private function counts(array $items): array
    {
        $count = fn(string $status) => count(array_filter($items, fn($i) => $i['status'] === $status));

        return [
            'tracked' => count(array_filter($items, fn($i) => $i['min_level'] !== null)),
            'out' => $count('out'),
            'low' => $count('low'),
            'ok' => $count('ok'),
            'over' => $count('over'),
            'no_level' => $count('no_level')
        ];
    }

    /** Own the transaction, or join the caller's with a savepoint. */
    private function begin(PDO $db): bool
    {
        if (!$db->inTransaction()) {
            $db->beginTransaction();
            return true;
        }
        $db->exec('SAVEPOINT stock_levels_step');
        return false;
    }

    private function commit(PDO $db, bool $owns): void
    {
        $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT stock_levels_step');
    }

    private function rollBack(PDO $db, bool $owns): void
    {
        $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT stock_levels_step');
    }

    private function location(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, code, location_type, is_active FROM warehouses WHERE id = :id AND deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ? ['id' => (int) $row['id'], 'name' => $row['name'], 'code' => $row['code'], 'location_type' => $row['location_type'], 'is_active' => (bool) $row['is_active']] : null;
    }

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }
}
