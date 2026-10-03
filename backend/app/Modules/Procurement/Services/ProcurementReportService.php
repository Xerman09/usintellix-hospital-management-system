<?php

namespace App\Modules\Procurement\Services;

use App\Core\Database;
use App\Modules\PurchaseOrders\Services\PurchaseOrderService;
use PDO;

/**
 * Pharmacy > Procurement Reports.
 *
 *   * openOrders       -- approved orders not fully received, what's still
 *                         to come, and which are late; plus deliveries in
 *                         the period that arrived after the expected date.
 *   * supplierPerformance -- per supplier: on-time deliveries, rejected
 *                         quantities, fill rate, lead time, returns.
 *   * spend            -- value received (goods receipts, VAT-exclusive,
 *                         voided receipts left out) by supplier, item,
 *                         department or month. A delivery for a purchase
 *                         request counts for the requesting department;
 *                         anything else for the receiving location's.
 *   * priceHistory     -- what was paid for one item, delivery by delivery.
 *   * priceDifferences -- supplier invoice lines billed at a different
 *                         price from the purchase order.
 *
 * Amounts per unit are per dispensing unit (smallest unit) unless noted.
 */
class ProcurementReportService
{
    public const ROLES = ['admin', 'accountant', 'receptionist', 'doctor'];

    public const SPEND_GROUPS = ['supplier', 'item', 'department', 'location', 'month'];

    private const EPSILON = 0.0005;

    /** Suppliers, locations and items for the filters. */
    public function options(): array
    {
        $db = Database::connection();

        return [
            'suppliers' => $db->query("SELECT id, name FROM suppliers WHERE deleted_at IS NULL ORDER BY name")->fetchAll(PDO::FETCH_ASSOC),
            'warehouses' => $db->query("SELECT id, name FROM warehouses WHERE deleted_at IS NULL ORDER BY name")->fetchAll(PDO::FETCH_ASSOC),
            'departments' => $db->query("SELECT id, name FROM departments WHERE deleted_at IS NULL ORDER BY name")->fetchAll(PDO::FETCH_ASSOC),
            // Items that have ever been ordered (for price history).
            'drugs' => $db->query(
                "SELECT DISTINCT d.id, d.name FROM drugs d JOIN purchase_order_items i ON i.drug_id = d.id
                 WHERE d.deleted_at IS NULL ORDER BY d.name"
            )->fetchAll(PDO::FETCH_ASSOC)
        ];
    }

    /* ---------------------------------------------------------------
     * Open purchase orders and late deliveries
     * ------------------------------------------------------------- */

    /** Filters: supplier_id?, warehouse_id?, late_only?, date_from?, date_to? (late deliveries received in the period) */
    public function openOrders(array $filters = []): array
    {
        $db = Database::connection();
        $today = date('Y-m-d');
        $where = ["po.status IN ('" . implode("', '", PurchaseOrderService::RECEIVABLE_STATUSES) . "')", 'po.deleted_at IS NULL'];
        $params = [];
        $this->scope($filters, $where, $params, 'po');

        $stmt = $db->prepare(
            "SELECT po.id, po.po_number, po.status, po.order_date, po.expected_date, po.total, po.approved_at,
                    s.name AS supplier_name, w.name AS warehouse_name,
                    COUNT(i.id) AS line_count,
                    SUM(CASE WHEN i.quantity_received + 0.0005 < i.quantity THEN 1 ELSE 0 END) AS open_lines,
                    SUM(GREATEST(i.quantity - i.quantity_received, 0) * CASE WHEN i.quantity > 0 THEN i.line_total / i.quantity ELSE 0 END) AS open_value,
                    SUM(LEAST(i.quantity_received, i.quantity) * CASE WHEN i.quantity > 0 THEN i.line_total / i.quantity ELSE 0 END) AS received_value,
                    (SELECT MAX(gr.received_date) FROM goods_receipts gr WHERE gr.purchase_order_id = po.id AND gr.voided_at IS NULL) AS last_received
             FROM purchase_orders po
             JOIN suppliers s ON s.id = po.supplier_id
             LEFT JOIN warehouses w ON w.id = po.warehouse_id
             JOIN purchase_order_items i ON i.purchase_order_id = po.id
             WHERE " . implode(' AND ', $where) . "
             GROUP BY po.id
             ORDER BY po.expected_date IS NULL, po.expected_date, po.id"
        );
        $stmt->execute($params);

        $orders = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $daysLate = $r['expected_date'] !== null && $r['expected_date'] < $today ? $this->days($r['expected_date'], $today) : 0;

            if (!empty($filters['late_only']) && $daysLate <= 0) {
                continue;
            }

            $orders[] = [
                'id' => (int) $r['id'],
                'po_number' => $r['po_number'],
                'status' => $r['status'],
                'supplier_name' => $r['supplier_name'],
                'warehouse_name' => $r['warehouse_name'],
                'order_date' => $r['order_date'],
                'expected_date' => $r['expected_date'],
                'days_open' => $this->days($r['order_date'], $today),
                'days_late' => $daysLate,
                'is_late' => $daysLate > 0,
                'last_received' => $r['last_received'],
                'line_count' => (int) $r['line_count'],
                'open_lines' => (int) $r['open_lines'],
                'total' => (float) $r['total'],
                'received_value' => round((float) $r['received_value'], 2),
                'open_value' => round((float) $r['open_value'], 2)
            ];
        }

        // Deliveries in the period that came after the expected date.
        $where = ['gr.voided_at IS NULL', 'po.expected_date IS NOT NULL', 'gr.received_date > po.expected_date'];
        $params = [];
        $this->scope($filters, $where, $params, 'po');
        $this->period($filters, $where, $params, 'gr.received_date');

        $stmt = $db->prepare(
            "SELECT gr.id, gr.gr_number, gr.received_date, po.id AS purchase_order_id, po.po_number, po.order_date, po.expected_date,
                    s.name AS supplier_name, w.name AS warehouse_name, gr.total_cost
             FROM goods_receipts gr
             JOIN purchase_orders po ON po.id = gr.purchase_order_id
             JOIN suppliers s ON s.id = po.supplier_id
             LEFT JOIN warehouses w ON w.id = gr.warehouse_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY gr.received_date DESC, gr.id DESC
             LIMIT 1000"
        );
        $stmt->execute($params);
        $late = array_map(fn(array $r) => [
            'id' => (int) $r['id'],
            'gr_number' => $r['gr_number'],
            'received_date' => $r['received_date'],
            'purchase_order_id' => (int) $r['purchase_order_id'],
            'po_number' => $r['po_number'],
            'order_date' => $r['order_date'],
            'expected_date' => $r['expected_date'],
            'days_late' => $this->days($r['expected_date'], $r['received_date']),
            'supplier_name' => $r['supplier_name'],
            'warehouse_name' => $r['warehouse_name'],
            'value' => (float) $r['total_cost']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $lateOrders = array_filter($orders, fn($o) => $o['is_late']);

        return [
            'orders' => $orders,
            'late_receipts' => $late,
            'totals' => [
                'open_count' => count($orders),
                'open_value' => round(array_sum(array_column($orders, 'open_value')), 2),
                'late_count' => count($lateOrders),
                'late_value' => round(array_sum(array_column($lateOrders, 'open_value')), 2),
                'late_receipts' => count($late)
            ]
        ];
    }

    /* ---------------------------------------------------------------
     * Supplier performance
     * ------------------------------------------------------------- */

    /** Deliveries in the period. Filters: date_from?, date_to?, supplier_id?, warehouse_id? */
    public function supplierPerformance(array $filters = []): array
    {
        $db = Database::connection();

        // Per delivery: on time? accepted vs rejected quantities.
        $where = ['gr.voided_at IS NULL'];
        $params = [];
        $this->scope($filters, $where, $params, 'po');
        $this->period($filters, $where, $params, 'gr.received_date');

        $stmt = $db->prepare(
            "SELECT po.supplier_id, s.name AS supplier_name,
                    COUNT(*) AS deliveries,
                    SUM(po.expected_date IS NOT NULL) AS with_expected,
                    SUM(po.expected_date IS NOT NULL AND gr.received_date <= po.expected_date) AS on_time,
                    SUM(DATEDIFF(gr.received_date, po.order_date)) AS lead_days,
                    SUM(CASE WHEN po.expected_date IS NOT NULL AND gr.received_date > po.expected_date THEN DATEDIFF(gr.received_date, po.expected_date) ELSE 0 END) AS late_days,
                    SUM(gi.accepted) AS accepted, SUM(gi.rejected) AS rejected, SUM(gi.rejected_lines) AS rejected_lines,
                    SUM(gr.total_cost) AS received_value
             FROM goods_receipts gr
             JOIN purchase_orders po ON po.id = gr.purchase_order_id
             JOIN suppliers s ON s.id = po.supplier_id
             LEFT JOIN (SELECT goods_receipt_id, SUM(quantity) AS accepted, SUM(rejected_quantity) AS rejected,
                               SUM(rejected_quantity > 0) AS rejected_lines
                        FROM goods_receipt_items GROUP BY goods_receipt_id) gi ON gi.goods_receipt_id = gr.id
             WHERE " . implode(' AND ', $where) . "
             GROUP BY po.supplier_id, s.name"
        );
        $stmt->execute($params);
        $rows = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $rows[(int) $r['supplier_id']] = $r;
        }

        // Orders placed in the period: how much of what was ordered has come (fill rate).
        $where = ["po.status IN ('approved', 'partially_received', 'received', 'closed')", 'po.deleted_at IS NULL'];
        $params = [];
        $this->scope($filters, $where, $params, 'po');
        $this->period($filters, $where, $params, 'po.order_date');

        $stmt = $db->prepare(
            "SELECT po.supplier_id, s.name AS supplier_name, COUNT(DISTINCT po.id) AS orders,
                    SUM(i.quantity) AS ordered_qty, SUM(LEAST(i.quantity_received, i.quantity)) AS received_qty,
                    SUM(po.status = 'closed' AND i.quantity_received + 0.0005 < i.quantity) AS short_closed_lines
             FROM purchase_orders po
             JOIN suppliers s ON s.id = po.supplier_id
             JOIN purchase_order_items i ON i.purchase_order_id = po.id
             WHERE " . implode(' AND ', $where) . "
             GROUP BY po.supplier_id, s.name"
        );
        $stmt->execute($params);
        $orders = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $orders[(int) $r['supplier_id']] = $r;
        }

        // Returns sent back in the period.
        $where = ["r.status IN ('approved', 'sent', 'credited')", 'r.deleted_at IS NULL'];
        $params = [];
        if (!empty($filters['supplier_id'])) {
            $where[] = 'r.supplier_id = :supplier';
            $params['supplier'] = (int) $filters['supplier_id'];
        }
        $this->period($filters, $where, $params, 'r.return_date');
        $stmt = $db->prepare(
            "SELECT r.supplier_id, COUNT(*) AS returns, SUM(r.total) AS return_value FROM supplier_returns r
             WHERE " . implode(' AND ', $where) . " GROUP BY r.supplier_id"
        );
        $stmt->execute($params);
        $returns = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), null, 'supplier_id');

        $ids = array_unique(array_merge(array_keys($rows), array_keys($orders)));
        $result = [];

        foreach ($ids as $supplierId) {
            $d = $rows[$supplierId] ?? null;
            $o = $orders[$supplierId] ?? null;
            $ret = $returns[$supplierId] ?? null;
            $withExpected = (int) ($d['with_expected'] ?? 0);
            $deliveries = (int) ($d['deliveries'] ?? 0);
            $accepted = (float) ($d['accepted'] ?? 0);
            $rejected = (float) ($d['rejected'] ?? 0);
            $ordered = (float) ($o['ordered_qty'] ?? 0);
            $lateCount = $withExpected - (int) ($d['on_time'] ?? 0);

            $result[] = [
                'supplier_id' => $supplierId,
                'supplier_name' => $d['supplier_name'] ?? $o['supplier_name'],
                'orders' => (int) ($o['orders'] ?? 0),
                'deliveries' => $deliveries,
                'on_time' => (int) ($d['on_time'] ?? 0),
                'late' => $lateCount,
                'on_time_rate' => $withExpected ? round((int) $d['on_time'] / $withExpected * 100, 1) : null,
                'avg_days_late' => $lateCount > 0 ? round((float) $d['late_days'] / $lateCount, 1) : null,
                'avg_lead_days' => $deliveries ? round((float) $d['lead_days'] / $deliveries, 1) : null,
                'accepted_qty' => $accepted,
                'rejected_qty' => $rejected,
                'rejection_rate' => $accepted + $rejected > self::EPSILON ? round($rejected / ($accepted + $rejected) * 100, 1) : null,
                'rejected_lines' => (int) ($d['rejected_lines'] ?? 0),
                'fill_rate' => $ordered > self::EPSILON ? round((float) $o['received_qty'] / $ordered * 100, 1) : null,
                'short_closed_lines' => (int) ($o['short_closed_lines'] ?? 0),
                'returns' => (int) ($ret['returns'] ?? 0),
                'return_value' => round((float) ($ret['return_value'] ?? 0), 2),
                'received_value' => round((float) ($d['received_value'] ?? 0), 2)
            ];
        }

        usort($result, fn($a, $b) => $b['received_value'] <=> $a['received_value'] ?: strcmp($a['supplier_name'], $b['supplier_name']));

        $sum = fn(string $key) => array_sum(array_column($result, $key));
        $withExpectedAll = $sum('on_time') + $sum('late');

        return [
            'suppliers' => $result,
            'totals' => [
                'deliveries' => $sum('deliveries'),
                'on_time_rate' => $withExpectedAll ? round($sum('on_time') / $withExpectedAll * 100, 1) : null,
                'rejection_rate' => $sum('accepted_qty') + $sum('rejected_qty') > self::EPSILON
                    ? round($sum('rejected_qty') / ($sum('accepted_qty') + $sum('rejected_qty')) * 100, 1) : null,
                'received_value' => round($sum('received_value'), 2)
            ]
        ];
    }

    /* ---------------------------------------------------------------
     * Spend
     * ------------------------------------------------------------- */

    /** Filters: group_by (supplier|item|department|location|month), date_from?, date_to?, supplier_id?, warehouse_id?, department_id? */
    public function spend(array $filters = []): array
    {
        $db = Database::connection();
        $groupBy = in_array($filters['group_by'] ?? '', self::SPEND_GROUPS, true) ? $filters['group_by'] : 'supplier';
        $where = ['gr.voided_at IS NULL', 'gi.base_quantity > 0'];
        $params = [];
        $this->scope($filters, $where, $params, 'po', 'gr.warehouse_id');
        $this->period($filters, $where, $params, 'gr.received_date');

        $stmt = $db->prepare(
            "SELECT gi.id, gi.purchase_order_item_id, gi.drug_id, gi.base_quantity, gi.unit_cost, gr.received_date,
                    po.supplier_id, s.name AS supplier_name, d.name AS drug_name, du.name AS unit_name,
                    gr.warehouse_id, w.name AS warehouse_name, w.department_id AS location_department_id
             FROM goods_receipt_items gi
             JOIN goods_receipts gr ON gr.id = gi.goods_receipt_id
             JOIN purchase_orders po ON po.id = gr.purchase_order_id
             JOIN suppliers s ON s.id = po.supplier_id
             JOIN drugs d ON d.id = gi.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN warehouses w ON w.id = gr.warehouse_id
             WHERE " . implode(' AND ', $where)
        );
        $stmt->execute($params);
        $lines = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Requesting departments per PO line (share of the line's quantity).
        $sources = [];
        if ($groupBy === 'department' || !empty($filters['department_id'])) {
            $poItemIds = array_values(array_unique(array_filter(array_map(fn($l) => (int) $l['purchase_order_item_id'], $lines))));
            if ($poItemIds) {
                $placeholders = implode(', ', array_fill(0, count($poItemIds), '?'));
                $stmt = $db->prepare(
                    "SELECT src.purchase_order_item_id, pr.department_id, SUM(src.base_quantity) AS qty,
                            (SELECT i.quantity * CASE WHEN i.order_unit = 'package' THEN COALESCE(NULLIF(i.units_per_package, 0), 1) ELSE 1 END
                       FROM purchase_order_items i WHERE i.id = src.purchase_order_item_id) AS line_base
                     FROM purchase_order_item_sources src
                     JOIN purchase_requisition_items ri ON ri.id = src.requisition_item_id
                     JOIN purchase_requisitions pr ON pr.id = ri.purchase_requisition_id
                     WHERE src.purchase_order_item_id IN ({$placeholders})
                     GROUP BY src.purchase_order_item_id, pr.department_id"
                );
                $stmt->execute($poItemIds);
                foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
                    $lineBase = (float) $r['line_base'];
                    $sources[(int) $r['purchase_order_item_id']][(int) $r['department_id']] = $lineBase > 0 ? min(1.0, (float) $r['qty'] / $lineBase) : 0.0;
                }
            }
        }

        $departmentNames = array_column($db->query("SELECT id, name FROM departments")->fetchAll(PDO::FETCH_ASSOC), 'name', 'id');
        $groups = [];
        $total = 0.0;

        foreach ($lines as $l) {
            $amount = round((float) $l['base_quantity'] * (float) $l['unit_cost'], 2);

            // Split the line between departments when the department matters.
            $parts = [[null, 1.0]];
            if (isset($sources[(int) $l['purchase_order_item_id']]) || $groupBy === 'department' || !empty($filters['department_id'])) {
                $parts = [];
                $left = 1.0;
                foreach ($sources[(int) $l['purchase_order_item_id']] ?? [] as $departmentId => $share) {
                    $share = min($share, $left);
                    if ($share > 0) {
                        $parts[] = [$departmentId, $share];
                        $left -= $share;
                    }
                }
                if ($left > self::EPSILON) {
                    $parts[] = [$l['location_department_id'] !== null ? (int) $l['location_department_id'] : 0, $left];
                }
            }

            foreach ($parts as [$departmentId, $share]) {
                if (!empty($filters['department_id']) && (int) $departmentId !== (int) $filters['department_id']) {
                    continue;
                }

                [$key, $label] = match ($groupBy) {
                    'item' => [(int) $l['drug_id'], $l['drug_name']],
                    'department' => [(int) $departmentId, $departmentId ? ($departmentNames[$departmentId] ?? 'Unknown department') : 'No department'],
                    'location' => [(int) $l['warehouse_id'], $l['warehouse_name'] ?? 'No location'],
                    'month' => [substr($l['received_date'], 0, 7), date('M Y', strtotime(substr($l['received_date'], 0, 7) . '-01'))],
                    default => [(int) $l['supplier_id'], $l['supplier_name']]
                };

                $value = round($amount * $share, 2);
                $groups[$key] ??= ['key' => $key, 'label' => $label, 'amount' => 0.0, 'lines' => 0, 'quantity' => 0.0, 'unit_name' => $groupBy === 'item' ? $l['unit_name'] : null];
                $groups[$key]['amount'] += $value;
                $groups[$key]['lines']++;
                $groups[$key]['quantity'] += (float) $l['base_quantity'] * $share;
                $total += $value;
            }
        }

        $groups = array_values($groups);
        foreach ($groups as &$g) {
            $g['amount'] = round($g['amount'], 2);
            $g['quantity'] = round($g['quantity'], 3);
            $g['share'] = $total > 0 ? round($g['amount'] / $total * 100, 1) : 0.0;
            $g['avg_unit_cost'] = $groupBy === 'item' && $g['quantity'] > 0 ? round($g['amount'] / $g['quantity'], 4) : null;
        }
        unset($g);

        usort($groups, $groupBy === 'month' ? fn($a, $b) => strcmp($a['key'], $b['key']) : fn($a, $b) => $b['amount'] <=> $a['amount']);

        return ['group_by' => $groupBy, 'rows' => $groups, 'total' => round($total, 2)];
    }

    /* ---------------------------------------------------------------
     * Price history & price differences
     * ------------------------------------------------------------- */

    /** Every delivery of one item. Filters: drug_id, date_from?, date_to?, supplier_id? */
    public function priceHistory(array $filters = []): ?array
    {
        $db = Database::connection();
        $drugId = (int) ($filters['drug_id'] ?? 0);
        $stmt = $db->prepare(
            "SELECT d.id, d.name, du.name AS unit_name, pu.name AS package_unit_name, d.package_quantity, d.unit_cost
             FROM drugs d LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id LEFT JOIN amount_units pu ON pu.id = d.package_unit_id
             WHERE d.id = :id"
        );
        $stmt->execute(['id' => $drugId]);
        $drug = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$drug) {
            return null;
        }

        $where = ['gr.voided_at IS NULL', 'gi.drug_id = :drug', 'gi.base_quantity > 0'];
        $params = ['drug' => $drugId];
        $this->scope($filters, $where, $params, 'po');
        $this->period($filters, $where, $params, 'gr.received_date');

        $stmt = $db->prepare(
            "SELECT gr.received_date, gr.gr_number, po.id AS purchase_order_id, po.po_number, s.name AS supplier_name,
                    gi.order_unit, gi.units_per_package, gi.quantity, gi.base_quantity, gi.unit_cost
             FROM goods_receipt_items gi
             JOIN goods_receipts gr ON gr.id = gi.goods_receipt_id
             JOIN purchase_orders po ON po.id = gr.purchase_order_id
             JOIN suppliers s ON s.id = po.supplier_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY gr.received_date, gi.id"
        );
        $stmt->execute($params);

        $rows = [];
        $previous = null;
        $qty = 0.0;
        $spent = 0.0;

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $cost = (float) $r['unit_cost'];
            $rows[] = [
                'received_date' => $r['received_date'],
                'gr_number' => $r['gr_number'],
                'purchase_order_id' => (int) $r['purchase_order_id'],
                'po_number' => $r['po_number'],
                'supplier_name' => $r['supplier_name'],
                'order_unit' => $r['order_unit'],
                'units_per_package' => $r['units_per_package'] !== null ? (float) $r['units_per_package'] : null,
                'quantity' => (float) $r['quantity'],
                'base_quantity' => (float) $r['base_quantity'],
                'unit_cost' => $cost,
                'package_cost' => $r['order_unit'] === 'package' && $r['units_per_package'] ? round($cost * (float) $r['units_per_package'], 2) : null,
                'change' => $previous !== null ? round($cost - $previous, 4) : null,
                'change_pct' => $previous ? round(($cost - $previous) / $previous * 100, 1) : null
            ];
            $previous = $cost;
            $qty += (float) $r['base_quantity'];
            $spent += (float) $r['base_quantity'] * $cost;
        }

        $costs = array_column($rows, 'unit_cost');

        // What suppliers list it at now, for comparison.
        $stmt = $db->prepare(
            "SELECT s.name AS supplier_name, sp.price_basis, sp.price, sp.price_as_of
             FROM supplier_products sp JOIN suppliers s ON s.id = sp.supplier_id AND s.deleted_at IS NULL
             WHERE sp.drug_id = :drug AND sp.deleted_at IS NULL AND sp.is_active = 1 ORDER BY sp.price"
        );
        $stmt->execute(['drug' => $drugId]);
        $per = (float) ($drug['package_quantity'] ?? 0);
        $listings = array_map(fn(array $r) => [
            'supplier_name' => $r['supplier_name'],
            'price_basis' => $r['price_basis'],
            'price' => (float) $r['price'],
            'unit_price' => $r['price_basis'] === 'package' && $per > 0 ? round((float) $r['price'] / $per, 4) : (float) $r['price'],
            'price_as_of' => $r['price_as_of']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'drug' => [
                'id' => (int) $drug['id'], 'name' => $drug['name'], 'unit_name' => $drug['unit_name'],
                'package_unit_name' => $drug['package_unit_name'], 'package_quantity' => $per > 0 ? $per : null,
                'catalog_cost' => $drug['unit_cost'] !== null ? (float) $drug['unit_cost'] : null
            ],
            'rows' => array_reverse($rows),
            'listings' => $listings,
            'summary' => $rows ? [
                'deliveries' => count($rows),
                'first' => $costs[0],
                'latest' => end($costs),
                'lowest' => min($costs),
                'highest' => max($costs),
                'average' => $qty > 0 ? round($spent / $qty, 4) : null,
                'change_pct' => $costs[0] > 0 ? round((end($costs) - $costs[0]) / $costs[0] * 100, 1) : null,
                'quantity' => round($qty, 3),
                'spent' => round($spent, 2)
            ] : null
        ];
    }

    /**
     * Supplier invoice lines billed at a price other than the purchase
     * order's. Both are net prices (after line discounts, before VAT) per
     * the invoice line's unit, as the 3-way match compares them. Filters: date_from?, date_to? (invoice date), supplier_id?, direction? (higher|lower)
     */
    public function priceDifferences(array $filters = []): array
    {
        $net = 'sii.line_total / sii.quantity';
        $where = ["si.status <> 'cancelled'", 'si.deleted_at IS NULL', 'sii.expected_unit_price IS NOT NULL', 'sii.quantity > 0',
                  "ABS({$net} - sii.expected_unit_price) > 0.005"];
        $params = [];

        if (!empty($filters['supplier_id'])) {
            $where[] = 'si.supplier_id = :supplier';
            $params['supplier'] = (int) $filters['supplier_id'];
        }

        if (($filters['direction'] ?? '') === 'higher') {
            $where[] = "{$net} > sii.expected_unit_price";
        } elseif (($filters['direction'] ?? '') === 'lower') {
            $where[] = "{$net} < sii.expected_unit_price";
        }

        $this->period($filters, $where, $params, 'si.invoice_date');

        $stmt = Database::connection()->prepare(
            "SELECT si.id AS supplier_invoice_id, si.ap_number, si.supplier_invoice_no, si.invoice_date, si.status, si.approval_notes,
                    po.id AS purchase_order_id, po.po_number, s.name AS supplier_name, d.name AS drug_name,
                    sii.order_unit, sii.units_per_package, sii.quantity, sii.unit_price, sii.line_total, sii.expected_unit_price, sii.match_status
             FROM supplier_invoice_items sii
             JOIN supplier_invoices si ON si.id = sii.supplier_invoice_id
             JOIN purchase_orders po ON po.id = si.purchase_order_id
             JOIN suppliers s ON s.id = si.supplier_id
             JOIN drugs d ON d.id = sii.drug_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY si.invoice_date DESC, si.id DESC, sii.line_no
             LIMIT 2000"
        );
        $stmt->execute($params);

        $rows = array_map(function (array $r) {
            $invoicePrice = round((float) $r['line_total'] / (float) $r['quantity'], 4);
            $diff = round($invoicePrice - (float) $r['expected_unit_price'], 4);
            return [
                'supplier_invoice_id' => (int) $r['supplier_invoice_id'],
                'ap_number' => $r['ap_number'],
                'supplier_invoice_no' => $r['supplier_invoice_no'],
                'invoice_date' => $r['invoice_date'],
                'invoice_status' => $r['status'],
                'approval_notes' => $r['approval_notes'],
                'purchase_order_id' => (int) $r['purchase_order_id'],
                'po_number' => $r['po_number'],
                'supplier_name' => $r['supplier_name'],
                'drug_name' => $r['drug_name'],
                'order_unit' => $r['order_unit'],
                'units_per_package' => $r['units_per_package'] !== null ? (float) $r['units_per_package'] : null,
                'quantity' => (float) $r['quantity'],
                'po_price' => (float) $r['expected_unit_price'],
                'invoice_price' => $invoicePrice,
                'difference' => $diff,
                'difference_pct' => (float) $r['expected_unit_price'] > 0 ? round($diff / (float) $r['expected_unit_price'] * 100, 1) : null,
                'impact' => round((float) $r['line_total'] - (float) $r['expected_unit_price'] * (float) $r['quantity'], 2)
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));

        $over = array_filter($rows, fn($r) => $r['impact'] > 0);

        return [
            'rows' => $rows,
            'totals' => [
                'lines' => count($rows),
                'overcharged' => round(array_sum(array_column($over, 'impact')), 2),
                'undercharged' => round(-array_sum(array_column(array_filter($rows, fn($r) => $r['impact'] < 0), 'impact')), 2),
                'net' => round(array_sum(array_column($rows, 'impact')), 2),
                'approved_lines' => count(array_filter($rows, fn($r) => $r['invoice_status'] === 'approved'))
            ]
        ];
    }

    /* ---------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------- */

    private function scope(array $filters, array &$where, array &$params, string $po, ?string $warehouseColumn = null): void
    {
        if (!empty($filters['supplier_id'])) {
            $where[] = "{$po}.supplier_id = :scope_supplier";
            $params['scope_supplier'] = (int) $filters['supplier_id'];
        }

        if (!empty($filters['warehouse_id'])) {
            $where[] = ($warehouseColumn ?? "{$po}.warehouse_id") . ' = :scope_warehouse';
            $params['scope_warehouse'] = (int) $filters['warehouse_id'];
        }
    }

    private function period(array $filters, array &$where, array &$params, string $column): void
    {
        if (!empty($filters['date_from']) && $this->isValidDate($filters['date_from'])) {
            $where[] = "{$column} >= :period_from";
            $params['period_from'] = $filters['date_from'];
        }

        if (!empty($filters['date_to']) && $this->isValidDate($filters['date_to'])) {
            $where[] = "{$column} <= :period_to";
            $params['period_to'] = $filters['date_to'];
        }
    }

    private function days(string $from, string $to): int
    {
        return (int) round((strtotime(substr($to, 0, 10)) - strtotime(substr($from, 0, 10))) / 86400);
    }

    private function isValidDate(string $value): bool
    {
        $date = \DateTime::createFromFormat('Y-m-d', $value);

        return $date !== false && $date->format('Y-m-d') === $value;
    }
}
