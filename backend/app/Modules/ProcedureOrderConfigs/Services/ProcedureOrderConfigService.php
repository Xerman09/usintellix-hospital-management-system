<?php

namespace App\Modules\ProcedureOrderConfigs\Services;

use App\Core\Database;
use App\Modules\Facilities\Models\Facility;
use App\Modules\ProcedureOrderConfigs\Models\ProcedureOrderConfig;
use PDO;
use Throwable;

class ProcedureOrderConfigService
{
    /**
     * The six node types the "Configure Orders and Results" tree supports,
     * mirroring OpenEMR's "Procedure Tier" selector.
     */
    public const TIERS = [
        'group', 'procedure_order', 'discrete_result',
        'recommendation', 'custom_favorite_group', 'custom_favorite_item'
    ];

    /**
     * Which tier(s) a node of a given tier is allowed to nest under.
     * A tier not listed here (or listed with an empty array) can only
     * ever be a leaf's child -- i.e. it has no valid children of its own.
     */
    private const ALLOWED_PARENT_TIERS = [
        'group'                 => ['group'],
        'procedure_order'       => ['group'],
        'discrete_result'       => ['procedure_order'],
        'recommendation'        => ['procedure_order'],
        'custom_favorite_group' => ['custom_favorite_group'],
        'custom_favorite_item'  => ['custom_favorite_group']
    ];

    /**
     * Which tiers may exist with no parent at all (top-level).
     */
    private const TOP_LEVEL_TIERS = ['group', 'procedure_order', 'custom_favorite_group'];

    public const ORDER_TEST_TYPES = ['Laboratory', 'Procedure', 'Imaging', 'Ancillary'];
    public const ORDER_FROM_OPTIONS = ['Internal', 'External Lab', 'Radiology Department', 'Reference Lab'];
    public const BODY_SITE_OPTIONS = ['Not Applicable', 'Head', 'Neck', 'Chest', 'Abdomen', 'Pelvis', 'Upper Extremity', 'Lower Extremity', 'Spine', 'Whole Body'];
    public const SPECIMEN_TYPE_OPTIONS = ['Not Applicable', 'Blood', 'Urine', 'Serum', 'Plasma', 'Tissue', 'Swab', 'Sputum', 'Stool', 'CSF'];
    public const ADMINISTER_VIA_OPTIONS = ['Not Applicable', 'Oral', 'IV', 'IM', 'Subcutaneous', 'Topical'];
    public const LATERALITY_OPTIONS = ['Not Applicable', 'Left', 'Right', 'Bilateral'];
    public const DEFAULT_UNITS_OPTIONS = ['Not Applicable', 'mg/dL', 'mmol/L', 'g/dL', '%', 'IU/L', 'mL'];

    /**
     * List all active (non-deleted) order/result config rows, flat.
     * The frontend nests them into a tree using parent_id.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT poc.id, poc.parent_id, poc.procedure_tier, poc.name, poc.description, poc.sequence,
                    poc.order_test_type, poc.order_from, poc.identifying_code, poc.standard_code,
                    poc.body_site, poc.specimen_type, poc.administer_via, poc.laterality,
                    poc.default_units, poc.default_range, poc.source_facility_id,
                    f.name AS source_facility_name,
                    poc.created_at, poc.updated_at
             FROM procedure_order_configs poc
             LEFT JOIN facilities f ON f.id = poc.source_facility_id
             WHERE poc.deleted_at IS NULL
             ORDER BY poc.parent_id IS NULL DESC, poc.parent_id, poc.sequence, poc.name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Create a new top-level or child order/result config row.
     */
    public function register(array $data, int $createdBy): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        try {
            $configId = (new ProcedureOrderConfig())->create($this->payload($data, [
                'parent_id'  => $data['parent_id'] ?? null,
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $createdBy
            ]));

            if (!$configId) {
                throw new \RuntimeException('Failed to create order/result config record.');
            }

            return [
                'success' => true,
                'message' => 'Order/result item created successfully.',
                'data' => [
                    'procedure_order_config_id' => $configId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create order/result item.'
            ];
        }
    }

    /**
     * Update an existing order/result config row. The parent and tier
     * cannot be changed here -- both are only set once, at creation,
     * since changing either would require re-validating the whole subtree.
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $config = (new ProcedureOrderConfig())->where('id', $id)->first();

        if (!$config || $config['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Order/result item not found.'
            ];
        }

        $data['procedure_tier'] = $config['procedure_tier'];
        $data['parent_id'] = $config['parent_id'];
        $data['source_facility_id'] = $config['source_facility_id'];

        $errors = $this->validate($data, skipParentCheck: true);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $updated = (new ProcedureOrderConfig())->update($this->payload($data, [
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $updatedBy
        ]), $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update order/result item.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Order/result item updated successfully.'
        ];
    }

    /**
     * Soft-delete an order/result config row along with all of its
     * descendants (soft-deletes don't trigger the DB's ON DELETE CASCADE,
     * so the subtree is walked and marked deleted manually).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $config = (new ProcedureOrderConfig())->where('id', $id)->first();

        if (!$config || $config['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Order/result item not found.'
            ];
        }

        $idsToDelete = $this->collectSubtreeIds($id);

        $placeholders = implode(',', array_fill(0, count($idsToDelete), '?'));

        $stmt = Database::connection()->prepare(
            "UPDATE procedure_order_configs
             SET deleted_at = ?, deleted_by = ?
             WHERE id IN ({$placeholders})"
        );

        $stmt->execute(array_merge([date('Y-m-d H:i:s'), $deletedBy], $idsToDelete));

        return [
            'success' => true,
            'message' => 'Order/result item deleted successfully.'
        ];
    }

    /**
     * The CSV columns "Load Order Definitions" expects, in order.
     * Only "name" is required -- everything else is optional per row.
     */
    public const COMPENDIUM_COLUMNS = [
        'name', 'order_test_type', 'identifying_code', 'standard_code',
        'body_site', 'specimen_type', 'administer_via', 'laterality',
        'description', 'sequence'
    ];

    /**
     * Bulk-create Procedure Order rows from an uploaded CSV file (the
     * "Load Lab Compendium" > "Load Order Definitions" action). Each
     * data row becomes one Procedure Order nested under the chosen
     * container Group, tagged with the vendor facility it came from.
     * Rows are processed independently -- a bad row is skipped and
     * reported rather than aborting the whole file.
     */
    public function loadCompendium(array $file, int $vendorFacilityId, int $containerGroupId, int $createdBy): array
    {
        if (empty($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return [
                'success' => false,
                'message' => 'No file was uploaded.'
            ];
        }

        $vendor = (new Facility())->where('id', $vendorFacilityId)->first();

        if (!$vendor || $vendor['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Selected vendor was not found.'
            ];
        }

        $containerGroup = (new ProcedureOrderConfig())->where('id', $containerGroupId)->first();

        if (!$containerGroup || $containerGroup['deleted_at'] !== null || $containerGroup['procedure_tier'] !== 'group') {
            return [
                'success' => false,
                'message' => 'Selected container group was not found.'
            ];
        }

        $handle = fopen($file['tmp_name'], 'r');

        if (!$handle) {
            return [
                'success' => false,
                'message' => 'Unable to read the uploaded file.'
            ];
        }

        $header = fgetcsv($handle);

        if ($header === false) {
            fclose($handle);

            return [
                'success' => false,
                'message' => 'The uploaded file is empty.'
            ];
        }

        $columnIndex = [];

        foreach ($header as $index => $columnName) {
            $columnIndex[strtolower(trim($columnName))] = $index;
        }

        if (!isset($columnIndex['name'])) {
            fclose($handle);

            return [
                'success' => false,
                'message' => 'The file is missing a required "name" column. Expected columns: ' . implode(', ', self::COMPENDIUM_COLUMNS)
            ];
        }

        $created = 0;
        $failed = [];
        $rowNumber = 1;

        while (($row = fgetcsv($handle)) !== false) {
            $rowNumber++;

            $value = fn(string $column) => isset($columnIndex[$column], $row[$columnIndex[$column]])
                ? trim((string) $row[$columnIndex[$column]])
                : '';

            $name = $value('name');

            if ($name === '') {
                continue;
            }

            $data = [
                'procedure_tier'     => 'procedure_order',
                'parent_id'          => $containerGroupId,
                'source_facility_id' => $vendorFacilityId,
                'name'               => $name,
                'order_test_type'    => $value('order_test_type') !== '' ? $value('order_test_type') : 'Laboratory',
                'identifying_code'   => $value('identifying_code') ?: null,
                'standard_code'      => $value('standard_code') ?: null,
                'body_site'          => $value('body_site') ?: null,
                'specimen_type'      => $value('specimen_type') ?: null,
                'administer_via'     => $value('administer_via') ?: null,
                'laterality'         => $value('laterality') ?: null,
                'description'        => $value('description') ?: null,
                'sequence'           => $value('sequence') !== '' ? $value('sequence') : 0
            ];

            $result = $this->register($data, $createdBy);

            if ($result['success']) {
                $created++;
            } else {
                $failed[] = [
                    'row'    => $rowNumber,
                    'name'   => $name,
                    'errors' => $result['errors'] ?? ['general' => $result['message']]
                ];
            }
        }

        fclose($handle);

        return [
            'success' => true,
            'message' => "Loaded {$created} order definition(s)" . (!empty($failed) ? ', ' . count($failed) . ' row(s) failed.' : '.'),
            'data' => [
                'created' => $created,
                'failed'  => $failed
            ]
        ];
    }

    /**
     * Walk the tree (breadth-first) from the given id and collect every
     * active descendant's id, including the starting id itself.
     */
    private function collectSubtreeIds(int $id): array
    {
        $ids = [$id];
        $frontier = [$id];

        $stmt = Database::connection()->prepare(
            "SELECT id FROM procedure_order_configs WHERE parent_id = ? AND deleted_at IS NULL"
        );

        while (!empty($frontier)) {
            $parentId = array_shift($frontier);

            $stmt->execute([$parentId]);
            $children = $stmt->fetchAll(PDO::FETCH_COLUMN);

            foreach ($children as $childId) {
                $childId = (int) $childId;
                $ids[] = $childId;
                $frontier[] = $childId;
            }
        }

        return $ids;
    }

    /**
     * Build the DB payload for create/update, keeping only the fields
     * relevant to the row's tier (irrelevant fields are stored as null
     * so stale values from a previous tier-specific edit never linger).
     */
    private function payload(array $data, array $extra): array
    {
        $tier = $data['procedure_tier'];

        $fieldsByTier = [
            'order_test_type' => ['procedure_order'],
            'order_from'      => ['procedure_order', 'custom_favorite_group', 'custom_favorite_item'],
            'identifying_code' => ['procedure_order', 'discrete_result', 'recommendation', 'custom_favorite_group', 'custom_favorite_item'],
            'standard_code'   => ['procedure_order', 'custom_favorite_item'],
            'body_site'       => ['procedure_order', 'custom_favorite_item'],
            'specimen_type'   => ['procedure_order', 'custom_favorite_item'],
            'administer_via'  => ['procedure_order', 'custom_favorite_item'],
            'laterality'      => ['procedure_order', 'custom_favorite_item'],
            'default_units'   => ['discrete_result', 'recommendation'],
            'default_range'   => ['discrete_result', 'recommendation']
        ];

        $payload = [
            'procedure_tier'     => $tier,
            'name'               => $data['name'],
            'description'        => $data['description'] ?? null,
            'sequence'           => $data['sequence'] ?? 0,
            'source_facility_id' => $data['source_facility_id'] ?? null
        ];

        foreach ($fieldsByTier as $field => $applicableTiers) {
            $payload[$field] = in_array($tier, $applicableTiers, true) ? ($data[$field] ?? null) : null;
        }

        return array_merge($payload, $extra);
    }

    /**
     * Validate order/result config input, including the tier-specific
     * required/allowed fields and the parent/child tier nesting rules.
     */
    private function validate(array $data, bool $skipParentCheck = false): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
        }

        $tier = $data['procedure_tier'] ?? '';

        if (empty($tier) || !in_array($tier, self::TIERS, true)) {
            $errors['procedure_tier'] = 'A valid procedure tier is required.';
            return $errors;
        }

        if (isset($data['sequence']) && $data['sequence'] !== '' && $data['sequence'] !== null && !is_numeric($data['sequence'])) {
            $errors['sequence'] = 'Sequence must be a number.';
        }

        if ($tier === 'procedure_order' && empty($data['order_test_type'])) {
            $errors['order_test_type'] = 'Order Test Type is required for a Procedure Order.';
        }

        // Note: order_test_type/order_from/body_site/specimen_type/administer_via/
        // laterality/default_units are curated suggestion lists, not enums -- the
        // frontend offers an "Other" choice that lets the user type any value,
        // so no membership check is enforced here.

        if (!$skipParentCheck) {
            $parentId = $data['parent_id'] ?? null;

            if (empty($parentId)) {
                if (!in_array($tier, self::TOP_LEVEL_TIERS, true)) {
                    $errors['procedure_tier'] = 'This tier cannot be a top-level item -- it must be added under a parent.';
                }
            } else {
                $parent = (new ProcedureOrderConfig())->where('id', $parentId)->first();

                if (!$parent || $parent['deleted_at'] !== null) {
                    $errors['parent_id'] = 'Parent item not found.';
                } else {
                    $allowedParentTiers = self::ALLOWED_PARENT_TIERS[$tier] ?? [];

                    if (!in_array($parent['procedure_tier'], $allowedParentTiers, true)) {
                        $errors['procedure_tier'] = 'This tier cannot be nested under the selected parent.';
                    }
                }
            }
        }

        return $errors;
    }
}
