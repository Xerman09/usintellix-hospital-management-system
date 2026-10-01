<?php

namespace App\Modules\DrugInventory\Services;

use App\Core\Database;
use App\Modules\DrugInventory\Models\Warehouse;
use PDO;
use PDOException;
use Throwable;

/**
 * CRUD for storage locations (Pharmacy > Storage Locations). The table
 * and code keep the original "warehouses" name; only labels changed.
 * Separate from DrugInventoryService::listWarehouses(), which only
 * returns active warehouses for filter/picker dropdowns -- this one
 * returns everything (including inactive) since the management screen
 * needs to show and re-activate them.
 */
class WarehouseService
{
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT w.id, w.name, w.facility_id, w.is_active, w.created_at,
                    f.name AS facility_name,
                    (SELECT COUNT(*) FROM drug_inventory_lots dil WHERE dil.warehouse_id = w.id AND dil.deleted_at IS NULL) AS lot_count
             FROM warehouses w
             LEFT JOIN facilities f ON f.id = w.facility_id AND f.deleted_at IS NULL
             WHERE w.deleted_at IS NULL
             ORDER BY w.name"
        );
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function register(array $data, int $userId): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        try {
            $id = (new Warehouse())->create([
                'name' => trim($data['name']),
                'facility_id' => !empty($data['facility_id']) ? (int) $data['facility_id'] : null,
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

        $errors = $this->validate($data, $id);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        try {
            (new Warehouse())->update([
                'name' => trim($data['name']),
                'facility_id' => !empty($data['facility_id']) ? (int) $data['facility_id'] : null,
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

    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty(trim((string) ($data['name'] ?? '')))) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new Warehouse())->where('name', trim($data['name']))->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A storage location with this name already exists.';
        }

        return $errors;
    }
}
