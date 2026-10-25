<?php

namespace App\Modules\ArAging\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Modules\ArAging\Services\ArAgingService;
use Throwable;

class ArAgingController extends Controller
{
    private ArAgingService $service;

    public function __construct()
    {
        $this->service = new ArAgingService();
    }

    /**
     * GET /ar-aging/matrix
     * Executive cross-tabulated Aging Matrix (Payer Category vs Aging Buckets)
     */
    public function matrix(Request $request): Response
    {
        try {
            $result = $this->service->getAgingMatrix();
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /ar-aging/accounts
     * Filterable list of AR accounts with aging buckets and collection status
     */
    public function index(Request $request): Response
    {
        try {
            $filters = [
                'bucket' => $request->query('bucket'),
                'payer_category' => $request->query('payer_category'),
                'collection_status' => $request->query('collection_status'),
                'patient_id' => $request->query('patient_id'),
                'q' => $request->query('q'),
                'page' => $request->query('page', 1),
                'per_page' => $request->query('per_page', 15)
            ];

            $result = $this->service->listArAccounts($filters);
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /ar-aging/detail?id=...
     * Complete AR account detail with notes history
     */
    public function detail(Request $request): Response
    {
        try {
            $id = (int)$request->query('id', 0);
            if ($id <= 0) {
                return $this->error("Valid AR account ID is required.", 400);
            }

            $account = $this->service->getAccountDetail($id);
            if (!$account) {
                return $this->error("AR account #{$id} not found.", 404);
            }

            return $this->success($account);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /ar-aging/action
     * Log collection follow-up note or promise to pay
     */
    public function logAction(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $id = (int)($body['account_id'] ?? $body['id'] ?? 0);
            if ($id <= 0) {
                return $this->error("Account ID is required.", 400);
            }

            $user = $request->user();
            $userId = $user['id'] ?? null;
            $userName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
            if (empty(trim($userName))) {
                $userName = 'Collection Specialist';
            }

            $result = $this->service->logCollectionAction($id, $body, $userId, $userName);
            return $this->success($result, "Collection follow-up action logged successfully.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /ar-aging/status
     * Update collection status
     */
    public function updateStatus(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $id = (int)($body['account_id'] ?? $body['id'] ?? 0);
            $status = trim($body['collection_status'] ?? $body['status'] ?? '');
            $notes = !empty($body['notes']) ? trim($body['notes']) : null;

            if ($id <= 0 || empty($status)) {
                return $this->error("Account ID and new status are required.", 400);
            }

            $user = $request->user();
            $userId = $user['id'] ?? null;
            $userName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
            if (empty(trim($userName))) {
                $userName = 'Finance Supervisor';
            }

            $result = $this->service->updateStatus($id, $status, $notes, $userId, $userName);
            return $this->success($result, "AR collection status updated to '{$status}'.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /ar-aging/sync
     * Sync open inpatient folios into AR
     */
    public function sync(Request $request): Response
    {
        try {
            $synced = $this->service->syncFoliosIntoAr();
            return $this->success(['synced' => $synced], "Synchronized {$synced} folio(s) into AR Ledger.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /ar-aging/seed-demo
     * Seed realistic hospital AR portfolio
     */
    public function seedDemo(Request $request): Response
    {
        try {
            $result = $this->service->seedRealisticArDemonstration();
            return $this->success($result, "Realistic hospital AR portfolio seeded successfully.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }
}
