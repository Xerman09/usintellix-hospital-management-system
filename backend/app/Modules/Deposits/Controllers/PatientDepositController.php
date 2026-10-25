<?php

namespace App\Modules\Deposits\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Deposits\Services\PatientDepositService;
use Throwable;

class PatientDepositController extends Controller
{
    private PatientDepositService $service;

    public function __construct()
    {
        $this->service = new PatientDepositService();
    }

    /**
     * GET /patient-deposits
     * List patient advance deposits
     */
    public function index(Request $request): Response
    {
        try {
            $filters = [
                'q' => $request->query('q'),
                'status' => $request->query('status'),
                'deposit_type' => $request->query('deposit_type'),
                'patient_id' => $request->query('patient_id'),
                'page' => $request->query('page', 1),
                'per_page' => $request->query('per_page', 15)
            ];

            $result = $this->service->listDeposits($filters);
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /patient-deposits/detail?id=...
     * Complete deposit record with drawdowns and refunds history
     */
    public function detail(Request $request): Response
    {
        try {
            $id = (int)$request->query('id', 0);
            if ($id <= 0) {
                return $this->error("Valid deposit ID is required.", 400);
            }

            $deposit = $this->service->getDepositDetail($id);
            if (!$deposit) {
                return $this->error("Patient deposit #{$id} not found.", 404);
            }

            return $this->success($deposit);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /patient-deposits
     * Record a new advance deposit
     */
    public function store(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $user = $request->user();
            $userId = $user['id'] ?? null;
            $cashierName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
            if (empty(trim($cashierName))) {
                $cashierName = $body['cashier_name'] ?? 'Main Cashier Desk';
            }

            $result = $this->service->recordAdvanceDeposit($body, $userId, $cashierName);
            return $this->success($result, "Advance deposit recorded and receipt generated.", 201);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /patient-deposits/drawdown
     * Apply drawdown deduction against an inpatient folio
     */
    public function drawdown(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $depositId = (int)($body['deposit_id'] ?? 0);
            if ($depositId <= 0) {
                return $this->error("Deposit ID is required for drawdown.", 400);
            }

            $userId = $request->user()['id'] ?? null;
            $result = $this->service->applyDrawdown($depositId, $body, $userId);
            return $this->success($result, "Drawdown deduction applied to master folio.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /patient-deposits/refund
     * Disburse unused deposit refund voucher
     */
    public function refund(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $depositId = (int)($body['deposit_id'] ?? 0);
            if ($depositId <= 0) {
                return $this->error("Deposit ID is required for refund.", 400);
            }

            $user = $request->user();
            $userId = $user['id'] ?? null;
            $disbursedByName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
            if (empty(trim($disbursedByName))) {
                $disbursedByName = 'Discharge Billing Officer';
            }

            $result = $this->service->disburseRefund($depositId, $body, $userId, $disbursedByName);
            return $this->success($result, "Refund voucher disbursed successfully.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * GET /patient-deposits/metrics
     * Executive totals for advance deposits
     */
    public function metrics(Request $request): Response
    {
        try {
            $result = $this->service->getDepositSummaryMetrics();
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /patient-deposits/admissions
     * Admitted patients list for deposit collection / drawdown
     */
    public function admissions(Request $request): Response
    {
        try {
            $result = $this->service->getAdmissionsForDeposit();
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }
}
