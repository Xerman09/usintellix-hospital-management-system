<?php

namespace App\Modules\LotTrace\Services;

use App\Core\Database;
use App\Modules\DrugInventory\Services\StockLedgerService;
use App\Modules\StockTransfers\Services\StockTransferService;
use PDO;

/**
 * Pharmacy > Lot Tracing: follows one batch (an item's lot number) across
 * every location and document it touched.
 *
 *   * search() -- batches matching a lot number, item, supplier or any
 *                 document number (PO, RR, delivery receipt, supplier
 *                 invoice, ST, RTS, SC), with where they are now.
 *   * trace()  -- one batch, backward and forward:
 *                   where it came from  (supplier, PO, receipt, invoice)
 *                   where it went       (transfers between locations)
 *                   where it left       (returned, destroyed, count losses)
 *                   where it is now     (each location's lot, in transit)
 *                 plus every ledger movement in date order and the
 *                 documents involved.
 *
 * A batch is every lot of the item with the same lot number (letter case
 * and spaces ignored) plus any lot stock was transferred into from one of
 * them. Quantities are in the item's dispensing unit.
 */
class LotTraceService
{
    public const ROLES = ['admin', 'receptionist', 'doctor', 'accountant'];

    private const RESULT_LIMIT = 300;

    private const EPSILON = 0.0005;

    /** Filters: q?, in_stock?, expires_by? (Y-m-d) */
    public function search(array $filters): array
    {
        $db = Database::connection();
        $q = trim((string) ($filters['q'] ?? ''));
        $expiresBy = $this->date($filters['expires_by'] ?? null);
        $where = ['(l.deleted_at IS NULL OR EXISTS (SELECT 1 FROM drug_stock_movements m0 WHERE m0.lot_id = l.id))'];
        $params = [];
        $matchColumns = "0 AS m_lot, 0 AS m_item, 0 AS m_supplier, NULL AS m_document";

        if ($q !== '') {
            $like = '%' . addcslashes($q, '%_\\') . '%';
            for ($i = 1; $i <= 12; $i++) {
                $params["q{$i}"] = $like;
            }

            // Document numbers the lot was received, moved or returned under.
            $document = "COALESCE(
                (SELECT m.reference_no FROM drug_stock_movements m WHERE m.lot_id = l.id AND m.reference_no LIKE :q4 LIMIT 1),
                (SELECT COALESCE(CASE WHEN gr.delivery_receipt_no LIKE :q5 THEN gr.delivery_receipt_no END,
                                 CASE WHEN gr.invoice_no LIKE :q6 THEN gr.invoice_no END,
                                 CASE WHEN po.po_number LIKE :q7 THEN po.po_number END,
                                 CASE WHEN r.invoice_number LIKE :q8 THEN r.invoice_number END)
                 FROM drug_inventory_receipts r
                 LEFT JOIN goods_receipts gr ON gr.id = r.goods_receipt_id
                 LEFT JOIN purchase_orders po ON po.id = gr.purchase_order_id
                 WHERE r.lot_id = l.id AND (gr.delivery_receipt_no LIKE :q9 OR gr.invoice_no LIKE :q10 OR po.po_number LIKE :q11 OR r.invoice_number LIKE :q12)
                 LIMIT 1),
                (SELECT COALESCE(CASE WHEN si.ap_number LIKE :q13 THEN si.ap_number END, si.supplier_invoice_no)
                 FROM drug_inventory_receipts r
                 JOIN supplier_invoice_receipts sir ON sir.goods_receipt_id = r.goods_receipt_id
                 JOIN supplier_invoices si ON si.id = sir.supplier_invoice_id AND si.deleted_at IS NULL
                 WHERE r.lot_id = l.id AND (si.ap_number LIKE :q14 OR si.supplier_invoice_no LIKE :q15)
                 LIMIT 1))";
            $params['q13'] = $params['q14'] = $params['q15'] = $like;

            $matchColumns = "l.lot_number LIKE :q1 AS m_lot,
                (d.name LIKE :q2 OR d.generic_name LIKE :q16 OR d.brand_name LIKE :q17) AS m_item,
                EXISTS (SELECT 1 FROM drug_inventory_receipts r LEFT JOIN suppliers s ON s.id = r.supplier_id
                        WHERE r.lot_id = l.id AND (r.supplier LIKE :q3 OR s.name LIKE :q18)) AS m_supplier,
                {$document} AS m_document";
            $params['q16'] = $params['q17'] = $params['q18'] = $like;
        }

        $stmt = $db->prepare(
            "SELECT l.id, l.drug_id, UPPER(TRIM(l.lot_number)) AS lot_key, {$matchColumns}
             FROM drug_inventory_lots l JOIN drugs d ON d.id = l.drug_id
             WHERE " . implode(' AND ', $where)
        );
        $stmt->execute($params);

        $matches = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $l) {
            if ($q !== '' && !$l['m_lot'] && !$l['m_item'] && !$l['m_supplier'] && $l['m_document'] === null) {
                continue;
            }

            $key = $l['drug_id'] . '|' . $l['lot_key'];
            $match = $matches[$key] ?? ['drug_id' => (int) $l['drug_id'], 'lot_key' => $l['lot_key'], 'matched_by' => []];

            if ($q !== '') {
                if ($l['m_lot']) $match['matched_by']['Lot number'] = true;
                if ($l['m_item']) $match['matched_by']['Item'] = true;
                if ($l['m_supplier']) $match['matched_by']['Supplier'] = true;
                if ($l['m_document'] !== null) $match['matched_by']['Document ' . $l['m_document']] = true;
            }

            $matches[$key] = $match;
        }

        if (!$matches) {
            return ['rows' => [], 'truncated' => false];
        }

        // Every lot of the matched batches, so a batch found by its receipt also shows the locations it went to.
        $lots = $this->lotsFor(array_values($matches));
        $suppliers = $this->suppliersFor(array_column($lots, 'id'));
        $batches = [];

        foreach ($lots as $l) {
            $key = $l['drug_id'] . '|' . $l['lot_key'];
            $b = $batches[$key] ?? [
                'drug_id' => (int) $l['drug_id'], 'drug_name' => $l['drug_name'], 'unit_name' => $l['unit_name'],
                'lot_number' => $l['lot_number'], 'expires_date' => null, 'on_hand' => 0.0,
                'locations' => [], 'suppliers' => [], 'first_received' => null, 'lot_ids' => [],
                'matched_by' => array_keys($matches[$key]['matched_by'] ?? [])
            ];

            $b['lot_ids'][] = (int) $l['id'];
            if ($l['expires_date'] && ($b['expires_date'] === null || $l['expires_date'] < $b['expires_date'])) {
                $b['expires_date'] = $l['expires_date'];
            }
            if ($l['deleted_at'] === null) {
                $b['on_hand'] = round($b['on_hand'] + (float) $l['quantity_on_hand'], 3);
                if ((float) $l['quantity_on_hand'] > self::EPSILON) {
                    $b['locations'][$l['warehouse_name']] = round(($b['locations'][$l['warehouse_name']] ?? 0) + (float) $l['quantity_on_hand'], 3);
                }
            }
            foreach ($suppliers[(int) $l['id']] ?? [] as $s) {
                $b['suppliers'][$s['name']] = true;
                if ($b['first_received'] === null || $s['date'] < $b['first_received']) {
                    $b['first_received'] = $s['date'];
                }
            }

            $batches[$key] = $b;
        }

        $rows = [];
        foreach ($batches as $b) {
            if (!empty($filters['in_stock']) && $b['on_hand'] <= self::EPSILON) {
                continue;
            }
            if ($expiresBy !== null && ($b['expires_date'] === null || $b['expires_date'] > $expiresBy)) {
                continue;
            }

            $b['locations'] = array_map(fn($name, $qty) => ['name' => $name, 'quantity' => $qty], array_keys($b['locations']), $b['locations']);
            $b['suppliers'] = array_keys($b['suppliers']);
            $rows[] = $b;
        }

        usort($rows, fn($a, $b) => [$a['expires_date'] === null, $a['expires_date'], $a['drug_name'], $a['lot_number']]
            <=> [$b['expires_date'] === null, $b['expires_date'], $b['drug_name'], $b['lot_number']]);

        return ['rows' => array_slice($rows, 0, self::RESULT_LIMIT), 'truncated' => count($rows) > self::RESULT_LIMIT];
    }

    /** One batch: drug_id + lot_number (or any lot_id of it). */
    public function trace(array $filters): ?array
    {
        $db = Database::connection();
        $drugId = (int) ($filters['drug_id'] ?? 0);
        $lotNumber = trim((string) ($filters['lot_number'] ?? ''));

        if (!empty($filters['lot_id'])) {
            $stmt = $db->prepare("SELECT drug_id, lot_number FROM drug_inventory_lots WHERE id = :id");
            $stmt->execute(['id' => (int) $filters['lot_id']]);
            if ($lot = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $drugId = (int) $lot['drug_id'];
                $lotNumber = $lot['lot_number'];
            }
        }

        $stmt = $db->prepare(
            "SELECT d.id, d.name, d.generic_name, d.strength, d.manufacturer, d.product_type, du.name AS unit_name
             FROM drugs d LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id WHERE d.id = :id"
        );
        $stmt->execute(['id' => $drugId]);
        $drug = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$drug || $lotNumber === '') {
            return null;
        }

        $lotIds = $this->family($drugId, $lotNumber);
        if (!$lotIds) {
            return null;
        }

        $in = implode(',', $lotIds);
        $lots = $db->query(
            "SELECT l.id, l.lot_number, l.warehouse_id, w.name AS warehouse_name, l.expires_date, l.quantity_on_hand, l.deleted_at, l.created_at,
                    (SELECT MIN(m.movement_date) FROM drug_stock_movements m WHERE m.lot_id = l.id) AS first_date,
                    (SELECT MAX(m.movement_date) FROM drug_stock_movements m WHERE m.lot_id = l.id) AS last_date
             FROM drug_inventory_lots l JOIN warehouses w ON w.id = l.warehouse_id
             WHERE l.id IN ({$in}) ORDER BY l.created_at, l.id"
        )->fetchAll(PDO::FETCH_ASSOC);

        $today = date('Y-m-d');
        $locations = array_map(fn($l) => [
            'lot_id' => (int) $l['id'],
            'lot_number' => $l['lot_number'],
            'warehouse_id' => (int) $l['warehouse_id'],
            'warehouse_name' => $l['warehouse_name'],
            'expires_date' => $l['expires_date'],
            'is_expired' => $l['expires_date'] !== null && $l['expires_date'] < $today,
            'on_hand' => $l['deleted_at'] === null ? round((float) $l['quantity_on_hand'], 3) : 0.0,
            'is_removed' => $l['deleted_at'] !== null,
            'first_date' => $l['first_date'],
            'last_date' => $l['last_date']
        ], $lots);

        $sources = $this->sources($in);
        $transfers = $this->transfers($in);
        $outflows = $this->outflows($in);
        $movements = $this->movements($in);

        $sum = fn(array $types) => round(array_sum(array_map(fn($m) => in_array($m['type'], $types, true) ? $m['quantity'] : 0, $movements)), 3);
        $onHand = round(array_sum(array_column($locations, 'on_hand')), 3);
        $inTransit = round(array_sum(array_map(fn($t) => $t['status'] === 'in_transit' ? $t['quantity_sent'] : 0, $transfers)), 3);
        $ledgerTotal = round(array_sum(array_column($movements, 'quantity')), 3);

        $expiries = array_values(array_unique(array_filter(array_column($locations, 'expires_date'))));
        sort($expiries);

        return [
            'drug' => [
                'id' => (int) $drug['id'], 'name' => $drug['name'], 'generic_name' => $drug['generic_name'], 'strength' => $drug['strength'],
                'manufacturer' => $drug['manufacturer'], 'product_type' => $drug['product_type'], 'unit_name' => $drug['unit_name']
            ],
            'lot_number' => $lots[0]['lot_number'],
            'lot_numbers' => array_values(array_unique(array_column($lots, 'lot_number'))),
            'expiries' => $expiries,
            'is_expired' => $expiries !== [] && $expiries[0] < $today,
            'totals' => [
                'received' => $sum(['received', 'receipt_voided']),
                'opening' => $sum(['opening']),
                'returned' => -$sum(['returned']),
                'destroyed' => -$sum(['destroyed']),
                'adjusted' => $sum(['adjusted']),
                'dispensed' => -$sum(['dispensed', 'dispense_voided']),
                // Sent but not (yet) received at the other end: in transit, or lost on the way.
                'transfer_gap' => -$sum(['transfer_in', 'transfer_out', 'transfer_cancelled']),
                'in_transit' => $inTransit,
                'lost_in_transit' => round(-$sum(['transfer_in', 'transfer_out', 'transfer_cancelled']) - $inTransit, 3),
                'on_hand' => $onHand,
                'locations_holding' => count(array_filter($locations, fn($l) => $l['on_hand'] > self::EPSILON))
            ],
            // Every lot's ledger must end at its stock on hand.
            'reconciled' => abs($ledgerTotal - $onHand) < self::EPSILON,
            'ledger_total' => $ledgerTotal,
            'locations' => $locations,
            'sources' => $sources,
            'transfers' => $transfers,
            'outflows' => $outflows,
            'movements' => $movements,
            'documents' => $this->documents($sources, $transfers, $outflows, $movements)
        ];
    }

    /** Lots of the batch: same item and lot number, plus any lot reached from them by a transfer. */
    private function family(int $drugId, string $lotNumber): array
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT id FROM drug_inventory_lots WHERE drug_id = :drug AND UPPER(TRIM(lot_number)) = UPPER(TRIM(:lot))");
        $stmt->execute(['drug' => $drugId, 'lot' => $lotNumber]);
        $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
        $queue = $ids;

        while ($queue) {
            $in = implode(',', $queue);
            $next = $db->query(
                "SELECT to_lot_id FROM drug_inventory_transfers WHERE from_lot_id IN ({$in}) AND to_lot_id IS NOT NULL
                 UNION SELECT from_lot_id FROM drug_inventory_transfers WHERE to_lot_id IN ({$in})
                 UNION SELECT to_lot_id FROM stock_transfer_lots WHERE from_lot_id IN ({$in}) AND to_lot_id IS NOT NULL
                 UNION SELECT from_lot_id FROM stock_transfer_lots WHERE to_lot_id IN ({$in})"
            )->fetchAll(PDO::FETCH_COLUMN);

            $queue = array_values(array_diff(array_map('intval', $next), $ids));
            $ids = array_merge($ids, $queue);
        }

        sort($ids);

        return $ids;
    }

    /** Where it came from: deliveries and manual receipts into the batch's lots. */
    private function sources(string $in): array
    {
        $db = Database::connection();
        $rows = $db->query(
            "SELECT r.id, r.lot_id, r.received_date, r.quantity, r.unit_cost, r.invoice_number, r.notes, r.voided_at,
                    COALESCE(s.name, r.supplier) AS supplier_name, r.supplier_id,
                    gr.id AS goods_receipt_id, gr.gr_number, gr.delivery_receipt_no, gr.invoice_no AS gr_invoice_no, gr.void_reason,
                    po.id AS purchase_order_id, po.po_number, po.order_date, po.status AS po_status,
                    w.name AS warehouse_name, l.lot_number, l.expires_date,
                    " . self::userNameSql('r.created_by') . " AS received_by
             FROM drug_inventory_receipts r
             JOIN drug_inventory_lots l ON l.id = r.lot_id
             JOIN warehouses w ON w.id = l.warehouse_id
             LEFT JOIN suppliers s ON s.id = r.supplier_id
             LEFT JOIN goods_receipts gr ON gr.id = r.goods_receipt_id
             LEFT JOIN purchase_orders po ON po.id = gr.purchase_order_id
             WHERE r.lot_id IN ({$in})
             ORDER BY r.received_date, r.id"
        )->fetchAll(PDO::FETCH_ASSOC);

        $invoices = [];
        $grIds = array_values(array_unique(array_filter(array_map(fn($r) => (int) $r['goods_receipt_id'], $rows))));
        if ($grIds) {
            $stmt = $db->query(
                "SELECT sir.goods_receipt_id, si.id, si.ap_number, si.supplier_invoice_no, si.invoice_date, si.status, si.payment_status
                 FROM supplier_invoice_receipts sir
                 JOIN supplier_invoices si ON si.id = sir.supplier_invoice_id
                 WHERE si.deleted_at IS NULL AND sir.goods_receipt_id IN (" . implode(',', $grIds) . ")
                 ORDER BY si.invoice_date, si.id"
            );
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $si) {
                $invoices[(int) $si['goods_receipt_id']][] = [
                    'id' => (int) $si['id'], 'ap_number' => $si['ap_number'], 'supplier_invoice_no' => $si['supplier_invoice_no'],
                    'invoice_date' => $si['invoice_date'], 'status' => $si['status'], 'payment_status' => $si['payment_status']
                ];
            }
        }

        return array_map(fn($r) => [
            'id' => (int) $r['id'],
            'lot_id' => (int) $r['lot_id'],
            'date' => $r['received_date'],
            'supplier_name' => $r['supplier_name'],
            'quantity' => (float) $r['quantity'],
            'unit_cost' => $r['unit_cost'] !== null ? (float) $r['unit_cost'] : null,
            'warehouse_name' => $r['warehouse_name'],
            'lot_number' => $r['lot_number'],
            'expires_date' => $r['expires_date'],
            'gr_number' => $r['gr_number'],
            'delivery_receipt_no' => $r['delivery_receipt_no'],
            // A delivery's receipt row carries the DR number; only manual receipts store the supplier's invoice there.
            'invoice_no' => $r['goods_receipt_id'] ? $r['gr_invoice_no'] : $r['invoice_number'],
            'po_number' => $r['po_number'],
            'po_date' => $r['order_date'],
            'po_status' => $r['po_status'],
            'supplier_invoices' => $invoices[(int) $r['goods_receipt_id']] ?? [],
            'is_voided' => $r['voided_at'] !== null,
            'void_reason' => $r['void_reason'],
            'notes' => $r['notes'],
            'received_by' => $r['received_by'],
            'kind' => $r['goods_receipt_id'] ? 'delivery' : 'manual'
        ], $rows);
    }

    /** Where it went: transfers out of (or into) the batch's lots. */
    private function transfers(string $in): array
    {
        $db = Database::connection();
        $rows = [];

        $stmt = $db->query(
            "SELECT x.id, t.id AS transfer_id, t.st_number, t.status, t.sent_date, t.received_date, t.cancelled_at, t.sent_via, t.cancel_reason,
                    fw.name AS from_name, tw.name AS to_name, x.from_lot_id, x.to_lot_id, x.quantity_sent, x.quantity_received, x.short_reason, x.short_notes
             FROM stock_transfer_lots x
             JOIN stock_transfers t ON t.id = x.stock_transfer_id
             JOIN warehouses fw ON fw.id = t.from_warehouse_id
             JOIN warehouses tw ON tw.id = t.to_warehouse_id
             WHERE (x.from_lot_id IN ({$in}) OR x.to_lot_id IN ({$in})) AND t.sent_at IS NOT NULL AND t.deleted_at IS NULL
             ORDER BY t.sent_date, x.id"
        );
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $x) {
            $received = $x['status'] === 'received' ? (float) $x['quantity_received'] : null;
            $rows[] = [
                'source' => 'stock_transfer',
                'id' => (int) $x['id'],
                'reference_no' => $x['st_number'],
                'status' => $x['status'],
                'date' => $x['sent_date'],
                'received_date' => $x['received_date'],
                'from_name' => $x['from_name'],
                'to_name' => $x['to_name'],
                'quantity_sent' => (float) $x['quantity_sent'],
                'quantity_received' => $received,
                'short' => $received !== null ? round((float) $x['quantity_sent'] - $received, 3) : null,
                'short_reason' => $x['short_reason'] ? (StockTransferService::SHORT_REASONS[$x['short_reason']] ?? $x['short_reason']) : null,
                'notes' => $x['status'] === 'cancelled' ? $x['cancel_reason'] : ($x['short_notes'] ?: $x['sent_via'])
            ];
        }

        $stmt = $db->query(
            "SELECT t.id, DATE(t.created_at) AS moved_date, t.quantity, t.notes, fw.name AS from_name, tw.name AS to_name
             FROM drug_inventory_transfers t
             JOIN drug_inventory_lots fl ON fl.id = t.from_lot_id
             JOIN drug_inventory_lots tl ON tl.id = t.to_lot_id
             JOIN warehouses fw ON fw.id = fl.warehouse_id
             JOIN warehouses tw ON tw.id = tl.warehouse_id
             WHERE (t.from_lot_id IN ({$in}) OR t.to_lot_id IN ({$in}))
               AND NOT EXISTS (SELECT 1 FROM stock_transfers st WHERE st.st_number = t.notes)
             ORDER BY t.created_at, t.id"
        );
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $t) {
            $rows[] = [
                'source' => 'quick_transfer',
                'id' => (int) $t['id'],
                'reference_no' => null,
                'status' => 'received',
                'date' => $t['moved_date'],
                'received_date' => $t['moved_date'],
                'from_name' => $t['from_name'],
                'to_name' => $t['to_name'],
                'quantity_sent' => (float) $t['quantity'],
                'quantity_received' => (float) $t['quantity'],
                'short' => 0.0,
                'short_reason' => null,
                'notes' => $t['notes']
            ];
        }

        usort($rows, fn($a, $b) => [$a['date'], $a['id']] <=> [$b['date'], $b['id']]);

        return $rows;
    }

    /** Where it left the hospital's stock: returns, disposal, count corrections, dispensing. */
    private function outflows(string $in): array
    {
        $db = Database::connection();
        $rows = [];

        $stmt = $db->query(
            "SELECT i.id, r.rts_number, r.status, r.sent_date, r.return_date, r.credit_memo_no, s.name AS supplier_name, w.name AS warehouse_name,
                    i.base_quantity, i.reason, i.remarks
             FROM supplier_return_items i
             JOIN supplier_returns r ON r.id = i.supplier_return_id
             JOIN suppliers s ON s.id = r.supplier_id
             JOIN drug_inventory_lots l ON l.id = i.lot_id
             JOIN warehouses w ON w.id = l.warehouse_id
             WHERE i.lot_id IN ({$in}) AND i.source = 'stock' AND r.deleted_at IS NULL AND r.status NOT IN ('cancelled', 'rejected')
             ORDER BY COALESCE(r.sent_date, r.return_date), i.id"
        );
        $reasons = ['damaged' => 'Damaged / defective', 'expired' => 'Expired', 'near_expiry' => 'Near expiry', 'wrong_item' => 'Wrong item / not ordered',
                    'recalled' => 'Recalled', 'excess' => 'Excess / over-delivery', 'other' => 'Other'];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $sent = $r['sent_date'] !== null;
            $rows[] = [
                'type' => 'returned', 'label' => $sent ? 'Returned to supplier' : 'Return pending',
                'date' => $r['sent_date'] ?? $r['return_date'], 'reference_no' => $r['rts_number'],
                'warehouse_name' => $r['warehouse_name'], 'quantity' => (float) $r['base_quantity'],
                'party' => $r['supplier_name'], 'reason' => $reasons[$r['reason']] ?? $r['reason'],
                'notes' => trim(implode(' · ', array_filter([$r['remarks'], $r['credit_memo_no'] ? "Credit memo {$r['credit_memo_no']}" : null]))) ?: null,
                'is_pending' => !$sent, 'status' => $r['status']
            ];
        }

        $stmt = $db->query(
            "SELECT x.id, x.destroyed_date, x.quantity, x.method, x.witness, x.notes, w.name AS warehouse_name
             FROM drug_inventory_destructions x
             JOIN drug_inventory_lots l ON l.id = x.lot_id
             JOIN warehouses w ON w.id = l.warehouse_id
             WHERE x.lot_id IN ({$in}) ORDER BY x.destroyed_date, x.id"
        );
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $x) {
            $rows[] = [
                'type' => 'destroyed', 'label' => 'Destroyed', 'date' => $x['destroyed_date'], 'reference_no' => null,
                'warehouse_name' => $x['warehouse_name'], 'quantity' => (float) $x['quantity'],
                'party' => $x['witness'] ? "Witness: {$x['witness']}" : null, 'reason' => $x['method'], 'notes' => $x['notes'],
                'is_pending' => false, 'status' => null
            ];
        }

        // Count corrections and dispensing straight from the ledger.
        $stmt = $db->query(
            "SELECT m.movement_type, m.movement_date, m.reference_no, m.quantity, m.counterparty, m.reason, m.notes, w.name AS warehouse_name
             FROM drug_stock_movements m JOIN warehouses w ON w.id = m.warehouse_id
             WHERE m.lot_id IN ({$in}) AND m.movement_type IN ('adjusted', 'dispensed', 'dispense_voided')
             ORDER BY m.movement_date, m.id"
        );
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $m) {
            $qty = (float) $m['quantity'];
            $rows[] = [
                'type' => $m['movement_type'],
                'label' => match (true) {
                    $m['movement_type'] === 'dispensed' => 'Dispensed to patient',
                    $m['movement_type'] === 'dispense_voided' => 'Dispense undone',
                    $qty < 0 => 'Count shortage',
                    default => 'Count surplus'
                },
                'date' => $m['movement_date'], 'reference_no' => $m['reference_no'],
                'warehouse_name' => $m['warehouse_name'], 'quantity' => abs($qty), 'is_gain' => $qty > 0,
                'party' => $m['counterparty'], 'reason' => $m['reason'], 'notes' => $m['notes'],
                'is_pending' => false, 'status' => null
            ];
        }

        usort($rows, fn($a, $b) => (string) $a['date'] <=> (string) $b['date']);

        return $rows;
    }

    /** Every ledger movement of the batch, with the balance across all its locations. */
    private function movements(string $in): array
    {
        $db = Database::connection();
        $rows = $db->query(
            "SELECT m.*, l.lot_number, l.expires_date, w.name AS warehouse_name, " . self::userNameSql('m.created_by') . " AS recorded_by
             FROM drug_stock_movements m
             JOIN drug_inventory_lots l ON l.id = m.lot_id
             JOIN warehouses w ON w.id = m.warehouse_id
             WHERE m.lot_id IN ({$in})
             ORDER BY m.movement_date, m.movement_type = 'opening' DESC, m.created_at, m.id"
        )->fetchAll(PDO::FETCH_ASSOC);

        $balance = 0.0;
        $byLot = [];

        return array_map(function ($m) use (&$balance, &$byLot) {
            $qty = (float) $m['quantity'];
            $balance = round($balance + $qty, 3);
            $byLot[$m['lot_id']] = round(($byLot[$m['lot_id']] ?? 0) + $qty, 3);

            return [
                'id' => (int) $m['id'],
                'date' => $m['movement_date'],
                'type' => $m['movement_type'],
                'type_label' => StockLedgerService::TYPES[$m['movement_type']] ?? $m['movement_type'],
                'reference_no' => $m['reference_no'],
                'counterparty' => $m['counterparty'],
                'reason' => $m['reason'],
                'notes' => $m['notes'],
                'lot_id' => (int) $m['lot_id'],
                'lot_number' => $m['lot_number'],
                'warehouse_name' => $m['warehouse_name'],
                'quantity' => $qty,
                'location_balance' => $byLot[$m['lot_id']],
                'balance' => $balance,
                'unit_cost' => (float) $m['unit_cost'],
                'recorded_by' => $m['recorded_by'],
                'recorded_at' => $m['created_at']
            ];
        }, $rows);
    }

    /** The documents the batch appears on, one row each. */
    private function documents(array $sources, array $transfers, array $outflows, array $movements): array
    {
        $docs = [];
        $add = function (string $kind, ?string $number, ?string $date, ?string $detail, ?string $status = null) use (&$docs) {
            if ($number === null || $number === '') {
                return;
            }
            $docs[$kind . '|' . $number] ??= ['kind' => $kind, 'number' => $number, 'date' => $date, 'detail' => $detail, 'status' => $status];
        };

        foreach ($sources as $s) {
            $add('Purchase Order', $s['po_number'], $s['po_date'], $s['supplier_name'], $s['po_status']);
            $add('Receiving Report', $s['gr_number'], $s['date'], trim(implode(' · ', array_filter([$s['warehouse_name'], $s['delivery_receipt_no'] ? "DR {$s['delivery_receipt_no']}" : null]))), $s['is_voided'] ? 'voided' : null);
            foreach ($s['supplier_invoices'] as $si) {
                $add('Supplier Invoice', $si['ap_number'], $si['invoice_date'], "Supplier invoice {$si['supplier_invoice_no']}", $si['status']);
            }
            if (!$s['gr_number']) {
                $add('Supplier Invoice', $s['invoice_no'], $s['date'], $s['supplier_name']);
            }
        }
        foreach ($transfers as $t) {
            $add('Stock Transfer', $t['reference_no'], $t['date'], "{$t['from_name']} → {$t['to_name']}", $t['status']);
        }
        foreach ($outflows as $o) {
            if ($o['type'] === 'returned') {
                $add('Return to Supplier', $o['reference_no'], $o['date'], $o['party'], $o['status']);
            }
        }
        foreach ($movements as $m) {
            if ($m['type'] === 'adjusted') {
                $add('Stock Count', $m['reference_no'], $m['date'], $m['warehouse_name']);
            }
        }

        $order = ['Purchase Order' => 1, 'Receiving Report' => 2, 'Supplier Invoice' => 3, 'Stock Transfer' => 4, 'Stock Count' => 5, 'Return to Supplier' => 6];
        $docs = array_values($docs);
        usort($docs, fn($a, $b) => [$order[$a['kind']] ?? 9, (string) $a['date'], $a['number']] <=> [$order[$b['kind']] ?? 9, (string) $b['date'], $b['number']]);

        return $docs;
    }

    /** @param array<int, array{drug_id:int, lot_key:string}> $batches */
    private function lotsFor(array $batches): array
    {
        $db = Database::connection();
        $conditions = [];
        $params = [];

        foreach ($batches as $i => $b) {
            $conditions[] = "(l.drug_id = :d{$i} AND UPPER(TRIM(l.lot_number)) = :k{$i})";
            $params["d{$i}"] = $b['drug_id'];
            $params["k{$i}"] = $b['lot_key'];
        }

        $rows = [];
        foreach (array_chunk($conditions, 400, true) as $chunk) {
            $chunkParams = [];
            foreach (array_keys($chunk) as $i) {
                $chunkParams["d{$i}"] = $params["d{$i}"];
                $chunkParams["k{$i}"] = $params["k{$i}"];
            }
            $stmt = $db->prepare(
                "SELECT l.id, l.drug_id, l.lot_number, UPPER(TRIM(l.lot_number)) AS lot_key, l.expires_date, l.quantity_on_hand, l.deleted_at,
                        d.name AS drug_name, du.name AS unit_name, w.name AS warehouse_name
                 FROM drug_inventory_lots l
                 JOIN drugs d ON d.id = l.drug_id
                 LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
                 JOIN warehouses w ON w.id = l.warehouse_id
                 WHERE (" . implode(' OR ', $chunk) . ")
                   AND (l.deleted_at IS NULL OR EXISTS (SELECT 1 FROM drug_stock_movements m0 WHERE m0.lot_id = l.id))
                 ORDER BY l.created_at, l.id"
            );
            $stmt->execute($chunkParams);
            $rows = array_merge($rows, $stmt->fetchAll(PDO::FETCH_ASSOC));
        }

        return $rows;
    }

    /** lot_id => [[name, date], ...] from non-voided receipts. */
    private function suppliersFor(array $lotIds): array
    {
        if (!$lotIds) {
            return [];
        }

        $rows = Database::connection()->query(
            "SELECT r.lot_id, COALESCE(s.name, r.supplier) AS name, r.received_date
             FROM drug_inventory_receipts r LEFT JOIN suppliers s ON s.id = r.supplier_id
             WHERE r.voided_at IS NULL AND r.lot_id IN (" . implode(',', array_map('intval', $lotIds)) . ")"
        )->fetchAll(PDO::FETCH_ASSOC);

        $out = [];
        foreach ($rows as $r) {
            if ($r['name'] !== null && $r['name'] !== '') {
                $out[(int) $r['lot_id']][] = ['name' => $r['name'], 'date' => $r['received_date']];
            }
        }

        return $out;
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
