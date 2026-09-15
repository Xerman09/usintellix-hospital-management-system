<?php

namespace App\Modules\EobPosting\Services;

use App\Core\Database;
use App\Modules\Encounters\Models\Encounter;
use App\Modules\PatientLedger\Models\PatientLedgerPayment;
use PDO;

class EobPostingService
{
    /**
     * "Invoice Search": every encounter (an "invoice" in OpenEMR's EOB
     * Posting terms) matching the given filters, flat one-row-per-encounter
     * -- not grouped like Billing Manager, since EOB Posting is about
     * finding one specific invoice to post a payment against, not
     * reviewing a patient's whole claim history at once. $providerId (set
     * only for a doctor caller) applies the same patient-scoping rule
     * used everywhere else in this billing feature set.
     */
    public function searchInvoices(array $filters, ?int $providerId): array
    {
        $where = ['e.deleted_at IS NULL'];
        $params = [];

        if ($providerId) {
            $where[] = 'p.provider_id = :provider_id';
            $params['provider_id'] = $providerId;
        }

        if (!empty($filters['name'])) {
            // Accepts "Last, First" (OpenEMR's own convention) or a bare
            // search term matched against either name field.
            $parts = array_map('trim', explode(',', $filters['name'], 2));

            if (count($parts) === 2 && $parts[0] !== '' && $parts[1] !== '') {
                $where[] = '(p.last_name LIKE :last_name AND p.first_name LIKE :first_name)';
                $params['last_name'] = '%' . $parts[0] . '%';
                $params['first_name'] = '%' . $parts[1] . '%';
            } else {
                $where[] = '(p.first_name LIKE :name_any OR p.last_name LIKE :name_any)';
                $params['name_any'] = '%' . $parts[0] . '%';
            }
        }

        if (!empty($filters['chart_id'])) {
            $where[] = 'p.patient_no LIKE :chart_id';
            $params['chart_id'] = '%' . $filters['chart_id'] . '%';
        }

        if (!empty($filters['encounter'])) {
            $where[] = 'e.id = :encounter_id';
            $params['encounter_id'] = (int) $filters['encounter'];
        }

        if (!empty($filters['service_date_from'])) {
            $where[] = 'e.date_of_service >= :from';
            $params['from'] = $filters['service_date_from'];
        }

        if (!empty($filters['service_date_to'])) {
            $where[] = 'e.date_of_service <= :to';
            $params['to'] = $filters['service_date_to'] . ' 23:59:59';
        }

        $type = $filters['type'] ?? 'open';

        if ($type === 'open') {
            $where[] = "e.bill_status != 'cleared'";
        } elseif ($type === 'closed') {
            $where[] = "e.bill_status = 'cleared'";
        }

        $stmt = Database::connection()->prepare(
            "SELECT e.id AS encounter_id, e.patient_id, e.date_of_service, e.bill_status,
                    p.patient_no, TRIM(CONCAT(p.first_name, ' ', p.last_name)) AS patient_name,
                    COALESCE((SELECT SUM(ebc.fee * ebc.units)
                              FROM encounter_billing_codes ebc
                              WHERE ebc.encounter_id = e.id AND ebc.deleted_at IS NULL), 0) AS total_charges,
                    COALESCE((SELECT SUM(plp.payment_amount + plp.adjustment_amount)
                              FROM patient_ledger_payments plp
                              WHERE plp.encounter_id = e.id AND plp.deleted_at IS NULL), 0) AS total_payments
             FROM encounters e
             JOIN patients p ON p.id = e.patient_id AND p.deleted_at IS NULL
             WHERE " . implode(' AND ', $where) . "
             ORDER BY e.date_of_service DESC, e.id DESC
             LIMIT 200"
        );
        $stmt->execute($params);

        return array_map(function (array $row) {
            $charges = round((float) $row['total_charges'], 2);
            $payments = round((float) $row['total_payments'], 2);

            return [
                'encounter_id' => (int) $row['encounter_id'],
                'patient_id' => (int) $row['patient_id'],
                'patient_no' => $row['patient_no'],
                'patient_name' => $row['patient_name'],
                'date_of_service' => $row['date_of_service'],
                'bill_status' => $row['bill_status'],
                'total_charges' => $charges,
                'total_payments' => $payments,
                'balance_due' => round($charges - $payments, 2)
            ];
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Posts one "Post Item" payment (Payer/Source/Pay Date/Deposit
     * Date/Amount/Pt Debt) against a specific invoice (encounter). Writes
     * straight to patient_ledger_payments -- same table every other
     * posted payment in this app lands in (Fee Sheet copay, Ledger
     * payment, Batch Payment allocation), so it shows up everywhere those
     * already do without any of those screens needing to change.
     */
    public function postPayment(array $data, int $userId): array
    {
        $encounterId = (int) ($data['encounter_id'] ?? 0);
        $amount = round((float) ($data['amount'] ?? 0), 2);

        if (!$encounterId) {
            return ['success' => false, 'message' => 'Select an invoice to post against.'];
        }

        if ($amount <= 0) {
            return ['success' => false, 'message' => 'Enter an amount greater than zero.'];
        }

        if (empty($data['pay_date'])) {
            return ['success' => false, 'message' => 'Pay Date is required.'];
        }

        $encounter = (new Encounter())->where('id', $encounterId)->first();

        if (!$encounter || $encounter['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Invoice not found.'];
        }

        $payerType = ($data['payer'] ?? 'patient') === 'insurance' ? 'insurance' : 'patient';

        $noteParts = [];
        if (!empty($data['source'])) {
            $noteParts[] = 'Source: ' . $data['source'];
        }
        if (!empty($data['deposit_date'])) {
            $noteParts[] = 'Deposit Date: ' . $data['deposit_date'];
        }
        if (!empty($data['pt_debt'])) {
            $noteParts[] = 'Patient Debt';
        }

        $ledgerPaymentId = (new PatientLedgerPayment())->create([
            'patient_id' => (int) $encounter['patient_id'],
            'encounter_id' => $encounterId,
            'payer_type' => $payerType,
            'payment_type' => 'EOB',
            'payment_date' => $data['pay_date'],
            'payment_amount' => $amount,
            'adjustment_amount' => 0,
            'notes' => implode(' / ', $noteParts) ?: null,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        if (!$ledgerPaymentId) {
            return ['success' => false, 'message' => 'Failed to post the payment.'];
        }

        return ['success' => true, 'message' => 'Payment posted successfully.', 'data' => ['ledger_payment_id' => $ledgerPaymentId]];
    }
}
