<?php

namespace App\Modules\Amendments\Services;

use App\Core\Database;
use App\Modules\Amendments\Models\Amendment;
use PDO;

class AmendmentService
{
    /**
     * Detail fields that can be set on an amendment record, beyond the
     * patient link itself.
     */
    private const DETAIL_FIELDS = [
        'requested_date', 'requested_by', 'description', 'status', 'comments'
    ];

    /**
     * List a patient's recorded amendment requests, most recent first,
     * along with the name of whoever recorded each one.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT a.id, a.patient_id, a.requested_date, a.requested_by,
                    a.description, a.status, a.comments, a.created_at, a.updated_at,
                    CONCAT(e.first_name, ' ', e.last_name) AS provider_name
             FROM amendments a
             LEFT JOIN employees e ON e.user_id = a.created_by
             WHERE a.patient_id = :patient_id AND a.deleted_at IS NULL
             ORDER BY a.requested_date DESC, a.id DESC"
        );

        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Record an amendment request for a patient.
     */
    public function store(int $patientId, int $createdBy, array $details = []): array
    {
        $description = trim((string) ($details['description'] ?? ''));

        if ($description === '') {
            return [
                'success' => false,
                'message' => 'Request description is required.'
            ];
        }

        $data = $this->filterDetails($details);
        $data['description'] = $description;
        $data['patient_id'] = $patientId;
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = $createdBy;

        $id = (new Amendment())->create($data);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record amendment request.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Amendment request added successfully.',
            'data' => ['id' => $id]
        ];
    }

    /**
     * Update the detail fields on an existing amendment record.
     */
    public function update(int $id, array $details, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Amendment record not found.'
            ];
        }

        $description = trim((string) ($details['description'] ?? ''));

        if ($description === '') {
            return [
                'success' => false,
                'message' => 'Request description is required.'
            ];
        }

        $data = $this->filterDetails($details);
        $data['description'] = $description;
        $data['updated_at'] = date('Y-m-d H:i:s');
        $data['updated_by'] = $updatedBy;

        (new Amendment())->update($data, $id);

        return [
            'success' => true,
            'message' => 'Amendment request updated successfully.'
        ];
    }

    /**
     * Keep only recognized detail fields, converting empty strings to NULL.
     */
    private function filterDetails(array $details): array
    {
        $result = [];

        foreach (self::DETAIL_FIELDS as $field) {
            if ($field === 'description' || !array_key_exists($field, $details)) {
                continue;
            }

            $result[$field] = $details[$field] === '' ? null : $details[$field];
        }

        return $result;
    }

    public function find(int $id): ?array
    {
        return (new Amendment())->where('id', $id)->first();
    }

    /**
     * Soft-delete a recorded amendment request.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Amendment record not found.'
            ];
        }

        (new Amendment())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Amendment request removed successfully.'
        ];
    }
}
