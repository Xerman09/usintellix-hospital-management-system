<?php

namespace App\Modules\PatientProcedureResults\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Core\PhiAccessGuard;
use App\Modules\PatientProcedureOrders\Models\PatientProcedureOrder;
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
        $user = Session::get('user');
        $request = new Request();
        $orderId = (int) $request->input('order_id');
        $patientId = (int) $request->input('patient_id');

        PhiAccessGuard::assertLabAccess($user);

        if ($orderId > 0) {
            $order = (new PatientProcedureOrder())->where('id', $orderId)->first();
            if (!$order || $order['deleted_at'] !== null) {
                $this->error('Procedure order not found.', 404);
                return;
            }
            PhiAccessGuard::assertPatientAccess($user, (int) $order['patient_id'], true);
            $results = $this->service->listForOrder($orderId);
        } elseif ($patientId > 0) {
            PhiAccessGuard::assertPatientAccess($user, $patientId, true);
            $results = $this->service->listForPatient($patientId);
        } else {
            $this->error('order_id or patient_id is required.', 422);
            return;
        }

        $this->success($results, 'Results retrieved successfully.');
    }

    public function bulkSave(): void
    {
        $user = Session::get('user');
        $request = new Request();

        PhiAccessGuard::assertLabAccess($user);

        $orderId = (int) $request->input('order_id');
        $rows = (array) $request->input('results', []);

        if ($orderId <= 0) {
            $this->error('order_id is required.', 422);
            return;
        }

        $order = (new PatientProcedureOrder())->where('id', $orderId)->first();
        if (!$order || $order['deleted_at'] !== null) {
            $this->error('Procedure order not found.', 404);
            return;
        }

        PhiAccessGuard::assertPatientAccess($user, (int) $order['patient_id'], true);

        $result = $this->service->saveForOrder($orderId, $rows, (int) $user['id']);

        if (!$result['success']) {
            $status = !empty($result['errors']) ? 422 : 404;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'] ?? null, $result['message']);
    }

    /** Multipart: order_id, file (CSV: code, name, value, units, reference_range, result_date, end_date, abnormal) */
    public function import(): void
    {
        $user = Session::get('user');
        $request = new Request();

        PhiAccessGuard::assertLabAccess($user);

        $orderId = (int) $request->input('order_id');
        $order = $orderId > 0 ? (new PatientProcedureOrder())->where('id', $orderId)->first() : null;
        if (!$order || $order['deleted_at'] !== null) {
            $this->error('Procedure order not found.', 404);
            return;
        }

        PhiAccessGuard::assertPatientAccess($user, (int) $order['patient_id'], true);

        $result = $this->service->importForOrder($orderId, $request->files()['file'] ?? [], (int) $user['id']);
        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'] ?? null, $result['message']);
    }
}
