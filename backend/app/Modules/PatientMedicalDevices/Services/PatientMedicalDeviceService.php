<?php

namespace App\Modules\PatientMedicalDevices\Services;

use App\Core\Database;
use App\Modules\PatientMedicalDevices\Models\PatientMedicalDevice;
use PDO;

class PatientMedicalDeviceService
{
    /**
     * Detail fields that can be set on a patient medical device record,
     * beyond the patient link itself.
     */
    private const DETAIL_FIELDS = [
        'title', 'begin_date', 'end_date', 'udi', 'comments', 'coding',
        'occurrence', 'outcome', 'classification_type', 'verification_status',
        'referred_by', 'destination'
    ];

    /**
     * List a patient's recorded medical devices.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, patient_id, title, begin_date, end_date, udi, comments, coding,
                    occurrence, outcome, classification_type, verification_status,
                    referred_by, destination, created_at
             FROM patient_medical_devices
             WHERE patient_id = :patient_id AND deleted_at IS NULL
             ORDER BY title"
        );

        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Record a medical device for a patient.
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

        $id = (new PatientMedicalDevice())->create($data);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record medical device.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Medical device added successfully.',
            'data' => ['id' => $id]
        ];
    }

    /**
     * Update the detail fields on an existing patient medical device record.
     */
    public function update(int $id, array $details, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Medical device record not found.'
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

        (new PatientMedicalDevice())->update($data, $id);

        return [
            'success' => true,
            'message' => 'Medical device updated successfully.'
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
        return (new PatientMedicalDevice())->where('id', $id)->first();
    }

    /**
     * Soft-delete a recorded patient medical device.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Medical device record not found.'
            ];
        }

        (new PatientMedicalDevice())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Medical device removed successfully.'
        ];
    }
}
