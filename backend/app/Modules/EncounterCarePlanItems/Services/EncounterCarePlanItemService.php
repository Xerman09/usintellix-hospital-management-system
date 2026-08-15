<?php

namespace App\Modules\EncounterCarePlanItems\Services;

use App\Core\Database;
use App\Modules\EncounterCarePlanItems\Models\EncounterCarePlanItem;
use App\Modules\EncounterSections\Services\EncounterSectionService;
use PDO;

class EncounterCarePlanItemService
{
    private const DETAIL_FIELDS = [
        'author_name', 'item_type', 'code', 'code_text', 'description', 'item_date',
        'target_date', 'end_date', 'status',
        'reason_code', 'reason_status', 'reason_recording_date', 'reason_end_date'
    ];

    private EncounterSectionService $encounterSectionService;

    public function __construct()
    {
        $this->encounterSectionService = new EncounterSectionService();
    }

    public function list(int $encounterId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, encounter_id, author_name, item_type, code, code_text, description, item_date,
                    target_date, end_date, status,
                    reason_code, reason_status, reason_recording_date, reason_end_date, created_at
             FROM encounter_care_plan_items
             WHERE encounter_id = :encounter_id AND deleted_at IS NULL
             ORDER BY item_date DESC, id DESC"
        );
        $stmt->execute(['encounter_id' => $encounterId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function store(int $encounterId, array $data, int $createdBy): array
    {
        if ($this->encounterSectionService->isLocked($encounterId, 'care_plan')) {
            return [
                'success' => false,
                'message' => 'Care Plan Form is locked. Sign the section again to record further changes.'
            ];
        }

        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $values = $this->filterDetails($data);
        $values['encounter_id'] = $encounterId;
        $values['created_at'] = date('Y-m-d H:i:s');
        $values['created_by'] = $createdBy;

        $id = (new EncounterCarePlanItem())->create($values);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to add care plan item.'];
        }

        return ['success' => true, 'message' => 'Care plan item added successfully.', 'data' => ['id' => $id]];
    }

    public function update(int $id, array $data): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Care plan item not found.'];
        }

        if ($this->encounterSectionService->isLocked((int) $record['encounter_id'], 'care_plan')) {
            return [
                'success' => false,
                'message' => 'Care Plan Form is locked. Sign the section again to record further changes.'
            ];
        }

        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        (new EncounterCarePlanItem())->update($this->filterDetails($data), $id);

        return ['success' => true, 'message' => 'Care plan item updated successfully.'];
    }

    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Care plan item not found.'];
        }

        if ($this->encounterSectionService->isLocked((int) $record['encounter_id'], 'care_plan')) {
            return [
                'success' => false,
                'message' => 'Care Plan Form is locked. Sign the section again to record further changes.'
            ];
        }

        (new EncounterCarePlanItem())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return ['success' => true, 'message' => 'Care plan item removed successfully.'];
    }

    public function find(int $id): ?array
    {
        return (new EncounterCarePlanItem())->where('id', $id)->first();
    }

    private function validate(array $data): array
    {
        $errors = [];

        if (empty($data['item_type'])) {
            $errors['item_type'] = 'Type is required.';
        }

        if (empty($data['description'])) {
            $errors['description'] = 'Description is required.';
        }

        if (empty($data['item_date'])) {
            $errors['item_date'] = 'Date is required.';
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

            $result[$field] = $data[$field] === '' ? null : $data[$field];
        }

        if (empty($result['author_name'])) {
            $result['author_name'] = 'Unknown';
        }

        return $result;
    }
}
