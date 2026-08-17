<?php

namespace App\Modules\EncounterClinicalNoteItems\Services;

use App\Core\Database;
use App\Modules\EncounterClinicalNoteItems\Models\EncounterClinicalNoteItem;
use App\Modules\EncounterSections\Services\EncounterSectionService;
use App\Modules\Employees\Models\Employee;
use App\Modules\Users\Models\User;
use PDO;

class EncounterClinicalNoteItemService
{
    private const DETAIL_FIELDS = ['note_type', 'category', 'narrative', 'note_date'];

    /**
     * Standard LOINC Document Ontology codes per note type, matching the
     * fixed set OpenEMR itself uses for its Clinical Notes form. There is
     * no LOINC catalog seeded anywhere in this app to look these up from.
     */
    private const LOINC_MAP = [
        'Evaluation Note' => '51848-0',
        'Progress Note' => '11506-3',
        'Nurse Note' => '34746-8',
        'History & Physical' => '34117-2',
        'General Note' => '34109-9',
        'Discharge Summary Note' => '18842-5',
        'Procedure Note' => '28570-0',
        'Consultation Note' => '11488-4',
        'Diagnostic imaging study' => '18748-4',
        'Laboratory Report Narrative' => '11502-2',
        'Pathology Report Narrative' => '11526-1',
        'Surgical operation note' => '11504-8',
        'Emergency department Note' => '34111-5'
    ];

    private EncounterSectionService $encounterSectionService;

    public function __construct()
    {
        $this->encounterSectionService = new EncounterSectionService();
    }

    public function list(int $encounterId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, encounter_id, author_name, note_date, note_type, category, code, narrative, created_at, updated_at
             FROM encounter_clinical_note_items
             WHERE encounter_id = :encounter_id AND deleted_at IS NULL
             ORDER BY note_date DESC, id DESC"
        );
        $stmt->execute(['encounter_id' => $encounterId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function store(int $encounterId, array $data, int $createdBy): array
    {
        if ($this->encounterSectionService->isLocked($encounterId, 'clinical_notes')) {
            return [
                'success' => false,
                'message' => 'Clinical Notes Form is locked. Sign the section again to record further changes.'
            ];
        }

        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $values = $this->filterDetails($data);
        $values['encounter_id'] = $encounterId;
        $values['author_name'] = $this->resolveAuthorName($createdBy);
        $values['code'] = $this->deriveLoincCode($values['note_type'] ?? null);
        $values['created_at'] = date('Y-m-d H:i:s');
        $values['created_by'] = $createdBy;

        $id = (new EncounterClinicalNoteItem())->create($values);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to add clinical note.'];
        }

        return ['success' => true, 'message' => 'Clinical note added successfully.', 'data' => ['id' => $id]];
    }

    public function update(int $id, array $data, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Clinical note not found.'];
        }

        if ($this->encounterSectionService->isLocked((int) $record['encounter_id'], 'clinical_notes')) {
            return [
                'success' => false,
                'message' => 'Clinical Notes Form is locked. Sign the section again to record further changes.'
            ];
        }

        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $values = $this->filterDetails($data);
        $values['code'] = $this->deriveLoincCode($values['note_type'] ?? null);
        $values['updated_at'] = date('Y-m-d H:i:s');
        $values['updated_by'] = $updatedBy;

        (new EncounterClinicalNoteItem())->update($values, $id);

        return ['success' => true, 'message' => 'Clinical note updated successfully.'];
    }

    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Clinical note not found.'];
        }

        if ($this->encounterSectionService->isLocked((int) $record['encounter_id'], 'clinical_notes')) {
            return [
                'success' => false,
                'message' => 'Clinical Notes Form is locked. Sign the section again to record further changes.'
            ];
        }

        (new EncounterClinicalNoteItem())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return ['success' => true, 'message' => 'Clinical note removed successfully.'];
    }

    public function find(int $id): ?array
    {
        return (new EncounterClinicalNoteItem())->where('id', $id)->first();
    }

    private function deriveLoincCode(?string $noteType): ?string
    {
        if (!$noteType || !isset(self::LOINC_MAP[$noteType])) {
            return null;
        }

        return 'LOINC:' . self::LOINC_MAP[$noteType];
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

        if (empty($data['note_type'])) {
            $errors['note_type'] = 'Type is required.';
        }

        if (empty($data['narrative'])) {
            $errors['narrative'] = 'Narrative is required.';
        }

        if (empty($data['note_date'])) {
            $errors['note_date'] = 'Date is required.';
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

        return $result;
    }
}
