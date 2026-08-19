<?php

namespace App\Modules\PatientLedger\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientLedger\Services\PatientLedgerService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class PatientLedgerController extends Controller
{
    private PatientLedgerService $patientLedgerService;
    private ProviderService $providerService;

    private const DETAIL_FIELDS = ['encounter_id', 'payer_type', 'payment_type', 'payment_date', 'payment_amount', 'adjustment_amount', 'notes'];

    public function __construct()
    {
        $this->patientLedgerService = new PatientLedgerService();
        $this->providerService = new ProviderService();
    }

    public function index(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $from = (string) $request->input('from', date('Y') . '-01-01');
        $to = (string) $request->input('to', date('Y-m-d'));

        $this->success($this->patientLedgerService->getLedger($patientId, $from, $to), 'Ledger retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $result = $this->patientLedgerService->addPayment(
            $patientId,
            $request->only(self::DETAIL_FIELDS),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    private function ownsPatient(array $user, int $patientId): bool
    {
        if (!$patientId) {
            return false;
        }

        $patient = (new Patient())->where('id', $patientId)->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return false;
        }

        if (($user['role'] ?? '') !== 'doctor') {
            return true;
        }

        $provider = $this->providerService->findByUserId((int) $user['id']);
        $providerId = $provider ? (int) $provider['id'] : 0;

        return (int) $patient['provider_id'] === $providerId;
    }
}
