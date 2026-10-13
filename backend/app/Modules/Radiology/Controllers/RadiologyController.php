<?php

namespace App\Modules\Radiology\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Radiology\Services\RadiologyService;

class RadiologyController extends Controller
{
    private RadiologyService $service;

    public function __construct()
    {
        $this->service = new RadiologyService();
    }

    /** Query: view (schedule | booked), date, room_id, modality, q */
    public function worklist(): void
    {
        $this->success($this->service->worklist((new Request())->all(), Session::get('user') ?? []), 'Retrieved.');
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

    /** Body: patient_id | er_visit_id | admission_id, studies, priority, indication, needed_by, the safety answers, order_mode, confirm */
    public function order(): void
    {
        $this->respond($this->service->order((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: order_id, reason */
    public function cancelStudy(): void
    {
        $this->respond($this->service->cancelStudy((new Request())->all(), Session::get('user') ?? []));
    }

    /** Query: room_id, date, minutes -- the free times on a machine. */
    public function slots(): void
    {
        $r = new Request();
        $this->respond($this->service->slots((int) $r->input('room_id'), (string) ($r->input('date') ?? ''), (int) $r->input('minutes'), Session::get('user') ?? []));
    }

    /** Body: order_ids, room_id, start_at, minutes, prep_given, note, confirm */
    public function schedule(): void
    {
        $this->respond($this->service->schedule((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: id, room_id, start_at, minutes, reason, confirm */
    public function reschedule(): void
    {
        $this->respond($this->service->reschedule((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: id, reason, no_show */
    public function cancelBooking(): void
    {
        $this->respond($this->service->cancelBooking((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: id */
    public function arrived(): void
    {
        $this->respond($this->service->arrived((new Request())->all(), Session::get('user') ?? []));
    }

    /** Body: id, prep_given */
    public function markPrep(): void
    {
        $this->respond($this->service->markPrep((new Request())->all(), Session::get('user') ?? []));
    }

    /** Query: request_id -- the printable preparation sheet. */
    public function prepSheet(): void
    {
        $this->respond($this->service->prepSheet((int) (new Request())->input('request_id'), Session::get('user') ?? []));
    }

    private function respond(array $r): void
    {
        if (!$r['success']) {
            $code = !empty($r['not_found']) ? 404 : (!empty($r['forbidden']) ? 403 : 422);
            $this->json(['success' => false, 'message' => $r['message'], 'errors' => $r['errors'] ?? null, 'needs_confirm' => $r['needs_confirm'] ?? null,
                'warnings' => $r['warnings'] ?? null, 'duplicates' => $r['duplicates'] ?? null], $code);
            return;
        }
        $this->success($r['data'] ?? null, $r['message']);
    }
}
