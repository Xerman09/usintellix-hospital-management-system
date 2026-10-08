<?php

namespace App\Modules\MyWork\Controllers;

use App\Core\Controller;
use App\Core\PhiAccessGuard;
use App\Core\Request;
use App\Core\Session;
use App\Modules\MyWork\Services\TaskService;

class TaskController extends Controller
{
    private TaskService $service;

    public function __construct()
    {
        $this->service = new TaskService();
    }

    /** Query: patient_id? -- my tasks (and those I gave), or one patient's tasks */
    public function index(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $patientId = (int) $request->input('patient_id');
        if ($patientId) {
            PhiAccessGuard::assertPatientAccess($user, $patientId, true);
            $this->success($this->service->forPatient($patientId, $user), 'Retrieved.');
            return;
        }
        $this->success($this->service->forUser($user), 'Retrieved.');
    }

    /** The "New task" form: roles, staff, admitted patients. */
    public function options(): void
    {
        $this->success($this->service->options(), 'Retrieved.');
    }

    /** Body: id? (change), title, details?, admission_id? | patient_id?, assign_type, assigned_user_id | assigned_role, due_at, priority? */
    public function save(): void
    {
        $request = new Request();
        $this->respond($this->service->save($request->all(), Session::get('user') ?? []));
    }

    /** Body: id, note? */
    public function complete(): void
    {
        $request = new Request();
        $this->respond($this->service->complete((int) $request->input('id'), (string) ($request->input('note') ?? ''), Session::get('user') ?? []));
    }

    /** Body: id, reason */
    public function cancel(): void
    {
        $request = new Request();
        $this->respond($this->service->cancel((int) $request->input('id'), (string) ($request->input('reason') ?? ''), Session::get('user') ?? []));
    }

    private function respond(array $result): void
    {
        if (!$result['success']) {
            $code = !empty($result['not_found']) ? 404 : (!empty($result['forbidden']) ? 403 : 422);
            $this->json(['success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null], $code);
            return;
        }
        $this->success($result['data'] ?? null, $result['message']);
    }
}
