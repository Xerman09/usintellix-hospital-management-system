<?php

namespace App\Modules\ClaimDenials\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Modules\ClaimDenials\Services\ClaimDenialService;
use Throwable;

class ClaimDenialController extends Controller
{
    private ClaimDenialService $service;

    public function __construct()
    {
        $this->service = new ClaimDenialService();
    }

    /**
     * GET /claim-denials
     * List denials with filters & search
     */
    public function index(Request $request): Response
    {
        try {
            $filters = [
                'q' => $request->query('q'),
                'status' => $request->query('status'),
                'denial_category' => $request->query('denial_category'),
                'priority' => $request->query('priority'),
                'carc_code' => $request->query('carc_code'),
                'payer_name' => $request->query('payer_name'),
                'page' => $request->query('page', 1),
                'per_page' => $request->query('per_page', 15)
            ];

            $result = $this->service->listDenials($filters);
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /claim-denials/detail?id=...
     * Complete denial detail with appeals history
     */
    public function detail(Request $request): Response
    {
        try {
            $id = (int)$request->query('id', 0);
            if ($id <= 0) {
                return $this->error("Valid denial ID is required.", 400);
            }

            $denial = $this->service->getDenialDetail($id);
            if (!$denial) {
                return $this->error("Claim denial #{$id} not found.", 404);
            }

            return $this->success($denial);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /claim-denials
     * Record a new claim denial
     */
    public function store(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $userId = $request->user()['id'] ?? null;
            $result = $this->service->recordClaimDenial($body, $userId);
            return $this->success($result, "Claim denial recorded successfully.", 201);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /claim-denials/generate-appeal-letter
     * Generate structured formal appeal letter with clinical argument
     */
    public function generateLetter(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $denialId = (int)($body['denial_id'] ?? 0);
            if ($denialId <= 0) {
                return $this->error("Denial ID is required.", 400);
            }

            $result = $this->service->generateAppealLetterTemplate($denialId, $body);
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /claim-denials/appeals
     * Submit formal appeal package
     */
    public function submitAppeal(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $denialId = (int)($body['denial_id'] ?? 0);
            if ($denialId <= 0) {
                return $this->error("Denial ID is required.", 400);
            }

            $userId = $request->user()['id'] ?? null;
            $result = $this->service->submitAppeal($denialId, $body, $userId);
            return $this->success($result, "Formal appeal package successfully submitted.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /claim-denials/appeals/outcome
     * Record outcome of appeal (Overturned/Won, Upheld/Lost, Written Off)
     */
    public function recordOutcome(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $appealId = (int)($body['appeal_id'] ?? 0);
            if ($appealId <= 0) {
                return $this->error("Appeal ID is required.", 400);
            }

            $userId = $request->user()['id'] ?? null;
            $result = $this->service->recordAppealOutcome($appealId, $body, $userId);
            return $this->success($result, "Appeal outcome recorded and parent denial updated.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * GET /claim-denials/metrics
     * Executive analytics on denied amounts and overturn rate
     */
    public function metrics(Request $request): Response
    {
        try {
            $result = $this->service->getDenialMetrics();
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /claim-denials/carc-dictionary
     * CARC / RARC standard code guide
     */
    public function dictionary(Request $request): Response
    {
        try {
            $result = $this->service->getCarcDictionary();
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /claim-denials/seed-samples
     * Populate sample denials
     */
    public function seed(Request $request): Response
    {
        try {
            $userId = $request->user()['id'] ?? null;
            $result = $this->service->seedSampleDenials($userId);
            return $this->success($result, "Sample claim denials populated.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }
}
