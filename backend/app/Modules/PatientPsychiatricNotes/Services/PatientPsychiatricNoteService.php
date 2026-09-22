<?php

declare(strict_types=1);

namespace App\Modules\PatientPsychiatricNotes\Services;

use App\Core\Database;
use App\Core\FieldEncryption;
use App\Modules\PatientPsychiatricNotes\Models\PatientPsychiatricNote;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Models\Provider;
use PDO;

class PatientPsychiatricNoteService
{
    private const ENCRYPTED_FIELDS = [
        'symptoms',
        'psychiatric_notes',
        'treatment_plan',
        'confidential_remarks'
    ];

    /**
     * List all non-deleted psychiatric notes for a patient.
     */
    public function list(int $patientId): array
    {
        $sql = "SELECT pn.*,
                       e.first_name AS provider_first_name,
                       e.last_name AS provider_last_name
                FROM patient_psychiatric_notes pn
                LEFT JOIN providers pr ON pr.id = pn.provider_id
                LEFT JOIN employees e ON e.id = pr.employee_id
                WHERE pn.patient_id = :patient_id AND pn.deleted_at IS NULL
                ORDER BY pn.session_date DESC, pn.id DESC";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute(['patient_id' => $patientId]);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return FieldEncryption::decryptRows($rows, self::ENCRYPTED_FIELDS);
    }

    /**
     * Find a single note with transparent decryption.
     */
    public function find(int $id): ?array
    {
        $note = (new PatientPsychiatricNote())->where('id', $id)->first();

        if (!$note || $note['deleted_at'] !== null) {
            return null;
        }

        return $note;
    }

    /**
     * Store a new psychiatric / psychotherapy note (HIPAA § 164.501 & § 164.312(a)(2)(iv)).
     */
    public function store(array $data, int $userId): array
    {
        $patientId = (int) ($data['patient_id'] ?? 0);
        $providerId = (int) ($data['provider_id'] ?? 0);
        $notes = trim((string) ($data['psychiatric_notes'] ?? ''));

        if (!$patientId) {
            return ['success' => false, 'message' => 'Patient ID is required.'];
        }

        if (!$providerId) {
            return ['success' => false, 'message' => 'Provider ID is required.'];
        }

        if (empty($notes)) {
            return ['success' => false, 'message' => 'Psychiatric notes content is required.'];
        }

        $sessionDate = !empty($data['session_date']) ? $data['session_date'] : date('Y-m-d');

        $record = [
            'patient_id'           => $patientId,
            'encounter_id'         => !empty($data['encounter_id']) ? (int) $data['encounter_id'] : null,
            'provider_id'          => $providerId,
            'session_date'         => $sessionDate,
            'diagnosis_code'       => !empty($data['diagnosis_code']) ? trim($data['diagnosis_code']) : null,
            'symptoms'             => !empty($data['symptoms']) ? trim($data['symptoms']) : null,
            'psychiatric_notes'    => $notes,
            'treatment_plan'       => !empty($data['treatment_plan']) ? trim($data['treatment_plan']) : null,
            'confidential_remarks' => !empty($data['confidential_remarks']) ? trim($data['confidential_remarks']) : null,
            'created_at'           => date('Y-m-d H:i:s'),
            'created_by'           => $userId
        ];

        // QueryBuilder automatically encrypts fields in $encryptedFields with AES-256-GCM
        $id = (new PatientPsychiatricNote())->create($record);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to save psychiatric note.'];
        }

        return [
            'success' => true,
            'message' => 'Psychiatric note recorded and encrypted at rest successfully.',
            'data'    => ['id' => $id]
        ];
    }

    /**
     * Update an existing psychiatric note.
     */
    public function update(int $id, array $data, int $userId): array
    {
        $existing = $this->find($id);
        if (!$existing) {
            return ['success' => false, 'message' => 'Psychiatric note not found.'];
        }

        $updates = [
            'session_date'         => !empty($data['session_date']) ? $data['session_date'] : $existing['session_date'],
            'diagnosis_code'       => array_key_exists('diagnosis_code', $data) ? $data['diagnosis_code'] : $existing['diagnosis_code'],
            'symptoms'             => array_key_exists('symptoms', $data) ? $data['symptoms'] : $existing['symptoms'],
            'psychiatric_notes'    => !empty($data['psychiatric_notes']) ? $data['psychiatric_notes'] : $existing['psychiatric_notes'],
            'treatment_plan'       => array_key_exists('treatment_plan', $data) ? $data['treatment_plan'] : $existing['treatment_plan'],
            'confidential_remarks' => array_key_exists('confidential_remarks', $data) ? $data['confidential_remarks'] : $existing['confidential_remarks'],
            'updated_at'           => date('Y-m-d H:i:s'),
            'updated_by'           => $userId
        ];

        (new PatientPsychiatricNote())->update($updates, $id);

        return ['success' => true, 'message' => 'Psychiatric note updated successfully.'];
    }

    /**
     * Soft-delete a psychiatric note.
     */
    public function remove(int $id, int $userId): array
    {
        $existing = $this->find($id);
        if (!$existing) {
            return ['success' => false, 'message' => 'Psychiatric note not found.'];
        }

        (new PatientPsychiatricNote())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Psychiatric note deleted successfully.'];
    }
}
