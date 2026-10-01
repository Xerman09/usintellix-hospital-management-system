<?php

namespace App\Modules\Receiving\Services;

use App\Core\Database;
use App\Modules\BusinessSettings\Services\BusinessSettingService;
use App\Modules\DrugInventory\Services\DrugInventoryService;
use App\Modules\PurchaseOrders\Models\PurchaseOrder;
use App\Modules\PurchaseOrders\Services\PurchaseOrderService;
use App\Modules\Receiving\Models\GoodsReceipt;
use App\Modules\Receiving\Models\GoodsReceiptItem;
use PDO;
use Throwable;

/**
 * Receiving deliveries against approved purchase orders. One receipt
 * (Receiving Report, RR-...) is one delivery for one order; each of its
 * rows is one lot of one order line. Saving a receipt, all or nothing:
 *   * puts the accepted quantity into stock through
 *     DrugInventoryService::receiveStock() (lot, expiry, cost),
 *   * adds it to purchase_order_items.quantity_received,
 *   * moves the order to partially_received or received, and logs it
 *     in the order's history.
 * Quantity rejected on arrival is recorded but not stocked, and doesn't
 * count as received -- the supplier still owes it.
 *
 * Deliveries don't always match the order, so a receipt may also hold:
 *   * more than was still due on a line -- accepted, with the excess
 *     kept in over_quantity so it shows as an over-delivery;
 *   * items that aren't on the order at all -- rows with no order line
 *     (purchase_order_item_id NULL), costed at the price entered, else
 *     the supplier's price list, else the catalog cost.
 */
class ReceivingService
{
    public const INPUT_FIELDS = [
        'purchase_order_id', 'received_date', 'warehouse_id', 'delivery_receipt_no', 'invoice_no', 'notes', 'items'
    ];

    /** Tolerance for decimal quantities (e.g. 0.1 + 0.2 boxes). */
    private const EPSILON = 0.0005;

    /** Orders that can still take deliveries, with how much has arrived. */
    public function pending(?array $viewer = null): array
    {
        $orders = (new PurchaseOrderService())->list([], $viewer);

        $pending = array_values(array_filter(
            $orders,
            fn(array $o) => in_array($o['status'], PurchaseOrderService::RECEIVABLE_STATUSES, true)
        ));

        if (!$pending) {
            return [];
        }

        $ids = array_column($pending, 'id');
        $placeholders = implode(', ', array_fill(0, count($ids), '?'));

        $stmt = Database::connection()->prepare(
            "SELECT purchase_order_id,
                    COUNT(*) AS line_count,
                    SUM(CASE WHEN quantity_received + 0.0005 >= quantity THEN 1 ELSE 0 END) AS lines_complete,
                    SUM(quantity) AS qty_ordered,
                    SUM(LEAST(quantity_received, quantity)) AS qty_received
             FROM purchase_order_items
             WHERE purchase_order_id IN ({$placeholders})
             GROUP BY purchase_order_id"
        );
        $stmt->execute($ids);

        $progress = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $progress[(int) $row['purchase_order_id']] = $row;
        }

        $stmt = Database::connection()->prepare(
            "SELECT purchase_order_id, COUNT(*) FROM goods_receipts
             WHERE purchase_order_id IN ({$placeholders})
             GROUP BY purchase_order_id"
        );
        $stmt->execute($ids);
        $deliveries = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

        foreach ($pending as &$order) {
            $order['delivery_count'] = (int) ($deliveries[$order['id']] ?? 0);
            $p = $progress[$order['id']] ?? null;
            $order['line_count'] = $p ? (int) $p['line_count'] : 0;
            $order['lines_complete'] = $p ? (int) $p['lines_complete'] : 0;
            $order['percent_received'] = $p && (float) $p['qty_ordered'] > 0
                ? (int) floor((float) $p['qty_received'] / (float) $p['qty_ordered'] * 100)
                : 0;
        }

        // Soonest expected first; orders with no date last.
        usort($pending, fn($a, $b) => [$a['expected_date'] === null, $a['expected_date'], $a['id']]
            <=> [$b['expected_date'] === null, $b['expected_date'], $b['id']]);

        return $pending;
    }

    public function list(array $filters = []): array
    {
        $where = ['1 = 1'];
        $params = [];

        foreach (['purchase_order_id' => 'gr.purchase_order_id', 'supplier_id' => 'gr.supplier_id'] as $key => $column) {
            if (!empty($filters[$key])) {
                $where[] = "{$column} = :{$key}";
                $params[$key] = (int) $filters[$key];
            }
        }

        $stmt = Database::connection()->prepare(
            "SELECT gr.*, po.po_number, s.name AS supplier_name, s.code AS supplier_code, w.name AS warehouse_name,
                    " . self::userNameSql('gr.created_by') . " AS received_by_name,
                    (SELECT COUNT(*) FROM goods_receipt_items i WHERE i.goods_receipt_id = gr.id) AS item_count,
                    (SELECT COALESCE(SUM(i.rejected_quantity), 0) FROM goods_receipt_items i WHERE i.goods_receipt_id = gr.id) AS rejected_total,
                    (SELECT COUNT(*) FROM goods_receipt_items i WHERE i.goods_receipt_id = gr.id AND i.purchase_order_item_id IS NULL) AS extra_count,
                    (SELECT COUNT(*) FROM goods_receipt_items i WHERE i.goods_receipt_id = gr.id AND i.over_quantity > 0) AS over_count
             FROM goods_receipts gr
             JOIN purchase_orders po ON po.id = gr.purchase_order_id
             JOIN suppliers s ON s.id = gr.supplier_id
             LEFT JOIN warehouses w ON w.id = gr.warehouse_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY gr.id DESC
             LIMIT 2000"
        );
        $stmt->execute($params);

        return array_map(fn(array $r) => $this->formatHeader($r), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** One receipt with its rows, the order's and supplier's details, and the hospital's (for printing). */
    public function get(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT gr.*, po.po_number, po.order_date, po.status AS po_status,
                    s.name AS supplier_name, s.code AS supplier_code, s.address_line, s.city, s.province, s.tin,
                    w.name AS warehouse_name,
                    " . self::userNameSql('gr.created_by') . " AS received_by_name,
                    (SELECT COUNT(*) FROM goods_receipt_items i WHERE i.goods_receipt_id = gr.id) AS item_count,
                    (SELECT COALESCE(SUM(i.rejected_quantity), 0) FROM goods_receipt_items i WHERE i.goods_receipt_id = gr.id) AS rejected_total,
                    (SELECT COUNT(*) FROM goods_receipt_items i WHERE i.goods_receipt_id = gr.id AND i.purchase_order_item_id IS NULL) AS extra_count,
                    (SELECT COUNT(*) FROM goods_receipt_items i WHERE i.goods_receipt_id = gr.id AND i.over_quantity > 0) AS over_count
             FROM goods_receipts gr
             JOIN purchase_orders po ON po.id = gr.purchase_order_id
             JOIN suppliers s ON s.id = gr.supplier_id
             LEFT JOIN warehouses w ON w.id = gr.warehouse_id
             WHERE gr.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $receipt = $this->formatHeader($row);
        $receipt['order_date'] = $row['order_date'];
        $receipt['po_status'] = $row['po_status'];
        $receipt['supplier_address'] = implode(', ', array_filter([$row['address_line'], $row['city'], $row['province']]));
        $receipt['supplier_tin'] = $row['tin'];

        $items = Database::connection()->prepare(
            "SELECT i.*, poi.line_no, COALESCE(i.order_unit, poi.order_unit) AS row_unit, poi.quantity AS ordered_quantity,
                    poi.supplier_item_code, d.name AS drug_name, du.name AS unit_name, pu.name AS package_unit_name
             FROM goods_receipt_items i
             LEFT JOIN purchase_order_items poi ON poi.id = i.purchase_order_item_id
             JOIN drugs d ON d.id = i.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN amount_units pu ON pu.id = d.package_unit_id
             WHERE i.goods_receipt_id = :id
             ORDER BY poi.line_no IS NULL, poi.line_no, i.id"
        );
        $items->execute(['id' => $id]);

        $receipt['items'] = array_map(fn(array $r) => [
            'id' => (int) $r['id'],
            'line_no' => $r['line_no'] !== null ? (int) $r['line_no'] : null,
            'on_order' => $r['purchase_order_item_id'] !== null,
            'drug_id' => (int) $r['drug_id'],
            'drug_name' => $r['drug_name'],
            'supplier_item_code' => $r['supplier_item_code'],
            'order_unit' => $r['row_unit'] ?: 'unit',
            'unit_name' => $r['unit_name'],
            'package_unit_name' => $r['package_unit_name'],
            'ordered_quantity' => $r['ordered_quantity'] !== null ? (float) $r['ordered_quantity'] : null,
            'over_quantity' => (float) $r['over_quantity'],
            'lot_number' => $r['lot_number'],
            'expires_date' => $r['expires_date'],
            'quantity' => (float) $r['quantity'],
            'base_quantity' => (float) $r['base_quantity'],
            'rejected_quantity' => (float) $r['rejected_quantity'],
            'rejection_reason' => $r['rejection_reason'],
            'unit_cost' => $r['unit_cost'] !== null ? (float) $r['unit_cost'] : null,
            'line_cost' => $r['unit_cost'] !== null ? round((float) $r['unit_cost'] * (float) $r['base_quantity'], 2) : null
        ], $items->fetchAll(PDO::FETCH_ASSOC));

        $business = (new BusinessSettingService())->get();
        $receipt['buyer'] = [
            'name' => $business['name'] ?? null,
            'address' => $business['address'] ?? null,
            'phone' => $business['phone'] ?? null,
            'email' => $business['email'] ?? null
        ];

        return $receipt;
    }

    /**
     * Items that can be received but aren't on this order: active,
     * stock-tracked catalog items, with this supplier's price if listed.
     */
    public function extraProducts(int $supplierId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT d.id, d.name, d.product_type, d.package_quantity, d.unit_cost,
                    du.name AS unit_name, pu.name AS package_unit_name,
                    sp.price AS list_price, sp.price_basis
             FROM drugs d
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN amount_units pu ON pu.id = d.package_unit_id
             LEFT JOIN supplier_products sp ON sp.id = (
                 SELECT x.id FROM supplier_products x
                 WHERE x.drug_id = d.id AND x.supplier_id = :supplier AND x.deleted_at IS NULL AND x.is_active = 1
                 ORDER BY x.id LIMIT 1
             )
             WHERE d.deleted_at IS NULL AND d.is_active = 1 AND d.allow_inventory = 1
             ORDER BY d.name"
        );
        $stmt->execute(['supplier' => $supplierId]);

        return array_map(function (array $r) {
            $perPackage = $r['package_quantity'] !== null && (float) $r['package_quantity'] > 0 ? (float) $r['package_quantity'] : null;
            $unitPrice = null;

            if ($r['list_price'] !== null) {
                $unitPrice = $r['price_basis'] === 'package' && $perPackage
                    ? round((float) $r['list_price'] / $perPackage, 4)
                    : (float) $r['list_price'];
            } elseif ($r['unit_cost'] !== null) {
                $unitPrice = (float) $r['unit_cost'];
            }

            return [
                'id' => (int) $r['id'],
                'name' => $r['name'],
                'product_type' => $r['product_type'],
                'unit_name' => $r['unit_name'],
                'package_unit_name' => $r['package_unit_name'],
                'package_quantity' => $perPackage,
                // Cost per dispensing unit to suggest; null = unknown.
                'unit_price' => $unitPrice,
                'price_source' => $r['list_price'] !== null ? 'supplier' : ($r['unit_cost'] !== null ? 'catalog' : null)
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Records a delivery. Body: purchase_order_id, received_date,
     * warehouse_id, delivery_receipt_no?, invoice_no?, notes?, items[].
     * Each item is either
     *   an order line: { purchase_order_item_id, quantity, ... } with
     *     the quantity in the line's unit (boxes if ordered in boxes) --
     *     more than is still due is allowed and recorded as over-delivery;
     *   or an item not on the order: { drug_id, order_unit, quantity,
     *     unit_price?, ... } where unit_price is per order_unit.
     * Both take lot_number, expires_date, rejected_quantity?, rejection_reason?.
     */
    public function receive(array $data, int $userId): array
    {
        $db = Database::connection();
        $poService = new PurchaseOrderService();
        $errors = [];

        $orderId = (int) ($data['purchase_order_id'] ?? 0);
        $order = $orderId ? $poService->get($orderId) : null;

        if (!$order) {
            return ['success' => false, 'message' => 'Purchase order not found.', 'not_found' => true];
        }

        if (!in_array($order['status'], PurchaseOrderService::RECEIVABLE_STATUSES, true)) {
            $why = [
                'draft' => 'it is still a draft',
                'pending_approval' => 'it hasn\'t been approved yet',
                'rejected' => 'it was rejected',
                'cancelled' => 'it was cancelled',
                'received' => 'everything on it has already been received',
                'closed' => 'it was closed'
            ][$order['status']] ?? 'of its status';

            return ['success' => false, 'message' => "{$order['po_number']} can't take deliveries because {$why}."];
        }

        // Header
        $receivedDate = trim((string) ($data['received_date'] ?? '')) ?: date('Y-m-d');

        if (!$this->isValidDate($receivedDate)) {
            $errors['received_date'] = 'Enter a valid date.';
        } elseif ($receivedDate > date('Y-m-d')) {
            $errors['received_date'] = 'The delivery date can\'t be in the future.';
        } elseif ($receivedDate < $order['order_date']) {
            $errors['received_date'] = 'The delivery date is before the order date (' . $order['order_date'] . ').';
        }

        $warehouseId = (int) ($data['warehouse_id'] ?? 0);

        if (!$warehouseId) {
            $errors['warehouse_id'] = 'Choose where the stock is going.';
        } else {
            $stmt = $db->prepare("SELECT id FROM warehouses WHERE id = :id AND deleted_at IS NULL AND is_active = 1");
            $stmt->execute(['id' => $warehouseId]);

            if (!$stmt->fetchColumn()) {
                $errors['warehouse_id'] = 'Location not found.';
            }
        }

        $header = [];
        foreach (['delivery_receipt_no' => 100, 'invoice_no' => 100, 'notes' => 2000] as $field => $max) {
            $value = trim((string) ($data[$field] ?? ''));
            $header[$field] = $value === '' ? null : mb_substr($value, 0, $max);
        }

        // Rows
        $lines = [];
        $lineByDrug = [];
        foreach ($order['items'] as $item) {
            $lines[$item['id']] = $item;
            $lineByDrug[$item['drug_id']] = $item;
        }

        $extraProducts = [];
        foreach ($this->extraProducts($order['supplier_id']) as $product) {
            $extraProducts[$product['id']] = $product;
        }

        $rows = is_array($data['items'] ?? null) ? array_values($data['items']) : [];
        $accepted = [];   // purchase_order_item_id => quantity accepted in this delivery
        $toSave = [];

        foreach ($rows as $i => $row) {
            $key = "items.{$i}";
            $row = is_array($row) ? $row : [];
            $lineId = (int) ($row['purchase_order_item_id'] ?? 0);
            $line = $lineId ? ($lines[$lineId] ?? null) : null;

            $qty = $this->number($row['quantity'] ?? '');
            $rejected = $this->number($row['rejected_quantity'] ?? '');

            if ($qty === null && $rejected === null) {
                continue; // untouched row
            }

            $qty = $qty ?? 0.0;
            $rejected = $rejected ?? 0.0;

            if ($qty < 0) {
                $errors["{$key}.quantity"] = 'Cannot be negative.';
            }

            if ($rejected < 0) {
                $errors["{$key}.rejected_quantity"] = 'Cannot be negative.';
            }

            if ($qty <= 0 && $rejected <= 0) {
                continue;
            }

            $reason = trim((string) ($row['rejection_reason'] ?? ''));

            if ($rejected > 0 && $reason === '') {
                $errors["{$key}.rejection_reason"] = 'Say why it was rejected (e.g. damaged, near expiry).';
            }

            $entry = [
                'index' => $i,
                'line' => $line,
                'quantity' => round(max(0, $qty), 3),
                'rejected' => round(max(0, $rejected), 3),
                'reason' => $reason !== '' ? mb_substr($reason, 0, 255) : null,
                'lot_number' => trim((string) ($row['lot_number'] ?? '')),
                'expires_date' => trim((string) ($row['expires_date'] ?? '')) ?: null,
                'over' => 0.0
            ];

            if ($lineId) {
                // A line on the order.
                if (!$line) {
                    $errors["{$key}.quantity"] = 'This item is not on the purchase order.';
                    continue;
                }

                if ($qty > 0 && (!$line['drug_is_active'] || !$line['allow_inventory'])) {
                    $errors["{$key}.quantity"] = $line['drug_is_active']
                        ? 'Inventory tracking is off for this item in the drug catalog.'
                        : 'This item is inactive in the drug catalog. Re-activate it to receive stock.';
                }

                $entry['drug_id'] = $line['drug_id'];
                $entry['order_unit'] = $line['order_unit'];
                $entry['units_per_package'] = $line['order_unit'] === 'package' ? $line['units_per_package'] : null;
                $entry['cost_per_order_unit'] = $line['net_unit_price'];

                // Whatever goes past what was still due is an over-delivery.
                $before = $accepted[$lineId] ?? 0.0;
                $stillDue = max(0, $line['quantity_remaining'] - $before);
                $entry['over'] = round(max(0, $entry['quantity'] - $stillDue), 3);
                $accepted[$lineId] = $before + $entry['quantity'];
            } else {
                // Not on the order.
                $drugId = (int) ($row['drug_id'] ?? 0);
                $product = $extraProducts[$drugId] ?? null;

                if (!$drugId) {
                    $errors["{$key}.drug_id"] = 'Choose the item that was delivered.';
                    continue;
                }

                if (isset($lineByDrug[$drugId])) {
                    $errors["{$key}.drug_id"] = 'This item is on the order (line ' . $lineByDrug[$drugId]['line_no'] . '). Receive it on that line.';
                    continue;
                }

                if (!$product) {
                    $errors["{$key}.drug_id"] = 'Item not found, inactive, or not tracked in inventory.';
                    continue;
                }

                $unit = ($row['order_unit'] ?? 'unit') === 'package' ? 'package' : 'unit';

                if ($unit === 'package' && !$product['package_quantity']) {
                    $errors["{$key}.order_unit"] = 'This item has no package size. Receive it in units.';
                    $unit = 'unit';
                }

                $perPackage = $unit === 'package' ? $product['package_quantity'] : null;
                $rawPrice = $row['unit_price'] ?? '';

                if ($rawPrice !== '' && $rawPrice !== null && (!is_numeric($rawPrice) || (float) $rawPrice < 0)) {
                    $errors["{$key}.unit_price"] = 'Enter zero or more.';
                }

                $costPerOrderUnit = is_numeric($rawPrice)
                    ? round((float) $rawPrice, 4)
                    : ($product['unit_price'] !== null ? round($product['unit_price'] * ($perPackage ?: 1), 4) : 0.0);

                $entry['drug_id'] = $drugId;
                $entry['product'] = $product;
                $entry['order_unit'] = $unit;
                $entry['units_per_package'] = $perPackage;
                $entry['cost_per_order_unit'] = $costPerOrderUnit;
            }

            $toSave[] = $entry;
        }

        if (!$toSave && !$errors) {
            $errors['items'] = 'Enter the quantity received for at least one item.';
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        // Save everything or nothing -- also when called inside someone
        // else's transaction (a savepoint undoes just this delivery).
        $now = date('Y-m-d H:i:s');
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        } else {
            $db->exec('SAVEPOINT goods_receipt');
        }

        $undo = function () use ($db, $ownsTransaction) {
            if ($ownsTransaction) {
                $db->rollBack();
            } else {
                $db->exec('ROLLBACK TO SAVEPOINT goods_receipt');
            }
        };

        try {
            $receiptId = (new GoodsReceipt())->create([
                'purchase_order_id' => $orderId,
                'supplier_id' => $order['supplier_id'],
                'warehouse_id' => $warehouseId,
                'received_date' => $receivedDate,
                'delivery_receipt_no' => $header['delivery_receipt_no'],
                'invoice_no' => $header['invoice_no'],
                'notes' => $header['notes'],
                'created_at' => $now,
                'created_by' => $userId
            ]);

            if (!$receiptId) {
                throw new \RuntimeException('goods receipt insert failed');
            }

            $grNumber = 'RR-' . date('Y') . '-' . str_pad((string) $receiptId, 5, '0', STR_PAD_LEFT);
            $supplierActive = (bool) ($order['supplier']['is_active'] ?? false);
            $inventory = new DrugInventoryService();
            $totalCost = 0.0;
            $stockErrors = [];

            foreach ($toSave as $entry) {
                $perPackage = $entry['order_unit'] === 'package' && $entry['units_per_package'] ? $entry['units_per_package'] : 1.0;
                $baseQty = round($entry['quantity'] * $perPackage, 3);
                $unitCost = round($entry['cost_per_order_unit'] / $perPackage, 4);
                $lotId = null;
                $inventoryReceiptId = null;

                if ($entry['quantity'] > 0) {
                    $result = $inventory->receiveStock([
                        'drug_id' => $entry['drug_id'],
                        'warehouse_id' => $warehouseId,
                        'lot_number' => $entry['lot_number'],
                        'expires_date' => $entry['expires_date'],
                        'quantity' => $baseQty,
                        'quantity_in' => 'unit',
                        'received_date' => $receivedDate,
                        // A supplier deactivated after the order was approved
                        // still delivered it -- record the name only.
                        'supplier_id' => $supplierActive ? $order['supplier_id'] : null,
                        'supplier' => $order['supplier_name'],
                        'invoice_number' => $header['invoice_no'] ?? $header['delivery_receipt_no'],
                        'unit_cost' => $unitCost,
                        'notes' => "{$grNumber} for {$order['po_number']}" . ($entry['line'] ? '' : ' (not on the order)'),
                        'goods_receipt_id' => $receiptId
                    ], $userId);

                    if (!$result['success']) {
                        $fieldMap = ['lot_number' => 'lot_number', 'expires_date' => 'expires_date', 'quantity' => 'quantity'];
                        $mapped = false;

                        foreach ($result['errors'] ?? [] as $field => $message) {
                            $target = $fieldMap[$field] ?? 'quantity';
                            $stockErrors["items.{$entry['index']}.{$target}"] = $message;
                            $mapped = true;
                        }

                        if (!$mapped) {
                            $stockErrors["items.{$entry['index']}.quantity"] = $result['message'];
                        }

                        continue;
                    }

                    $lotId = $result['data']['lot_id'];
                    $inventoryReceiptId = $result['data']['receipt_id'];
                    $totalCost += $unitCost * $baseQty;
                }

                (new GoodsReceiptItem())->create([
                    'goods_receipt_id' => $receiptId,
                    'purchase_order_item_id' => $entry['line']['id'] ?? null,
                    'drug_id' => $entry['drug_id'],
                    'order_unit' => $entry['order_unit'],
                    'units_per_package' => $entry['units_per_package'],
                    'lot_number' => $entry['lot_number'] !== '' ? mb_substr($entry['lot_number'], 0, 100) : null,
                    'expires_date' => $entry['expires_date'],
                    'quantity' => $entry['quantity'],
                    'base_quantity' => $baseQty,
                    'over_quantity' => $entry['over'],
                    'rejected_quantity' => $entry['rejected'],
                    'rejection_reason' => $entry['rejected'] > 0 ? $entry['reason'] : null,
                    'unit_cost' => $unitCost,
                    'lot_id' => $lotId,
                    'inventory_receipt_id' => $inventoryReceiptId,
                    'created_at' => $now
                ]);
            }

            if ($stockErrors) {
                throw new ReceivingValidationException($stockErrors);
            }

            (new GoodsReceipt())->update(['gr_number' => $grNumber, 'total_cost' => round($totalCost, 2)], $receiptId);

            $update = $db->prepare("UPDATE purchase_order_items SET quantity_received = quantity_received + :qty WHERE id = :id");
            foreach ($accepted as $lineId => $qty) {
                if ($qty > 0) {
                    $update->execute(['qty' => round($qty, 3), 'id' => $lineId]);
                }
            }

            $stmt = $db->prepare(
                "SELECT COUNT(*) FROM purchase_order_items
                 WHERE purchase_order_id = :id AND quantity_received + " . self::EPSILON . " < quantity"
            );
            $stmt->execute(['id' => $orderId]);
            $complete = (int) $stmt->fetchColumn() === 0;
            $newStatus = $complete ? 'received' : 'partially_received';

            $values = ['status' => $newStatus, 'updated_at' => $now, 'updated_by' => $userId];
            if ($complete) {
                $values['received_at'] = $now;
            }
            (new PurchaseOrder())->update($values, $orderId);

            $rejectedCount = count(array_filter($toSave, fn($e) => $e['rejected'] > 0));
            $extraCount = count(array_filter($toSave, fn($e) => !$e['line']));
            $overCount = count(array_filter($toSave, fn($e) => $e['over'] > 0));

            $poService->log(
                $orderId,
                $complete ? 'received' : 'partially_received',
                $grNumber . ($header['delivery_receipt_no'] ? " · DR {$header['delivery_receipt_no']}" : '')
                    . ($overCount ? " · more than ordered on {$overCount} line(s)" : '')
                    . ($extraCount ? " · {$extraCount} item(s) not on the order" : '')
                    . ($rejectedCount ? " · {$rejectedCount} line(s) with rejected items" : ''),
                $userId,
                $now
            );

            if ($ownsTransaction) {
                $db->commit();
            } else {
                $db->exec('RELEASE SAVEPOINT goods_receipt');
            }
        } catch (ReceivingValidationException $e) {
            $undo();
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $e->errors];
        } catch (Throwable $e) {
            $undo();
            error_log('goods receipt failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to save the delivery. Nothing was received.'];
        }

        return [
            'success' => true,
            'message' => $complete
                ? "{$grNumber} saved. {$order['po_number']} is now fully received."
                : "{$grNumber} saved. {$order['po_number']} is partially received.",
            'data' => ['id' => $receiptId, 'gr_number' => $grNumber, 'po_status' => $newStatus]
        ];
    }

    private function formatHeader(array $r): array
    {
        return [
            'id' => (int) $r['id'],
            'gr_number' => $r['gr_number'],
            'purchase_order_id' => (int) $r['purchase_order_id'],
            'po_number' => $r['po_number'],
            'supplier_id' => (int) $r['supplier_id'],
            'supplier_name' => $r['supplier_name'],
            'supplier_code' => $r['supplier_code'],
            'warehouse_id' => (int) $r['warehouse_id'],
            'warehouse_name' => $r['warehouse_name'],
            'received_date' => $r['received_date'],
            'delivery_receipt_no' => $r['delivery_receipt_no'],
            'invoice_no' => $r['invoice_no'],
            'notes' => $r['notes'],
            'total_cost' => (float) $r['total_cost'],
            'item_count' => (int) $r['item_count'],
            'rejected_total' => (float) $r['rejected_total'],
            'extra_count' => (int) ($r['extra_count'] ?? 0),
            'over_count' => (int) ($r['over_count'] ?? 0),
            'received_by_name' => $r['received_by_name'],
            'created_at' => $r['created_at']
        ];
    }

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }

    private function unitLabel(array $line): string
    {
        return $line['order_unit'] === 'package' ? ($line['package_unit_name'] ?: 'package') : ($line['unit_name'] ?: 'unit');
    }

    /** null for blank, the number otherwise (non-numbers become -1 so they fail the "negative" check). */
    private function number($raw): ?float
    {
        if ($raw === '' || $raw === null) {
            return null;
        }

        return is_numeric($raw) ? (float) $raw : -1.0;
    }

    private function formatNumber(float $value): string
    {
        return rtrim(rtrim(number_format($value, 3, '.', ','), '0'), '.');
    }

    private function isValidDate(string $value): bool
    {
        $date = \DateTime::createFromFormat('Y-m-d', $value);

        return $date !== false && $date->format('Y-m-d') === $value;
    }
}

/** Per-row stock errors found mid-save; the whole delivery is rolled back. */
class ReceivingValidationException extends \RuntimeException
{
    public function __construct(public array $errors)
    {
        parent::__construct('Receiving validation failed');
    }
}
