<?php

namespace App\Modules\RoomManagement\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Modules\RoomManagement\Services\BedTurnoverService;
use Throwable;

class BedTurnoverController extends Controller
{
    private BedTurnoverService $service;

    public function __construct()
    {
        $this->service = new BedTurnoverService();
    }

    /**
     * GET /room-management/evs/turnovers
     */
    public function index(): void
    {
        try {
            $request = new Request();
            $filters = [
                'status'        => $request->input('status'),
                'stage'         => $request->input('stage'),
                'active_only'   => $request->input('active_only'),
                'priority'      => $request->input('priority'),
                'cleaning_type' => $request->input('cleaning_type'),
                'ward_id'       => $request->input('ward_id'),
                'building_id'   => $request->input('building_id'),
                'search'        => $request->input('search')
            ];

            $logs = $this->service->listTurnovers(array_filter($filters, fn($v) => $v !== null && $v !== ''));
            $this->success($logs, 'EVS bed turnover logs retrieved successfully.');
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /room-management/evs/stats
     */
    public function stats(): void
    {
        try {
            $stats = $this->service->getStats();
            $this->success($stats, 'EVS pipeline metrics retrieved successfully.');
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /room-management/evs/turnover/detail
     */
    public function detail(): void
    {
        try {
            $request = new Request();
            $id = (int)$request->input('id');
            if ($id <= 0) {
                $this->error('Turnover ID is required.', 422);
                return;
            }

            $detail = $this->service->getTurnoverDetail($id);
            if (!$detail) {
                $this->error('Turnover log not found.', 404);
                return;
            }

            $this->success($detail, 'Turnover detail retrieved successfully.');
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /room-management/evs/turnovers
     * Manually trigger a turnover log for any bed
     */
    public function store(): void
    {
        try {
            $request = new Request();
            $bedId = (int)$request->input('bed_id');
            if ($bedId <= 0) {
                $this->error('Valid Bed ID is required.', 422);
                return;
            }

            $admissionId = !empty($request->input('admission_id')) ? (int)$request->input('admission_id') : null;
            $userId = !empty($request->user['id']) ? (int)$request->user['id'] : null;
            $priority = (string)($request->input('cleaning_priority') ?? 'Routine');
            $cleaningType = (string)($request->input('cleaning_type') ?? 'Routine Turnover');
            $notes = $request->input('notes');

            $res = $this->service->initiateTurnover($bedId, $admissionId, $userId, $priority, $cleaningType, $notes);
            if (!$res['success']) {
                $this->error($res['message'], 422);
                return;
            }

            $this->success($res, $res['message'], 201);
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /room-management/evs/turnover/assign
     */
    public function assign(): void
    {
        try {
            $request = new Request();
            $id = (int)$request->input('id');
            if ($id <= 0) {
                $this->error('Turnover ID is required.', 422);
                return;
            }

            $res = $this->service->assignStaff($id, $request->all());
            if (!$res['success']) {
                $this->error($res['message'], 422);
                return;
            }

            $this->success($res, $res['message']);
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /room-management/evs/turnover/start
     */
    public function start(): void
    {
        try {
            $request = new Request();
            $id = (int)$request->input('id');
            if ($id <= 0) {
                $this->error('Turnover ID is required.', 422);
                return;
            }

            $res = $this->service->startCleaning($id, $request->all());
            if (!$res['success']) {
                $this->error($res['message'], 422);
                return;
            }

            $this->success($res, $res['message']);
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /room-management/evs/turnover/complete
     */
    public function complete(): void
    {
        try {
            $request = new Request();
            $id = (int)$request->input('id');
            if ($id <= 0) {
                $this->error('Turnover ID is required.', 422);
                return;
            }

            $res = $this->service->completeCleaning($id, $request->all());
            if (!$res['success']) {
                $this->error($res['message'], 422);
                return;
            }

            $this->success($res, $res['message']);
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /room-management/evs/turnover/inspect
     */
    public function inspect(): void
    {
        try {
            $request = new Request();
            $id = (int)$request->input('id');
            if ($id <= 0) {
                $this->error('Turnover ID is required.', 422);
                return;
            }

            $userId = !empty($request->user['id']) ? (int)$request->user['id'] : null;
            $res = $this->service->inspectAndRelease($id, $request->all(), $userId);
            if (!$res['success']) {
                $this->error($res['message'], 422);
                return;
            }

            $this->success($res, $res['message']);
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /room-management/evs/turnover/cancel
     */
    public function cancel(): void
    {
        try {
            $request = new Request();
            $id = (int)$request->input('id');
            $reason = trim((string)($request->input('reason') ?? 'Administrative cancellation'));

            if ($id <= 0) {
                $this->error('Turnover ID is required.', 422);
                return;
            }

            $res = $this->service->cancelTurnover($id, $reason);
            if (!$res['success']) {
                $this->error($res['message'], 422);
                return;
            }

            $this->success(null, $res['message']);
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 500);
        }
    }
}
