<?php

namespace App\Modules\PatientReminders\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Patients\Models\Patient;
use App\Modules\PatientReminders\Services\PatientReminderService;

class PatientReminderController extends Controller
{
    private PatientReminderService $service;

    public function __construct()
    {
        $this->service = new PatientReminderService();
    }

    /**
     * The logged-in patient's own health maintenance reminders.
     */
    public function mine(): void
    {
        $user = Session::get('user');
        $patient = (new Patient())->where('user_id', (int) $user['id'])->first();

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
}
