<?php

namespace App\Modules\PatientSurgeries\Services;

use App\Core\Database;
use App\Modules\Surgeries\Models\Surgery;
use App\Modules\PatientSurgeries\Models\PatientSurgery;
use PDO;

class PatientSurgeryService
{
    /**
     * Detail fields that can be set on a patient surgery record, beyond
     * the patient/surgery link itself.
     */
    private const DETAIL_FIELDS = [
        'title', 'begin_date', 'end_date', 'comments', 'coding',
        'occurrence', 'outcome', 'classification_type', 'verification_status',
        'referred_by', 'destination'
    ];

    /**
     * List a patient's recorded surgeries.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, patient_id, surgery_id, title, begin_date, end_date, comments, coding,
                    occurrence, outcome, classification_type, verification_status,
                    referred_by, destination, created_at
             FROM patient_surgeries
             WHERE patient_id = :patient_id AND deleted_at IS NULL
             ORDER BY title"
        );

        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Record a surgery for a patient. The surgery may optionally reference
     * the surgeries catalog; the title is always stored directly since it
     * may be freely typed instead of catalog-selected.
     */
    public function store(int $patientId, ?int $surgeryId, int $createdBy, array $details = []): array
    {
        $title = trim((string) ($details['title'] ?? ''));

        if ($title === '') {
            return [
                'success' => false,
                'message' => 'Title is required.'
            ];
        }

        if ($surgeryId) {
            $surgery = (new Surgery())->where('id', $surgeryId)->first();

            if (!$surgery || $surgery['deleted_at'] !== null) {
                return [
                    'success' => false,
                    'message' => 'Selected surgery does not exist.'
                ];
            }
        }

        $data = $this->filterDetails($details);
        $data['title'] = $title;
        $data['patient_id'] = $patientId;
        $data['surgery_id'] = $surgeryId ?: null;
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = $createdBy;

        $id = (new PatientSurgery())->create($data);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record surgery.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Surgery added successfully.',
            'data' => ['id' => $id]
        ];
    }

    /**
     * Update the detail fields on an existing patient surgery record.
     */
    public function update(int $id, array $details, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Surgery record not found.'
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

        (new PatientSurgery())->update($data, $id);

        return [
            'success' => true,
            'message' => 'Surgery updated successfully.'
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
        return (new PatientSurgery())->where('id', $id)->first();
    }

    /**
     * Soft-delete a recorded patient surgery.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Surgery record not found.'
            ];
        }

        (new PatientSurgery())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Surgery removed successfully.'
        ];
    }
}
