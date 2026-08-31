<?php

namespace App\Modules\Holidays\Services;

use App\Core\Database;
use App\Modules\Holidays\Models\Holiday;
use PDO;
use Throwable;

class HolidayService
{
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, holiday_date, recurs_yearly, description, created_at, updated_at
             FROM holidays
             WHERE deleted_at IS NULL
             ORDER BY holiday_date"
        );

        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function register(array $data, int $createdBy): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        try {
            $holidayId = (new Holiday())->create([
                'name'          => $data['name'],
                'holiday_date'  => $data['holiday_date'],
                'recurs_yearly' => !empty($data['recurs_yearly']) ? 1 : 0,
                'description'   => $data['description'] ?? null,
                'created_at'    => date('Y-m-d H:i:s'),
                'created_by'    => $createdBy
            ]);

            if (!$holidayId) {
                throw new \RuntimeException('Failed to create holiday record.');
            }

            return ['success' => true, 'message' => 'Holiday created successfully.', 'data' => ['holiday_id' => $holidayId]];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to create holiday.'];
        }
    }

    public function update(int $id, array $data, int $updatedBy): array
    {
        $holiday = (new Holiday())->where('id', $id)->first();

        if (!$holiday || $holiday['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Holiday not found.'];
        }

        $errors = $this->validate($data, $id);
        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $updated = (new Holiday())->update([
            'name'          => $data['name'],
            'holiday_date'  => $data['holiday_date'],
            'recurs_yearly' => !empty($data['recurs_yearly']) ? 1 : 0,
            'description'   => $data['description'] ?? null,
            'updated_at'    => date('Y-m-d H:i:s'),
            'updated_by'    => $updatedBy
        ], $id);

        if (!$updated) {
            return ['success' => false, 'message' => 'Failed to update holiday.'];
        }

        return ['success' => true, 'message' => 'Holiday updated successfully.'];
    }

    public function remove(int $id, int $deletedBy): array
    {
        $holiday = (new Holiday())->where('id', $id)->first();

        if (!$holiday || $holiday['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Holiday not found.'];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE holidays
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE id = :id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id'         => $id
        ]);

        return ['success' => true, 'message' => 'Holiday deleted successfully.'];
    }

    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
        }

        if (empty($data['holiday_date'])) {
            $errors['holiday_date'] = 'Date is required.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $existing = (new Holiday())->where('name', $data['name'])->where('holiday_date', $data['holiday_date'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A holiday with this name and date already exists.';
        }

        return $errors;
    }
}
