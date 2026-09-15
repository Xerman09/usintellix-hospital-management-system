<?php

namespace App\Modules\BatchPayments\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\BatchPayments\Services\BatchPaymentService;

class BatchPaymentController extends Controller
{
    private const HEADER_FIELDS = [
        'payment_date', 'post_to_date', 'payment_method', 'check_number', 'payment_amount',
        'paying_entity', 'payment_category', 'payment_from', 'payor_id', 'deposit_date', 'description'
    ];

    private BatchPaymentService $service;

    public function __construct()
    {
        $this->service = new BatchPaymentService();
    }

    /**
     * Search Payment tab: list batch payments matching optional filters.
     */
    public function index(): void
    {
        $request = new Request();

        $rows = $this->service->list([
            'from' => $request->input('from'),
            'to' => $request->input('to'),
            'payment_method' => $request->input('payment_method'),
            'check_number' => $request->input('check_number'),
            'payment_from' => $request->input('payment_from')
        ]);

        $this->success($rows, 'Batch payments retrieved successfully.');
    }

    /**
     * One batch payment's header + its allocations, for the Allocate view.
     */
    public function show(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        $batch = $id ? $this->service->find($id) : null;

        if (!$batch) {
            $this->error('Payment not found.', 404);
            return;
        }

        $this->success($batch, 'Payment retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $result = $this->service->create($request->only(self::HEADER_FIELDS), (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');

        $result = $this->service->update($id, $request->only(self::HEADER_FIELDS), (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');

        $result = $this->service->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Sets the "Distributed to Global" amount on a batch payment.
     */
    public function setGlobal(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $amount = (float) $request->input('distributed_to_global', 0);

        $result = $this->service->setDistributedToGlobal($id, $amount, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Allocates a slice of a batch payment to one patient/encounter.
     */
    public function allocate(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $batchPaymentId = (int) $request->input('batch_payment_id');

        if (!$batchPaymentId) {
            $this->error('Payment is required.', 422);
            return;
        }

        $result = $this->service->allocate(
            $batchPaymentId,
            $request->only(['patient_id', 'encounter_id', 'payment_amount', 'adjustment_amount', 'notes']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Removes one allocation (and its mirrored ledger payment).
     */
    public function removeAllocation(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');

        $result = $this->service->removeAllocation($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }
}
