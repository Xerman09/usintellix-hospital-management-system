<?php

namespace App\Modules\DrugInventory\Services;

use App\Core\Database;
use App\Modules\DrugInventory\Models\Drug;
use App\Modules\DrugInventory\Models\DrugInventoryDestruction;
use App\Modules\DrugInventory\Models\DrugInventoryLot;
use App\Modules\DrugInventory\Models\DrugInventoryReceipt;
use App\Modules\DrugInventory\Models\DrugInventoryTransfer;
use App\Modules\DrugInventory\Models\DrugPrescriptionTemplate;
use PDO;
use Throwable;

class DrugInventoryService
{
    public const PRODUCT_TYPES = ['Drug', 'Supply', 'Vaccine', 'Equipment', 'Other'];

    public const DESTRUCTION_METHODS = ['Incineration', 'Return to Manufacturer', 'Sewer/Drain Disposal', 'Reverse Distributor', 'Other'];

    public const INTERVALS = ['QD', 'BID', 'TID', 'QID', 'QHS', 'Q4H', 'Q6H', 'Q8H', 'PRN', 'Other'];

    /**
     * Regulatory class under Philippine law: "Dangerous Drug" covers the
     * RA 9165 schedules (S-2 license, yellow prescription); precursors
     * are the PDEA-regulated essential chemicals.
     */
    public const CONTROLLED_CLASSES = ['None', 'Dangerous Drug (RA 9165)', 'Controlled Precursor'];

    public const STORAGE_CONDITIONS = [
        'Room temperature (15-30 °C)',
        'Cool place (8-15 °C)',
        'Refrigerated (2-8 °C)',
        'Frozen (below -15 °C)',
        'Protect from light'
    ];

    /**
     * Product types that are medicines (need a dosage form and, for
     * stock, a lot number and expiry date) as opposed to supplies.
     */
    private const MEDICINE_TYPES = ['Drug', 'Vaccine'];

    private const TEXT_FIELDS = [
        'generic_name', 'brand_name', 'strength', 'manufacturer', 'registration_number', 'barcode',
        'ndc', 'rxcui', 'product_type', 'controlled_class', 'storage_condition'
    ];

    private const LOOKUP_FIELDS = [
        'dosage_form_id' => ['dosage_forms', 'Dosage form'],
        'route_id' => ['administration_routes', 'Route'],
        'dispensing_unit_id' => ['amount_units', 'Dispensing unit'],
        'package_unit_id' => ['amount_units', 'Package unit'],
        'category_id' => ['drug_categories', 'Category'],
        'preferred_supplier_id' => ['suppliers', 'Preferred supplier']
    ];

    private const NULLABLE_DECIMAL_FIELDS = ['package_quantity', 'unit_cost', 'selling_price'];

    private const ZERO_DECIMAL_FIELDS = ['on_order', 'min_level_global', 'max_level_global'];

    private const FLAG_DEFAULTS = [
        'is_active' => 1,
        'is_consumable' => 0,
        'requires_prescription' => 1,
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'allow_inventory' => 1,
        'allow_multiple_lots' => 1,
        'allow_combining_lots' => 0
    ];

    /**
     * Every field the drug registration form may send, for the
     * controller's $request->only().
     */
    public const DRUG_INPUT_FIELDS = [
        'generic_name', 'brand_name', 'strength', 'manufacturer', 'registration_number', 'barcode',
        'ndc', 'rxcui', 'product_type', 'controlled_class', 'storage_condition',
        'dosage_form_id', 'route_id', 'dispensing_unit_id', 'package_unit_id', 'category_id',
        'package_quantity', 'unit_cost', 'selling_price', 'on_order', 'min_level_global', 'max_level_global',
        'is_active', 'is_consumable', 'requires_prescription', 'is_high_alert', 'is_lasa',
        'allow_inventory', 'allow_multiple_lots', 'allow_combining_lots', 'preferred_supplier_id', 'templates'
    ];

    public const RECEIVE_INPUT_FIELDS = [
        'drug_id', 'warehouse_id', 'facility_id', 'lot_number', 'expires_date', 'quantity', 'quantity_in',
        'received_date', 'supplier_id', 'supplier', 'invoice_number', 'unit_cost', 'notes'
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
                    d.id AS drug_id, d.name AS drug_name, d.ndc, d.strength, d.size, d.product_type,
                    COALESCE(df.name, d.form) AS form_name, COALESCE(du.name, d.unit) AS unit_name,
                    d.is_active AS drug_is_active, d.is_consumable,
                    f.id AS facility_id, f.name AS facility_name,
                    w.id AS warehouse_id, w.name AS warehouse_name
             FROM drug_inventory_lots dil
             JOIN drugs d ON d.id = dil.drug_id
             JOIN warehouses w ON w.id = dil.warehouse_id
             LEFT JOIN dosage_forms df ON df.id = d.dosage_form_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN facilities f ON f.id = dil.facility_id AND f.deleted_at IS NULL
             WHERE " . implode(' AND ', $where) . "
             ORDER BY d.name ASC, dil.expires_date IS NULL, dil.expires_date ASC, dil.lot_number ASC
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
                'form' => $r['form_name'],
                'strength' => $r['strength'],
                'size' => $r['strength'] ?? $r['size'],
                'unit' => $r['unit_name'],
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
            "SELECT w.id, w.name, w.facility_id,
                    (SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username) FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL WHERE u.id = w.custodian_user_id LIMIT 1) AS custodian_name,
                    (SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username) FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL WHERE u.id = w.alternate_custodian_user_id LIMIT 1) AS alternate_custodian_name
             FROM warehouses w WHERE w.deleted_at IS NULL AND w.is_active = 1 ORDER BY w.name"
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
     * id+name rows of one of the admin-managed lookup tables the drug
     * form's dropdowns draw from.
     */
    public function listLookup(string $table): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name FROM {$table} WHERE deleted_at IS NULL ORDER BY name"
        );
        $stmt->execute();

        return array_map(fn(array $r) => ['id' => (int) $r['id'], 'name' => $r['name']], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Drug Catalog: one row per registered drug (stock or not) with its
     * lookup names resolved and a stock summary across all active lots.
     */
    public function listCatalog(array $filters = []): array
    {
        $where = ['d.deleted_at IS NULL'];
        $params = [];

        if (empty($filters['show_inactive'])) {
            $where[] = 'd.is_active = 1';
        }

        if (!empty($filters['id'])) {
            $where[] = 'd.id = :id';
            $params['id'] = (int) $filters['id'];
        }

        $stmt = Database::connection()->prepare(
            "SELECT d.*,
                    df.name AS dosage_form_name, ar.name AS route_name, dc.name AS category_name,
                    du.name AS dispensing_unit_name, pu.name AS package_unit_name,
                    ps.name AS preferred_supplier_name,
                    COALESCE(st.qoh, 0) AS qoh, COALESCE(st.lot_count, 0) AS lot_count, st.next_expiry
             FROM drugs d
             LEFT JOIN dosage_forms df ON df.id = d.dosage_form_id
             LEFT JOIN administration_routes ar ON ar.id = d.route_id
             LEFT JOIN drug_categories dc ON dc.id = d.category_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN amount_units pu ON pu.id = d.package_unit_id
             LEFT JOIN suppliers ps ON ps.id = d.preferred_supplier_id
             LEFT JOIN (
                 SELECT drug_id,
                        SUM(quantity_on_hand) AS qoh,
                        SUM(quantity_on_hand > 0) AS lot_count,
                        MIN(CASE WHEN quantity_on_hand > 0 THEN expires_date END) AS next_expiry
                 FROM drug_inventory_lots
                 WHERE deleted_at IS NULL AND is_active = 1
                 GROUP BY drug_id
             ) st ON st.drug_id = d.id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY d.name ASC
             LIMIT 5000"
        );
        $stmt->execute($params);

        return array_map(fn(array $r) => $this->formatCatalogRow($r), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function getDrug(int $id): ?array
    {
        $rows = $this->listCatalog(['id' => $id, 'show_inactive' => true]);

        if (!$rows) {
            return null;
        }

        $drug = $rows[0];
        $drug['templates'] = $this->listTemplates($id);

        return $drug;
    }

    /**
     * Registers a drug in the catalog. Stock is added separately through
     * receiveStock(), so a drug can be registered before any arrives.
     */
    public function createDrug(array $data, int $userId): array
    {
        [$values, $errors] = $this->normalizeDrugInput($data);

        if (!$errors) {
            $errors = $this->findConflicts($values);
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $values['created_at'] = date('Y-m-d H:i:s');
        $values['created_by'] = $userId;

        $drugId = (new Drug())->create($values);

        if (!$drugId) {
            return ['success' => false, 'message' => 'Failed to save the drug.'];
        }

        $this->saveTemplates($drugId, $data['templates'] ?? [], $userId);

        return ['success' => true, 'message' => 'Drug registered successfully.', 'data' => ['drug_id' => $drugId, 'name' => $values['name']]];
    }

    public function updateDrug(int $id, array $data, int $userId): array
    {
        $existing = (new Drug())->where('id', $id)->first();

        if (!$existing || $existing['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Drug not found.'];
        }

        [$values, $errors] = $this->normalizeDrugInput($data);

        if (!$errors) {
            $errors = $this->findConflicts($values, $id);
        }

        if (!$errors && empty($values['allow_multiple_lots']) && $this->countStockedLots($id) > 1) {
            $errors['allow_multiple_lots'] = 'This drug already has stock in more than one lot.';
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $values['updated_at'] = date('Y-m-d H:i:s');
        $values['updated_by'] = $userId;

        $db = Database::connection();
        $db->beginTransaction();

        try {
            (new Drug())->update($values, $id);

            if (array_key_exists('templates', $data)) {
                $db->prepare(
                    "UPDATE drug_prescription_templates SET deleted_at = :now, deleted_by = :user
                     WHERE drug_id = :drug_id AND deleted_at IS NULL"
                )->execute(['now' => date('Y-m-d H:i:s'), 'user' => $userId, 'drug_id' => $id]);

                $this->saveTemplates($id, $data['templates'] ?? [], $userId);
            }

            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
            error_log('drug update failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to update the drug.'];
        }

        return ['success' => true, 'message' => 'Drug updated successfully.'];
    }

    /**
     * Soft-deletes a drug that has no stock left. Drugs with history
     * stay referenced by their lots/transfers/destructions, which is
     * fine because those joins don't filter on drugs.deleted_at.
     */
    public function deleteDrug(int $id, int $userId): array
    {
        $existing = (new Drug())->where('id', $id)->first();

        if (!$existing || $existing['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Drug not found.'];
        }

        $stmt = Database::connection()->prepare(
            "SELECT COALESCE(SUM(quantity_on_hand), 0) FROM drug_inventory_lots WHERE drug_id = :id AND deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);

        if ((float) $stmt->fetchColumn() > 0) {
            return ['success' => false, 'message' => 'This drug still has stock on hand. Transfer or destroy it first, or mark the drug inactive instead.'];
        }

        (new Drug())->update(['deleted_at' => date('Y-m-d H:i:s'), 'deleted_by' => $userId], $id);

        return ['success' => true, 'message' => 'Drug deleted successfully.'];
    }

    /**
     * "Receive Stock": adds quantity to a lot (creating it if this drug
     * has no lot with that number at that warehouse/facility yet) and
     * logs the receipt. quantity_in = 'package' converts packages to the
     * drug's dispensing unit using its package_quantity.
     */
    public function receiveStock(array $data, int $userId): array
    {
        $drugId = (int) ($data['drug_id'] ?? 0);
        $drug = $drugId ? (new Drug())->where('id', $drugId)->first() : null;

        if (!$drug || $drug['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Drug not found.'];
        }

        $errors = [];

        if (!(int) $drug['is_active']) {
            return ['success' => false, 'message' => 'This drug is inactive. Re-activate it before receiving stock.'];
        }

        if (!(int) $drug['allow_inventory']) {
            return ['success' => false, 'message' => 'Inventory tracking is turned off for this drug.'];
        }

        $isMedicine = in_array($drug['product_type'], self::MEDICINE_TYPES, true);
        $lotNumber = trim((string) ($data['lot_number'] ?? ''));
        $warehouseId = (int) ($data['warehouse_id'] ?? 0);
        $facilityId = !empty($data['facility_id']) ? (int) $data['facility_id'] : null;
        $expiresDate = trim((string) ($data['expires_date'] ?? '')) ?: null;
        $receivedDate = trim((string) ($data['received_date'] ?? '')) ?: date('Y-m-d');
        $quantity = round((float) ($data['quantity'] ?? 0), 3);

        if ($lotNumber === '') {
            if ($isMedicine) {
                $errors['lot_number'] = 'Lot / batch number is required.';
            } else {
                $lotNumber = 'N/A';
            }
        }

        if (!$warehouseId) {
            $errors['warehouse_id'] = 'Storage location is required.';
        }

        if ($quantity <= 0) {
            $errors['quantity'] = 'Enter a quantity greater than zero.';
        }

        if ($expiresDate === null && $isMedicine) {
            $errors['expires_date'] = 'Expiry date is required.';
        } elseif ($expiresDate !== null && !$this->isValidDate($expiresDate)) {
            $errors['expires_date'] = 'Enter a valid expiry date.';
        } elseif ($expiresDate !== null && $expiresDate <= date('Y-m-d')) {
            $errors['expires_date'] = 'This stock is already expired.';
        }

        if (!$this->isValidDate($receivedDate)) {
            $errors['received_date'] = 'Enter a valid received date.';
        } elseif ($receivedDate > date('Y-m-d')) {
            $errors['received_date'] = 'Received date cannot be in the future.';
        }

        if (isset($data['unit_cost']) && $data['unit_cost'] !== '' && (float) $data['unit_cost'] < 0) {
            $errors['unit_cost'] = 'Cost cannot be negative.';
        }

        // A listed supplier wins over free text; its name is also stored
        // in the text column so the receipt reads correctly on its own.
        $supplierId = !empty($data['supplier_id']) ? (int) $data['supplier_id'] : null;
        $supplierName = trim((string) ($data['supplier'] ?? '')) ?: null;

        if ($supplierId !== null) {
            $stmt = Database::connection()->prepare("SELECT name, is_active FROM suppliers WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute(['id' => $supplierId]);
            $supplier = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$supplier) {
                $errors['supplier_id'] = 'Supplier not found.';
            } elseif (!(int) $supplier['is_active']) {
                $errors['supplier_id'] = 'This supplier is inactive.';
            } else {
                $supplierName = $supplier['name'];
            }
        }

        if (($data['quantity_in'] ?? 'unit') === 'package' && !isset($errors['quantity'])) {
            $perPackage = (float) ($drug['package_quantity'] ?? 0);

            if ($perPackage <= 0 || empty($drug['package_unit_id'])) {
                $errors['quantity'] = 'This drug has no package size set. Enter the quantity in dispensing units.';
            } else {
                $quantity = round($quantity * $perPackage, 3);
            }
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $existingLot = $this->findLot($drugId, $lotNumber, $warehouseId, $facilityId);

        if ($existingLot && $expiresDate !== null && $existingLot['expires_date'] !== null
            && substr($existingLot['expires_date'], 0, 10) !== $expiresDate) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => [
                'expires_date' => 'Lot ' . $lotNumber . ' is already on file here with expiry ' . substr($existingLot['expires_date'], 0, 10) . '.'
            ]];
        }

        if (!$existingLot && !(int) $drug['allow_multiple_lots'] && $this->countStockedLots($drugId) > 0) {
            return ['success' => false, 'message' => 'This drug only allows one lot, and another lot still has stock.'];
        }

        $db = Database::connection();
        // Receiving a delivery (Pharmacy > Receiving) calls this once per
        // line inside its own transaction -- join it rather than nesting.
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            if ($existingLot) {
                $lotId = (int) $existingLot['id'];

                (new DrugInventoryLot())->update([
                    'quantity_on_hand' => (float) $existingLot['quantity_on_hand'] + $quantity,
                    'expires_date' => $existingLot['expires_date'] ?? $expiresDate,
                    'is_active' => 1,
                    'updated_at' => date('Y-m-d H:i:s'),
                    'updated_by' => $userId
                ], $lotId);
            } else {
                $lotId = (new DrugInventoryLot())->create([
                    'drug_id' => $drugId,
                    'lot_number' => $lotNumber,
                    'facility_id' => $facilityId,
                    'warehouse_id' => $warehouseId,
                    'quantity_on_hand' => $quantity,
                    'expires_date' => $expiresDate,
                    'is_active' => 1,
                    'created_at' => date('Y-m-d H:i:s'),
                    'created_by' => $userId
                ]);

                if (!$lotId) {
                    throw new \RuntimeException('lot insert failed');
                }
            }

            $receiptId = (new DrugInventoryReceipt())->create([
                'drug_id' => $drugId,
                'lot_id' => $lotId,
                'quantity' => $quantity,
                'received_date' => $receivedDate,
                'supplier_id' => $supplierId,
                // Internal only (not in RECEIVE_INPUT_FIELDS): set by Receiving.
                'goods_receipt_id' => !empty($data['goods_receipt_id']) ? (int) $data['goods_receipt_id'] : null,
                'supplier' => $supplierName,
                'invoice_number' => trim((string) ($data['invoice_number'] ?? '')) ?: null,
                'unit_cost' => isset($data['unit_cost']) && $data['unit_cost'] !== '' ? round((float) $data['unit_cost'], 2) : null,
                'notes' => trim((string) ($data['notes'] ?? '')) ?: null,
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $userId
            ]);

            if (!$receiptId) {
                throw new \RuntimeException('receipt insert failed');
            }

            if ($ownsTransaction) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($ownsTransaction) {
                $db->rollBack();
            }
            error_log('receive stock failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to receive stock.'];
        }

        return [
            'success' => true,
            'message' => 'Received ' . $this->formatNumber($quantity) . ' into lot ' . $lotNumber . '.',
            'data' => ['lot_id' => $lotId, 'receipt_id' => (int) $receiptId, 'quantity' => $quantity]
        ];
    }

    /**
     * Bulk registration from a parsed CSV. Rows carry lookup *names*
     * (e.g. "Tablet", "Oral") which are resolved case-insensitively;
     * each row is validated and saved on its own so one bad row doesn't
     * block the rest.
     */
    public function importDrugs(array $rows, int $userId): array
    {
        if (count($rows) > 1000) {
            return ['success' => false, 'message' => 'Import at most 1000 rows at a time.'];
        }

        $lookupMaps = [];

        foreach (self::LOOKUP_FIELDS as $field => [$table]) {
            if (!isset($lookupMaps[$table])) {
                $lookupMaps[$table] = [];

                foreach ($this->listLookup($table) as $item) {
                    $lookupMaps[$table][mb_strtolower(trim($item['name']))] = $item['id'];
                }
            }
        }

        $created = 0;
        $failed = [];

        foreach (array_values($rows) as $index => $row) {
            $rowNumber = $index + 2;
            $input = [];
            $rowErrors = [];

            foreach ($row as $key => $value) {
                $input[$key] = is_string($value) ? trim($value) : $value;
            }

            foreach (self::LOOKUP_FIELDS as $field => [$table, $label]) {
                $nameKey = substr($field, 0, -3);
                $name = (string) ($input[$nameKey] ?? '');
                unset($input[$nameKey]);

                if ($name === '') {
                    continue;
                }

                $id = $lookupMaps[$table][mb_strtolower($name)] ?? null;

                if ($id === null) {
                    $rowErrors[$field] = "{$label} \"{$name}\" is not in the list.";
                } else {
                    $input[$field] = $id;
                }
            }

            $fixedLists = [
                'product_type' => self::PRODUCT_TYPES,
                'controlled_class' => self::CONTROLLED_CLASSES,
                'storage_condition' => self::STORAGE_CONDITIONS
            ];

            foreach ($fixedLists as $field => $allowed) {
                if (!empty($input[$field])) {
                    foreach ($allowed as $option) {
                        if (mb_strtolower($option) === mb_strtolower($input[$field])) {
                            $input[$field] = $option;
                        }
                    }
                }
            }

            if (isset($input['reorder_level'])) {
                $input['min_level_global'] = $input['reorder_level'];
            }

            if (isset($input['max_stock'])) {
                $input['max_level_global'] = $input['max_stock'];
            }

            foreach (array_keys(self::FLAG_DEFAULTS) as $flag) {
                if (isset($input[$flag]) && is_string($input[$flag])) {
                    $input[$flag] = in_array(mb_strtolower($input[$flag]), ['1', 'yes', 'y', 'true'], true);
                }
            }

            if ($rowErrors) {
                $failed[] = ['row' => $rowNumber, 'name' => $input['generic_name'] ?? '', 'errors' => array_values($rowErrors)];
                continue;
            }

            $result = $this->createDrug(array_intersect_key($input, array_flip(self::DRUG_INPUT_FIELDS)), $userId);

            if ($result['success']) {
                $created++;
            } else {
                $failed[] = [
                    'row' => $rowNumber,
                    'name' => $input['generic_name'] ?? '',
                    'errors' => array_values($result['errors'] ?? [$result['message']])
                ];
            }
        }

        return [
            'success' => true,
            'message' => "Imported {$created} drug(s)" . ($failed ? ', ' . count($failed) . ' row(s) skipped.' : '.'),
            'data' => ['created' => $created, 'failed' => $failed]
        ];
    }

    /**
     * Saves the "Templates" grid rows from the drug form -- blank rows
     * (no name/schedule/basic_units entered at all) are silently skipped
     * rather than saved as empty records, matching the form's own
     * "blank starter rows" UX where most are left untouched.
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
                'interval_type' => ($template['interval_type'] ?? '') ?: null,
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
            return ['success' => false, 'message' => 'Select a destination storage location.'];
        }

        $facilityId = !empty($data['facility_id']) ? (int) $data['facility_id'] : null;
        $lotNumber = trim((string) ($data['lot_number'] ?? '')) ?: $sourceLot['lot_number'];

        if ($warehouseId === (int) $sourceLot['warehouse_id']
            && $facilityId === ($sourceLot['facility_id'] !== null ? (int) $sourceLot['facility_id'] : null)
            && $lotNumber === $sourceLot['lot_number']) {
            return ['success' => false, 'message' => 'Choose a different storage location, facility, or lot number to transfer into.'];
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

    /**
     * Turns raw form input into a drugs row (plus the generated display
     * name) and collects field errors.
     */
    private function normalizeDrugInput(array $data): array
    {
        $values = [];
        $errors = [];

        foreach (self::TEXT_FIELDS as $field) {
            $value = trim((string) ($data[$field] ?? ''));
            $values[$field] = $value === '' ? null : $value;
        }

        foreach (self::LOOKUP_FIELDS as $field => [$table, $label]) {
            $id = (int) ($data[$field] ?? 0);
            $values[$field] = $id ?: null;

            if ($id && !$this->lookupExists($table, $id)) {
                $errors[$field] = "{$label} does not exist.";
            }
        }

        foreach (self::NULLABLE_DECIMAL_FIELDS as $field) {
            $raw = $data[$field] ?? '';
            $values[$field] = ($raw === '' || $raw === null) ? null : round((float) $raw, 3);

            if ($values[$field] !== null && $values[$field] < 0) {
                $errors[$field] = 'Cannot be negative.';
            }
        }

        foreach (self::ZERO_DECIMAL_FIELDS as $field) {
            $raw = $data[$field] ?? '';
            $values[$field] = ($raw === '' || $raw === null) ? 0 : round((float) $raw, 3);

            if ($values[$field] < 0) {
                $errors[$field] = 'Cannot be negative.';
            }
        }

        foreach (self::FLAG_DEFAULTS as $field => $default) {
            $values[$field] = array_key_exists($field, $data) ? (!empty($data[$field]) ? 1 : 0) : $default;
        }

        $values['product_type'] = $values['product_type'] ?: 'Drug';
        $values['controlled_class'] = $values['controlled_class'] ?: 'None';
        $isMedicine = in_array($values['product_type'], self::MEDICINE_TYPES, true);

        if ($values['generic_name'] === null) {
            $errors['generic_name'] = $isMedicine ? 'Generic name is required.' : 'Item name is required.';
        }

        if (!in_array($values['product_type'], self::PRODUCT_TYPES, true)) {
            $errors['product_type'] = 'Choose a valid product type.';
        }

        if ($values['product_type'] === 'Drug' && $values['strength'] === null) {
            $errors['strength'] = 'Strength is required for drugs (e.g. 500 mg).';
        }

        if ($isMedicine && $values['dosage_form_id'] === null && !isset($errors['dosage_form_id'])) {
            $errors['dosage_form_id'] = 'Dosage form is required.';
        }

        if ($values['allow_inventory'] && $values['dispensing_unit_id'] === null && !isset($errors['dispensing_unit_id'])) {
            $errors['dispensing_unit_id'] = 'Dispensing unit is required to track stock.';
        }

        if ($values['package_unit_id'] !== null && !($values['package_quantity'] > 0)) {
            $errors['package_quantity'] = 'Enter how many dispensing units are in one package.';
        }

        if ($values['package_quantity'] !== null && $values['package_unit_id'] === null && !isset($errors['package_unit_id'])) {
            $errors['package_unit_id'] = 'Choose the package unit (e.g. box).';
        }

        if ($values['max_level_global'] > 0 && $values['min_level_global'] > $values['max_level_global']) {
            $errors['min_level_global'] = 'Reorder level cannot be higher than maximum stock.';
        }

        if (!in_array($values['controlled_class'], self::CONTROLLED_CLASSES, true)) {
            $errors['controlled_class'] = 'Choose a valid controlled-drug class.';
        }

        if ($values['storage_condition'] !== null && !in_array($values['storage_condition'], self::STORAGE_CONDITIONS, true)) {
            $errors['storage_condition'] = 'Choose a valid storage condition.';
        }

        // Dangerous drugs can never be sold over the counter.
        if ($values['controlled_class'] !== 'None') {
            $values['requires_prescription'] = 1;
        }

        if (!$errors) {
            $values['name'] = $this->buildDisplayName($values);
        }

        return [$values, $errors];
    }

    /**
     * Duplicate registrations: same generic + strength + dosage form +
     * brand, or a registration number / barcode / NDC already used by
     * another drug.
     */
    private function findConflicts(array $values, ?int $ignoreId = null): array
    {
        $db = Database::connection();
        $errors = [];

        $stmt = $db->prepare(
            "SELECT name FROM drugs
             WHERE deleted_at IS NULL AND id <> :ignore
               AND LOWER(TRIM(generic_name)) = :generic
               AND REPLACE(LOWER(COALESCE(strength, '')), ' ', '') = :strength
               AND COALESCE(dosage_form_id, 0) = :form
               AND LOWER(TRIM(COALESCE(brand_name, ''))) = :brand
             LIMIT 1"
        );
        $stmt->execute([
            'ignore' => (int) $ignoreId,
            'generic' => mb_strtolower($values['generic_name']),
            'strength' => str_replace(' ', '', mb_strtolower((string) $values['strength'])),
            'form' => (int) $values['dosage_form_id'],
            'brand' => mb_strtolower((string) $values['brand_name'])
        ]);

        $duplicate = $stmt->fetchColumn();

        if ($duplicate !== false) {
            $errors['generic_name'] = "This drug is already registered as \"{$duplicate}\".";
        }

        foreach (['registration_number' => 'FDA registration number', 'barcode' => 'Barcode', 'ndc' => 'NDC'] as $field => $label) {
            if ($values[$field] === null) {
                continue;
            }

            $stmt = $db->prepare(
                "SELECT name FROM drugs WHERE deleted_at IS NULL AND id <> :ignore AND {$field} = :value LIMIT 1"
            );
            $stmt->execute(['ignore' => (int) $ignoreId, 'value' => $values[$field]]);
            $owner = $stmt->fetchColumn();

            if ($owner !== false) {
                $errors[$field] = "{$label} is already used by \"{$owner}\".";
            }
        }

        return $errors;
    }

    /**
     * "Paracetamol 500 mg Tablet (Biogesic)" -- stored in drugs.name so
     * every existing screen/report that shows d.name gets the full
     * description for free.
     */
    private function buildDisplayName(array $values): string
    {
        $parts = [$values['generic_name']];

        if ($values['strength'] !== null) {
            $parts[] = $values['strength'];
        }

        if ($values['dosage_form_id'] !== null) {
            $stmt = Database::connection()->prepare("SELECT name FROM dosage_forms WHERE id = :id");
            $stmt->execute(['id' => $values['dosage_form_id']]);
            $form = $stmt->fetchColumn();

            if ($form !== false && $form !== 'Other') {
                $parts[] = $form;
            }
        }

        $name = implode(' ', $parts);

        if ($values['brand_name'] !== null) {
            $name .= ' (' . $values['brand_name'] . ')';
        }

        return mb_substr($name, 0, 255);
    }

    private function lookupExists(string $table, int $id): bool
    {
        $stmt = Database::connection()->prepare("SELECT 1 FROM {$table} WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);

        return (bool) $stmt->fetchColumn();
    }

    private function countStockedLots(int $drugId): int
    {
        $stmt = Database::connection()->prepare(
            "SELECT COUNT(*) FROM drug_inventory_lots
             WHERE drug_id = :id AND deleted_at IS NULL AND is_active = 1 AND quantity_on_hand > 0"
        );
        $stmt->execute(['id' => $drugId]);

        return (int) $stmt->fetchColumn();
    }

    private function findLot(int $drugId, string $lotNumber, int $warehouseId, ?int $facilityId): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM drug_inventory_lots
             WHERE drug_id = :drug_id AND lot_number = :lot AND warehouse_id = :warehouse
               AND " . ($facilityId === null ? 'facility_id IS NULL' : 'facility_id = :facility') . "
               AND deleted_at IS NULL
             LIMIT 1"
        );

        $params = ['drug_id' => $drugId, 'lot' => $lotNumber, 'warehouse' => $warehouseId];

        if ($facilityId !== null) {
            $params['facility'] = $facilityId;
        }

        $stmt->execute($params);
        $lot = $stmt->fetch(PDO::FETCH_ASSOC);

        return $lot ?: null;
    }

    private function formatCatalogRow(array $r): array
    {
        $decimal = fn($v) => $v === null ? null : (float) $v;

        return [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'generic_name' => $r['generic_name'],
            'brand_name' => $r['brand_name'],
            'strength' => $r['strength'],
            'dosage_form_id' => $r['dosage_form_id'] !== null ? (int) $r['dosage_form_id'] : null,
            'dosage_form_name' => $r['dosage_form_name'] ?? $r['form'],
            'route_id' => $r['route_id'] !== null ? (int) $r['route_id'] : null,
            'route_name' => $r['route_name'] ?? $r['route'],
            'dispensing_unit_id' => $r['dispensing_unit_id'] !== null ? (int) $r['dispensing_unit_id'] : null,
            'dispensing_unit_name' => $r['dispensing_unit_name'] ?? $r['unit'],
            'package_unit_id' => $r['package_unit_id'] !== null ? (int) $r['package_unit_id'] : null,
            'package_unit_name' => $r['package_unit_name'],
            'package_quantity' => $decimal($r['package_quantity']),
            'category_id' => $r['category_id'] !== null ? (int) $r['category_id'] : null,
            'category_name' => $r['category_name'],
            'preferred_supplier_id' => $r['preferred_supplier_id'] !== null ? (int) $r['preferred_supplier_id'] : null,
            'preferred_supplier_name' => $r['preferred_supplier_name'],
            'manufacturer' => $r['manufacturer'],
            'registration_number' => $r['registration_number'],
            'barcode' => $r['barcode'],
            'ndc' => $r['ndc'],
            'rxcui' => $r['rxcui'],
            'product_type' => $r['product_type'],
            'controlled_class' => $r['controlled_class'],
            'requires_prescription' => (bool) $r['requires_prescription'],
            'storage_condition' => $r['storage_condition'],
            'is_high_alert' => (bool) $r['is_high_alert'],
            'is_lasa' => (bool) $r['is_lasa'],
            'unit_cost' => $decimal($r['unit_cost']),
            'selling_price' => $decimal($r['selling_price']),
            'on_order' => (float) $r['on_order'],
            'min_level_global' => (float) $r['min_level_global'],
            'max_level_global' => (float) $r['max_level_global'],
            'is_active' => (bool) $r['is_active'],
            'is_consumable' => (bool) $r['is_consumable'],
            'allow_inventory' => (bool) $r['allow_inventory'],
            'allow_multiple_lots' => (bool) $r['allow_multiple_lots'],
            'allow_combining_lots' => (bool) $r['allow_combining_lots'],
            'qoh' => (float) $r['qoh'],
            'lot_count' => (int) $r['lot_count'],
            'next_expiry' => $r['next_expiry']
        ];
    }

    private function isValidDate(string $value): bool
    {
        $date = \DateTime::createFromFormat('Y-m-d', $value);

        return $date !== false && $date->format('Y-m-d') === $value;
    }

    private function formatNumber(float $value): string
    {
        return rtrim(rtrim(number_format($value, 3, '.', ''), '0'), '.');
    }
}
