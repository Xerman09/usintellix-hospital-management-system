<?php
declare(strict_types=1);

namespace App\Modules\OrManagement\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Modules\OrManagement\Services\SpongeNeedleCountService;

/**
 * SpongeNeedleCountController
 *
 * Handles Surgical Sponge, Sharps, Needle & Instrument Count Reconciliation
 * (`or_sponge_needle_counts`) endpoints:
 *   - GET  /or-management/sponge-counts?surgical_case_id=...
 *   - POST /or-management/sponge-counts/save
 */
final class SpongeNeedleCountController
{
    public function __construct(
        private readonly SpongeNeedleCountService $service = new SpongeNeedleCountService()
    ) {}

    /**
     * GET /or-management/sponge-counts
     */
    public function index(Request $request): void
    {
        try {
            $filters = [
                'surgical_case_id' => $request->query('surgical_case_id'),
                'patient_id'       => $request->query('patient_id'),
                'has_discrepancy'  => $request->query('has_discrepancy'),
            ];
            $data = $this->service->getRecords($filters);
            Response::json(['data' => $data]);
        } catch (\Throwable $e) {
            Response::json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /or-management/sponge-counts/save
     */
    public function save(Request $request): void
    {
        try {
            $user = $request->attribute('auth_user', []);
            $userId = isset($user['id']) ? (int) $user['id'] : null;

            $record = $this->service->saveRecord($request->body(), $userId);
            Response::json([
                'message' => 'Surgical Sponge, Sharps & Needle Count Reconciliation saved.',
                'data'    => $record,
            ], 201);
        } catch (\InvalidArgumentException $e) {
            Response::json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['message' => $e->getMessage()], 500);
        }
    }
}
