<?php

namespace App\Modules\Er\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Er\Services\ErBoardService;
use App\Modules\Er\Services\ErProtocolService;
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
        $board = new ErBoardService();
        try {
            $board->runWaits();
        } catch (\Throwable $e) {
            error_log('ER wait check failed: ' . $e->getMessage());
        }
        $this->success($this->service->board() + ['options' => ErService::options(),
            'can_register' => in_array($role, ErService::REGISTER_ROLES, true), 'can_triage' => in_array($role, ErService::TRIAGE_ROLES, true),
            'can_assign' => in_array($role, ErBoardService::ASSIGN_ROLES, true), 'staff' => in_array($role, ErBoardService::ASSIGN_ROLES, true) ? $board->staffOptions() : [],
            'settings' => $role === 'admin' ? $board->settings() : null], 'Retrieved.');
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

    /** Body: id, er_bed_id?, doctor_user_id?, nurse_user_id?, me? (doctor | nurse) */
    public function assign(): void
    {
        $this->respond((new ErBoardService())->assign((new Request())->all(), Session::get('user') ?? []));
    }

    /** Admin. Body: targets {0..5: minutes} */
    public function targets(): void
    {
        $this->respond((new ErBoardService())->saveTargets((new Request())->all(), Session::get('user') ?? []));
    }

    /** Admin. Body: id?, name, area, sort_order?, is_active? | prefix, count, area */
    public function bed(): void
    {
        $this->respond((new ErBoardService())->saveBed((new Request())->all(), Session::get('user') ?? []));
    }

    /** Admin. Body: user_id, on (1 | 0) */
    public function team(): void
    {
        $r = new Request();
        $this->respond((new ErBoardService())->setTeam((int) $r->input('user_id'), (string) $r->input('on') !== '0', Session::get('user') ?? []));
    }

    /** Body: id (visit), protocol (chest_pain | stroke | sepsis) */
    public function protocolStart(): void
    {
        $r = new Request();
        $this->respond((new ErProtocolService())->start((int) $r->input('id'), (string) $r->input('protocol'), Session::get('user') ?? []));
    }

    /** Body: protocol_id, step, action (done | na | undo), value?, time? */
    public function protocolStep(): void
    {
        $this->respond((new ErProtocolService())->step((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: protocol_id, reason */
    public function protocolStop(): void
    {
        $this->respond((new ErProtocolService())->stop((new Request())->all(), Session::get('user') ?? []));
    }

    /** Admin. Body: targets {protocol: {step: minutes}} */
    public function protocolTargets(): void
    {
        $this->respond((new ErProtocolService())->saveTargets((new Request())->all(), Session::get('user') ?? []));
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
