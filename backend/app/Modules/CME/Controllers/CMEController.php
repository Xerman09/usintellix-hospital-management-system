<?php

namespace App\Modules\CME\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Modules\CME\Services\CMEService;
use Throwable;

class CMEController extends Controller
{
    private CMEService $service;

    public function __construct()
    {
        $this->service = new CMEService();
    }

    /**
     * GET /cme/records
     */
    public function index(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $filters = [
                'employee_id' => $request->input('employee_id'),
                'department_id' => $request->input('department_id'),
                'activity_type' => $request->input('activity_type'),
                'category_type' => $request->input('category_type'),
                'verification_status' => $request->input('verification_status'),
                'year' => $request->input('year'),
                'q' => $request->input('q')
            ];
            $page = max(1, (int)($request->input('page') ?? 1));
            $perPage = max(5, min(100, (int)($request->input('per_page') ?? 25)));

            $data = $this->service->listRecords($filters, $page, $perPage);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /cme/profile
     */
    public function profile(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $empId = (int)$request->input('employee_id');
            $year = (int)($request->input('year') ?? date('Y'));

            if ($empId <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Employee ID is required.'], 400);
            }

            $profile = $this->service->getStaffCMEProfile($empId, $year);
            return Response::json(['status' => 'success', 'data' => $profile]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /cme/compliance-overview
     */
    public function complianceOverview(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $year = (int)($request->input('year') ?? date('Y'));

            $overview = $this->service->getRenewalComplianceOverview($year);
            return Response::json(['status' => 'success', 'data' => $overview]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /cme/records
     */
    public function store(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $userId = Session::get('user_id');

            $data = [
                'employee_id' => $request->input('employee_id'),
                'activity_title' => $request->input('activity_title'),
                'activity_type' => $request->input('activity_type'),
                'accrediting_body' => $request->input('accrediting_body'),
                'activity_date' => $request->input('activity_date'),
                'venue' => $request->input('venue'),
                'credit_units' => $request->input('credit_units'),
                'category_type' => $request->input('category_type'),
                'certificate_number' => $request->input('certificate_number'),
                'certificate_file_name' => $request->input('certificate_file_name'),
                'verification_status' => $request->input('verification_status') ?? 'verified',
                'target_license_type' => $request->input('target_license_type'),
                'target_cycle_year' => $request->input('target_cycle_year'),
                'notes' => $request->input('notes')
            ];

            $res = $this->service->saveRecord($data, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * POST /cme/records/update or PUT /cme/records
     */
    public function update(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $userId = Session::get('user_id');

            $id = (int)($request->input('id') ?? 0);
            if ($id <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Record ID is required for update.'], 400);
            }

            $data = [
                'id' => $id,
                'employee_id' => $request->input('employee_id'),
                'activity_title' => $request->input('activity_title'),
                'activity_type' => $request->input('activity_type'),
                'accrediting_body' => $request->input('accrediting_body'),
                'activity_date' => $request->input('activity_date'),
                'venue' => $request->input('venue'),
                'credit_units' => $request->input('credit_units'),
                'category_type' => $request->input('category_type'),
                'certificate_number' => $request->input('certificate_number'),
                'certificate_file_name' => $request->input('certificate_file_name'),
                'verification_status' => $request->input('verification_status'),
                'target_license_type' => $request->input('target_license_type'),
                'target_cycle_year' => $request->input('target_cycle_year'),
                'notes' => $request->input('notes')
            ];

            $res = $this->service->saveRecord($data, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * DELETE /cme/records or POST /cme/records/delete
     */
    public function destroy(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $id = (int)$request->input('id');

            if ($id <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Record ID is required.'], 400);
            }

            $deleted = $this->service->deleteRecord($id);
            return Response::json(['status' => 'success', 'deleted' => $deleted, 'message' => 'CME activity record deleted.']);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    /**
     * GET /cme/metadata
     */
    public function metadata(?Request $request = null): Response
    {
        try {
            $data = $this->service->getMetadata();
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
