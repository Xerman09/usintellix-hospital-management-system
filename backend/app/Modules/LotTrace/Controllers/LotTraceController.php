<?php

namespace App\Modules\LotTrace\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Modules\LotTrace\Services\LotTraceService;

class LotTraceController extends Controller
{
    private LotTraceService $service;

    public function __construct()
    {
        $this->service = new LotTraceService();
    }

    /** Query: q?, in_stock?, expires_by? */
    public function search(): void
    {
        $request = new Request();

        $this->success($this->service->search([
            'q' => $request->input('q'),
            'in_stock' => in_array((string) $request->input('in_stock'), ['1', 'true'], true),
            'expires_by' => $request->input('expires_by')
        ]), 'Batches retrieved successfully.');
    }

    /** Query: drug_id + lot_number, or lot_id */
    public function trace(): void
    {
        $request = new Request();
        $trace = $this->service->trace([
            'drug_id' => $request->input('drug_id'),
            'lot_number' => $request->input('lot_number'),
            'lot_id' => $request->input('lot_id')
        ]);

        if (!$trace) {
            $this->error('That batch was not found.', 404);
            return;
        }

        $this->success($trace, 'Trace retrieved successfully.');
    }
}
