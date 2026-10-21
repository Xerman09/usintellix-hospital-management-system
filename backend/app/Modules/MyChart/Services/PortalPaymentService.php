<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use App\Modules\PatientLedger\Services\PatientLedgerService;
use PDO;
use Throwable;

/**
 * Statements and payments in My Chart (Phase 4).
 *
 * The balance is always recomputed from the ledger -- charges from theatre,
 * pharmacy, ward medicines, laboratory and imaging, less settled payments. No
 * total is ever stored, so a part-payment, a later charge or a voided charge all
 * take effect by themselves.
 *
 * Paying is deliberately two steps: the patient starts an attempt, which is
 * `pending` and changes nothing, and the money only reaches the ledger when the
 * attempt is settled. With the default provider ("cashier") the patient is given a
 * reference number and a cashier confirms the money; a real gateway would call
 * settleFromProvider() from its callback instead. Nothing else in the flow changes.
 */
class PortalPaymentService
{
    /** Who may confirm that money has arrived. */
    public const SETTLE_ROLES = ['admin', 'accountant', 'receptionist'];

    /**
     * The payment provider. 'cashier' means the portal records the patient's intent
     * and a cashier confirms it at the desk -- no gateway, no card data, and it works
     * on day one. A gateway is added by writing an adapter that calls
     * settleFromProvider() on its callback; the rest of this service is unchanged.
     */
    public const PROVIDER = 'cashier';

    /** A patient cannot start an attempt below this, to stop accidental one-peso rows. */
    public const MIN_AMOUNT = 1.0;

    // ------------------------------------------------------------------
    // The statement
    // ------------------------------------------------------------------

    /**
     * The patient's statement: every charge and settled payment in the period, grouped
     * into the visit it belongs to, with the money formatted the way the hospital's
     * settings say and the tax registration shown in the footer.
     */
    public static function statement(int $patientId, string $from, string $to): array
    {
        $ledger = (new PatientLedgerService())->getLedger($patientId, $from, $to);
        $money = self::moneySettings();

        $groups = [];
        foreach ($ledger['rows'] as $row) {
            // Group by the day the service happened (billed_date), not the day a clerk
            // keyed the charge in (entry_date) -- a patient reads their statement by visit.
            $key = $row['row_type'] === 'payment'
                ? 'payments'
                : substr((string) ($row['billed_date'] ?? $row['entry_date'] ?? ''), 0, 10);
            $groups[$key][] = $row;
        }

        $visits = [];
        foreach ($groups as $key => $rows) {
            if ($key === 'payments') {
                continue;
            }

            $charge = array_sum(array_column($rows, 'charge'));
            $visits[] = [
                'date' => $key,
                'rows' => array_map(static fn(array $r) => [
                    'description' => $r['description'],
                    'code' => $r['code'] ?? null,
                    'type' => $r['type'] ?? null,
                    'charge' => round((float) $r['charge'], 2),
                ], $rows),
                'charge' => round($charge, 2),
            ];
        }

        usort($visits, static fn($a, $b) => strcmp((string) $b['date'], (string) $a['date']));

        return [
            'from' => $from,
            'to' => $to,
            'visits' => $visits,
            'payments' => array_map(static fn(array $r) => [
                'date' => $r['entry_date'] ?? null,
                'description' => $r['description'],
                'amount' => round((float) $r['payment'], 2),
                'adjustment' => round((float) $r['adjustment'], 2),
            ], $groups['payments'] ?? []),
            'totals' => $ledger['totals'],
            'outstanding' => max(0, round((float) $ledger['totals']['balance'], 2)),
            'money' => $money,
            'tax' => self::taxOn((float) $ledger['totals']['charge'], $money),
        ];
    }

    /** What the patient still owes, for the home screen and Phase 6's To-Do. */
    public static function outstanding(int $patientId): array
    {
        $db = Database::connection();
        $to = (string) $db->query("SELECT CURDATE()")->fetchColumn();
        $from = (string) $db->query("SELECT DATE_SUB(CURDATE(), INTERVAL 5 YEAR)")->fetchColumn();

        $ledger = (new PatientLedgerService())->getLedger($patientId, $from, $to);
        $pending = self::pendingTotal($db, $patientId);

        return [
            'balance' => max(0, round((float) $ledger['totals']['balance'], 2)),
            'pending' => $pending,
            'money' => self::moneySettings(),
        ];
    }

    /** The hospital's currency settings, so every amount is shown the same way. */
    public static function moneySettings(): array
    {
        $db = Database::connection();

        try {
            $row = $db->query(
                "SELECT currency_code, currency_symbol, currency_position, decimal_places, tax_name, tax_rate_percent, tax_id_number
                 FROM business_settings LIMIT 1"
            )->fetch(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable $e) {
            $row = [];
        }

        return [
            'code' => $row['currency_code'] ?? 'PHP',
            'symbol' => $row['currency_symbol'] ?? '₱',
            'position' => $row['currency_position'] ?? 'prefix',
            'decimals' => isset($row['decimal_places']) ? (int) $row['decimal_places'] : 2,
            'tax_name' => $row['tax_name'] ?? null,
            'tax_rate' => isset($row['tax_rate_percent']) ? (float) $row['tax_rate_percent'] : null,
            'tax_id_number' => $row['tax_id_number'] ?? null,
        ];
    }

    /**
     * The tax already inside the charges.
     *
     * Hospital charges here are the price the patient pays, so the tax is taken as
     * included rather than added on top: at 12% VAT, amount / 1.12 is the net and the
     * rest is the tax. The statement says so in words, so nobody reads it as an extra.
     */
    private static function taxOn(float $gross, array $money): ?array
    {
        $rate = $money['tax_rate'];

        if ($rate === null || $rate <= 0 || $gross <= 0) {
            return null;
        }

        $net = $gross / (1 + ($rate / 100));

        return [
            'name' => $money['tax_name'] ?: 'Tax',
            'rate' => $rate,
            'included' => round($gross - $net, 2),
            'net' => round($net, 2),
            'registration' => $money['tax_id_number'],
        ];
    }

    // ------------------------------------------------------------------
    // Paying
    // ------------------------------------------------------------------

    /**
     * Start a payment. Creates a pending attempt and gives the patient a reference
     * number; nothing reaches the ledger until the attempt is settled.
     */
    public static function start(int $patientId, int $userId, $amount, ?string $note = null): array
    {
        $amount = round((float) $amount, 2);
        $owed = self::outstanding($patientId);

        if ($amount < self::MIN_AMOUNT) {
            return ['success' => false, 'message' => 'Enter how much you would like to pay.',
                'errors' => ['amount' => 'The amount must be at least ' . self::MIN_AMOUNT . '.']];
        }

        if ($owed['balance'] <= 0) {
            return ['success' => false, 'message' => 'There is nothing to pay at the moment.'];
        }

        if ($amount > $owed['balance']) {
            return ['success' => false, 'message' => 'That is more than you owe. You can pay any amount up to the balance.',
                'errors' => ['amount' => 'The most you can pay now is ' . number_format($owed['balance'], 2) . '.']];
        }

        $db = Database::connection();
        $reference = self::reference($db);

        $stmt = $db->prepare(
            "INSERT INTO portal_payment_attempts (patient_id, user_id, reference_no, amount, provider, status, note, created_at)
             VALUES (:p, :u, :ref, :amt, :prov, 'pending', :note, NOW())"
        );
        $stmt->execute([
            'p' => $patientId, 'u' => $userId, 'ref' => $reference, 'amt' => $amount,
            'prov' => self::PROVIDER, 'note' => $note !== null && trim($note) !== '' ? mb_substr(trim($note), 0, 255) : null,
        ]);

        return [
            'success' => true,
            'message' => 'Your payment is recorded. Show the reference number at the cashier to complete it.',
            'data' => [
                'attempt_id' => (int) $db->lastInsertId(),
                'reference_no' => $reference,
                'amount' => $amount,
                'provider' => self::PROVIDER,
                'status' => 'pending',
            ],
        ];
    }

    /** The patient changes their mind before anyone has taken the money. */
    public static function cancel(int $patientId, int $attemptId): array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "UPDATE portal_payment_attempts SET status = 'cancelled', updated_at = NOW()
             WHERE id = :id AND patient_id = :p AND status = 'pending'"
        );
        $stmt->execute(['id' => $attemptId, 'p' => $patientId]);

        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'message' => 'That payment can no longer be cancelled.', 'not_found' => true];
        }

        return ['success' => true, 'message' => 'Cancelled. Nothing was taken.'];
    }

    /**
     * The money has arrived: write it to the ledger and close the attempt.
     *
     * Used by the cashier confirming a portal payment, and by a gateway adapter from
     * its callback (pass the provider's reference and response). The whole thing is one
     * transaction, and an attempt that is already settled is never settled twice.
     */
    public static function settleFromProvider(int $attemptId, ?int $actorId, ?string $providerRef = null, ?string $rawResponse = null): array
    {
        $db = Database::connection();
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT portal_pay');

        try {
            $stmt = $db->prepare("SELECT * FROM portal_payment_attempts WHERE id = :id FOR UPDATE");
            $stmt->execute(['id' => $attemptId]);
            $attempt = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$attempt) {
                $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT portal_pay');
                return ['success' => false, 'message' => 'That payment was not found.', 'not_found' => true];
            }

            if ($attempt['status'] === 'settled') {
                $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT portal_pay');
                return ['success' => false, 'message' => 'That payment was already confirmed.'];
            }

            if ($attempt['status'] !== 'pending') {
                $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT portal_pay');
                return ['success' => false, 'message' => 'That payment is ' . $attempt['status'] . ' and cannot be confirmed.'];
            }

            // The payment row the ledger reads. No card columns are written from here.
            $pay = $db->prepare(
                "INSERT INTO patient_ledger_payments
                    (patient_id, payer_type, payment_type, source, reference_no, status, settled_at, payment_date,
                     payment_amount, adjustment_amount, notes, created_at, created_by)
                 VALUES (:p, 'patient', 'PORTAL', 'portal', :ref, 'settled', NOW(), CURDATE(), :amt, 0, :notes, NOW(), :by)"
            );
            $pay->execute([
                'p' => (int) $attempt['patient_id'],
                'ref' => $attempt['reference_no'],
                'amt' => $attempt['amount'],
                'notes' => $attempt['note'],
                'by' => $actorId,
            ]);
            $paymentId = (int) $db->lastInsertId();

            $db->prepare(
                "UPDATE portal_payment_attempts
                 SET status = 'settled', payment_id = :pay, provider_ref = :pref, raw_response = :raw,
                     settled_at = NOW(), settled_by = :by, updated_at = NOW()
                 WHERE id = :id"
            )->execute([
                'pay' => $paymentId, 'pref' => $providerRef, 'raw' => $rawResponse, 'by' => $actorId, 'id' => $attemptId,
            ]);

            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT portal_pay');
        } catch (Throwable $e) {
            $owns ? ($db->inTransaction() && $db->rollBack()) : $db->exec('ROLLBACK TO SAVEPOINT portal_pay');
            error_log('portal payment settle failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'The payment could not be confirmed.'];
        }

        return ['success' => true, 'message' => 'Payment confirmed and added to the ledger.',
            'data' => ['payment_id' => $paymentId, 'reference_no' => $attempt['reference_no'], 'amount' => (float) $attempt['amount']]];
    }

    /** The gateway (or the cashier) says it did not go through. */
    public static function fail(int $attemptId, ?int $actorId, ?string $rawResponse = null): array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "UPDATE portal_payment_attempts SET status = 'failed', raw_response = :raw, settled_by = :by, updated_at = NOW()
             WHERE id = :id AND status = 'pending'"
        );
        $stmt->execute(['raw' => $rawResponse, 'by' => $actorId, 'id' => $attemptId]);

        if ($stmt->rowCount() === 0) {
            return ['success' => false, 'message' => 'That payment is not waiting to be confirmed.', 'not_found' => true];
        }

        return ['success' => true, 'message' => 'Marked as not paid.'];
    }

    // ------------------------------------------------------------------
    // History and receipts
    // ------------------------------------------------------------------

    /** Payments the patient has made, and anything still waiting to be confirmed. */
    public static function history(int $patientId): array
    {
        $db = Database::connection();

        $paid = $db->prepare(
            "SELECT id, payment_date, payment_amount, adjustment_amount, payment_type, source, reference_no, notes, settled_at
             FROM patient_ledger_payments
             WHERE patient_id = :p AND deleted_at IS NULL AND status = 'settled'
             ORDER BY payment_date DESC, id DESC
             LIMIT 100"
        );
        $paid->execute(['p' => $patientId]);

        $waiting = $db->prepare(
            "SELECT id, reference_no, amount, status, note, created_at
             FROM portal_payment_attempts
             WHERE patient_id = :p AND status = 'pending'
             ORDER BY created_at DESC
             LIMIT 20"
        );
        $waiting->execute(['p' => $patientId]);

        return [
            'payments' => array_map(static fn(array $r) => [
                'id' => (int) $r['id'],
                'date' => $r['payment_date'],
                'amount' => round((float) $r['payment_amount'], 2),
                'adjustment' => round((float) $r['adjustment_amount'], 2),
                'how' => $r['source'] === 'portal' ? 'Paid online' : trim((string) $r['payment_type']),
                'reference_no' => $r['reference_no'],
                'note' => $r['notes'],
            ], $paid->fetchAll(PDO::FETCH_ASSOC)),
            'waiting' => array_map(static fn(array $r) => [
                'attempt_id' => (int) $r['id'],
                'reference_no' => $r['reference_no'],
                'amount' => round((float) $r['amount'], 2),
                'note' => $r['note'],
                'started_at' => $r['created_at'],
            ], $waiting->fetchAll(PDO::FETCH_ASSOC)),
            'money' => self::moneySettings(),
        ];
    }

    /** One payment, as a receipt the patient can print. Null when it is not theirs. */
    public static function receipt(int $patientId, int $paymentId): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT pay.id, pay.payment_date, pay.payment_amount, pay.payment_type, pay.source, pay.reference_no,
                    pay.notes, pay.settled_at,
                    p.patient_no, TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name
             FROM patient_ledger_payments pay
             JOIN patients p ON p.id = pay.patient_id
             WHERE pay.id = :id AND pay.patient_id = :p AND pay.deleted_at IS NULL AND pay.status = 'settled'"
        );
        $stmt->execute(['id' => $paymentId, 'p' => $patientId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $money = self::moneySettings();

        return [
            'payment_id' => (int) $row['id'],
            'reference_no' => $row['reference_no'],
            'date' => $row['payment_date'],
            'settled_at' => $row['settled_at'],
            'amount' => round((float) $row['payment_amount'], 2),
            'how' => $row['source'] === 'portal' ? 'Paid online' : trim((string) $row['payment_type']),
            'note' => $row['notes'],
            'patient' => ['name' => $row['patient_name'], 'patient_no' => $row['patient_no']],
            'money' => $money,
            'tax' => self::taxOn((float) $row['payment_amount'], $money),
            'balance_after' => self::outstanding($patientId)['balance'],
        ];
    }

    // ------------------------------------------------------------------
    // The cashier's side
    // ------------------------------------------------------------------

    /** Portal payments waiting for someone at the desk to confirm the money. */
    public static function queue(): array
    {
        $db = Database::connection();
        $stmt = $db->query(
            "SELECT a.id, a.reference_no, a.amount, a.note, a.created_at, a.patient_id,
                    p.patient_no, TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name
             FROM portal_payment_attempts a
             JOIN patients p ON p.id = a.patient_id
             WHERE a.status = 'pending'
             ORDER BY a.created_at
             LIMIT 200"
        );

        $items = array_map(static fn(array $r) => [
            'attempt_id' => (int) $r['id'],
            'reference_no' => $r['reference_no'],
            'amount' => round((float) $r['amount'], 2),
            'note' => $r['note'],
            'started_at' => $r['created_at'],
            'patient' => ['id' => (int) $r['patient_id'], 'name' => $r['patient_name'], 'mrn' => $r['patient_no']],
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'items' => $items,
            'waiting' => count($items),
            'amount_waiting' => round(array_sum(array_column($items, 'amount')), 2),
            'money' => self::moneySettings(),
        ];
    }

    private static function pendingTotal(PDO $db, int $patientId): float
    {
        $stmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) FROM portal_payment_attempts WHERE patient_id = :p AND status = 'pending'");
        $stmt->execute(['p' => $patientId]);

        return round((float) $stmt->fetchColumn(), 2);
    }

    /** A reference the patient can read out at the desk: PAY-26A7F3-0042. */
    private static function reference(PDO $db): string
    {
        $year = (string) $db->query("SELECT DATE_FORMAT(NOW(), '%y%m')")->fetchColumn();

        for ($i = 0; $i < 8; $i++) {
            $candidate = 'PAY-' . $year . '-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
            $check = $db->prepare("SELECT 1 FROM portal_payment_attempts WHERE reference_no = :r");
            $check->execute(['r' => $candidate]);

            if (!$check->fetchColumn()) {
                return $candidate;
            }
        }

        return 'PAY-' . $year . '-' . strtoupper(bin2hex(random_bytes(5)));
    }
}
