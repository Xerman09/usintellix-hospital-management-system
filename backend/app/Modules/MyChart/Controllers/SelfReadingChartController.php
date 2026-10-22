<?php

namespace App\Modules\MyChart\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Modules\MyChart\Services\PortalSelfReadingService;

/**
 * The staff side of Track My Health: the read-only panel in the patient chart.
 *
 * It lives apart from MyChartController on purpose. Every action there resolves the
 * patient through PortalGuard and never takes patient_id from the request, which is
 * what keeps one portal account from reading another's record. This controller is
 * the opposite case -- a clinician asking about the patient in front of them -- so
 * it is kept out of that file rather than weakening the rule there.
 *
 * Read-only: the readings belong to the patient, and nothing here can change them.
 */
class SelfReadingChartController extends Controller
{
    /** GET /patient-self-readings?patient_id=&days= */
    public function show(): void
    {
        $request = new Request();
        $patientId = (int) $request->input('patient_id');

        if ($patientId <= 0) {
            $this->error('Which patient?', 422);
            return;
        }

        $this->success(
            PortalSelfReadingService::chart(
                $patientId,
                (int) ($request->input('days') ?: PortalSelfReadingService::DEFAULT_DAYS)
            ),
            'Self-reported readings retrieved successfully.'
        );
    }
}
