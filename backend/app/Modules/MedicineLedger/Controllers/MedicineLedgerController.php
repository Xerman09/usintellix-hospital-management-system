<?php

namespace App\Modules\MedicineLedger\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Modules\MedicineLedger\Services\MedicineLedgerService;

class MedicineLedgerController extends Controller
{
    private MedicineLedgerService $service;

    public function __construct()
    {
        $this->service = new MedicineLedgerService();
    }

    public function options(): void
    {
        $this->success($this->service->options(), 'Options retrieved successfully.');
    }

    /** Query: drug_id, warehouse_id?, lot_id?, date_from?, date_to?, type? */
    public function ledger(): void
    {
        $request = new Request();
        $ledger = $this->service->ledger([
            'drug_id' => $request->input('drug_id'),
            'warehouse_id' => $request->input('warehouse_id'),
            'lot_id' => $request->input('lot_id'),
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
            'type' => $request->input('type')
        ]);

        if (!$ledger) {
            $this->error('Choose an item.', 422);
            return;
        }

        $this->success($ledger, 'Ledger retrieved successfully.');
    }

    /** Query: date_from?, date_to?, warehouse_id?, only_moved? */
    public function summary(): void
    {
        $request = new Request();

        $this->success($this->service->summary([
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
            'warehouse_id' => $request->input('warehouse_id'),
            'only_moved' => in_array((string) $request->input('only_moved'), ['1', 'true'], true)
        ]), 'Summary retrieved successfully.');
    }
}
