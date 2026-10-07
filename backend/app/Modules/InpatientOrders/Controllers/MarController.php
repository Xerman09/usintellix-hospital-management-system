<?php

namespace App\Modules\InpatientOrders\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\InpatientOrders\Services\DdRegisterService;
use App\Modules\InpatientOrders\Services\MarService;
use App\Modules\InpatientOrders\Services\MedSupplyService;

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

    /** Body: id, pain_score, rechecked_at?, note? -- the pain recheck after an as-needed pain dose */
    public function recheck(): void
    {
        $request = new Request();
        $this->respond($this->service->recheck((int) $request->input('id'), $request->all(), $this->user()));
    }

    /** Query: from?, to?, ward?, drug_id? -- the dangerous-drugs register */
    public function ddRegister(): void
    {
        $request = new Request();
        $this->success((new DdRegisterService())->list([
            'from' => $request->input('from'), 'to' => $request->input('to'), 'ward' => $request->input('ward'), 'drug_id' => $request->input('drug_id'),
        ]), 'Retrieved.');
    }

    /** Query: order_id -- where a dose can be taken from (the give form) */
    public function supply(): void
    {
        $request = new Request();
        $data = (new MedSupplyService())->options((int) $request->input('order_id'));
        if (!$data) {
            $this->error('Order not found.', 404);
            return;
        }
        $this->success($data, 'Retrieved.');
    }

    public function supplySettings(): void
    {
        $this->success((new MedSupplyService())->settings(), 'Retrieved.');
    }

    /** Body: pharmacy_warehouse_id?, wards: {ward_id: warehouse_id|null} */
    public function saveSupplySettings(): void
    {
        $request = new Request();
        $this->respond((new MedSupplyService())->saveSettings($request->all(), $this->user()));
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
                'needs_witness' => !empty($result['needs_witness']), 'needs_confirm' => !empty($result['needs_confirm']),
            ], $code);
            return;
        }
        $this->success($result['data'] ?? null, $result['message'], $status);
    }
}
