<?php

namespace App\Modules\Specializations\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Specializations\Services\SpecializationService;

class SpecializationController extends Controller
{
    private SpecializationService $service;

    public function __construct()
    {
        $this->service = new SpecializationService();
    }

    /** Query: include_inactive?, category? */
    public function index(): void
    {
        $request = new Request();
        $this->success([
            'rows' => $this->service->list([
                'include_inactive' => in_array((string) $request->input('include_inactive'), ['1', 'true'], true),
                'category' => $request->input('category')
            ]),
            'categories' => $this->service->categories()
        ], 'Specializations retrieved successfully.');
    }

    /** Body: name, category, description? */
    public function store(): void
    {
        $request = new Request();
        $this->respond($this->service->save(null, $request->only(['name', 'category', 'description']), (int) Session::get('user')['id']), 201);
    }

    /** Body: id, name, category, description? */
    public function update(): void
    {
        $request = new Request();
        $this->respond($this->service->save((int) $request->input('id'), $request->only(['name', 'category', 'description']), (int) Session::get('user')['id']));
    }

    /** Body: id, is_active */
    public function setActive(): void
    {
        $request = new Request();
        $active = in_array((string) $request->input('is_active'), ['1', 'true'], true);
        $this->respond($this->service->setActive((int) $request->input('id'), $active, (int) Session::get('user')['id']));
    }

    private function respond(array $result, int $successStatus = 200): void
    {
        if (!$result['success']) {
            $this->error($result['message'], !empty($result['not_found']) ? 404 : 422, $result['errors'] ?? null);
            return;
        }
        $this->success($result['data'] ?? null, $result['message'], $successStatus);
    }
}
