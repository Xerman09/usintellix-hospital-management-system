<?php

namespace App\Modules\PerformanceEvaluations\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Modules\PerformanceEvaluations\Services\PerformanceEvaluationService;
use Throwable;

class PerformanceEvaluationController extends Controller
{
    private PerformanceEvaluationService $service;

    public function __construct()
    {
        $this->service = new PerformanceEvaluationService();
    }

    /**
     * GET /performance-evaluations
     */
    public function index(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $filters = [
                'employee_id' => $request->input('employee_id'),
                'department_id' => $request->input('department_id'),
                'evaluation_cycle' => $request->input('evaluation_cycle'),
                'evaluator_type' => $request->input('evaluator_type'),
                'performance_tier' => $request->input('performance_tier'),
                'year' => $request->input('year') ?? date('Y'),
                'status' => $request->input('status'),
                'q' => $request->input('q')
            ];
            $page = max(1, (int)($request->input('page') ?? 1));
            $perPage = max(5, min(100, (int)($request->input('per_page') ?? 25)));

            $data = $this->service->listEvaluations($filters, $page, $perPage);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /performance-evaluations/metrics
     */
    public function metrics(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $year = (int)($request->input('year') ?? date('Y'));
            $data = $this->service->getExecutiveMetrics($year);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /performance-evaluations/:id
     */
    public function show($id): Response
    {
        try {
            $data = $this->service->getEvaluationDetail((int)$id);
            if (!$data) {
                return Response::json(['status' => 'error', 'message' => "Performance evaluation record not found."], 404);
            }
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /performance-evaluations
     */
    public function store(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();

            if (empty($payload['employee_id']) && empty($payload['employee_name'])) {
                return Response::json(['status' => 'error', 'message' => 'Employee selection is required.'], 422);
            }
            if (empty($payload['evaluation_cycle'])) {
                return Response::json(['status' => 'error', 'message' => 'Evaluation cycle is required.'], 422);
            }

            $userId = Session::get('user_id') ?? null;
            $result = $this->service->saveEvaluation($payload, $userId);

            return Response::json(['status' => 'success', 'data' => $result], 201);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /performance-evaluations/:id
     */
    public function update($id, ?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();
            $payload['id'] = (int)$id;

            $userId = Session::get('user_id') ?? null;
            $result = $this->service->saveEvaluation($payload, $userId);

            return Response::json(['status' => 'success', 'data' => $result]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /performance-evaluations/:id
     */
    public function destroy($id): Response
    {
        try {
            $this->service->deleteEvaluation((int)$id);
            return Response::json(['status' => 'success', 'message' => 'Performance evaluation record deleted successfully.']);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /performance-evaluations/:id/acknowledge
     */
    public function acknowledge($id, ?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $comments = $request->input('employee_comments') ?? 'Acknowledged and reviewed with clinical supervisor.';

            $this->service->acknowledgeEvaluation((int)$id, $comments);
            return Response::json(['status' => 'success', 'message' => 'Performance evaluation acknowledged successfully.']);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /performance-evaluations/metadata
     */
    public function metadata(): Response
    {
        try {
            $data = $this->service->getMetadata();
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
