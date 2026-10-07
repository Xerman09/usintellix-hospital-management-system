<?php

namespace App\Modules\InpatientOrders\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\InpatientOrders\Services\MedOrderService;

class MedOrderController extends Controller
{
    private MedOrderService $service;

    public function __construct()
    {
        $this->service = new MedOrderService();
    }

    public function options(): void
    {
        $this->success($this->service->options(), 'Retrieved.');
    }

    /** Query: q */
    public function drugs(): void
    {
        $request = new Request();
        $this->success($this->service->searchDrugs((string) $request->input('q', '')), 'Retrieved.');
    }

    /** Body: admission_id, drug_id -- the allergy / duplicate checks before ordering. */
    public function check(): void
    {
        $request = new Request();
        $this->respond($this->service->preview($request->all()));
    }

    public function store(): void
    {
        $request = new Request();
        $this->respond($this->service->create($request->all(), $this->user()), 201);
    }

    /** Query: admission_id */
    public function admission(): void
    {
        $request = new Request();
        $data = $this->service->forAdmission((int) $request->input('admission_id'));
        if (!$data) {
            $this->error('Admission not found.', 404);
            return;
        }
        $this->success($data, 'Retrieved.');
    }

    /** Query: patient_id -- the chart widget (null when not admitted). */
    public function patient(): void
    {
        $request = new Request();
        $data = $this->service->forPatient((int) $request->input('patient_id'));
        $this->success($data, $data ? 'Retrieved.' : 'Not admitted.');
    }

    public function queue(): void
    {
        $this->success($this->service->queue(), 'Retrieved.');
    }

    /** Body: id, note?, acknowledge?, override_reason? */
    public function verify(): void
    {
        $request = new Request();
        $this->respond($this->service->verify((int) $request->input('id'), $request->all(), $this->user()));
    }

    /** Body: id, reason */
    public function reject(): void
    {
        $request = new Request();
        $this->respond($this->service->reject((int) $request->input('id'), (string) $request->input('reason', ''), $this->user()));
    }

    /** Body: id, reason */
    public function discontinue(): void
    {
        $request = new Request();
        $this->respond($this->service->discontinue((int) $request->input('id'), (string) $request->input('reason', ''), $this->user()));
    }

    private function user(): array
    {
        return Session::get('user') ?? [];
    }

    private function respond(array $result, int $status = 200): void
    {
        if (!$result['success']) {
            $code = !empty($result['not_found']) ? 404 : (!empty($result['forbidden']) ? 403 : 422);
            $this->json([
                'success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null,
                'warnings' => $result['warnings'] ?? null, 'needs_ack' => !empty($result['needs_ack']), 'needs_reason' => !empty($result['needs_reason']),
            ], $code);
            return;
        }
        $this->success($result['data'] ?? null, $result['message'], $status);
    }
}
