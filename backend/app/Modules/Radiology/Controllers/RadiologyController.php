<?php

namespace App\Modules\Radiology\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Radiology\Services\RadChargeService;
use App\Modules\Radiology\Services\RadiologyService;
use App\Modules\Radiology\Services\RadReportService;
use App\Modules\Radiology\Services\RadStatsService;

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

    // ---- Phase 2: performing the study, the images and the radiologist's report

    /** Body: id (booking), performed_at, technique, contrast_given, contrast_detail, dose */
    public function perform(): void
    {
        $this->respond((new RadReportService())->perform((new Request())->all(), Session::get('user') ?? []));
    }

    /** Multipart body: order_id, series_desc, is_key, notes + file */
    public function uploadImage(): void
    {
        $r = new Request();
        $this->respond((new RadReportService())->uploadImage($r->only(['order_id', 'series_desc', 'is_key', 'notes']),
            $r->files()['file'] ?? [], Session::get('user') ?? []));
    }

    /** Query: order_id -- the study's images (what the DICOM viewer is handed). */
    public function images(): void
    {
        $this->respond((new RadReportService())->images((int) (new Request())->input('order_id'), Session::get('user') ?? []));
    }

    /** Body: id, reason */
    public function deleteImage(): void
    {
        $this->respond((new RadReportService())->deleteImage((new Request())->all(), Session::get('user') ?? []));
    }

    /** Query: view (read | reported), modality, q */
    public function reports(): void
    {
        $r = new Request();
        $this->success((new RadReportService())->queue((string) ($r->input('view') ?? 'read'), $r->all(), Session::get('user') ?? []), 'Retrieved.');
    }

    /** Query: order_id, amend (1) */
    public function reportForm(): void
    {
        $r = new Request();
        $this->respond((new RadReportService())->form((int) $r->input('order_id'), (bool) $r->input('amend'), Session::get('user') ?? []));
    }

    /** Body: order_id, technique, comparison, findings, impression, recommendation, conclusion, critical_note, change_reason, is_addendum, sign */
    public function reportSave(): void
    {
        $this->respond((new RadReportService())->save((new Request())->all(), Session::get('user') ?? []));
    }

    /** Query: order_id -- the signed report (with its earlier versions). */
    public function report(): void
    {
        $this->respond((new RadReportService())->report((int) (new Request())->input('order_id'), Session::get('user') ?? []));
    }

    public function radiologists(): void
    {
        $this->success((new RadReportService())->staff(), 'Retrieved.');
    }

    /** Body: user_id, radiologist, license_no */
    public function radiologistsSave(): void
    {
        $this->respond((new RadReportService())->saveStaff((new Request())->all(), Session::get('user') ?? []));
    }

    // ---- Phase 3: imaging charges, and the turnaround / volume report

    /** Query: from, to, modality, room_id */
    public function stats(): void
    {
        $r = new Request();
        $this->success((new RadStatsService())->report((string) ($r->input('from') ?? '') ?: null, (string) ($r->input('to') ?? '') ?: null,
            (string) ($r->input('modality') ?? '') ?: null, (int) $r->input('room_id') ?: null), 'Retrieved.');
    }

    /** Query: q, only (unbilled) -- the studies reported in the last 7 days and their charges. */
    public function charges(): void
    {
        $r = new Request();
        $this->success((new RadChargeService())->queue($r->all(), Session::get('user') ?? []) + [
            'modalities' => RadiologyService::MODALITIES, 'priorities' => RadiologyService::PRIORITIES], 'Retrieved.');
    }

    /** Body: order_ids */
    public function chargePost(): void
    {
        $this->respond((new RadChargeService())->postMissing((array) ((new Request())->input('order_ids') ?? []), Session::get('user') ?? []));
    }

    /** Body: id, reason */
    public function chargeVoid(): void
    {
        $r = new Request();
        $this->respond((new RadChargeService())->voidCharge((int) $r->input('id'), (string) ($r->input('reason') ?? ''), Session::get('user') ?? []));
    }

    /** Body: id, discount_type, discount_id_no, discount_rate, discount_reason */
    public function chargeDiscount(): void
    {
        $r = new Request();
        $this->respond((new RadChargeService())->setDiscount((int) $r->input('id'), $r->all(), Session::get('user') ?? []));
    }

    public function prices(): void
    {
        $this->success(['studies' => (new RadChargeService())->prices(), 'modalities' => RadiologyService::MODALITIES], 'Retrieved.');
    }

    /** Body: prices [{id, price}] */
    public function pricesSave(): void
    {
        $this->respond((new RadChargeService())->savePrices((new Request())->all(), Session::get('user') ?? []));
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
