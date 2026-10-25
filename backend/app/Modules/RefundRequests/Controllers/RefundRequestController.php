<?php

namespace App\Modules\RefundRequests\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Modules\RefundRequests\Services\RefundRequestService;
use Throwable;

class RefundRequestController extends Controller
{
    private RefundRequestService $service;

    public function __construct()
    {
        $this->service = new RefundRequestService();
    }

    /**
     * GET /refund-requests
     * List refund requests with filter/search
     */
    public function index(Request $request): Response
    {
        try {
            $filters = [
                'q' => $request->query('q'),
                'status' => $request->query('status'),
                'category' => $request->query('category'),
                'patient_id' => $request->query('patient_id'),
                'page' => $request->query('page', 1),
                'per_page' => $request->query('per_page', 15)
            ];

            $result = $this->service->listRefundRequests($filters);
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /refund-requests/summary
     * Stage KPI metrics
     */
    public function summary(Request $request): Response
    {
        try {
            $result = $this->service->getRefundSummaryMetrics();
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /refund-requests/candidates
     * Patients / deposits with positive credit balances for refund initiation
     */
    public function candidates(Request $request): Response
    {
        try {
            $result = $this->service->getCreditBalanceCandidates();
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /refund-requests/detail?id=...
     * Complete record with audit trail
     */
    public function detail(Request $request): Response
    {
        try {
            $id = (int)$request->query('id', 0);
            if ($id <= 0) {
                return $this->error("Valid refund request ID is required.", 400);
            }

            $record = $this->service->getRefundRequestDetail($id);
            if (!$record) {
                return $this->error("Refund request #{$id} not found.", 404);
            }

            return $this->success($record);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /refund-requests
     * Stage 1: Biller / Cashier submits refund request
     */
    public function create(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $user = $request->user();
            $userId = $user['id'] ?? null;
            $userName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
            if (empty(trim($userName))) {
                $userName = 'Billing Staff';
            }

            $result = $this->service->createRefundRequest($body, $userId, $userName);
            return $this->success($result, "Refund authorization request submitted successfully.", 201);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /refund-requests/review
     * Stage 2: Finance Manager Review & Approval / Rejection
     */
    public function review(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $id = (int)($body['id'] ?? $body['refund_request_id'] ?? 0);
            $decision = strtolower(trim($body['decision'] ?? ''));
            $approvedAmount = isset($body['approved_amount']) && $body['approved_amount'] !== ''
                ? (float)$body['approved_amount']
                : null;
            $notes = !empty($body['notes']) ? trim($body['notes']) : null;
            $rejectionReason = !empty($body['rejection_reason']) ? trim($body['rejection_reason']) : null;

            if ($id <= 0) {
                return $this->error("Refund request ID is required.", 400);
            }

            $user = $request->user();
            $userId = $user['id'] ?? null;
            $userName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
            if (empty(trim($userName))) {
                $userName = 'Finance Manager';
            }

            $result = $this->service->reviewRefundRequest(
                $id,
                $decision,
                $approvedAmount,
                $notes,
                $rejectionReason,
                $userId,
                $userName
            );

            $msg = $decision === 'approve'
                ? "Refund request approved by Finance."
                : "Refund request rejected.";

            return $this->success($result, $msg);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /refund-requests/voucher
     * Stage 3: Accounting issues Payment Voucher
     */
    public function voucher(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $id = (int)($body['id'] ?? $body['refund_request_id'] ?? 0);
            if ($id <= 0) {
                return $this->error("Refund request ID is required.", 400);
            }

            $user = $request->user();
            $userId = $user['id'] ?? null;
            $userName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
            if (empty(trim($userName))) {
                $userName = 'Finance / Accounting';
            }

            $result = $this->service->issuePaymentVoucher($id, $body, $userId, $userName);
            return $this->success($result, "Payment voucher generated successfully.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /refund-requests/disburse
     * Stage 4: Treasury / Cashier releases funds & collects payee signature
     */
    public function disburse(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $id = (int)($body['id'] ?? $body['refund_request_id'] ?? 0);
            if ($id <= 0) {
                return $this->error("Refund request ID is required.", 400);
            }

            $user = $request->user();
            $userId = $user['id'] ?? null;
            $userName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
            if (empty(trim($userName))) {
                $userName = 'Treasury / Cashier';
            }

            $result = $this->service->disburseRefund($id, $body, $userId, $userName);
            return $this->success($result, "Refund disbursement released successfully.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /refund-requests/void
     * Void a refund request
     */
    public function void(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $id = (int)($body['id'] ?? $body['refund_request_id'] ?? 0);
            $reason = trim($body['reason'] ?? 'Request cancelled');

            if ($id <= 0) {
                return $this->error("Refund request ID is required.", 400);
            }

            $user = $request->user();
            $userId = $user['id'] ?? null;
            $userName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
            if (empty(trim($userName))) {
                $userName = 'Finance Supervisor';
            }

            $result = $this->service->voidRefundRequest($id, $reason, $userId, $userName);
            return $this->success($result, "Refund request voided successfully.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }
}
