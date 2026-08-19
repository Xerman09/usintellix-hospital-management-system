<?php

namespace App\Modules\PatientLedger\Services;

use App\Core\Database;
use App\Modules\PatientLedger\Models\PatientLedgerPayment;
use PDO;

class PatientLedgerService
{
    private const DETAIL_FIELDS = ['encounter_id', 'payer_type', 'payment_type', 'payment_date', 'payment_amount', 'adjustment_amount', 'notes'];

    /**
     * The patient's ledger for a date range: every billed code
     * (encounter_billing_codes, the "charge" side) merged with every
     * recorded payment/adjustment (patient_ledger_payments, the
     * "payment" side), sorted chronologically with a running balance,
     * plus grand totals across the whole range.
     */
    public function getLedger(int $patientId, string $from, string $to): array
    {
        $charges = $this->listCharges($patientId, $from, $to);
        $payments = $this->listPayments($patientId, $from, $to);

        $rows = array_merge($charges, $payments);

        usort($rows, fn ($a, $b) => [$a['entry_date'], $a['id']] <=> [$b['entry_date'], $b['id']]);

        $runningBalance = 0;
        $totalCharge = 0;
        $totalPayment = 0;
        $totalAdjustment = 0;

        foreach ($rows as &$row) {
            $runningBalance += $row['charge'] - $row['payment'] - $row['adjustment'];
            $row['balance'] = round($runningBalance, 2);

            $totalCharge += $row['charge'];
            $totalPayment += $row['payment'];
            $totalAdjustment += $row['adjustment'];
        }
        unset($row);

        return [
            'rows' => $rows,
            'totals' => [
                'units' => count($charges),
                'charge' => round($totalCharge, 2),
                'payment' => round($totalPayment, 2),
                'adjustment' => round($totalAdjustment, 2),
                'balance' => round($runningBalance, 2)
            ]
        ];
    }

    private function listCharges(int $patientId, string $from, string $to): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT ebc.id, ebc.code, ebc.code_type, ebc.description, ebc.fee AS charge, ebc.encounter_id,
                    e.date_of_service AS entry_date
             FROM encounter_billing_codes ebc
             JOIN encounters e ON e.id = ebc.encounter_id
             WHERE e.patient_id = :patient_id AND e.deleted_at IS NULL
               AND e.date_of_service >= :from AND e.date_of_service <= :to
             ORDER BY e.date_of_service ASC, ebc.id ASC"
        );
        $stmt->execute(['patient_id' => $patientId, 'from' => $from, 'to' => $to . ' 23:59:59']);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function (array $row) {
            return [
                'row_type' => 'charge',
                'id' => 'c' . $row['id'],
                'code' => $row['code'],
                'description' => $row['description'],
                'billed_date' => substr((string) $row['entry_date'], 0, 10),
                'payor' => null,
                'type' => $row['code_type'],
                'units' => 1,
                'charge' => (float) $row['charge'],
                'payment' => 0.0,
                'adjustment' => 0.0,
                'entry_date' => $row['entry_date'],
                'encounter_id' => (int) $row['encounter_id']
            ];
        }, $rows);
    }

    private function listPayments(int $patientId, string $from, string $to): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, encounter_id, payer_type, payment_type, payment_date, payment_amount, adjustment_amount, notes
             FROM patient_ledger_payments
             WHERE patient_id = :patient_id AND deleted_at IS NULL
               AND payment_date >= :from AND payment_date <= :to
             ORDER BY payment_date ASC, id ASC"
        );
        $stmt->execute(['patient_id' => $patientId, 'from' => $from, 'to' => $to]);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function (array $row) {
            $payorLabel = $row['payer_type'] === 'insurance' ? 'Insurance' : 'Patient';

            return [
                'row_type' => 'payment',
                'id' => 'p' . $row['id'],
                'code' => null,
                'description' => trim($row['payment_type'] . ' [' . $payorLabel . ' Payment]' . ($row['notes'] ? ' ' . $row['notes'] : '')),
                'billed_date' => $row['payment_date'],
                'payor' => $payorLabel,
                'type' => $payorLabel,
                'units' => null,
                'charge' => 0.0,
                'payment' => (float) $row['payment_amount'],
                'adjustment' => (float) $row['adjustment_amount'],
                'entry_date' => $row['payment_date'],
                'encounter_id' => $row['encounter_id'] !== null ? (int) $row['encounter_id'] : null
            ];
        }, $rows);
    }

    public function addPayment(int $patientId, array $data, int $userId): array
    {
        $amount = (float) ($data['payment_amount'] ?? 0);
        $adjustment = (float) ($data['adjustment_amount'] ?? 0);

        if ($amount <= 0 && $adjustment <= 0) {
            return ['success' => false, 'message' => 'Enter a payment or adjustment amount.'];
        }

        if (empty($data['payment_date'])) {
            return ['success' => false, 'message' => 'Payment date is required.'];
        }

        $values = [];

        foreach (self::DETAIL_FIELDS as $field) {
            $raw = $data[$field] ?? null;
            $values[$field] = ($raw === '' || $raw === null) ? null : $raw;
        }

        $values['payer_type'] = in_array($values['payer_type'], ['patient', 'insurance'], true) ? $values['payer_type'] : 'patient';
        $values['payment_type'] = $values['payment_type'] ?: 'COPAY';
        $values['payment_amount'] = $amount;
        $values['adjustment_amount'] = $adjustment;
        $values['patient_id'] = $patientId;
        $values['created_at'] = date('Y-m-d H:i:s');
        $values['created_by'] = $userId;

        $id = (new PatientLedgerPayment())->create($values);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to record payment.'];
        }

        return ['success' => true, 'message' => 'Payment recorded successfully.', 'data' => ['id' => $id]];
    }
}
