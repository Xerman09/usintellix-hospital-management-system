<?php

namespace App\Modules\StockCounts\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\StockCounts\Services\StockCountService;

class StockCountController extends Controller
{
    private StockCountService $service;

    public function __construct()
    {
        $this->service = new StockCountService();
    }

    /** Query: status?, warehouse_id? */
    public function index(): void
    {
        $request = new Request();

        $this->success($this->service->list([
            'status' => $request->input('status'),
            'warehouse_id' => $request->input('warehouse_id')
        ], Session::get('user')), 'Counts retrieved successfully.');
    }

    public function show(): void
    {
        $request = new Request();
        $count = $this->service->get((int) $request->input('id'), Session::get('user'));

        if (!$count) {
            $this->error('Count not found.', 404);
            return;
        }

        $this->success($count, 'Count retrieved successfully.');
    }

    public function options(): void
    {
        $this->success($this->service->options(Session::get('user')), 'Options retrieved successfully.');
    }

    /** Query: date_from?, date_to?, warehouse_id?, reason? */
    public function report(): void
    {
        $request = new Request();

        $this->success($this->service->report([
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
            'warehouse_id' => $request->input('warehouse_id'),
            'reason' => $request->input('reason')
        ]), 'Report retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $this->respond($this->service->start($request->only(StockCountService::START_FIELDS), Session::get('user')), 201);
    }

    public function update(): void
    {
        $request = new Request();
        $this->respond($this->service->saveCounts((int) $request->input('id'), $request->only(StockCountService::COUNT_FIELDS), Session::get('user')));
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

    private function respond(array $result, int $successStatus = 200): void
    {
        if (!$result['success']) {
            $this->error($result['message'], !empty($result['not_found']) ? 404 : 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'] ?? null, $result['message'], $successStatus);
    }
}
