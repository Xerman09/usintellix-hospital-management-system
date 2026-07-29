<?php

namespace App\Modules\PatientHealthConcerns\Services;

use App\Core\Database;
use App\Modules\PatientHealthConcerns\Models\PatientHealthConcern;
use PDO;

class PatientHealthConcernService
{
    /**
     * Detail fields that can be set on a patient health concern record,
     * beyond the patient link itself.
     */
    private const DETAIL_FIELDS = [
        'title', 'begin_date', 'end_date', 'comments', 'coding',
        'occurrence', 'outcome', 'classification_type', 'verification_status',
        'referred_by', 'destination'
    ];

    /**
     * List a patient's recorded health concerns.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, patient_id, title, begin_date, end_date, comments, coding,
                    occurrence, outcome, classification_type, verification_status,
                    referred_by, destination, created_at
             FROM patient_health_concerns
             WHERE patient_id = :patient_id AND deleted_at IS NULL
             ORDER BY title"
        );

        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Record a health concern for a patient.
     */
    public function store(int $patientId, int $createdBy, array $details = []): array
    {
        $title = trim((string) ($details['title'] ?? ''));

        if ($title === '') {
            return [
                'success' => false,
                'message' => 'Title is required.'
            ];
        }

        $data = $this->filterDetails($details);
        $data['title'] = $title;
        $data['patient_id'] = $patientId;
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = $createdBy;

        $id = (new PatientHealthConcern())->create($data);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record health concern.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Health concern added successfully.',
            'data' => ['id' => $id]
        ];
    }

    /**
     * Update the detail fields on an existing patient health concern record.
     */
    public function update(int $id, array $details, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Health concern record not found.'
            ];
        }

        $title = trim((string) ($details['title'] ?? ''));

        if ($title === '') {
            return [
                'success' => false,
                'message' => 'Title is required.'
            ];
        }

        $data = $this->filterDetails($details);
        $data['title'] = $title;
        $data['updated_at'] = date('Y-m-d H:i:s');
        $data['updated_by'] = $updatedBy;

        (new PatientHealthConcern())->update($data, $id);

        return [
            'success' => true,
            'message' => 'Health concern updated successfully.'
        ];
    }

    /**
     * Keep only recognized detail fields, converting empty strings to NULL.
     */
    private function filterDetails(array $details): array
    {
        $result = [];

        foreach (self::DETAIL_FIELDS as $field) {
            if ($field === 'title') {
                continue;
            }

            if (array_key_exists($field, $details)) {
                $result[$field] = $details[$field] === '' ? null : $details[$field];
            }
        }

        return $result;
    }

    public function find(int $id): ?array
    {
        return (new PatientHealthConcern())->where('id', $id)->first();
    }

    /**
     * Soft-delete a recorded patient health concern.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Health concern record not found.'
            ];
        }

        (new PatientHealthConcern())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Health concern removed successfully.'
        ];
    }
}
