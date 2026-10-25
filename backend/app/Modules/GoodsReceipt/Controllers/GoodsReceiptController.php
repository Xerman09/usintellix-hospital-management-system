<?php

namespace App\Modules\GoodsReceipt\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Response;
use App\Core\Session;
use App\Modules\GoodsReceipt\Services\GoodsReceiptService;
use Throwable;

class GoodsReceiptController extends Controller
{
    private GoodsReceiptService $service;

    public function __construct()
    {
        $this->service = new GoodsReceiptService();
    }

    /**
     * GET /goods-receipt/notes
     */
    public function index(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $filters = [
                'supplier_id' => $request->input('supplier_id'),
                'three_way_match_status' => $request->input('three_way_match_status'),
                'ap_authorization_status' => $request->input('ap_authorization_status'),
                'package_condition' => $request->input('package_condition'),
                'received_date' => $request->input('received_date'),
                'q' => $request->input('q')
            ];
            $page = max(1, (int)($request->input('page') ?? 1));
            $perPage = max(5, min(100, (int)($request->input('per_page') ?? 25)));

            $data = $this->service->listGRNs($filters, $page, $perPage);
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /goods-receipt/metrics
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
     * GET /goods-receipt/notes/:id or /goods-receipt/notes/show?id=:id
     */
    public function show($id = null, ?Request $request = null): Response
    {
        try {
            $request = ($id instanceof Request) ? $id : ($request ?? new Request());
            $resolvedId = is_numeric($id) ? (int)$id : (int)($request->input('id') ?? 0);
            if ($resolvedId <= 0) {
                return Response::json(['status' => 'error', 'message' => "Goods receipt note ID is required."], 400);
            }

            $data = $this->service->getGRNDetail($resolvedId);
            if (!$data) {
                return Response::json(['status' => 'error', 'message' => "Goods receipt note not found."], 404);
            }
            return Response::json(['status' => 'success', 'data' => $data]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /goods-receipt/notes
     */
    public function store(?Request $request = null): Response
    {
        try {
            $request = $request ?? new Request();
            $payload = $request->all();

            if (empty($payload['supplier_id']) && empty($payload['supplier_name'])) {
                return Response::json(['status' => 'error', 'message' => 'Supplier selection is required.'], 422);
            }
            if (empty($payload['delivery_receipt_no'])) {
                return Response::json(['status' => 'error', 'message' => 'Vendor Delivery Receipt (DR) / Waybill number is required.'], 422);
            }
            if (empty($payload['items']) || !is_array($payload['items'])) {
                return Response::json(['status' => 'error', 'message' => 'At least one line item must be inspected.'], 422);
            }

            $userId = Session::get('user_id') ?? null;
            $result = $this->service->saveGRN($payload, $userId);

            return Response::json(['status' => 'success', 'data' => $result], 201);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /goods-receipt/notes/:id
     */
    public function update($id = null, ?Request $request = null): Response
    {
        try {
            $request = ($id instanceof Request) ? $id : ($request ?? new Request());
            $payload = $request->all();
            if (is_numeric($id)) {
                $payload['id'] = (int)$id;
            }

            $userId = Session::get('user_id') ?? null;
            $result = $this->service->saveGRN($payload, $userId);

            return Response::json(['status' => 'success', 'data' => $result]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /goods-receipt/notes/:id
     */
    public function destroy($id = null, ?Request $request = null): Response
    {
        try {
            $request = ($id instanceof Request) ? $id : ($request ?? new Request());
            $resolvedId = is_numeric($id) ? (int)$id : (int)($request->input('id') ?? 0);
            if ($resolvedId <= 0) {
                return Response::json(['status' => 'error', 'message' => "Goods receipt note ID is required."], 400);
            }

            $this->service->deleteGRN($resolvedId);
            return Response::json(['status' => 'success', 'message' => 'Goods receipt note deleted successfully.']);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * POST /goods-receipt/authorize-ap
     */
    public function authorizeAP($id = null, ?Request $request = null): Response
    {
        try {
            $request = ($id instanceof Request) ? $id : ($request ?? new Request());
            $resolvedId = is_numeric($id) ? (int)$id : (int)($request->input('id') ?? $request->input('grn_id') ?? 0);
            if ($resolvedId <= 0) {
                return Response::json(['status' => 'error', 'message' => "Goods receipt note ID is required for AP authorization."], 400);
            }

            $status = $request->input('ap_authorization_status') ?? 'authorized_for_payment';
            $authBy = $request->input('authorized_by') ?: (Session::get('username') ?? 'AP Finance Director');
            $notes = $request->input('notes');

            $this->service->authorizeAP($resolvedId, $status, $authBy, $notes);
            return Response::json(['status' => 'success', 'message' => "Accounts payable authorization updated to '{$status}'."]);
        } catch (Throwable $e) {
            return Response::json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /goods-receipt/metadata
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
