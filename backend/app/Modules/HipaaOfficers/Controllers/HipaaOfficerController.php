<?php

declare(strict_types=1);

namespace App\Modules\HipaaOfficers\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\HipaaOfficers\Services\HipaaOfficerService;
use Throwable;

class HipaaOfficerController extends Controller
{
    private HipaaOfficerService $service;

    public function __construct()
    {
        $this->service = new HipaaOfficerService();
    }

    /**
     * Retrieve all HIPAA officer designations.
     */
    public function index(): void
    {
        try {
            $data = $this->service->getAll();
            $this->success($data, 'HIPAA officer designations retrieved successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve officer designations: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Retrieve a specific officer designation by type.
     */
    public function show(string $type): void
    {
        try {
            $data = $this->service->getByType($type);
            $this->success($data, 'Officer designation retrieved successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve officer designation: ' . $e->getMessage(), 400);
        }
    }

    /**
     * Public contact endpoint for Notice of Privacy Practices and Patient Portal.
     */
    public function public(): void
    {
        try {
            $data = $this->service->getPublicDesignations();
            $this->success($data, 'Official HIPAA officer contact details retrieved.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve public officer contacts: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update an officer designation.
     */
    public function update(string $type): void
    {
        try {
            $request = new Request();
            $body = $request->getBody();

            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int) $user['id'] : 1;
            $userRole = !empty($user['role']) ? (string) $user['role'] : 'admin';

            $result = $this->service->updateDesignation($type, $body, $userId, $userRole);
            $this->success($result['data'], $result['message']);
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 400);
        }
    }

    /**
     * Get real-time governance telemetry stats.
     */
    public function stats(): void
    {
        try {
            $stats = $this->service->getStats();
            $this->success($stats, 'HIPAA governance stats retrieved.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve governance stats: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Stream RFC 4180 CSV export of statutory designations for OCR auditors.
     */
    public function exportCsv(): void
    {
        try {
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int) $user['id'] : null;
            $userRole = !empty($user['role']) ? (string) $user['role'] : null;

            $csv = $this->service->exportRegistryCsv($userId, $userRole);

            $filename = 'hipaa_officers_registry_' . date('Ymd_His') . '.csv';
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            echo $csv;
            exit;
        } catch (Throwable $e) {
            $this->error('Failed to export officer registry CSV: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get printable Appointment Attestation certificate data.
     */
    public function attestation(string $type): void
    {
        try {
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int) $user['id'] : null;
            $userRole = !empty($user['role']) ? (string) $user['role'] : null;

            $cert = $this->service->generateAttestationLetter($type, $userId, $userRole);
            $this->success($cert, 'Appointment attestation compiled successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to generate attestation: ' . $e->getMessage(), 400);
        }
    }
}
