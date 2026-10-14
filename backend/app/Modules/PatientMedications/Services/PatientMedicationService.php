<?php

namespace App\Modules\PatientMedications\Services;

use App\Core\Database;
use App\Modules\Medications\Models\Medication;
use App\Modules\PatientMedications\Models\PatientMedication;
use PDO;

class PatientMedicationService
{
    /**
     * Detail fields that can be set on a patient medication record, beyond
     * the patient/medication link itself.
     */
    private const DETAIL_FIELDS = [
        'title', 'begin_date', 'end_date', 'medication_usage', 'request_intent',
        'is_primary_record', 'comments', 'coding', 'occurrence', 'outcome',
        'classification_type', 'verification_status', 'referred_by', 'destination'
    ];

    /**
     * List a patient's recorded medications.
     */
    public function list(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, patient_id, medication_id, title, begin_date, end_date,
                    medication_usage, request_intent, is_primary_record, comments, coding,
                    occurrence, outcome, classification_type, verification_status,
                    referred_by, destination, created_at, updated_at
             FROM patient_medications
             WHERE patient_id = :patient_id AND deleted_at IS NULL
             ORDER BY title"
        );

        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * List all patient medications and prescriptions unified for the patient portal,
     * including full dosage, frequency, route, refills, and prescriber data.
     */
    public function listAllForPatient(int $patientId): array
    {
        $db = Database::connection();

        // 1. Clinical and self-reported medications
        $stmtMed = $db->prepare(
            "SELECT id, patient_id, medication_id, title, begin_date, end_date,
                    medication_usage, request_intent, is_primary_record, comments, coding,
                    occurrence, outcome, classification_type, verification_status,
                    referred_by, destination, created_at, updated_at
             FROM patient_medications
             WHERE patient_id = :patient_id AND deleted_at IS NULL
             ORDER BY is_primary_record DESC, begin_date DESC, title"
        );
        $stmtMed->execute(['patient_id' => $patientId]);
        $medRows = $stmtMed->fetchAll(PDO::FETCH_ASSOC);

        $unified = [];

        foreach ($medRows as $m) {
            $isEnded = !empty($m['end_date']) && $m['end_date'] < date('Y-m-d');
            $unified[] = [
                'id' => (int) $m['id'],
                'record_type' => 'medication',
                'title' => $m['title'],
                'begin_date' => $m['begin_date'],
                'end_date' => $m['end_date'],
                'dosage' => $m['medication_usage'] ?: null,
                'frequency' => null,
                'route' => null,
                'quantity' => null,
                'directions' => $m['comments'],
                'refills' => null,
                'refills_allowed' => 0,
                'refills_remaining' => 0,
                'refill_until' => null,
                'can_request_refill' => false,
                'is_closed' => false,
                'refill_request' => null,
                'pharmacy' => null,
                'rx_number' => null,
                'prescribed_date' => null,
                'prescriber_name' => $m['referred_by'] ?: null,
                'comments' => $m['comments'],
                'verification_status' => $m['verification_status'] ?: 'Confirmed',
                'status' => $isEnded ? 'completed' : 'active',
                'created_at' => $m['created_at'],
                'updated_at' => $m['updated_at'] ?? $m['created_at']
            ];
        }

        // 2. Prescriptions written by doctors/providers
        $rxService = new \App\Modules\PatientPrescriptions\Services\PatientPrescriptionService();
        $rxRows = $rxService->list($patientId);

        foreach ($rxRows as $rx) {
            $isCancelled = ($rx['prescription_status'] ?? '') === 'cancelled';
            $isEnded = !empty($rx['end_date']) && $rx['end_date'] < date('Y-m-d');
            $status = $isCancelled ? 'cancelled' : ($isEnded ? 'completed' : 'active');

            $unified[] = [
                'id' => (int) $rx['id'],
                'prescription_id' => $rx['prescription_id'] ?? null,
                'record_type' => 'prescription',
                'title' => $rx['title'],
                'begin_date' => $rx['begin_date'],
                'end_date' => $rx['end_date'],
                'dosage' => $rx['dosage'] ?: ($rx['drug_strength'] ?? null),
                'frequency' => $rx['frequency'],
                'route' => $rx['route'],
                'quantity' => $rx['quantity'],
                'directions' => $rx['directions'],
                'refills' => $rx['refills'],
                'refills_allowed' => (int) ($rx['refills_allowed'] ?? ($rx['refills'] ?? 0)),
                'refills_remaining' => $rx['refills_remaining'] ?? null,
                'refill_until' => $rx['refill_until'] ?? null,
                'can_request_refill' => (bool) ($rx['can_request_refill'] ?? true),
                'is_closed' => (bool) ($rx['is_closed'] ?? false),
                'refill_request' => $rx['refill_request'] ?? null,
                'pharmacy' => $rx['pharmacy'],
                'rx_number' => $rx['rx_number'] ?? null,
                'prescribed_date' => $rx['prescribed_date'] ?? null,
                'prescriber_name' => $rx['prescriber_name'] ?? null,
                'comments' => $rx['comments'],
                'verification_status' => $rx['verification_status'] ?: 'Confirmed',
                'status' => $status,
                'created_at' => $rx['created_at'],
                'updated_at' => $rx['updated_at'] ?? $rx['created_at']
            ];
        }

        // Sort: Active first, then by begin_date DESC
        usort($unified, function ($a, $b) {
            if ($a['status'] === 'active' && $b['status'] !== 'active') return -1;
            if ($a['status'] !== 'active' && $b['status'] === 'active') return 1;
            return strcmp($b['begin_date'] ?? '', $a['begin_date'] ?? '');
        });

        return $unified;
    }

    /**
     * Record a medication for a patient. The medication may optionally
     * reference the medications catalog; the title is always stored
     * directly since it may be freely typed instead of catalog-selected.
     */
    public function store(int $patientId, ?int $medicationId, int $createdBy, array $details = []): array
    {
        $title = trim((string) ($details['title'] ?? ''));

        if ($title === '') {
            return [
                'success' => false,
                'message' => 'Title is required.'
            ];
        }

        if ($medicationId) {
            $medication = (new Medication())->where('id', $medicationId)->first();

            if (!$medication || $medication['deleted_at'] !== null) {
                return [
                    'success' => false,
                    'message' => 'Selected medication does not exist.'
                ];
            }
        }

        $data = $this->filterDetails($details);
        $data['title'] = $title;
        $data['patient_id'] = $patientId;
        $data['medication_id'] = $medicationId ?: null;
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['created_by'] = $createdBy;

        $id = (new PatientMedication())->create($data);

        if (!$id) {
            return [
                'success' => false,
                'message' => 'Failed to record medication.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Medication added successfully.',
            'data' => ['id' => $id]
        ];
    }

    /**
     * Update the detail fields on an existing patient medication record.
     */
    public function update(int $id, array $details, int $updatedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Medication record not found.'
            ];
        }

        $title = trim((string) ($details['title'] ?? ''));

        if ($title === '') {
            return [
                'success' => false,
                'message' => 'Title is required.'
            ];
        }

        $data = $this->filterDetails($details);
        $data['title'] = $title;
        $data['updated_at'] = date('Y-m-d H:i:s');
        $data['updated_by'] = $updatedBy;

        (new PatientMedication())->update($data, $id);

        return [
            'success' => true,
            'message' => 'Medication updated successfully.'
        ];
    }

    /**
     * Keep only recognized detail fields, converting empty strings to NULL
     * and normalizing is_primary_record to a strict 0/1.
     */
    private function filterDetails(array $details): array
    {
        $result = [];

        foreach (self::DETAIL_FIELDS as $field) {
            if ($field === 'title' || !array_key_exists($field, $details)) {
                continue;
            }

            if ($field === 'is_primary_record') {
                $result[$field] = in_array($details[$field], [1, '1', true, 'true'], true) ? 1 : 0;
                continue;
            }

            $result[$field] = $details[$field] === '' ? null : $details[$field];
        }

        return $result;
    }

    public function find(int $id): ?array
    {
        return (new PatientMedication())->where('id', $id)->first();
    }

    /**
     * Soft-delete a recorded patient medication.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Medication record not found.'
            ];
        }

        (new PatientMedication())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Medication removed successfully.'
        ];
    }
}
