<?php

namespace App\Modules\SupplyCatalog\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Modules\SupplyCatalog\Services\SupplyCatalogService;
use Throwable;

class SupplyCatalogController extends Controller
{
    private SupplyCatalogService $service;

    public function __construct()
    {
        $this->service = new SupplyCatalogService();
    }

    /**
     * GET /supply-catalog/items
     */
    public function index(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $filters = [
                'category' => $request->input('category'),
                'status' => $request->input('status'),
                'sterility_type' => $request->input('sterility_type'),
                'is_billable_to_patient' => $request->input('is_billable_to_patient'),
                'low_stock_only' => $request->input('low_stock_only'),
                'q' => $request->input('q')
            ];
            $page = max(1, (int)($request->input('page') ?? 1));
            $perPage = max(5, min(100, (int)($request->input('per_page') ?? 25)));

            $data = $this->service->listItems($filters, $page, $perPage);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /supply-catalog/metrics
     */
    public function metrics(): Response
    {
        try {
            $data = $this->service->getExecutiveMetrics();
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /supply-catalog/items/:id
     */
    public function show($id): Response
    {
        try {
            $data = $this->service->getItemDetail((int)$id);
            if (!$data) {
                return Response::json(['status' => 'error', 'message' => "Supply catalog item not found."], 404);
            }
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /supply-catalog/items
     */
    public function store(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();

            if (empty($payload['item_name'])) {
                return Response::json(['status' => 'error', 'message' => 'Supply item name is required.'], 422);
            }
            if (empty($payload['category'])) {
                return Response::json(['status' => 'error', 'message' => 'Supply category is required.'], 422);
            }
            if (empty($payload['unit_of_measure'])) {
                return Response::json(['status' => 'error', 'message' => 'Unit of measure is required.'], 422);
            }

            $userId = Session::get('user_id') ?? null;
            $result = $this->service->saveItem($payload, $userId);

            return Response::json(['status' => 'success', 'data' => $result], 201);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /supply-catalog/items/:id
     */
    public function update($id, ?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();
            $payload['id'] = (int)$id;

            $userId = Session::get('user_id') ?? null;
            $result = $this->service->saveItem($payload, $userId);

            return Response::json(['status' => 'success', 'data' => $result]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /supply-catalog/items/:id
     */
    public function destroy($id): Response
    {
        try {
            $this->service->deleteItem((int)$id);
            return Response::json(['status' => 'success', 'message' => 'Supply catalog item deleted successfully.']);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /supply-catalog/items/:id/adjust-stock
     */
    public function adjustStock($id, ?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $qty = (float)($request->input('adjustment_quantity') ?? 0);
            $reason = trim($request->input('reason') ?? 'Manual Inventory Adjustment');
            $userId = Session::get('user_id') ?? null;

            if ($qty == 0) {
                return Response::json(['status' => 'error', 'message' => 'Adjustment quantity cannot be zero.'], 422);
            }

            $result = $this->service->adjustStock((int)$id, $qty, $reason, $userId);
            return Response::json(['status' => 'success', 'data' => $result]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /supply-catalog/metadata
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
