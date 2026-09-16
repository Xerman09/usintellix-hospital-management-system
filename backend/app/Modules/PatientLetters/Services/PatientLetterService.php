<?php

namespace App\Modules\PatientLetters\Services;

use App\Modules\PatientLetters\Models\PatientLetter;

class PatientLetterService
{
    private const FIELDS = [
        'from_employee_id', 'from_name', 'to_employee_id', 'to_name',
        'specialty', 'template_filename', 'print_format', 'letter_date', 'body'
    ];

    public function create(int $patientId, array $data, int $createdBy): array
    {
        $letterDate = trim((string) ($data['letter_date'] ?? ''));

        if ($letterDate === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['letter_date' => 'A date is required.']];
        }

        $values = $this->filterFields($data);
        $values['patient_id'] = $patientId;
        $values['created_at'] = date('Y-m-d H:i:s');
        $values['created_by'] = $createdBy;

        $id = (new PatientLetter())->create($values);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to save letter.'];
        }

        return ['success' => true, 'message' => 'Letter saved.', 'data' => ['id' => $id]];
    }

    public function update(int $id, array $data, int $updatedBy): array
    {
        $letterDate = trim((string) ($data['letter_date'] ?? ''));

        if ($letterDate === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['letter_date' => 'A date is required.']];
        }

        $values = $this->filterFields($data);
        $values['updated_at'] = date('Y-m-d H:i:s');
        $values['updated_by'] = $updatedBy;

        (new PatientLetter())->update($values, $id);

        return ['success' => true, 'message' => 'Letter updated.', 'data' => ['id' => $id]];
    }

    public function find(int $id): ?array
    {
        return (new PatientLetter())->where('id', $id)->first();
    }

    private function filterFields(array $data): array
    {
        $values = [];

        foreach (self::FIELDS as $field) {
            $raw = $data[$field] ?? null;
            $values[$field] = ($raw === '' ? null : $raw);
        }

        $values['print_format'] = $values['print_format'] ?: 'html';

        return $values;
    }
}
