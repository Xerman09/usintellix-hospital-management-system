<?php

namespace App\Modules\Requisitions\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Requisitions\Services\RequisitionService;

class RequisitionController extends Controller
{
    private RequisitionService $service;

    public function __construct()
    {
        $this->service = new RequisitionService();
    }

    /** Query: status?, department_id? */
    public function index(): void
    {
        $request = new Request();

        $this->success($this->service->list([
            'status' => $request->input('status'),
            'department_id' => $request->input('department_id')
        ], Session::get('user')), 'Requests retrieved successfully.');
    }

    public function show(): void
    {
        $request = new Request();
        $requisition = $this->service->get((int) $request->input('id'), Session::get('user'));

        if (!$requisition) {
            $this->error('Request not found.', 404);
            return;
        }

        $this->success($requisition, 'Request retrieved successfully.');
    }

    public function options(): void
    {
        $this->success($this->service->options(Session::get('user')), 'Options retrieved successfully.');
    }

    /** Query: warehouse_id */
    public function lowStock(): void
    {
        $request = new Request();
        $result = $this->service->lowStock((int) $request->input('warehouse_id'));

        if (!$result) {
            $this->error('Storage location not found.', 404);
            return;
        }

        $this->success($result, 'Low stock retrieved successfully.');
    }

    public function outstanding(): void
    {
        $this->success($this->service->outstanding(), 'Approved requests to order retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->respond($this->service->create($request->only(RequisitionService::INPUT_FIELDS), (int) $user['id']), 201);
    }

    public function update(): void
    {
        $request = new Request();

        $this->respond($this->service->update((int) $request->input('id'), $request->only(RequisitionService::INPUT_FIELDS), Session::get('user')));
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

    public function cancel(): void
    {
        $request = new Request();
        $this->respond($this->service->cancel((int) $request->input('id'), (string) $request->input('reason', ''), Session::get('user')));
    }

    public function close(): void
    {
        $request = new Request();
        $this->respond($this->service->close((int) $request->input('id'), (string) $request->input('reason', ''), Session::get('user')));
    }

    public function destroy(): void
    {
        $request = new Request();
        $this->respond($this->service->remove((int) $request->input('id'), Session::get('user')));
    }

    /** Body: lines: [{ requisition_item_id, quantity, supplier_id }] */
    public function convert(): void
    {
        $request = new Request();
        $this->respond($this->service->convert($request->only(['lines']), Session::get('user')), 201);
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
