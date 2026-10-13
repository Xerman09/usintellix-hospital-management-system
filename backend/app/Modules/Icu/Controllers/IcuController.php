<?php

namespace App\Modules\Icu\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Icu\Services\IcuBoardService;
use App\Modules\Icu\Services\IcuLinesService;
use App\Modules\Icu\Services\IcuReportService;
use App\Modules\Icu\Services\IcuScoreService;
use App\Modules\Icu\Services\IcuService;

class IcuController extends Controller
{
    private IcuService $service;

    public function __construct()
    {
        $this->service = new IcuService();
    }

    /** Query: ward_id? -- every ICU bed: patient, severity, drips, breathing, alerts (Phase 2). */
    public function board(): void
    {
        $role = Session::get('user')['role'] ?? '';
        $this->success((new IcuBoardService())->board((int) (new Request())->input('ward_id') ?: null) + ['options' => IcuService::options(),
            'can_record' => in_array($role, IcuService::RECORD_ROLES, true), 'can_io' => in_array($role, IcuService::IO_ROLES, true),
            'can_transfer' => in_array($role, IcuBoardService::TRANSFER_ROLES, true), 'can_report' => in_array($role, IcuReportService::ROLES, true)], 'Retrieved.');
    }

    /** Who could come into the ICU (ER, recovery, other wards) and the free ICU beds. */
    public function incoming(): void
    {
        $this->success((new IcuBoardService())->incoming(), 'Retrieved.');
    }

    /** Body: source (er | or | ward), id, bed_id, reason, ... */
    public function transferIn(): void
    {
        $this->respond((new IcuBoardService())->transferIn((new Request())->all(), Session::get('user') ?? []));
    }

    /** Query: admission_id -- free ward beds, drips still running, the last breathing support. */
    public function outOptions(): void
    {
        $o = (new IcuBoardService())->outOptions((int) (new Request())->input('admission_id'));
        if (!$o) {
            $this->json(['success' => false, 'message' => 'This patient is not in the ICU.'], 404);
            return;
        }
        $this->success($o, 'Retrieved.');
    }

    /** Body: admission_id, bed_id, reason, note, confirm? */
    public function transferOut(): void
    {
        $this->respond((new IcuBoardService())->transferOut((new Request())->all(), Session::get('user') ?? []));
    }

    /** Query: admission_id, day? (YYYY-MM-DD) */
    public function flowsheet(): void
    {
        $r = new Request();
        $role = Session::get('user')['role'] ?? '';
        $f = $this->service->flowsheet((int) $r->input('admission_id'), $r->input('day') ? (string) $r->input('day') : null);
        if (!$f) {
            $this->json(['success' => false, 'message' => 'Admission not found.'], 404);
            return;
        }
        $this->success($f + ['options' => IcuService::options(), 'iv_orders' => $this->service->ivOrders((int) $r->input('admission_id')),
            'stays' => (new IcuBoardService())->stays((int) $r->input('admission_id')),
            'lines' => (new IcuLinesService())->forAdmission((int) $r->input('admission_id')),
            'line_options' => ['kinds' => IcuLinesService::KINDS, 'where' => IcuLinesService::WHERE, 'remove_reasons' => IcuLinesService::REMOVE_REASONS],
            'scores' => (new IcuScoreService())->forAdmission((int) $r->input('admission_id'), $role),
            'can_record' => in_array($role, IcuService::RECORD_ROLES, true), 'can_io' => in_array($role, IcuService::IO_ROLES, true)], 'Retrieved.');
    }

    public function hour(): void
    {
        $this->respond($this->service->recordHour((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: id, reason */
    public function voidHour(): void
    {
        $r = new Request();
        $this->respond($this->service->voidHour((int) $r->input('id'), (string) ($r->input('reason') ?? ''), Session::get('user') ?? []));
    }

    public function io(): void
    {
        $this->respond($this->service->addIo((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: id, reason */
    public function voidIo(): void
    {
        $r = new Request();
        $this->respond($this->service->voidIo((int) $r->input('id'), (string) ($r->input('reason') ?? ''), Session::get('user') ?? []));
    }

    public function dripStart(): void
    {
        $this->respond($this->service->startDrip((new Request())->all(), Session::get('user') ?? []));
    }

    public function dripRate(): void
    {
        $this->respond($this->service->changeRate((new Request())->all(), Session::get('user') ?? []));
    }

    public function dripStop(): void
    {
        $this->respond($this->service->stopDrip((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: admission_id, kind, site, side, size, inserted_at, inserted_where, inserted_by_name, bundle, notes */
    public function lineInsert(): void
    {
        $this->respond((new IcuLinesService())->insert((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: id, removed_at, reason, note */
    public function lineRemove(): void
    {
        $this->respond((new IcuLinesService())->remove((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: id, reason */
    public function lineVoid(): void
    {
        $r = new Request();
        $this->respond((new IcuLinesService())->void((int) $r->input('id'), (string) ($r->input('reason') ?? ''), Session::get('user') ?? []));
    }

    /** Body: stay_id, chronic, admit_type, arf */
    public function apacheAnswers(): void
    {
        $this->respond((new IcuScoreService())->saveAnswers((new Request())->all(), Session::get('user') ?? []));
    }

    /** Query: from, to (YYYY-MM-DD), ward_id? */
    public function report(): void
    {
        $r = new Request();
        $this->success((new IcuReportService())->report($r->input('from') ? (string) $r->input('from') : null, $r->input('to') ? (string) $r->input('to') : null,
            (int) $r->input('ward_id') ?: null), 'Retrieved.');
    }

    /** Query: patient_id, type (CLABSI | CAUTI | VAP), onset_date -- for the HAI/SSI form. */
    public function deviceDays(): void
    {
        $r = new Request();
        $this->success((new IcuLinesService())->deviceDaysForCase((int) $r->input('patient_id'), (string) $r->input('type'), (string) $r->input('onset_date')), 'Retrieved.');
    }

    private function respond(array $r): void
    {
        if (!$r['success']) {
            $code = !empty($r['not_found']) ? 404 : (!empty($r['forbidden']) ? 403 : 422);
            $this->json(['success' => false, 'message' => $r['message'], 'errors' => $r['errors'] ?? null, 'needs_reason' => $r['needs_reason'] ?? null,
                'needs_confirm' => $r['needs_confirm'] ?? null, 'unmet' => $r['unmet'] ?? null, 'running_drips' => $r['running_drips'] ?? null], $code);
            return;
        }
        $this->success($r['data'] ?? null, $r['message']);
    }
}
