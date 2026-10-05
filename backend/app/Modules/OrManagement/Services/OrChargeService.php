<?php

namespace App\Modules\OrManagement\Services;

use App\Core\Database;
use App\Modules\Dispensing\Services\DispensingService;
use PDO;
use Throwable;

/**
 * OR charges (Surgery Phase 6): what a surgery costs the patient, posted
 * to the patient ledger (type 'Surgery').
 *
 *   * Fees: the OR room fee, the surgeon's, assistant's and anesthesia
 *     fees -- filled in from the surgery catalog, changeable when billing.
 *   * Items: every supply, medicine, fluid, blood product and implant
 *     recorded on the case; stock items at the catalog selling price.
 *   * Discount: Senior Citizen / PWD 20% (with the ID number) or another
 *     percentage with a reason, applied to every line posted.
 *   * A charge can be voided with a reason; removing an item from the case
 *     voids its charge. Lines can be posted in more than one go (e.g. an
 *     item added after billing).
 *
 * PhilHealth case rates are recorded on the catalog only, not deducted.
 */
class OrChargeService
{
    public const TYPES = [
        'or_fee' => 'OR room fee', 'surgeon_fee' => "Surgeon's fee", 'assistant_fee' => "Assistant surgeon's fee",
        'anesthesia_fee' => 'Anesthesia fee', 'supply' => 'Supply', 'medicine' => 'Medicine', 'fluid' => 'IV fluid',
        'blood' => 'Blood product', 'implant' => 'Implant', 'other' => 'Other'
    ];

    /** Fee lines: one live charge each per case. */
    private const FEES = ['or_fee', 'surgeon_fee', 'assistant_fee', 'anesthesia_fee'];

    private const BILLABLE_STAGES = ['Closing / Extubation', 'In PACU', 'Transferred / Discharged'];

    /** Charges posted, lines still to charge, totals and the discount. */
    public function summary(int $caseId): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT c.*, su.default_or_fee, su.default_surgeon_fee, su.default_anesthesia_fee, su.philhealth_case_rate_code, su.philhealth_case_rate_amount,
                    su.name AS surgery_name, (SELECT p.id FROM patients p WHERE p.id = c.patient_id) AS patient_on_file
             FROM or_surgical_cases c LEFT JOIN surgeries su ON su.id = c.surgery_id WHERE c.id = :id"
        );
        $stmt->execute(['id' => $caseId]);
        $case = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$case) {
            return null;
        }

        $stmt = $db->prepare(
            "SELECT ch.*, " . self::userNameSql('ch.created_by') . " AS posted_by, " . self::userNameSql('ch.voided_by') . " AS voided_by_name
             FROM or_charges ch WHERE ch.case_id = :c ORDER BY ch.id"
        );
        $stmt->execute(['c' => $caseId]);
        $charges = array_map(fn($r) => [
            'id' => (int) $r['id'], 'charge_type' => $r['charge_type'], 'type_label' => self::TYPES[$r['charge_type']] ?? $r['charge_type'],
            'item_id' => $r['item_id'] !== null ? (int) $r['item_id'] : null, 'description' => $r['description'], 'quantity' => (float) $r['quantity'],
            'unit_price' => (float) $r['unit_price'], 'gross_amount' => (float) $r['gross_amount'], 'discount_amount' => (float) $r['discount_amount'],
            'net_amount' => (float) $r['net_amount'], 'charge_date' => $r['charge_date'], 'status' => $r['status'], 'posted_by' => $r['posted_by'],
            'created_at' => $r['created_at'], 'voided_at' => $r['voided_at'], 'voided_by_name' => $r['voided_by_name'], 'void_reason' => $r['void_reason']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
        $live = array_filter($charges, fn($c) => $c['status'] === 'charged');

        $sum = fn(string $k) => round(array_sum(array_column($live, $k)), 2);
        $why = $this->cannotBill($case);

        return [
            'can_bill' => $why === null,
            'blocked_reason' => $why,
            'billing_status' => $case['billing_status'],
            'billed_at' => $case['billed_at'],
            'charges' => $charges,
            'pending' => $why === null ? $this->pending($case, $live) : [],
            'totals' => ['gross' => $sum('gross_amount'), 'discount' => $sum('discount_amount'), 'net' => $sum('net_amount')],
            'discount' => $case['discount_type'] ? ['type' => $case['discount_type'], 'rate' => (float) $case['discount_rate'], 'id_no' => $case['discount_id_no'], 'reason' => $case['discount_reason']] : null,
            'discounts' => DispensingService::DISCOUNTS,
            'philhealth' => $case['philhealth_case_rate_code'] || $case['philhealth_case_rate_amount'] !== null
                ? ['code' => $case['philhealth_case_rate_code'], 'amount' => $case['philhealth_case_rate_amount'] !== null ? (float) $case['philhealth_case_rate_amount'] : null] : null,
            'types' => self::TYPES
        ];
    }

    private function cannotBill(array $case): ?string
    {
        if ($case['perioperative_stage'] === 'Cancelled') {
            return 'The case was cancelled.';
        }
        if (!$case['patient_on_file']) {
            return 'This case is not linked to a patient on file, so it can\'t be charged to a ledger.';
        }
        if (!in_array($case['perioperative_stage'], self::BILLABLE_STAGES, true)) {
            return 'Charges are posted from closing on, once what was used is known.';
        }
        return null;
    }

    /** Lines not yet charged: the fees (from the catalog) and the items recorded on the case. */
    private function pending(array $case, array $live): array
    {
        $charged = array_column($live, 'charge_type');
        $out = [];
        $fee = function (string $type, string $description, $price, ?int $provider) use (&$out, $charged) {
            if (!in_array($type, $charged, true)) {
                $out[] = ['key' => $type, 'charge_type' => $type, 'type_label' => self::TYPES[$type], 'item_id' => null, 'provider_user_id' => $provider,
                    'description' => mb_substr($description, 0, 255), 'quantity' => 1.0, 'unit_price' => $price !== null ? (float) $price : null];
            }
        };
        $what = $case['surgery_name'] ?: $case['procedure_name'];
        $fee('or_fee', "OR room fee — {$what} ({$case['or_suite_name']})", $case['default_or_fee'], null);
        $fee('surgeon_fee', "Surgeon's fee — {$case['lead_surgeon']}", $case['default_surgeon_fee'], $case['lead_surgeon_user_id'] ? (int) $case['lead_surgeon_user_id'] : null);
        if ($case['assistant_surgeon']) {
            $fee('assistant_fee', "Assistant surgeon's fee — {$case['assistant_surgeon']}", null, $case['assistant_surgeon_user_id'] ? (int) $case['assistant_surgeon_user_id'] : null);
        }
        if ($case['anesthesiologist_user_id']) {
            $fee('anesthesia_fee', "Anesthesia fee — {$case['anesthesiologist']} ({$case['anesthesia_type']})", $case['default_anesthesia_fee'], (int) $case['anesthesiologist_user_id']);
        }

        $stmt = Database::connection()->prepare(
            "SELECT i.id, i.kind, i.name, i.quantity, i.dose, i.lot_number, d.selling_price, du.name AS unit_name
             FROM or_case_items i LEFT JOIN drugs d ON d.id = i.drug_id LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             WHERE i.case_id = :c AND i.voided_at IS NULL
               AND NOT EXISTS (SELECT 1 FROM or_charges ch WHERE ch.item_id = i.id AND ch.status = 'charged')
             ORDER BY i.id"
        );
        $stmt->execute(['c' => $case['id']]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $i) {
            $qty = $i['quantity'] !== null ? (float) $i['quantity'] : 1.0;
            $out[] = [
                'key' => "item{$i['id']}", 'charge_type' => $i['kind'], 'type_label' => self::TYPES[$i['kind']] ?? $i['kind'], 'item_id' => (int) $i['id'],
                'provider_user_id' => null,
                'description' => mb_substr($i['name'] . ($i['kind'] === 'implant' && $i['lot_number'] ? " (lot {$i['lot_number']})" : '')
                    . ($i['dose'] && in_array($i['kind'], ['medicine', 'fluid', 'blood'], true) ? " — {$i['dose']}" : ''), 0, 255),
                'quantity' => $qty, 'unit_name' => $i['unit_name'],
                'unit_price' => $i['selling_price'] !== null ? (float) $i['selling_price'] : null
            ];
        }
        return $out;
    }

    /**
     * Posts charges. data: lines [{charge_type, item_id?, description,
     * quantity, unit_price, provider_user_id?}] (lines priced 0 are
     * skipped), discount_type? (senior | pwd | other | none),
     * discount_id_no?, discount_rate? (other), discount_reason?
     */
    public function post(int $caseId, array $data, array $user): array
    {
        $userId = (int) $user['id'];
        $lines = is_array($data['lines'] ?? null) ? array_values($data['lines']) : [];
        $db = Database::connection();
        $owns = $this->begin($db);
        try {
            $fail = function (string $message, array $errors = []) use ($db, $owns) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $message, 'errors' => $errors ?: null];
            };
            $stmt = $db->prepare(
                "SELECT c.*, (SELECT p.id FROM patients p WHERE p.id = c.patient_id) AS patient_on_file FROM or_surgical_cases c WHERE c.id = :id FOR UPDATE"
            );
            $stmt->execute(['id' => $caseId]);
            $case = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$case) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Surgical case not found.', 'not_found' => true];
            }
            $why = $this->cannotBill($case);
            if ($why !== null) {
                return $fail($why);
            }

            // Discount: the one given now, else the one already used for this case.
            $discount = $this->discount($data, $case);
            if (isset($discount['error'])) {
                return $fail($discount['error'], [$discount['field'] => $discount['error']]);
            }

            $stmt = $db->prepare("SELECT charge_type, item_id FROM or_charges WHERE case_id = :c AND status = 'charged'");
            $stmt->execute(['c' => $caseId]);
            $existing = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $chargedFees = array_column($existing, 'charge_type');
            $chargedItems = array_map('intval', array_filter(array_column($existing, 'item_id')));

            $errors = [];
            $rows = [];
            $seenFees = [];
            $seenItems = [];
            foreach ($lines as $n => $l) {
                $type = (string) ($l['charge_type'] ?? '');
                $key = "lines.{$n}";
                if (!isset(self::TYPES[$type])) {
                    $errors[$key] = 'Unknown charge type.';
                    continue;
                }
                $price = $l['unit_price'] ?? '';
                if ($price === '' || $price === null) {
                    continue; // left blank: not charged now
                }
                if (!is_numeric($price) || (float) $price < 0 || (float) $price > 10000000) {
                    $errors[$key] = 'Enter the price as an amount.';
                    continue;
                }
                $qty = (float) ($l['quantity'] ?? 1);
                if ($qty <= 0 || $qty > 100000) {
                    $errors[$key] = 'Enter the quantity.';
                    continue;
                }
                if ((float) $price == 0.0) {
                    continue;
                }
                $description = trim((string) ($l['description'] ?? ''));
                if ($description === '') {
                    $errors[$key] = 'Describe the charge.';
                    continue;
                }

                $itemId = (int) ($l['item_id'] ?? 0) ?: null;
                if (in_array($type, self::FEES, true)) {
                    if (in_array($type, $chargedFees, true) || isset($seenFees[$type])) {
                        $errors[$key] = self::TYPES[$type] . ' is already charged. Void it first to charge it again.';
                        continue;
                    }
                    $seenFees[$type] = true;
                    $itemId = null;
                } elseif ($itemId) {
                    $stmt = $db->prepare("SELECT kind, voided_at FROM or_case_items WHERE id = :id AND case_id = :c");
                    $stmt->execute(['id' => $itemId, 'c' => $caseId]);
                    $item = $stmt->fetch(PDO::FETCH_ASSOC);
                    if (!$item || $item['voided_at']) {
                        $errors[$key] = 'That item is no longer on the case.';
                        continue;
                    }
                    if (in_array($itemId, $chargedItems, true) || isset($seenItems[$itemId])) {
                        $errors[$key] = 'That item is already charged.';
                        continue;
                    }
                    $seenItems[$itemId] = true;
                    $type = $item['kind'];
                } elseif ($type !== 'other') {
                    $type = 'other';
                }

                $gross = round($qty * (float) $price, 2);
                $off = round($gross * $discount['rate'] / 100, 2);
                $rows[] = [
                    'charge_type' => $type, 'item_id' => $itemId, 'provider_user_id' => in_array($type, self::FEES, true) ? ((int) ($l['provider_user_id'] ?? 0) ?: null) : null,
                    'description' => mb_substr($description, 0, 255), 'quantity' => round($qty, 3), 'unit_price' => round((float) $price, 2),
                    'gross_amount' => $gross, 'discount_amount' => $off, 'net_amount' => round($gross - $off, 2)
                ];
            }
            if ($errors) {
                return $fail('Check the highlighted lines.', $errors);
            }
            if (!$rows) {
                return $fail('Enter a price for at least one line.');
            }

            $now = date('Y-m-d H:i:s');
            $insert = $db->prepare(
                "INSERT INTO or_charges (case_id, patient_id, charge_type, item_id, provider_user_id, description, quantity, unit_price, gross_amount,
                        discount_amount, net_amount, charge_date, status, created_at, created_by)
                 VALUES (:case_id, :patient_id, :charge_type, :item_id, :provider_user_id, :description, :quantity, :unit_price, :gross_amount,
                        :discount_amount, :net_amount, :charge_date, 'charged', :now, :u)"
            );
            foreach ($rows as $r) {
                $insert->execute($r + ['case_id' => $caseId, 'patient_id' => $case['patient_id'], 'charge_date' => date('Y-m-d'), 'now' => $now, 'u' => $userId]);
            }
            $db->prepare(
                "UPDATE or_surgical_cases SET billing_status = 'billed', billed_at = COALESCE(billed_at, :now), billed_by = COALESCE(billed_by, :u),
                        discount_type = :dt, discount_rate = :dr, discount_id_no = :di, discount_reason = :dre WHERE id = :id"
            )->execute(['now' => $now, 'u' => $userId, 'dt' => $discount['type'], 'dr' => $discount['rate'], 'di' => $discount['id_no'], 'dre' => $discount['reason'], 'id' => $caseId]);
            $total = round(array_sum(array_column($rows, 'net_amount')), 2);
            (new OrSchedulingService())->log($caseId, 'charged', ['lines' => count($rows), 'net' => $total, 'discount' => $discount['type']], null, $userId);
            $this->commit($db, $owns);
        } catch (Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => count($rows) . ' charge' . (count($rows) === 1 ? '' : 's') . ' posted to the patient ledger: ₱' . number_format($total, 2) . '.'];
    }

    /** Void one charge, with a reason. */
    public function void(int $chargeId, string $reason, int $userId): array
    {
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Enter why the charge is voided.', 'errors' => ['reason' => 'Enter a reason.']];
        }
        $db = Database::connection();
        $stmt = $db->prepare("SELECT * FROM or_charges WHERE id = :id");
        $stmt->execute(['id' => $chargeId]);
        $charge = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$charge || $charge['status'] !== 'charged') {
            return ['success' => false, 'message' => $charge ? 'That charge was already voided.' : 'Charge not found.', 'not_found' => !$charge];
        }
        $this->voidRows($db, "id = " . (int) $chargeId, $reason, $userId);
        (new OrSchedulingService())->log((int) $charge['case_id'], 'charge_voided', ['description' => $charge['description'], 'net' => (float) $charge['net_amount']], $reason, $userId);
        return ['success' => true, 'message' => "Charge voided: {$charge['description']}."];
    }

    /** An item removed from the case: its live charge is voided too (inside the caller's transaction). */
    public static function voidForItem(int $itemId, string $reason, int $userId): void
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT id, case_id, description FROM or_charges WHERE item_id = :i AND status = 'charged'");
        $stmt->execute(['i' => $itemId]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $c) {
            (new self())->voidRows($db, 'id = ' . (int) $c['id'], 'Item removed from the case: ' . $reason, $userId);
            (new OrSchedulingService())->log((int) $c['case_id'], 'charge_voided', ['description' => $c['description']], 'Item removed from the case: ' . $reason, $userId);
        }
    }

    private function voidRows(PDO $db, string $where, string $reason, int $userId): void
    {
        $db->prepare("UPDATE or_charges SET status = 'voided', voided_at = NOW(), voided_by = :u, void_reason = :r WHERE {$where} AND status = 'charged'")
            ->execute(['u' => $userId ?: null, 'r' => mb_substr($reason, 0, 255)]);
    }

    /** ['type', 'rate', 'id_no', 'reason'] or ['error', 'field']. */
    private function discount(array $data, array $case): array
    {
        $type = trim((string) ($data['discount_type'] ?? ''));
        if ($type === '' && $case['discount_type']) {
            return ['type' => $case['discount_type'], 'rate' => (float) $case['discount_rate'], 'id_no' => $case['discount_id_no'], 'reason' => $case['discount_reason']];
        }
        if ($type === '' || $type === 'none') {
            return ['type' => null, 'rate' => 0.0, 'id_no' => null, 'reason' => null];
        }
        if (!isset(DispensingService::DISCOUNTS[$type])) {
            return ['error' => 'Choose a discount from the list.', 'field' => 'discount_type'];
        }
        $idNo = self::text($data['discount_id_no'] ?? null, 50);
        $reason = self::text($data['discount_reason'] ?? null, 255);
        if ($type === 'other') {
            $raw = trim((string) ($data['discount_rate'] ?? ''));
            if (!is_numeric($raw) || (float) $raw <= 0 || (float) $raw > 100) {
                return ['error' => 'Enter a discount between 0 and 100%.', 'field' => 'discount_rate'];
            }
            if (!$reason) {
                return ['error' => 'Enter why the discount is given.', 'field' => 'discount_reason'];
            }
            return ['type' => 'other', 'rate' => round((float) $raw, 2), 'id_no' => $idNo, 'reason' => $reason];
        }
        if (!$idNo) {
            return ['error' => 'Enter the ' . ($type === 'senior' ? 'Senior Citizen' : 'PWD') . ' ID number.', 'field' => 'discount_id_no'];
        }
        if ($type === 'senior') {
            $stmt = Database::connection()->prepare("SELECT birthdate FROM patients WHERE id = :id");
            $stmt->execute(['id' => $case['patient_id']]);
            $birthdate = $stmt->fetchColumn();
            if ($birthdate && (new \DateTime($birthdate))->diff(new \DateTime())->y < 60) {
                return ['error' => 'The Senior Citizen discount is for patients 60 or older. This patient\'s birthdate says otherwise.', 'field' => 'discount_type'];
            }
        }
        return ['type' => $type, 'rate' => DispensingService::DISCOUNTS[$type]['rate'], 'id_no' => $idNo, 'reason' => $reason];
    }

    private static function text($value, int $max): ?string
    {
        if (is_array($value)) {
            return null;
        }
        $value = trim((string) ($value ?? ''));
        return $value === '' ? null : mb_substr($value, 0, $max);
    }

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }

    private function begin(PDO $db): bool
    {
        if (!$db->inTransaction()) {
            $db->beginTransaction();
            return true;
        }
        $db->exec('SAVEPOINT or_charge_step');
        return false;
    }

    private function commit(PDO $db, bool $owns): void
    {
        $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT or_charge_step');
    }

    private function rollBack(PDO $db, bool $owns): void
    {
        if ($owns) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            return;
        }
        $db->exec('ROLLBACK TO SAVEPOINT or_charge_step');
    }
}
