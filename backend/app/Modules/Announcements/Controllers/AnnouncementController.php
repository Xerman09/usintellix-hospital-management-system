<?php

namespace App\Modules\Announcements\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Announcements\Services\AnnouncementService;

class AnnouncementController extends Controller
{
    private AnnouncementService $service;

    public function __construct()
    {
        $this->service = new AnnouncementService();
    }

    /**
     * List announcements.
     * ?mode=manage -> returns full management list with filters and counts.
     * default -> returns active announcements for current user's role.
     */
    public function index(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userRole = $user['role'] ?? 'patient';
        $mode = (string) $request->input('mode', '');

        if ($mode === 'manage') {
            $filters = [
                'search'   => $request->input('search'),
                'status'   => $request->input('status', 'all'),
                'priority' => $request->input('priority', 'all'),
                'role'     => $request->input('role', 'all'),
            ];

            $result = $this->service->list($filters, $userRole, true);
            $this->success($result, 'Announcements retrieved successfully.');
            return;
        }

        $active = $this->service->list([], $userRole, false);
        $this->success($active, 'Active announcements retrieved successfully.');
    }

    /**
     * Dedicated active announcements endpoint for Dashboard Home banner/carousel.
     */
    public function active(): void
    {
        $user = Session::get('user');
        $userRole = $user['role'] ?? 'patient';

        $active = $this->service->list([], $userRole, false);
        $this->success($active, 'Active announcements retrieved successfully.');
    }

    /**
     * Return single announcement.
     */
    public function show(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        $record = $this->service->find($id);
        if (!$record) {
            $this->error('Announcement not found.', 404);
            return;
        }

        $this->success($record, 'Announcement retrieved successfully.');
    }

    /**
     * Return selectable roles for audience dropdown/checkboxes.
     */
    public function roles(): void
    {
        $roles = $this->service->getSelectableRoles();
        $this->success($roles, 'Selectable roles retrieved successfully.');
    }

    /**
     * Create announcement. Accepts multipart/form-data.
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $data = $request->all();
        $files = $request->files();
        $imageFile = $files['image'] ?? null;

        $result = $this->service->create($data, $imageFile, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update announcement. Accepts multipart/form-data or JSON.
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        if (!$id) {
            $this->error('Announcement ID is required.', 422);
            return;
        }

        $data = $request->all();
        $files = $request->files();
        $imageFile = $files['image'] ?? null;

        $result = $this->service->update($id, $data, $imageFile, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Delete announcement.
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        if (!$id) {
            $this->error('Announcement ID is required.', 422);
            return;
        }

        $result = $this->service->delete($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}