<?php

namespace App\Modules\EquipmentAssets\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\EquipmentAssets\Services\BiomedicalMaintenanceService;

class BiomedicalController extends Controller
{
    private BiomedicalMaintenanceService $service;

    public function __construct()
    {
        $this->service = new BiomedicalMaintenanceService();
    }

    /**
     * Get PM summary KPI counts.
     */
    public function summary(): void
    {
        $metrics = $this->service->getPMCalendarSummary();
        $this->success($metrics, 'PM Calendar summary metrics retrieved.');
    }

    /**
     * Get Breakdown Ticketing & Urgent Repair KPI counts.
     */
    public function breakdownSummary(): void
    {
        $metrics = $this->service->getBreakdownSummary();
        $this->success($metrics, 'Breakdown ticketing summary metrics retrieved.');
    }

    /**
     * List all PM schedules with filters.
     */
    public function schedules(): void
    {
        $request = new Request();
        $filters = [
            'search'           => $request->input('search'),
            'maintenance_type' => $request->input('maintenance_type'),
            'frequency'        => $request->input('frequency'),
            'criticality_tier' => $request->input('criticality_tier'),
            'status'           => $request->input('status'),
            'asset_id'         => $request->input('asset_id'),
            'due_filter'       => $request->input('due_filter'),
        ];

        $schedules = $this->service->listSchedules($filters);
        $this->success($schedules, 'Preventive Maintenance schedules retrieved successfully.');
    }

    /**
     * Get single PM schedule.
     */
    public function showSchedule(): void
    {
        $request = new Request();
        $id = (int)$request->input('id');

        if (!$id) {
            $this->error('Schedule ID is required.', 422);
            return;
        }

        $schedule = $this->service->getSchedule($id);
        if (!$schedule) {
            $this->error('PM Schedule not found.', 404);
            return;
        }

        $this->success($schedule, 'PM Schedule details retrieved successfully.');
    }

    /**
     * Create PM schedule.
     */
    public function storeSchedule(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $data = $request->all();

        $result = $this->service->createSchedule($data, (int)($user['id'] ?? 1));
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update PM schedule.
     */
    public function updateSchedule(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $id = (int)$request->input('id');

        if (!$id) {
            $this->error('Schedule ID is required.', 422);
            return;
        }

        $data = $request->all();
        $result = $this->service->updateSchedule($id, $data, (int)($user['id'] ?? 1));
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Delete PM schedule.
     */
    public function destroySchedule(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $id = (int)$request->input('id');

        if (!$id) {
            $this->error('Schedule ID is required.', 422);
            return;
        }

        $result = $this->service->deleteSchedule($id, (int)($user['id'] ?? 1));
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * PM Calendar events view.
     */
    public function calendar(): void
    {
        $request = new Request();
        $year = $request->input('year') ? (int)$request->input('year') : null;
        $month = $request->input('month') ? (int)$request->input('month') : null;

        $events = $this->service->getPMCalendarEvents($year, $month);
        $this->success($events, 'PM Calendar events retrieved successfully.');
    }

    /**
     * Generate Work Order directly from PM Schedule.
     */
    public function generateWorkOrder(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $scheduleId = (int)$request->input('schedule_id');
        $scheduledDate = $request->input('scheduled_date') ?: date('Y-m-d');
        $notes = $request->input('notes');

        if (!$scheduleId) {
            $this->error('Schedule ID is required.', 422);
            return;
        }

        try {
            $pdo = \App\Core\Database::connection();
            $woNumber = $this->service->spawnWorkOrderFromSchedule($pdo, $scheduleId, $scheduledDate, $notes);
            $this->success(['work_order_number' => $woNumber], "Work order {$woNumber} spawned successfully from PM Schedule.");
        } catch (\Throwable $e) {
            $this->error('Failed to spawn work order: ' . $e->getMessage(), 500);
        }
    }

    /**
     * List Biomedical Work Orders.
     */
    public function workOrders(): void
    {
        $request = new Request();
        $filters = [
            'search'          => $request->input('search'),
            'status'          => $request->input('status'),
            'priority'        => $request->input('priority'),
            'work_order_type' => $request->input('work_order_type'),
            'asset_id'        => $request->input('asset_id'),
        ];

        $orders = $this->service->listWorkOrders($filters);
        $this->success($orders, 'Biomedical work orders retrieved successfully.');
    }

    /**
     * List Breakdown Tickets specifically.
     */
    public function breakdownTickets(): void
    {
        $request = new Request();
        $filters = [
            'search'       => $request->input('search'),
            'status'       => $request->input('status'),
            'priority'     => $request->input('priority'),
            'only_tickets' => true,
            'asset_id'     => $request->input('asset_id'),
        ];

        $tickets = $this->service->listWorkOrders($filters);
        $this->success($tickets, 'Biomedical breakdown tickets retrieved successfully.');
    }

    /**
     * File a new Breakdown Ticket: Alerts Biomedical Engineering and
     * AUTOMATICALLY flips machine status to "Under Repair" (clinical lockout).
     */
    public function storeBreakdownTicket(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $data = $request->all();

        $result = $this->service->createBreakdownTicket($data, (int)($user['id'] ?? 1));
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Resolve Breakdown Ticket: Logs root-cause diagnostics, spare parts replaced,
     * labor hours, electrical safety test, and releases machine back to "Operational".
     */
    public function resolveBreakdownTicket(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $id = (int)$request->input('id');

        if (!$id) {
            $this->error('Ticket/Work Order ID is required.', 422);
            return;
        }

        $data = $request->all();
        $result = $this->service->resolveBreakdownTicket($id, $data, (int)($user['id'] ?? 1));
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Get single Work Order details.
     */
    public function showWorkOrder(): void
    {
        $request = new Request();
        $id = (int)$request->input('id');

        if (!$id) {
            $this->error('Work Order ID is required.', 422);
            return;
        }

        $order = $this->service->getWorkOrder($id);
        if (!$order) {
            $this->error('Work order not found.', 404);
            return;
        }

        $this->success($order, 'Work order retrieved successfully.');
    }

    /**
     * Create Work Order manually.
     */
    public function storeWorkOrder(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $data = $request->all();

        $result = $this->service->createWorkOrder($data, (int)($user['id'] ?? 1));
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update Work Order.
     */
    public function updateWorkOrder(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $id = (int)$request->input('id');

        if (!$id) {
            $this->error('Work Order ID is required.', 422);
            return;
        }

        $data = $request->all();
        $result = $this->service->updateWorkOrder($id, $data, (int)($user['id'] ?? 1));
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Get Calibration Summary metrics.
     */
    public function calibrationSummary(): void
    {
        $summary = $this->service->getCalibrationSummary();
        $this->success($summary, 'NIST Calibration summary metrics retrieved.');
    }

    /**
     * List NIST Calibration Records.
     */
    public function calibrationRecords(): void
    {
        $request = new Request();
        $filters = [
            'search'           => $request->input('search'),
            'asset_id'         => $request->input('asset_id'),
            'calibration_type' => $request->input('calibration_type'),
            'overall_result'   => $request->input('overall_result'),
        ];

        $records = $this->service->listCalibrationRecords($filters);
        $this->success($records, 'NIST calibration certificates retrieved successfully.');
    }

    /**
     * Get single Calibration Certificate by ID.
     */
    public function calibrationRecord(): void
    {
        $request = new Request();
        $id = (int)$request->input('id');

        if (!$id) {
            $this->error('Certificate ID is required.', 422);
            return;
        }

        $record = $this->service->getCalibrationRecord($id);
        if (!$record) {
            $this->error('Calibration certificate not found.', 404);
            return;
        }

        $this->success($record, 'Calibration certificate retrieved.');
    }

    /**
     * Create / Record a formal Calibration Certificate & Safety test.
     */
    public function storeCalibrationRecord(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $data = $request->all();

        $result = $this->service->createCalibrationRecord($data, (int)($user['id'] ?? 1));
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }
}
