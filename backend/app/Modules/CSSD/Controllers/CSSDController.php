<?php

namespace App\Modules\CSSD\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Modules\CSSD\Services\CSSDService;
use Throwable;

class CSSDController extends Controller
{
    private CSSDService $service;

    public function __construct()
    {
        $this->service = new CSSDService();
    }

    /**
     * GET /cssd/metrics
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
     * GET /cssd/metadata
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

    /**
     * GET /cssd/master-trays
     */
    public function indexMaster(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $filters = [
                'specialty' => $request->input('specialty'),
                'category' => $request->input('category'),
                'status' => $request->input('status'),
                'q' => $request->input('q')
            ];
            $page = max(1, (int)($request->input('page') ?? 1));
            $perPage = max(5, min(100, (int)($request->input('per_page') ?? 25)));

            $data = $this->service->listMasterTrays($filters, $page, $perPage);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /cssd/master-trays/:id or /cssd/master-trays/show?id=:id
     */
    public function showMaster($id = null, ?Request $request = null): Response
    {
        try {
            $request = ($id instanceof Request) ? $id : ($request ?? new Request());
            $resolvedId = is_numeric($id) ? (int)$id : (int)($request->input('id') ?? 0);
            if ($resolvedId <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Master tray ID is required.'], 400);
            }

            $data = $this->service->getMasterTrayDetail($resolvedId);
            if (!$data) {
                return Response::json(['status' => 'error', 'message' => 'Master surgical tray not found.'], 404);
            }

            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /cssd/master-trays
     */
    public function storeMaster(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();

            if (empty($payload['name'])) {
                return Response::json(['status' => 'error', 'message' => 'Tray catalog name is required.'], 422);
            }

            $result = $this->service->saveMasterTray($payload);
            return Response::json(['status' => 'success', 'data' => $result], 201);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /cssd/master-trays/:id or POST /cssd/master-trays/update
     */
    public function updateMaster($id = null, ?Request $request = null): Response
    {
        try {
            $request = ($id instanceof Request) ? $id : ($request ?? new Request());
            $payload = $request->all();
            if (is_numeric($id)) {
                $payload['id'] = (int)$id;
            }

            $result = $this->service->saveMasterTray($payload);
            return Response::json(['status' => 'success', 'data' => $result]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /cssd/master-trays/:id or POST /cssd/master-trays/delete
     */
    public function destroyMaster($id = null, ?Request $request = null): Response
    {
        try {
            $request = ($id instanceof Request) ? $id : ($request ?? new Request());
            $resolvedId = is_numeric($id) ? (int)$id : (int)($request->input('id') ?? 0);
            if ($resolvedId <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Master tray ID is required.'], 400);
            }

            $this->service->deleteMasterTray($resolvedId);
            return Response::json(['status' => 'success', 'message' => 'Master surgical tray catalog deleted.']);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /cssd/physical-trays
     */
    public function indexPhysical(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $filters = [
                'status' => $request->input('status'),
                'master_tray_id' => $request->input('master_tray_id'),
                'specialty' => $request->input('specialty'),
                'location' => $request->input('location'),
                'q' => $request->input('q')
            ];
            $page = max(1, (int)($request->input('page') ?? 1));
            $perPage = max(5, min(100, (int)($request->input('per_page') ?? 25)));

            $data = $this->service->listPhysicalTrays($filters, $page, $perPage);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /cssd/physical-trays/:id or /cssd/physical-trays/show?id=:id
     */
    public function showPhysical($id = null, ?Request $request = null): Response
    {
        try {
            $request = ($id instanceof Request) ? $id : ($request ?? new Request());
            $resolvedId = is_numeric($id) ? (int)$id : (int)($request->input('id') ?? 0);
            if ($resolvedId <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Physical tray ID is required.'], 400);
            }

            $data = $this->service->getPhysicalTrayDetail($resolvedId);
            if (!$data) {
                return Response::json(['status' => 'error', 'message' => 'Physical surgical tray not found.'], 404);
            }

            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /cssd/physical-trays
     */
    public function storePhysical(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();

            if (empty($payload['master_tray_id'])) {
                return Response::json(['status' => 'error', 'message' => 'Master tray selection is required.'], 422);
            }

            $userId = Session::get('user_id') ?? null;
            $result = $this->service->registerPhysicalTray($payload, $userId);
            return Response::json(['status' => 'success', 'data' => $result], 201);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /cssd/physical-trays/update-status
     */
    public function updateStatus(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $trayId = (int)($request->input('tray_id') ?? $request->input('id') ?? 0);
            $newStatus = $request->input('current_status') ?? $request->input('status');
            $location = $request->input('current_location') ?? $request->input('location') ?? 'CSSD Central Station';
            $operator = $request->input('operator_name') ?: (Session::get('username') ?? 'CSSD Staff');
            $notes = $request->input('notes');
            $countVerified = $request->input('instrument_count_verified') != '0';
            $assignedSuite = $request->input('assigned_or_suite');
            $batchId = $request->input('last_sterilization_batch_id');

            if ($trayId <= 0 || empty($newStatus)) {
                return Response::json(['status' => 'error', 'message' => 'Tray ID and new status are required.'], 422);
            }

            $result = $this->service->updateTrayStatus(
                $trayId, $newStatus, $location, $operator, $notes,
                $countVerified, $assignedSuite, $batchId
            );

            return Response::json(['status' => 'success', 'data' => $result]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /cssd/physical-trays/:id or POST /cssd/physical-trays/delete
     */
    public function destroyPhysical($id = null, ?Request $request = null): Response
    {
        try {
            $request = ($id instanceof Request) ? $id : ($request ?? new Request());
            $resolvedId = is_numeric($id) ? (int)$id : (int)($request->input('id') ?? 0);
            if ($resolvedId <= 0) {
                return Response::json(['status' => 'error', 'message' => 'Physical tray ID is required.'], 400);
            }

            $this->service->deletePhysicalTray($resolvedId);
            return Response::json(['status' => 'success', 'message' => 'Physical surgical tray deleted.']);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
