<?php

namespace App\Modules\Appointments\Services;

use App\Core\Database;
use App\Modules\Appointments\Models\Appointment;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Models\Provider;
use PDO;
use Throwable;

class AppointmentService
{
    /**
     * List appointments, optionally scoped to a provider,
     * a single patient, and/or a date range.
     */
    public function list(
        ?int $providerId = null,
        ?int $patientId = null,
        ?string $from = null,
        ?string $to = null
    ): array {
        $sql = "SELECT a.id, a.patient_id, a.provider_id, a.appointment_date, a.appointment_time,
                       a.reason, a.notes, a.status,
                       p.patient_no, p.first_name AS patient_first_name, p.middle_name AS patient_middle_name,
                       p.last_name AS patient_last_name, p.suffix AS patient_suffix,
                       e.first_name AS provider_first_name, e.last_name AS provider_last_name
                FROM appointments a
                JOIN patients p ON p.id = a.patient_id
                JOIN providers pr ON pr.id = a.provider_id
                JOIN employees e ON e.id = pr.employee_id
                WHERE a.deleted_at IS NULL";

        $params = [];

        if ($providerId !== null) {
            $sql .= " AND a.provider_id = :provider_id";
            $params['provider_id'] = $providerId;
        }

        if ($patientId !== null) {
            $sql .= " AND a.patient_id = :patient_id";
            $params['patient_id'] = $patientId;
        }

        if ($from !== null) {
            $sql .= " AND a.appointment_date >= :from";
            $params['from'] = $from;
        }

        if ($to !== null) {
            $sql .= " AND a.appointment_date <= :to";
            $params['to'] = $to;
        }

        $sql .= " ORDER BY a.appointment_date DESC, a.appointment_time DESC";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Create a new appointment.
     */
    public function store(array $data, int $createdBy): array
    {
        $errors = $this->validate($data, null, true);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        try {
            $id = (new Appointment())->create([
                'patient_id' => (int) $data['patient_id'],
                'provider_id' => (int) $data['provider_id'],
                'appointment_date' => $data['appointment_date'],
                'appointment_time' => $data['appointment_time'],
                'reason' => $data['reason'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => $data['status'] ?? 'scheduled',
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $createdBy
            ]);

            if (!$id) {
                throw new \RuntimeException('Failed to create appointment.');
            }

            return [
                'success' => true,
                'message' => 'Appointment scheduled successfully.',
                'data' => ['id' => $id]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to schedule appointment.'
            ];
        }
    }

    /**
     * Update an existing appointment. When $restrictProviderId is set (a doctor),
     * the appointment must already belong to that provider.
     */
    public function update(int $id, array $data, int $updatedBy, ?int $restrictProviderId = null): array
    {
        $appointment = (new Appointment())
            ->where('id', $id)
            ->first();

        if (!$appointment || $appointment['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Appointment not found.'
            ];
        }

        if ($restrictProviderId !== null && (int) $appointment['provider_id'] !== $restrictProviderId) {
            return [
                'success' => false,
                'message' => 'Appointment not found.'
            ];
        }

        $errors = $this->validate($data, $id);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $updated = (new Appointment())->update([
            'patient_id' => (int) $data['patient_id'],
            'provider_id' => (int) $data['provider_id'],
            'appointment_date' => $data['appointment_date'],
            'appointment_time' => $data['appointment_time'],
            'reason' => $data['reason'] ?? null,
            'notes' => $data['notes'] ?? null,
            'status' => $data['status'] ?? $appointment['status'],
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update appointment.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Appointment updated successfully.'
        ];
    }

    /**
     * Soft-delete an appointment. When $restrictProviderId is set (a doctor),
     * the appointment must already belong to that provider.
     */
    public function remove(int $id, int $deletedBy, ?int $restrictProviderId = null): array
    {
        $appointment = (new Appointment())
            ->where('id', $id)
            ->first();

        if (!$appointment || $appointment['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Appointment not found.'
            ];
        }

        if ($restrictProviderId !== null && (int) $appointment['provider_id'] !== $restrictProviderId) {
            return [
                'success' => false,
                'message' => 'Appointment not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE appointments
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE id = :id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id' => $id
        ]);

        return [
            'success' => true,
            'message' => 'Appointment deleted successfully.'
        ];
    }

    /**
     * Validate appointment input, including a double-booking check.
     * $enforceFutureDate blocks past dates on creation only — editing an
     * already-past appointment (e.g. to mark it completed/no-show) is still allowed.
     */
    private function validate(array $data, ?int $excludeId = null, bool $enforceFutureDate = false): array
    {
        $errors = [];

        if (empty($data['patient_id'])) {
            $errors['patient_id'] = 'Patient is required.';
        }

        if (empty($data['provider_id'])) {
            $errors['provider_id'] = 'Provider is required.';
        }

        if (empty($data['appointment_date'])) {
            $errors['appointment_date'] = 'Date is required.';
        }

        if (empty($data['appointment_time'])) {
            $errors['appointment_time'] = 'Time is required.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        if ($enforceFutureDate && $data['appointment_date'] < date('Y-m-d')) {
            $errors['appointment_date'] = 'Appointment date cannot be in the past.';
            return $errors;
        }

        $patient = (new Patient())
            ->where('id', (int) $data['patient_id'])
            ->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            $errors['patient_id'] = 'Selected patient does not exist.';
        }

        $provider = (new Provider())
            ->where('id', (int) $data['provider_id'])
            ->first();

        if (!$provider || $provider['deleted_at'] !== null) {
            $errors['provider_id'] = 'Selected provider does not exist.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $sql = "SELECT id FROM appointments
                WHERE provider_id = :provider_id
                  AND appointment_date = :appointment_date AND appointment_time = :appointment_time
                  AND status != 'cancelled' AND deleted_at IS NULL";

        $params = [
            'provider_id' => (int) $data['provider_id'],
            'appointment_date' => $data['appointment_date'],
            'appointment_time' => $data['appointment_time']
        ];

        if ($excludeId !== null) {
            $sql .= " AND id != :exclude_id";
            $params['exclude_id'] = $excludeId;
        }

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        if ($stmt->fetch(PDO::FETCH_ASSOC)) {
            $errors['appointment_time'] = 'This time slot is already booked for the selected provider.';
        }

        return $errors;
    }
}
