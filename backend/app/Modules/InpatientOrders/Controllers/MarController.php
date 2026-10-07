<?php

namespace App\Modules\InpatientOrders\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\InpatientOrders\Services\MarService;

class MarController extends Controller
{
    private MarService $service;

    public function __construct()
    {
        $this->service = new MarService();
    }

    /** Query: ward_id? ("mine" = the patients assigned to me this shift) */
    public function board(): void
    {
        $request = new Request();
        $this->success($this->service->board(['ward_id' => (string) $request->input('ward_id', '')], $this->user()), 'Retrieved.');
    }

    /** Query: admission_id, date?, shift_id? */
    public function admission(): void
    {
        $request = new Request();
        $data = $this->service->forAdmission((int) $request->input('admission_id'), [
            'date' => $request->input('date'), 'shift_id' => $request->input('shift_id'),
        ], $this->user());
        if (!$data) {
            $this->error('Admission not found.', 404);
            return;
        }
        $this->success($data, 'Retrieved.');
    }

    /** Body: order_id, scheduled_at?, given_at?, reason?, note?, witness_username?, witness_password? */
    public function give(): void
    {
        $request = new Request();
        $this->respond($this->service->give($request->all(), $this->user()), 201);
    }

    /** Body: order_id, scheduled_at, reason, note? */
    public function hold(): void
    {
        $request = new Request();
        $this->respond($this->service->skip('held', $request->all(), $this->user()), 201);
    }

    /** Body: order_id, scheduled_at, reason, note? */
    public function refuse(): void
    {
        $request = new Request();
        $this->respond($this->service->skip('refused', $request->all(), $this->user()), 201);
    }

    /** Body: id, reason */
    public function void(): void
    {
        $request = new Request();
        $this->respond($this->service->void((int) $request->input('id'), (string) $request->input('reason', ''), $this->user()));
    }

    private function user(): array
    {
        return Session::get('user') ?? [];
    }

    private function respond(array $result, int $status = 200): void
    {
        if (!$result['success']) {
            $code = !empty($result['not_found']) ? 404 : (!empty($result['forbidden']) ? 403 : (!empty($result['conflict']) ? 409 : 422));
            $this->json([
                'success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null,
                'needs_witness' => !empty($result['needs_witness']),
            ], $code);
            return;
        }
        $this->success($result['data'] ?? null, $result['message'], $status);
    }
}
