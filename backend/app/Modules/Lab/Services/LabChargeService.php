<?php

namespace App\Modules\Lab\Services;

use App\Core\Database;
use App\Modules\Dispensing\Services\DispensingService;
use PDO;

/**
 * Lab charges (module 14, Phase 3): what the lab work costs the patient, posted to the patient ledger
 * (PatientLedgerService reads lab_charges, type "Laboratory").
 *
 *   * Each lab test has a price on the catalog (procedure_order_configs.lab_price), set by an admin --
 *     prices() / savePrices().
 *   * postForRelease() -- when a medical technologist releases a result, that test is charged once: the
 *     price at release, quantity 1. A correction released later does not charge again. A test with no price
 *     is not charged: it waits on the Charges view until billing prices it and posts it (postMissing()).
 *   * A charge can be voided with a reason (voidCharge()) -- e.g. the test was never actually run, or it is
 *     charged on a package -- and a Senior Citizen (RA 9994) / PWD (RA 10754) / other discount can be applied
 *     to it (setDiscount()), the same discounts the pharmacy and the OR use.
 */
class LabChargeService
{
    public const VIEW_ROLES = ['admin', 'lab_technician'];
    public const BILL_ROLES = ['admin'];

    // ------------------------------------------------------------------
    // Posting
    // ------------------------------------------------------------------

    /**
     * Charge a test whose result has just been released. Runs inside the caller's transaction.
     * @return array ['charged' => bool, 'net' => float, 'no_price' => bool, 'test' => string]
     */
    public static function postForRelease(PDO $db, int $orderId, ?int $setId, int $userId): array
    {
        $st = $db->prepare(
            "SELECT o.id, o.patient_id, o.lab_request_id, o.specimen_id, c.name, c.identifying_code, c.lab_price,
                    (SELECT s.accession_no FROM lab_specimens s WHERE s.id = o.specimen_id) AS accession_no
             FROM patient_procedure_orders o JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             WHERE o.id = :id AND o.deleted_at IS NULL"
        );
        $st->execute(['id' => $orderId]);
        $o = $st->fetch(PDO::FETCH_ASSOC);
        if (!$o) {
            return ['charged' => false, 'net' => 0.0, 'no_price' => false, 'test' => ''];
        }
        $out = ['charged' => false, 'net' => 0.0, 'no_price' => false, 'test' => $o['name']];
        // Already charged (the first release, or a correction): never twice.
        $has = $db->prepare("SELECT COUNT(*) FROM lab_charges WHERE order_id = :o AND status = 'charged'");
        $has->execute(['o' => $orderId]);
        if ((int) $has->fetchColumn() > 0) {
            return $out;
        }
        $price = $o['lab_price'] !== null ? (float) $o['lab_price'] : null;
        if ($price === null || $price <= 0) {
            $out['no_price'] = true;
            return $out;
        }
        self::insert($db, $o, $setId, $price, $userId);
        $out['charged'] = true;
        $out['net'] = round($price, 2);
        return $out;
    }

    private static function insert(PDO $db, array $o, ?int $setId, float $price, int $userId): int
    {
        $db->prepare(
            "INSERT INTO lab_charges (order_id, request_id, specimen_id, set_id, patient_id, test_name, description, quantity, unit_price,
                    gross_amount, discount_rate, discount_amount, net_amount, charge_date, status, created_at, created_by)
             VALUES (:o, :r, :sp, :set, :p, :tn, :d, 1, :price, :gross, 0, 0, :net, CURDATE(), 'charged', NOW(), :u)"
        )->execute([
            'o' => $o['id'], 'r' => $o['lab_request_id'] ?: null, 'sp' => $o['specimen_id'] ?: null, 'set' => $setId, 'p' => $o['patient_id'],
            'tn' => mb_substr((string) $o['name'], 0, 255), 'd' => mb_substr(self::describe($o), 0, 255),
            'price' => round($price, 2), 'gross' => round($price, 2), 'net' => round($price, 2), 'u' => $userId ?: null,
        ]);
        return (int) $db->lastInsertId();
    }

    private static function describe(array $o): string
    {
        return (string) $o['name'] . ($o['accession_no'] ? " (specimen {$o['accession_no']})" : '');
    }

    /** data: order_ids -- post the charges of released tests that were not priced at release. Billing. */
    public function postMissing(array $orderIds, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::BILL_ROLES, true)) {
            return ['success' => false, 'message' => 'Lab charges are posted by an admin.', 'forbidden' => true];
        }
        $ids = array_values(array_unique(array_filter(array_map('intval', $orderIds))));
        if (!$ids) {
            return ['success' => false, 'message' => 'Choose the tests to charge.'];
        }
        $db = Database::connection();
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT lab_charge_post');
        $posted = 0;
        $total = 0.0;
        $skipped = [];
        try {
            foreach ($ids as $id) {
                $st = $db->prepare(
                    "SELECT o.id, o.patient_id, o.lab_request_id, o.specimen_id, c.name, c.lab_price,
                            (SELECT s.accession_no FROM lab_specimens s WHERE s.id = o.specimen_id) AS accession_no,
                            (SELECT s.id FROM lab_result_sets s WHERE s.order_id = o.id AND s.status = 'released' ORDER BY s.version DESC LIMIT 1) AS set_id
                     FROM patient_procedure_orders o JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
                     WHERE o.id = :id AND o.deleted_at IS NULL"
                );
                $st->execute(['id' => $id]);
                $o = $st->fetch(PDO::FETCH_ASSOC);
                if (!$o || !$o['set_id']) {
                    $skipped[] = 'a test whose result is not released';
                    continue;
                }
                $has = $db->prepare("SELECT COUNT(*) FROM lab_charges WHERE order_id = :o AND status = 'charged'");
                $has->execute(['o' => $id]);
                if ((int) $has->fetchColumn() > 0) {
                    $skipped[] = "{$o['name']} (already charged)";
                    continue;
                }
                $price = $o['lab_price'] !== null ? (float) $o['lab_price'] : null;
                if ($price === null || $price <= 0) {
                    $skipped[] = "{$o['name']} (no price yet)";
                    continue;
                }
                self::insert($db, $o, (int) $o['set_id'], $price, (int) $actor['id']);
                $posted++;
                $total += round($price, 2);
            }
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT lab_charge_post');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT lab_charge_post');
            throw $e;
        }
        if (!$posted) {
            return ['success' => false, 'message' => 'Nothing to charge: ' . implode(', ', array_unique($skipped)) . '.'];
        }
        return ['success' => true, 'message' => "{$posted} lab charge" . ($posted === 1 ? '' : 's') . ' posted to the patient ledger: ₱' . number_format($total, 2) . '.'
            . ($skipped ? ' Left out: ' . implode(', ', array_unique($skipped)) . '.' : '')];
    }

    /** Void one charge, with a reason. Billing. */
    public function voidCharge(int $id, string $reason, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::BILL_ROLES, true)) {
            return ['success' => false, 'message' => 'Lab charges are voided by an admin.', 'forbidden' => true];
        }
        $reason = trim($reason);
        if ($reason === '' || mb_strlen($reason) > 255) {
            return ['success' => false, 'message' => 'Why void the charge?', 'errors' => ['reason' => 'Required.']];
        }
        $db = Database::connection();
        $st = $db->prepare("SELECT * FROM lab_charges WHERE id = :id");
        $st->execute(['id' => $id]);
        $c = $st->fetch(PDO::FETCH_ASSOC);
        if (!$c || $c['status'] !== 'charged') {
            return ['success' => false, 'message' => $c ? 'That charge is already voided.' : 'Charge not found.', 'not_found' => !$c];
        }
        $db->prepare("UPDATE lab_charges SET status = 'voided', voided_at = NOW(), voided_by = :u, void_reason = :r WHERE id = :id AND status = 'charged'")
            ->execute(['u' => (int) $actor['id'], 'r' => $reason, 'id' => $id]);
        return ['success' => true, 'message' => "Charge voided: {$c['test_name']} (₱" . number_format((float) $c['net_amount'], 2) . ').'];
    }

    /** data: discount_type (senior | pwd | other | none), discount_id_no, discount_rate, discount_reason. Billing. */
    public function setDiscount(int $id, array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::BILL_ROLES, true)) {
            return ['success' => false, 'message' => 'Discounts are given by an admin.', 'forbidden' => true];
        }
        $db = Database::connection();
        $st = $db->prepare("SELECT * FROM lab_charges WHERE id = :id");
        $st->execute(['id' => $id]);
        $c = $st->fetch(PDO::FETCH_ASSOC);
        if (!$c || $c['status'] !== 'charged') {
            return ['success' => false, 'message' => $c ? 'That charge is voided.' : 'Charge not found.', 'not_found' => !$c];
        }
        $d = $this->discount($db, $data, (int) $c['patient_id']);
        if (isset($d['error'])) {
            return ['success' => false, 'message' => $d['error'], 'errors' => [$d['field'] => $d['error']]];
        }
        $gross = (float) $c['gross_amount'];
        $off = round($gross * $d['rate'] / 100, 2);
        $db->prepare(
            "UPDATE lab_charges SET discount_type = :t, discount_rate = :r, discount_id_no = :i, discount_reason = :re, discount_amount = :a, net_amount = :n WHERE id = :id"
        )->execute(['t' => $d['type'], 'r' => $d['rate'], 'i' => $d['id_no'], 're' => $d['reason'], 'a' => $off, 'n' => round($gross - $off, 2), 'id' => $id]);
        return ['success' => true, 'message' => $d['type'] === null ? 'Discount removed: ₱' . number_format($gross, 2) . '.'
            : 'Discount applied: ₱' . number_format($off, 2) . ' off, ₱' . number_format($gross - $off, 2) . ' to pay.'];
    }

    /** ['type', 'rate', 'id_no', 'reason'] or ['error', 'field'] -- the same rules as the pharmacy and the OR. */
    private function discount(PDO $db, array $data, int $patientId): array
    {
        $type = trim((string) ($data['discount_type'] ?? ''));
        if ($type === '' || $type === 'none') {
            return ['type' => null, 'rate' => 0.0, 'id_no' => null, 'reason' => null];
        }
        if (!isset(DispensingService::DISCOUNTS[$type])) {
            return ['error' => 'Choose a discount from the list.', 'field' => 'discount_type'];
        }
        $idNo = trim((string) ($data['discount_id_no'] ?? ''));
        $reason = trim((string) ($data['discount_reason'] ?? ''));
        if ($type === 'other') {
            $raw = trim((string) ($data['discount_rate'] ?? ''));
            if (!is_numeric($raw) || (float) $raw <= 0 || (float) $raw > 100) {
                return ['error' => 'Enter a discount between 0 and 100%.', 'field' => 'discount_rate'];
            }
            if ($reason === '') {
                return ['error' => 'Enter why the discount is given.', 'field' => 'discount_reason'];
            }
            return ['type' => 'other', 'rate' => round((float) $raw, 2), 'id_no' => $idNo !== '' ? mb_substr($idNo, 0, 50) : null, 'reason' => mb_substr($reason, 0, 255)];
        }
        if ($idNo === '') {
            return ['error' => 'Enter the ' . ($type === 'senior' ? 'Senior Citizen' : 'PWD') . ' ID number.', 'field' => 'discount_id_no'];
        }
        if ($type === 'senior') {
            $st = $db->prepare("SELECT birthdate FROM patients WHERE id = :id");
            $st->execute(['id' => $patientId]);
            $birthdate = $st->fetchColumn();
            if ($birthdate && (new \DateTime($birthdate))->diff(new \DateTime())->y < 60) {
                return ['error' => 'The Senior Citizen discount is for patients 60 or older. This patient\'s birthdate says otherwise.', 'field' => 'discount_type'];
            }
        }
        return ['type' => $type, 'rate' => DispensingService::DISCOUNTS[$type]['rate'], 'id_no' => mb_substr($idNo, 0, 50),
            'reason' => $reason !== '' ? mb_substr($reason, 0, 255) : null];
    }

    // ------------------------------------------------------------------
    // The Charges view
    // ------------------------------------------------------------------

    /** filters: q (patient, MRN, request or accession no.), only ('unbilled'). Released lab tests of the last 7 days. */
    public function queue(array $f, array $actor): array
    {
        $db = Database::connection();
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $q = trim((string) ($f['q'] ?? ''));
        $only = ($f['only'] ?? '') === 'unbilled';
        $rows = $db->query(
            "SELECT o.id AS order_id, o.patient_id, c.name AS test_name, c.identifying_code, c.lab_section, c.lab_price,
                    s.id AS set_id, s.version, s.verified_at, sp.accession_no, sp.id AS specimen_id,
                    r.request_no, r.priority, r.source, r.location,
                    p.patient_no, p.first_name, p.middle_name, p.last_name,
                    ch.id AS charge_id, ch.unit_price, ch.gross_amount, ch.discount_type, ch.discount_rate, ch.discount_id_no, ch.discount_reason,
                    ch.discount_amount, ch.net_amount, ch.charge_date,
                    (SELECT CONCAT_WS('|', v.net_amount, COALESCE(v.void_reason, '')) FROM lab_charges v
                       WHERE v.order_id = o.id AND v.status = 'voided' ORDER BY v.id DESC LIMIT 1) AS voided
             FROM lab_result_sets s
             JOIN patient_procedure_orders o ON o.id = s.order_id AND o.deleted_at IS NULL
             JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             LEFT JOIN lab_specimens sp ON sp.id = o.specimen_id
             LEFT JOIN lab_requests r ON r.id = o.lab_request_id
             JOIN patients p ON p.id = o.patient_id
             LEFT JOIN lab_charges ch ON ch.order_id = o.id AND ch.status = 'charged'
             WHERE s.status = 'released' AND s.verified_at >= NOW() - INTERVAL 7 DAY
             ORDER BY s.verified_at DESC LIMIT 400"
        )->fetchAll(PDO::FETCH_ASSOC);
        $items = [];
        foreach ($rows as $x) {
            $name = trim(preg_replace('/\s+/', ' ', "{$x['first_name']} {$x['middle_name']} {$x['last_name']}"));
            if ($q !== '' && !str_contains(strtolower("{$name} {$x['patient_no']} {$x['request_no']} {$x['accession_no']} {$x['test_name']}"), strtolower($q))) {
                continue;
            }
            $charged = $x['charge_id'] !== null;
            if ($only && $charged) {
                continue;
            }
            $items[] = [
                'order_id' => (int) $x['order_id'], 'test_name' => $x['test_name'], 'code' => $x['identifying_code'], 'section' => $x['lab_section'],
                'patient' => ['id' => (int) $x['patient_id'], 'name' => $name, 'mrn' => $x['patient_no']],
                'accession_no' => $x['accession_no'], 'request_no' => $x['request_no'], 'priority' => $x['priority'], 'location' => $x['location'],
                'released_at' => $x['verified_at'], 'version' => (int) $x['version'],
                'price' => $x['lab_price'] !== null ? (float) $x['lab_price'] : null,
                'charge' => $charged ? ['id' => (int) $x['charge_id'], 'unit_price' => (float) $x['unit_price'], 'gross' => (float) $x['gross_amount'],
                    'discount_type' => $x['discount_type'], 'discount_label' => $x['discount_type'] ? (DispensingService::DISCOUNTS[$x['discount_type']]['label'] ?? $x['discount_type']) : null,
                    'discount_rate' => (float) $x['discount_rate'], 'discount_id_no' => $x['discount_id_no'], 'discount_reason' => $x['discount_reason'],
                    'discount' => (float) $x['discount_amount'], 'net' => (float) $x['net_amount'], 'charge_date' => $x['charge_date']] : null,
                'voided' => !$charged && $x['voided'] !== null
                    ? ['net' => (float) explode('|', (string) $x['voided'])[0], 'reason' => explode('|', (string) $x['voided'], 2)[1] ?? ''] : null,
            ];
        }
        $c = $db->query(
            "SELECT (SELECT COUNT(*) FROM lab_charges WHERE status = 'charged' AND charge_date = CURDATE()) AS charges_today,
                    (SELECT COALESCE(SUM(net_amount), 0) FROM lab_charges WHERE status = 'charged' AND charge_date = CURDATE()) AS amount_today,
                    (SELECT COUNT(*) FROM lab_charges WHERE status = 'voided' AND voided_at >= NOW() - INTERVAL 7 DAY) AS voided_week,
                    (SELECT COUNT(*) FROM procedure_order_configs WHERE deleted_at IS NULL AND procedure_tier = 'procedure_order'
                       AND (order_test_type = 'Laboratory' OR lab_section IS NOT NULL OR lab_container IS NOT NULL) AND (lab_price IS NULL OR lab_price <= 0)) AS tests_without_price"
        )->fetch(PDO::FETCH_ASSOC);
        return [
            'view' => 'charges', 'now' => $now, 'items' => $items,
            'counts' => ['charges_today' => (int) $c['charges_today'], 'amount_today' => round((float) $c['amount_today'], 2),
                'to_charge' => count(array_filter($items, fn($i) => !$i['charge'] && !$i['voided'])), 'voided_week' => (int) $c['voided_week'],
                'tests_without_price' => (int) $c['tests_without_price']],
            'can_bill' => in_array($actor['role'] ?? '', self::BILL_ROLES, true),
            'discounts' => array_map(fn($k, $v) => ['value' => $k] + $v, array_keys(DispensingService::DISCOUNTS), DispensingService::DISCOUNTS),
        ];
    }

    // ------------------------------------------------------------------
    // Prices
    // ------------------------------------------------------------------

    /** The lab catalog with its prices, by group (admin). */
    public function prices(): array
    {
        $rows = Database::connection()->query(
            "SELECT c.id, c.name, c.identifying_code, c.lab_section, c.lab_price, g.name AS group_name
             FROM procedure_order_configs c LEFT JOIN procedure_order_configs g ON g.id = c.parent_id AND g.deleted_at IS NULL
             WHERE c.deleted_at IS NULL AND c.procedure_tier = 'procedure_order'
               AND (c.order_test_type = 'Laboratory' OR c.lab_section IS NOT NULL OR c.lab_container IS NOT NULL)
             ORDER BY COALESCE(g.sequence, 999), g.name, c.sequence, c.name"
        )->fetchAll(PDO::FETCH_ASSOC);
        return array_map(fn($r) => ['id' => (int) $r['id'], 'name' => $r['name'], 'code' => $r['identifying_code'],
            'group' => $r['group_name'] ?: 'Other tests', 'section' => $r['lab_section'],
            'price' => $r['lab_price'] !== null ? (float) $r['lab_price'] : null], $rows);
    }

    /** data: prices [{id, price}] -- blank clears the price (the test is then not charged). Admin. */
    public function savePrices(array $data, array $actor): array
    {
        if (($actor['role'] ?? '') !== 'admin') {
            return ['success' => false, 'message' => 'Test prices are set by an admin.', 'forbidden' => true];
        }
        $known = [];
        foreach ($this->prices() as $t) {
            $known[$t['id']] = $t;
        }
        $rows = (array) ($data['prices'] ?? []);
        $errors = [];
        $set = [];
        foreach ($rows as $r) {
            $id = (int) ($r['id'] ?? 0);
            if (!isset($known[$id])) {
                continue;
            }
            $raw = trim((string) ($r['price'] ?? ''));
            if ($raw === '') {
                $set[$id] = null;
                continue;
            }
            $raw = str_replace([',', '₱', ' '], '', $raw);
            if (!is_numeric($raw) || (float) $raw < 0 || (float) $raw > 1000000) {
                $errors["prices.{$id}"] = "Enter the price of {$known[$id]['name']} as an amount.";
                continue;
            }
            $set[$id] = round((float) $raw, 2);
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        if (!$set) {
            return ['success' => false, 'message' => 'Nothing to save.'];
        }
        $db = Database::connection();
        $changed = 0;
        $st = $db->prepare("UPDATE procedure_order_configs SET lab_price = :p, updated_at = NOW(), updated_by = :u WHERE id = :id");
        foreach ($set as $id => $price) {
            $cur = $known[$id]['price'];
            if (($cur === null && $price === null) || ($cur !== null && $price !== null && abs($cur - $price) < 0.005)) {
                continue;
            }
            $st->execute(['p' => $price, 'u' => (int) $actor['id'], 'id' => $id]);
            $changed++;
        }
        return ['success' => true, 'message' => $changed
            ? "{$changed} price" . ($changed === 1 ? '' : 's') . ' saved. New releases are charged at the new price.'
            : 'No price changed.'];
    }
}
