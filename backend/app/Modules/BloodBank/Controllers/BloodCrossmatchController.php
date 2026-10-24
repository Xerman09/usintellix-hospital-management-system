<?php

namespace App\Modules\BloodBank\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Modules\BloodBank\Services\BloodCrossmatchService;
use Throwable;

class BloodCrossmatchController
{
    private BloodCrossmatchService $service;

    public function __construct()
    {
        $this->service = new BloodCrossmatchService();
    }

    public function index(Request $request): Response
    {
        try {
            $filters = [
                'reservation_status' => $request->query('reservation_status'),
                'patient_id' => $request->query('patient_id'),
                'q' => $request->query('q')
            ];

            $list = $this->service->listCrossmatches($filters);
            return Response::json(['success' => true, 'data' => $list]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function perform(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();

            $res = $this->service->performCrossmatchAndReserve($data, $actor);
            return Response::json($res, ($res['success'] ?? false) ? 200 : 422);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function release(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();
            $id = (int) ($data['id'] ?? 0);
            $reason = $data['reason'] ?? null;

            if ($id <= 0) {
                return Response::json(['success' => false, 'message' => 'Crossmatch ID is required.'], 400);
            }

            $res = $this->service->releaseReservation($id, $reason, $actor);
            return Response::json($res, ($res['success'] ?? false) ? 200 : 422);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function stats(Request $request): Response
    {
        try {
            $stats = $this->service->getStats();
            return Response::json(['success' => true, 'data' => $stats]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
