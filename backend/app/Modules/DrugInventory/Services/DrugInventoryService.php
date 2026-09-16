<?php

namespace App\Modules\DrugInventory\Services;

use App\Core\Database;
use App\Modules\DrugInventory\Models\Drug;
use App\Modules\DrugInventory\Models\DrugInventoryDestruction;
use App\Modules\DrugInventory\Models\DrugInventoryLot;
use App\Modules\DrugInventory\Models\DrugInventoryTransfer;
use App\Modules\DrugInventory\Models\DrugPrescriptionTemplate;
use PDO;

class DrugInventoryService
{
    public const PRODUCT_TYPES = ['Drug', 'Supply', 'Vaccine', 'Equipment', 'Other'];

    public const DESTRUCTION_METHODS = ['Incineration', 'Return to Manufacturer', 'Sewer/Drain Disposal', 'Reverse Distributor', 'Other'];

    public const FORMS = ['Tablet', 'Capsule', 'Liquid', 'Injection', 'Cream', 'Ointment', 'Patch', 'Inhaler', 'Drops', 'Suppository', 'Other'];

    public const ROUTES = ['Oral', 'Intravenous', 'Intramuscular', 'Subcutaneous', 'Topical', 'Rectal', 'Inhalation', 'Sublingual', 'Other'];

    public const UNITS = ['mg', 'mcg', 'g', 'mL', 'L', 'IU', 'tablet(s)', 'capsule(s)', 'drop(s)', 'puff(s)', 'application(s)'];

    public const INTERVALS = ['QD', 'BID', 'TID', 'QID', 'QHS', 'Q4H', 'Q6H', 'Q8H', 'PRN', 'Other'];

    private const DRUG_FIELDS = [
        'name', 'ndc', 'rxcui', 'form', 'size', 'unit', 'route', 'product_type',
        'on_order', 'min_level_global', 'max_level_global', 'min_level_onsite', 'max_level_onsite'
    ];

    /**
     * Inventory > Management (and Reports > Inventory > List, which
     * calls this same method): one row per drug lot, joined with the
     * drug's own catalog fields, warehouse, and facility names. Filters
     * match the screens' own controls: facility_id, warehouse_id,
     * product_type, show_empty_lots (include quantity_on_hand = 0),
     * show_inactive (include inactive drugs/lots), days (only lots
     * received in the last N days, via `created_at` -- optional, used
     * by the Reports screen's "For the past N days" filter and ignored
     * by Management, which has no such control).
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

        if (!empty($filters['days'])) {
            $where[] = 'dil.created_at >= :since';
            $params['since'] = date('Y-m-d H:i:s', strtotime('-' . (int) $filters['days'] . ' days'));
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
     * Plain id+name drug list -- used by Reports > Inventory > Activity's
     * "For:" picker when grouping "By: Product".
     */
    public function listDrugs(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name FROM drugs WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name"
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

        $numericFields = ['on_order', 'min_level_global', 'max_level_global', 'min_level_onsite', 'max_level_onsite'];
        $drugValues = [];

        foreach (self::DRUG_FIELDS as $field) {
            $value = $data[$field] ?? null;

            if (in_array($field, $numericFields, true)) {
                $drugValues[$field] = ($value === '' || $value === null) ? 0 : (float) $value;
                continue;
            }

            $drugValues[$field] = ($value === '' || $value === null) ? null : $value;
        }

        $drugValues['name'] = trim($drugValues['name']);
        $drugValues['product_type'] = $drugValues['product_type'] ?: 'Drug';
        $drugValues['is_active'] = !empty($data['is_active']) ? 1 : 0;
        $drugValues['is_consumable'] = !empty($data['is_consumable']) ? 1 : 0;
        $drugValues['allow_inventory'] = array_key_exists('allow_inventory', $data) ? (!empty($data['allow_inventory']) ? 1 : 0) : 1;
        $drugValues['allow_multiple_lots'] = array_key_exists('allow_multiple_lots', $data) ? (!empty($data['allow_multiple_lots']) ? 1 : 0) : 1;
        $drugValues['allow_combining_lots'] = !empty($data['allow_combining_lots']) ? 1 : 0;
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

        $this->saveTemplates($drugId, $data['templates'] ?? [], $userId);

        return ['success' => true, 'message' => 'Drug added successfully.', 'data' => ['drug_id' => $drugId, 'lot_id' => $lotId]];
    }

    /**
     * Saves the "Templates" grid rows from the Add Drug form -- blank
     * rows (no name/schedule/basic_units entered at all) are silently
     * skipped rather than saved as empty records, matching the form's
     * own "3 blank starter rows" UX where most are left untouched.
     */
    private function saveTemplates(int $drugId, array $templates, int $userId): void
    {
        foreach ($templates as $template) {
            $name = trim((string) ($template['name'] ?? ''));
            $schedule = trim((string) ($template['schedule'] ?? ''));
            $basicUnits = trim((string) ($template['basic_units'] ?? ''));

            if ($name === '' && $schedule === '' && $basicUnits === '') {
                continue;
            }

            (new DrugPrescriptionTemplate())->create([
                'drug_id' => $drugId,
                'name' => $name ?: null,
                'schedule' => $schedule ?: null,
                'interval_type' => $template['interval_type'] ?: null,
                'basic_units' => $basicUnits ?: null,
                'refills' => (int) ($template['refills'] ?? 0),
                'is_standard' => !empty($template['is_standard']) ? 1 : 0,
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $userId
            ]);
        }
    }

    public function listTemplates(int $drugId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM drug_prescription_templates WHERE drug_id = :drug_id AND deleted_at IS NULL ORDER BY id ASC"
        );
        $stmt->execute(['drug_id' => $drugId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
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

    /**
     * "Destroy" -- permanently removes quantity from a lot (expired,
     * damaged, or recalled stock) and logs the destruction for
     * compliance record-keeping. Unlike transfer(), the quantity never
     * lands anywhere else.
     */
    public function destroyLot(int $lotId, array $data, int $userId): array
    {
        $lot = (new DrugInventoryLot())->where('id', $lotId)->first();

        if (!$lot || $lot['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Lot not found.'];
        }

        $quantity = round((float) ($data['quantity'] ?? 0), 3);

        if ($quantity <= 0) {
            return ['success' => false, 'message' => 'Enter a quantity greater than zero.'];
        }

        if ($quantity > (float) $lot['quantity_on_hand']) {
            return ['success' => false, 'message' => 'Only ' . $lot['quantity_on_hand'] . ' available in this lot.'];
        }

        $destroyedDate = $data['destroyed_date'] ?: date('Y-m-d');

        (new DrugInventoryLot())->update([
            'quantity_on_hand' => (float) $lot['quantity_on_hand'] - $quantity,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $lotId);

        (new DrugInventoryDestruction())->create([
            'drug_id' => $lot['drug_id'],
            'lot_id' => $lotId,
            'quantity' => $quantity,
            'destroyed_date' => $destroyedDate,
            'method' => $data['method'] ?: null,
            'witness' => trim((string) ($data['witness'] ?? '')) ?: null,
            'notes' => trim((string) ($data['notes'] ?? '')) ?: null,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        return ['success' => true, 'message' => 'Drug destroyed and recorded successfully.'];
    }

    /**
     * Inventory > Destroyed: destruction log joined with drug and lot
     * details, filtered by a From/To destroyed_date range (both optional
     * -- an open range shows everything).
     */
    public function listDestructions(array $filters): array
    {
        $where = ['1 = 1'];
        $params = [];

        if (!empty($filters['from'])) {
            $where[] = 'did.destroyed_date >= :from';
            $params['from'] = $filters['from'];
        }

        if (!empty($filters['to'])) {
            $where[] = 'did.destroyed_date <= :to';
            $params['to'] = $filters['to'];
        }

        $stmt = Database::connection()->prepare(
            "SELECT did.id, did.quantity, did.destroyed_date, did.method, did.witness, did.notes,
                    d.name AS drug_name, d.ndc, dil.lot_number
             FROM drug_inventory_destructions did
             JOIN drugs d ON d.id = did.drug_id
             JOIN drug_inventory_lots dil ON dil.id = did.lot_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY did.destroyed_date DESC, did.id DESC
             LIMIT 1000"
        );
        $stmt->execute($params);

        return array_map(function (array $r) {
            return [
                'id' => (int) $r['id'],
                'drug_name' => $r['drug_name'],
                'ndc' => $r['ndc'],
                'lot_number' => $r['lot_number'],
                'quantity' => (float) $r['quantity'],
                'destroyed_date' => $r['destroyed_date'],
                'method' => $r['method'],
                'witness' => $r['witness'],
                'notes' => $r['notes']
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
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
