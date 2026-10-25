<?php

namespace App\Modules\DoctorCommissions\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Modules\DoctorCommissions\Services\DoctorCommissionService;
use Throwable;

class DoctorCommissionController extends Controller
{
    private DoctorCommissionService $service;

    public function __construct()
    {
        $this->service = new DoctorCommissionService();
    }

    /**
     * GET /doctor-commissions/metrics
     */
    public function metrics(Request $request): Response
    {
        try {
            $data = $this->service->getCommissionMetrics();
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /doctor-commissions/ledger
     */
    public function index(Request $request): Response
    {
        try {
            $filters = [
                'doctor_id' => $request->query('doctor_id'),
                'status' => $request->query('status'),
                'category' => $request->query('category'),
                'start_date' => $request->query('start_date'),
                'end_date' => $request->query('end_date'),
                'q' => $request->query('q')
            ];
            $page = max(1, (int)($request->query('page') ?? 1));
            $perPage = max(5, min(100, (int)($request->query('per_page') ?? 25)));

            $data = $this->service->listLedgerEntries($filters, $page, $perPage);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /doctor-commissions/statements
     */
    public function statements(Request $request): Response
    {
        try {
            $filters = [
                'start_date' => $request->query('start_date'),
                'end_date' => $request->query('end_date')
            ];
            $data = $this->service->getDoctorStatements($filters);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /doctor-commissions/schedules
     */
    public function schedules(Request $request): Response
    {
        try {
            $data = $this->service->listFeeSchedules();
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /doctor-commissions/schedules
     */
    public function saveSchedule(Request $request): Response
    {
        try {
            $payload = $request->body();
            $userId = (int)($request->user()['id'] ?? 1);
            $res = $this->service->saveFeeSchedule($payload, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /doctor-commissions/disburse
     */
    public function disburse(Request $request): Response
    {
        try {
            $payload = $request->body();
            $doctorId = (int)($payload['doctor_id'] ?? 0);
            $entryIds = $payload['entry_ids'] ?? [];
            $payoutData = $payload['payout_data'] ?? [];
            $userName = $request->user()['name'] ?? ($request->user()['username'] ?? 'Finance Officer');

            $res = $this->service->disbursePayout($doctorId, $entryIds, $payoutData, $userName);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /doctor-commissions/manual-record
     */
    public function manualRecord(Request $request): Response
    {
        try {
            $payload = $request->body();
            $userId = (int)($request->user()['id'] ?? 1);
            $res = $this->service->recordManualCommission($payload, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /doctor-commissions/calculate-simulation
     */
    public function calculateSimulation(Request $request): Response
    {
        try {
            $payload = $request->body();
            $gross = (float)($payload['gross_pf'] ?? 0.0);
            $doctorId = !empty($payload['doctor_id']) ? (int)$payload['doctor_id'] : null;
            $category = $payload['service_category'] ?? 'consultation';
            $itemCode = $payload['item_code'] ?? null;

            $schedule = $this->service->findMatchingSchedule($doctorId, $category, $itemCode);
            $split = $this->service->computeCommissionShares($gross, $schedule);

            return Response::json([
                'status' => 'success',
                'data' => [
                    'schedule' => $schedule,
                    'split' => $split
                ]
            ]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /doctor-commissions/seed-demo
     */
    public function seedDemo(Request $request): Response
    {
        try {
            $res = $this->service->seedDemoCommissions();
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
