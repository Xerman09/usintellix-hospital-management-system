<?php

namespace App\Modules\Icd10Diagnoses\Services;

use App\Core\Database;
use App\Modules\Icd10Diagnoses\Models\Icd10Diagnosis;
use PDO;
use PDOException;
use Throwable;

class Icd10DiagnosisService
{
    /**
     * List all active (non-deleted) ICD10 diagnosis codes.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, code, description, created_at, updated_at
             FROM icd10_diagnoses
             WHERE deleted_at IS NULL
             ORDER BY code"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new ICD10 diagnosis code (admin-only).
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
            $id = (new Icd10Diagnosis())->create([
                'code'        => $data['code'],
                'description' => $data['description'],
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$id) {
                throw new \RuntimeException('Failed to create ICD10 diagnosis record.');
            }

            return [
                'success' => true,
                'message' => 'ICD10 diagnosis code created successfully.',
                'data' => [
                    'icd10_diagnosis_id' => $id
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['code' => 'An ICD10 code with this value already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create ICD10 diagnosis code.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create ICD10 diagnosis code.'
            ];
        }
    }

    /**
     * Update an existing ICD10 diagnosis code (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $record = (new Icd10Diagnosis())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'ICD10 diagnosis code not found.'
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
            $updated = (new Icd10Diagnosis())->update([
                'code'        => $data['code'],
                'description' => $data['description'],
                'updated_at'  => date('Y-m-d H:i:s'),
                'updated_by'  => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update ICD10 diagnosis code.'
                ];
            }

            return [
                'success' => true,
                'message' => 'ICD10 diagnosis code updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['code' => 'An ICD10 code with this value already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update ICD10 diagnosis code.'
            ];
        }
    }

    /**
     * Soft-delete an ICD10 diagnosis code (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = (new Icd10Diagnosis())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'ICD10 diagnosis code not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE icd10_diagnoses
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
            'message' => 'ICD10 diagnosis code deleted successfully.'
        ];
    }

    /**
     * Validate ICD10 diagnosis input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['code'])) {
            $errors['code'] = 'Code is required.';
        }

        if (empty($data['description'])) {
            $errors['description'] = 'Description is required.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $existing = (new Icd10Diagnosis())->where('code', $data['code'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['code'] = 'An ICD10 code with this value already exists.';
        }

        return $errors;
    }
}
