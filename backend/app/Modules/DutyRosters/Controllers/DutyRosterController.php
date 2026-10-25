<?php

namespace App\Modules\DutyRosters\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Modules\DutyRosters\Services\DutyRosterService;
use Throwable;

class DutyRosterController extends Controller
{
    private DutyRosterService $service;

    public function __construct()
    {
        $this->service = new DutyRosterService();
    }

    /**
     * GET /duty-rosters/calendar
     * Returns monthly roster grid, KPIs, and shift details
     */
    public function calendar(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $deptId = (int)($request->input('department_id') ?? 0);
            $month = trim($request->input('month') ?? '');
            $role = trim($request->input('role') ?? '');
            $status = trim($request->input('status') ?? '');

            $result = $this->service->getRosterCalendar($deptId, $month, $role, $status);
            return Response::json(['status' => 'success', 'data' => $result]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /duty-rosters/directory/today
     * Emergency switchboard active on-call paging list
     */
    public function todayDirectory(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $deptId = $request->input('department_id') ? (int)$request->input('department_id') : null;
            $result = $this->service->getTodayOnCallDirectory($deptId);
            return Response::json(['status' => 'success', 'data' => $result]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /duty-rosters
     * Create duty roster assignment
     */
    public function store(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();
            $user = Session::get('user');
            $userId = (int)($user['id'] ?? ($_SESSION['user_id'] ?? 1));
            $res = $this->service->createAssignment($payload, $userId);
            return Response::json(['status' => 'success', 'data' => $res], 201);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * PUT /duty-rosters
     * Update existing assignment
     */
    public function update(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();
            $id = (int)($payload['id'] ?? $request->input('id') ?? 0);
            $user = Session::get('user');
            $userId = (int)($user['id'] ?? ($_SESSION['user_id'] ?? 1));
            $res = $this->service->updateAssignment($id, $payload, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * DELETE /duty-rosters
     * Cancel or delete assignment
     */
    public function destroy(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)($request->input('id') ?? 0);
            $deleted = $this->service->deleteAssignment($id);
            return Response::json(['status' => 'success', 'deleted' => $deleted, 'message' => 'Duty roster entry removed.']);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /duty-rosters/swaps
     * Submit shift swap request
     */
    public function requestSwap(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();
            $user = Session::get('user');
            $userId = (int)($user['id'] ?? ($_SESSION['user_id'] ?? 1));
            $res = $this->service->requestShiftSwap($payload, $userId);
            return Response::json(['status' => 'success', 'data' => $res], 201);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /duty-rosters/swaps/approve
     * Approve shift swap
     */
    public function approveSwap(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)($request->input('id') ?? 0);
            $user = Session::get('user');
            $userId = (int)($user['id'] ?? ($_SESSION['user_id'] ?? 1));
            $res = $this->service->approveShiftSwap($id, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /duty-rosters/swaps/reject
     * Reject shift swap
     */
    public function rejectSwap(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)($request->input('id') ?? 0);
            $reason = trim($request->input('rejection_reason') ?? 'Rejected by department head.');
            $user = Session::get('user');
            $userId = (int)($user['id'] ?? ($_SESSION['user_id'] ?? 1));
            $res = $this->service->rejectShiftSwap($id, $reason, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * GET /duty-rosters/swaps
     * List shift swaps
     */
    public function listSwaps(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $deptId = (int)($request->input('department_id') ?? 0);
            $status = trim($request->input('status') ?? '');
            $res = $this->service->listShiftSwaps($deptId, $status);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /duty-rosters/metadata
     * Departments and available doctors
     */
    public function metadata(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $deptId = (int)($request->input('department_id') ?? 0);
            $departments = $this->service->getDepartments();
            $doctors = $this->service->getAvailableDoctors($deptId);

            return Response::json([
                'status' => 'success',
                'data' => [
                    'departments' => $departments,
                    'doctors' => $doctors
                ]
            ]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
