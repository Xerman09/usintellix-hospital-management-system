<?php

namespace App\Modules\SupplierReturns\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\SupplierReturns\Services\SupplierReturnService;

class SupplierReturnController extends Controller
{
    private SupplierReturnService $service;

    public function __construct()
    {
        $this->service = new SupplierReturnService();
    }

    /** Query: status?, supplier_id? */
    public function index(): void
    {
        $request = new Request();

        $this->success($this->service->list([
            'status' => $request->input('status'),
            'supplier_id' => $request->input('supplier_id')
        ], Session::get('user')), 'Returns retrieved successfully.');
    }

    public function show(): void
    {
        $request = new Request();
        $return = $this->service->get((int) $request->input('id'), Session::get('user'));

        if (!$return) {
            $this->error('Return not found.', 404);
            return;
        }

        $this->success($return, 'Return retrieved successfully.');
    }

    /** Query: supplier_id, return_id? -- rejected quantities and stock lots that can go back. */
    public function sources(): void
    {
        $request = new Request();
        $returnId = (int) $request->input('return_id');

        $this->success($this->service->sources((int) $request->input('supplier_id'), $returnId ?: null), 'Items retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->respond($this->service->create($request->only(SupplierReturnService::INPUT_FIELDS), (int) $user['id']), 201);
    }

    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->respond($this->service->update((int) $request->input('id'), $request->only(SupplierReturnService::INPUT_FIELDS), (int) $user['id']));
    }

    public function approve(): void
    {
        $request = new Request();
        $this->respond($this->service->approve((int) $request->input('id'), (string) $request->input('notes', ''), Session::get('user')));
    }

    public function reject(): void
    {
        $request = new Request();
        $this->respond($this->service->reject((int) $request->input('id'), (string) $request->input('reason', ''), Session::get('user')));
    }

    /** Body: id, sent_date?, sent_via? */
    public function send(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->respond($this->service->send((int) $request->input('id'), $request->only(['sent_date', 'sent_via']), (int) $user['id']));
    }

    /** Body: id, credit_memo_no, credit_memo_date, credit_amount */
    public function credit(): void
    {
        $request = new Request();

        $this->respond($this->service->credit(
            (int) $request->input('id'),
            $request->only(['credit_memo_no', 'credit_memo_date', 'credit_amount']),
            Session::get('user')
        ));
    }

    public function cancel(): void
    {
        $request = new Request();
        $this->respond($this->service->cancel((int) $request->input('id'), (string) $request->input('reason', ''), Session::get('user')));
    }

    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->respond($this->service->remove((int) $request->input('id'), (int) $user['id']));
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
