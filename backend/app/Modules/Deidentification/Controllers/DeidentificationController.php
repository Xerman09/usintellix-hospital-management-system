<?php

declare(strict_types=1);

namespace App\Modules\Deidentification\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Deidentification\Services\DeidentificationService;
use Throwable;

class DeidentificationController extends Controller
{
    private DeidentificationService $service;

    public function __construct()
    {
        $this->service = new DeidentificationService();
    }

    /**
     * Get real-time telemetry stats for Safe Harbor de-identification console.
     */
    public function stats(): void
    {
        try {
            $stats = $this->service->getStats();
            $this->success($stats, 'Safe Harbor de-identification statistics retrieved successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve Safe Harbor stats: ' . $e->getMessage(), 500);
        }
    }

    /**
     * List all de-identified exports.
     */
    public function list(): void
    {
        try {
            $request = new Request();
            $filters = [
                'dataset_type' => $request->input('dataset_type'),
                'purpose_of_use' => $request->input('purpose_of_use'),
                'search' => $request->input('search'),
                'limit' => $request->input('limit')
            ];

            $exports = $this->service->listExports($filters);
            $this->success($exports, 'De-identified exports list retrieved successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve export records: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Generate a new de-identified dataset according to Safe Harbor rules.
     */
    public function generate(): void
    {
        try {
            $request = new Request();
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int) $user['id'] : null;

            $params = [
                'dataset_type' => $request->input('dataset_type', 'patient_demographics'),
                'purpose_of_use' => $request->input('purpose_of_use', 'clinical_research'),
                'purpose_description' => $request->input('purpose_description', ''),
                'recipient_institution' => $request->input('recipient_institution', ''),
                'recipient_investigator' => $request->input('recipient_investigator', ''),
                'data_format' => $request->input('data_format', 'rfc4180_csv'),
                'attestation_officer_name' => $request->input('attestation_officer_name', 'HIPAA Compliance Officer'),
                'attestation_officer_role' => $request->input('attestation_officer_role', 'Compliance Officer'),
                'limit' => (int) $request->input('limit', 200)
            ];

            if (empty($params['purpose_description'])) {
                $this->error('Purpose description is required for statutory research compliance.', 400);
                return;
            }

            if (empty($params['recipient_institution'])) {
                $this->error('Recipient institution is required.', 400);
                return;
            }

            $result = $this->service->generateDataset($params, $userId);
            $this->success($result, 'De-identified dataset generated successfully under 45 CFR § 164.514(b).');
        } catch (Throwable $e) {
            $this->error('Failed to generate de-identified dataset: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get single export record with metadata.
     */
    public function show(int $id): void
    {
        try {
            $export = $this->service->getExport($id);
            if (!$export) {
                $this->error('De-identified export record not found.', 404);
                return;
            }

            $this->success($export, 'Export record retrieved successfully.');
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * Download RFC 4180 CSV export with statutory compliance header.
     */
    public function exportCsv(int $id): void
    {
        try {
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int) $user['id'] : null;

            $fileData = $this->service->exportDatasetCsv($id, $userId);

            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $fileData['filename'] . '"');
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            echo $fileData['content'];
            exit;
        } catch (Throwable $e) {
            $this->error('Failed to stream CSV export: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Download or view FHIR / JSON de-identified export.
     */
    public function exportJson(int $id): void
    {
        try {
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int) $user['id'] : null;

            $fileData = $this->service->exportDatasetJson($id, $userId);

            $request = new Request();
            if ($request->input('download') === '1') {
                header('Content-Type: application/json; charset=utf-8');
                header('Content-Disposition: attachment; filename="' . $fileData['filename'] . '"');
                echo json_encode($fileData['payload'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
                exit;
            }

            $this->success($fileData['payload'], 'JSON dataset exported successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to export JSON dataset: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get printable Safe Harbor Compliance Attestation Certificate data.
     */
    public function attestation(int $id): void
    {
        try {
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int) $user['id'] : null;

            $cert = $this->service->getAttestation($id, $userId);
            $this->success($cert, 'Attestation certificate generated successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve attestation: ' . $e->getMessage(), 404);
        }
    }

    /**
     * Secure Re-Identification Vault lookup (§ 164.514(c)).
     * Restricted strictly to authorized Compliance Officers.
     */
    public function lookup(int $id): void
    {
        try {
            $request = new Request();
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int) $user['id'] : null;
            $userRole = !empty($user['role']) ? (string) $user['role'] : 'admin';

            $pseudonym = trim((string) $request->input('subject_pseudonym', ''));
            if (empty($pseudonym)) {
                $this->error('Subject pseudonym code is required.', 400);
                return;
            }

            $result = $this->service->lookupSubject($id, $pseudonym, $userId, $userRole);
            if (!$result) {
                $this->error('Subject not found in re-identification vault for this export.', 404);
                return;
            }

            $this->success($result, 'Re-identification key verified by authorized compliance officer.');
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 403);
        }
    }

    /**
     * Export full master registry of de-identified exports as CSV.
     */
    public function exportRegistryCsv(): void
    {
        try {
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int) $user['id'] : null;

            $fileData = $this->service->exportRegistryCsv($userId);

            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $fileData['filename'] . '"');
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            header('Expires: 0');
            echo $fileData['content'];
            exit;
        } catch (Throwable $e) {
            $this->error('Failed to stream registry CSV: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get statutory 18-identifier checklist.
     */
    public function statutoryChecklist(): void
    {
        $this->success([
            'statutory_citation' => '45 CFR § 164.514(b)(2)',
            'identifiers' => DeidentificationService::STATUTORY_IDENTIFIERS
        ], 'Statutory 18-identifier checklist retrieved.');
    }
}
