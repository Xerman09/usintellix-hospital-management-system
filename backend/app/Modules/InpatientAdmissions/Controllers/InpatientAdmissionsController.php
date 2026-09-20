<?php

namespace App\Modules\InpatientAdmissions\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\InpatientAdmissions\Services\InpatientAdmissionsService;
use Exception;

class InpatientAdmissionsController extends Controller
{
    private InpatientAdmissionsService $service;

    public function __construct()
    {
        $this->service = new InpatientAdmissionsService();
    }

    /**
     * GET /inpatient-admissions/whiteboard
     */
    public function whiteboard(): void
    {
        $request = new Request();
        $wardCode = $request->input('ward_code');
        $status   = $request->input('status');
        $search   = $request->input('search');

        try {
            $data = $this->service->getCensusWhiteboard($wardCode, $status, $search);
            $this->success($data, 'Inpatient ward whiteboard census retrieved successfully.');
        } catch (Exception $e) {
            $this->error('Failed to retrieve whiteboard: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /inpatient-admissions/wards
     */
    public function wards(): void
    {
        try {
            $wards = $this->service->getWards();
            $this->success($wards, 'Hospital wards retrieved successfully.');
        } catch (Exception $e) {
            $this->error('Failed to retrieve wards: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /inpatient-admissions/beds
     */
    public function beds(): void
    {
        $request = new Request();
        $wardId = $request->input('ward_id') ? (int) $request->input('ward_id') : null;
        $status = $request->input('status');

        try {
            $beds = $this->service->getBeds($wardId, $status);
            $this->success($beds, 'Hospital beds retrieved successfully.');
        } catch (Exception $e) {
            $this->error('Failed to retrieve beds: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /inpatient-admissions/details?id={id}
     */
    public function details(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Valid Admission ID is required.', 400);
            return;
        }

        try {
            $admission = $this->service->getAdmissionDetails($id);
            if (!$admission) {
                $this->error('Inpatient admission record not found.', 404);
                return;
            }
            $this->success($admission, 'Admission details retrieved successfully.');
        } catch (Exception $e) {
            $this->error('Failed to retrieve admission: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /inpatient-admissions/admit
     */
    public function admit(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = $user['id'] ?? null;
        $data = $request->all();

        if (empty($data['bed_id'])) {
            $this->error('Hospital Bed selection is required.', 422);
            return;
        }
        if (empty($data['patient_name']) && empty($data['patient_id'])) {
            $this->error('Patient selection or patient name is required.', 422);
            return;
        }

        try {
            $record = $this->service->admitPatient($data, $userId ? (int) $userId : null);
            $this->success($record, 'Patient successfully admitted to hospital bed.', 201);
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/transfer
     */
    public function transfer(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = $user['id'] ?? null;
        $data = $request->all();

        $admissionId = (int) ($data['admission_id'] ?? 0);
        $toBedId     = (int) ($data['to_bed_id'] ?? 0);

        if ($admissionId <= 0 || $toBedId <= 0) {
            $this->error('Admission ID and target Destination Bed ID are required.', 422);
            return;
        }

        try {
            $record = $this->service->transferPatient($admissionId, $data, $userId ? (int) $userId : null);
            $this->success($record, 'Patient transferred to destination bed successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/pending-discharge
     */
    public function pendingDischarge(): void
    {
        $request = new Request();
        $admissionId = (int) $request->input('admission_id');

        if ($admissionId <= 0) {
            $this->error('Admission ID is required.', 422);
            return;
        }

        try {
            $record = $this->service->markPendingDischarge($admissionId, $request->input('notes'));
            $this->success($record, 'Patient status set to Pending Discharge.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/discharge
     */
    public function discharge(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = $user['id'] ?? null;
        $data = $request->all();

        $admissionId = (int) ($data['admission_id'] ?? 0);

        if ($admissionId <= 0) {
            $this->error('Valid Admission ID is required.', 422);
            return;
        }

        try {
            $record = $this->service->dischargePatient($admissionId, $data, $userId ? (int) $userId : null);
            $this->success($record, 'Patient discharged successfully. Bed marked as Dirty / Turnover for Housekeeping sanitization.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/beds/status
     */
    public function bedStatus(): void
    {
        $request = new Request();
        $bedId  = (int) $request->input('bed_id');
        $status = trim((string) $request->input('status'));

        if ($bedId <= 0 || empty($status)) {
            $this->error('Bed ID and Status are required.', 422);
            return;
        }

        try {
            $bed = $this->service->updateBedStatus($bedId, $status, $request->input('notes'));
            $this->success($bed, "Bed status updated to '{$status}'.");
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/wards
     */
    public function createWard(): void
    {
        $request = new Request();
        $data = $request->all();

        if (empty($data['ward_code']) || empty($data['ward_name'])) {
            $this->error('Ward Code and Ward Name are required.', 422);
            return;
        }

        try {
            $ward = $this->service->createWard($data);
            $this->success($ward, 'Hospital ward created successfully.', 201);
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/beds
     */
    public function createBed(): void
    {
        $request = new Request();
        $data = $request->all();

        if (empty($data['ward_id']) || empty($data['bed_number']) || empty($data['room_number'])) {
            $this->error('Ward, Bed Number, and Room Number are required.', 422);
            return;
        }

        try {
            $bed = $this->service->createBed($data);
            $this->success($bed, 'Hospital bed registered successfully.', 201);
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }
}
