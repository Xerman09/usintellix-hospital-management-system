<?php

namespace App\Modules\Er\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Er\Services\ErService;

class ErController extends Controller
{
    private ErService $service;

    public function __construct()
    {
        $this->service = new ErService();
    }

    /** The ER board: who is waiting for triage, who is triaged (by acuity), closed in the last 12 hours. */
    public function index(): void
    {
        $role = Session::get('user')['role'] ?? '';
        $this->success($this->service->board() + ['options' => ErService::options(),
            'can_register' => in_array($role, ErService::REGISTER_ROLES, true), 'can_triage' => in_array($role, ErService::TRIAGE_ROLES, true)], 'Retrieved.');
    }

    /** Query: q */
    public function patients(): void
    {
        $this->success($this->service->searchPatients((string) ((new Request())->input('q') ?? '')), 'Retrieved.');
    }

    /** Query: id */
    public function show(): void
    {
        $v = $this->service->show((int) (new Request())->input('id'));
        if (!$v) {
            $this->json(['success' => false, 'message' => 'ER visit not found.'], 404);
            return;
        }
        $this->success($v, 'Retrieved.');
    }

    public function register(): void
    {
        $this->respond($this->service->register((new Request())->all(), Session::get('user') ?? []));
    }

    public function triage(): void
    {
        $this->respond($this->service->triage((new Request())->all(), Session::get('user') ?? []));
    }

    public function identify(): void
    {
        $this->respond($this->service->identify((new Request())->all(), Session::get('user') ?? []));
    }

    public function close(): void
    {
        $this->respond($this->service->close((new Request())->all(), Session::get('user') ?? []));
    }

    private function respond(array $r): void
    {
        if (!$r['success']) {
            $code = !empty($r['not_found']) ? 404 : (!empty($r['forbidden']) ? 403 : 422);
            $this->json(['success' => false, 'message' => $r['message'], 'errors' => $r['errors'] ?? null,
                'possible_duplicates' => $r['possible_duplicates'] ?? null, 'danger' => $r['danger'] ?? null], $code);
            return;
        }
        $this->success($r['data'] ?? null, $r['message']);
    }
}
