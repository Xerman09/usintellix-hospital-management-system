<?php

namespace App\Modules\LifeSupport\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Modules\LifeSupport\Services\LifeSupportService;
use Throwable;

class LifeSupportController extends Controller
{
    private LifeSupportService $service;

    public function __construct()
    {
        $this->service = new LifeSupportService();
    }

    /**
     * GET /life-support/certifications
     */
    public function index(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $filters = [
                'cert_type' => $request->input('cert_type'),
                'department_id' => $request->input('department_id'),
                'department_name' => $request->input('department_name'),
                'employee_id' => $request->input('employee_id'),
                'status' => $request->input('status'),
                'status_tier' => $request->input('status_tier'),
                'verification_status' => $request->input('verification_status'),
                'q' => $request->input('q')
            ];
            $page = max(1, (int)($request->input('page') ?? 1));
            $perPage = max(5, min(100, (int)($request->input('per_page') ?? 25)));

            $data = $this->service->listCertifications($filters, $page, $perPage);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /life-support/metrics
     */
    public function metrics(): Response
    {
        try {
            $data = $this->service->getExecutiveMetrics();
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /life-support/certifications/:id
     */
    public function show($id): Response
    {
        try {
            $data = $this->service->getCertificationDetail((int)$id);
            if (!$data) {
                return Response::json(['status' => 'error', 'message' => "Life support certification not found."], 404);
            }
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /life-support/certifications
     */
    public function store(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();

            if (empty($payload['cert_type'])) {
                return Response::json(['status' => 'error', 'message' => 'Life support certification type (BLS, ACLS, PALS, ATLS, NRP) is required.'], 422);
            }
            if (empty($payload['employee_id']) && empty($payload['staff_name'])) {
                return Response::json(['status' => 'error', 'message' => 'Clinician / Employee selection is required.'], 422);
            }
            if (empty($payload['certificate_number'])) {
                return Response::json(['status' => 'error', 'message' => 'Certificate number is required.'], 422);
            }
            if (empty($payload['issue_date'])) {
                return Response::json(['status' => 'error', 'message' => 'Issue date is required.'], 422);
            }

            $userId = Session::get('user_id') ?? null;
            $result = $this->service->saveCertification($payload, $userId);

            return Response::json(['status' => 'success', 'data' => $result], 201);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /life-support/certifications/:id
     */
    public function update($id, ?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();
            $payload['id'] = (int)$id;

            $userId = Session::get('user_id') ?? null;
            $result = $this->service->saveCertification($payload, $userId);

            return Response::json(['status' => 'success', 'data' => $result]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /life-support/certifications/:id
     */
    public function destroy($id): Response
    {
        try {
            $this->service->deleteCertification((int)$id);
            return Response::json(['status' => 'success', 'message' => 'Life support certification record deleted successfully.']);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /life-support/scan-expirations
     * Runs automated countdown scanner and generates recertification reminders
     */
    public function scan(): Response
    {
        try {
            $result = $this->service->scanExpirationsAndDispatchReminders();
            return Response::json([
                'status' => 'success',
                'message' => "Automated expiration scan complete. {$result['scanned_certifications']} certifications evaluated, {$result['reminders_dispatched']} recertification reminders dispatched.",
                'data' => $result
            ]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /life-support/certifications/:id/remind
     */
    public function manualReminder($id, ?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();
            $userId = Session::get('user_id') ?? null;

            $result = $this->service->sendManualReminder((int)$id, $payload, $userId);
            return Response::json(['status' => 'success', 'data' => $result]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /life-support/reminders
     */
    public function reminders(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $filters = [
                'cert_type' => $request->input('cert_type'),
                'tier' => $request->input('tier'),
                'status' => $request->input('status'),
                'q' => $request->input('q')
            ];
            $page = max(1, (int)($request->input('page') ?? 1));
            $perPage = max(5, min(100, (int)($request->input('per_page') ?? 25)));

            $data = $this->service->listReminders($filters, $page, $perPage);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /life-support/reminders/:id/acknowledge
     */
    public function acknowledgeReminder($id, ?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $acknowledgedBy = $request->input('acknowledged_by') ?: (Session::get('username') ?? 'Staff Member / HR Manager');

            $this->service->acknowledgeReminder((int)$id, $acknowledgedBy);
            return Response::json(['status' => 'success', 'message' => "Reminder acknowledged by {$acknowledgedBy}."]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /life-support/matrix
     */
    public function matrix(): Response
    {
        try {
            $data = $this->service->getComplianceMatrix();
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /life-support/metadata
     */
    public function metadata(): Response
    {
        try {
            $data = $this->service->getMetadata();
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
