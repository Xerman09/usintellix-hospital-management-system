<?php
declare(strict_types=1);

namespace App\Modules\OrManagement\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Modules\OrManagement\Services\AnesthesiaRecordService;

/**
 * AnesthesiaRecordController
 *
 * Handles Electronic Anesthesia Record (`or_anesthesia_records`) endpoints:
 *   - GET  /or-management/anesthesia-records?surgical_case_id=...
 *   - POST /or-management/anesthesia-records/save
 *   - POST /or-management/anesthesia-records/finalize
 */
final class AnesthesiaRecordController
{
    public function __construct(
        private readonly AnesthesiaRecordService $service = new AnesthesiaRecordService()
    ) {}

    /**
     * GET /or-management/anesthesia-records
     */
    public function index(Request $request): void
    {
        try {
            $filters = [
                'surgical_case_id' => $request->query('surgical_case_id'),
                'patient_id'       => $request->query('patient_id'),
                'record_status'    => $request->query('record_status'),
            ];
            $data = $this->service->getRecords($filters);
            Response::json(['data' => $data]);
        } catch (\Throwable $e) {
            Response::json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /or-management/anesthesia-records/save
     */
    public function save(Request $request): void
    {
        try {
            $user = $request->attribute('auth_user', []);
            $userId = isset($user['id']) ? (int) $user['id'] : null;

            $record = $this->service->saveRecord($request->body(), $userId);
            Response::json([
                'message' => 'Electronic Anesthesia Record saved and synchronized with OR Case & PACU Aldrete Score.',
                'data'    => $record,
            ], 201);
        } catch (\InvalidArgumentException $e) {
            Response::json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /or-management/anesthesia-records/finalize
     */
    public function finalize(Request $request): void
    {
        try {
            $body = $request->body();
            $recordId = (int) ($body['id'] ?? $body['record_id'] ?? 0);
            if ($recordId <= 0) {
                Response::json(['message' => 'Anesthesia Record ID is required to sign and finalize.'], 422);
                return;
            }

            $user = $request->attribute('auth_user', []);
            $userId = isset($user['id']) ? (int) $user['id'] : null;
            $signature = (string) ($body['anesthesiologist_signature'] ?? '');

            $record = $this->service->finalizeRecord($recordId, $signature, $userId);
            Response::json([
                'message' => 'Electronic Anesthesia Record digitally signed and finalized.',
                'data'    => $record,
            ]);
        } catch (\Throwable $e) {
            Response::json(['message' => $e->getMessage()], 500);
        }
    }
}
