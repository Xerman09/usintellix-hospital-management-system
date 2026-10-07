<?php

namespace App\Modules\NursingStaff\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\NursingStaff\Services\NursingShiftService;

class NursingShiftController extends Controller
{
    private NursingShiftService $service;

    public function __construct()
    {
        $this->service = new NursingShiftService();
    }

    /** Query: ward_id?, date?, shift_id? -- one ward's patients for one shift. */
    public function board(): void
    {
        $request = new Request();
        $filters = array_intersect_key($request->all(), array_flip(['ward_id', 'date', 'shift_id']));
        $this->success($this->service->board($filters, $this->user()), 'Assignments retrieved.');
    }

    /** Body: ward_id, date, shift_id, rows: [{admission_id, nurse_user_id?, cna_user_id?}] */
    public function save(): void
    {
        $request = new Request();
        $this->respond($this->service->save($request->all(), $this->user()));
    }

    /** Body: ward_id, date, shift_id */
    public function copyPrevious(): void
    {
        $request = new Request();
        $this->respond($this->service->copyPrevious($request->all(), $this->user()));
    }

    /** My patients this shift. */
    public function mine(): void
    {
        $this->success($this->service->mine($this->user()), 'Retrieved.');
    }

    /** Query: patient_id or admission_id -- ward / bed, nurse and CNA this shift and next, latest hand-over. */
    public function patient(): void
    {
        $request = new Request();
        $data = $request->input('admission_id')
            ? $this->service->forAdmission((int) $request->input('admission_id'))
            : $this->service->forPatient((int) $request->input('patient_id'));
        $this->success($data, $data ? 'Retrieved.' : 'Not admitted.');
    }

    /** Query: admission_id */
    public function handovers(): void
    {
        $request = new Request();
        $this->success($this->service->handovers((int) $request->input('admission_id'), $this->user()), 'Retrieved.');
    }

    /** Body: admission_id, date, shift_id, situation, background?, assessment?, recommendation? */
    public function writeHandover(): void
    {
        $request = new Request();
        $this->respond($this->service->writeHandover($request->all(), $this->user()));
    }

    /** Body: id */
    public function receive(): void
    {
        $request = new Request();
        $this->respond($this->service->receive((int) $request->input('id'), $this->user()));
    }

    private function user(): array
    {
        return Session::get('user') ?? [];
    }

    private function respond(array $result): void
    {
        if (!$result['success']) {
            $status = !empty($result['not_found']) ? 404 : (!empty($result['forbidden']) ? 403 : 422);
            $this->json(['success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null], $status);
            return;
        }
        $this->success($result['data'] ?? null, $result['message']);
    }
}
