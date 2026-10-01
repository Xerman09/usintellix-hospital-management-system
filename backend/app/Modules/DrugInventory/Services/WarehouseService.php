<?php

namespace App\Modules\DrugInventory\Services;

use App\Core\Database;
use App\Modules\DrugInventory\Models\Warehouse;
use PDO;
use PDOException;
use Throwable;

/**
 * Storage locations (Pharmacy > Storage Locations). The table and code
 * keep the original "warehouses" name; only labels changed.
 *
 * Each location records what kind of store it is, where it physically
 * is, the department that owns it, and its custodian -- the person
 * accountable for receiving and disposing of its stock -- plus an
 * alternate for when they're away. Per item, a location can also have
 * a minimum (reorder point) and maximum quantity; the Stock Check
 * compares them with what is on hand there.
 *
 * Separate from DrugInventoryService::listWarehouses(), which only
 * returns active locations for filter/picker dropdowns -- this one
 * returns everything (including inactive) since the management screen
 * needs to show and re-activate them.
 */
class WarehouseService
{
    public const LOCATION_TYPES = [
        'Main Pharmacy',
        'Satellite Pharmacy',
        'Central Supply Room (CSR)',
        'Stockroom',
        'Ward / Nurse Station Stock',
        'Emergency Room Stock',
        'Operating Room Stock',
        'Cold Storage',
        'Controlled Drugs Cabinet',
        'Off-site Storage',
        'Other'
    ];

    public const INPUT_FIELDS = [
        'name', 'code', 'location_type', 'physical_location', 'facility_id', 'department_id',
        'custodian_user_id', 'alternate_custodian_user_id', 'notes', 'is_active'
    ];

    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT w.*, f.name AS facility_name, dp.name AS department_name,
                    " . self::userNameSql('w.custodian_user_id') . " AS custodian_name,
                    " . self::userNameSql('w.alternate_custodian_user_id') . " AS alternate_custodian_name,
                    (SELECT COUNT(*) FROM drug_inventory_lots dil WHERE dil.warehouse_id = w.id AND dil.deleted_at IS NULL) AS lot_count,
                    (SELECT COUNT(*) FROM warehouse_stock_levels l WHERE l.warehouse_id = w.id) AS levels_count,
                    (SELECT COUNT(*) FROM warehouse_stock_levels l
                     JOIN drugs d ON d.id = l.drug_id AND d.deleted_at IS NULL AND d.is_active = 1
                     WHERE l.warehouse_id = w.id
                       AND COALESCE((SELECT SUM(x.quantity_on_hand) FROM drug_inventory_lots x
                                     WHERE x.warehouse_id = w.id AND x.drug_id = l.drug_id
                                       AND x.deleted_at IS NULL AND x.is_active = 1), 0) < l.min_level) AS below_min_count
             FROM warehouses w
             LEFT JOIN facilities f ON f.id = w.facility_id AND f.deleted_at IS NULL
             LEFT JOIN departments dp ON dp.id = w.department_id
             WHERE w.deleted_at IS NULL
             ORDER BY w.name"
        );
        $stmt->execute();

        return array_map(fn(array $r) => $this->format($r), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function get(int $id): ?array
    {
        foreach ($this->list() as $location) {
            if ($location['id'] === $id) {
                return $location;
            }
        }

        return null;
    }

    /** Choices for the form: location types, departments and staff. */
    public function options(): array
    {
        $db = Database::connection();

        $departments = $db->query(
            "SELECT id, name, has_medication_inventory FROM departments
             WHERE deleted_at IS NULL AND (status IS NULL OR status <> 'inactive')
             ORDER BY has_medication_inventory DESC, name"
        )->fetchAll(PDO::FETCH_ASSOC);

        // Staff accounts only (patients have no role).
        $staff = $db->query(
            "SELECT u.id, r.name AS role, dp.name AS department_name,
                    COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username) AS name
             FROM users u
             JOIN roles r ON r.id = u.role_id
             LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
             LEFT JOIN departments dp ON dp.id = e.department_id
             WHERE u.deleted_at IS NULL
             ORDER BY name"
        )->fetchAll(PDO::FETCH_ASSOC);

        return [
            'location_types' => self::LOCATION_TYPES,
            'departments' => array_map(fn(array $d) => [
                'id' => (int) $d['id'],
                'name' => $d['name'],
                'has_medication_inventory' => (bool) $d['has_medication_inventory']
            ], $departments),
            'staff' => array_map(fn(array $s) => [
                'id' => (int) $s['id'],
                'name' => $s['name'],
                'role' => $s['role'],
                'department_name' => $s['department_name']
            ], $staff)
        ];
    }

    public function register(array $data, int $userId): array
    {
        [$values, $errors] = $this->normalize($data);

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        try {
            $id = (new Warehouse())->create($values + [
                'is_active' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $userId
            ]);

            if (!$id) {
                throw new \RuntimeException('Failed to create the storage location.');
            }

            return ['success' => true, 'message' => 'Storage location added successfully.', 'data' => ['id' => $id]];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['name' => 'A storage location with this name already exists.']];
            }

            return ['success' => false, 'message' => 'Failed to create the storage location.'];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to create the storage location.'];
        }
    }

    public function update(int $id, array $data, int $userId): array
    {
        $warehouse = (new Warehouse())->where('id', $id)->first();

        if (!$warehouse || $warehouse['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Storage location not found.'];
        }

        [$values, $errors] = $this->normalize($data, $id);

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        try {
            (new Warehouse())->update($values + [
                'is_active' => !empty($data['is_active']) ? 1 : 0,
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => $userId
            ], $id);

            return ['success' => true, 'message' => 'Storage location updated successfully.'];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['name' => 'A storage location with this name already exists.']];
            }

            return ['success' => false, 'message' => 'Failed to update the storage location.'];
        }
    }

    public function remove(int $id, int $userId): array
    {
        $warehouse = (new Warehouse())->where('id', $id)->first();

        if (!$warehouse || $warehouse['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Storage location not found.'];
        }

        (new Warehouse())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Storage location deleted successfully.'];
    }

    /**
     * Stock Check for one location: every item that has a minimum set
     * here or has stock here, with on-hand vs. minimum / maximum.
     * Quantities are in dispensing units.
     */
    public function stockCheck(int $id): ?array
    {
        $location = $this->get($id);

        if (!$location) {
            return null;
        }

        $stmt = Database::connection()->prepare(
            "SELECT d.id AS drug_id, d.name AS drug_name, d.product_type, d.is_active AS drug_is_active,
                    d.min_level_global, du.name AS unit_name,
                    l.id AS level_id, l.min_level, l.max_level, l.updated_at AS level_updated_at,
                    COALESCE(stock.on_hand, 0) AS on_hand, stock.lot_count, stock.next_expiry
             FROM drugs d
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN warehouse_stock_levels l ON l.drug_id = d.id AND l.warehouse_id = :w1
             LEFT JOIN (
                 SELECT drug_id, SUM(quantity_on_hand) AS on_hand,
                        SUM(CASE WHEN quantity_on_hand > 0 THEN 1 ELSE 0 END) AS lot_count,
                        MIN(CASE WHEN quantity_on_hand > 0 THEN expires_date END) AS next_expiry
                 FROM drug_inventory_lots
                 WHERE warehouse_id = :w2 AND deleted_at IS NULL AND is_active = 1
                 GROUP BY drug_id
             ) stock ON stock.drug_id = d.id
             WHERE d.deleted_at IS NULL AND (l.id IS NOT NULL OR COALESCE(stock.on_hand, 0) > 0)
             ORDER BY d.name"
        );
        $stmt->execute(['w1' => $id, 'w2' => $id]);

        $items = array_map(function (array $r) {
            $onHand = (float) $r['on_hand'];
            $min = $r['level_id'] !== null ? (float) $r['min_level'] : null;
            $max = $r['max_level'] !== null ? (float) $r['max_level'] : null;

            if ($min === null) {
                $status = 'no_level';
            } elseif ($onHand <= 0) {
                $status = 'out';
            } elseif ($onHand < $min) {
                $status = 'low';
            } elseif ($max !== null && $onHand > $max) {
                $status = 'over';
            } else {
                $status = 'ok';
            }

            return [
                'drug_id' => (int) $r['drug_id'],
                'drug_name' => $r['drug_name'],
                'product_type' => $r['product_type'],
                'drug_is_active' => (bool) $r['drug_is_active'],
                'unit_name' => $r['unit_name'],
                'on_hand' => $onHand,
                'lot_count' => (int) $r['lot_count'],
                'next_expiry' => $r['next_expiry'] ? substr($r['next_expiry'], 0, 10) : null,
                'min_level' => $min,
                'max_level' => $max,
                // How much to bring it back up to the max (or the min, if no max).
                'suggested_qty' => $min !== null && $onHand < $min ? max(0, ($max ?? $min) - $onHand) : 0.0,
                'catalog_reorder_level' => (float) $r['min_level_global'],
                'status' => $status
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));

        $drugs = Database::connection()->query(
            "SELECT d.id, d.name, du.name AS unit_name, d.min_level_global
             FROM drugs d LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             WHERE d.deleted_at IS NULL AND d.is_active = 1 AND d.allow_inventory = 1
             ORDER BY d.name"
        )->fetchAll(PDO::FETCH_ASSOC);

        return [
            'location' => $location,
            'items' => $items,
            'summary' => [
                'tracked' => count(array_filter($items, fn($i) => $i['min_level'] !== null)),
                'out' => count(array_filter($items, fn($i) => $i['status'] === 'out')),
                'low' => count(array_filter($items, fn($i) => $i['status'] === 'low')),
                'over' => count(array_filter($items, fn($i) => $i['status'] === 'over')),
                'no_level' => count(array_filter($items, fn($i) => $i['status'] === 'no_level'))
            ],
            // For "set a minimum for another item".
            'drugs' => array_map(fn(array $d) => [
                'id' => (int) $d['id'],
                'name' => $d['name'],
                'unit_name' => $d['unit_name'],
                'catalog_reorder_level' => (float) $d['min_level_global']
            ], $drugs)
        ];
    }

    /** Sets (or changes) one item's minimum / maximum at a location. */
    public function saveStockLevel(int $warehouseId, array $data, int $userId): array
    {
        if (!$this->get($warehouseId)) {
            return ['success' => false, 'message' => 'Storage location not found.', 'not_found' => true];
        }

        $db = Database::connection();
        $errors = [];
        $drugId = (int) ($data['drug_id'] ?? 0);

        $stmt = $db->prepare("SELECT id FROM drugs WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $drugId]);

        if (!$drugId || !$stmt->fetchColumn()) {
            $errors['drug_id'] = 'Choose an item.';
        }

        $rawMin = $data['min_level'] ?? '';
        $rawMax = $data['max_level'] ?? '';

        if ($rawMin === '' || $rawMin === null || !is_numeric($rawMin) || (float) $rawMin < 0) {
            $errors['min_level'] = 'Enter the minimum (0 or more).';
        }

        $min = is_numeric($rawMin) ? round((float) $rawMin, 3) : 0.0;
        $max = ($rawMax === '' || $rawMax === null) ? null : (is_numeric($rawMax) ? round((float) $rawMax, 3) : -1.0);

        if ($max !== null && $max < 0) {
            $errors['max_level'] = 'Enter 0 or more, or leave it blank.';
        } elseif ($max !== null && !isset($errors['min_level']) && $max < $min) {
            $errors['max_level'] = 'The maximum can\'t be below the minimum.';
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $now = date('Y-m-d H:i:s');

        $db->prepare(
            "INSERT INTO warehouse_stock_levels (warehouse_id, drug_id, min_level, max_level, created_at, created_by)
             VALUES (:w, :d, :min, :max, :now, :user)
             ON DUPLICATE KEY UPDATE min_level = VALUES(min_level), max_level = VALUES(max_level),
                                     updated_at = :now2, updated_by = :user2"
        )->execute([
            'w' => $warehouseId, 'd' => $drugId, 'min' => $min, 'max' => $max,
            'now' => $now, 'user' => $userId, 'now2' => $now, 'user2' => $userId
        ]);

        return ['success' => true, 'message' => 'Stock level saved.'];
    }

    public function removeStockLevel(int $warehouseId, int $drugId): array
    {
        $stmt = Database::connection()->prepare(
            "DELETE FROM warehouse_stock_levels WHERE warehouse_id = :w AND drug_id = :d"
        );
        $stmt->execute(['w' => $warehouseId, 'd' => $drugId]);

        if (!$stmt->rowCount()) {
            return ['success' => false, 'message' => 'No stock level set for this item here.', 'not_found' => true];
        }

        return ['success' => true, 'message' => 'Stock level removed. The item is no longer checked at this location.'];
    }

    private function normalize(array $data, ?int $ignoreId = null): array
    {
        $db = Database::connection();
        $values = [];
        $errors = [];

        $name = trim((string) ($data['name'] ?? ''));

        if ($name === '') {
            $errors['name'] = 'Name is required.';
        } else {
            $existing = (new Warehouse())->where('name', $name)->first();

            if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
                $errors['name'] = 'A storage location with this name already exists.';
            }
        }

        $values['name'] = mb_substr($name, 0, 150);

        foreach (['code' => 30, 'physical_location' => 255, 'notes' => 2000] as $field => $max) {
            $value = trim((string) ($data[$field] ?? ''));
            $values[$field] = $value === '' ? null : mb_substr($value, 0, $max);
        }

        if ($values['code'] !== null) {
            $values['code'] = strtoupper($values['code']);
            $stmt = $db->prepare("SELECT id FROM warehouses WHERE code = :code AND deleted_at IS NULL AND id <> :id");
            $stmt->execute(['code' => $values['code'], 'id' => (int) $ignoreId]);

            if ($stmt->fetchColumn()) {
                $errors['code'] = 'Another storage location already uses this code.';
            }
        }

        $type = trim((string) ($data['location_type'] ?? ''));
        $values['location_type'] = $type === '' ? null : $type;

        if ($values['location_type'] !== null && !in_array($values['location_type'], self::LOCATION_TYPES, true)) {
            $errors['location_type'] = 'Choose a location type from the list.';
        }

        $values['facility_id'] = !empty($data['facility_id']) ? (int) $data['facility_id'] : null;

        $values['department_id'] = !empty($data['department_id']) ? (int) $data['department_id'] : null;

        if ($values['department_id'] !== null) {
            $stmt = $db->prepare("SELECT id FROM departments WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute(['id' => $values['department_id']]);

            if (!$stmt->fetchColumn()) {
                $errors['department_id'] = 'Department not found.';
            }
        }

        foreach (['custodian_user_id', 'alternate_custodian_user_id'] as $field) {
            $values[$field] = !empty($data[$field]) ? (int) $data[$field] : null;

            if ($values[$field] !== null) {
                $stmt = $db->prepare("SELECT id FROM users WHERE id = :id AND deleted_at IS NULL AND role_id IS NOT NULL");
                $stmt->execute(['id' => $values[$field]]);

                if (!$stmt->fetchColumn()) {
                    $errors[$field] = 'Staff member not found.';
                }
            }
        }

        if ($values['alternate_custodian_user_id'] !== null && $values['alternate_custodian_user_id'] === $values['custodian_user_id']) {
            $errors['alternate_custodian_user_id'] = 'The alternate must be a different person from the custodian.';
        } elseif ($values['alternate_custodian_user_id'] !== null && $values['custodian_user_id'] === null) {
            $errors['custodian_user_id'] = 'Choose the custodian first, then the alternate.';
        }

        return [$values, $errors];
    }

    private function format(array $r): array
    {
        return [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'code' => $r['code'],
            'location_type' => $r['location_type'],
            'physical_location' => $r['physical_location'],
            'facility_id' => $r['facility_id'] !== null ? (int) $r['facility_id'] : null,
            'facility_name' => $r['facility_name'],
            'department_id' => $r['department_id'] !== null ? (int) $r['department_id'] : null,
            'department_name' => $r['department_name'],
            'custodian_user_id' => $r['custodian_user_id'] !== null ? (int) $r['custodian_user_id'] : null,
            'custodian_name' => $r['custodian_name'],
            'alternate_custodian_user_id' => $r['alternate_custodian_user_id'] !== null ? (int) $r['alternate_custodian_user_id'] : null,
            'alternate_custodian_name' => $r['alternate_custodian_name'],
            'notes' => $r['notes'],
            'is_active' => (int) $r['is_active'],
            'lot_count' => (int) $r['lot_count'],
            'levels_count' => (int) $r['levels_count'],
            'below_min_count' => (int) $r['below_min_count'],
            'created_at' => $r['created_at']
        ];
    }

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }
}
