<?php

namespace App\Modules\PatientFlow\Services;

use App\Core\Database;
use App\Modules\Appointments\Models\Appointment;
use App\Modules\PatientFlow\Models\PatientFlow;
use App\Modules\Providers\Services\ProviderService;
use PDO;

class PatientFlowService
{
    private const STAGES = ['waiting', 'roomed', 'with_provider', 'checked_out'];

    /**
     * Which timestamp column gets stamped when a card moves into a given stage.
     */
    private const STAGE_TIMESTAMPS = [
        'waiting' => 'checked_in_at',
        'roomed' => 'roomed_at',
        'with_provider' => 'provider_at',
        'checked_out' => 'checked_out_at'
    ];

    private ProviderService $providerService;

    public function __construct()
    {
        $this->providerService = new ProviderService();
    }

    /**
     * List the flow board, scoped to the logged-in doctor's own patients
     * when applicable. Defaults to today only; the staff filter bar can
     * widen the range and/or narrow by visit category, facility,
     * provider, current stage, or a patient name/number search.
     */
    public function list(array $user, array $filters = []): array
    {
        $from = ($filters['from'] ?? '') ?: date('Y-m-d');
        $to = ($filters['to'] ?? '') ?: $from;

        $sql = "SELECT pf.*,
                    p.first_name AS patient_first_name, p.last_name AS patient_last_name, p.patient_no,
                    e.first_name AS provider_first_name, e.last_name AS provider_last_name,
                    f.name AS facility_name,
                    r.name AS room_name,
                    vc.name AS visit_category_name,
                    a.appointment_time, a.reason AS appointment_reason
                FROM patient_flow pf
                JOIN appointments a ON a.id = pf.appointment_id
                JOIN patients p ON p.id = pf.patient_id
                LEFT JOIN providers pr ON pr.id = pf.provider_id
                LEFT JOIN employees e ON e.id = pr.employee_id
                LEFT JOIN facilities f ON f.id = pf.facility_id
                LEFT JOIN rooms r ON r.id = pf.room_id
                LEFT JOIN visit_categories vc ON vc.id = pf.visit_category_id
                WHERE pf.deleted_at IS NULL
                  AND a.appointment_date BETWEEN :from AND :to";

        $params = ['from' => $from, 'to' => $to];

        if (($user['role'] ?? '') === 'doctor') {
            $provider = $this->providerService->findByUserId((int) $user['id']);
            $sql .= " AND pf.provider_id = :provider_id";
            $params['provider_id'] = $provider ? (int) $provider['id'] : 0;
        }

        if (!empty($filters['visit_category_id'])) {
            $sql .= " AND pf.visit_category_id = :visit_category_id";
            $params['visit_category_id'] = (int) $filters['visit_category_id'];
        }

        if (!empty($filters['facility_id'])) {
            $sql .= " AND pf.facility_id = :facility_id";
            $params['facility_id'] = (int) $filters['facility_id'];
        }

        if (!empty($filters['provider_id'])) {
            $sql .= " AND pf.provider_id = :filter_provider_id";
            $params['filter_provider_id'] = (int) $filters['provider_id'];
        }

        if (!empty($filters['stage']) && in_array($filters['stage'], self::STAGES, true)) {
            $sql .= " AND pf.stage = :stage";
            $params['stage'] = $filters['stage'];
        }

        if (!empty($filters['search'])) {
            $sql .= " AND (p.first_name LIKE :search1 OR p.last_name LIKE :search2 OR p.patient_no LIKE :search3)";
            $needle = '%' . $filters['search'] . '%';
            $params['search1'] = $needle;
            $params['search2'] = $needle;
            $params['search3'] = $needle;
        }

        $sql .= " ORDER BY a.appointment_date ASC, a.appointment_time ASC, pf.id ASC";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // The board's elapsed-time timers compare these timestamps against
        // the browser's clock. Both are naive "wall clock" strings with no
        // timezone info, and the PHP server's configured timezone won't
        // generally match the browser's -- so every row carries the
        // server's own idea of "now" alongside, letting the frontend
        // measure elapsed time as (server-clock now) - (server-clock
        // timestamp) instead of mixing two different clocks.
        $serverNow = date('Y-m-d H:i:s');

        foreach ($rows as &$row) {
            $row['server_time'] = $serverNow;
        }

        return $rows;
    }

    /**
     * Check a scheduled patient in for today's visit, placing them on the
     * board in the "waiting" stage. The visit category is copied from the
     * appointment so the board filter has something to match against.
     */
    public function checkIn(array $data, array $user): array
    {
        $appointmentId = (int) ($data['appointment_id'] ?? 0);
        $appointment = $appointmentId ? (new Appointment())->where('id', $appointmentId)->first() : null;

        if (!$appointment || $appointment['deleted_at'] !== null || (int) $appointment['is_provider_block'] === 1) {
            return [
                'success' => false,
                'message' => 'Appointment not found.'
            ];
        }

        if ($appointment['appointment_date'] !== date('Y-m-d')) {
            return [
                'success' => false,
                'message' => 'Only today\'s appointments can be checked in.'
            ];
        }

        if ($appointment['status'] === 'cancelled') {
            return [
                'success' => false,
                'message' => 'This appointment was cancelled.'
            ];
        }

        if (!$this->ownsAppointment($user, $appointment)) {
            return [
                'success' => false,
                'message' => 'Appointment not found.'
            ];
        }

        $existingRows = (new PatientFlow())
            ->where('appointment_id', $appointmentId)
            ->get();

        $alreadyCheckedIn = array_filter($existingRows, fn ($row) => $row['deleted_at'] === null);

        if (!empty($alreadyCheckedIn)) {
            return [
                'success' => false,
                'message' => 'This patient is already checked in.'
            ];
        }

        $id = (new PatientFlow())->create([
            'appointment_id' => $appointmentId,
            'patient_id' => (int) $appointment['patient_id'],
            'provider_id' => (int) $appointment['provider_id'],
            'visit_category_id' => $appointment['visit_category_id'] ?? null,
            'facility_id' => $appointment['facility_id'] ?? null,
            'room_id' => $appointment['room_id'] ?? null,
            'stage' => 'waiting',
            'checked_in_at' => date('Y-m-d H:i:s'),
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => (int) $user['id']
        ]);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to check in patient.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Patient checked in successfully.',
            'data' => ['id' => $id]
        ];
    }

    /**
     * Move a checked-in patient to a different stage and/or room -- the
     * combined save behind the board's Status/Room popup.
     */
    public function updateStatusRoom(int $id, string $stage, ?int $roomId, array $user): array
    {
        if (!in_array($stage, self::STAGES, true)) {
            return [
                'success' => false,
                'message' => 'Invalid stage.'
            ];
        }

        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null || !$this->ownsFlow($user, $record)) {
            return [
                'success' => false,
                'message' => 'Patient flow entry not found.'
            ];
        }

        $timestampColumn = self::STAGE_TIMESTAMPS[$stage];

        (new PatientFlow())->update([
            'stage' => $stage,
            'room_id' => $roomId,
            $timestampColumn => $record[$timestampColumn] ?? date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => (int) $user['id']
        ], $id);

        return [
            'success' => true,
            'message' => 'Patient flow updated successfully.'
        ];
    }

    /**
     * Toggle the drug-screen-completed checkbox for a checked-in patient.
     */
    public function updateDrugScreen(int $id, bool $completed, array $user): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null || !$this->ownsFlow($user, $record)) {
            return [
                'success' => false,
                'message' => 'Patient flow entry not found.'
            ];
        }

        (new PatientFlow())->update([
            'drug_screen_completed' => $completed ? 1 : 0,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => (int) $user['id']
        ], $id);

        return [
            'success' => true,
            'message' => 'Drug screen status updated successfully.'
        ];
    }

    /**
     * Remove a patient from the board (undo check-in).
     */
    public function remove(int $id, array $user): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null || !$this->ownsFlow($user, $record)) {
            return [
                'success' => false,
                'message' => 'Patient flow entry not found.'
            ];
        }

        (new PatientFlow())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => (int) $user['id']
        ], $id);

        return [
            'success' => true,
            'message' => 'Patient removed from the board successfully.'
        ];
    }

    public function find(int $id): ?array
    {
        return (new PatientFlow())->where('id', $id)->first();
    }

    /**
     * A doctor may only check in / manage their own appointments; admin and
     * receptionist may manage any.
     */
    private function ownsAppointment(array $user, array $appointment): bool
    {
        if (($user['role'] ?? '') !== 'doctor') {
            return true;
        }

        $provider = $this->providerService->findByUserId((int) $user['id']);
        $providerId = $provider ? (int) $provider['id'] : 0;

        return (int) $appointment['provider_id'] === $providerId;
    }

    private function ownsFlow(array $user, array $flow): bool
    {
        if (($user['role'] ?? '') !== 'doctor') {
            return true;
        }

        $provider = $this->providerService->findByUserId((int) $user['id']);
        $providerId = $provider ? (int) $provider['id'] : 0;

        return (int) $flow['provider_id'] === $providerId;
    }
}
