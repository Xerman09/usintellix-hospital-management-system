<?php

namespace App\Modules\Lab\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
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
