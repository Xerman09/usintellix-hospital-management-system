<?php

namespace App\Modules\PatientPrescriptions\Services;

use App\Core\Database;
use App\Modules\Medications\Models\Medication;
use App\Modules\PatientPrescriptions\Models\PatientPrescription;
use PDO;

class PatientPrescriptionService
{
    /**
     * Detail fields that can be set on a patient prescription record,
     * beyond the patient/medication link itself.
     */
    private const DETAIL_FIELDS = [
        'title', 'begin_date', 'end_date', 'quantity', 'dosage', 'route',
        'frequency', 'refills', 'directions', 'substitution_allowed', 'pharmacy',
        'comments', 'coding', 'occurrence', 'outcome', 'classification_type',
        'verification_status', 'referred_by', 'destination'
    ];

    /**
     * List a patient's recorded prescriptions.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, patient_id, medication_id, title, begin_date, end_date,
                    quantity, dosage, route, frequency, refills, directions,
                    substitution_allowed, pharmacy, comments, coding,
                    occurrence, outcome, classification_type, verification_status,
                    referred_by, destination, created_at
             FROM patient_prescriptions
             WHERE patient_id = :patient_id AND deleted_at IS NULL
             ORDER BY title"
        );

        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Record a prescription for a patient. The drug may optionally reference
     * the medications catalog; the title is always stored directly since it
     * may be freely typed instead of catalog-selected.
     */
    public function store(int $patientId, ?int $medicationId, int $createdBy, array $details = []): array
    {
        $title = trim((string) ($details['title'] ?? ''));

        if ($title === '') {
            return [
                'success' => false,
                'message' => 'Title is required.'
            ];
        }

        if ($medicationId) {
            $medication = (new Medication())->where('id', $medicationId)->first();

            if (!$medication || $medication['deleted_at'] !== null) {
                return [
                    'success' => false,
                    'message' => 'Selected medication does not exist.'
                ];
            }
        }

        $data = $this->filterDetails($details);
        $data['title'] = $title;
        $data['patient_id'] = $patientId;
        $data['medication_id'] = $medicationId ?: null;
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = $createdBy;

        $id = (new PatientPrescription())->create($data);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record prescription.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Prescription added successfully.',
            'data' => ['id' => $id]
        ];
    }

    /**
     * Update the detail fields on an existing patient prescription record.
     */
    public function update(int $id, array $details, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Prescription record not found.'
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

        (new PatientPrescription())->update($data, $id);

        return [
            'success' => true,
            'message' => 'Prescription updated successfully.'
        ];
    }

    /**
     * Keep only recognized detail fields, converting empty strings to NULL
     * and normalizing substitution_allowed to a strict 0/1.
     */
    private function filterDetails(array $details): array
    {
        $result = [];

        foreach (self::DETAIL_FIELDS as $field) {
            if ($field === 'title' || !array_key_exists($field, $details)) {
                continue;
            }

            if ($field === 'substitution_allowed') {
                $result[$field] = in_array($details[$field], [1, '1', true, 'true'], true) ? 1 : 0;
                continue;
            }

            if ($field === 'refills') {
                $result[$field] = $details[$field] === '' ? null : (int) $details[$field];
                continue;
            }

            $result[$field] = $details[$field] === '' ? null : $details[$field];
        }

        return $result;
    }

    public function find(int $id): ?array
    {
        return (new PatientPrescription())->where('id', $id)->first();
    }

    /**
     * Soft-delete a recorded patient prescription.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Prescription record not found.'
            ];
        }

        (new PatientPrescription())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Prescription removed successfully.'
        ];
    }
}
