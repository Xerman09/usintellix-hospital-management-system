<?php

namespace App\Modules\TariffMaster\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Modules\TariffMaster\Services\TariffMasterService;
use Throwable;

class TariffMasterController extends Controller
{
    private TariffMasterService $service;

    public function __construct()
    {
        $this->service = new TariffMasterService();
    }

    /**
     * GET /tariffs
     * List tariff entries with search and filters
     */
    public function index(Request $request): Response
    {
        try {
            $filters = [
                'category' => $request->query('category'),
                'department_id' => $request->query('department_id'),
                'is_active' => $request->query('is_active'),
                'q' => $request->query('q'),
                'page' => $request->query('page', 1),
                'per_page' => $request->query('per_page', 20)
            ];

            $result = $this->service->listTariffs($filters);
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /tariffs/summary
     * Tariff Book statistics and category breakdown
     */
    public function summary(Request $request): Response
    {
        try {
            $result = $this->service->getTariffSummaryMetrics();
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /tariffs/detail?id=...
     * Single tariff entry detail
     */
    public function detail(Request $request): Response
    {
        try {
            $id = (int)$request->query('id', 0);
            if ($id <= 0) {
                return $this->error("Valid tariff ID is required.", 400);
            }

            $tariff = $this->service->getTariffDetail($id);
            if (!$tariff) {
                return $this->error("Tariff item #{$id} not found.", 404);
            }

            return $this->success($tariff);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /tariffs
     * Create a new tariff entry
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

            $result = $this->service->createTariff($body, $userId);
            return $this->success($result, "Hospital master tariff item created successfully.", 201);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /tariffs/update
     * Update an existing tariff entry
     */
    public function update(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $id = (int)($body['id'] ?? 0);
            if ($id <= 0) {
                return $this->error("Tariff ID is required for update.", 400);
            }

            $user = $request->user();
            $userId = $user['id'] ?? null;

            $result = $this->service->updateTariff($id, $body, $userId);
            return $this->success($result, "Hospital master tariff item updated successfully.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /tariffs/calculate
     * Dynamic Surcharge & Tax Calculation Engine
     */
    public function calculate(Request $request): Response
    {
        try {
            $body = $request->body();
            if (!is_array($body)) {
                $body = json_decode(file_get_contents('php://input'), true) ?? [];
            }

            $id = (int)($body['tariff_id'] ?? $body['id'] ?? 0);
            $isEmergency = !empty($body['is_emergency']);
            $isNight = !empty($body['is_night']);
            $isHoliday = !empty($body['is_holiday']);
            $quantity = max(1, (int)($body['quantity'] ?? 1));

            if ($id <= 0) {
                return $this->error("Tariff ID is required for surcharge calculation.", 400);
            }

            $result = $this->service->calculatePriceWithSurcharges(
                $id,
                $isEmergency,
                $isNight,
                $isHoliday,
                $quantity
            );

            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 422);
        }
    }

    /**
     * GET /tariffs/packages
     * List bundled service packages
     */
    public function packages(Request $request): Response
    {
        try {
            $result = $this->service->listServicePackages();
            return $this->success($result);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /tariffs/packages/detail?id=...
     * Single package detail with item inclusions
     */
    public function packageDetail(Request $request): Response
    {
        try {
            $id = (int)$request->query('id', 0);
            if ($id <= 0) {
                return $this->error("Valid package ID is required.", 400);
            }

            $pkg = $this->service->getPackageDetail($id);
            if (!$pkg) {
                return $this->error("Service package #{$id} not found.", 404);
            }

            return $this->success($pkg);
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /tariffs/seed-demo
     * Pre-populate Hospital Master Tariff Book & Service Packages
     */
    public function seedDemo(Request $request): Response
    {
        try {
            $result = $this->service->seedHospitalMasterCatalog();
            return $this->success($result, "Hospital Master Tariff Book seeded successfully.");
        } catch (Throwable $e) {
            return $this->error($e->getMessage(), 500);
        }
    }
}
