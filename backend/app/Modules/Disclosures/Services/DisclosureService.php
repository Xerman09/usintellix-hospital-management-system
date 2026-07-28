<?php

namespace App\Modules\Disclosures\Services;

use App\Core\Database;
use App\Modules\Disclosures\Models\Disclosure;
use PDO;

class DisclosureService
{
    /**
     * Detail fields that can be set on a disclosure record, beyond the
     * patient link itself.
     */
    private const DETAIL_FIELDS = [
        'disclosure_date', 'disclosure_type', 'recipient', 'description'
    ];

    /**
     * List a patient's recorded disclosures, most recent first, along with
     * the name of whoever recorded each one.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT d.id, d.patient_id, d.disclosure_date, d.disclosure_type,
                    d.recipient, d.description, d.created_at, d.updated_at,
                    CONCAT(e.first_name, ' ', e.last_name) AS provider_name
             FROM disclosures d
             LEFT JOIN employees e ON e.user_id = d.created_by
             WHERE d.patient_id = :patient_id AND d.deleted_at IS NULL
             ORDER BY d.disclosure_date DESC, d.id DESC"
        );

        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Record a disclosure for a patient.
     */
    public function store(int $patientId, int $createdBy, array $details = []): array
    {
        $recipient = trim((string) ($details['recipient'] ?? ''));

        if ($recipient === '') {
            return [
                'success' => false,
                'message' => 'Recipient is required.'
            ];
        }

        $data = $this->filterDetails($details);
        $data['recipient'] = $recipient;
        $data['patient_id'] = $patientId;
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = $createdBy;

        $id = (new Disclosure())->create($data);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record disclosure.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Disclosure added successfully.',
            'data' => ['id' => $id]
        ];
    }

    /**
     * Update the detail fields on an existing disclosure record.
     */
    public function update(int $id, array $details, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Disclosure record not found.'
            ];
        }

        $recipient = trim((string) ($details['recipient'] ?? ''));

        if ($recipient === '') {
            return [
                'success' => false,
                'message' => 'Recipient is required.'
            ];
        }

        $data = $this->filterDetails($details);
        $data['recipient'] = $recipient;
        $data['updated_at'] = date('Y-m-d H:i:s');
        $data['updated_by'] = $updatedBy;

        (new Disclosure())->update($data, $id);

        return [
            'success' => true,
            'message' => 'Disclosure updated successfully.'
        ];
    }

    /**
     * Keep only recognized detail fields, converting empty strings to NULL.
     */
    private function filterDetails(array $details): array
    {
        $result = [];

        foreach (self::DETAIL_FIELDS as $field) {
            if ($field === 'recipient' || !array_key_exists($field, $details)) {
                continue;
            }

            $result[$field] = $details[$field] === '' ? null : $details[$field];
        }

        return $result;
    }

    public function find(int $id): ?array
    {
        return (new Disclosure())->where('id', $id)->first();
    }

    /**
     * Soft-delete a recorded disclosure.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Disclosure record not found.'
            ];
        }

        (new Disclosure())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Disclosure removed successfully.'
        ];
    }
}
