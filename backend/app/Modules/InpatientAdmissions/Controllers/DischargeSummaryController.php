<?php

namespace App\Modules\InpatientAdmissions\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\InpatientAdmissions\Services\DischargeSummaryService;
use Exception;

class DischargeSummaryController extends Controller
{
    private DischargeSummaryService $service;

    public function __construct()
    {
        $this->service = new DischargeSummaryService();
    }

    /**
     * GET /inpatient-admissions/discharge-summary
     * Retrieve existing summary or pre-populated draft for an admission.
     */
    public function getSummary(): void
    {
        $request = new Request();
        $admissionId = (int) $request->input('admission_id');

        if ($admissionId <= 0) {
            $this->error('Valid Admission ID is required.', 422);
            return;
        }

        try {
            $data = $this->service->getPrePopulatedAdmissionData($admissionId);
            $this->success($data, 'Discharge summary retrieved successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 404);
        }
    }

    /**
     * POST /inpatient-admissions/discharge-summary/save-draft
     * Save an in-progress clinical discharge summary draft without releasing bed.
     */
    public function saveDraft(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 0);
        $data = $request->all();

        $admissionId = (int) ($data['admission_id'] ?? 0);
        if ($admissionId <= 0) {
            $this->error('Admission ID is required.', 422);
            return;
        }

        try {
            $result = $this->service->saveDraft($admissionId, $data, $userId);
            $this->success($result['data'], $result['message']);
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/discharge-summary/finalize
     * Finalize, electronically sign, and officially discharge the inpatient.
     */
    public function finalize(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 0);
        $data = $request->all();

        $admissionId = (int) ($data['admission_id'] ?? 0);
        if ($admissionId <= 0) {
            $this->error('Admission ID is required.', 422);
            return;
        }

        try {
            $result = $this->service->finalize($admissionId, $data, $userId);
            $this->success($result['data'], $result['message']);
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * GET /inpatient-admissions/discharge-summary/print
     * Output high-resolution print-ready HTML / PDF document for the patient's medical record.
     */
    public function printPdf(): void
    {
        $request = new Request();
        $admissionId = (int) $request->input('admission_id');

        if ($admissionId <= 0) {
            $this->error('Admission ID is required.', 422);
            return;
        }

        try {
            $html = $this->service->generatePrintHtml($admissionId);
            header('Content-Type: text/html; charset=UTF-8');
            header('Cache-Control: no-cache, no-store, must-revalidate');
            header('Pragma: no-cache');
            echo $html;
            exit;
        } catch (Exception $e) {
            $this->error($e->getMessage(), 404);
        }
    }
}
