<?php

namespace App\Modules\ProxyAccess\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Patients\Services\PatientAccessService;

class ProxyAccessController extends Controller
{
    private PatientAccessService $accessService;

    public function __construct()
    {
        $this->accessService = new PatientAccessService();
    }

    /**
     * GET /proxy-access/mine
     * Every patient chart the logged-in user may act as (their own, plus
     * any active proxy grants), and which one is currently active.
     */
    public function mine(): void
    {
        $user = Session::get('user');

        $this->success(
            $this->accessService->listAccessiblePatients((int) $user['id']),
            'Accessible patients retrieved successfully.'
        );
    }

    /**
     * POST /proxy-access/switch
     * Body: { patient_id }
     */
    public function switchPatient(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $patientId = (int) $request->input('patient_id');
        $patient = $this->accessService->switchTo($user, $patientId);

        if (!$patient) {
            $this->error('You do not have access to that patient record.', 403);
            return;
        }

        $this->success([
            'patient_id' => (int) $patient['id'],
            'first_name' => $patient['first_name'],
            'last_name'  => $patient['last_name']
        ], 'Switched successfully.');
    }
}
