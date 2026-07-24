<?php

namespace App\Modules\Facilities\Services;

use App\Core\Database;
use App\Modules\Facilities\Models\Facility;
use App\Modules\OrganizationTypes\Models\OrganizationType;
use App\Modules\PosCodes\Models\PosCode;
use PDO;
use PDOException;
use Throwable;

class FacilityService
{
    private const FIELDS = [
        'name',
        'physical_address_line1', 'physical_city', 'physical_state', 'physical_zip', 'physical_country',
        'mailing_address_line1', 'mailing_city', 'mailing_state', 'mailing_zip', 'mailing_country',
        'phone', 'fax', 'website', 'email',
        'organization_type_id', 'iban', 'color', 'facility_taxonomy',
        'pos_code_id', 'billing_attn', 'clia_number', 'facility_lab_code',
        'tax_id_type', 'tax_id', 'oid', 'facility_npi',
        'is_billing_location', 'accepts_assignment', 'is_service_location',
        'is_primary_business_entity', 'is_inactive', 'info'
    ];

    private const BOOLEAN_FIELDS = [
        'is_billing_location', 'accepts_assignment', 'is_service_location',
        'is_primary_business_entity', 'is_inactive'
    ];

    private const FK_FIELDS = ['organization_type_id', 'pos_code_id'];

    /**
     * List all active (non-deleted) facilities, with related lookup names.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT f.*,
                    ot.name AS organization_type_name,
                    pc.code AS pos_code_code, pc.name AS pos_code_name
             FROM facilities f
             LEFT JOIN organization_types ot ON ot.id = f.organization_type_id
             LEFT JOIN pos_codes pc ON pc.id = f.pos_code_id
             WHERE f.deleted_at IS NULL
             ORDER BY f.name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new facility (admin-only).
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
            $facilityId = (new Facility())->create(array_merge(
                $this->prepareData($data),
                [
                    'created_at' => date('Y-m-d H:i:s'),
                    'created_by' => $createdBy
                ]
            ));

            if (!$facilityId) {
                throw new \RuntimeException('Failed to create facility record.');
            }

            return [
                'success' => true,
                'message' => 'Facility created successfully.',
                'data' => [
                    'facility_id' => $facilityId
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A facility with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create facility.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create facility.'
            ];
        }
    }

    /**
     * Update an existing facility (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $facility = (new Facility())->where('id', $id)->first();

        if (!$facility || $facility['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Facility not found.'
            ];
        }

        $errors = $this->validate($data, $id);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        try {
            $updated = (new Facility())->update(array_merge(
                $this->prepareData($data),
                [
                    'updated_at' => date('Y-m-d H:i:s'),
                    'updated_by' => $updatedBy
                ]
            ), $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update facility.'
                ];
            }

            return [
                'success' => true,
                'message' => 'Facility updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A facility with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update facility.'
            ];
        }
    }

    /**
     * Soft-delete a facility (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $facility = (new Facility())->where('id', $id)->first();

        if (!$facility || $facility['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Facility not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE facilities
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE id = :id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id'         => $id
        ]);

        return [
            'success' => true,
            'message' => 'Facility deleted successfully.'
        ];
    }

    /**
     * Normalize incoming data to only the persisted columns: booleans are
     * coerced to 0/1 (accepts_assignment forced off unless billing location
     * is on), blank FK selections become null.
     */
    private function prepareData(array $data): array
    {
        $prepared = [];
        $isBillingLocation = !empty($data['is_billing_location']) && $data['is_billing_location'] !== '0';

        foreach (self::FIELDS as $field) {
            $value = $data[$field] ?? null;

            if ($field === 'accepts_assignment') {
                $prepared[$field] = $isBillingLocation && !empty($value) && $value !== '0' ? 1 : 0;
                continue;
            }

            if (in_array($field, self::BOOLEAN_FIELDS, true)) {
                $prepared[$field] = !empty($value) && $value !== '0' ? 1 : 0;
                continue;
            }

            if (in_array($field, self::FK_FIELDS, true)) {
                $prepared[$field] = $value !== null && $value !== '' ? (int) $value : null;
                continue;
            }

            $prepared[$field] = $value !== null && $value !== '' ? $value : null;
        }

        return $prepared;
    }

    /**
     * Validate facility input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Facility name is required.';
        }

        if (empty($data['color'])) {
            $errors['color'] = 'Color is required.';
        } elseif (!preg_match('/^#[0-9A-Fa-f]{6}$/', $data['color'])) {
            $errors['color'] = 'Color must be a valid hex code (e.g. #4f46e5).';
        }

        if (!empty($data['tax_id_type']) && !in_array($data['tax_id_type'], ['EIN', 'SSN'], true)) {
            $errors['tax_id_type'] = 'Tax ID type must be EIN or SSN.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $existing = (new Facility())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A facility with this name already exists.';
        }

        if (!empty($data['organization_type_id'])) {
            $orgType = (new OrganizationType())->where('id', (int) $data['organization_type_id'])->first();

            if (!$orgType || $orgType['deleted_at'] !== null) {
                $errors['organization_type_id'] = 'Selected organization type does not exist.';
            }
        }

        if (!empty($data['pos_code_id'])) {
            $posCode = (new PosCode())->where('id', (int) $data['pos_code_id'])->first();

            if (!$posCode || $posCode['deleted_at'] !== null) {
                $errors['pos_code_id'] = 'Selected POS code does not exist.';
            }
        }

        return $errors;
    }
}
