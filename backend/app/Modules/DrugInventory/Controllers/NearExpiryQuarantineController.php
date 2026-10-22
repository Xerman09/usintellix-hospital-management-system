<?php

namespace App\Modules\DrugInventory\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\DrugInventory\Services\NearExpiryQuarantineService;

class NearExpiryQuarantineController extends Controller
{
    private NearExpiryQuarantineService $service;

    public function __construct()
    {
        $this->service = new NearExpiryQuarantineService();
    }

    /**
     * List all quarantined and near-expiry (<60 days) lots.
     */
    public function index(): void
    {
        $request = new Request();
        $result = $this->service->listQuarantinedLots([
            'warehouse_id' => $request->input('warehouse_id'),
            'drug_id' => $request->input('drug_id')
        ]);

        $this->success($result, 'Quarantined lots retrieved successfully.');
    }

    /**
     * Trigger a near-expiry quarantine scan on-demand.
     */
    public function scan(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);

        $days = $request->input('threshold_days') ? (int) $request->input('threshold_days') : null;

        $result = $this->service->runQuarantineScan($days, 'manual_scan', $userId);

        if (!$result['success']) {
            $this->error($result['message'], 500);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Release a lot from quarantine with documented clinical reason.
     */
    public function release(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);

        $lotId = (int) $request->input('lot_id');
        $reason = (string) $request->input('reason');

        if ($lotId <= 0) {
            $this->error('Lot ID is required.', 422);
            return;
        }

        $result = $this->service->releaseQuarantine($lotId, $reason, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Get quarantine scan logs.
     */
    public function logs(): void
    {
        $logs = $this->service->getLogs(30);
        $this->success($logs, 'Quarantine scan logs retrieved successfully.');
    }
}
