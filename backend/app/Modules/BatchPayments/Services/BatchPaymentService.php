<?php

namespace App\Modules\BatchPayments\Services;

use App\Core\Database;
use App\Modules\BatchPayments\Models\BatchPayment;
use App\Modules\BatchPayments\Models\BatchPaymentAllocation;
use App\Modules\PatientLedger\Models\PatientLedgerPayment;
use PDO;

class BatchPaymentService
{
    private const HEADER_FIELDS = [
        'payment_date', 'post_to_date', 'payment_method', 'check_number', 'payment_amount',
        'paying_entity', 'payment_category', 'payment_from', 'payor_id', 'deposit_date', 'description'
    ];

    /**
     * Search Payment tab: batch payments matching optional filters, each
     * with its distributed/undistributed totals so the list can flag
     * ones that still need allocating.
     */
    public function list(array $filters): array
    {
        $where = ['bp.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['from'])) {
            $where[] = 'bp.payment_date >= :from';
            $params['from'] = $filters['from'];
        }

        if (!empty($filters['to'])) {
            $where[] = 'bp.payment_date <= :to';
            $params['to'] = $filters['to'];
        }

        if (!empty($filters['payment_method'])) {
            $where[] = 'bp.payment_method = :payment_method';
            $params['payment_method'] = $filters['payment_method'];
        }

        if (!empty($filters['check_number'])) {
            $where[] = 'bp.check_number LIKE :check_number';
            $params['check_number'] = '%' . $filters['check_number'] . '%';
        }

        if (!empty($filters['payment_from'])) {
            $where[] = 'bp.payment_from LIKE :payment_from';
            $params['payment_from'] = '%' . $filters['payment_from'] . '%';
        }

        $stmt = Database::connection()->prepare(
            "SELECT bp.*,
                    COALESCE((SELECT SUM(bpa.payment_amount + bpa.adjustment_amount)
                              FROM batch_payment_allocations bpa
                              WHERE bpa.batch_payment_id = bp.id AND bpa.deleted_at IS NULL), 0) AS distributed_to_patients
             FROM batch_payments bp
             WHERE " . implode(' AND ', $where) . "
             ORDER BY bp.payment_date DESC, bp.id DESC
             LIMIT 300"
        );
        $stmt->execute($params);

        return array_map([$this, 'withTotals'], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * One batch payment's header plus every allocation made against it
     * (patient name included), for the New/Search Payment detail view.
     */
    public function find(int $id): ?array
    {
        $batch = (new BatchPayment())->where('id', $id)->first();

        if (!$batch || $batch['deleted_at'] !== null) {
            return null;
        }

        $stmt = Database::connection()->prepare(
            "SELECT bpa.*, TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS patient_name, p.patient_no,
                    e.date_of_service
             FROM batch_payment_allocations bpa
             JOIN patients p ON p.id = bpa.patient_id
             LEFT JOIN encounters e ON e.id = bpa.encounter_id
             WHERE bpa.batch_payment_id = :batch_payment_id AND bpa.deleted_at IS NULL
             ORDER BY bpa.id ASC"
        );
        $stmt->execute(['batch_payment_id' => $id]);

        $batch = $this->withTotals($batch);
        $batch['allocations'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $batch;
    }

    public function create(array $data, int $userId): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $values = $this->prepareHeader($data);
        $values['created_at'] = date('Y-m-d H:i:s');
        $values['created_by'] = $userId;

        $id = (new BatchPayment())->create($values);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to save the payment.'];
        }

        return ['success' => true, 'message' => 'Payment saved successfully.', 'data' => ['id' => $id]];
    }

    public function update(int $id, array $data, int $userId): array
    {
        $batch = (new BatchPayment())->where('id', $id)->first();

        if (!$batch || $batch['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Payment not found.'];
        }

        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $distributed = $this->distributedTotal($id, (float) $batch['distributed_to_global']);

        if ((float) $data['payment_amount'] < $distributed) {
            return [
                'success' => false,
                'message' => "Payment amount can't be less than the \${$distributed} already distributed."
            ];
        }

        $values = $this->prepareHeader($data);
        $values['updated_at'] = date('Y-m-d H:i:s');
        $values['updated_by'] = $userId;

        (new BatchPayment())->update($values, $id);

        return ['success' => true, 'message' => 'Payment updated successfully.'];
    }

    /**
     * Sets the "Distributed to Global" bucket directly (a manual amount
     * the user is deliberately setting aside without tying it to a
     * specific patient), clamped so it never exceeds what's left
     * undistributed.
     */
    public function setDistributedToGlobal(int $id, float $amount, int $userId): array
    {
        $batch = (new BatchPayment())->where('id', $id)->first();

        if (!$batch || $batch['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Payment not found.'];
        }

        $allocated = $this->allocatedToPatientsTotal($id);
        $maxGlobal = round((float) $batch['payment_amount'] - $allocated, 2);

        if ($amount < 0 || $amount > $maxGlobal) {
            return ['success' => false, 'message' => "Enter an amount between 0 and \${$maxGlobal}."];
        }

        (new BatchPayment())->update([
            'distributed_to_global' => $amount,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Updated.'];
    }

    /**
     * Allocates a slice of this batch payment to one patient (optionally
     * one of their encounters). Mirrors it into patient_ledger_payments
     * so it shows up on the Ledger / Fee Sheet / Billing Manager exactly
     * like any other posted payment -- those screens don't need to know
     * batch payments exist at all.
     */
    public function allocate(int $batchPaymentId, array $data, int $userId): array
    {
        $batch = (new BatchPayment())->where('id', $batchPaymentId)->first();

        if (!$batch || $batch['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Payment not found.'];
        }

        $patientId = (int) ($data['patient_id'] ?? 0);
        $encounterId = !empty($data['encounter_id']) ? (int) $data['encounter_id'] : null;
        $paymentAmount = round((float) ($data['payment_amount'] ?? 0), 2);
        $adjustmentAmount = round((float) ($data['adjustment_amount'] ?? 0), 2);

        if (!$patientId) {
            return ['success' => false, 'message' => 'Select a patient to allocate to.'];
        }

        if ($paymentAmount <= 0 && $adjustmentAmount <= 0) {
            return ['success' => false, 'message' => 'Enter a payment or adjustment amount.'];
        }

        $undistributed = round(
            (float) $batch['payment_amount'] - (float) $batch['distributed_to_global'] - $this->allocatedToPatientsTotal($batchPaymentId),
            2
        );

        if (($paymentAmount + $adjustmentAmount) > ($undistributed + 0.004)) {
            return ['success' => false, 'message' => "Only \${$undistributed} left undistributed on this payment."];
        }

        $payerType = $batch['paying_entity'] === 'insurance' ? 'insurance' : 'patient';

        $ledgerPaymentId = (new PatientLedgerPayment())->create([
            'patient_id' => $patientId,
            'encounter_id' => $encounterId,
            'payer_type' => $payerType,
            'payment_type' => $batch['payment_category'] ?: 'BATCH',
            'payment_date' => $batch['payment_date'],
            'payment_amount' => $paymentAmount,
            'adjustment_amount' => $adjustmentAmount,
            'notes' => trim(($data['notes'] ?? '') . ' [Batch #' . $batchPaymentId . ($batch['check_number'] ? ' / Check ' . $batch['check_number'] : '') . ']'),
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        if (!$ledgerPaymentId) {
            return ['success' => false, 'message' => 'Failed to post the allocation.'];
        }

        (new BatchPaymentAllocation())->create([
            'batch_payment_id' => $batchPaymentId,
            'patient_id' => $patientId,
            'encounter_id' => $encounterId,
            'payment_amount' => $paymentAmount,
            'adjustment_amount' => $adjustmentAmount,
            'notes' => $data['notes'] ?? null,
            'ledger_payment_id' => $ledgerPaymentId,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        return ['success' => true, 'message' => 'Allocated successfully.'];
    }

    /**
     * Removes one allocation, soft-deleting both the allocation row and
     * the ledger payment it posted so the money disappears from the
     * patient's ledger too (and becomes undistributed again).
     */
    public function removeAllocation(int $allocationId, int $userId): array
    {
        $allocation = (new BatchPaymentAllocation())->where('id', $allocationId)->first();

        if (!$allocation || $allocation['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Allocation not found.'];
        }

        (new BatchPaymentAllocation())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $allocationId);

        if ($allocation['ledger_payment_id']) {
            (new PatientLedgerPayment())->update([
                'deleted_at' => date('Y-m-d H:i:s'),
                'deleted_by' => $userId
            ], (int) $allocation['ledger_payment_id']);
        }

        return ['success' => true, 'message' => 'Allocation removed.'];
    }

    /**
     * Deletes a batch payment header. Refused while it still has active
     * allocations -- those need to be removed first so their linked
     * ledger payments are cleaned up individually rather than silently
     * orphaned/left behind.
     */
    public function remove(int $id, int $userId): array
    {
        $batch = (new BatchPayment())->where('id', $id)->first();

        if (!$batch || $batch['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Payment not found.'];
        }

        if ($this->allocatedToPatientsTotal($id) > 0) {
            return ['success' => false, 'message' => 'Remove this payment\'s allocations first.'];
        }

        (new BatchPayment())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Payment deleted.'];
    }

    private function allocatedToPatientsTotal(int $batchPaymentId): float
    {
        $stmt = Database::connection()->prepare(
            "SELECT COALESCE(SUM(payment_amount + adjustment_amount), 0) AS total
             FROM batch_payment_allocations
             WHERE batch_payment_id = :id AND deleted_at IS NULL"
        );
        $stmt->execute(['id' => $batchPaymentId]);

        return round((float) $stmt->fetchColumn(), 2);
    }

    private function distributedTotal(int $batchPaymentId, float $distributedToGlobal): float
    {
        return round($this->allocatedToPatientsTotal($batchPaymentId) + $distributedToGlobal, 2);
    }

    private function withTotals(array $batch): array
    {
        $allocated = $this->allocatedToPatientsTotal((int) $batch['id']);
        $global = round((float) $batch['distributed_to_global'], 2);
        $amount = round((float) $batch['payment_amount'], 2);

        $batch['payment_amount'] = $amount;
        $batch['distributed_to_global'] = $global;
        $batch['distributed_to_patients'] = $allocated;
        $batch['undistributed'] = round($amount - $global - $allocated, 2);

        return $batch;
    }

    private function validate(array $data): array
    {
        $errors = [];

        if (empty($data['payment_date'])) {
            $errors['payment_date'] = 'Date is required.';
        }

        if (empty($data['post_to_date'])) {
            $errors['post_to_date'] = 'Post To Date is required.';
        }

        if (!isset($data['payment_amount']) || (float) $data['payment_amount'] <= 0) {
            $errors['payment_amount'] = 'Payment amount must be greater than zero.';
        }

        if (empty($data['paying_entity']) || !in_array($data['paying_entity'], ['insurance', 'patient', 'other'], true)) {
            $errors['paying_entity'] = 'Select a paying entity.';
        }

        return $errors;
    }

    private function prepareHeader(array $data): array
    {
        $values = [];

        foreach (self::HEADER_FIELDS as $field) {
            $value = $data[$field] ?? null;
            $values[$field] = ($value === '' || $value === null) ? null : $value;
        }

        $values['payment_amount'] = round((float) ($values['payment_amount'] ?? 0), 2);
        $values['payment_method'] = $values['payment_method'] ?: 'check';

        return $values;
    }
}
