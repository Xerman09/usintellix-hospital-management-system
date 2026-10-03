<?php

namespace App\Modules\StockTransfers\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\StockTransfers\Services\StockTransferService;

class StockTransferController extends Controller
{
    private StockTransferService $service;

    public function __construct()
    {
        $this->service = new StockTransferService();
    }

    /** Query: status?, warehouse_id? */
    public function index(): void
    {
        $request = new Request();

        $this->success($this->service->list([
            'status' => $request->input('status'),
            'warehouse_id' => $request->input('warehouse_id')
        ], Session::get('user')), 'Transfers retrieved successfully.');
    }

    public function show(): void
    {
        $request = new Request();
        $transfer = $this->service->get((int) $request->input('id'), Session::get('user'));

        if (!$transfer) {
            $this->error('Transfer not found.', 404);
            return;
        }

        $this->success($transfer, 'Transfer retrieved successfully.');
    }

    public function options(): void
    {
        $this->success($this->service->options(Session::get('user')), 'Options retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $this->respond($this->service->create($request->only(array_merge(StockTransferService::INPUT_FIELDS, ['sent_date', 'sent_via'])), Session::get('user')), 201);
    }

    public function update(): void
    {
        $request = new Request();
        $this->respond($this->service->update(
            (int) $request->input('id'),
            $request->only(array_merge(StockTransferService::INPUT_FIELDS, ['sent_date', 'sent_via'])),
            Session::get('user')
        ));
    }

    public function destroy(): void
    {
        $request = new Request();
        $this->respond($this->service->remove((int) $request->input('id'), Session::get('user')));
    }

    public function send(): void
    {
        $request = new Request();
        $this->respond($this->service->send((int) $request->input('id'), $request->only(['sent_date', 'sent_via']), Session::get('user')));
    }

    public function receive(): void
    {
        $request = new Request();
        $this->respond($this->service->receive((int) $request->input('id'), $request->only(['received_date', 'notes', 'lots']), Session::get('user')));
    }

    public function cancel(): void
    {
        $request = new Request();
        $this->respond($this->service->cancel((int) $request->input('id'), (string) $request->input('reason', ''), Session::get('user')));
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
