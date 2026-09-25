<?php

declare(strict_types=1);

namespace App\Modules\Workforce\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Workforce\Services\WorkforceService;
use Throwable;

class WorkforceController extends Controller
{
    private WorkforceService $workforceService;

    public function __construct()
    {
        $this->workforceService = new WorkforceService();
    }

    /**
     * Get workforce training & disciplinary sanctions telemetry stats.
     */
    public function stats(): void
    {
        try {
            $stats = $this->workforceService->getStats();
            $this->success($stats, 'Workforce governance telemetry retrieved successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve workforce statistics: ' . $e->getMessage(), 500);
        }
    }

    /**
     * List all staff members with HIPAA training status.
     */
    public function listStaff(): void
    {
        try {
            $request = new Request();
            $filters = [
                'search' => $request->input('search'),
                'department_id' => $request->input('department_id'),
                'status' => $request->input('status')
            ];

            $staff = $this->workforceService->listStaff($filters);
            $this->success($staff, 'Workforce training records retrieved successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve workforce training records: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Record a completed training event.
     */
    public function recordTraining(): void
    {
        try {
            $request = new Request();
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int)$user['id'] : null;

            $data = $request->only([
                'employee_id',
                'training_type',
                'curriculum_title',
                'completion_date',
                'expiration_date',
                'score_percent',
                'passing_threshold',
                'delivery_method',
                'trainer_or_proctor',
                'verification_notes'
            ]);

            $record = $this->workforceService->recordTraining($data, $userId);
            $this->success($record, 'HIPAA training event recorded and certification updated successfully.', 201);
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 400);
        }
    }

    /**
     * Get training event details.
     */
    public function getTraining(int $id): void
    {
        try {
            $record = $this->workforceService->getTrainingById($id);
            $this->success($record, 'Training details retrieved successfully.');
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 404);
        }
    }

    /**
     * Get staff member training history.
     */
    public function staffTrainingHistory(int $employeeId): void
    {
        try {
            $history = $this->workforceService->getEmployeeTrainingHistory($employeeId);
            $this->success($history, 'Staff training history retrieved successfully.');
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 400);
        }
    }

    /**
     * List workforce disciplinary sanctions.
     */
    public function listSanctions(): void
    {
        try {
            $request = new Request();
            $filters = [
                'search' => $request->input('search'),
                'category' => $request->input('category'),
                'severity' => $request->input('severity'),
                'status' => $request->input('status'),
                'employee_id' => $request->input('employee_id')
            ];

            $sanctions = $this->workforceService->listSanctions($filters);
            $this->success($sanctions, 'Disciplinary sanctions retrieved successfully.');
        } catch (Throwable $e) {
            $this->error('Failed to retrieve disciplinary sanctions: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Record a new disciplinary sanction.
     */
    public function recordSanction(): void
    {
        try {
            $request = new Request();
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int)$user['id'] : null;

            $data = $request->only([
                'employee_id',
                'incident_id',
                'violation_date',
                'reported_date',
                'violation_category',
                'severity_level',
                'disciplinary_action',
                'investigation_findings',
                'disciplinary_rationale',
                'sanction_effective_date',
                'sanction_end_date',
                'suspension_days',
                'remediation_required',
                'remediation_deadline',
                'sanctioning_officer_name',
                'sanctioning_officer_role',
                'signoff_date',
                'notes'
            ]);

            $record = $this->workforceService->recordSanction($data, $userId);
            $this->success($record, 'Disciplinary sanction recorded successfully.', 201);
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 400);
        }
    }

    /**
     * Update an existing disciplinary sanction.
     */
    public function updateSanction(int $id): void
    {
        try {
            $request = new Request();
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int)$user['id'] : null;

            $data = $request->only([
                'status',
                'remediation_completed_date',
                'appeal_status',
                'notes'
            ]);

            $updated = $this->workforceService->updateSanction($id, $data, $userId);
            $this->success($updated, 'Disciplinary sanction updated successfully.');
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 400);
        }
    }

    /**
     * Get printable disciplinary sanction dossier data.
     */
    public function sanctionDossier(int $id): void
    {
        try {
            $user = Session::get('user');
            $userId = !empty($user['id']) ? (int)$user['id'] : null;

            $dossier = $this->workforceService->getSanctionDossier($id, $userId);
            $this->success($dossier, 'Sanction compliance dossier generated successfully.');
        } catch (Throwable $e) {
            $this->error($e->getMessage(), 404);
        }
    }

    /**
     * Export workforce training registry as RFC 4180 CSV.
     */
    public function exportTrainingsCsv(): void
    {
        $user = Session::get('user');
        $userId = !empty($user['id']) ? (int)$user['id'] : null;
        $this->workforceService->exportTrainingsCsv($userId);
    }

    /**
     * Export disciplinary sanctions registry as RFC 4180 CSV.
     */
    public function exportSanctionsCsv(): void
    {
        $user = Session::get('user');
        $userId = !empty($user['id']) ? (int)$user['id'] : null;
        $this->workforceService->exportSanctionsCsv($userId);
    }
}
