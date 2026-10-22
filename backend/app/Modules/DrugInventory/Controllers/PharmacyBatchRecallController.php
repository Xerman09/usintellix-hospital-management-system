<?php

namespace App\Modules\DrugInventory\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\DrugInventory\Services\PharmacyBatchRecallService;

class PharmacyBatchRecallController extends Controller
{
    private PharmacyBatchRecallService $service;

    public function __construct()
    {
        $this->service = new PharmacyBatchRecallService();
    }

    /**
     * List all batch recalls.
     */
    public function index(): void
    {
        $request = new Request();
        $recalls = $this->service->listRecalls([
            'status' => $request->input('status'),
            'drug_id' => $request->input('drug_id')
        ]);

        $this->success($recalls, 'Batch recalls retrieved successfully.');
    }

    /**
     * Get details of a single batch recall (including quarantined lots & affected patients).
     */
    public function detail(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Recall ID is required.', 422);
            return;
        }

        $details = $this->service->getRecallDetails($id);
        if (!$details) {
            $this->error('Batch recall record not found.', 404);
            return;
        }

        $this->success($details, 'Batch recall details retrieved successfully.');
    }

    /**
     * Create / initiate a new batch recall.
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);

        $result = $this->service->createRecall([
            'drug_id' => $request->input('drug_id'),
            'lot_number' => $request->input('lot_number'),
            'recall_class' => $request->input('recall_class'),
            'reason' => $request->input('reason'),
            'fda_advisory_ref' => $request->input('fda_advisory_ref'),
            'notes' => $request->input('notes')
        ], $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Update recall status.
     */
    public function updateStatus(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);

        $id = (int) $request->input('id');
        $status = (string) $request->input('status');
        $notes = $request->input('notes');

        if ($id <= 0) {
            $this->error('Recall ID is required.', 422);
            return;
        }

        $result = $this->service->updateRecallStatus($id, $status, $notes, $userId);
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }
}
