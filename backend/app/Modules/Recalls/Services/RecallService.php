<?php

namespace App\Modules\Recalls\Services;

use App\Core\Database;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;
use App\Modules\Recalls\Models\Recall;
use PDO;

class RecallService
{
    private const STATUSES = ['pending', 'completed', 'cancelled'];

    private ProviderService $providerService;

    public function __construct()
    {
        $this->providerService = new ProviderService();
    }

    /**
     * List the recalls the logged-in user is allowed to see: all of them
     * for admin/receptionist, only their own patients' for a doctor, and
     * only their own for a patient.
     */
    public function listMine(array $user): array
    {
        $sql = "SELECT r.*,
                    p.first_name AS patient_first_name, p.last_name AS patient_last_name, p.patient_no,
                    p.birthdate AS patient_birthdate,
                    pe.first_name AS provider_first_name, pe.last_name AS provider_last_name,
                    f.name AS facility_name
                FROM recalls r
                JOIN patients p ON p.id = r.patient_id
                LEFT JOIN providers pr ON pr.id = r.provider_id
                LEFT JOIN employees pe ON pe.id = pr.employee_id
                LEFT JOIN facilities f ON f.id = r.facility_id
                WHERE r.deleted_at IS NULL AND p.deleted_at IS NULL";

        $params = [];
        $role = $user['role'] ?? '';

        if ($role === 'doctor') {
            $provider = $this->providerService->findByUserId((int) $user['id']);
            $sql .= " AND p.provider_id = :provider_id";
            $params['provider_id'] = $provider ? (int) $provider['id'] : 0;
        } elseif ($role === 'patient') {
            $patient = (new Patient())->where('user_id', (int) $user['id'])->first();
            $sql .= " AND r.patient_id = :patient_id";
            $params['patient_id'] = $patient ? (int) $patient['id'] : 0;
        }

        $sql .= " ORDER BY (r.recall_date IS NULL), r.recall_date ASC, r.id DESC";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        $recalls = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $this->autoClearFulfilled($recalls, (int) $user['id']);
    }

    /**
     * Reactively drop any pending recall whose patient already has an
     * appointment on or within ~3 months after the recall date -- the
     * follow-up got booked, so the recall has served its purpose. This
     * mirrors the reference recall board's behavior: nothing ever
     * auto-creates an appointment, it only auto-clears the recall once
     * one already exists.
     */
    private function autoClearFulfilled(array $recalls, int $userId): array
    {
        $candidates = array_filter(
            $recalls,
            fn ($recall) => $recall['status'] === 'pending' && !empty($recall['recall_date'])
        );

        if (empty($candidates)) {
            return array_values($recalls);
        }

        $patientIds = array_values(array_unique(array_map(fn ($r) => (int) $r['patient_id'], $candidates)));
        $placeholders = implode(',', array_fill(0, count($patientIds), '?'));

        $stmt = Database::connection()->prepare(
            "SELECT patient_id, appointment_date FROM appointments
             WHERE patient_id IN ({$placeholders}) AND deleted_at IS NULL"
        );
        $stmt->execute($patientIds);

        $datesByPatient = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $datesByPatient[(int) $row['patient_id']][] = $row['appointment_date'];
        }

        $clearedIds = [];

        foreach ($candidates as $recall) {
            $dates = $datesByPatient[(int) $recall['patient_id']] ?? [];

            if (empty($dates)) {
                continue;
            }

            $recallDate = $recall['recall_date'];
            $windowEnd = date('Y-m-d', strtotime($recallDate . ' +3 months'));

            foreach ($dates as $apptDate) {
                if ($apptDate >= $recallDate && $apptDate <= $windowEnd) {
                    $clearedIds[] = (int) $recall['id'];
                    break;
                }
            }
        }

        if (empty($clearedIds)) {
            return array_values($recalls);
        }

        $idPlaceholders = implode(',', array_fill(0, count($clearedIds), '?'));

        $stmt = Database::connection()->prepare(
            "UPDATE recalls SET deleted_at = ?, deleted_by = ? WHERE id IN ({$idPlaceholders})"
        );
        $stmt->execute(array_merge([date('Y-m-d H:i:s'), $userId], $clearedIds));

        return array_values(array_filter(
            $recalls,
            fn ($recall) => !in_array((int) $recall['id'], $clearedIds, true)
        ));
    }

    /**
     * Schedule a recall for a patient.
     */
    public function store(array $data, array $user): array
    {
        $patientId = (int) ($data['patient_id'] ?? 0);

        if (!$patientId || !$this->ownsPatient($user, $patientId)) {
            return [
                'success' => false,
                'message' => 'Patient not found.'
            ];
        }

        $errors = $this->validate($data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $id = (new Recall())->create([
            'patient_id'  => $patientId,
            'provider_id' => $data['provider_id'] ?? null,
            'facility_id' => $data['facility_id'] ?? null,
            'recall_date' => $data['recall_date'] ?: null,
            'reason'      => trim((string) ($data['reason'] ?? '')) ?: null,
            'status'      => $data['status'] ?: 'pending',
            'notes'       => $data['notes'] ?: null,
            'created_at'  => date('Y-m-d H:i:s'),
            'created_by'  => (int) $user['id']
        ]);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to schedule recall.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Recall scheduled successfully.',
            'data' => ['id' => $id]
        ];
    }

    /**
     * Update an existing recall.
     */
    public function update(int $id, array $data, array $user): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            return [
                'success' => false,
                'message' => 'Recall not found.'
            ];
        }

        $errors = $this->validate($data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        (new Recall())->update([
            'provider_id' => $data['provider_id'] ?? null,
            'facility_id' => $data['facility_id'] ?? null,
            'recall_date' => $data['recall_date'] ?: null,
            'reason'      => trim((string) ($data['reason'] ?? '')) ?: null,
            'status'      => $data['status'] ?: 'pending',
            'notes'       => $data['notes'] ?: null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => (int) $user['id']
        ], $id);

        return [
            'success' => true,
            'message' => 'Recall updated successfully.'
        ];
    }

    /**
     * Soft-delete a recall.
     */
    public function remove(int $id, array $user): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            return [
                'success' => false,
                'message' => 'Recall not found.'
            ];
        }

        (new Recall())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => (int) $user['id']
        ], $id);

        return [
            'success' => true,
            'message' => 'Recall removed successfully.'
        ];
    }

    public function find(int $id): ?array
    {
        return (new Recall())->where('id', $id)->first();
    }

    private function validate(array $data): array
    {
        $errors = [];

        if (empty($data['recall_date']) || strtotime($data['recall_date']) === false) {
            $errors['recall_date'] = 'A valid recall date is required.';
        }

        if (empty($data['provider_id'])) {
            $errors['provider_id'] = 'Provider is required.';
        }

        if (empty($data['facility_id'])) {
            $errors['facility_id'] = 'Facility is required.';
        }

        if (!empty($data['status']) && !in_array($data['status'], self::STATUSES, true)) {
            $errors['status'] = 'Status must be pending, completed, or cancelled.';
        }

        return $errors;
    }

    /**
     * Confirm the given patient exists and, for doctors, is assigned to
     * them. Admins and receptionists may manage any active patient's
     * recalls.
     */
    private function ownsPatient(array $user, int $patientId): bool
    {
        $patient = (new Patient())->where('id', $patientId)->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return false;
        }

        if (($user['role'] ?? '') !== 'doctor') {
            return true;
        }

        $provider = $this->providerService->findByUserId((int) $user['id']);
        $providerId = $provider ? (int) $provider['id'] : 0;

        return (int) $patient['provider_id'] === $providerId;
    }
}
