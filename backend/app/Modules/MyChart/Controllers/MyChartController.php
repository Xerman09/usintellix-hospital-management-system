<?php

namespace App\Modules\MyChart\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\MyChart\Services\PortalGuard;
use App\Modules\MyChart\Services\PortalResultService;

/**
 * My Chart, the patient's own view of their record.
 *
 * Every action starts at PortalGuard::enter(), which resolves which patient the
 * caller may act as (self or an active proxy grant), checks the capability, and
 * writes the portal audit row. No action reads patient_id from the request.
 */
class MyChartController extends Controller
{
    /** GET /mychart/results */
    public function results(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $patientId = PortalGuard::enter($user, 'Test Results Viewed', PortalGuard::CAP_RESULTS_VIEW);

        if ($patientId === null) {
            $this->error('Test results are not available for this account.', 403);
            return;
        }

        $data = PortalResultService::list($patientId, [
            'kind' => (string) $request->input('kind', ''),
            'from' => (string) $request->input('from', ''),
            'to' => (string) $request->input('to', ''),
            'q' => trim((string) $request->input('q', '')),
        ]);

        $this->success($data, 'Results retrieved successfully.');
    }

    /** GET /mychart/results/show?order_id= */
    public function result(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $orderId = (int) $request->input('order_id');

        $patientId = PortalGuard::enter($user, 'Test Result Opened', PortalGuard::CAP_RESULTS_VIEW);

        if ($patientId === null) {
            $this->error('Test results are not available for this account.', 403);
            return;
        }

        $result = $orderId ? PortalResultService::show($patientId, $orderId) : null;

        if ($result === null) {
            // Same answer whether the order belongs to someone else, does not exist, or
            // is being withheld -- a patient must not be able to tell those apart.
            $this->error('That result is not available.', 404);
            return;
        }

        $this->success($result, 'Result retrieved successfully.');
    }
}
