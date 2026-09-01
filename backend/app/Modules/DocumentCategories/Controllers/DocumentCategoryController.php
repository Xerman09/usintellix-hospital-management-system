<?php

namespace App\Modules\DocumentCategories\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\DocumentCategories\Services\DocumentCategoryService;

class DocumentCategoryController extends Controller
{
    private DocumentCategoryService $service;

    public function __construct()
    {
        $this->service = new DocumentCategoryService();
    }

    public function index(): void
    {
        $categories = $this->service->list();

        $this->success($categories, 'Document categories retrieved successfully.');
    }

    public function register(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $data = $request->only(['parent_id', 'name', 'value', 'access_control', 'codes', 'sequence']);

        $result = $this->service->register($data, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function update(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $id = (int) $request->input('id');
        $data = $request->only(['name', 'value', 'access_control', 'codes', 'sequence']);

        $result = $this->service->update($id, $data, (int) $user['id']);

        if (!$result['success']) {
            $status = !empty($result['errors']) ? 422 : 404;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function destroy(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $id = (int) $request->input('id');

        $result = $this->service->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
