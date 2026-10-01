<?php

namespace App\Modules\PurchaseOrders\Services;

use App\Core\Database;
use App\Modules\BusinessSettings\Services\BusinessSettingService;
use App\Modules\PurchaseOrders\Models\PurchaseOrder;
use App\Modules\PurchaseOrders\Models\PurchaseOrderItem;
use App\Modules\Suppliers\Services\SupplierProductService;
use PDO;
use Throwable;

/**
 * Purchase orders to suppliers. An order starts as a draft (editable),
 * is submitted once it's ready to send to the supplier (then locked),
 * and can be cancelled. Line prices are pre-filled on screen from
 * Supplier Prices, but the amounts typed on the order are what's saved
 * -- a negotiated price shouldn't be overwritten by the price list.
 * Totals are always recomputed here from the lines.
 */
class PurchaseOrderService
{
    public const STATUSES = ['draft', 'submitted', 'cancelled'];

    public const ORDER_UNITS = ['unit', 'package'];

    public const INPUT_FIELDS = [
        'supplier_id', 'order_date', 'expected_date', 'warehouse_id', 'payment_terms', 'supplier_reference',
        'notes', 'shipping_fee', 'items', 'submit'
    ];

    public function list(array $filters = []): array
    {
        $where = ['po.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['status']) && in_array($filters['status'], self::STATUSES, true)) {
            $where[] = 'po.status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['supplier_id'])) {
            $where[] = 'po.supplier_id = :supplier_id';
            $params['supplier_id'] = (int) $filters['supplier_id'];
        }

        $stmt = Database::connection()->prepare(
            "SELECT po.*, s.name AS supplier_name, s.code AS supplier_code, w.name AS warehouse_name,
                    COALESCE(items.item_count, 0) AS item_count
             FROM purchase_orders po
             JOIN suppliers s ON s.id = po.supplier_id
             LEFT JOIN warehouses w ON w.id = po.warehouse_id
             LEFT JOIN (
                 SELECT purchase_order_id, COUNT(*) AS item_count
                 FROM purchase_order_items
                 GROUP BY purchase_order_id
             ) items ON items.purchase_order_id = po.id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY po.id DESC
             LIMIT 2000"
        );
        $stmt->execute($params);

        return array_map(fn(array $r) => $this->formatHeader($r), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** One order with its lines, the supplier's details and the hospital's (for printing). */
    public function get(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT po.*, s.name AS supplier_name, s.code AS supplier_code, w.name AS warehouse_name,
                    s.contact_person AS supplier_contact, s.phone AS supplier_phone, s.mobile AS supplier_mobile,
                    s.email AS supplier_email, s.address_line AS supplier_address, s.city AS supplier_city,
                    s.province AS supplier_province, s.postal_code AS supplier_postal_code, s.tin AS supplier_tin,
                    s.fda_license_number AS supplier_license, s.license_expiry AS supplier_license_expiry,
                    s.is_active AS supplier_is_active,
                    (SELECT COUNT(*) FROM purchase_order_items i WHERE i.purchase_order_id = po.id) AS item_count
             FROM purchase_orders po
             JOIN suppliers s ON s.id = po.supplier_id
             LEFT JOIN warehouses w ON w.id = po.warehouse_id
             WHERE po.id = :id AND po.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $order = $this->formatHeader($row);

        $order['supplier'] = [
            'contact_person' => $row['supplier_contact'],
            'phone' => $row['supplier_phone'],
            'mobile' => $row['supplier_mobile'],
            'email' => $row['supplier_email'],
            'address' => implode(', ', array_filter([
                $row['supplier_address'], $row['supplier_city'], $row['supplier_province'], $row['supplier_postal_code']
            ])),
            'tin' => $row['supplier_tin'],
            'license_number' => $row['supplier_license'],
            'license_expiry' => $row['supplier_license_expiry'],
            'is_active' => (bool) $row['supplier_is_active']
        ];

        $order['items'] = $this->items($id);

        $business = (new BusinessSettingService())->get();
        $order['buyer'] = [
            'name' => $business['name'] ?? null,
            'address' => $business['address'] ?? null,
            'phone' => $business['phone'] ?? null,
            'email' => $business['email'] ?? null
        ];

        return $order;
    }

    private function items(int $orderId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT i.*, d.name AS drug_name, du.name AS unit_name, pu.name AS package_unit_name
             FROM purchase_order_items i
             JOIN drugs d ON d.id = i.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN amount_units pu ON pu.id = d.package_unit_id
             WHERE i.purchase_order_id = :id
             ORDER BY i.line_no, i.id"
        );
        $stmt->execute(['id' => $orderId]);

        return array_map(function (array $r) {
            $quantity = (float) $r['quantity'];
            $perPackage = $r['units_per_package'] !== null ? (float) $r['units_per_package'] : null;
            $unitPrice = (float) $r['unit_price'];

            return [
                'id' => (int) $r['id'],
                'line_no' => (int) $r['line_no'],
                'drug_id' => (int) $r['drug_id'],
                'drug_name' => $r['drug_name'],
                'supplier_product_id' => $r['supplier_product_id'] !== null ? (int) $r['supplier_product_id'] : null,
                'supplier_item_code' => $r['supplier_item_code'],
                'order_unit' => $r['order_unit'],
                'unit_name' => $r['unit_name'],
                'package_unit_name' => $r['package_unit_name'],
                'units_per_package' => $perPackage,
                'quantity' => $quantity,
                'base_quantity' => $r['order_unit'] === 'package' && $perPackage ? round($quantity * $perPackage, 3) : $quantity,
                'unit_price' => $unitPrice,
                'gross_amount' => round($quantity * $unitPrice, 2),
                'discount_amount' => (float) $r['discount_amount'],
                'line_total' => (float) $r['line_total'],
                'quantity_received' => (float) $r['quantity_received'],
                'notes' => $r['notes']
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Everything the order form needs: suppliers, delivery locations,
     * orderable items with stock levels, and every usable supplier price.
     */
    public function options(): array
    {
        $db = Database::connection();

        $suppliers = $db->query(
            "SELECT id, name, code, payment_terms, lead_time_days, fda_license_number, license_expiry
             FROM suppliers WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name"
        )->fetchAll(PDO::FETCH_ASSOC);

        $warehouses = $db->query(
            "SELECT id, name FROM warehouses WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name"
        )->fetchAll(PDO::FETCH_ASSOC);

        $drugs = $db->query(
            "SELECT d.id, d.name, d.product_type, d.package_quantity, d.min_level_global, d.max_level_global,
                    d.unit_cost, d.preferred_supplier_id, du.name AS unit_name, pu.name AS package_unit_name,
                    COALESCE(stock.on_hand, 0) AS on_hand
             FROM drugs d
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN amount_units pu ON pu.id = d.package_unit_id
             LEFT JOIN (
                 SELECT drug_id, SUM(quantity_on_hand) AS on_hand
                 FROM drug_inventory_lots
                 WHERE deleted_at IS NULL AND is_active = 1
                 GROUP BY drug_id
             ) stock ON stock.drug_id = d.id
             WHERE d.deleted_at IS NULL AND d.is_active = 1
             ORDER BY d.name"
        )->fetchAll(PDO::FETCH_ASSOC);

        $listings = array_values(array_filter(
            (new SupplierProductService())->list(),
            fn(array $l) => $l['drug_is_active']
        ));

        return [
            'suppliers' => array_map(fn(array $s) => [
                'id' => (int) $s['id'],
                'name' => $s['name'],
                'code' => $s['code'],
                'payment_terms' => $s['payment_terms'],
                'lead_time_days' => $s['lead_time_days'] !== null ? (int) $s['lead_time_days'] : null,
                'license_number' => $s['fda_license_number'],
                'license_expiry' => $s['license_expiry']
            ], $suppliers),
            'warehouses' => array_map(fn(array $w) => ['id' => (int) $w['id'], 'name' => $w['name']], $warehouses),
            'drugs' => array_map(fn(array $d) => [
                'id' => (int) $d['id'],
                'name' => $d['name'],
                'product_type' => $d['product_type'],
                'unit_name' => $d['unit_name'],
                'package_unit_name' => $d['package_unit_name'],
                'package_quantity' => $d['package_quantity'] !== null && (float) $d['package_quantity'] > 0 ? (float) $d['package_quantity'] : null,
                'min_level' => (float) $d['min_level_global'],
                'max_level' => (float) $d['max_level_global'],
                'on_hand' => (float) $d['on_hand'],
                'unit_cost' => $d['unit_cost'] !== null ? (float) $d['unit_cost'] : null,
                'preferred_supplier_id' => $d['preferred_supplier_id'] !== null ? (int) $d['preferred_supplier_id'] : null
            ], $drugs),
            'listings' => $listings
        ];
    }

    public function create(array $data, int $userId): array
    {
        $submit = !empty($data['submit']);
        [$header, $lines, $errors] = $this->normalize($data, $submit);

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $now = date('Y-m-d H:i:s');
        $db = Database::connection();
        // Join a caller's transaction instead of starting a nested one.
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            $header['status'] = $submit ? 'submitted' : 'draft';
            $header['created_at'] = $now;
            $header['created_by'] = $userId;

            if ($submit) {
                $header['submitted_at'] = $now;
                $header['submitted_by'] = $userId;
            }

            $id = (new PurchaseOrder())->create($header);

            if (!$id) {
                throw new \RuntimeException('purchase order insert failed');
            }

            $poNumber = 'PO-' . date('Y') . '-' . str_pad((string) $id, 5, '0', STR_PAD_LEFT);
            (new PurchaseOrder())->update(['po_number' => $poNumber], $id);

            $this->saveLines($id, $lines, $userId);

            if ($ownsTransaction) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($ownsTransaction) {
                $db->rollBack();
            }
            error_log('purchase order create failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to save the purchase order.'];
        }

        return [
            'success' => true,
            'message' => $submit ? "Purchase order {$poNumber} submitted." : "Purchase order {$poNumber} saved as a draft.",
            'data' => ['id' => $id, 'po_number' => $poNumber, 'status' => $header['status']]
        ];
    }

    public function update(int $id, array $data, int $userId): array
    {
        $existing = $this->findOrder($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Purchase order not found.', 'not_found' => true];
        }

        if ($existing['status'] !== 'draft') {
            return ['success' => false, 'message' => 'Only draft purchase orders can be edited.'];
        }

        $submit = !empty($data['submit']);
        [$header, $lines, $errors] = $this->normalize($data, $submit);

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $now = date('Y-m-d H:i:s');
        $db = Database::connection();
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            $header['updated_at'] = $now;
            $header['updated_by'] = $userId;

            if ($submit) {
                $header['status'] = 'submitted';
                $header['submitted_at'] = $now;
                $header['submitted_by'] = $userId;
            }

            (new PurchaseOrder())->update($header, $id);

            $db->prepare("DELETE FROM purchase_order_items WHERE purchase_order_id = :id")->execute(['id' => $id]);
            $this->saveLines($id, $lines, $userId);

            if ($ownsTransaction) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($ownsTransaction) {
                $db->rollBack();
            }
            error_log('purchase order update failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to save the purchase order.'];
        }

        return [
            'success' => true,
            'message' => $submit ? "Purchase order {$existing['po_number']} submitted." : "Purchase order {$existing['po_number']} saved.",
            'data' => ['id' => $id, 'po_number' => $existing['po_number'], 'status' => $submit ? 'submitted' : 'draft']
        ];
    }

    public function cancel(int $id, string $reason, int $userId): array
    {
        $existing = $this->findOrder($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Purchase order not found.', 'not_found' => true];
        }

        if ($existing['status'] === 'cancelled') {
            return ['success' => false, 'message' => 'This purchase order is already cancelled.'];
        }

        $reason = mb_substr(trim($reason), 0, 255);

        if ($existing['status'] === 'submitted' && $reason === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => [
                'cancel_reason' => 'Say why the order is being cancelled -- it has already been sent to the supplier.'
            ]];
        }

        $now = date('Y-m-d H:i:s');

        (new PurchaseOrder())->update([
            'status' => 'cancelled',
            'cancelled_at' => $now,
            'cancelled_by' => $userId,
            'cancel_reason' => $reason !== '' ? $reason : null,
            'updated_at' => $now,
            'updated_by' => $userId
        ], $id);

        return ['success' => true, 'message' => "Purchase order {$existing['po_number']} cancelled."];
    }

    /** Drafts only -- a submitted order is cancelled instead, so its record stays. */
    public function remove(int $id, int $userId): array
    {
        $existing = $this->findOrder($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Purchase order not found.', 'not_found' => true];
        }

        if ($existing['status'] !== 'draft') {
            return ['success' => false, 'message' => 'Only drafts can be deleted. Cancel a submitted order instead.'];
        }

        (new PurchaseOrder())->update(['deleted_at' => date('Y-m-d H:i:s'), 'deleted_by' => $userId], $id);

        return ['success' => true, 'message' => "Draft {$existing['po_number']} deleted."];
    }

    private function findOrder(int $id): ?array
    {
        $order = $id ? (new PurchaseOrder())->where('id', $id)->first() : null;

        return $order && $order['deleted_at'] === null ? $order : null;
    }

    private function saveLines(int $orderId, array $lines, int $userId): void
    {
        $now = date('Y-m-d H:i:s');

        foreach ($lines as $i => $line) {
            $line['purchase_order_id'] = $orderId;
            $line['line_no'] = $i + 1;
            $line['created_at'] = $now;
            $line['created_by'] = $userId;

            if (!(new PurchaseOrderItem())->create($line)) {
                throw new \RuntimeException('purchase order line insert failed');
            }
        }
    }

    /**
     * Validates the header and lines. Drafts may be incomplete (no lines,
     * no delivery location yet); submitting needs both.
     *
     * @return array{0: array, 1: array, 2: array} [header, lines, errors]
     */
    private function normalize(array $data, bool $submit): array
    {
        $db = Database::connection();
        $errors = [];
        $header = [];

        // Supplier
        $header['supplier_id'] = (int) ($data['supplier_id'] ?? 0);

        if (!$header['supplier_id']) {
            $errors['supplier_id'] = 'Choose a supplier.';
        } else {
            $stmt = $db->prepare("SELECT is_active FROM suppliers WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute(['id' => $header['supplier_id']]);
            $active = $stmt->fetchColumn();

            if ($active === false) {
                $errors['supplier_id'] = 'Supplier not found.';
            } elseif (!(int) $active) {
                $errors['supplier_id'] = 'This supplier is inactive. Re-activate it under Pharmacy > Suppliers first.';
            }
        }

        // Dates
        $header['order_date'] = trim((string) ($data['order_date'] ?? '')) ?: date('Y-m-d');

        if (!$this->isValidDate($header['order_date'])) {
            $errors['order_date'] = 'Enter a valid order date.';
        }

        $expected = trim((string) ($data['expected_date'] ?? ''));
        $header['expected_date'] = $expected === '' ? null : $expected;

        if ($header['expected_date'] !== null) {
            if (!$this->isValidDate($header['expected_date'])) {
                $errors['expected_date'] = 'Enter a valid date.';
            } elseif (!isset($errors['order_date']) && $header['expected_date'] < $header['order_date']) {
                $errors['expected_date'] = 'Delivery can\'t be expected before the order date.';
            }
        }

        // Deliver to
        $header['warehouse_id'] = !empty($data['warehouse_id']) ? (int) $data['warehouse_id'] : null;

        if ($header['warehouse_id'] !== null) {
            $stmt = $db->prepare("SELECT id FROM warehouses WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute(['id' => $header['warehouse_id']]);

            if (!$stmt->fetchColumn()) {
                $errors['warehouse_id'] = 'Delivery location not found.';
            }
        } elseif ($submit) {
            $errors['warehouse_id'] = 'Choose where the supplier should deliver.';
        }

        foreach (['payment_terms' => 50, 'supplier_reference' => 100, 'notes' => 2000] as $field => $max) {
            $value = trim((string) ($data[$field] ?? ''));
            $header[$field] = $value === '' ? null : mb_substr($value, 0, $max);
        }

        $shipping = $data['shipping_fee'] ?? '';
        $header['shipping_fee'] = is_numeric($shipping) ? round((float) $shipping, 2) : 0.0;

        if (($shipping !== '' && $shipping !== null && !is_numeric($shipping)) || $header['shipping_fee'] < 0) {
            $errors['shipping_fee'] = 'Enter zero or more.';
            $header['shipping_fee'] = 0.0;
        }

        // Lines
        $items = is_array($data['items'] ?? null) ? array_values($data['items']) : [];
        $lines = [];
        $seen = [];
        $subtotal = 0.0;
        $discountTotal = 0.0;

        $drugStmt = $db->prepare(
            "SELECT id, name, is_active, package_quantity FROM drugs WHERE id = :id AND deleted_at IS NULL"
        );
        $listingStmt = $db->prepare(
            "SELECT id, supplier_item_code FROM supplier_products
             WHERE supplier_id = :supplier AND drug_id = :drug AND deleted_at IS NULL
             ORDER BY id LIMIT 1"
        );

        foreach ($items as $i => $item) {
            $key = "items.{$i}";
            $item = is_array($item) ? $item : [];
            $drugId = (int) ($item['drug_id'] ?? 0);
            $drug = null;

            if (!$drugId) {
                $errors["{$key}.drug_id"] = 'Choose an item.';
            } else {
                $drugStmt->execute(['id' => $drugId]);
                $drug = $drugStmt->fetch(PDO::FETCH_ASSOC) ?: null;

                if (!$drug) {
                    $errors["{$key}.drug_id"] = 'Item not found.';
                } elseif (!(int) $drug['is_active']) {
                    $errors["{$key}.drug_id"] = $drug['name'] . ' is inactive in the drug catalog.';
                } elseif (isset($seen[$drugId])) {
                    $errors["{$key}.drug_id"] = 'This item is already on line ' . ($seen[$drugId] + 1) . '. Change that line\'s quantity instead.';
                } else {
                    $seen[$drugId] = $i;
                }
            }

            $orderUnit = $item['order_unit'] ?? 'unit';
            $perPackage = $drug && (float) $drug['package_quantity'] > 0 ? (float) $drug['package_quantity'] : null;

            if (!in_array($orderUnit, self::ORDER_UNITS, true)) {
                $errors["{$key}.order_unit"] = 'Choose units or packages.';
                $orderUnit = 'unit';
            } elseif ($orderUnit === 'package' && $drug && $perPackage === null) {
                $errors["{$key}.order_unit"] = 'This item has no package size. Order it in units.';
            }

            $rawQty = $item['quantity'] ?? '';
            $quantity = is_numeric($rawQty) ? round((float) $rawQty, 3) : 0.0;

            if ($quantity <= 0) {
                $errors["{$key}.quantity"] = 'Enter a quantity.';
            }

            $rawPrice = $item['unit_price'] ?? '';
            $unitPrice = is_numeric($rawPrice) ? round((float) $rawPrice, 4) : -1.0;

            if ($unitPrice < 0) {
                $errors["{$key}.unit_price"] = 'Enter the price.';
            }

            $rawDiscount = $item['discount_amount'] ?? '';
            $discount = ($rawDiscount === '' || $rawDiscount === null) ? 0.0 : (is_numeric($rawDiscount) ? round((float) $rawDiscount, 2) : -1.0);
            $gross = round(max(0, $quantity) * max(0, $unitPrice), 2);

            if ($discount < 0) {
                $errors["{$key}.discount_amount"] = 'Discount cannot be negative.';
            } elseif ($discount > $gross) {
                $errors["{$key}.discount_amount"] = 'Discount is more than the line amount.';
            }

            // Link the line to this supplier's price listing, if there is one.
            $listing = null;

            if ($drug && !empty($header['supplier_id'])) {
                $listingStmt->execute(['supplier' => $header['supplier_id'], 'drug' => $drugId]);
                $listing = $listingStmt->fetch(PDO::FETCH_ASSOC) ?: null;
            }

            $itemCode = trim((string) ($item['supplier_item_code'] ?? ''));
            $notes = trim((string) ($item['notes'] ?? ''));

            $lines[] = [
                'drug_id' => $drugId,
                'supplier_product_id' => $listing ? (int) $listing['id'] : null,
                'supplier_item_code' => $itemCode !== '' ? mb_substr($itemCode, 0, 100) : ($listing['supplier_item_code'] ?? null),
                'order_unit' => $orderUnit,
                'units_per_package' => $perPackage,
                'quantity' => $quantity,
                'unit_price' => max(0, $unitPrice),
                'discount_amount' => max(0, $discount),
                'line_total' => round($gross - max(0, min($discount, $gross)), 2),
                'notes' => $notes !== '' ? mb_substr($notes, 0, 255) : null
            ];

            $subtotal += $gross;
            $discountTotal += max(0, min($discount, $gross));
        }

        if ($submit && !$items) {
            $errors['items'] = 'Add at least one item before submitting the order.';
        }

        $header['subtotal'] = round($subtotal, 2);
        $header['discount_total'] = round($discountTotal, 2);
        $header['total'] = round($subtotal - $discountTotal + $header['shipping_fee'], 2);

        return [$header, $lines, $errors];
    }

    private function formatHeader(array $r): array
    {
        return [
            'id' => (int) $r['id'],
            'po_number' => $r['po_number'],
            'supplier_id' => (int) $r['supplier_id'],
            'supplier_name' => $r['supplier_name'],
            'supplier_code' => $r['supplier_code'],
            'status' => $r['status'],
            'order_date' => $r['order_date'],
            'expected_date' => $r['expected_date'],
            'warehouse_id' => $r['warehouse_id'] !== null ? (int) $r['warehouse_id'] : null,
            'warehouse_name' => $r['warehouse_name'],
            'payment_terms' => $r['payment_terms'],
            'supplier_reference' => $r['supplier_reference'],
            'notes' => $r['notes'],
            'subtotal' => (float) $r['subtotal'],
            'discount_total' => (float) $r['discount_total'],
            'shipping_fee' => (float) $r['shipping_fee'],
            'total' => (float) $r['total'],
            'item_count' => (int) $r['item_count'],
            'is_overdue' => $r['status'] === 'submitted' && $r['expected_date'] !== null && $r['expected_date'] < date('Y-m-d'),
            'submitted_at' => $r['submitted_at'],
            'cancelled_at' => $r['cancelled_at'],
            'cancel_reason' => $r['cancel_reason'],
            'created_at' => $r['created_at']
        ];
    }

    private function isValidDate(string $value): bool
    {
        $date = \DateTime::createFromFormat('Y-m-d', $value);

        return $date !== false && $date->format('Y-m-d') === $value;
    }
}
