<?php

namespace App\Modules\Suppliers\Services;

use App\Core\Database;
use App\Modules\Suppliers\Models\SupplierProduct;
use PDO;

/**
 * "Where to buy" price list: one row per supplier + catalog item + price
 * basis, with an optional discount. Every listing comes back with the
 * price actually payable today and a per-dispensing-unit price so
 * listings quoted per box and per tablet can be compared, plus a
 * best-price flag per item.
 */
class SupplierProductService
{
    public const PRICE_BASES = ['unit', 'package'];

    public const DISCOUNT_TYPES = ['none', 'percent', 'amount'];

    public const INPUT_FIELDS = [
        'supplier_id', 'drug_id', 'supplier_item_code', 'price_basis', 'price', 'min_order_qty', 'price_as_of',
        'discount_type', 'discount_value', 'discount_label', 'discount_starts', 'discount_ends', 'discount_min_qty',
        'notes', 'is_active'
    ];

    public function list(array $filters = []): array
    {
        $where = ['sp.deleted_at IS NULL', 's.deleted_at IS NULL', 'd.deleted_at IS NULL'];
        $params = [];

        if (empty($filters['show_inactive'])) {
            $where[] = 'sp.is_active = 1';
            $where[] = 's.is_active = 1';
        }

        foreach (['id' => 'sp.id', 'drug_id' => 'sp.drug_id', 'supplier_id' => 'sp.supplier_id'] as $key => $column) {
            if (!empty($filters[$key])) {
                $where[] = "{$column} = :{$key}";
                $params[$key] = (int) $filters[$key];
            }
        }

        $rows = $this->fetch($where, $params);

        // Best price is judged across every usable listing for the item,
        // not just the filtered rows -- otherwise a one-supplier view
        // would mark all of its own prices as "best".
        $best = $this->bestPrices(array_unique(array_column($rows, 'drug_id')));

        foreach ($rows as &$row) {
            $top = $best[$row['drug_id']] ?? null;

            $row['is_best_price'] = $top !== null
                && $row['is_active'] && $row['supplier_is_active']
                && $row['effective_unit_price'] !== null
                && abs($row['effective_unit_price'] - $top['unit_price']) < 0.00001;
            $row['best_unit_price'] = $top['unit_price'] ?? null;
            $row['best_supplier_name'] = $top['supplier_name'] ?? null;
        }

        return $rows;
    }

    private function fetch(array $where, array $params): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT sp.*,
                    s.name AS supplier_name, s.code AS supplier_code, s.is_active AS supplier_is_active,
                    s.lead_time_days, s.payment_terms,
                    d.name AS drug_name, d.is_active AS drug_is_active, d.package_quantity, d.preferred_supplier_id,
                    du.name AS unit_name, pu.name AS package_unit_name, dc.name AS category_name
             FROM supplier_products sp
             JOIN suppliers s ON s.id = sp.supplier_id
             JOIN drugs d ON d.id = sp.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN amount_units pu ON pu.id = d.package_unit_id
             LEFT JOIN drug_categories dc ON dc.id = d.category_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY d.name ASC, s.name ASC
             LIMIT 5000"
        );
        $stmt->execute($params);

        return array_map(fn(array $r) => $this->format($r), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Cheapest effective per-unit price for each item among active
     * listings from active suppliers: [drug_id => [unit_price, supplier_name]].
     */
    private function bestPrices(array $drugIds): array
    {
        if (!$drugIds) {
            return [];
        }

        $placeholders = [];
        $params = [];

        foreach (array_values($drugIds) as $i => $id) {
            $placeholders[] = ":d{$i}";
            $params["d{$i}"] = (int) $id;
        }

        $usable = $this->fetch([
            'sp.deleted_at IS NULL', 's.deleted_at IS NULL', 'd.deleted_at IS NULL',
            'sp.is_active = 1', 's.is_active = 1',
            'sp.drug_id IN (' . implode(', ', $placeholders) . ')'
        ], $params);

        $best = [];

        foreach ($usable as $row) {
            if ($row['effective_unit_price'] === null) {
                continue;
            }

            $current = $best[$row['drug_id']] ?? null;

            if ($current === null || $row['effective_unit_price'] < $current['unit_price']) {
                $best[$row['drug_id']] = ['unit_price' => $row['effective_unit_price'], 'supplier_name' => $row['supplier_name']];
            }
        }

        return $best;
    }

    public function get(int $id): ?array
    {
        $rows = $this->list(['id' => $id, 'show_inactive' => true]);

        return $rows[0] ?? null;
    }

    /** Dropdown data for the listing form. */
    public function options(): array
    {
        $db = Database::connection();

        $drugs = $db->query(
            "SELECT d.id, d.name, d.package_quantity, du.name AS unit_name, pu.name AS package_unit_name, d.is_active
             FROM drugs d
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN amount_units pu ON pu.id = d.package_unit_id
             WHERE d.deleted_at IS NULL
             ORDER BY d.name"
        )->fetchAll(PDO::FETCH_ASSOC);

        return [
            'drugs' => array_map(fn(array $r) => [
                'id' => (int) $r['id'],
                'name' => $r['name'],
                'unit_name' => $r['unit_name'],
                'package_unit_name' => $r['package_unit_name'],
                'package_quantity' => $r['package_quantity'] !== null ? (float) $r['package_quantity'] : null,
                'is_active' => (bool) $r['is_active']
            ], $drugs),
            'suppliers' => (new SupplierService())->listActiveForSelect()
        ];
    }

    public function create(array $data, int $userId): array
    {
        [$values, $errors] = $this->normalize($data);

        if (!$errors) {
            $errors = $this->findConflicts($values);
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $values['created_at'] = date('Y-m-d H:i:s');
        $values['created_by'] = $userId;

        $id = (new SupplierProduct())->create($values);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to save the price.'];
        }

        return ['success' => true, 'message' => 'Supplier price added.', 'data' => ['id' => $id]];
    }

    public function update(int $id, array $data, int $userId): array
    {
        $existing = (new SupplierProduct())->where('id', $id)->first();

        if (!$existing || $existing['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Price listing not found.'];
        }

        [$values, $errors] = $this->normalize($data);

        if (!$errors) {
            $errors = $this->findConflicts($values, $id);
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $values['updated_at'] = date('Y-m-d H:i:s');
        $values['updated_by'] = $userId;

        (new SupplierProduct())->update($values, $id);

        return ['success' => true, 'message' => 'Supplier price updated.'];
    }

    public function remove(int $id, int $userId): array
    {
        $existing = (new SupplierProduct())->where('id', $id)->first();

        if (!$existing || $existing['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Price listing not found.'];
        }

        (new SupplierProduct())->update(['deleted_at' => date('Y-m-d H:i:s'), 'deleted_by' => $userId], $id);

        return ['success' => true, 'message' => 'Supplier price removed.'];
    }

    private function normalize(array $data): array
    {
        $db = Database::connection();
        $values = [];
        $errors = [];

        $values['supplier_id'] = (int) ($data['supplier_id'] ?? 0);
        $values['drug_id'] = (int) ($data['drug_id'] ?? 0);

        $drug = null;

        if (!$values['supplier_id']) {
            $errors['supplier_id'] = 'Choose a supplier.';
        } else {
            $stmt = $db->prepare("SELECT id FROM suppliers WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute(['id' => $values['supplier_id']]);

            if (!$stmt->fetchColumn()) {
                $errors['supplier_id'] = 'Supplier not found.';
            }
        }

        if (!$values['drug_id']) {
            $errors['drug_id'] = 'Choose a medicine or item.';
        } else {
            $stmt = $db->prepare("SELECT id, package_quantity FROM drugs WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute(['id' => $values['drug_id']]);
            $drug = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;

            if (!$drug) {
                $errors['drug_id'] = 'Item not found.';
            }
        }

        $values['price_basis'] = in_array($data['price_basis'] ?? 'unit', self::PRICE_BASES, true) ? ($data['price_basis'] ?? 'unit') : null;

        if ($values['price_basis'] === null) {
            $errors['price_basis'] = 'Choose per unit or per package.';
        } elseif ($values['price_basis'] === 'package' && $drug && !((float) $drug['package_quantity'] > 0)) {
            $errors['price_basis'] = 'This item has no package size. Set one in the drug catalog, or price it per unit.';
        }

        $rawPrice = $data['price'] ?? '';

        if ($rawPrice === '' || $rawPrice === null || !is_numeric($rawPrice)) {
            $errors['price'] = 'Enter the price.';
        } elseif ((float) $rawPrice < 0) {
            $errors['price'] = 'Price cannot be negative.';
        }

        $values['price'] = round((float) $rawPrice, 2);

        foreach (['min_order_qty', 'discount_min_qty'] as $field) {
            $raw = $data[$field] ?? '';
            $values[$field] = ($raw === '' || $raw === null) ? null : round((float) $raw, 3);

            if ($values[$field] !== null && $values[$field] < 0) {
                $errors[$field] = 'Cannot be negative.';
            }
        }

        foreach (['supplier_item_code' => 100, 'discount_label' => 100, 'notes' => 255] as $field => $max) {
            $value = trim((string) ($data[$field] ?? ''));
            $values[$field] = $value === '' ? null : mb_substr($value, 0, $max);
        }

        foreach (['price_as_of', 'discount_starts', 'discount_ends'] as $field) {
            $value = trim((string) ($data[$field] ?? ''));
            $values[$field] = $value === '' ? null : SupplierService::normalizeDate($value);

            if ($values[$field] !== null && !$this->isValidDate($values[$field])) {
                $errors[$field] = 'Enter a valid date.';
            }
        }

        $values['price_as_of'] = $values['price_as_of'] ?? date('Y-m-d');
        $values['is_active'] = array_key_exists('is_active', $data) ? (!empty($data['is_active']) ? 1 : 0) : 1;

        // Discount
        $values['discount_type'] = $data['discount_type'] ?? 'none';

        if (!in_array($values['discount_type'], self::DISCOUNT_TYPES, true)) {
            $errors['discount_type'] = 'Choose a valid discount type.';
            $values['discount_type'] = 'none';
        }

        if ($values['discount_type'] === 'none') {
            foreach (['discount_value', 'discount_label', 'discount_starts', 'discount_ends', 'discount_min_qty'] as $field) {
                $values[$field] = null;
            }
        } else {
            $raw = $data['discount_value'] ?? '';
            $values['discount_value'] = ($raw === '' || $raw === null) ? null : round((float) $raw, 2);

            if ($values['discount_value'] === null || $values['discount_value'] <= 0) {
                $errors['discount_value'] = 'Enter the discount.';
            } elseif ($values['discount_type'] === 'percent' && $values['discount_value'] >= 100) {
                $errors['discount_value'] = 'A percent discount must be below 100%.';
            } elseif ($values['discount_type'] === 'amount' && !isset($errors['price']) && $values['discount_value'] >= $values['price']) {
                $errors['discount_value'] = 'The discount must be less than the price.';
            }

            if ($values['discount_starts'] && $values['discount_ends'] && $values['discount_ends'] < $values['discount_starts']) {
                $errors['discount_ends'] = 'End date is before the start date.';
            }
        }

        return [$values, $errors];
    }

    private function findConflicts(array $values, ?int $ignoreId = null): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id FROM supplier_products
             WHERE deleted_at IS NULL AND id <> :ignore
               AND supplier_id = :supplier AND drug_id = :drug AND price_basis = :basis
             LIMIT 1"
        );
        $stmt->execute([
            'ignore' => (int) $ignoreId,
            'supplier' => $values['supplier_id'],
            'drug' => $values['drug_id'],
            'basis' => $values['price_basis']
        ]);

        if ($stmt->fetchColumn() !== false) {
            $basis = $values['price_basis'] === 'package' ? 'per package' : 'per unit';
            return ['drug_id' => "This supplier already has a {$basis} price for this item. Edit that one instead."];
        }

        return [];
    }

    private function format(array $r): array
    {
        $price = (float) $r['price'];
        $packageQty = $r['package_quantity'] !== null ? (float) $r['package_quantity'] : null;
        $type = $r['discount_type'];
        $value = $r['discount_value'] !== null ? (float) $r['discount_value'] : null;
        $today = date('Y-m-d');

        $discountStatus = null;

        if ($type !== 'none' && $value !== null) {
            if ($r['discount_starts'] && $r['discount_starts'] > $today) {
                $discountStatus = 'scheduled';
            } elseif ($r['discount_ends'] && $r['discount_ends'] < $today) {
                $discountStatus = 'expired';
            } else {
                $discountStatus = 'active';
            }
        }

        $discountedPrice = $price;

        if ($discountStatus === 'active') {
            $discountedPrice = $type === 'percent'
                ? round($price * (1 - $value / 100), 2)
                : max(0, round($price - $value, 2));
        }

        $toUnit = function (float $amount) use ($r, $packageQty) {
            if ($r['price_basis'] === 'unit') {
                return $amount;
            }

            return $packageQty > 0 ? round($amount / $packageQty, 4) : null;
        };

        return [
            'id' => (int) $r['id'],
            'supplier_id' => (int) $r['supplier_id'],
            'supplier_name' => $r['supplier_name'],
            'supplier_code' => $r['supplier_code'],
            'supplier_is_active' => (bool) $r['supplier_is_active'],
            'lead_time_days' => $r['lead_time_days'] !== null ? (int) $r['lead_time_days'] : null,
            'payment_terms' => $r['payment_terms'],
            'drug_id' => (int) $r['drug_id'],
            'drug_name' => $r['drug_name'],
            'drug_is_active' => (bool) $r['drug_is_active'],
            'category_name' => $r['category_name'],
            'unit_name' => $r['unit_name'],
            'package_unit_name' => $r['package_unit_name'],
            'package_quantity' => $packageQty,
            'is_preferred_supplier' => (int) $r['preferred_supplier_id'] === (int) $r['supplier_id'],
            'supplier_item_code' => $r['supplier_item_code'],
            'price_basis' => $r['price_basis'],
            'price' => $price,
            'min_order_qty' => $r['min_order_qty'] !== null ? (float) $r['min_order_qty'] : null,
            'price_as_of' => $r['price_as_of'],
            'discount_type' => $type,
            'discount_value' => $value,
            'discount_label' => $r['discount_label'],
            'discount_starts' => $r['discount_starts'],
            'discount_ends' => $r['discount_ends'],
            'discount_min_qty' => $r['discount_min_qty'] !== null ? (float) $r['discount_min_qty'] : null,
            'discount_status' => $discountStatus,
            'discounted_price' => $discountedPrice,
            'unit_price' => $toUnit($price),
            'effective_unit_price' => $toUnit($discountedPrice),
            'notes' => $r['notes'],
            'is_active' => (bool) $r['is_active']
        ];
    }

    private function isValidDate(string $value): bool
    {
        $date = \DateTime::createFromFormat('Y-m-d', $value);

        return $date !== false && $date->format('Y-m-d') === $value;
    }
}
