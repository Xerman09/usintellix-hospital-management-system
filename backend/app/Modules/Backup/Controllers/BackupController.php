<?php

declare(strict_types=1);

namespace App\Modules\Backup\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Backup\Services\BackupService;
use Throwable;

class BackupController extends Controller
{
    private BackupService $backupService;

    public function __construct()
    {
        $this->backupService = new BackupService();
    }

    /**
     * Get contingency health stats and KPIs.
     */
    public function stats(): void
    {
        try {
            $stats = $this->backupService->stats();
            $this->success($stats, 'Backup and disaster recovery telemetry retrieved successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve backup statistics: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get latest backup details.
     */
    public function latest(): void
    {
        try {
            $latest = $this->backupService->getLatestBackup();
            $this->success($latest, 'Latest backup details retrieved successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve latest backup: ' . $e->getMessage(), 500);
        }
    }

    /**
     * List all database backup logs.
     */
    public function list(): void
    {
        try {
            $request = new Request();
            $filters = [
                'status' => $request->input('status'),
                'verification_status' => $request->input('verification_status'),
                'search' => $request->input('search'),
                'limit' => $request->input('limit') ? (int)$request->input('limit') : 50,
                'offset' => $request->input('offset') ? (int)$request->input('offset') : 0
            ];

            $backups = $this->backupService->listBackups($filters);
            $this->success($backups, 'Backup logs retrieved successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve backup logs: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Trigger creation of an on-demand encrypted backup.
     */
    public function create(): void
    {
        try {
            $request = new Request();
            $type = $request->input('type') ?: 'manual_on_demand';
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int)$user['id'] : null;

            $backup = $this->backupService->createBackup($type, $userId);
            $this->success($backup, 'Authenticated AES-256-GCM encrypted database backup created successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to create encrypted backup: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Verify cryptographic integrity and encryption status of a backup.
     */
    public function verify(): void
    {
        try {
            $request = new Request();
            $id = (int)$request->input('id');
            if (!$id) {
                $this->error('Backup ID is required for verification.', 422);
                return;
            }

            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int)$user['id'] : null;

            $verified = $this->backupService->verifyBackup($id, $userId);
            $this->success($verified, 'Cryptographic integrity and AES-256-GCM encryption verification passed.');
        } catch (Throwable $e) {
            $this->error('Verification failed: ' . $e->getMessage(), 400);
        }
    }

    /**
     * List disaster recovery drills.
     */
    public function drills(): void
    {
        try {
            $request = new Request();
            $filters = [
                'success' => $request->input('success'),
                'search' => $request->input('search'),
                'limit' => $request->input('limit') ? (int)$request->input('limit') : 50,
                'offset' => $request->input('offset') ? (int)$request->input('offset') : 0
            ];

            $drills = $this->backupService->listDrills($filters);
            $this->success($drills, 'Disaster recovery drills retrieved successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve disaster recovery drills: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Log a new disaster recovery restoration drill.
     */
    public function storeDrill(): void
    {
        try {
            $request = new Request();
            $data = $request->all();
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int)$user['id'] : 1;

            if (empty($data['restorer_name'])) {
                $this->error('Restorer name is required.', 422);
                return;
            }

            $drill = $this->backupService->logDrill($data, $userId);
            $this->success($drill, 'Disaster recovery restoration drill logged successfully per 45 CFR § 164.308(a)(7)(ii)(D).');
        } catch (Throwable $e) {
            $this->error('Failed to log disaster recovery drill: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Export database backup registry CSV.
     */
    public function exportBackups(): void
    {
        try {
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int)$user['id'] : null;
            $this->backupService->exportBackupsCsv($userId);
        } catch (Throwable $e) {
            $this->error('Failed to export backup registry: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Export disaster recovery drills log CSV.
     */
    public function exportDrills(): void
    {
        try {
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int)$user['id'] : null;
            $this->backupService->exportDrillsCsv($userId);
        } catch (Throwable $e) {
            $this->error('Failed to export disaster recovery drills: ' . $e->getMessage(), 500);
        }
    }
}
