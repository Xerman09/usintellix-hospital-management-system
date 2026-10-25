<?php

namespace App\Modules\Payroll\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Modules\Payroll\Services\SalaryStructureService;
use App\Modules\Payroll\Services\DoctorCommissionPullService;
use Throwable;

class SalaryStructureController extends Controller
{
    private SalaryStructureService $service;

    public function __construct()
    {
        $this->service = new SalaryStructureService();
    }

    /**
     * GET /payroll/salary-structures
     */
    public function index(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $filters = [
                'employee_id' => $request->input('employee_id'),
                'department_id' => $request->input('department_id'),
                'employment_type' => $request->input('employment_type'),
                'pay_frequency' => $request->input('pay_frequency'),
                'is_active' => $request->input('is_active'),
                'q' => $request->input('q')
            ];
            $page = max(1, (int)($request->input('page') ?? 1));
            $perPage = max(5, min(100, (int)($request->input('per_page') ?? 25)));

            $data = $this->service->listSalaryStructures($filters, $page, $perPage);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /payroll/salary-structures/detail
     */
    public function detail(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)$request->input('id');
            $empId = (int)$request->input('employee_id');

            if ($id > 0) {
                $data = $this->service->getSalaryStructure($id);
            } elseif ($empId > 0) {
                $data = $this->service->getEmployeeSalaryStructure($empId);
            } else {
                return Response::json(['status' => 'error', 'message' => 'Structure ID or Employee ID required.'], 400);
            }

            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /payroll/salary-structures
     */
    public function store(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();
            $user = Session::get('user');
            $userId = (int)($user['id'] ?? ($_SESSION['user_id'] ?? 1));

            $res = $this->service->saveSalaryStructure($payload, $userId);
            return Response::json(['status' => 'success', 'data' => $res], 201);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /payroll/salary-structures/update
     */
    public function update(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();
            $user = Session::get('user');
            $userId = (int)($user['id'] ?? ($_SESSION['user_id'] ?? 1));

            $res = $this->service->saveSalaryStructure($payload, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * DELETE /payroll/salary-structures
     */
    public function destroy(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)$request->input('id');
            $deleted = $this->service->deleteSalaryStructure($id);
            return Response::json(['status' => 'success', 'deleted' => $deleted, 'message' => 'Salary structure removed.']);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /payroll/simulate-gross
     * Compensation calculator simulator
     */
    public function simulateGross(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $empId = (int)$request->input('employee_id');
            $regHrs = (float)($request->input('regular_hours') ?? 80.0);
            $otHrs = (float)($request->input('overtime_hours') ?? 0.0);
            $ndHrs = (float)($request->input('night_diff_hours') ?? 0.0);
            $onCallShifts = (int)($request->input('on_call_shifts') ?? 0);
            $commissions = (float)($request->input('case_commissions') ?? 0.0);
            $pullFromBilling = (bool)($request->input('pull_from_billing') ?? false);
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');

            $result = $this->service->calculateGrossCompensationSimulation(
                $empId,
                $regHrs,
                $otHrs,
                $ndHrs,
                $onCallShifts,
                $commissions,
                $pullFromBilling,
                $startDate,
                $endDate
            );
            return Response::json(['status' => 'success', 'data' => $result]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * GET /payroll/doctor-commissions/pull
     * Pulls settled doctor shares from Billing (Subsystem 6) across consultations, ward rounds & surgery.
     */
    public function pullDoctorCommissions(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $doctorId = (int)($request->input('doctor_id') ?? 0);
            $startDate = $request->input('start_date');
            $endDate = $request->input('end_date');
            $statusFilter = $request->input('status');

            $pullSvc = new DoctorCommissionPullService();
            if ($doctorId > 0) {
                $data = $pullSvc->pullDoctorSettledShares($doctorId, $startDate, $endDate, $statusFilter);
            } else {
                $data = $pullSvc->pullAllPhysiciansCommissionSummary($startDate, $endDate, $statusFilter);
            }

            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /payroll/doctor-commissions/approve
     * Approves settled shares to be locked for payroll disbursement.
     */
    public function approveDoctorCommissions(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $doctorId = (int)$request->input('doctor_id');
            $vouchers = (array)($request->input('vouchers') ?? []);
            $cycleRef = (string)($request->input('payroll_reference') ?? 'PR-CYCLE-' . date('Ym'));
            $userId = Session::get('user_id');

            $pullSvc = new DoctorCommissionPullService();
            $result = $pullSvc->approveSharesForPayroll($doctorId, $vouchers, $cycleRef, $userId);

            return Response::json(['status' => 'success', 'data' => $result]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * GET /payroll/metadata
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
