<?php

namespace App\Modules\PatientProcedureResults\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientProcedureResults\Services\PatientProcedureResultService;

class PatientProcedureResultController extends Controller
{
    private PatientProcedureResultService $service;

    public function __construct()
    {
        $this->service = new PatientProcedureResultService();
    }

    public function index(): void
    {
        $request = new Request();
        $orderId = (int) $request->input('order_id');

        if ($orderId <= 0) {
            $this->error('order_id is required.', 422);
            return;
        }

        $results = $this->service->listForOrder($orderId);

        $this->success($results, 'Results retrieved successfully.');
    }

    public function bulkSave(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $orderId = (int) $request->input('order_id');
        $rows = (array) $request->input('results', []);

        if ($orderId <= 0) {
            $this->error('order_id is required.', 422);
            return;
        }

        $result = $this->service->saveForOrder($orderId, $rows, (int) $user['id']);

        if (!$result['success']) {
            $status = !empty($result['errors']) ? 422 : 404;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }
}
