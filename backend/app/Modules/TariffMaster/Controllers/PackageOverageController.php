<?php

namespace App\Modules\TariffMaster\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Modules\TariffMaster\Services\PackageOverageService;
use Throwable;

class PackageOverageController extends Controller
{
    private PackageOverageService $service;

    public function __construct()
    {
        $this->service = new PackageOverageService();
    }

    /**
     * GET /package-enrollments
     * List patient package enrollments with status & search
     */
    public function index(Request $request): Response
    {
        try {
            $filters = [
                'status' => $request->query('status'),
                'package_id' => $request->query('package_id'),
                'patient_id' => $request->query('patient_id'),
                'q' => $request->query('q'),
                'page' => $request->query('page', 1),
                'per_page' => $request->query('per_page', 15)
            ];

            $result = $this->service->listEnrollments($filters);
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /package-enrollments/summary
     * Executive totals & overage incident rate
     */
    public function summary(Request $request): Response
    {
        try {
            $result = $this->service->getEnrollmentSummaryMetrics();
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /package-enrollments/detail?id=...
     * Complete enrollment with itemized overage charges
     */
    public function detail(Request $request): Response
    {
        try {
            $id = (int)$request->query('id', 0);
            if ($id <= 0) {
                return $this->error("Valid enrollment ID is required.", 400);
            }

            $enr = $this->service->getEnrollmentDetail($id);
            if (!$enr) {
                return $this->error("Package enrollment #{$id} not found.", 404);
            }

            return $this->success($enr);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /package-enrollments
     * Enroll patient in a bundled package
     */
    public function enroll(Request $request): Response
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
                $userName = 'Admissions Officer';
            }

            $result = $this->service->enrollPatient($body, $userId, $userName);
            return $this->success($result, "Patient enrolled in bundled package successfully.", 201);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /package-enrollments/calculate-overages
     * Automated overage calculation engine
     */
    public function calculate(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $id = (int)($body['enrollment_id'] ?? $body['id'] ?? 0);
            if ($id <= 0) {
                return $this->error("Enrollment ID is required for overage calculation.", 400);
            }

            $result = $this->service->calculateOverages($id, $body);
            return $this->success($result, "Package overage charges recalculated successfully.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /package-enrollments/sync
     * Auto-sync actual stay & charges from admission/folio
     */
    public function sync(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $id = (int)($body['enrollment_id'] ?? $body['id'] ?? 0);
            if ($id <= 0) {
                return $this->error("Enrollment ID is required.", 400);
            }

            $result = $this->service->syncEnrollmentFromAdmission($id);
            return $this->success($result, "Synced actual hospital consumption and recalculated overages.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /package-enrollments/post-to-folio
     * Reconcile & post package fee + overages to Master Folio
     */
    public function postToFolio(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $id = (int)($body['enrollment_id'] ?? $body['id'] ?? 0);
            $folioId = !empty($body['folio_id']) ? (int)$body['folio_id'] : null;

            if ($id <= 0) {
                return $this->error("Enrollment ID is required.", 400);
            }

            $user = $request->user();
            $userId = $user['id'] ?? null;

            $result = $this->service->postToFolio($id, $folioId, $userId);
            return $this->success($result, "Package base price and overage charges posted to Master Folio.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /package-enrollments/seed-demo
     * Seed realistic patient package enrollments with calculated overages
     */
    public function seedDemo(Request $request): Response
    {
        try {
            $result = $this->service->seedRealisticEnrollmentDemo();
            return $this->success($result, "Realistic patient package enrollments seeded successfully.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }
}
