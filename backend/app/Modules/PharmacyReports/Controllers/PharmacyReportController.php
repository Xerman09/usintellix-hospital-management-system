<?php

namespace App\Modules\PharmacyReports\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Modules\PharmacyReports\Services\PharmacyReportService;

class PharmacyReportController extends Controller
{
    private PharmacyReportService $service;

    public function __construct()
    {
        $this->service = new PharmacyReportService();
    }

    public function options(): void
    {
        $this->success($this->service->options(), 'Options retrieved successfully.');
    }

    /** Query: date_from?, date_to?, warehouse_id?, drug_id?, prescriber_id?, dispensed_by?, status?, flag?, q? */
    public function dispensingLog(): void
    {
        $request = new Request();
        $this->success($this->service->dispensingLog($request->only([
            'date_from', 'date_to', 'warehouse_id', 'drug_id', 'prescriber_id', 'dispensed_by', 'status', 'flag', 'q'
        ])), 'Dispensing log retrieved successfully.');
    }

    /** Query: class?, drug_id?, warehouse_id?, date_from?, date_to? */
    public function dangerousDrugs(): void
    {
        $request = new Request();
        $this->success($this->service->dangerousDrugs($request->only(['class', 'drug_id', 'warehouse_id', 'date_from', 'date_to'])),
            'Dangerous Drugs register retrieved successfully.');
    }

    /** Query: date_from?, date_to?, prescriber_id?, state? */
    public function unfilled(): void
    {
        $request = new Request();
        $this->success($this->service->unfilled($request->only(['date_from', 'date_to', 'prescriber_id', 'state'])),
            'Unfilled prescriptions retrieved successfully.');
    }

    /** Query: date_from?, date_to?, prescriber_id? */
    public function byPrescriber(): void
    {
        $request = new Request();
        $this->success($this->service->byPrescriber($request->only(['date_from', 'date_to', 'prescriber_id'])),
            'Prescriptions by doctor retrieved successfully.');
    }
}
