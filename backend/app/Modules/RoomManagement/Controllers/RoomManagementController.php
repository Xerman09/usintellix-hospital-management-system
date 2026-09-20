<?php

namespace App\Modules\RoomManagement\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\RoomManagement\Services\RoomManagementService;

class RoomManagementController extends Controller
{
    private RoomManagementService $service;

    public function __construct()
    {
        $this->service = new RoomManagementService();
    }

    // =========================================================================
    // AVAILABILITY MONITOR
    // =========================================================================

    public function monitor(): void
    {
        $request = new Request();
        $filters = [
            'building_id'  => $request->input('building_id'),
            'floor_number' => $request->input('floor_number'),
            'room_type'    => $request->input('room_type'),
            'status'       => $request->input('status'),
            'search'       => $request->input('search')
        ];

        $data = $this->service->getHospitalAvailabilityMonitor(array_filter($filters));
        $this->success($data, 'Hospital room and bed availability retrieved successfully.');
    }

    // =========================================================================
    // BUILDINGS
    // =========================================================================

    public function buildingsIndex(): void
    {
        $request = new Request();
        $activeOnly = (bool)$request->input('active_only');
        $buildings = $this->service->listBuildings($activeOnly);
        $this->success($buildings, 'Buildings retrieved successfully.');
    }

    public function buildingsStore(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $data = $request->all();

        $res = $this->service->saveBuilding($data, null, (int)($user['id'] ?? 0));
        if (!$res['success']) {
            $this->error($res['message'], 422);
            return;
        }

        $this->success($res, $res['message'], 201);
    }

    public function buildingsUpdate(): void
    {
        $request = new Request();
        $id = (int)$request->input('id');
        if (!$id) {
            $this->error('Building ID is required.', 422);
            return;
        }

        $res = $this->service->saveBuilding($request->all(), $id);
        if (!$res['success']) {
            $this->error($res['message'], 422);
            return;
        }

        $this->success($res, $res['message']);
    }

    public function buildingsDestroy(): void
    {
        $request = new Request();
        $id = (int)$request->input('id');
        if (!$id) {
            $this->error('Building ID is required.', 422);
            return;
        }

        $res = $this->service->deleteBuilding($id);
        if (!$res['success']) {
            $this->error($res['message'], 422);
            return;
        }

        $this->success(null, $res['message']);
    }

    // =========================================================================
    // ROOMS
    // =========================================================================

    public function roomsIndex(): void
    {
        $request = new Request();
        $filters = [
            'building_id'  => $request->input('building_id'),
            'floor_number' => $request->input('floor_number'),
            'room_type'    => $request->input('room_type'),
            'status'       => $request->input('status'),
            'search'       => $request->input('search')
        ];

        $rooms = $this->service->listRooms(array_filter($filters));
        $this->success($rooms, 'Rooms retrieved successfully.');
    }

    public function roomsDetail(): void
    {
        $request = new Request();
        $id = (int)$request->input('id');
        if (!$id) {
            $this->error('Room ID is required.', 422);
            return;
        }

        $room = $this->service->findRoom($id);
        if (!$room) {
            $this->error('Room not found.', 404);
            return;
        }

        $this->success($room, 'Room details retrieved successfully.');
    }

    public function roomsStore(): void
    {
        $request = new Request();
        $data = $request->all();

        $res = $this->service->saveRoom($data);
        if (!$res['success']) {
            $this->error($res['message'], 422);
            return;
        }

        $this->success($res, $res['message'], 201);
    }

    public function roomsUpdate(): void
    {
        $request = new Request();
        $id = (int)$request->input('id');
        if (!$id) {
            $this->error('Room ID is required.', 422);
            return;
        }

        $res = $this->service->saveRoom($request->all(), $id);
        if (!$res['success']) {
            $this->error($res['message'], 422);
            return;
        }

        $this->success($res, $res['message']);
    }

    public function roomsDestroy(): void
    {
        $request = new Request();
        $id = (int)$request->input('id');
        if (!$id) {
            $this->error('Room ID is required.', 422);
            return;
        }

        $res = $this->service->deleteRoom($id);
        if (!$res['success']) {
            $this->error($res['message'], 422);
            return;
        }

        $this->success(null, $res['message']);
    }

    // =========================================================================
    // BEDS
    // =========================================================================

    public function bedsIndex(): void
    {
        $request = new Request();
        $filters = [
            'room_id'     => $request->input('room_id'),
            'building_id' => $request->input('building_id'),
            'status'      => $request->input('status'),
            'bed_type'    => $request->input('bed_type'),
            'room_type'   => $request->input('room_type'),
            'search'      => $request->input('search')
        ];

        $beds = $this->service->listBeds(array_filter($filters));
        $this->success($beds, 'Beds retrieved successfully.');
    }

    public function bedsStore(): void
    {
        $request = new Request();
        $data = $request->all();

        $res = $this->service->saveBed($data);
        if (!$res['success']) {
            $this->error($res['message'], 422);
            return;
        }

        $this->success($res, $res['message'], 201);
    }

    public function bedsUpdate(): void
    {
        $request = new Request();
        $id = (int)$request->input('id');
        if (!$id) {
            $this->error('Bed ID is required.', 422);
            return;
        }

        $res = $this->service->saveBed($request->all(), $id);
        if (!$res['success']) {
            $this->error($res['message'], 422);
            return;
        }

        $this->success($res, $res['message']);
    }

    public function bedsUpdateStatus(): void
    {
        $request = new Request();
        $id = (int)$request->input('id');
        $status = (string)$request->input('status');

        if (!$id || empty($status)) {
            $this->error('Bed ID and status are required.', 422);
            return;
        }

        $res = $this->service->updateBedStatus($id, $status);
        if (!$res['success']) {
            $this->error($res['message'], 422);
            return;
        }

        $this->success(null, $res['message']);
    }

    public function bedsDestroy(): void
    {
        $request = new Request();
        $id = (int)$request->input('id');
        if (!$id) {
            $this->error('Bed ID is required.', 422);
            return;
        }

        $res = $this->service->deleteBed($id);
        if (!$res['success']) {
            $this->error($res['message'], 422);
            return;
        }

        $this->success(null, $res['message']);
    }
}
