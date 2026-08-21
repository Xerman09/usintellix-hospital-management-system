<?php

namespace App\Modules\Appointments\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Appointments\Services\AppointmentService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class AppointmentController extends Controller
{
    private AppointmentService $appointmentService;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->appointmentService = new AppointmentService();
        $this->providerService = new ProviderService();
    }

    /**
     * List appointments, scoped to the logged-in doctor's own
     * provider record, or the logged-in patient's own patient record,
     * when applicable.
     */
    public function index(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $providerId = $this->resolveProviderId($user);
        $restrictPatientId = $this->resolvePatientId($user);

        $patientId = $restrictPatientId ?? ($request->input('patient_id') ? (int) $request->input('patient_id') : null);
        $from = $request->input('from');
        $to = $request->input('to');

        $appointments = $this->appointmentService->list(
            $providerId,
            $patientId,
            $from,
            $to
        );

        $this->success($appointments, 'Appointments retrieved successfully.');
    }

    /**
     * Schedule a new appointment. Admin/receptionist can pick any provider;
     * a doctor is always locked to their own provider record.
     */
    public function store(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $restrictProviderId = $this->resolveProviderId($user);

        if ($restrictProviderId === 0) {
            $this->error('You are not registered as a provider.', 403);
            return;
        }

        $data = $request->only([
            'patient_id',
            'provider_id',
            'is_provider_block',
            'title',
            'visit_category_id',
            'provider_category_id',
            'facility_id',
            'billing_facility_id',
            'room_id',
            'appointment_date',
            'appointment_time',
            'is_all_day',
            'recurrence_mode',
            'recurrence_position',
            'recurrence_day_type',
            'recurrence_days_of_week',
            'recurrence_until_date',
            'reason',
            'notes',
            'status'
        ]);

        if ($restrictProviderId !== null) {
            $data['provider_id'] = $restrictProviderId;
        }

        $result = $this->appointmentService->store(
            $data,
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing appointment. A doctor may only update
     * their own appointments and cannot reassign them to another provider.
     */
    public function update(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $restrictProviderId = $this->resolveProviderId($user);

        if ($restrictProviderId === 0) {
            $this->error('You are not registered as a provider.', 403);
            return;
        }

        $id = (int) $request->input('id');

        $data = $request->only([
            'patient_id',
            'provider_id',
            'is_provider_block',
            'title',
            'visit_category_id',
            'provider_category_id',
            'facility_id',
            'billing_facility_id',
            'room_id',
            'appointment_date',
            'appointment_time',
            'is_all_day',
            'recurrence_mode',
            'recurrence_position',
            'recurrence_day_type',
            'recurrence_days_of_week',
            'recurrence_until_date',
            'reason',
            'notes',
            'status'
        ]);

        if ($restrictProviderId !== null) {
            $data['provider_id'] = $restrictProviderId;
        }

        $scope = (string) $request->input('scope', 'this');

        if (!in_array($scope, ['this', 'future', 'all'], true)) {
            $scope = 'this';
        }

        $result = $this->appointmentService->updateWithScope(
            $id,
            $data,
            (int) $user['id'],
            $restrictProviderId,
            $scope
        );

        if (!$result['success']) {
            $status = !empty($result['errors']) ? 422 : 404;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete an appointment. A doctor may only delete their own appointments.
     */
    public function destroy(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $restrictProviderId = $this->resolveProviderId($user);

        $id = (int) $request->input('id');

        $result = $this->appointmentService->remove(
            $id,
            (int) $user['id'],
            $restrictProviderId
        );

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Search a provider's fixed business-hours window for free slots
     * across a range of days. Query: ?provider_id=&start_date=&days=
     */
    public function availableSlots(): void
    {
        $user = Session::get('user');
        $request = new Request();

        // A doctor searches their own schedule regardless of what (if
        // anything) the frontend sent — same restriction used for
        // store/update/destroy.
        $restrictProviderId = $this->resolveProviderId($user);
        $providerId = $restrictProviderId ?? (int) $request->input('provider_id');
        $startDate = (string) $request->input('start_date');
        $days = (int) $request->input('days', 7);

        if ($providerId <= 0 || $startDate === '') {
            $this->error('provider_id and start_date are required.', 422);
            return;
        }

        $days = max(1, min(60, $days));

        $slots = $this->appointmentService->findAvailableSlots($providerId, $startDate, $days);

        $this->success($slots, 'Available slots retrieved successfully.');
    }

    /**
     * Resolve the provider_id a doctor is restricted to (0 if they have
     * no provider record), or null for roles with unrestricted access.
     */
    private function resolveProviderId(array $user): ?int
    {
        if ($user['role'] !== 'doctor') {
            return null;
        }

        $provider = $this->providerService->findByUserId((int) $user['id']);

        return $provider ? (int) $provider['id'] : 0;
    }

    /**
     * Resolve the patient_id a patient is restricted to (0 if they have
     * no patient record), or null for roles with unrestricted access.
     */
    private function resolvePatientId(array $user): ?int
    {
        if ($user['role'] !== 'patient') {
            return null;
        }

        $patient = (new Patient())->where('user_id', $user['id'])->first();

        return $patient ? (int) $patient['id'] : 0;
    }
}
