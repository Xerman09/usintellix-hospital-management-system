<?php

namespace App\Modules\PatientTransactions\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientTransactions\Services\PatientTransactionService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class PatientTransactionController extends Controller
{
    private PatientTransactionService $patientTransactionService;
    private ProviderService $providerService;

    private const DETAIL_FIELDS = [
        'transaction_type', 'details', 'sent_summary_of_care', 'sent_summary_of_care_electronically',
        'confirmed_recipient_received_summary', 'referral_date', 'external_referral',
        'reason', 'risk_level', 'requested_service', 'refer_by_provider_id',
        'refer_to_provider_id', 'referrer_diagnosis', 'include_vitals', 'billing_facility_id',
        'reply_date', 'reply_from', 'presumed_diagnosis', 'final_diagnosis', 'documents',
        'findings', 'services_provided', 'recommendations', 'prescriptions_referrals'
    ];

    public function __construct()
    {
        $this->patientTransactionService = new PatientTransactionService();
        $this->providerService = new ProviderService();
    }

    /**
     * List a patient's recorded transactions.
     */
    public function index(): void
    {
        $request = new Request();
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        $transactions = $this->patientTransactionService->list($patientId);

        $this->success($transactions, 'Patient transactions retrieved successfully.');
    }

    /**
     * Record a transaction for a patient (admin, receptionist, or the assigned doctor).
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $result = $this->patientTransactionService->store(
            $patientId,
            (int) $user['id'],
            $request->only(self::DETAIL_FIELDS)
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update a recorded patient transaction's details (admin, receptionist, or the assigned doctor).
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->patientTransactionService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Transaction record not found.', 404);
            return;
        }

        $result = $this->patientTransactionService->update(
            $id,
            $request->only(self::DETAIL_FIELDS),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Remove a recorded patient transaction (admin, receptionist, or the assigned doctor).
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');

        $record = $this->patientTransactionService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Transaction record not found.', 404);
            return;
        }

        $result = $this->patientTransactionService->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Confirm the given patient exists and, for doctors, is assigned to them.
     * Admins and receptionists may manage any active patient's transactions.
     */
    private function ownsPatient(array $user, int $patientId): bool
    {
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
