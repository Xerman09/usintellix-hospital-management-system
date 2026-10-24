<?php

namespace App\Modules\BloodBank\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Modules\BloodBank\Services\BloodTransfusionService;
use Throwable;

class BloodTransfusionController
{
    private BloodTransfusionService $service;

    public function __construct()
    {
        $this->service = new BloodTransfusionService();
    }

    public function index(Request $request): Response
    {
        try {
            $filters = [
                'patient_id' => $request->query('patient_id'),
                'status' => $request->query('status'),
                'has_reaction' => $request->query('has_reaction'),
                'search' => $request->query('q') ?? $request->query('search')
            ];
            $page = max(1, (int)($request->query('page') ?? 1));
            $perPage = min(100, max(1, (int)($request->query('per_page') ?? 20)));

            $data = $this->service->listTransfusions($filters, $page, $perPage);
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
                return Response::json(['success' => false, 'message' => 'Transfusion ID is required.'], 400);
            }

            $detail = $this->service->getTransfusionDetail($id);
            if (!$detail) {
                return Response::json(['success' => false, 'message' => 'Transfusion record not found.'], 404);
            }

            return Response::json(['success' => true, 'data' => $detail]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function stats(Request $request): Response
    {
        try {
            $stats = BloodTransfusionService::getStats();
            return Response::json(['success' => true, 'data' => $stats]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function verify(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();

            $record = $this->service->recordBedsideVerification($data, $actor['id'] ?? null);
            return Response::json([
                'success' => true,
                'message' => 'Dual-nurse bedside verification passed. Blood unit is verified and ready for transfusion.',
                'data' => $record
            ], 201);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function start(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();
            $id = (int)($data['transfusion_id'] ?? $data['id'] ?? 0);

            if ($id <= 0) {
                return Response::json(['success' => false, 'message' => 'Transfusion ID is required.'], 400);
            }

            $record = $this->service->startInfusion($id, $data, $actor['id'] ?? null);
            return Response::json([
                'success' => true,
                'message' => 'Transfusion infusion started and baseline vitals recorded.',
                'data' => $record
            ]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function recordVitals(Request $request): Response
    {
        try {
            $data = $request->json();
            $id = (int)($data['transfusion_id'] ?? 0);

            if ($id <= 0) {
                return Response::json(['success' => false, 'message' => 'Transfusion ID is required.'], 400);
            }

            $res = $this->service->recordVitals($id, $data);
            return Response::json([
                'success' => true,
                'message' => 'Transfusion vital signs recorded successfully.',
                'data' => $res
            ]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function complete(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();
            $id = (int)($data['transfusion_id'] ?? $data['id'] ?? 0);

            if ($id <= 0) {
                return Response::json(['success' => false, 'message' => 'Transfusion ID is required.'], 400);
            }

            $record = $this->service->completeTransfusion($id, $data, $actor['id'] ?? null);
            return Response::json([
                'success' => true,
                'message' => 'Transfusion successfully completed and documented.',
                'data' => $record
            ]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function reportReaction(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();
            $id = (int)($data['transfusion_id'] ?? 0);

            if ($id <= 0) {
                return Response::json(['success' => false, 'message' => 'Transfusion ID is required.'], 400);
            }

            $res = $this->service->reportTransfusionReaction($id, $data, $actor['id'] ?? null);
            return Response::json([
                'success' => true,
                'message' => 'EMERGENCY: Transfusion stopped. Adverse reaction documented and blood bank investigation protocol triggered.',
                'data' => $res
            ], 201);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function listReactions(Request $request): Response
    {
        try {
            $filters = [
                'investigation_status' => $request->query('investigation_status'),
                'reaction_classification' => $request->query('reaction_classification'),
                'search' => $request->query('q') ?? $request->query('search')
            ];
            $page = max(1, (int)($request->query('page') ?? 1));
            $perPage = min(100, max(1, (int)($request->query('per_page') ?? 20)));

            $data = $this->service->listReactions($filters, $page, $perPage);
            return Response::json(['success' => true, 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function reactionDetail(Request $request): Response
    {
        try {
            $id = (int)($request->query('id') ?? 0);
            if ($id <= 0) {
                return Response::json(['success' => false, 'message' => 'Reaction ID is required.'], 400);
            }

            $detail = $this->service->getReactionDetail($id);
            if (!$detail) {
                return Response::json(['success' => false, 'message' => 'Reaction record not found.'], 404);
            }

            return Response::json(['success' => true, 'data' => $detail]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function updateReactionInvestigation(Request $request): Response
    {
        try {
            $actor = $request->user();
            $data = $request->json();
            $reactionId = (int)($data['reaction_id'] ?? $data['id'] ?? 0);

            if ($reactionId <= 0) {
                return Response::json(['success' => false, 'message' => 'Reaction ID is required.'], 400);
            }

            $detail = $this->service->updateReactionInvestigation($reactionId, $data, $actor['id'] ?? null);
            return Response::json([
                'success' => true,
                'message' => 'Transfusion reaction investigation sign-off completed.',
                'data' => $detail
            ]);
        } catch (Throwable $e) {
            return Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
