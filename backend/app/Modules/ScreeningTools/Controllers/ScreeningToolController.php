<?php

namespace App\Modules\ScreeningTools\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\ScreeningTools\Services\ScreeningToolService;

class ScreeningToolController extends Controller
{
    private ScreeningToolService $screeningToolService;

    public function __construct()
    {
        $this->screeningToolService = new ScreeningToolService();
    }

    public function index(): void
    {
        $tools = $this->screeningToolService->list();
        $this->success($tools, 'Screening tools retrieved successfully.');
    }

    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();
        $data = $request->only(['name', 'description']);

        $result = $this->screeningToolService->register($data, (int) $admin['id']);

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

        $result = $this->screeningToolService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Screening tool not found.' ? 404 : 422;
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
        $result = $this->screeningToolService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
