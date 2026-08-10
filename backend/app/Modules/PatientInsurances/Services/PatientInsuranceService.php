<?php

namespace App\Modules\PatientInsurances\Services;

use App\Core\Database;
use App\Modules\Insurances\Models\Insurance;
use App\Modules\PatientInsurances\Models\PatientInsurance;
use PDO;

class PatientInsuranceService
{
    /**
     * Detail fields that can be set on a patient insurance record, beyond
     * the patient/insurance link itself.
     */
    private const DETAIL_FIELDS = [
        'insurance_type', 'policy_number', 'group_number', 'subscriber_name',
        'effective_date', 'term_date'
    ];

    /**
     * List a patient's recorded insurances, primary first.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT pi.id, pi.patient_id, pi.insurance_id, i.name AS insurance_name,
                    pi.insurance_type, pi.policy_number, pi.group_number, pi.subscriber_name,
                    pi.effective_date, pi.term_date, pi.created_at
             FROM patient_insurances pi
             JOIN insurances i ON i.id = pi.insurance_id
             WHERE pi.patient_id = :patient_id AND pi.deleted_at IS NULL
             ORDER BY FIELD(pi.insurance_type, 'primary', 'secondary', 'tertiary'), pi.id"
        );

        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Record an insurance for a patient. The insurance must reference an
     * existing catalog entry (unlike medications, there is no free-text path).
     */
    public function store(int $patientId, int $insuranceId, int $createdBy, array $details = []): array
    {
        $insurance = (new Insurance())->where('id', $insuranceId)->first();

        if (!$insurance || $insurance['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Selected insurance does not exist.'
            ];
        }

        $data = $this->filterDetails($details);
        $data['patient_id'] = $patientId;
        $data['insurance_id'] = $insuranceId;
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = $createdBy;

        $id = (new PatientInsurance())->create($data);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record insurance.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Insurance added successfully.',
            'data' => ['id' => $id]
        ];
    }

    /**
     * Update the detail fields on an existing patient insurance record.
     */
    public function update(int $id, array $details, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Insurance record not found.'
            ];
        }

        $data = $this->filterDetails($details);
        $data['updated_at'] = date('Y-m-d H:i:s');
        $data['updated_by'] = $updatedBy;

        (new PatientInsurance())->update($data, $id);

        return [
            'success' => true,
            'message' => 'Insurance updated successfully.'
        ];
    }

    /**
     * Keep only recognized detail fields, converting empty strings to NULL.
     */
    private function filterDetails(array $details): array
    {
        $result = [];

        foreach (self::DETAIL_FIELDS as $field) {
            if (!array_key_exists($field, $details)) {
                continue;
            }

            $result[$field] = $details[$field] === '' ? null : $details[$field];
        }

        return $result;
    }

    public function find(int $id): ?array
    {
        return (new PatientInsurance())->where('id', $id)->first();
    }

    /**
     * Soft-delete a recorded patient insurance.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Insurance record not found.'
            ];
        }

        (new PatientInsurance())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Insurance removed successfully.'
        ];
    }
}
