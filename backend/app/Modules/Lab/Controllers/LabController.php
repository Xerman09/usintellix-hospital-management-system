<?php

namespace App\Modules\Lab\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Lab\Services\LabChargeService;
use App\Modules\Lab\Services\LabReportService;
use App\Modules\Lab\Services\LabResultService;
use App\Modules\Lab\Services\LabService;

class LabController extends Controller
{
    private LabService $service;

    public function __construct()
    {
        $this->service = new LabService();
    }

    /** Query: view (collect | collected), source, q */
    public function worklist(): void
    {
        $role = Session::get('user')['role'] ?? '';
        $this->success($this->service->worklist((new Request())->all()) + [
            'can_collect' => in_array($role, LabService::COLLECT_ROLES, true), 'can_cancel' => in_array($role, LabService::ORDER_ROLES, true),
        ], 'Retrieved.');
    }

    /** Query: er_visit_id | admission_id | patient_id -- for the order dialog. */
    public function orderContext(): void
    {
        $c = $this->service->orderContext((new Request())->all(), Session::get('user') ?? []);
        if (!$c) {
            $this->json(['success' => false, 'message' => 'Patient not found (or no longer in the ER / ward).'], 404);
            return;
        }
        $this->success($c, 'Retrieved.');
    }

    /** Body: er_visit_id | admission_id | patient_id, tests, priority, clinical_info, fasting, collect_at, order_mode, ordering_user_id, confirm */
    public function order(): void
    {
        $this->respond($this->service->order((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: order_id, reason */
    public function cancelTest(): void
    {
        $this->respond($this->service->cancelTest((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: request_id, order_ids, collected_at, method, site, id_checked, notes, collector_id */
    public function collect(): void
    {
        $this->respond($this->service->collect((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: id, reason */
    public function voidSpecimen(): void
    {
        $r = new Request();
        $this->respond($this->service->voidSpecimen((int) $r->input('id'), (string) ($r->input('reason') ?? ''), Session::get('user') ?? []));
    }

    /** Body: ids */
    public function labels(): void
    {
        $this->respond($this->service->labels((array) ((new Request())->input('ids') ?? []), Session::get('user') ?? []));
    }

    // ---- Phase 2: results

    /** Query: view (enter | verify | released), section, q */
    public function results(): void
    {
        $r = new Request();
        $this->success((new LabResultService())->queue((string) ($r->input('view') ?? 'enter'), $r->all(), Session::get('user') ?? []) + [
            'sections' => LabService::SECTIONS, 'containers' => LabService::CONTAINERS, 'priorities' => LabService::PRIORITIES,
            'is_admin' => (Session::get('user')['role'] ?? '') === 'admin'], 'Retrieved.');
    }

    /** Query: order_ids (comma separated), correct (1) */
    public function resultForm(): void
    {
        $r = new Request();
        $this->respond((new LabResultService())->form(explode(',', (string) $r->input('order_ids')), (bool) $r->input('correct'), Session::get('user') ?? []));
    }

    /** Body: tests [{order_id, values, comment, correction_reason}], submit */
    public function resultSave(): void
    {
        $this->respond((new LabResultService())->save((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: id (result set) */
    public function resultVerify(): void
    {
        $this->respond((new LabResultService())->verify((int) (new Request())->input('id'), Session::get('user') ?? []));
    }

    /** Body: id, reason */
    public function resultReturn(): void
    {
        $r = new Request();
        $this->respond((new LabResultService())->returnSet((int) $r->input('id'), (string) ($r->input('reason') ?? ''), Session::get('user') ?? []));
    }

    public function staff(): void
    {
        $this->success((new LabResultService())->staff(), 'Retrieved.');
    }

    /** Body: user_id, med_tech, license_no */
    public function staffSave(): void
    {
        $this->respond((new LabResultService())->saveStaff((new Request())->all(), Session::get('user') ?? []));
    }

    // ---- Phase 3: turnaround & reports, charges

    /** Query: from, to, section */
    public function report(): void
    {
        $r = new Request();
        $this->success((new LabReportService())->report((string) ($r->input('from') ?? '') ?: null, (string) ($r->input('to') ?? '') ?: null,
            (string) ($r->input('section') ?? '') ?: null), 'Retrieved.');
    }

    /** Query: q, only (unbilled) -- the lab tests released in the last 7 days and their charges. */
    public function charges(): void
    {
        $r = new Request();
        $this->success((new LabChargeService())->queue($r->all(), Session::get('user') ?? []) + [
            'sections' => LabService::SECTIONS, 'priorities' => LabService::PRIORITIES], 'Retrieved.');
    }

    /** Body: order_ids */
    public function chargePost(): void
    {
        $this->respond((new LabChargeService())->postMissing((array) ((new Request())->input('order_ids') ?? []), Session::get('user') ?? []));
    }

    /** Body: id, reason */
    public function chargeVoid(): void
    {
        $r = new Request();
        $this->respond((new LabChargeService())->voidCharge((int) $r->input('id'), (string) ($r->input('reason') ?? ''), Session::get('user') ?? []));
    }

    /** Body: id, discount_type, discount_id_no, discount_rate, discount_reason */
    public function chargeDiscount(): void
    {
        $r = new Request();
        $this->respond((new LabChargeService())->setDiscount((int) $r->input('id'), $r->all(), Session::get('user') ?? []));
    }

    public function prices(): void
    {
        $this->success(['tests' => (new LabChargeService())->prices(), 'sections' => LabService::SECTIONS], 'Retrieved.');
    }

    /** Body: prices [{id, price}] */
    public function pricesSave(): void
    {
        $this->respond((new LabChargeService())->savePrices((new Request())->all(), Session::get('user') ?? []));
    }

    private function respond(array $r): void
    {
        if (!$r['success']) {
            $code = !empty($r['not_found']) ? 404 : (!empty($r['forbidden']) ? 403 : 422);
            $this->json(['success' => false, 'message' => $r['message'], 'errors' => $r['errors'] ?? null, 'needs_confirm' => $r['needs_confirm'] ?? null,
                'duplicates' => $r['duplicates'] ?? null], $code);
            return;
        }
        $this->success($r['data'] ?? null, $r['message']);
    }
}
