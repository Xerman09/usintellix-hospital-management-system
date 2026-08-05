<?php

namespace App\Modules\PatientOtherHistory\Services;

use App\Modules\PatientOtherHistory\Models\PatientOtherHistory;

class PatientOtherHistoryService
{
    private const FIELDS = ['name_1', 'value_1', 'name_2', 'value_2', 'additional_history'];

    /**
     * Get a patient's "Other" tab data. Returns an empty-field shape when
     * nothing has been recorded yet.
     */
    public function get(int $patientId): array
    {
        $record = (new PatientOtherHistory())->where('patient_id', $patientId)->first();

        if (!$record) {
            return array_fill_keys(self::FIELDS, null);
        }

        $result = [];

        foreach (self::FIELDS as $field) {
            $result[$field] = $record[$field];
        }

        return $result;
    }

    /**
     * Upsert a patient's "Other" tab data -- this is a single flat record
     * per patient, not a list, so update-if-exists/insert-if-not applies.
     */
    public function save(int $patientId, array $data, int $userId): array
    {
        $clean = $this->cleanData($data);

        $existing = (new PatientOtherHistory())->where('patient_id', $patientId)->first();

        if ($existing) {
            (new PatientOtherHistory())->update(array_merge($clean, [
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => $userId
            ]), (int) $existing['id']);
        } else {
            (new PatientOtherHistory())->create(array_merge($clean, [
                'patient_id' => $patientId,
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $userId
            ]));
        }

        return [
            'success' => true,
            'message' => 'Other history saved successfully.'
        ];
    }

    /**
     * Keep only recognized fields, converting blank strings to NULL.
     */
    private function cleanData(array $data): array
    {
        $clean = [];

        foreach (self::FIELDS as $field) {
            $value = trim((string) ($data[$field] ?? ''));
            $clean[$field] = $value === '' ? null : $value;
        }

        return $clean;
    }
}
