<?php

namespace App\Modules\DrugLookups\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\DrugLookups\Services\DrugLookupService;

/**
 * Base CRUD controller for a drug lookup table; subclasses only name the
 * table (the router calls handlers as [Class, method] with no route
 * parameters, so each table gets its own tiny subclass).
 */
abstract class DrugLookupController extends Controller
{
    protected string $table;

    private DrugLookupService $service;

    public function __construct()
    {
        $this->service = new DrugLookupService($this->table);
    }

    public function index(): void
    {
        $this->success($this->service->list(), 'Retrieved successfully.');
    }

    public function register(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->service->register($request->only(['name', 'description']), (int) $user['id']);

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

        $result = $this->service->update(
            (int) $request->input('id'),
            $request->only(['name', 'description']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $status = str_ends_with($result['message'], 'not found.') ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function destroy(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->service->remove((int) $request->input('id'), (int) $user['id']);

        if (!$result['success']) {
            $status = str_ends_with($result['message'], 'not found.') ? 404 : 422;
            $this->error($result['message'], $status);
            return;
        }

        $this->success(null, $result['message']);
    }
}
