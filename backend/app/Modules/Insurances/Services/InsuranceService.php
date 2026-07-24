<?php

namespace App\Modules\Insurances\Services;

use App\Core\Database;
use App\Modules\CqmSourceOfPayments\Models\CqmSourceOfPayment;
use App\Modules\Insurances\Models\Insurance;
use App\Modules\PayerTypes\Models\PayerType;
use App\Modules\X12Partners\Models\X12Partner;
use PDO;
use PDOException;
use Throwable;

class InsuranceService
{
    private const FIELDS = [
        'insurance_id', 'name', 'attention',
        'address_line1', 'address_line2', 'city', 'state', 'zip', 'country',
        'phone', 'payer_id', 'payer_type_id', 'x12_partner_id', 'cqm_source_of_payment_id'
    ];

    /**
     * List all active (non-deleted) insurances, with related lookup names.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT i.*,
                    pt.name AS payer_type_name,
                    xp.name AS x12_partner_name,
                    sop.name AS cqm_source_of_payment_name
             FROM insurances i
             LEFT JOIN payer_types pt ON pt.id = i.payer_type_id
             LEFT JOIN x12_partners xp ON xp.id = i.x12_partner_id
             LEFT JOIN cqm_source_of_payments sop ON sop.id = i.cqm_source_of_payment_id
             WHERE i.deleted_at IS NULL
             ORDER BY i.name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new insurance (admin-only).
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
            $insuranceId = (new Insurance())->create(array_merge(
                $this->prepareData($data),
                [
                    'created_at' => date('Y-m-d H:i:s'),
                    'created_by' => $createdBy
                ]
            ));

            if (!$insuranceId) {
                throw new \RuntimeException('Failed to create insurance record.');
            }

            return [
                'success' => true,
                'message' => 'Insurance created successfully.',
                'data' => [
                    'insurance_id' => $insuranceId
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['insurance_id' => 'An insurance with this Insurance ID already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create insurance.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create insurance.'
            ];
        }
    }

    /**
     * Update an existing insurance (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $insurance = (new Insurance())->where('id', $id)->first();

        if (!$insurance || $insurance['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Insurance not found.'
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
            $updated = (new Insurance())->update(array_merge(
                $this->prepareData($data),
                [
                    'updated_at' => date('Y-m-d H:i:s'),
                    'updated_by' => $updatedBy
                ]
            ), $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update insurance.'
                ];
            }

            return [
                'success' => true,
                'message' => 'Insurance updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['insurance_id' => 'An insurance with this Insurance ID already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update insurance.'
            ];
        }
    }

    /**
     * Soft-delete an insurance (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $insurance = (new Insurance())->where('id', $id)->first();

        if (!$insurance || $insurance['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Insurance not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE insurances
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
            'message' => 'Insurance deleted successfully.'
        ];
    }

    /**
     * Normalize incoming data to only the persisted columns, converting
     * blank optional FK selections to null.
     */
    private function prepareData(array $data): array
    {
        $prepared = [];

        foreach (self::FIELDS as $field) {
            $value = $data[$field] ?? null;

            if (in_array($field, ['payer_type_id', 'x12_partner_id', 'cqm_source_of_payment_id'], true)) {
                $prepared[$field] = $value !== null && $value !== '' ? (int) $value : null;
                continue;
            }

            $prepared[$field] = $value !== null && $value !== '' ? $value : null;
        }

        return $prepared;
    }

    /**
     * Validate insurance input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['insurance_id'])) {
            $errors['insurance_id'] = 'Insurance ID is required.';
        }

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $existing = (new Insurance())->where('insurance_id', $data['insurance_id'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['insurance_id'] = 'An insurance with this Insurance ID already exists.';
        }

        if (!empty($data['payer_type_id'])) {
            $payerType = (new PayerType())->where('id', (int) $data['payer_type_id'])->first();

            if (!$payerType || $payerType['deleted_at'] !== null) {
                $errors['payer_type_id'] = 'Selected payer type does not exist.';
            }
        }

        if (!empty($data['x12_partner_id'])) {
            $x12Partner = (new X12Partner())->where('id', (int) $data['x12_partner_id'])->first();

            if (!$x12Partner || $x12Partner['deleted_at'] !== null) {
                $errors['x12_partner_id'] = 'Selected X12 partner does not exist.';
            }
        }

        if (!empty($data['cqm_source_of_payment_id'])) {
            $sop = (new CqmSourceOfPayment())->where('id', (int) $data['cqm_source_of_payment_id'])->first();

            if (!$sop || $sop['deleted_at'] !== null) {
                $errors['cqm_source_of_payment_id'] = 'Selected CQM source of payment does not exist.';
            }
        }

        return $errors;
    }
}
