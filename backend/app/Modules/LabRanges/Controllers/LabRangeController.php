<?php

namespace App\Modules\LabRanges\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\LabRanges\Services\LabRangeService;

class LabRangeController extends Controller
{
    private LabRangeService $service;

    public function __construct()
    {
        $this->service = new LabRangeService();
    }

    public function index(): void
    {
        $this->success($this->service->list(), 'Retrieved.');
    }

    /** Body: id? (update), name, code?, aliases?, units?, normal_low?, normal_high?, critical_low?, critical_high?, critical_values?, normal_values?, notes?, is_active? */
    public function save(): void
    {
        $request = new Request();
        $this->respond($this->service->save($request->all(), Session::get('user') ?? []));
    }

    /** Body: id */
    public function destroy(): void
    {
        $request = new Request();
        $this->respond($this->service->delete((int) $request->input('id'), Session::get('user') ?? []));
    }

    /** Body: code?, name, value, units?, reference_range? -- how would it be flagged */
    public function test(): void
    {
        $request = new Request();
        $this->success($this->service->test($request->all()), 'Checked.');
    }

    private function respond(array $result): void
    {
        if (!$result['success']) {
            $code = !empty($result['not_found']) ? 404 : (!empty($result['forbidden']) ? 403 : 422);
            $this->json(['success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null], $code);
            return;
        }
        $this->success($result['data'] ?? null, $result['message']);
    }
}
