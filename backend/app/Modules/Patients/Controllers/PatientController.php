<?php

namespace App\Modules\Patients\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Patients\Services\PatientService;

class PatientController extends Controller
{
    private PatientService $patientService;

    public function __construct()
    {
        $this->patientService = new PatientService();
    }

    /**
     * Register a new patient account (receptionist-only).
     */
    public function register(): void
    {
        $receptionist = Session::get('user');
        $request = new Request();

        $data = $request->only([
            'username',
            'password',
            'first_name',
            'middle_name',
            'last_name',
            'suffix',
            'sex',
            'birthdate',
            'civil_status',
            'blood_type',
            'height',
            'weight'
        ]);

        $result = $this->patientService->register(
            $data,
            (int) $receptionist['tenant_id'],
            (int) $receptionist['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }
}
