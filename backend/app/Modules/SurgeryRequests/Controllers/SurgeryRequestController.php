<?php

namespace App\Modules\SurgeryRequests\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\SurgeryRequests\Services\SurgeryRequestService;

class SurgeryRequestController extends Controller
{
    private const FIELDS = [
        'patient_id', 'encounter_id', 'specialization_id', 'surgery_id', 'procedure_name', 'laterality', 'diagnosis_code', 'diagnosis_text',
        'surgeon_user_id', 'surgeon_override_reason', 'priority', 'preferred_date', 'estimated_duration_minutes', 'anesthesia_type', 'notes', 'version'
    ];

    private SurgeryRequestService $service;

    public function __construct()
    {
        $this->service = new SurgeryRequestService();
    }

    /** Query: view?, specialization_id?, q? */
    public function index(): void
    {
        $request = new Request();
        $this->success($this->service->list($request->only(['view', 'specialization_id', 'q'])), 'Surgery requests retrieved successfully.');
    }

    /** Query: id */
    public function show(): void
    {
        $request = new Request();
        $data = $this->service->get((int) $request->input('id'), (int) (Session::get('user')['id'] ?? 0));

        if (!$data) {
            $this->error('Surgery request not found.', 404);
            return;
        }

        $this->success($data, 'Surgery request retrieved successfully.');
    }

    /** Query: patient_id -- requests, OR cases and past surgeries for the chart. */
    public function patient(): void
    {
        $request = new Request();
        $this->success($this->service->patientSummary((int) $request->input('patient_id')), 'Patient surgeries retrieved successfully.');
    }

    /** Query: patient_id */
    public function formOptions(): void
    {
        $request = new Request();
        $this->success($this->service->formOptions((int) $request->input('patient_id'), Session::get('user')), 'Options retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $this->respond($this->service->create($request->only(self::FIELDS), Session::get('user')), 201);
    }

    /** Body: id, request fields, version */
    public function update(): void
    {
        $request = new Request();
        $this->respond($this->service->update((int) $request->input('id'), $request->only(self::FIELDS), Session::get('user')));
    }

    /** Body: request_id, item_key, status, details?, notes? */
    public function check(): void
    {
        $request = new Request();
        $this->respond($this->service->saveCheck($request->only(['request_id', 'item_key', 'status', 'details', 'notes']), Session::get('user')));
    }

    /** Body: id, reason -- an Emergency made ready before the checklist is done. */
    public function readyOverride(): void
    {
        $request = new Request();
        $this->respond($this->service->readyOverride((int) $request->input('id'), (string) $request->input('reason'), Session::get('user')));
    }

    /** Body: id, reason */
    public function cancel(): void
    {
        $request = new Request();
        $this->respond($this->service->cancel((int) $request->input('id'), (string) $request->input('reason'), Session::get('user')));
    }

    private function respond(array $result, int $successStatus = 200): void
    {
        if (!$result['success']) {
            $status = !empty($result['not_found']) ? 404 : (!empty($result['stale']) ? 409 : 422);
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'] ?? null, $result['message'], $successStatus);
    }
}
