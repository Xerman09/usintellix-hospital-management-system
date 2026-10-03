<?php

namespace App\Modules\Payables\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Payables\Services\PayableService;

class PayableController extends Controller
{
    private PayableService $service;

    public function __construct()
    {
        $this->service = new PayableService();
    }

    public function summary(): void
    {
        $this->success($this->service->summary(), 'Payables summary retrieved successfully.');
    }

    /** Query: supplier_id? */
    public function bills(): void
    {
        $request = new Request();

        $this->success($this->service->openBills(['supplier_id' => $request->input('supplier_id')]), 'Open bills retrieved successfully.');
    }

    public function suppliers(): void
    {
        $this->success($this->service->suppliers(), 'Suppliers retrieved successfully.');
    }

    /** Query: supplier_id?, status? */
    public function payments(): void
    {
        $request = new Request();

        $this->success($this->service->payments([
            'supplier_id' => $request->input('supplier_id'),
            'status' => $request->input('status')
        ]), 'Payments retrieved successfully.');
    }

    public function payment(): void
    {
        $request = new Request();
        $payment = $this->service->payment((int) $request->input('id'));

        if (!$payment) {
            $this->error('Payment not found.', 404);
            return;
        }

        $this->success($payment, 'Payment retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->respond($this->service->record($request->only([
            'supplier_id', 'payment_date', 'method', 'reference_no', 'check_date', 'paid_from', 'ewt_rate', 'notes', 'allocations'
        ]), (int) $user['id']), 201);
    }

    /** Body: id, reason */
    public function void(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->respond($this->service->void((int) $request->input('id'), (string) $request->input('reason', ''), (int) $user['id']));
    }

    /** Supplier credits not yet used. Query: supplier_id? */
    public function credits(): void
    {
        $request = new Request();
        $supplierId = (int) $request->input('supplier_id');

        $this->success($this->service->credits($supplierId ?: null), 'Supplier credits retrieved successfully.');
    }

    /** Body: supplier_return_id, payment_date?, notes?, allocations */
    public function applyCredit(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->respond($this->service->applyCredit(
            (int) $request->input('supplier_return_id'),
            $request->only(['payment_date', 'notes', 'allocations']),
            (int) $user['id']
        ), 201);
    }

    /** Query: as_of? (YYYY-MM-DD, default today) */
    public function aging(): void
    {
        $request = new Request();

        $this->success($this->service->aging($request->input('as_of')), 'Aging retrieved successfully.');
    }

    /** Query: supplier_id, from?, to? */
    public function ledger(): void
    {
        $request = new Request();
        $ledger = $this->service->ledger((int) $request->input('supplier_id'), $request->input('from'), $request->input('to'));

        if (!$ledger) {
            $this->error('Supplier not found.', 404);
            return;
        }

        $this->success($ledger, 'Supplier ledger retrieved successfully.');
    }

    private function respond(array $result, int $successStatus = 200): void
    {
        if (!$result['success']) {
            $this->error($result['message'], !empty($result['not_found']) ? 404 : 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'] ?? null, $result['message'], $successStatus);
    }
}
