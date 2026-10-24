<?php

namespace App\Modules\BloodBank\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Modules\BloodBank\Services\BloodInventoryService;
use Throwable;

class BloodInventoryController
{
    private BloodInventoryService $service;

    public function __construct()
    {
        $this->service = new BloodInventoryService();
    }

    public function index(Request $request): Response
    {
        try {
            $filters = [
                'component_type' => $request->query('component_type'),
                'abo_group' => $request->query('abo_group'),
                'rh_factor' => $request->query('rh_factor'),
                'status' => $request->query('status'),
                'storage_location_id' => $request->query('storage_location_id'),
                'q' => $request->query('q')
            ];

            $units = $this->service->listUnits($filters);
            return Response::json(['success' => true, 'data' => $units]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function add(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();

            $res = $this->service->addUnit($data, $actor);
            return Response::json($res, ($res['success'] ?? false) ? 200 : 422);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function logTemp(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();
            $locId = (int) ($data['storage_location_id'] ?? 0);
            $temp = isset($data['recorded_temp_c']) ? (float) $data['recorded_temp_c'] : null;
            $notes = $data['notes'] ?? null;

            if ($locId <= 0 || $temp === null) {
                return Response::json(['success' => false, 'message' => 'Location ID and temperature value are required.'], 400);
            }

            $res = $this->service->logColdChainTemp($locId, $temp, $notes, $actor);
            return Response::json($res, ($res['success'] ?? false) ? 200 : 422);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function updateStatus(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();
            $unitId = (int) ($data['id'] ?? 0);
            $status = $data['status'] ?? '';
            $reason = $data['reason'] ?? null;

            if ($unitId <= 0 || empty($status)) {
                return Response::json(['success' => false, 'message' => 'Unit ID and status are required.'], 400);
            }

            $res = $this->service->updateUnitStatus($unitId, $status, $reason, $actor);
            return Response::json($res, ($res['success'] ?? false) ? 200 : 422);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function storageLocations(Request $request): Response
    {
        try {
            $locations = $this->service->getStorageLocations();
            return Response::json(['success' => true, 'data' => $locations]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function stats(Request $request): Response
    {
        try {
            $stats = $this->service->getInventoryStats();
            return Response::json(['success' => true, 'data' => $stats]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
