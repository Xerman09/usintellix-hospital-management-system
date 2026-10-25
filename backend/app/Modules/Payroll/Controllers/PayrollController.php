<?php

namespace App\Modules\Payroll\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Modules\Payroll\Services\PayrollService;
use Throwable;

class PayrollController extends Controller
{
    private PayrollService $service;

    public function __construct()
    {
        $this->service = new PayrollService();
    }

    /**
     * GET /payroll/runs
     */
    public function index(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $filters = [
                'status' => $request->input('status'),
                'pay_frequency' => $request->input('pay_frequency'),
                'q' => $request->input('q')
            ];
            $page = max(1, (int)($request->input('page') ?? 1));
            $perPage = max(5, min(100, (int)($request->input('per_page') ?? 20)));

            $data = $this->service->listPayrollRuns($filters, $page, $perPage);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /payroll/runs/detail
     */
    public function detail(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)$request->input('id');

            if ($id <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Payroll Run ID is required.'], 400);
            }

            $run = $this->service->getPayrollRunDetail($id);
            if (!$run) {
                return Response::json(['status' => 'error', 'message' => 'Payroll Run not found.'], 404);
            }

            return Response::json(['status' => 'success', 'data' => $run]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /payroll/runs/calculate
     * Automates payroll run generation & payslip computation
     */
    public function calculateRun(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $userId = Session::get('user_id');

            $data = [
                'title' => $request->input('title'),
                'pay_frequency' => $request->input('pay_frequency') ?? 'semi_monthly',
                'period_start' => $request->input('period_start'),
                'period_end' => $request->input('period_end'),
                'payout_date' => $request->input('payout_date'),
                'department_id' => $request->input('department_id'),
                'notes' => $request->input('notes')
            ];

            if (empty($data['period_start']) || empty($data['period_end'])) {
                return Response::json(['status' => 'error', 'message' => 'Period start and end dates are required.'], 400);
            }

            $result = $this->service->calculatePayrollRun($data, $userId);
            return Response::json(['status' => 'success', 'data' => $result]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /payroll/runs/approve
     */
    public function approveRun(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)$request->input('id');
            $userId = Session::get('user_id');

            if ($id <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Payroll Run ID is required.'], 400);
            }

            $result = $this->service->approvePayrollRun($id, $userId);
            return Response::json($result);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /payroll/runs/disburse
     */
    public function disburseRun(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)$request->input('id');
            $userId = Session::get('user_id');

            if ($id <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Payroll Run ID is required.'], 400);
            }

            $result = $this->service->disbursePayrollRun($id, $userId);
            return Response::json($result);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * GET /payroll/payslips/detail
     */
    public function payslipDetail(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)$request->input('id');

            if ($id <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Payslip ID is required.'], 400);
            }

            $payslip = $this->service->getPayslipDetail($id);
            if (!$payslip) {
                return Response::json(['status' => 'error', 'message' => 'Payslip not found.'], 404);
            }

            return Response::json(['status' => 'success', 'data' => $payslip]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /payroll/payslips/my-history
     */
    public function myPayslips(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $empId = (int)($request->input('employee_id') ?? Session::get('employee_id'));

            if ($empId <= 0) {
                $empId = 101; // Default fallback to first active physician / employee
            }

            $history = $this->service->getEmployeePayslips($empId);
            return Response::json(['status' => 'success', 'data' => $history]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
