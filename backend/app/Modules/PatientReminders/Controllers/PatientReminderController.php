<?php

namespace App\Modules\PatientReminders\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Services\PatientAccessService;
use App\Modules\PatientReminders\Models\PatientReminder;
use App\Modules\PatientReminders\Services\PatientReminderService;
use App\Modules\Providers\Services\ProviderService;

class PatientReminderController extends Controller
{
    private PatientReminderService $service;
    private PatientAccessService $patientAccessService;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->service = new PatientReminderService();
        $this->patientAccessService = new PatientAccessService();
        $this->providerService = new ProviderService();
    }

    /**
     * The logged-in patient's own health maintenance reminders.
     */
    public function mine(): void
    {
        $user = Session::get('user');
        $patient = $this->patientAccessService->resolveEffectivePatient($user);

        if (!$patient) {
            $this->error('Patient record not found.', 404);
            return;
        }

        $reminders = $this->service->listForPatient((int) $patient['id']);

        $this->success($reminders, 'Reminders retrieved successfully.');
    }

    public function index(): void
    {
        $request = new Request();

        $sort = (string) $request->input('sort', 'item');
        $dir = (string) $request->input('dir', 'asc');
        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 25);

        $result = $this->service->list($sort, $dir, $page ?: 1, $perPage ?: 25);

        $this->success($result, 'Patient reminders retrieved successfully.');
    }

    public function process(): void
    {
        $user = Session::get('user');
        $result = $this->service->process((int) $user['id']);

        $this->success($result['data'], $result['message']);
    }

    public function processAndSend(): void
    {
        $user = Session::get('user');
        $result = $this->service->processAndSend((int) $user['id']);

        $this->success($result['data'], $result['message']);
    }

    /**
     * The action-log for one reminder (Clinical Reminders widget's
     * "history" view) -- what's actually been done about it over time.
     */
    public function actions(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $patientReminderId = (int) $request->input('patient_reminder_id');

        if (!$this->ownsReminder($user, $patientReminderId)) {
            $this->error('Reminder not found.', 404);
            return;
        }

        $this->success($this->service->listActions($patientReminderId), 'Actions retrieved successfully.');
    }

    public function addAction(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $patientReminderId = (int) $request->input('patient_reminder_id');

        if (!$this->ownsReminder($user, $patientReminderId)) {
            $this->error('Reminder not found.', 404);
            return;
        }

        $result = $this->service->addAction(
            $patientReminderId,
            $request->only(['action_date', 'completed', 'details']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    private function ownsReminder(array $user, int $patientReminderId): bool
    {
        if (!$patientReminderId) {
            return false;
        }

        $reminder = (new PatientReminder())->where('id', $patientReminderId)->first();

        if (!$reminder || $reminder['deleted_at'] !== null) {
            return false;
        }

        $patient = (new Patient())->where('id', (int) $reminder['patient_id'])->first();

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
