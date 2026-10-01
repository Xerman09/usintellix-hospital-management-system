<?php

namespace App\Modules\PurchaseOrders\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PurchaseOrders\Services\PurchaseOrderService;

class PurchaseOrderController extends Controller
{
    private PurchaseOrderService $service;

    public function __construct()
    {
        $this->service = new PurchaseOrderService();
    }

    /**
     * Order list. Query: status?, supplier_id? (both optional).
     */
    public function index(): void
    {
        $request = new Request();

        $this->success($this->service->list([
            'status' => $request->input('status'),
            'supplier_id' => $request->input('supplier_id')
        ], Session::get('user')), 'Purchase orders retrieved successfully.');
    }

    public function show(): void
    {
        $request = new Request();

        $order = $this->service->get((int) $request->input('id'), Session::get('user'));

        if (!$order) {
            $this->error('Purchase order not found.', 404);
            return;
        }

        $this->success($order, 'Purchase order retrieved successfully.');
    }

    public function options(): void
    {
        $this->success($this->service->options(), 'Options retrieved successfully.');
    }

    /** Body: header fields, items[], submit? (true = submit now instead of saving a draft). */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->respond($this->service->create($request->only(PurchaseOrderService::INPUT_FIELDS), (int) $user['id']), 201);
    }

    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->respond($this->service->update(
            (int) $request->input('id'),
            $request->only(PurchaseOrderService::INPUT_FIELDS),
            (int) $user['id']
        ));
    }

    /** Body: id, notes? */
    public function approve(): void
    {
        $request = new Request();

        $this->respond($this->service->approve(
            (int) $request->input('id'),
            (string) $request->input('notes', ''),
            Session::get('user')
        ));
    }

    /** Body: id, reason */
    public function reject(): void
    {
        $request = new Request();

        $this->respond($this->service->reject(
            (int) $request->input('id'),
            (string) $request->input('reason', ''),
            Session::get('user')
        ));
    }

    public function cancel(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->respond($this->service->cancel(
            (int) $request->input('id'),
            (string) $request->input('reason', ''),
            (int) $user['id']
        ));
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
            $status = !empty($result['not_found']) ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'] ?? null, $result['message'], $successStatus);
    }
}
