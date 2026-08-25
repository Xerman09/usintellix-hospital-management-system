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
}
