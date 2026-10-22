<?php

declare(strict_types=1);

namespace App\Modules\DrugInventory\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\DrugInventory\Services\LotRecallTraceService;

class LotRecallTraceController extends Controller
{
    private LotRecallTraceService $service;

    public function __construct()
    {
        $this->service = new LotRecallTraceService();
    }

    /**
     * Search lots for autocomplete in the trace dashboard.
     * GET /drug-inventory/recall-trace/search-lots?q={query}
     */
    public function searchLots(): void
    {
        $request = new Request();
        $query = (string) $request->input('q', '');
        $limit = (int) $request->input('limit', 20);

        $results = $this->service->searchLots($query, $limit);
        $this->success($results, 'Lots retrieved successfully.');
    }

    /**
     * Instant trace for a lot number:
     * Returns remaining hospital stock + complete patient distribution history with outreach phone numbers.
     * GET /drug-inventory/recall-trace/trace?lot_number={lot_number}
     */
    public function trace(): void
    {
        $request = new Request();
        $lotNumber = (string) $request->input('lot_number', '');
        $drugId = $request->input('drug_id') ? (int) $request->input('drug_id') : null;

        if (trim($lotNumber) === '') {
            $this->error('Lot number is required for tracing.', 422);
            return;
        }

        $result = $this->service->traceLot($lotNumber, $drugId);

        if (empty($result['success'])) {
            $this->error($result['message'] ?? 'Failed to trace lot.', 404);
            return;
        }

        $this->success($result, "Trace results compiled for lot {$lotNumber}.");
    }

    /**
     * Quarantine all hospital stock for this lot across all warehouses immediately.
     * POST /drug-inventory/recall-trace/quarantine
     */
    public function quarantine(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);

        $lotNumber = (string) $request->input('lot_number', '');
        $reason = (string) $request->input('reason', 'Immediate Manufacturer / Regulatory Lot Quarantine');

        if (trim($lotNumber) === '') {
            $this->error('Lot number is required.', 422);
            return;
        }

        $result = $this->service->quarantineLotStock($lotNumber, $reason, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 400);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Initialize formal Lot Recall and seed patient outreach roster.
     * POST /drug-inventory/recall-trace/create-recall
     */
    public function createRecall(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);

        $data = [
            'lot_number' => $request->input('lot_number'),
            'recall_class' => $request->input('recall_class', 'Class II'),
            'recall_reason' => $request->input('recall_reason', $request->input('reason', '')),
            'manufacturer_name' => $request->input('manufacturer_name'),
            'fda_advisory_ref' => $request->input('fda_advisory_ref'),
            'action_notes' => $request->input('action_notes', $request->input('notes', ''))
        ];

        $result = $this->service->createRecall($data, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Update patient outreach attempt status & notes.
     * POST /drug-inventory/recall-trace/outreach-status
     */
    public function updateOutreach(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);

        $outreachId = (int) $request->input('outreach_id');
        if ($outreachId <= 0) {
            $this->error('Outreach ID is required.', 422);
            return;
        }

        $data = [
            'outreach_status' => $request->input('outreach_status', 'contacted_informed'),
            'contacted_phone' => $request->input('contacted_phone', ''),
            'patient_response_notes' => $request->input('patient_response_notes', ''),
            'units_returned' => $request->input('units_returned', 0),
            'replacement_issued' => $request->input('replacement_issued', false)
        ];

        $result = $this->service->updateOutreachStatus($outreachId, $data, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 400);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * List all lot recalls.
     * GET /drug-inventory/recall-trace/list
     */
    public function list(): void
    {
        $request = new Request();
        $filters = [
            'status' => $request->input('status'),
            'lot_number' => $request->input('lot_number')
        ];

        $list = $this->service->listRecalls($filters);
        $this->success($list, 'Lot recalls retrieved successfully.');
    }

    /**
     * Export complete patient distribution roster as CSV.
     * GET /drug-inventory/recall-trace/export-csv?lot_number={lot_number}
     */
    public function exportCsv(): void
    {
        $request = new Request();
        $lotNumber = (string) $request->input('lot_number', '');

        if (trim($lotNumber) === '') {
            $this->error('Lot number is required for CSV export.', 422);
            return;
        }

        $csv = $this->service->exportOutreachCsv($lotNumber);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="Recall_Outreach_' . preg_replace('/[^A-Za-z0-9_-]/', '_', $lotNumber) . '.csv"');
        echo $csv;
        exit;
    }
}
