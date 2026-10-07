<?php

namespace App\Modules\InpatientOrders\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\InpatientOrders\Services\CabinetService;

class CabinetController extends Controller
{
    private CabinetService $service;

    public function __construct()
    {
        $this->service = new CabinetService();
    }

    /** Query: ward_id? */
    public function view(): void
    {
        $request = new Request();
        $this->success($this->service->view(['ward_id' => $request->input('ward_id')], $this->user()), 'Retrieved.');
    }

    /** Body: order_id, slot_at?, quantity?, note? */
    public function withdraw(): void
    {
        $request = new Request();
        $this->respond($this->service->withdraw($request->all(), $this->user()), 201);
    }

    /** Body: id, reason? */
    public function giveBack(): void
    {
        $request = new Request();
        $this->respond($this->service->giveBack((int) $request->input('id'), (string) $request->input('reason', ''), $this->user()));
    }

    /** Body: id, reason, witness_username?, witness_password? */
    public function waste(): void
    {
        $request = new Request();
        $this->respond($this->service->waste((int) $request->input('id'), $request->all(), $this->user()));
    }

    /** Body: ward_id, levels: [{drug_id, min_level, max_level}] */
    public function levels(): void
    {
        $request = new Request();
        $levels = $request->input('levels');
        $this->respond($this->service->saveLevels((int) $request->input('ward_id'), is_array($levels) ? $levels : [], $this->user()));
    }

    private function user(): array
    {
        return Session::get('user') ?? [];
    }

    private function respond(array $result, int $status = 200): void
    {
        if (!$result['success']) {
            $code = !empty($result['not_found']) ? 404 : (!empty($result['forbidden']) ? 403 : (!empty($result['conflict']) ? 409 : 422));
            $this->json([
                'success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null,
                'needs_witness' => !empty($result['needs_witness']),
            ], $code);
            return;
        }
        $this->success($result['data'] ?? null, $result['message'], $status);
    }
}
