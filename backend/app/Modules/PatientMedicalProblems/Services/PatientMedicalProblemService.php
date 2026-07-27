<?php

namespace App\Modules\PatientMedicalProblems\Services;

use App\Core\Database;
use App\Modules\MedicalProblems\Models\MedicalProblem;
use App\Modules\PatientMedicalProblems\Models\PatientMedicalProblem;
use PDO;

class PatientMedicalProblemService
{
    /**
     * Detail fields that can be set on a patient medical problem record,
     * beyond the patient/problem link itself.
     */
    private const DETAIL_FIELDS = [
        'title', 'begin_date', 'end_date', 'comments', 'coding',
        'occurrence', 'outcome', 'classification_type', 'verification_status',
        'referred_by', 'destination'
    ];

    /**
     * List a patient's recorded medical problems.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, patient_id, problem_id, title, begin_date, end_date, comments, coding,
                    occurrence, outcome, classification_type, verification_status,
                    referred_by, destination, created_at
             FROM patient_medical_problems
             WHERE patient_id = :patient_id AND deleted_at IS NULL
             ORDER BY title"
        );

        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Record a medical problem for a patient. The problem may optionally
     * reference the medical_problems catalog; the title is always stored
     * directly since it may be freely typed instead of catalog-selected.
     */
    public function store(int $patientId, ?int $problemId, int $createdBy, array $details = []): array
    {
        $title = trim((string) ($details['title'] ?? ''));

        if ($title === '') {
            return [
                'success' => false,
                'message' => 'Title is required.'
            ];
        }

        if ($problemId) {
            $problem = (new MedicalProblem())->where('id', $problemId)->first();

            if (!$problem || $problem['deleted_at'] !== null) {
                return [
                    'success' => false,
                    'message' => 'Selected problem does not exist.'
                ];
            }
        }

        $data = $this->filterDetails($details);
        $data['title'] = $title;
        $data['patient_id'] = $patientId;
        $data['problem_id'] = $problemId ?: null;
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = $createdBy;

        $id = (new PatientMedicalProblem())->create($data);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record problem.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Problem added successfully.',
            'data' => ['id' => $id]
        ];
    }

    /**
     * Update the detail fields on an existing patient medical problem record.
     */
    public function update(int $id, array $details, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Problem record not found.'
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

        (new PatientMedicalProblem())->update($data, $id);

        return [
            'success' => true,
            'message' => 'Problem updated successfully.'
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
        return (new PatientMedicalProblem())->where('id', $id)->first();
    }

    /**
     * Soft-delete a recorded patient medical problem.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Problem record not found.'
            ];
        }

        (new PatientMedicalProblem())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Problem removed successfully.'
        ];
    }
}
