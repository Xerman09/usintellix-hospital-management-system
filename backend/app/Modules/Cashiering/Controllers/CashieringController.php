<?php

namespace App\Modules\Cashiering\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Cashiering\Services\CashieringService;
use Throwable;

class CashieringController extends Controller
{
    private CashieringService $service;

    public function __construct()
    {
        $this->service = new CashieringService();
    }

    /**
     * GET /cashier/transactions
     * List cashier transactions with search & filters
     */
    public function index(Request $request): Response
    {
        try {
            $filters = [
                'q' => $request->query('q'),
                'status' => $request->query('status'),
                'payment_method' => $request->query('payment_method'),
                'date_from' => $request->query('date_from'),
                'date_to' => $request->query('date_to'),
                'terminal_id' => $request->query('terminal_id'),
                'page' => $request->query('page', 1),
                'per_page' => $request->query('per_page', 15)
            ];

            $result = $this->service->listTransactions($filters);
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /cashier/transactions/detail?id=...
     * Complete transaction receipt breakdown
     */
    public function detail(Request $request): Response
    {
        try {
            $id = (int)$request->query('id', 0);
            if ($id <= 0) {
                return $this->error("Valid transaction ID is required.", 400);
            }

            $txn = $this->service->getTransactionDetail($id);
            if (!$txn) {
                return $this->error("Transaction #{$id} not found.", 404);
            }

            return $this->success($txn);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /cashier/transactions/checkout
     * Process a split-tender payment
     */
    public function checkout(Request $request): Response
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

            $result = $this->service->processSplitTenderTransaction($body, $userId, $cashierName);
            return $this->success($result, "Split-tender transaction successfully processed.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /cashier/transactions/void
     * Void a transaction
     */
    public function void(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $id = (int)($body['id'] ?? $body['transaction_id'] ?? 0);
            $reason = trim($body['reason'] ?? '');

            if ($id <= 0) {
                return $this->error("Transaction ID is required.", 400);
            }
            if (empty($reason)) {
                return $this->error("Reason for voiding transaction is required.", 422);
            }

            $user = $request->user();
            $userId = $user['id'] ?? null;

            $result = $this->service->voidTransaction($id, $reason, $userId);
            return $this->success($result, "Transaction successfully voided.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * GET /cashier/shift-summary
     * End-of-day shift balancing and tender summary
     */
    public function shiftSummary(Request $request): Response
    {
        try {
            $date = $request->query('date');
            $terminal = $request->query('terminal_id');
            $result = $this->service->getShiftSummary($date, $terminal);
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /cashier/billable-entities
     * Find open folios / admissions with balances
     */
    public function billableEntities(Request $request): Response
    {
        try {
            $patientId = $request->query('patient_id') ? (int)$request->query('patient_id') : null;
            $result = $this->service->getBillableEntities($patientId);
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }
}
