<?php

namespace App\Modules\MedicineLedger\Services;

use App\Core\Database;
use App\Modules\DrugInventory\Services\StockLedgerService;
use PDO;

/**
 * Pharmacy > Medicine Ledger: reads drug_stock_movements (written by
 * StockLedgerService whenever stock changes).
 *
 *   * ledger()  -- the stock card of one item: every movement in date
 *                  order with a running balance, optionally for one
 *                  location and/or lot. The balance before the period is
 *                  the opening balance; the last balance is the closing
 *                  one, checked against what's on hand now.
 *   * summary() -- per item, for a period and (optionally) a location:
 *                  opening, received, transfers in / out, returned,
 *                  destroyed, count adjustments, dispensed, closing.
 *
 * Quantities are in each item's dispensing unit.
 */
class MedicineLedgerService
{
    public const ROLES = ['admin', 'receptionist', 'doctor', 'accountant'];

    /** Rows shown at most on one stock card (the balance still counts everything). */
    private const ROW_LIMIT = 5000;

    private const EPSILON = 0.0005;

    /** Items, locations and lots for the filters. */
    public function options(): array
    {
        $db = Database::connection();

        $drugs = $db->query(
            "SELECT d.id, d.name, d.product_type, d.is_active, du.name AS unit_name,
                    COALESCE((SELECT SUM(l.quantity_on_hand) FROM drug_inventory_lots l WHERE l.drug_id = d.id AND l.deleted_at IS NULL), 0) AS on_hand,
                    (SELECT COUNT(*) FROM drug_stock_movements m WHERE m.drug_id = d.id) AS movements
             FROM drugs d LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             WHERE d.deleted_at IS NULL AND (d.allow_inventory = 1 OR EXISTS (SELECT 1 FROM drug_stock_movements m WHERE m.drug_id = d.id))
             ORDER BY d.name"
        )->fetchAll(PDO::FETCH_ASSOC);

        $lots = $db->query(
            "SELECT l.id, l.drug_id, l.warehouse_id, l.lot_number, l.expires_date, l.quantity_on_hand, l.deleted_at
             FROM drug_inventory_lots l
             WHERE l.deleted_at IS NULL OR EXISTS (SELECT 1 FROM drug_stock_movements m WHERE m.lot_id = l.id)
             ORDER BY l.expires_date IS NULL, l.expires_date, l.lot_number"
        )->fetchAll(PDO::FETCH_ASSOC);

        return [
            'drugs' => array_map(fn($d) => [
                'id' => (int) $d['id'], 'name' => $d['name'], 'product_type' => $d['product_type'], 'unit_name' => $d['unit_name'],
                'is_active' => (bool) $d['is_active'], 'on_hand' => (float) $d['on_hand'], 'movements' => (int) $d['movements']
            ], $drugs),
            'warehouses' => $db->query("SELECT id, name FROM warehouses WHERE deleted_at IS NULL ORDER BY name")->fetchAll(PDO::FETCH_ASSOC),
            'lots' => array_map(fn($l) => [
                'id' => (int) $l['id'], 'drug_id' => (int) $l['drug_id'], 'warehouse_id' => (int) $l['warehouse_id'],
                'lot_number' => $l['lot_number'], 'expires_date' => $l['expires_date'], 'on_hand' => (float) $l['quantity_on_hand'],
                'is_deleted' => $l['deleted_at'] !== null
            ], $lots),
            'types' => array_map(fn($k, $v) => ['value' => $k, 'label' => $v], array_keys(StockLedgerService::TYPES), StockLedgerService::TYPES)
        ];
    }

    /** Filters: drug_id (required), warehouse_id?, lot_id?, date_from?, date_to?, type? */
    public function ledger(array $filters): ?array
    {
        $db = Database::connection();
        $drugId = (int) ($filters['drug_id'] ?? 0);
        $stmt = $db->prepare(
            "SELECT d.id, d.name, d.product_type, du.name AS unit_name, d.unit_cost
             FROM drugs d LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id WHERE d.id = :id"
        );
        $stmt->execute(['id' => $drugId]);
        $drug = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$drug) {
            return null;
        }

        $where = ['m.drug_id = :drug'];
        $params = ['drug' => $drugId];

        if (!empty($filters['warehouse_id'])) {
            $where[] = 'm.warehouse_id = :warehouse';
            $params['warehouse'] = (int) $filters['warehouse_id'];
        }

        if (!empty($filters['lot_id'])) {
            $where[] = 'm.lot_id = :lot';
            $params['lot'] = (int) $filters['lot_id'];
        }

        $from = $this->date($filters['date_from'] ?? null);
        $to = $this->date($filters['date_to'] ?? null);
        $type = isset(StockLedgerService::TYPES[$filters['type'] ?? '']) ? $filters['type'] : null;

        if ($to !== null) {
            $where[] = 'm.movement_date <= :to';
            $params['to'] = $to;
        }

        // Everything up to the end of the period, in order: the running balance needs it all.
        $stmt = $db->prepare(
            "SELECT m.*, l.lot_number, l.expires_date, w.name AS warehouse_name,
                    " . self::userNameSql('m.created_by') . " AS recorded_by
             FROM drug_stock_movements m
             JOIN drug_inventory_lots l ON l.id = m.lot_id
             JOIN warehouses w ON w.id = m.warehouse_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY m.movement_date, m.movement_type = 'opening' DESC, m.created_at, m.id"
        );
        $stmt->execute($params);

        $balance = 0.0;
        $opening = 0.0;
        $rows = [];
        $totals = ['in' => 0.0, 'out' => 0.0, 'value_in' => 0.0, 'value_out' => 0.0, 'by_type' => []];
        $truncated = false;

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $m) {
            $qty = (float) $m['quantity'];
            $balance = round($balance + $qty, 3);

            if ($from !== null && $m['movement_date'] < $from) {
                $opening = $balance;
                continue;
            }

            $totals[$qty >= 0 ? 'in' : 'out'] += abs($qty);
            $totals[$qty >= 0 ? 'value_in' : 'value_out'] += abs($qty) * (float) $m['unit_cost'];
            $totals['by_type'][$m['movement_type']] = round(($totals['by_type'][$m['movement_type']] ?? 0) + $qty, 3);

            if ($type !== null && $m['movement_type'] !== $type) {
                continue;
            }

            if (count($rows) >= self::ROW_LIMIT) {
                $truncated = true;
                continue;
            }

            $rows[] = [
                'id' => (int) $m['id'],
                'date' => $m['movement_date'],
                'type' => $m['movement_type'],
                'type_label' => StockLedgerService::TYPES[$m['movement_type']] ?? $m['movement_type'],
                'reference_no' => $m['reference_no'],
                'counterparty' => $m['counterparty'],
                'reason' => $m['reason'],
                'notes' => $m['notes'],
                'warehouse_id' => (int) $m['warehouse_id'],
                'warehouse_name' => $m['warehouse_name'],
                'lot_id' => (int) $m['lot_id'],
                'lot_number' => $m['lot_number'],
                'expires_date' => $m['expires_date'],
                'quantity_in' => $qty > 0 ? $qty : null,
                'quantity_out' => $qty < 0 ? -$qty : null,
                'balance' => $balance,
                'unit_cost' => (float) $m['unit_cost'],
                'value' => round($qty * (float) $m['unit_cost'], 2),
                'recorded_by' => $m['recorded_by'],
                'recorded_at' => $m['created_at']
            ];
        }

        // What's on hand now in the same scope, to check the ledger against.
        $lotWhere = ['l.drug_id = :drug', 'l.deleted_at IS NULL'];
        $lotParams = ['drug' => $drugId];
        if (!empty($filters['warehouse_id'])) {
            $lotWhere[] = 'l.warehouse_id = :warehouse';
            $lotParams['warehouse'] = (int) $filters['warehouse_id'];
        }
        if (!empty($filters['lot_id'])) {
            $lotWhere[] = 'l.id = :lot';
            $lotParams['lot'] = (int) $filters['lot_id'];
        }
        $stmt = $db->prepare("SELECT COALESCE(SUM(l.quantity_on_hand), 0) FROM drug_inventory_lots l WHERE " . implode(' AND ', $lotWhere));
        $stmt->execute($lotParams);
        $onHand = round((float) $stmt->fetchColumn(), 3);
        $isCurrent = $to === null || $to >= date('Y-m-d');

        return [
            'drug' => ['id' => (int) $drug['id'], 'name' => $drug['name'], 'product_type' => $drug['product_type'], 'unit_name' => $drug['unit_name']],
            'filters' => ['warehouse_id' => $filters['warehouse_id'] ?? null, 'lot_id' => $filters['lot_id'] ?? null, 'date_from' => $from, 'date_to' => $to, 'type' => $type],
            'opening_balance' => $from !== null ? $opening : 0.0,
            'closing_balance' => $balance,
            'totals' => [
                'in' => round($totals['in'], 3),
                'out' => round($totals['out'], 3),
                'value_in' => round($totals['value_in'], 2),
                'value_out' => round($totals['value_out'], 2),
                'by_type' => $totals['by_type']
            ],
            'on_hand' => $onHand,
            // The ledger must end at what's on hand; a difference means stock changed without a ledger entry.
            'reconciled' => $isCurrent ? abs($balance - $onHand) < self::EPSILON : null,
            'rows' => $rows,
            'truncated' => $truncated
        ];
    }

    /** Filters: date_from?, date_to?, warehouse_id?, only_moved? */
    public function summary(array $filters): array
    {
        $db = Database::connection();
        $from = $this->date($filters['date_from'] ?? null);
        $to = $this->date($filters['date_to'] ?? null);
        $where = ['1 = 1'];
        $params = [];

        if (!empty($filters['warehouse_id'])) {
            $where[] = 'm.warehouse_id = :warehouse';
            $params['warehouse'] = (int) $filters['warehouse_id'];
        }

        if ($to !== null) {
            $where[] = 'm.movement_date <= :to';
            $params['to'] = $to;
        }

        $period = $from !== null ? 'm.movement_date >= :from' : '1 = 1';
        $before = $from !== null ? 'm.movement_date < :from2' : '1 = 0';
        if ($from !== null) {
            $params['from'] = $from;
            $params['from2'] = $from;
            foreach (array_keys(StockLedgerService::TYPES) as $i => $type) {
                $params["from_t{$i}"] = $from;
            }
        }

        $columns = [];
        foreach (array_keys(StockLedgerService::TYPES) as $i => $type) {
            $columns[] = "SUM(CASE WHEN m.movement_type = '{$type}'" . ($from !== null ? " AND m.movement_date >= :from_t{$i}" : '') . " THEN m.quantity ELSE 0 END) AS t_{$type}";
        }

        $stmt = $db->prepare(
            "SELECT m.drug_id, d.name AS drug_name, du.name AS unit_name,
                    SUM(CASE WHEN {$before} THEN m.quantity ELSE 0 END) AS opening,
                    SUM(m.quantity) AS closing,
                    SUM(CASE WHEN {$period} THEN 1 ELSE 0 END) AS moves,
                    " . implode(', ', $columns) . "
             FROM drug_stock_movements m
             JOIN drugs d ON d.id = m.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             WHERE " . implode(' AND ', $where) . "
             GROUP BY m.drug_id, d.name, du.name
             ORDER BY d.name"
        );
        $stmt->execute($params);

        $rows = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $t = fn(string $type) => round((float) $r["t_{$type}"], 3);
            $row = [
                'drug_id' => (int) $r['drug_id'],
                'drug_name' => $r['drug_name'],
                'unit_name' => $r['unit_name'],
                'opening' => round((float) $r['opening'], 3),
                // The period's opening rows count as the starting balance, not movement.
                'received' => round($t('received') + $t('receipt_voided'), 3),
                'transfer_in' => $t('transfer_in'),
                'transfer_out' => round($t('transfer_out') + $t('transfer_cancelled'), 3),
                'returned' => $t('returned'),
                'destroyed' => $t('destroyed'),
                'adjusted' => $t('adjusted'),
                'dispensed' => $t('dispensed'),
                'closing' => round((float) $r['closing'], 3),
                'movements' => (int) $r['moves']
            ];
            $row['opening'] = round($row['opening'] + $t('opening'), 3);

            if (!empty($filters['only_moved']) && $row['movements'] === 0) {
                continue;
            }

            $rows[] = $row;
        }

        $sum = fn(string $key) => round(array_sum(array_column($rows, $key)), 3);

        return [
            'filters' => ['date_from' => $from, 'date_to' => $to, 'warehouse_id' => $filters['warehouse_id'] ?? null],
            'rows' => $rows,
            'totals' => array_combine(
                ['opening', 'received', 'transfer_in', 'transfer_out', 'returned', 'destroyed', 'adjusted', 'dispensed', 'closing'],
                array_map($sum, ['opening', 'received', 'transfer_in', 'transfer_out', 'returned', 'destroyed', 'adjusted', 'dispensed', 'closing'])
            )
        ];
    }

    private function date($value): ?string
    {
        $value = trim((string) $value);
        $date = \DateTime::createFromFormat('Y-m-d', $value);

        return $date !== false && $date->format('Y-m-d') === $value ? $value : null;
    }

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }
}
