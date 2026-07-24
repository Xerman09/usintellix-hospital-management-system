<?php

namespace App\Modules\MedicalProblems\Services;

use App\Core\Database;
use App\Modules\MedicalProblems\Models\MedicalProblem;
use PDO;
use PDOException;
use Throwable;

class MedicalProblemService
{
    /**
     * List all active (non-deleted) medical problems.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM medical_problems
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new medical problem (admin-only).
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
            $problemId = (new MedicalProblem())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$problemId) {
                throw new \RuntimeException('Failed to create medical problem record.');
            }

            return [
                'success' => true,
                'message' => 'Medical problem created successfully.',
                'data' => [
                    'medical_problem_id' => $problemId
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A medical problem with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create medical problem.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create medical problem.'
            ];
        }
    }

    /**
     * Update an existing medical problem (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $problem = (new MedicalProblem())->where('id', $id)->first();

        if (!$problem || $problem['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Medical problem not found.'
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
            $updated = (new MedicalProblem())->update([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'updated_at'  => date('Y-m-d H:i:s'),
                'updated_by'  => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update medical problem.'
                ];
            }

            return [
                'success' => true,
                'message' => 'Medical problem updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A medical problem with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update medical problem.'
            ];
        }
    }

    /**
     * Soft-delete a medical problem (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $problem = (new MedicalProblem())->where('id', $id)->first();

        if (!$problem || $problem['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Medical problem not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE medical_problems
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
            'message' => 'Medical problem deleted successfully.'
        ];
    }

    /**
     * Validate medical problem input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new MedicalProblem())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A medical problem with this name already exists.';
        }

        return $errors;
    }
}
