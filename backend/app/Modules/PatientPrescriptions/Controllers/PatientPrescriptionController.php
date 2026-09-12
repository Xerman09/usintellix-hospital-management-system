<?php

namespace App\Modules\PatientPrescriptions\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientPrescriptions\Services\PatientPrescriptionService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;
use App\Modules\Messaging\Services\MessagingService;
use App\Modules\Messaging\Models\MessageType;

class PatientPrescriptionController extends Controller
{
    private PatientPrescriptionService $patientPrescriptionService;
    private ProviderService $providerService;
    private MessagingService $messagingService;

    private const DETAIL_FIELDS = [
        'title', 'begin_date', 'end_date', 'quantity', 'dosage', 'route',
        'frequency', 'refills', 'directions', 'substitution_allowed', 'pharmacy',
        'comments', 'coding', 'occurrence', 'outcome', 'classification_type',
        'verification_status', 'referred_by', 'destination'
    ];

    public function __construct()
    {
        $this->patientPrescriptionService = new PatientPrescriptionService();
        $this->providerService = new ProviderService();
        $this->messagingService = new MessagingService();
    }

    /**
     * List a patient's recorded prescriptions. Patients may only view
     * their own; staff must supply the patient_id they're looking up.
     */
    public function index(): void
    {
        $request = new Request();
        $user = Session::get('user');

        if (($user['role'] ?? '') === 'patient') {
            $patient = (new Patient())->where('user_id', (int) $user['id'])->first();

            if (!$patient) {
                $this->error('Patient record not found.', 404);
                return;
            }

            $patientId = (int) $patient['id'];
        } else {
            $patientId = (int) $request->input('patient_id');

            if (!$patientId) {
                $this->error('Patient is required.', 422);
                return;
            }
        }

        $prescriptions = $this->patientPrescriptionService->list($patientId);

        $this->success($prescriptions, 'Patient prescriptions retrieved successfully.');
    }

    /**
     * A patient requests a refill on one of their own active
     * prescriptions — sends a message to their assigned provider rather
     * than writing a new record (no refill-request table exists).
     */
    public function requestRefill(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $patient = (new Patient())->where('user_id', (int) $user['id'])->first();

        if (!$patient) {
            $this->error('Patient record not found.', 404);
            return;
        }

        $prescriptionId = (int) $request->input('prescription_id');
        $prescription = $prescriptionId ? $this->patientPrescriptionService->find($prescriptionId) : null;

        if (!$prescription || $prescription['deleted_at'] !== null || (int) $prescription['patient_id'] !== (int) $patient['id']) {
            $this->error('Prescription not found.', 404);
            return;
        }

        if (empty($patient['provider_id'])) {
            $this->error('You do not have an assigned provider to send this request to.', 422);
            return;
        }

        $providerUserId = $this->providerService->findUserIdByProviderId((int) $patient['provider_id']);

        if (!$providerUserId) {
            $this->error('Your assigned provider could not be reached.', 422);
            return;
        }

        $conversationResult = $this->messagingService->createConversation(
            (int) $user['id'],
            [$providerUserId],
            'Prescription Refill Request'
        );

        if (!$conversationResult['success']) {
            $this->error($conversationResult['message'], 422);
            return;
        }

        $refillType = (new MessageType())->where('name', 'Refill Request')->first();

        $sendResult = $this->messagingService->sendMessage(
            (int) $conversationResult['data']['conversation_id'],
            (int) $user['id'],
            $this->buildRefillRequestBody($prescription),
            [
                'patient_id' => $patient['id'],
                'type_id' => $refillType['id'] ?? null
            ]
        );

        if (!$sendResult['success']) {
            $this->error($sendResult['message'], 422);
            return;
        }

        $this->success(
            ['conversation_id' => $conversationResult['data']['conversation_id']],
            'Refill request sent to your provider.'
        );
    }

    /**
     * Compose the message body for a refill request from whatever detail
     * fields the prescription record actually has on file.
     */
    private function buildRefillRequestBody(array $prescription): string
    {
        $lines = ["Refill request: " . $prescription['title']];

        if (!empty($prescription['dosage'])) {
            $lines[] = "Dosage: " . $prescription['dosage'];
        }

        if (!empty($prescription['quantity'])) {
            $lines[] = "Quantity: " . $prescription['quantity'];
        }

        if (!empty($prescription['frequency'])) {
            $lines[] = "Frequency: " . $prescription['frequency'];
        }

        if (!empty($prescription['pharmacy'])) {
            $lines[] = "Pharmacy: " . $prescription['pharmacy'];
        }

        return implode("\n", $lines);
    }

    /**
     * Record a prescription for a patient (admin, receptionist, or the assigned doctor).
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');
        $medicationIdRaw = $request->input('medication_id');
        $medicationId = ($medicationIdRaw !== null && $medicationIdRaw !== '') ? (int) $medicationIdRaw : null;

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $result = $this->patientPrescriptionService->store(
            $patientId,
            $medicationId,
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
     * Update a recorded patient prescription's details (admin, receptionist, or the assigned doctor).
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->patientPrescriptionService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Prescription record not found.', 404);
            return;
        }

        $result = $this->patientPrescriptionService->update(
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
     * Remove a recorded patient prescription (admin, receptionist, or the assigned doctor).
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');

        $record = $this->patientPrescriptionService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Prescription record not found.', 404);
            return;
        }

        $result = $this->patientPrescriptionService->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Confirm the given patient exists and, for doctors, is assigned to them.
     * Admins and receptionists may manage any active patient's prescriptions.
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
