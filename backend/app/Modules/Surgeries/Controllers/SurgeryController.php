<?php

namespace App\Modules\Surgeries\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Surgeries\Services\SurgeryService;

class SurgeryController extends Controller
{
    private SurgeryService $surgeryService;

    public function __construct()
    {
        $this->surgeryService = new SurgeryService();
    }

    public function index(): void
    {
        $surgeries = $this->surgeryService->list();
        $this->success($surgeries, 'Surgeries retrieved successfully.');
    }

    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();
        $data = $request->only(['name', 'description']);

        $result = $this->surgeryService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'description']);

        $result = $this->surgeryService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Surgery not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $result = $this->surgeryService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
