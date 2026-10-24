<?php

namespace App\Modules\Radiology\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Modules\Radiology\Services\RisRadiologyReportService;
use Throwable;

class RisRadiologyReportController
{
    private RisRadiologyReportService $service;

    public function __construct()
    {
        $this->service = new RisRadiologyReportService();
    }

    public function form(Request $request): Response
    {
        try {
            $orderId = (int) $request->query('order_id');
            if ($orderId <= 0) {
                return Response::json(['success' => false, 'message' => 'Valid order ID is required.'], 400);
            }

            $res = $this->service->getReportForm($orderId);
            return Response::json($res, ($res['success'] ?? false) ? 200 : 404);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function save(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();

            $res = $this->service->saveReport($data, $actor);
            return Response::json($res, ($res['success'] ?? false) ? 200 : 422);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function readBack(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();
            $reportId = (int) ($data['report_id'] ?? 0);
            $name = trim((string) ($data['read_back_by_name'] ?? ''));

            if ($reportId <= 0 || empty($name)) {
                return Response::json(['success' => false, 'message' => 'Report ID and recipient clinician name are required.'], 400);
            }

            $res = $this->service->confirmReadBack($reportId, $name, $actor);
            return Response::json($res, ($res['success'] ?? false) ? 200 : 422);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
