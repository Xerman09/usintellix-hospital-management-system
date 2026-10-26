<?php

namespace App\Modules\Dispensing\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Modules\Dispensing\Services\ScanLookupService;

/**
 * Pharmacy > Dispensing: resolving scanned codes.
 *
 * All three are reads, and all three answer 200 with found = true/false. A code
 * that matches nothing is a normal outcome at a counter -- someone scanned the
 * shelf label instead of the pack -- not a failed request, and a 404 would make
 * the tablet show an error banner for it.
 */
class ScanController extends Controller
{
    private ScanLookupService $service;

    public function __construct()
    {
        $this->service = new ScanLookupService();
    }

    /** Query: code (an Rx number) */
    public function rx(): void
    {
        $request = new Request();
        $result = $this->service->rx((string) $request->input('code', ''));

        $this->success($result, $result['message']);
    }

    /** Query: code (a patient number), expected_patient_id? */
    public function patient(): void
    {
        $request = new Request();
        $expected = (int) $request->input('expected_patient_id', 0);

        $result = $this->service->patient(
            (string) $request->input('code', ''),
            $expected > 0 ? $expected : null
        );

        $this->success($result, $result['message']);
    }

    /** Query: code (a pack barcode or lot number), expected_drug_id?, warehouse_id? */
    public function lot(): void
    {
        $request = new Request();
        $expectedDrug = (int) $request->input('expected_drug_id', 0);
        $warehouse = (int) $request->input('warehouse_id', 0);

        $result = $this->service->lot(
            (string) $request->input('code', ''),
            $expectedDrug > 0 ? $expectedDrug : null,
            $warehouse > 0 ? $warehouse : null
        );

        $this->success($result, $result['message']);
    }
}
