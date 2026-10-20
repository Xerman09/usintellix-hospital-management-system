<?php

namespace App\Modules\CpoeDiagnostics\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Core\PhiAccessGuard;
use App\Modules\CpoeDiagnostics\Services\CpoeDiagnosticService;

class CpoeDiagnosticController extends Controller
{
    private CpoeDiagnosticService $service;

    public function __construct()
    {
        $this->service = new CpoeDiagnosticService();
    }

    /**
     * Retrieve categorized diagnostic catalog (Blood Tests, Cultures, Radiology)
     * and quick fast-pick definitions for inline CPOE ordering.
     */
    public function catalog(): void
    {
        $catalog = $this->service->getCatalog();
        $this->success($catalog, 'Diagnostic CPOE catalog retrieved successfully.');
    }

    /**
     * Bundled 1-click diagnostic ordering directly from consultation note.
     */
    public function order(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');
        if (!$patientId) {
            $this->error('Patient ID is required.', 422);
            return;
        }

        PhiAccessGuard::assertPatientAccess($user, $patientId, true);

        $payload = $request->all();
        $result = $this->service->placeOrders($payload, $user);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Retrieve diagnostic orders for an encounter/consultation.
     */
    public function encounterOrders(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');
        $encounterId = (int) $request->input('encounter_id');

        if (!$patientId) {
            $this->error('Patient ID is required.', 422);
            return;
        }

        PhiAccessGuard::assertPatientAccess($user, $patientId, false);

        $orders = $this->service->getEncounterOrders($encounterId, $patientId);
        $this->success($orders, 'Encounter diagnostic orders retrieved successfully.');
    }
}
