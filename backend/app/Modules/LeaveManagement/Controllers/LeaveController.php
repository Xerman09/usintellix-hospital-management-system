<?php

namespace App\Modules\LeaveManagement\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Modules\LeaveManagement\Services\LeaveService;
use Throwable;

class LeaveController extends Controller
{
    private LeaveService $service;

    public function __construct()
    {
        $this->service = new LeaveService();
    }

    /**
     * GET /leave/requests
     */
    public function index(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $filters = [
                'employee_id' => $request->input('employee_id'),
                'department_id' => $request->input('department_id'),
                'leave_type' => $request->input('leave_type'),
                'status' => $request->input('status'),
                'coverage_pending' => $request->input('coverage_pending'),
                'start_date' => $request->input('start_date'),
                'end_date' => $request->input('end_date'),
                'q' => $request->input('q')
            ];
            $page = max(1, (int)($request->input('page') ?? 1));
            $perPage = max(5, min(100, (int)($request->input('per_page') ?? 25)));

            $data = $this->service->listLeaveRequests($filters, $page, $perPage);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /leave/balances
     * Annual quota balances for specific employee
     */
    public function balances(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $employeeId = (int)$request->input('employee_id');
            $year = (int)($request->input('year') ?? date('Y'));

            if ($employeeId <= 0) {
                $user = Session::get('user');
                $employeeId = (int)($user['employee_id'] ?? 101);
            }

            $balances = $this->service->getEmployeeQuotaBalances($employeeId, $year);
            return Response::json(['status' => 'success', 'data' => $balances]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /leave/requests
     * Create leave request with covering colleague
     */
    public function store(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();
            $user = Session::get('user');
            $userId = (int)($user['id'] ?? ($_SESSION['user_id'] ?? 1));

            $res = $this->service->createLeaveRequest($payload, $userId);
            return Response::json(['status' => 'success', 'data' => $res], 201);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /leave/requests/coverage-ack
     * Colleague acknowledges or declines covering shift
     */
    public function coverageAck(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)$request->input('id');
            $accepted = (bool)($request->input('accepted') ?? true);
            $notes = $request->input('notes');
            $user = Session::get('user');
            $userId = (int)($user['id'] ?? ($_SESSION['user_id'] ?? 1));

            $res = $this->service->acknowledgeCoverage($id, $accepted, $notes, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /leave/requests/approve
     * Supervisor approval
     */
    public function approve(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)$request->input('id');
            $user = Session::get('user');
            $userId = (int)($user['id'] ?? ($_SESSION['user_id'] ?? 1));

            $res = $this->service->approveLeaveRequest($id, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /leave/requests/reject
     * Supervisor rejection
     */
    public function reject(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)$request->input('id');
            $reason = trim($request->input('reason') ?? 'Department staffing minimum constraint.');
            $user = Session::get('user');
            $userId = (int)($user['id'] ?? ($_SESSION['user_id'] ?? 1));

            $res = $this->service->rejectLeaveRequest($id, $reason, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /leave/requests/cancel
     */
    public function cancel(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)$request->input('id');
            $user = Session::get('user');
            $userId = (int)($user['id'] ?? ($_SESSION['user_id'] ?? 1));

            $res = $this->service->cancelLeaveRequest($id, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * GET /leave/metadata
     */
    public function metadata(?Request $request = null): Response
    {
        try {
            $data = $this->service->getMetadata();
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
