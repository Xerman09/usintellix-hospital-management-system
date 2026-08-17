<?php

namespace App\Modules\EncounterFunctionalCognitiveStatusItems\Services;

use App\Core\Database;
use App\Modules\EncounterFunctionalCognitiveStatusItems\Models\EncounterFunctionalCognitiveStatusItem;
use App\Modules\EncounterSections\Services\EncounterSectionService;
use App\Modules\Employees\Models\Employee;
use App\Modules\Users\Models\User;
use PDO;

class EncounterFunctionalCognitiveStatusItemService
{
    private const DETAIL_FIELDS = ['code', 'code_text', 'for_mental_status', 'description', 'item_date'];

    private EncounterSectionService $encounterSectionService;

    public function __construct()
    {
        $this->encounterSectionService = new EncounterSectionService();
    }

    public function list(int $encounterId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, encounter_id, author_name, code, code_text, for_mental_status, description, item_date, created_at, updated_at
             FROM encounter_functional_cognitive_status_items
             WHERE encounter_id = :encounter_id AND deleted_at IS NULL
             ORDER BY item_date DESC, id DESC"
        );
        $stmt->execute(['encounter_id' => $encounterId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function store(int $encounterId, array $data, int $createdBy): array
    {
        if ($this->encounterSectionService->isLocked($encounterId, 'functional_cognitive_status')) {
            return [
                'success' => false,
                'message' => 'Functional and Cognitive Status Form is locked. Sign the section again to record further changes.'
            ];
        }

        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $values = $this->filterDetails($data);
        $values['encounter_id'] = $encounterId;
        $values['author_name'] = $this->resolveAuthorName($createdBy);
        $values['created_at'] = date('Y-m-d H:i:s');
        $values['created_by'] = $createdBy;

        $id = (new EncounterFunctionalCognitiveStatusItem())->create($values);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to add item.'];
        }

        return ['success' => true, 'message' => 'Item added successfully.', 'data' => ['id' => $id]];
    }

    public function update(int $id, array $data, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Item not found.'];
        }

        if ($this->encounterSectionService->isLocked((int) $record['encounter_id'], 'functional_cognitive_status')) {
            return [
                'success' => false,
                'message' => 'Functional and Cognitive Status Form is locked. Sign the section again to record further changes.'
            ];
        }

        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $values = $this->filterDetails($data);
        $values['updated_at'] = date('Y-m-d H:i:s');
        $values['updated_by'] = $updatedBy;

        (new EncounterFunctionalCognitiveStatusItem())->update($values, $id);

        return ['success' => true, 'message' => 'Item updated successfully.'];
    }

    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Item not found.'];
        }

        if ($this->encounterSectionService->isLocked((int) $record['encounter_id'], 'functional_cognitive_status')) {
            return [
                'success' => false,
                'message' => 'Functional and Cognitive Status Form is locked. Sign the section again to record further changes.'
            ];
        }

        (new EncounterFunctionalCognitiveStatusItem())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return ['success' => true, 'message' => 'Item removed successfully.'];
    }

    public function find(int $id): ?array
    {
        return (new EncounterFunctionalCognitiveStatusItem())->where('id', $id)->first();
    }

    private function resolveAuthorName(int $userId): string
    {
        $employee = (new Employee())->where('user_id', $userId)->first();

        if ($employee) {
            $firstName = trim((string) $employee['first_name']);
            $lastName = trim((string) $employee['last_name']);

            if (strcasecmp($firstName, $lastName) === 0) {
                return $firstName !== '' ? $firstName : 'Unknown';
            }

            $name = trim($firstName . ' ' . $lastName);

            if ($name !== '') {
                return $name;
            }
        }

        $user = (new User())->where('id', $userId)->first();

        return $user['username'] ?? 'Unknown';
    }

    private function validate(array $data): array
    {
        $errors = [];

        if (empty($data['description'])) {
            $errors['description'] = 'Description is required.';
        }

        return $errors;
    }

    private function filterDetails(array $data): array
    {
        $result = [];

        foreach (self::DETAIL_FIELDS as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }

            if ($field === 'for_mental_status') {
                $result[$field] = $data[$field] ? 1 : 0;
                continue;
            }

            $result[$field] = $data[$field] === '' ? null : $data[$field];
        }

        return $result;
    }
}
