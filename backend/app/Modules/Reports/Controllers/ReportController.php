<?php

namespace App\Modules\Reports\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Modules\Reports\Services\ReportService;

class ReportController extends Controller
{
    private ReportService $reportService;

    public function __construct()
    {
        $this->reportService = new ReportService();
    }

    /**
     * Get patient list report based on filters.
     */
    public function patientList(): void
    {
        $request = new Request();
        
        $filters = $request->only(['provider_id', 'date_from', 'date_to']);
        
        $data = $this->reportService->getPatientList($filters);

        $this->success($data, 'Patient list retrieved successfully.');
    }

    /**
     * Get prescriptions and dispensations report based on filters.
     */
    public function rxReport(): void
    {
        $request = new Request();
        $filters = $request->only(['facility_id', 'date_from', 'date_to', 'patient_id', 'drug', 'lot']);
        $data = $this->reportService->getRxReport($filters);

        $this->success($data, 'Rx report retrieved successfully.');
    }

    public function patientListCreation(): void
    {
        $request = new Request();
        $filters = $request->only(['date_from', 'date_to', 'patient_id', 'age_min', 'age_max', 'gender', 'ethnicity', 'provider_id', 'option']);
        $data = $this->reportService->getPatientListCreationReport($filters);

        $this->success($data, 'Patient list creation report retrieved successfully.');
    }

    public function messageList(): void
    {
        $request = new Request();
        $filters = $request->only(['date_from', 'date_to']);
        $data = $this->reportService->getMessageListReport($filters);

        $this->success($data, 'Message list report retrieved successfully.');
    }

    public function clinical(): void
    {
        $request = new Request();
        $filters = $request->only(['date_from', 'date_to', 'patient_id', 'age_min', 'age_max', 'gender', 'race', 'ethnicity']);
        $data = $this->reportService->getClinicalReport($filters);

        $this->success($data, 'Clinical report retrieved successfully.');
    }

    public function referrals(): void
    {
        $request = new Request();
        $filters = $request->only(['date_from', 'date_to', 'facility_id']);
        $data = $this->reportService->getReferralReport($filters);

        $this->success($data, 'Referral report retrieved successfully.');
    }

    public function immunizationRegistry(): void
    {
        $request = new Request();
        $filters = $request->only(['vis_date_from', 'vis_date_to', 'cvx_code_id']);
        $data = $this->reportService->getImmunizationRegistryReport($filters);

        $this->success($data, 'Immunization registry report retrieved successfully.');
    }

    public function immunizationRegistryCvxCodes(): void
    {
        $data = $this->reportService->getImmunizationCvxCodes();
        $this->success($data, 'CVX codes retrieved successfully.');
    }

    public function reportHistory(): void
    {
        $request = new Request();
        $filters = $request->only(['date_from', 'date_to']);
        $data = $this->reportService->getReportHistory($filters);
        $this->success($data, 'Report history retrieved successfully.');
    }

    public function logReport(): void
    {
        $request = new Request();
        $body = $request->only(['title', 'report_type', 'status', 'filters']);
        $userId = $_SESSION['user']['id'] ?? null;
        $this->reportService->logReportRun($body, $userId);
        $this->success([], 'Report logged successfully.');
    }
    public function standardMeasures(): void
    {
        $request = new Request();
        $filters = $request->only(['target_date', 'rule_set', 'plan_set', 'provider', 'provider_relationship']);
        $data = $this->reportService->getStandardMeasuresReport($filters);
        $this->success($data, 'Standard measures retrieved successfully.');
    }
}
