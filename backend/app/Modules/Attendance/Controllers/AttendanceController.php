<?php

namespace App\Modules\Attendance\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Modules\Attendance\Services\AttendanceService;
use Throwable;

class AttendanceController extends Controller
{
    private AttendanceService $service;

    public function __construct()
    {
        $this->service = new AttendanceService();
    }

    /**
     * GET /attendance/logs
     * List attendance logs, calculate regular vs overtime, tardiness, and night diff
     */
    public function index(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $filters = [
                'start_date' => $request->input('start_date'),
                'end_date' => $request->input('end_date'),
                'employee_id' => $request->input('employee_id'),
                'department_id' => $request->input('department_id'),
                'status' => $request->input('status'),
                'overtime_only' => $request->input('overtime_only'),
                'q' => $request->input('q')
            ];
            $page = max(1, (int)($request->input('page') ?? 1));
            $perPage = max(5, min(100, (int)($request->input('per_page') ?? 25)));

            $data = $this->service->listAttendanceLogs($filters, $page, $perPage);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /attendance/status
     * Get active clock status for specific employee
     */
    public function status(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $employeeId = (int)$request->input('employee_id');
            if ($employeeId <= 0) {
                // If not provided, inspect logged in session employee or default
                $user = Session::get('user');
                $employeeId = (int)($user['employee_id'] ?? 101);
            }

            $data = $this->service->getActiveClockStatus($employeeId);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /attendance/clock-in
     * Record web time-clock punch IN
     */
    public function clockIn(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $employeeId = (int)$request->input('employee_id');
            $method = $request->input('punch_method') ?? 'web_console';
            $remarks = $request->input('remarks');
            $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

            if ($employeeId <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Employee ID is required for time-clock punch.'], 400);
            }

            $res = $this->service->clockIn($employeeId, $method, $ip, $remarks);
            return Response::json(['status' => 'success', 'data' => $res], 201);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /attendance/clock-out
     * Record web time-clock punch OUT and auto-calculate hours
     */
    public function clockOut(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $employeeId = (int)$request->input('employee_id');
            $logId = $request->input('log_id') ? (int)$request->input('log_id') : null;
            $breakMinutes = $request->input('break_minutes') !== null ? (int)$request->input('break_minutes') : 60;
            $remarks = $request->input('remarks');

            if ($employeeId <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Employee ID is required.'], 400);
            }

            $res = $this->service->clockOut($employeeId, $logId, $breakMinutes, $remarks);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /attendance/overtime/approve
     */
    public function approveOt(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)$request->input('id');
            $user = Session::get('user');
            $userId = (int)($user['id'] ?? ($_SESSION['user_id'] ?? 1));

            $res = $this->service->approveOvertime($id, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /attendance/overtime/reject
     */
    public function rejectOt(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)$request->input('id');
            $reason = trim($request->input('reason') ?? 'Overtime not pre-authorized.');
            $user = Session::get('user');
            $userId = (int)($user['id'] ?? ($_SESSION['user_id'] ?? 1));

            $res = $this->service->rejectOvertime($id, $reason, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * GET /attendance/staff
     * List employees for time-clock punch console
     */
    public function staffList(?Request $request = null): Response
    {
        try {
            $list = $this->service->getStaffList();
            return Response::json(['status' => 'success', 'data' => $list]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
