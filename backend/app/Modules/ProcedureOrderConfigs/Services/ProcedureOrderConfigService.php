<?php

namespace App\Modules\ProcedureOrderConfigs\Services;

use App\Core\Database;
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
            "SELECT id, parent_id, procedure_tier, name, description, sequence,
                    order_test_type, order_from, identifying_code, standard_code,
                    body_site, specimen_type, administer_via, laterality,
                    default_units, default_range, created_at, updated_at
             FROM procedure_order_configs
             WHERE deleted_at IS NULL
             ORDER BY parent_id IS NULL DESC, parent_id, sequence, name"
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
            'procedure_tier' => $tier,
            'name'           => $data['name'],
            'description'    => $data['description'] ?? null,
            'sequence'       => $data['sequence'] ?? 0
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
