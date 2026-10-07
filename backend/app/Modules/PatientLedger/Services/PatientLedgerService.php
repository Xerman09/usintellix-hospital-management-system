<?php

namespace App\Modules\PatientLedger\Services;

use App\Core\Database;
use App\Core\FieldEncryption;
use App\Modules\PatientLedger\Models\PatientLedgerPayment;
use PDO;

class PatientLedgerService
{
    private const DETAIL_FIELDS = ['encounter_id', 'payer_type', 'payment_type', 'card_number', 'card_expiry', 'card_cvv', 'payment_date', 'payment_amount', 'adjustment_amount', 'notes'];

    /**
     * The patient's ledger for a date range: every billed code
     * (encounter_billing_codes, the "charge" side) merged with every
     * recorded payment/adjustment (patient_ledger_payments, the
     * "payment" side), sorted chronologically with a running balance,
     * plus grand totals across the whole range.
     */
    public function getLedger(int $patientId, string $from, string $to): array
    {
        $charges = array_merge($this->listCharges($patientId, $from, $to), $this->listPharmacyCharges($patientId, $from, $to), $this->listSurgeryCharges($patientId, $from, $to),
            $this->listInpatientMedCharges($patientId, $from, $to));
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
            "SELECT ebc.id, ebc.code, ebc.code_type, ebc.description, ebc.fee, ebc.units, ebc.encounter_id,
                    e.date_of_service AS entry_date
             FROM encounter_billing_codes ebc
             JOIN encounters e ON e.id = ebc.encounter_id
             WHERE e.patient_id = :patient_id AND e.deleted_at IS NULL AND ebc.deleted_at IS NULL
               AND e.date_of_service >= :from AND e.date_of_service <= :to
             ORDER BY e.date_of_service ASC, ebc.id ASC"
        );
        $stmt->execute(['patient_id' => $patientId, 'from' => $from, 'to' => $to . ' 23:59:59']);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(function (array $row) {
            $units = (int) $row['units'] ?: 1;
            $fee = (float) $row['fee'];

            return [
                'row_type' => 'charge',
                'id' => 'c' . $row['id'],
                'code' => $row['code'],
                'description' => $row['description'],
                'billed_date' => substr((string) $row['entry_date'], 0, 10),
                'payor' => null,
                'type' => $row['code_type'],
                'units' => $units,
                'charge' => round($fee * $units, 2),
                'payment' => 0.0,
                'adjustment' => 0.0,
                'entry_date' => $row['entry_date'],
                'encounter_id' => (int) $row['encounter_id']
            ];
        }, $rows);
    }

    /** Medicine dispensed by the pharmacy (not undone), one row per medicine per dispensing. */
    private function listPharmacyCharges(int $patientId, string $from, string $to): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT c.id, c.description, c.quantity, c.net_amount, c.discount_amount, c.encounter_id, c.charge_date, c.created_at,
                    d.dispense_number, d.discount_type
             FROM pharmacy_charges c
             JOIN prescription_dispenses d ON d.id = c.dispense_id
             WHERE c.patient_id = :patient_id AND c.status = 'charged'
               AND c.charge_date >= :from AND c.charge_date <= :to
             ORDER BY c.charge_date ASC, c.id ASC"
        );
        $stmt->execute(['patient_id' => $patientId, 'from' => $from, 'to' => $to]);

        return array_map(fn(array $row) => [
            'row_type' => 'charge',
            'id' => 'm' . $row['id'],
            'code' => $row['dispense_number'],
            'description' => $row['description'] . ((float) $row['discount_amount'] > 0
                ? ' (less ₱' . number_format((float) $row['discount_amount'], 2) . ($row['discount_type'] === 'senior' ? ' Senior Citizen' : ($row['discount_type'] === 'pwd' ? ' PWD' : '')) . ' discount)' : ''),
            'billed_date' => $row['charge_date'],
            'payor' => null,
            'type' => 'Pharmacy',
            'units' => 1,
            'charge' => round((float) $row['net_amount'], 2),
            'payment' => 0.0,
            'adjustment' => 0.0,
            // Same-day ordering with visit charges: when it was dispensed.
            'entry_date' => $row['created_at'] ?: $row['charge_date'],
            'encounter_id' => $row['encounter_id'] !== null ? (int) $row['encounter_id'] : null
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** OR charges (fees, supplies, medicines, implants) not voided, one row per charge. */
    private function listSurgeryCharges(int $patientId, string $from, string $to): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT ch.id, ch.description, ch.quantity, ch.net_amount, ch.discount_amount, ch.charge_date, ch.created_at, c.case_number, c.discount_type
             FROM or_charges ch
             JOIN or_surgical_cases c ON c.id = ch.case_id
             WHERE ch.patient_id = :patient_id AND ch.status = 'charged'
               AND ch.charge_date >= :from AND ch.charge_date <= :to
             ORDER BY ch.charge_date ASC, ch.id ASC"
        );
        $stmt->execute(['patient_id' => $patientId, 'from' => $from, 'to' => $to]);

        return array_map(fn(array $row) => [
            'row_type' => 'charge',
            'id' => 's' . $row['id'],
            'code' => $row['case_number'],
            'description' => $row['description'] . ((float) $row['quantity'] != 1.0 ? ' x ' . rtrim(rtrim(number_format((float) $row['quantity'], 3, '.', ''), '0'), '.') : '')
                . ((float) $row['discount_amount'] > 0
                ? ' (less ₱' . number_format((float) $row['discount_amount'], 2) . ($row['discount_type'] === 'senior' ? ' Senior Citizen' : ($row['discount_type'] === 'pwd' ? ' PWD' : '')) . ' discount)' : ''),
            'billed_date' => $row['charge_date'],
            'payor' => null,
            'type' => 'Surgery',
            'units' => 1,
            'charge' => round((float) $row['net_amount'], 2),
            'payment' => 0.0,
            'adjustment' => 0.0,
            'entry_date' => $row['created_at'] ?: $row['charge_date'],
            'encounter_id' => null
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** Medicines given on the ward (MAR), taken from stock: one row per dose, not voided. */
    private function listInpatientMedCharges(int $patientId, string $from, string $to): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT ch.id, ch.description, ch.net_amount, ch.charge_date, r.given_at, ch.created_at, a.admission_number
             FROM inpatient_med_charges ch
             JOIN inpatient_med_administrations r ON r.id = ch.administration_id
             JOIN inpatient_admissions a ON a.id = ch.admission_id
             WHERE ch.patient_id = :patient_id AND ch.status = 'charged'
               AND ch.charge_date >= :from AND ch.charge_date <= :to
             ORDER BY ch.charge_date ASC, ch.id ASC"
        );
        $stmt->execute(['patient_id' => $patientId, 'from' => $from, 'to' => $to]);

        return array_map(fn(array $row) => [
            'row_type' => 'charge',
            'id' => 'w' . $row['id'],
            'code' => $row['admission_number'],
            'description' => $row['description'],
            'billed_date' => $row['charge_date'],
            'payor' => null,
            'type' => 'Inpatient medicine',
            'units' => 1,
            'charge' => round((float) $row['net_amount'], 2),
            'payment' => 0.0,
            'adjustment' => 0.0,
            // Ordered by when the dose was given.
            'entry_date' => $row['given_at'] ?: $row['created_at'],
            'encounter_id' => null
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function listPayments(int $patientId, string $from, string $to): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, encounter_id, payer_type, payment_type, card_number, card_expiry, card_cvv, payment_date, payment_amount, adjustment_amount, notes
             FROM patient_ledger_payments
             WHERE patient_id = :patient_id AND deleted_at IS NULL
               AND payment_date >= :from AND payment_date <= :to
             ORDER BY payment_date ASC, id ASC"
        );
        $stmt->execute(['patient_id' => $patientId, 'from' => $from, 'to' => $to]);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $rows = FieldEncryption::decryptRows($rows, ['card_number', 'card_expiry', 'card_cvv']);

        return array_map(function (array $row) {
            $payorLabel = $row['payer_type'] === 'insurance' ? 'Insurance' : 'Patient';
            $cardSuffix = !empty($row['card_number']) ? ' (' . FieldEncryption::maskCard($row['card_number']) . ')' : '';

            return [
                'row_type' => 'payment',
                'id' => 'p' . $row['id'],
                'code' => null,
                'description' => trim($row['payment_type'] . $cardSuffix . ' [' . $payorLabel . ' Payment]' . ($row['notes'] ? ' ' . $row['notes'] : '')),
                'billed_date' => $row['payment_date'],
                'payor' => $payorLabel,
                'type' => $payorLabel,
                'units' => null,
                'charge' => 0.0,
                'payment' => (float) $row['payment_amount'],
                'adjustment' => (float) $row['adjustment_amount'],
                'entry_date' => $row['payment_date'],
                'encounter_id' => $row['encounter_id'] !== null ? (int) $row['encounter_id'] : null,
                'card_number_masked' => !empty($row['card_number']) ? FieldEncryption::maskCard($row['card_number']) : null
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
