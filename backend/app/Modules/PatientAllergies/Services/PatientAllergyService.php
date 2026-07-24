<?php

namespace App\Modules\PatientAllergies\Services;

use App\Core\Database;
use App\Modules\Allergies\Models\Allergy;
use App\Modules\PatientAllergies\Models\PatientAllergy;
use PDO;
use PDOException;

class PatientAllergyService
{
    /**
     * List a patient's recorded allergies, joined with the allergies catalog.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT pa.id, pa.allergy_id, al.name, al.description, pa.created_at
             FROM patient_allergies pa
             JOIN allergies al ON al.id = pa.allergy_id
             WHERE pa.patient_id = :patient_id AND pa.deleted_at IS NULL
             ORDER BY al.name"
        );

        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Attach an allergy from the catalog to a patient.
     */
    public function store(int $patientId, int $allergyId, int $createdBy): array
    {
        $allergy = (new Allergy())->where('id', $allergyId)->first();

        if (!$allergy || $allergy['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Selected allergy does not exist.'
            ];
        }

        $existing = (new PatientAllergy())
            ->where('patient_id', $patientId)
            ->where('allergy_id', $allergyId)
            ->first();

        if ($existing && $existing['deleted_at'] === null) {
            return [
                'success' => false,
                'message' => 'This allergy is already recorded for the patient.'
            ];
        }

        try {
            $id = (new PatientAllergy())->create([
                'patient_id' => $patientId,
                'allergy_id' => $allergyId,
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $createdBy
            ]);

            if (!$id) {
                throw new \RuntimeException('Failed to record allergy.');
            }

            return [
                'success' => true,
                'message' => 'Allergy added successfully.',
                'data' => ['id' => $id]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'This allergy is already recorded for the patient.'
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to record allergy.'
            ];
        }
    }

    /**
     * Soft-delete a recorded patient allergy. Returns the row (pre-deletion)
     * so the caller can verify patient ownership before removing.
     */
    public function find(int $id): ?array
    {
        return (new PatientAllergy())->where('id', $id)->first();
    }

    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Allergy record not found.'
            ];
        }

        (new PatientAllergy())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Allergy removed successfully.'
        ];
    }
}
