<?php
declare(strict_types=1);

namespace App\Modules\Dispensing\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Modules\Dispensing\Services\PrescriptionVerificationService;

/**
 * PrescriptionVerificationController
 *
 * Handles Pharmacist Clinical Verification Queue (`prescription_verifications`) endpoints:
 *   - GET  /dispensing/clinical-verifications?prescription_id=...
 *   - POST /dispensing/clinical-verifications/save
 */
final class PrescriptionVerificationController
{
    public function __construct(
        private readonly PrescriptionVerificationService $service = new PrescriptionVerificationService()
    ) {}

    /**
     * GET /dispensing/clinical-verifications
     */
    public function index(Request $request): void
    {
        try {
            $filters = [
                'prescription_id'     => $request->query('prescription_id'),
                'patient_id'          => $request->query('patient_id'),
                'verification_status' => $request->query('verification_status'),
            ];
            $data = $this->service->getVerifications($filters);
            Response::json([
                'success' => true,
                'data'    => $data,
            ]);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /dispensing/clinical-verifications/save
     */
    public function save(Request $request): void
    {
        try {
            $user = $request->attribute('auth_user', Session::get('user') ?: []);
            $userId = isset($user['id']) ? (int) $user['id'] : null;

            $record = $this->service->saveVerification($request->body(), $userId);
            Response::json([
                'success' => true,
                'message' => 'Pharmacist Clinical Verification saved (' . ($record['verification_status'] ?? 'Updated') . ').',
                'data'    => $record,
            ], 201);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
