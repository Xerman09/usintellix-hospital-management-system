<?php

declare(strict_types=1);

namespace App\Modules\Lab\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Lab\Services\LisResultVerificationService;

class LisResultVerificationController extends Controller
{
    private LisResultVerificationService $service;

    public function __construct()
    {
        $this->service = new LisResultVerificationService();
    }

    /**
     * List verifications queue.
     * GET /lab/verifications
     */
    public function index(): void
    {
        $request = new Request();
        $filters = [
            'verification_status' => $request->input('verification_status'),
            'is_critical' => $request->input('is_critical'),
            'patient_id' => $request->input('patient_id'),
            'search' => $request->input('search'),
            'limit' => $request->input('limit')
        ];

        $records = $this->service->listVerifications($filters);
        $this->success($records, 'Result verifications retrieved successfully.');
    }

    /**
     * Get verification detail including amendment logs.
     * GET /lab/verifications/detail?id={id}
     */
    public function detail(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Valid verification ID is required.', 422);
            return;
        }

        $record = $this->service->getVerificationDetail($id);
        if (!$record) {
            $this->error('Verification record not found.', 404);
            return;
        }

        $this->success($record, 'Verification details retrieved.');
    }

    /**
     * MedTech preliminary analytical verification.
     * POST /lab/verifications/preliminary
     */
    public function preliminary(): void
    {
        $request = new Request();
        $actor = Session::get('user') ?? ['id' => Session::get('user_id') ?? 1, 'role' => 'admin'];
        $orderId = (int) $request->input('order_id');

        if ($orderId <= 0) {
            $this->error('Order ID is required.', 422);
            return;
        }

        $result = $this->service->preliminaryVerify($orderId, $request->all(), $actor);
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Pathologist clinical sign-off.
     * POST /lab/verifications/pathologist-signoff
     */
    public function pathologistSignOff(): void
    {
        $request = new Request();
        $actor = Session::get('user') ?? ['id' => Session::get('user_id') ?? 1, 'role' => 'doctor'];
        $verificationId = (int) $request->input('verification_id');

        if ($verificationId <= 0) {
            $this->error('Verification ID is required.', 422);
            return;
        }

        $result = $this->service->pathologistSignOff($verificationId, $request->all(), $actor);
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Pathologist returns preliminary results back to the bench.
     * POST /lab/verifications/pathologist-return
     */
    public function pathologistReturn(): void
    {
        $request = new Request();
        $actor = Session::get('user') ?? ['id' => Session::get('user_id') ?? 1, 'role' => 'doctor'];
        $verificationId = (int) $request->input('verification_id');
        $reason = (string) ($request->input('return_reason') ?? $request->input('reason') ?? '');

        if ($verificationId <= 0) {
            $this->error('Verification ID is required.', 422);
            return;
        }

        $result = $this->service->pathologistReturn($verificationId, $reason, $actor);
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Submit an amended lab result with immutable audit log.
     * POST /lab/verifications/amend
     */
    public function amend(): void
    {
        $request = new Request();
        $actor = Session::get('user') ?? ['id' => Session::get('user_id') ?? 1, 'role' => 'doctor'];
        $verificationId = (int) $request->input('verification_id');

        if ($verificationId <= 0) {
            $this->error('Verification ID is required.', 422);
            return;
        }

        $result = $this->service->amendResults($verificationId, $request->all(), $actor);
        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Get KPI stats for pathologist verification queue.
     * GET /lab/verifications/stats
     */
    public function stats(): void
    {
        $stats = $this->service->getStats();
        $this->success($stats, 'Verification queue statistics retrieved.');
    }
}
