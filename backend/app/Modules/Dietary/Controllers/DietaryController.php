<?php

namespace App\Modules\Dietary\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Modules\Dietary\Services\DietaryService;
use Throwable;

class DietaryController
{
    private DietaryService $service;

    public function __construct()
    {
        $this->service = new DietaryService();
    }

    public function index(Request $request): Response
    {
        try {
            $filters = [
                'patient_id' => $request->query('patient_id'),
                'diet_category' => $request->query('diet_category'),
                'status' => $request->query('status'),
                'search' => $request->query('q') ?? $request->query('search')
            ];
            $page = max(1, (int)($request->query('page') ?? 1));
            $perPage = min(100, max(1, (int)($request->query('per_page') ?? 20)));

            $data = $this->service->listPrescriptions($filters, $page, $perPage);
            return Response::json(['success' => true, 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function detail(Request $request): Response
    {
        try {
            $id = (int)($request->query('id') ?? 0);
            if ($id <= 0) {
                return Response::json(['success' => false, 'message' => 'Prescription ID is required.'], 400);
            }

            $detail = $this->service->getPrescriptionDetail($id);
            if (!$detail) {
                return Response::json(['success' => false, 'message' => 'Diet prescription not found.'], 404);
            }

            return Response::json(['success' => true, 'data' => $detail]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function stats(Request $request): Response
    {
        try {
            $stats = DietaryService::getStats();
            return Response::json(['success' => true, 'data' => $stats]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function patientAllergies(Request $request): Response
    {
        try {
            $patientId = (int)($request->query('patient_id') ?? 0);
            if ($patientId <= 0) {
                return Response::json(['success' => false, 'message' => 'Patient ID is required.'], 400);
            }

            $info = $this->service->getPatientFoodAllergies($patientId);
            return Response::json(['success' => true, 'data' => $info]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function prescribe(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();

            $record = $this->service->prescribeDiet($data, $actor['id'] ?? null);
            return Response::json([
                'success' => true,
                'message' => 'Clinical diet prescribed successfully and upcoming meal trays generated.',
                'data' => $record
            ], 201);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function discontinue(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();
            $id = (int)($data['prescription_id'] ?? $data['id'] ?? 0);
            $reason = trim($data['reason'] ?? 'Diet order completed or discontinued by clinician.');

            if ($id <= 0) {
                return Response::json(['success' => false, 'message' => 'Prescription ID is required.'], 400);
            }

            $record = $this->service->discontinueDiet($id, $reason, $actor['id'] ?? null);
            return Response::json([
                'success' => true,
                'message' => 'Diet prescription discontinued.',
                'data' => $record
            ]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function trays(Request $request): Response
    {
        try {
            $filters = [
                'meal_date' => $request->query('meal_date') ?: date('Y-m-d'),
                'meal_type' => $request->query('meal_type'),
                'status' => $request->query('status'),
                'has_food_allergies' => $request->query('has_food_allergies'),
                'diet_category' => $request->query('diet_category'),
                'search' => $request->query('q') ?? $request->query('search')
            ];
            $page = max(1, (int)($request->query('page') ?? 1));
            $perPage = min(100, max(1, (int)($request->query('per_page') ?? 50)));

            $data = $this->service->listKitchenMealTrays($filters, $page, $perPage);
            return Response::json(['success' => true, 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function trayDetail(Request $request): Response
    {
        try {
            $id = (int)($request->query('id') ?? 0);
            if ($id <= 0) {
                return Response::json(['success' => false, 'message' => 'Tray ID is required.'], 400);
            }

            $detail = $this->service->getTrayDetail($id);
            if (!$detail) {
                return Response::json(['success' => false, 'message' => 'Meal tray record not found.'], 404);
            }

            return Response::json(['success' => true, 'data' => $detail]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function updateTray(Request $request): Response
    {
        try {
            $data = $request->json();
            $id = (int)($data['tray_id'] ?? $data['id'] ?? 0);
            $status = trim($data['status'] ?? '');

            if ($id <= 0 || empty($status)) {
                return Response::json(['success' => false, 'message' => 'Tray ID and Status are required.'], 400);
            }

            $detail = $this->service->updateTrayStatus($id, $status, $data);
            return Response::json([
                'success' => true,
                'message' => 'Meal tray updated.',
                'data' => $detail
            ]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
