<?php

namespace App\Modules\PatientCarePreferences\Services;

use App\Core\Database;
use App\Modules\PatientCarePreferences\Models\PatientCarePreference;
use PDO;

class PatientCarePreferenceService
{
    private const STATUSES = ['preliminary', 'final', 'amended'];
    private const RESPONSE_TYPES = ['coded', 'free_text', 'yes_no'];

    private const LIST_SQL =
        "SELECT p.id, p.patient_id, p.preference_type_id, p.date_recorded, p.status,
                p.response_type, p.preference_value, p.notes, p.created_at,
                pt.name AS preference_type_name, pt.panel, pt.loinc_code
         FROM patient_care_preferences p
         JOIN preference_types pt ON pt.id = p.preference_type_id";

    /**
     * Full history for this patient across every panel, newest first --
     * the frontend splits the rows by `panel` to feed each panel's own
     * widget/modal (Care Experience Preferences, Treatment Intervention
     * Preferences, ...) from this single batched fetch rather than one
     * query per panel. Feeds both each widget's compact preview and its
     * management modal's table -- there's no separate paginated fetch
     * since a patient's preference list is small by nature.
     */
    public function listForPatient(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            self::LIST_SQL .
            " WHERE p.patient_id = ? AND p.deleted_at IS NULL
              ORDER BY p.date_recorded DESC, p.id DESC"
        );
        $stmt->execute([$patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create(int $patientId, array $data, int $userId): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $id = (new PatientCarePreference())->create([
            'patient_id' => $patientId,
            'preference_type_id' => (int) $data['preference_type_id'],
            'date_recorded' => $data['date_recorded'],
            'status' => $data['status'] ?? 'final',
            'response_type' => $data['response_type'],
            'preference_value' => trim((string) $data['preference_value']),
            'notes' => isset($data['notes']) && trim((string) $data['notes']) !== '' ? trim((string) $data['notes']) : null,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to save preference.'];
        }

        return ['success' => true, 'message' => 'Preference saved.', 'data' => ['id' => $id]];
    }

    public function update(int $id, array $data, int $userId): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        (new PatientCarePreference())->update([
            'preference_type_id' => (int) $data['preference_type_id'],
            'date_recorded' => $data['date_recorded'],
            'status' => $data['status'] ?? 'final',
            'response_type' => $data['response_type'],
            'preference_value' => trim((string) $data['preference_value']),
            'notes' => isset($data['notes']) && trim((string) $data['notes']) !== '' ? trim((string) $data['notes']) : null,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Preference updated.'];
    }

    public function remove(int $id, int $userId): array
    {
        (new PatientCarePreference())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Preference deleted.'];
    }

    public function find(int $id): ?array
    {
        return (new PatientCarePreference())->where('id', $id)->first();
    }

    private function validate(array $data): array
    {
        $errors = [];

        if (empty($data['preference_type_id'])) {
            $errors['preference_type_id'] = 'Preference category is required.';
        }

        if (empty($data['date_recorded'])) {
            $errors['date_recorded'] = 'Date recorded is required.';
        }

        if (empty($data['response_type']) || !in_array($data['response_type'], self::RESPONSE_TYPES, true)) {
            $errors['response_type'] = 'A valid response type is required.';
        }

        if (isset($data['status']) && $data['status'] !== '' && !in_array($data['status'], self::STATUSES, true)) {
            $errors['status'] = 'Invalid status.';
        }

        if (empty(trim((string) ($data['preference_value'] ?? '')))) {
            $errors['preference_value'] = "Patient's preference is required.";
        }

        return $errors;
    }
}
