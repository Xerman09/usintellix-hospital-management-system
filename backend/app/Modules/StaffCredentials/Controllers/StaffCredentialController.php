<?php

namespace App\Modules\StaffCredentials\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Modules\StaffCredentials\Services\StaffCredentialService;
use Throwable;

class StaffCredentialController extends Controller
{
    private StaffCredentialService $service;

    public function __construct()
    {
        $this->service = new StaffCredentialService();
    }

    /**
     * GET /staff-credentials/metrics
     */
    public function metrics(Request $request): Response
    {
        try {
            $data = $this->service->getGovernanceMetrics();
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /staff-credentials
     */
    public function credentialsIndex(Request $request): Response
    {
        try {
            $filters = [
                'employee_id' => $request->query('employee_id'),
                'credential_type' => $request->query('credential_type'),
                'verification_status' => $request->query('verification_status'),
                'expiring_soon' => $request->query('expiring_soon'),
                'q' => $request->query('q')
            ];
            $page = max(1, (int)($request->query('page') ?? 1));
            $perPage = max(5, min(100, (int)($request->query('per_page') ?? 25)));

            $data = $this->service->listCredentials($filters, $page, $perPage);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /staff-credentials
     */
    public function credentialSave(Request $request): Response
    {
        try {
            $payload = $request->body();
            $userId = (int)($request->user()['id'] ?? 1);
            $res = $this->service->saveCredential($payload, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * DELETE /staff-credentials
     */
    public function credentialDelete(Request $request): Response
    {
        try {
            $id = (int)$request->query('id');
            if ($id <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Credential ID required'], 422);
            }
            $this->service->deleteCredential($id);
            return Response::json(['status' => 'success', 'message' => 'Credential deleted']);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /clinical-privileges
     */
    public function privilegesIndex(Request $request): Response
    {
        try {
            $filters = [
                'employee_id' => $request->query('employee_id'),
                'tier' => $request->query('tier'),
                'status' => $request->query('status'),
                'q' => $request->query('q')
            ];
            $page = max(1, (int)($request->query('page') ?? 1));
            $perPage = max(5, min(100, (int)($request->query('per_page') ?? 25)));

            $data = $this->service->listClinicalPrivileges($filters, $page, $perPage);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /clinical-privileges/detail
     */
    public function privilegeDetail(Request $request): Response
    {
        try {
            $id = (int)$request->query('id');
            $data = $this->service->getPrivilegeDetail($id);
            if (!$data) {
                return Response::json(['status' => 'error', 'message' => 'Clinical privilege grant not found'], 404);
            }
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /clinical-privileges
     */
    public function privilegeSave(Request $request): Response
    {
        try {
            $payload = $request->body();
            $userId = (int)($request->user()['id'] ?? 1);
            $res = $this->service->saveClinicalPrivilege($payload, $userId);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /clinical-privileges/check-procedure
     */
    public function checkProcedure(Request $request): Response
    {
        try {
            $payload = $request->body();
            $employeeId = (int)($payload['employee_id'] ?? 0);
            $procedure = trim($payload['procedure'] ?? '');

            if ($employeeId <= 0 || empty($procedure)) {
                return Response::json(['status' => 'error', 'message' => 'Physician Employee ID and Procedure name/code are required.'], 422);
            }

            $res = $this->service->checkProcedurePrivilege($employeeId, $procedure);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /staff-credentials/seed-demo
     */
    public function seedDemo(Request $request): Response
    {
        try {
            $res = $this->service->seedRealisticDemoData();
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /staff-credentials/expiration-scanner
     */
    public function expirationScanner(Request $request): Response
    {
        try {
            $data = $this->service->scanLicenseExpirations();
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /staff-credentials/prescribing-holds/override
     */
    public function holdOverride(Request $request): Response
    {
        try {
            $payload = $request->body();
            $holdId = (int)($payload['hold_id'] ?? 0);
            $reason = trim($payload['reason'] ?? 'CMO Authorized grace period');
            $expiry = trim($payload['override_expires_at'] ?? date('Y-m-d', strtotime('+30 days')));
            $user = $request->user()['name'] ?? ($request->user()['username'] ?? 'Chief Medical Officer');

            if ($holdId <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Hold ID required'], 422);
            }

            $res = $this->service->applyAdministrativeOverride($holdId, $reason, $user, $expiry);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /staff-credentials/prescribing-holds/lift
     */
    public function holdLift(Request $request): Response
    {
        try {
            $payload = $request->body();
            $holdId = (int)($payload['hold_id'] ?? 0);
            $user = $request->user()['name'] ?? ($request->user()['username'] ?? 'Medical Credentials Officer');

            if ($holdId <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Hold ID required'], 422);
            }

            $res = $this->service->liftPrescribingHold($holdId, $user);
            return Response::json(['status' => 'success', 'data' => $res]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }
}
