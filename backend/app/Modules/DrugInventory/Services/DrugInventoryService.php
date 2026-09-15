<?php

namespace App\Modules\DrugInventory\Services;

use App\Core\Database;
use App\Modules\DrugInventory\Models\Drug;
use App\Modules\DrugInventory\Models\DrugInventoryLot;
use App\Modules\DrugInventory\Models\DrugInventoryTransfer;
use PDO;

class DrugInventoryService
{
    public const PRODUCT_TYPES = ['Drug', 'Supply', 'Vaccine', 'Equipment', 'Other'];

    private const DRUG_FIELDS = ['name', 'ndc', 'form', 'size', 'unit', 'product_type', 'is_consumable'];

    /**
     * Inventory > Management: one row per drug lot, joined with the
     * drug's own catalog fields, warehouse, and facility names. Filters
     * match the screen's own controls: facility_id, warehouse_id,
     * product_type, show_empty_lots (include quantity_on_hand = 0),
     * show_inactive (include inactive drugs/lots).
     */
    public function listLots(array $filters): array
    {
        $where = ['dil.deleted_at IS NULL', 'd.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['facility_id'])) {
            $where[] = 'dil.facility_id = :facility_id';
            $params['facility_id'] = (int) $filters['facility_id'];
        }

        if (!empty($filters['warehouse_id'])) {
            $where[] = 'dil.warehouse_id = :warehouse_id';
            $params['warehouse_id'] = (int) $filters['warehouse_id'];
        }

        if (!empty($filters['product_type'])) {
            $where[] = 'd.product_type = :product_type';
            $params['product_type'] = $filters['product_type'];
        }

        if (empty($filters['show_empty_lots'])) {
            $where[] = 'dil.quantity_on_hand > 0';
        }

        if (empty($filters['show_inactive'])) {
            $where[] = 'd.is_active = 1';
            $where[] = 'dil.is_active = 1';
        }

        $stmt = Database::connection()->prepare(
            "SELECT dil.id AS lot_id, dil.lot_number, dil.quantity_on_hand, dil.expires_date, dil.is_active AS lot_is_active,
                    d.id AS drug_id, d.name AS drug_name, d.ndc, d.form, d.size, d.unit, d.product_type,
                    d.is_active AS drug_is_active, d.is_consumable,
                    f.id AS facility_id, f.name AS facility_name,
                    w.id AS warehouse_id, w.name AS warehouse_name
             FROM drug_inventory_lots dil
             JOIN drugs d ON d.id = dil.drug_id
             JOIN warehouses w ON w.id = dil.warehouse_id
             LEFT JOIN facilities f ON f.id = dil.facility_id AND f.deleted_at IS NULL
             WHERE " . implode(' AND ', $where) . "
             ORDER BY d.name ASC, dil.lot_number ASC
             LIMIT 1000"
        );
        $stmt->execute($params);

        return array_map(function (array $r) {
            return [
                'lot_id' => (int) $r['lot_id'],
                'drug_id' => (int) $r['drug_id'],
                'name' => $r['drug_name'],
                'is_active' => (bool) $r['drug_is_active'],
                'is_consumable' => (bool) $r['is_consumable'],
                'ndc' => $r['ndc'],
                'form' => $r['form'],
                'size' => $r['size'],
                'unit' => $r['unit'],
                'product_type' => $r['product_type'],
                'lot_number' => $r['lot_number'],
                'facility_id' => $r['facility_id'] !== null ? (int) $r['facility_id'] : null,
                'facility_name' => $r['facility_name'],
                'warehouse_id' => (int) $r['warehouse_id'],
                'warehouse_name' => $r['warehouse_name'],
                'quantity_on_hand' => (float) $r['quantity_on_hand'],
                'expires_date' => $r['expires_date']
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function listWarehouses(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, facility_id FROM warehouses WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name"
        );
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Creates a drug catalog entry together with its first inventory lot
     * -- the "Add Drug" form captures both in one step, matching the
     * screen it's modeled on (there's no separate "register a drug with
     * zero stock" flow shown).
     */
    public function createDrug(array $data, int $userId): array
    {
        $errors = $this->validateDrug($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $drugValues = [];

        foreach (self::DRUG_FIELDS as $field) {
            $value = $data[$field] ?? null;
            $drugValues[$field] = ($value === '' || $value === null) ? null : $value;
        }

        $drugValues['name'] = trim($drugValues['name']);
        $drugValues['product_type'] = $drugValues['product_type'] ?: 'Drug';
        $drugValues['is_consumable'] = !empty($data['is_consumable']) ? 1 : 0;
        $drugValues['is_active'] = 1;
        $drugValues['created_at'] = date('Y-m-d H:i:s');
        $drugValues['created_by'] = $userId;

        $drugId = (new Drug())->create($drugValues);

        if (!$drugId) {
            return ['success' => false, 'message' => 'Failed to save the drug.'];
        }

        $lotId = (new DrugInventoryLot())->create([
            'drug_id' => $drugId,
            'lot_number' => trim((string) ($data['lot_number'] ?? '')) ?: '1',
            'facility_id' => !empty($data['facility_id']) ? (int) $data['facility_id'] : null,
            'warehouse_id' => (int) $data['warehouse_id'],
            'quantity_on_hand' => (float) ($data['quantity_on_hand'] ?? 0),
            'expires_date' => $data['expires_date'] ?: null,
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        if (!$lotId) {
            return ['success' => false, 'message' => 'Drug saved, but failed to create its initial lot.'];
        }

        return ['success' => true, 'message' => 'Drug added successfully.', 'data' => ['drug_id' => $drugId, 'lot_id' => $lotId]];
    }

    /**
     * "Tran" -- moves quantity from one lot to another warehouse/
     * facility for the same drug. Finds an existing destination lot with
     * the same drug + lot number + warehouse + facility to add onto,
     * otherwise creates a new one, then logs the transfer.
     */
    public function transfer(int $lotId, array $data, int $userId): array
    {
        $sourceLot = (new DrugInventoryLot())->where('id', $lotId)->first();

        if (!$sourceLot || $sourceLot['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Lot not found.'];
        }

        $quantity = round((float) ($data['quantity'] ?? 0), 3);
        $warehouseId = (int) ($data['warehouse_id'] ?? 0);

        if ($quantity <= 0) {
            return ['success' => false, 'message' => 'Enter a quantity greater than zero.'];
        }

        if ($quantity > (float) $sourceLot['quantity_on_hand']) {
            return ['success' => false, 'message' => 'Only ' . $sourceLot['quantity_on_hand'] . ' available in this lot.'];
        }

        if (!$warehouseId) {
            return ['success' => false, 'message' => 'Select a destination warehouse.'];
        }

        $facilityId = !empty($data['facility_id']) ? (int) $data['facility_id'] : null;
        $lotNumber = trim((string) ($data['lot_number'] ?? '')) ?: $sourceLot['lot_number'];

        if ($warehouseId === (int) $sourceLot['warehouse_id']
            && $facilityId === ($sourceLot['facility_id'] !== null ? (int) $sourceLot['facility_id'] : null)
            && $lotNumber === $sourceLot['lot_number']) {
            return ['success' => false, 'message' => 'Choose a different warehouse, facility, or lot number to transfer into.'];
        }

        $destLot = (new DrugInventoryLot())
            ->where('drug_id', $sourceLot['drug_id'])
            ->where('lot_number', $lotNumber)
            ->where('warehouse_id', $warehouseId)
            ->first();

        $destLotId = null;

        if ($destLot && $destLot['deleted_at'] === null
            && ($destLot['facility_id'] !== null ? (int) $destLot['facility_id'] : null) === $facilityId) {
            $destLotId = (int) $destLot['id'];

            (new DrugInventoryLot())->update([
                'quantity_on_hand' => (float) $destLot['quantity_on_hand'] + $quantity,
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => $userId
            ], $destLotId);
        } else {
            $destLotId = (new DrugInventoryLot())->create([
                'drug_id' => $sourceLot['drug_id'],
                'lot_number' => $lotNumber,
                'facility_id' => $facilityId,
                'warehouse_id' => $warehouseId,
                'quantity_on_hand' => $quantity,
                'expires_date' => $sourceLot['expires_date'],
                'is_active' => 1,
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $userId
            ]);

            if (!$destLotId) {
                return ['success' => false, 'message' => 'Failed to create the destination lot.'];
            }
        }

        (new DrugInventoryLot())->update([
            'quantity_on_hand' => (float) $sourceLot['quantity_on_hand'] - $quantity,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $lotId);

        (new DrugInventoryTransfer())->create([
            'drug_id' => $sourceLot['drug_id'],
            'from_lot_id' => $lotId,
            'to_lot_id' => $destLotId,
            'quantity' => $quantity,
            'notes' => $data['notes'] ?? null,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        return ['success' => true, 'message' => 'Transferred successfully.'];
    }

    private function validateDrug(array $data): array
    {
        $errors = [];

        if (empty(trim((string) ($data['name'] ?? '')))) {
            $errors['name'] = 'Name is required.';
        }

        if (empty($data['warehouse_id'])) {
            $errors['warehouse_id'] = 'Warehouse is required.';
        }

        if (isset($data['quantity_on_hand']) && (float) $data['quantity_on_hand'] < 0) {
            $errors['quantity_on_hand'] = 'Quantity cannot be negative.';
        }

        return $errors;
    }
}
