<?php

namespace App\Modules\PharmacyDashboard\Services;

use App\Core\Database;
use App\Modules\DrugInventory\Services\StockLedgerService;
use App\Modules\StockLevels\Services\StockLevelService;
use PDO;

/**
 * Pharmacy > Dashboard: one read-only overview, optionally for one
 * storage location.
 *
 *   * low_stock -- locations with items out or below their minimum
 *                  (StockLevelService::lowStock, the same rule as the
 *                  Stock Levels page)
 *   * expiry    -- stock already expired or expiring within 90 days
 *   * stock     -- value and item count on hand, per location
 *   * transfers -- requests waiting to be sent, deliveries in transit
 *   * pending   -- procurement and count paperwork waiting on someone
 *   * recent    -- the latest stock movements from the Medicine Ledger
 *
 * Quantities are in each item's dispensing unit.
 */
class PharmacyDashboardService
{
    public const ROLES = ['admin', 'receptionist', 'doctor', 'accountant'];

    public const EXPIRY_SOON_DAYS = 30;

    public const EXPIRY_WATCH_DAYS = 90;

    private const LIST_LIMIT = 50;

    /** Filters: warehouse_id? */
    public function overview(array $filters): array
    {
        $db = Database::connection();
        $warehouseId = !empty($filters['warehouse_id']) ? (int) $filters['warehouse_id'] : null;

        if ($warehouseId !== null) {
            $stmt = $db->prepare("SELECT id FROM warehouses WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute(['id' => $warehouseId]);
            if (!$stmt->fetchColumn()) {
                $warehouseId = null;
            }
        }

        $low = (new StockLevelService())->lowStock(['warehouse_id' => $warehouseId]);

        return [
            'as_of' => date('Y-m-d H:i:s'),
            'warehouse_id' => $warehouseId,
            'locations' => $db->query("SELECT id, name FROM warehouses WHERE deleted_at IS NULL ORDER BY name")->fetchAll(PDO::FETCH_ASSOC),
            'low_stock' => [
                'totals' => $low['totals'],
                // Locations needing attention first: most out, then most low.
                'locations' => $this->sortLocations($low['locations'])
            ],
            'expiry' => $this->expiry($warehouseId),
            'stock' => $this->stock($warehouseId),
            'transfers' => $this->transfers($warehouseId),
            'pending' => $this->pending($warehouseId),
            'recent' => $this->recent($warehouseId),
            'thresholds' => ['expiry_soon_days' => self::EXPIRY_SOON_DAYS, 'expiry_watch_days' => self::EXPIRY_WATCH_DAYS]
        ];
    }

    private function sortLocations(array $locations): array
    {
        usort($locations, fn($a, $b) => [-$a['counts']['out'], -$a['counts']['low'], $a['counts']['tracked'] === 0, $a['name']]
            <=> [-$b['counts']['out'], -$b['counts']['low'], $b['counts']['tracked'] === 0, $b['name']]);

        return $locations;
    }

    /** Lots with stock that are expired or expire within EXPIRY_WATCH_DAYS. */
    private function expiry(?int $warehouseId): array
    {
        $db = Database::connection();
        $today = date('Y-m-d');
        $watch = date('Y-m-d', strtotime('+' . self::EXPIRY_WATCH_DAYS . ' days'));
        $soon = date('Y-m-d', strtotime('+' . self::EXPIRY_SOON_DAYS . ' days'));
        $params = ['watch' => $watch];
        $where = '';

        if ($warehouseId !== null) {
            $where = 'AND l.warehouse_id = :w';
            $params['w'] = $warehouseId;
        }

        $stmt = $db->prepare(
            "SELECT l.id AS lot_id, l.lot_number, l.expires_date, l.quantity_on_hand, l.warehouse_id, w.name AS warehouse_name,
                    d.id AS drug_id, d.name AS drug_name, du.name AS unit_name,
                    COALESCE((SELECT r.unit_cost FROM drug_inventory_receipts r WHERE r.lot_id = l.id AND r.voided_at IS NULL AND r.unit_cost IS NOT NULL
                              ORDER BY r.received_date DESC, r.id DESC LIMIT 1), d.unit_cost, 0) AS unit_cost
             FROM drug_inventory_lots l
             JOIN drugs d ON d.id = l.drug_id AND d.deleted_at IS NULL
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             JOIN warehouses w ON w.id = l.warehouse_id AND w.deleted_at IS NULL
             WHERE l.deleted_at IS NULL AND l.is_active = 1 AND l.quantity_on_hand > 0
               AND l.expires_date IS NOT NULL AND l.expires_date <= :watch {$where}
             ORDER BY l.expires_date, d.name"
        );
        $stmt->execute($params);

        $buckets = ['expired' => ['count' => 0, 'value' => 0.0], 'soon' => ['count' => 0, 'value' => 0.0], 'watch' => ['count' => 0, 'value' => 0.0]];
        $lots = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $l) {
            $date = substr($l['expires_date'], 0, 10);
            $bucket = $date < $today ? 'expired' : ($date <= $soon ? 'soon' : 'watch');
            $value = round((float) $l['quantity_on_hand'] * (float) $l['unit_cost'], 2);
            $buckets[$bucket]['count']++;
            $buckets[$bucket]['value'] = round($buckets[$bucket]['value'] + $value, 2);

            if (count($lots) < self::LIST_LIMIT) {
                $lots[] = [
                    'lot_id' => (int) $l['lot_id'], 'lot_number' => $l['lot_number'], 'expires_date' => $date,
                    'days_left' => (int) round((strtotime($date) - strtotime($today)) / 86400),
                    'bucket' => $bucket, 'quantity' => (float) $l['quantity_on_hand'], 'value' => $value,
                    'drug_id' => (int) $l['drug_id'], 'drug_name' => $l['drug_name'], 'unit_name' => $l['unit_name'],
                    'warehouse_name' => $l['warehouse_name']
                ];
            }
        }

        return ['buckets' => $buckets, 'lots' => $lots, 'truncated' => array_sum(array_column($buckets, 'count')) > count($lots)];
    }

    /** What's on hand, valued at each lot's latest receipt cost (else the catalog cost). */
    private function stock(?int $warehouseId): array
    {
        $db = Database::connection();
        $params = [];
        $where = '';

        if ($warehouseId !== null) {
            $where = 'AND l.warehouse_id = :w';
            $params['w'] = $warehouseId;
        }

        $stmt = $db->prepare(
            "SELECT w.id, w.name, COUNT(DISTINCT l.drug_id) AS items, COUNT(*) AS lots,
                    SUM(l.quantity_on_hand * COALESCE((SELECT r.unit_cost FROM drug_inventory_receipts r WHERE r.lot_id = l.id AND r.voided_at IS NULL AND r.unit_cost IS NOT NULL
                              ORDER BY r.received_date DESC, r.id DESC LIMIT 1), d.unit_cost, 0)) AS value
             FROM drug_inventory_lots l
             JOIN drugs d ON d.id = l.drug_id AND d.deleted_at IS NULL
             JOIN warehouses w ON w.id = l.warehouse_id AND w.deleted_at IS NULL
             WHERE l.deleted_at IS NULL AND l.is_active = 1 AND l.quantity_on_hand > 0 {$where}
             GROUP BY w.id, w.name ORDER BY w.name"
        );
        $stmt->execute($params);
        $locations = array_map(fn($r) => [
            'id' => (int) $r['id'], 'name' => $r['name'], 'items' => (int) $r['items'], 'lots' => (int) $r['lots'], 'value' => round((float) $r['value'], 2)
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $stmt = $db->prepare(
            "SELECT COUNT(DISTINCT l.drug_id) FROM drug_inventory_lots l JOIN drugs d ON d.id = l.drug_id AND d.deleted_at IS NULL
             WHERE l.deleted_at IS NULL AND l.is_active = 1 AND l.quantity_on_hand > 0 {$where}"
        );
        $stmt->execute($params);

        return [
            'value' => round(array_sum(array_column($locations, 'value')), 2),
            'items' => (int) $stmt->fetchColumn(),
            'locations' => $locations
        ];
    }

    /** Requests waiting to be sent and deliveries on the way, oldest first. */
    private function transfers(?int $warehouseId): array
    {
        $db = Database::connection();
        $params = [];
        $where = '';

        if ($warehouseId !== null) {
            $where = 'AND (t.from_warehouse_id = :w1 OR t.to_warehouse_id = :w2)';
            $params = ['w1' => $warehouseId, 'w2' => $warehouseId];
        }

        $stmt = $db->prepare(
            "SELECT t.id, t.st_number, t.status, t.priority, t.needed_by, t.requested_at, t.sent_date, t.sent_via,
                    fw.name AS from_name, tw.name AS to_name,
                    (SELECT COUNT(*) FROM stock_transfer_items i WHERE i.stock_transfer_id = t.id) AS item_count
             FROM stock_transfers t
             JOIN warehouses fw ON fw.id = t.from_warehouse_id
             JOIN warehouses tw ON tw.id = t.to_warehouse_id
             WHERE t.deleted_at IS NULL AND t.status IN ('requested', 'in_transit') {$where}
             ORDER BY t.status = 'requested' DESC, t.priority = 'urgent' DESC, COALESCE(t.needed_by, '9999-12-31'), COALESCE(t.sent_date, DATE(t.requested_at)), t.id"
        );
        $stmt->execute($params);
        $today = date('Y-m-d');

        $rows = array_map(fn($t) => [
            'id' => (int) $t['id'], 'st_number' => $t['st_number'], 'status' => $t['status'], 'priority' => $t['priority'],
            'needed_by' => $t['needed_by'], 'is_overdue' => $t['status'] === 'requested' && $t['needed_by'] !== null && $t['needed_by'] < $today,
            'requested_at' => $t['requested_at'], 'sent_date' => $t['sent_date'], 'sent_via' => $t['sent_via'],
            'from_name' => $t['from_name'], 'to_name' => $t['to_name'], 'item_count' => (int) $t['item_count']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'to_send' => count(array_filter($rows, fn($t) => $t['status'] === 'requested')),
            'in_transit' => count(array_filter($rows, fn($t) => $t['status'] === 'in_transit')),
            'overdue' => count(array_filter($rows, fn($t) => $t['is_overdue'])),
            'rows' => array_slice($rows, 0, self::LIST_LIMIT)
        ];
    }

    /** Paperwork waiting on someone, each with the tab that handles it. */
    private function pending(?int $warehouseId): array
    {
        $db = Database::connection();
        $today = date('Y-m-d');
        $count = function (string $sql, array $params = []) use ($db): int {
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            return (int) $stmt->fetchColumn();
        };
        $loc = fn(string $column) => $warehouseId !== null ? " AND {$column} = " . (int) $warehouseId : '';

        $items = [
            ['key' => 'requisitions', 'label' => 'Purchase requests to approve', 'tab' => 'pharmacy_requisitions', 'title' => 'Purchase Requests',
             'count' => $count("SELECT COUNT(*) FROM purchase_requisitions WHERE deleted_at IS NULL AND status = 'submitted'" . $loc('warehouse_id'))],
            ['key' => 'po_approval', 'label' => 'Purchase orders to approve', 'tab' => 'pharmacy_purchase_orders', 'title' => 'Purchase Orders',
             'count' => $count("SELECT COUNT(*) FROM purchase_orders WHERE deleted_at IS NULL AND status = 'pending_approval'" . $loc('warehouse_id'))],
            ['key' => 'po_delivery', 'label' => 'Orders awaiting delivery', 'tab' => 'pharmacy_receiving', 'title' => 'Receiving',
             'count' => $count("SELECT COUNT(*) FROM purchase_orders WHERE deleted_at IS NULL AND status IN ('approved', 'partially_received')" . $loc('warehouse_id')),
             'overdue' => $count("SELECT COUNT(*) FROM purchase_orders WHERE deleted_at IS NULL AND status IN ('approved', 'partially_received') AND expected_date < :today" . $loc('warehouse_id'), ['today' => $today]),
             'overdue_label' => 'past the expected date'],
            ['key' => 'invoices', 'label' => 'Supplier invoices to approve', 'tab' => 'pharmacy_supplier_invoices', 'title' => 'Supplier Invoices', 'all_locations' => true,
             'count' => $count("SELECT COUNT(*) FROM supplier_invoices WHERE deleted_at IS NULL AND status = 'pending_approval'")],
            ['key' => 'returns', 'label' => 'Supplier returns to approve or send', 'tab' => 'pharmacy_supplier_returns', 'title' => 'Supplier Returns',
             'count' => $count("SELECT COUNT(*) FROM supplier_returns WHERE deleted_at IS NULL AND status IN ('pending_approval', 'approved')" . $loc('warehouse_id'))],
            ['key' => 'counts', 'label' => 'Stock counts in progress or to approve', 'tab' => 'pharmacy_stock_counts', 'title' => 'Stock Count',
             'count' => $count("SELECT COUNT(*) FROM stock_counts WHERE deleted_at IS NULL AND status IN ('counting', 'submitted')" . $loc('warehouse_id'))]
        ];

        // Prescriptions aren't tied to a location until they're dispensed.
        array_unshift($items, ['key' => 'dispensing', 'label' => 'Prescriptions to dispense', 'tab' => 'pharmacy_dispensing', 'title' => 'Dispensing', 'all_locations' => true,
            'count' => $count("SELECT COUNT(*) FROM prescriptions WHERE deleted_at IS NULL AND status = 'active' AND dispense_status IN ('pending', 'partial')
                               AND (valid_until IS NULL OR valid_until >= :today)", ['today' => $today])]);
        array_splice($items, 1, 0, [['key' => 'high_alert_check', 'label' => 'High-alert dispensings to double-check', 'tab' => 'pharmacy_dispensing',
            'title' => 'Dispensing', 'all_locations' => false,
            'count' => $count("SELECT COUNT(*) FROM prescription_dispenses WHERE status = 'completed' AND check_status = 'awaiting'" . $loc('warehouse_id'))]]);

        return $items;
    }

    /** The latest movements from the Medicine Ledger. */
    private function recent(?int $warehouseId): array
    {
        $db = Database::connection();
        $params = [];
        $where = '';

        if ($warehouseId !== null) {
            $where = 'WHERE m.warehouse_id = :w';
            $params['w'] = $warehouseId;
        }

        $stmt = $db->prepare(
            "SELECT m.id, m.movement_date, m.movement_type, m.quantity, m.reference_no, m.counterparty, m.created_at,
                    d.name AS drug_name, du.name AS unit_name, l.lot_number, w.name AS warehouse_name
             FROM drug_stock_movements m
             JOIN drugs d ON d.id = m.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             JOIN drug_inventory_lots l ON l.id = m.lot_id
             JOIN warehouses w ON w.id = m.warehouse_id
             {$where}
             ORDER BY m.created_at DESC, m.id DESC
             LIMIT 10"
        );
        $stmt->execute($params);

        return array_map(fn($m) => [
            'id' => (int) $m['id'], 'date' => $m['movement_date'], 'type' => $m['movement_type'],
            'type_label' => StockLedgerService::TYPES[$m['movement_type']] ?? $m['movement_type'],
            'quantity' => (float) $m['quantity'], 'reference_no' => $m['reference_no'], 'counterparty' => $m['counterparty'],
            'drug_name' => $m['drug_name'], 'unit_name' => $m['unit_name'], 'lot_number' => $m['lot_number'],
            'warehouse_name' => $m['warehouse_name'], 'recorded_at' => $m['created_at']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }
}
