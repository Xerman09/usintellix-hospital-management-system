<?php

namespace App\Modules\Receiving\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PurchaseOrders\Services\PurchaseOrderService;
use App\Modules\Receiving\Services\ReceivingService;

class ReceivingController extends Controller
{
    private ReceivingService $service;

    public function __construct()
    {
        $this->service = new ReceivingService();
    }

    /** Approved / partially received orders still waiting for deliveries. */
    public function pending(): void
    {
        $this->success($this->service->pending(Session::get('user')), 'Orders awaiting delivery retrieved successfully.');
    }

    /** The order to receive against, with each line's remaining quantity. */
    public function order(): void
    {
        $request = new Request();

        $order = (new PurchaseOrderService())->get((int) $request->input('id'), Session::get('user'));

        if (!$order) {
            $this->error('Purchase order not found.', 404);
            return;
        }

        $this->success($order, 'Purchase order retrieved successfully.');
    }

    /** Receipts. Query: purchase_order_id?, supplier_id? */
    public function index(): void
    {
        $request = new Request();

        $this->success($this->service->list([
            'purchase_order_id' => $request->input('purchase_order_id'),
            'supplier_id' => $request->input('supplier_id')
        ]), 'Receipts retrieved successfully.');
    }

    public function show(): void
    {
        $request = new Request();

        $receipt = $this->service->get((int) $request->input('id'));

        if (!$receipt) {
            $this->error('Receipt not found.', 404);
            return;
        }

        $this->success($receipt, 'Receipt retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $result = $this->service->receive($request->only(ReceivingService::INPUT_FIELDS), (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], !empty($result['not_found']) ? 404 : 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }
}
