<?php

namespace App\Modules\Radiology\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Modules\Radiology\Services\RisImagingOrderService;
use Throwable;

class RisImagingOrderController
{
    private RisImagingOrderService $service;

    public function __construct()
    {
        $this->service = new RisImagingOrderService();
    }

    public function index(Request $request): Response
    {
        try {
            $filters = [
                'modality' => $request->query('modality'),
                'safety_status' => $request->query('safety_status'),
                'study_status' => $request->query('study_status'),
                'room_id' => $request->query('room_id'),
                'patient_id' => $request->query('patient_id'),
                'q' => $request->query('q')
            ];

            $orders = $this->service->listOrders($filters);
            return Response::json([
                'success' => true,
                'data' => $orders
            ]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function detail(Request $request): Response
    {
        try {
            $id = (int) $request->query('id');
            if ($id <= 0) {
                return Response::json(['success' => false, 'message' => 'Valid ID is required.'], 400);
            }

            $order = $this->service->getOrderDetail($id);
            if (!$order) {
                return Response::json(['success' => false, 'message' => 'RIS order not found.'], 404);
            }

            return Response::json([
                'success' => true,
                'data' => $order
            ]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function create(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();
            $orderId = (int) ($data['order_id'] ?? 0);
            if ($orderId <= 0) {
                return Response::json(['success' => false, 'message' => 'Procedure order ID is required.'], 400);
            }

            $res = $this->service->createRisOrder($orderId, $data, $actor);
            return Response::json($res, ($res['success'] ?? false) ? 200 : 422);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function updateSafety(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();
            $risId = (int) ($data['id'] ?? 0);
            if ($risId <= 0) {
                return Response::json(['success' => false, 'message' => 'RIS order ID is required.'], 400);
            }

            $res = $this->service->updateSafetyClearance($risId, $data, $actor);
            return Response::json($res, ($res['success'] ?? false) ? 200 : 422);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function scheduleRoom(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();
            $risId = (int) ($data['id'] ?? 0);
            if ($risId <= 0) {
                return Response::json(['success' => false, 'message' => 'RIS order ID is required.'], 400);
            }

            $res = $this->service->scheduleRoom($risId, $data, $actor);
            return Response::json($res, ($res['success'] ?? false) ? 200 : 422);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function stats(Request $request): Response
    {
        try {
            $stats = $this->service->getStats();
            return Response::json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
