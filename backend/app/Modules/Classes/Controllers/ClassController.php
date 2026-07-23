<?php

namespace App\Modules\Classes\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Classes\Services\ClassService;

class ClassController extends Controller
{
    private ClassService $classService;

    public function __construct()
    {
        $this->classService = new ClassService();
    }

    /**
     * List classes.
     */
    public function index(): void
    {
        $classes = $this->classService->list();

        $this->success($classes, 'Classes retrieved successfully.');
    }

    /**
     * Register a new class (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description']);

        $result = $this->classService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing class (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'description']);

        $result = $this->classService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Class not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a class (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->classService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
