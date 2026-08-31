<?php

namespace App\Modules\PatientProcedureOrders\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientProcedureOrders\Services\PatientProcedureOrderService;

class PatientProcedureOrderController extends Controller
{
    private PatientProcedureOrderService $service;

    public function __construct()
    {
        $this->service = new PatientProcedureOrderService();
    }

    public function index(): void
    {
        $request = new Request();

        $filters = $request->only([
            'patient_id',
            'from',
            'to',
            'status',
            'provider_id',
            'vendor_facility_id'
        ]);

        $orders = $this->service->list($filters);

        $this->success($orders, 'Procedure orders retrieved successfully.');
    }

    public function store(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $data = $request->only([
            'patient_id',
            'procedure_order_config_id',
            'provider_id',
            'vendor_facility_id',
            'order_date',
            'ext_time_collected',
            'specimen'
        ]);

        $result = $this->service->register($data, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function update(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $data = $request->only([
            'status',
            'specimen',
            'ext_time_collected',
            'reported_at'
        ]);

        $result = $this->service->update($id, $data, (int) $user['id']);

        if (!$result['success']) {
            $status = !empty($result['errors']) ? 422 : 404;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function destroy(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->service->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
