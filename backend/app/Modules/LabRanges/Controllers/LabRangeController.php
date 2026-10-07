<?php

namespace App\Modules\LabRanges\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Core\PhiAccessGuard;
use App\Modules\LabRanges\Services\CriticalLabService;
use App\Modules\LabRanges\Services\LabRangeService;

class LabRangeController extends Controller
{
    private LabRangeService $service;

    public function __construct()
    {
        $this->service = new LabRangeService();
    }

    public function index(): void
    {
        $this->success($this->service->list(), 'Retrieved.');
    }

    /** Body: id? (update), name, code?, aliases?, units?, normal_low?, normal_high?, critical_low?, critical_high?, critical_values?, normal_values?, notes?, is_active? */
    public function save(): void
    {
        $request = new Request();
        $this->respond($this->service->save($request->all(), Session::get('user') ?? []));
    }

    /** Body: id */
    public function destroy(): void
    {
        $request = new Request();
        $this->respond($this->service->delete((int) $request->input('id'), Session::get('user') ?? []));
    }

    /** Body: code?, name, value, units?, reference_range? -- how would it be flagged */
    public function test(): void
    {
        $request = new Request();
        $this->success($this->service->test($request->all()), 'Checked.');
    }

    /** Query: patient_id -- the chart's red banner: critical results not acknowledged (or acknowledged lately). */
    public function patientCritical(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $patientId = (int) $request->input('patient_id');
        PhiAccessGuard::assertPatientAccess($user, $patientId, true);
        $this->success((new CriticalLabService())->forPatient($patientId, $user), 'Retrieved.');
    }

    /** Body: alert_id, told_self | told_name + told_role, told_at?, method, read_back, action -- acknowledge with the read-back */
    public function acknowledge(): void
    {
        $request = new Request();
        $this->respond((new CriticalLabService())->acknowledge((int) $request->input('alert_id'), $request->all(), Session::get('user') ?? []));
    }

    /** How the person responsible can be told (for the read-back form). */
    public function readbackOptions(): void
    {
        $this->success(['methods' => CriticalLabService::METHODS, 'policy_minutes' => CriticalLabService::POLICY_MINUTES], 'Retrieved.');
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
