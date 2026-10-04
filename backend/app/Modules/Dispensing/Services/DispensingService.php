<?php

namespace App\Modules\Dispensing\Services;

use App\Core\Database;
use App\Modules\DrugInventory\Services\StockLedgerService;
use App\Modules\PatientPrescriptions\Services\PrescriptionService;
use PDO;

/**
 * Pharmacy > Dispensing: giving a prescription's medicines to the patient.
 *
 *   * queue()    -- prescriptions waiting (or partly) to be filled, and
 *                   filled / closed ones to look back at
 *   * detail()   -- one prescription: each medicine's prescribed, given and
 *                   remaining quantity, usable lots per location, history
 *   * dispense() -- give medicines from one storage location: lots chosen
 *                   or earliest-expiry first, stock deducted, ledger written
 *   * void()     -- undo a dispensing (stock back, ledger written)
 *   * close()    -- the pharmacy won't give the rest (e.g. patient declined)
 *
 * Refills: each medicine line can be given again up to its refills count
 * (fill 1 = the original, fill 2 = refill 1, ...), each fill up to the
 * prescribed quantity. The original fill must be within valid_until,
 * refills within refill_until. Patients ask from the portal
 * (requestRefill); the pharmacy dispenses the refill or declines it.
 *
 * Charging: each dispensing charges the patient the Drug Catalog selling
 * price x quantity per medicine (pharmacy_charges, shown in the patient
 * ledger), less a Senior Citizen / PWD 20% discount (ID number recorded)
 * or another discount with a reason. Payment can be taken at the
 * pharmacy (recordPayment -> patient_ledger_payments). Undoing a
 * dispensing voids its charges.
 *
 * High-alert medicines (drugs.is_high_alert): a dispensing that includes
 * one waits for a second person -- not the one who prepared it -- to check
 * it (check()) before it's handed over and paid for. One that fails the
 * check is undone.
 *
 * Only Drug Catalog medicines can be dispensed from stock. A prescription
 * past its validity, or cancelled, can't be dispensed. Expired lots are
 * never used. Quantities are in each medicine's dispensing unit.
 */
class DispensingService
{
    public const ROLES = ['admin', 'receptionist', 'doctor'];

    public const STATUS_LABELS = [
        'pending' => 'To dispense', 'partial' => 'Partly dispensed', 'dispensed' => 'Dispensed',
        'closed' => 'Closed', 'none' => 'Nothing to dispense'
    ];

    private const EPSILON = 0.0005;

    /** Discounts on medicine. Senior Citizens (RA 9994) and PWDs (RA 10754): 20%, with their ID number. */
    public const DISCOUNTS = [
        'senior' => ['label' => 'Senior Citizen (RA 9994)', 'rate' => 20.0],
        'pwd' => ['label' => 'PWD (RA 10754)', 'rate' => 20.0],
        'other' => ['label' => 'Other discount', 'rate' => null]
    ];

    public const PAYMENT_METHODS = ['Cash', 'GCash / e-wallet', 'Card (terminal)', 'Bank transfer', 'Check', 'Other'];

    private const QUEUE_LIMIT = 300;

    /* ---------------------------------------------------------------
     * Reading
     * ------------------------------------------------------------- */

    /** Filters: view (to_fill | refills | expired | partial | dispensed | closed | all), q? */
    public function queue(array $filters): array
    {
        $db = Database::connection();
        $today = date('Y-m-d');
        $view = $filters['view'] ?? 'to_fill';
        $where = ["p.deleted_at IS NULL", "p.status = 'active'"];
        $params = [];

        switch ($view) {
            case 'to_check':
                // High-alert dispensings waiting for their second check, oldest first.
                $where[] = "EXISTS (SELECT 1 FROM prescription_dispenses d WHERE d.prescription_id = p.id AND d.status = 'completed' AND d.check_status = 'awaiting')";
                $order = '(SELECT MIN(d.created_at) FROM prescription_dispenses d WHERE d.prescription_id = p.id AND d.status = \'completed\' AND d.check_status = \'awaiting\'), p.id';
                break;
            case 'refills':
                // Refills patients (or staff) asked for, oldest request first.
                $where[] = "EXISTS (SELECT 1 FROM prescription_refill_requests r WHERE r.prescription_id = p.id AND r.status = 'pending')";
                $order = '(SELECT MIN(r.created_at) FROM prescription_refill_requests r WHERE r.prescription_id = p.id AND r.status = \'pending\'), p.id';
                break;
            case 'expired':
                $where[] = "p.dispense_status IN ('pending', 'partial') AND p.fillable_until < :today";
                $params['today'] = $today;
                $order = 'p.fillable_until DESC, p.id DESC';
                break;
            case 'partial':
                $where[] = "p.dispense_status = 'partial' AND (p.fillable_until IS NULL OR p.fillable_until >= :today)";
                $params['today'] = $today;
                $order = 'p.prescribed_date, p.id';
                break;
            case 'dispensed':
            case 'closed':
                $where[] = "p.dispense_status = :status";
                $params['status'] = $view;
                $order = 'COALESCE(p.last_dispensed_at, p.closed_at, p.updated_at) DESC, p.id DESC';
                break;
            case 'all':
                $where[] = "p.dispense_status <> 'none'";
                $order = 'p.prescribed_date DESC, p.id DESC';
                break;
            default:
                $view = 'to_fill';
                // Oldest first: whoever has waited longest is served first.
                $where[] = "p.dispense_status IN ('pending', 'partial') AND (p.fillable_until IS NULL OR p.fillable_until >= :today)";
                $params['today'] = $today;
                $order = 'p.prescribed_date, p.id';
        }

        $q = trim((string) ($filters['q'] ?? ''));
        if ($q !== '') {
            $like = '%' . addcslashes($q, '%_\\') . '%';
            $where[] = "(p.rx_number LIKE :q1 OR pt.patient_no LIKE :q2 OR CONCAT_WS(' ', pt.first_name, pt.middle_name, pt.last_name) LIKE :q3
                         OR CONCAT_WS(' ', pt.last_name, pt.first_name) LIKE :q4)";
            $params += ['q1' => $like, 'q2' => $like, 'q3' => $like, 'q4' => $like];
        }

        $stmt = $db->prepare(
            "SELECT p.id, p.rx_number, p.patient_id, p.prescribed_date, p.valid_until, p.fillable_until, p.dispense_status, p.last_dispensed_at, p.closed_at,
                    (SELECT COUNT(*) FROM prescription_refill_requests r WHERE r.prescription_id = p.id AND r.status = 'pending') AS refill_requests,
                    (SELECT COUNT(*) FROM prescription_dispenses d WHERE d.prescription_id = p.id AND d.status = 'completed' AND d.check_status = 'awaiting') AS awaiting_check,
                    pt.patient_no, pt.first_name, pt.middle_name, pt.last_name, pt.suffix,
                    " . self::userNameSql('p.prescriber_user_id') . " AS prescriber_name,
                    (SELECT COUNT(*) FROM patient_prescriptions pp WHERE pp.prescription_id = p.id AND pp.deleted_at IS NULL) AS line_count,
                    (SELECT COUNT(*) FROM patient_prescriptions pp WHERE pp.prescription_id = p.id AND pp.deleted_at IS NULL AND pp.drug_id IS NOT NULL) AS catalog_count,
                    (SELECT COUNT(*) FROM patient_prescriptions pp JOIN drugs d ON d.id = pp.drug_id
                     WHERE pp.prescription_id = p.id AND pp.deleted_at IS NULL AND d.controlled_class = :dd) AS dangerous_count,
                    (SELECT GROUP_CONCAT(pp.title ORDER BY pp.line_no SEPARATOR '||') FROM patient_prescriptions pp
                     WHERE pp.prescription_id = p.id AND pp.deleted_at IS NULL) AS titles
             FROM prescriptions p
             JOIN patients pt ON pt.id = p.patient_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY {$order}
             LIMIT " . (self::QUEUE_LIMIT + 1)
        );
        $stmt->execute($params + ['dd' => PrescriptionService::DANGEROUS_CLASS]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $counts = $db->prepare(
            "SELECT
                SUM(CASE WHEN dispense_status IN ('pending', 'partial') AND (fillable_until IS NULL OR fillable_until >= :t1) THEN 1 ELSE 0 END) AS to_fill,
                SUM(CASE WHEN dispense_status = 'partial' AND (fillable_until IS NULL OR fillable_until >= :t2) THEN 1 ELSE 0 END) AS partial,
                SUM(CASE WHEN dispense_status IN ('pending', 'partial') AND fillable_until < :t3 THEN 1 ELSE 0 END) AS expired,
                (SELECT COUNT(DISTINCT r.prescription_id) FROM prescription_refill_requests r JOIN prescriptions p2 ON p2.id = r.prescription_id
                 WHERE r.status = 'pending' AND p2.deleted_at IS NULL AND p2.status = 'active') AS refills,
                (SELECT COUNT(DISTINCT d.prescription_id) FROM prescription_dispenses d JOIN prescriptions p3 ON p3.id = d.prescription_id
                 WHERE d.status = 'completed' AND d.check_status = 'awaiting' AND p3.deleted_at IS NULL AND p3.status = 'active') AS to_check
             FROM prescriptions WHERE deleted_at IS NULL AND status = 'active'"
        );
        $counts->execute(['t1' => $today, 't2' => $today, 't3' => $today]);
        $c = $counts->fetch(PDO::FETCH_ASSOC);

        return [
            'view' => $view,
            'counts' => ['to_fill' => (int) $c['to_fill'], 'partial' => (int) $c['partial'], 'expired' => (int) $c['expired'], 'refills' => (int) $c['refills'], 'to_check' => (int) $c['to_check']],
            'truncated' => count($rows) > self::QUEUE_LIMIT,
            'rows' => array_map(fn($r) => [
                'id' => (int) $r['id'],
                'rx_number' => $r['rx_number'],
                'patient_id' => (int) $r['patient_id'],
                'patient_no' => $r['patient_no'],
                'patient_name' => self::personName($r),
                'prescriber_name' => $r['prescriber_name'],
                'prescribed_date' => $r['prescribed_date'],
                'valid_until' => $r['valid_until'],
                'is_expired' => $r['fillable_until'] !== null && $r['fillable_until'] < $today,
                'refill_requests' => (int) $r['refill_requests'],
                'awaiting_check' => (int) $r['awaiting_check'],
                'dispense_status' => $r['dispense_status'],
                'status_label' => self::STATUS_LABELS[$r['dispense_status']] ?? $r['dispense_status'],
                'last_dispensed_at' => $r['last_dispensed_at'],
                'line_count' => (int) $r['line_count'],
                'catalog_count' => (int) $r['catalog_count'],
                'has_dangerous_drug' => (int) $r['dangerous_count'] > 0,
                'medicines' => $r['titles'] !== null ? explode('||', $r['titles']) : []
            ], array_slice($rows, 0, self::QUEUE_LIMIT))
        ];
    }

    /** One prescription, ready to dispense. $viewerId: who's looking (a second check can't be your own). */
    public function detail(int $prescriptionId, ?int $viewerId = null): ?array
    {
        $slip = (new PrescriptionService())->get($prescriptionId);
        if (!$slip) {
            return null;
        }

        $db = Database::connection();
        $today = date('Y-m-d');

        $stmt = $db->prepare(
            "SELECT p.dispense_status, p.closed_at, p.close_reason, p.refill_until, " . self::userNameSql('p.closed_by') . " AS closed_by_name,
                    pt.patient_no, pt.first_name, pt.middle_name, pt.last_name, pt.suffix, pt.sex, pt.birthdate
             FROM prescriptions p JOIN patients pt ON pt.id = p.patient_id WHERE p.id = :id"
        );
        $stmt->execute(['id' => $prescriptionId]);
        $head = $stmt->fetch(PDO::FETCH_ASSOC);

        $fills = self::fillsByLine($prescriptionId);
        $requests = $this->pendingRequests($prescriptionId);
        $active = $slip['status'] === 'active' && $head['dispense_status'] !== 'closed';
        $firstFillOpen = $slip['valid_until'] === null || $slip['valid_until'] >= $today;
        $refillOpen = $head['refill_until'] !== null && $head['refill_until'] >= $today;

        // Usable stock of these medicines at every active location.
        $drugIds = array_values(array_unique(array_filter(array_column($slip['items'], 'drug_id'))));
        $lots = [];
        if ($drugIds) {
            $stmt = $db->prepare(
                "SELECT l.id, l.drug_id, l.warehouse_id, l.lot_number, l.expires_date, l.quantity_on_hand, w.name AS warehouse_name
                 FROM drug_inventory_lots l
                 JOIN warehouses w ON w.id = l.warehouse_id AND w.deleted_at IS NULL AND w.is_active = 1
                 WHERE l.deleted_at IS NULL AND l.is_active = 1 AND l.quantity_on_hand > 0
                   AND (l.expires_date IS NULL OR l.expires_date >= :today)
                   AND l.drug_id IN (" . implode(',', array_map('intval', $drugIds)) . ")
                 ORDER BY l.expires_date IS NULL, l.expires_date, l.id"
            );
            $stmt->execute(['today' => $today]);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $l) {
                $lots[(int) $l['drug_id']][] = [
                    'id' => (int) $l['id'], 'warehouse_id' => (int) $l['warehouse_id'], 'warehouse_name' => $l['warehouse_name'],
                    'lot_number' => $l['lot_number'], 'expires_date' => $l['expires_date'], 'quantity' => (float) $l['quantity_on_hand']
                ];
            }
        }

        // What each medicine is charged at (catalog selling price, per dispensing unit).
        $prices = [];
        $highAlert = [];
        if ($drugIds) {
            foreach ($db->query("SELECT id, selling_price, is_high_alert FROM drugs WHERE id IN (" . implode(',', array_map('intval', $drugIds)) . ")")->fetchAll(PDO::FETCH_ASSOC) as $p) {
                $prices[(int) $p['id']] = $p['selling_price'] !== null ? (float) $p['selling_price'] : null;
                $highAlert[(int) $p['id']] = (bool) $p['is_high_alert'];
            }
        }

        $items = array_map(function ($item) use ($fills, $lots, $requests, $active, $firstFillOpen, $refillOpen, $prices, $highAlert) {
            $prescribed = self::parseQuantity($item['quantity'], $item['drug_unit_name']);
            $state = self::lineState($prescribed, (int) ($item['refills'] ?? 0), $fills[$item['id']] ?? []);
            $catalog = $item['drug_id'] !== null;
            // The fill under way can still be given: original within valid_until, a refill within refill_until.
            $fillOpen = $state['current_fill'] === 1 ? $firstFillOpen : $refillOpen;

            return $item + [
                'can_dispense' => $catalog,
                'prescribed_quantity' => $prescribed,
                'dispensed_quantity' => $state['given_current'],
                'dispensed_total' => $state['given_total'],
                'remaining_quantity' => $prescribed !== null ? max(0.0, round($prescribed - $state['given_current'], 3)) : null,
                'is_complete' => $state['current_complete'],
                'current_fill' => $state['current_fill'],
                'fill_label' => $state['current_fill'] === 1 ? 'Original fill' : 'Refill ' . ($state['current_fill'] - 1) . ' of ' . (int) $item['refills'],
                'refills_allowed' => (int) ($item['refills'] ?? 0),
                'refills_used' => $state['refills_used'],
                'refills_remaining' => $state['refills_remaining'],
                'can_give_now' => $catalog && $active && !$state['current_complete'] && $fillOpen,
                'can_refill' => $catalog && $active && $state['current_complete'] && $state['refills_remaining'] > 0 && $refillOpen,
                'refill_request' => $requests[$item['id']] ?? null,
                'lots' => $catalog ? ($lots[$item['drug_id']] ?? []) : [],
                'unit_price' => $catalog && isset($prices[$item['drug_id']]) ? $prices[$item['drug_id']] : null,
                'is_high_alert' => $catalog && !empty($highAlert[$item['drug_id']])
            ];
        }, $slip['items']);

        $statusOpen = $slip['status'] === 'active' && in_array($head['dispense_status'], ['pending', 'partial'], true);
        $giveable = (bool) array_filter($items, fn($i) => $i['can_give_now'] || $i['can_refill']);
        $stuck = array_filter($items, fn($i) => $i['can_dispense'] && !$i['is_complete'] && !$i['can_give_now']);
        $history = $this->history($prescriptionId, $viewerId);

        return [
            'prescription' => array_merge($slip, ['items' => $items]),
            'patient' => [
                'id' => $slip['patient_id'], 'patient_no' => $head['patient_no'], 'name' => self::personName($head),
                'sex' => $head['sex'], 'age' => $head['birthdate'] ? (new \DateTime($head['birthdate']))->diff(new \DateTime())->y : null
            ],
            'dispense_status' => $head['dispense_status'],
            'status_label' => self::STATUS_LABELS[$head['dispense_status']] ?? $head['dispense_status'],
            'closed_at' => $head['closed_at'],
            'closed_by_name' => $head['closed_by_name'],
            'close_reason' => $head['close_reason'],
            'refill_until' => $head['refill_until'],
            // Why it can't be dispensed right now, if it can't.
            'blocked_reason' => $slip['status'] === 'cancelled' ? 'This prescription was cancelled.'
                : ($stuck && $active ? (array_values($stuck)[0]['current_fill'] === 1
                    ? 'This prescription expired on ' . $slip['valid_until'] . ' and can no longer be filled. The doctor needs to write a new one.'
                    : 'The refill period ended on ' . $head['refill_until'] . ', so the rest of this refill can\'t be given. The doctor needs to write a new prescription.') : null),
            'can_dispense' => $giveable,
            'can_close' => $active && ($statusOpen || (bool) array_filter($items, fn($i) => $i['can_dispense'] && $i['refills_remaining'] > 0)),
            'refill_requests' => array_values($requests),
            'awaiting_check' => count(array_filter($history, fn($h) => $h['check_status'] === 'awaiting' && $h['status'] === 'completed')),
            'history' => $history
        ];
    }

    public function options(): array
    {
        return [
            'warehouses' => Database::connection()->query(
                "SELECT id, name, code, location_type FROM warehouses WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name"
            )->fetchAll(PDO::FETCH_ASSOC),
            'discounts' => array_map(fn($k, $v) => ['value' => $k] + $v, array_keys(self::DISCOUNTS), self::DISCOUNTS),
            'payment_methods' => self::PAYMENT_METHODS
        ];
    }

    /* ---------------------------------------------------------------
     * Dispensing
     * ------------------------------------------------------------- */

    /**
     * data: prescription_id, warehouse_id, notes?,
     *       items: [{prescription_item_id, quantity, lot_id?, refill?}]
     * lot_id picks one lot; without it, earliest expiry first at the location.
     * refill: true starts the medicine's next refill (its current fill must
     * be complete and a refill left); otherwise the fill under way is given.
     * discount_type (senior | pwd | other)?, discount_id_no (senior/pwd),
     * discount_rate + discount_reason (other).
     */
    public function dispense(array $data, array $user): array
    {
        $db = Database::connection();
        $prescriptionId = (int) ($data['prescription_id'] ?? 0);
        $warehouseId = (int) ($data['warehouse_id'] ?? 0);
        $userId = (int) $user['id'];
        $today = date('Y-m-d');
        $owns = $this->begin($db);

        try {
            $stmt = $db->prepare("SELECT * FROM prescriptions WHERE id = :id AND deleted_at IS NULL FOR UPDATE");
            $stmt->execute(['id' => $prescriptionId]);
            $rx = $stmt->fetch(PDO::FETCH_ASSOC);

            $fail = function (string $message, array $errors = [], bool $notFound = false) use ($db, $owns) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $message, 'errors' => $errors ?: null, 'not_found' => $notFound];
            };

            if (!$rx) {
                return $fail('Prescription not found.', [], true);
            }
            if ($rx['status'] === 'cancelled') {
                return $fail('This prescription was cancelled, so it can\'t be dispensed.');
            }
            if ($rx['dispense_status'] === 'closed') {
                return $fail('This prescription was closed by the pharmacy, so nothing more can be given from it.');
            }
            if ($rx['dispense_status'] === 'none') {
                return $fail('This prescription has nothing from the Drug Catalog to dispense.');
            }

            $stmt = $db->prepare("SELECT id, name FROM warehouses WHERE id = :id AND deleted_at IS NULL AND is_active = 1");
            $stmt->execute(['id' => $warehouseId]);
            $warehouse = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$warehouse) {
                return $fail('Choose the storage location you are dispensing from.', ['warehouse_id' => 'Choose a location.']);
            }

            $stmt = $db->prepare(
                "SELECT pp.id, pp.drug_id, pp.title, pp.quantity, pp.refills, d.name AS drug_name, d.selling_price, d.is_high_alert, du.name AS unit_name
                 FROM patient_prescriptions pp
                 LEFT JOIN drugs d ON d.id = pp.drug_id
                 LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
                 WHERE pp.prescription_id = :id AND pp.deleted_at IS NULL"
            );
            $stmt->execute(['id' => $prescriptionId]);
            $lines = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), null, 'id');
            $fills = self::fillsByLine($prescriptionId);

            $discount = $this->validateDiscount($data, (int) $rx['patient_id']);
            if (isset($discount['error'])) {
                return $fail($discount['error'], [$discount['field'] => $discount['error']]);
            }

            $requested = is_array($data['items'] ?? null) ? array_values(array_filter($data['items'], 'is_array')) : [];
            $requested = array_values(array_filter($requested, fn($i) => (float) ($i['quantity'] ?? 0) > 0));
            if (!$requested) {
                return $fail('Enter how much of at least one medicine you are giving.', ['items' => 'Enter a quantity to give.']);
            }

            $errors = [];
            $plan = [];
            $seen = [];

            foreach ($requested as $i => $req) {
                $lineId = (int) ($req['prescription_item_id'] ?? 0);
                $key = "items.{$lineId}";
                $line = $lines[$lineId] ?? null;
                $quantity = round((float) $req['quantity'], 3);

                if (!$line) {
                    $errors[$key] = 'This medicine is no longer on the prescription. Reload it.';
                    continue;
                }
                if (isset($seen[$lineId])) {
                    $errors[$key] = 'This medicine is listed twice.';
                    continue;
                }
                $seen[$lineId] = true;

                if (!$line['drug_id']) {
                    $errors[$key] = 'This medicine isn\'t in the Drug Catalog, so it can\'t be dispensed from stock.';
                    continue;
                }

                $prescribed = self::parseQuantity($line['quantity'], $line['unit_name']);
                $state = self::lineState($prescribed, (int) ($line['refills'] ?? 0), $fills[$lineId] ?? []);
                $isRefill = !empty($req['refill']) && $req['refill'] !== 'false';

                if ($isRefill) {
                    if (!$state['current_complete']) {
                        $errors[$key] = 'Finish giving the current fill before starting a refill.';
                        continue;
                    }
                    if ($state['refills_remaining'] < 1) {
                        $errors[$key] = 'No refills are left on this medicine. The doctor needs to write a new prescription.';
                        continue;
                    }
                    if ($rx['refill_until'] === null || $rx['refill_until'] < $today) {
                        $errors[$key] = 'The refill period ' . ($rx['refill_until'] ? "ended on {$rx['refill_until']}" : 'isn\'t set') . '. The doctor needs to write a new prescription.';
                        continue;
                    }
                    $fill = $state['current_fill'] + 1;
                    $already = 0.0;
                } else {
                    if ($state['current_complete']) {
                        $errors[$key] = $state['refills_remaining'] > 0
                            ? 'This fill has been given in full. Give it as a refill instead.'
                            : 'This medicine has already been given in full.';
                        continue;
                    }
                    $fill = $state['current_fill'];
                    $already = $state['given_current'];
                    $until = $fill === 1 ? $rx['valid_until'] : $rx['refill_until'];
                    if ($until !== null && $until < $today) {
                        $errors[$key] = $fill === 1
                            ? "This prescription expired on {$until} and can no longer be filled."
                            : "The refill period ended on {$until}.";
                        continue;
                    }
                }

                if ($prescribed !== null && $quantity > $prescribed - $already + self::EPSILON) {
                    $left = max(0, round($prescribed - $already, 3));
                    $errors[$key] = 'Only ' . self::qty($left) . " {$line['unit_name']} " . ($isRefill ? 'can be given per refill.' : 'left to give in this fill.');
                    continue;
                }

                // Lots: the one chosen, else earliest expiry first. Locked until the end.
                $lotId = (int) ($req['lot_id'] ?? 0) ?: null;
                $stmt = $db->prepare(
                    "SELECT id, lot_number, expires_date, quantity_on_hand FROM drug_inventory_lots
                     WHERE drug_id = :drug AND warehouse_id = :wh AND deleted_at IS NULL AND is_active = 1 AND quantity_on_hand > 0
                       AND (expires_date IS NULL OR expires_date >= :today)" . ($lotId ? " AND id = :lot" : "") . "
                     ORDER BY expires_date IS NULL, expires_date, id
                     FOR UPDATE"
                );
                $stmt->execute(['drug' => $line['drug_id'], 'wh' => $warehouseId, 'today' => $today] + ($lotId ? ['lot' => $lotId] : []));
                $lots = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Stock already promised to an earlier line of this request (same medicine twice can't happen, but be safe).
                $available = array_sum(array_map(fn($l) => (float) $l['quantity_on_hand'], $lots));
                if ($quantity > $available + self::EPSILON) {
                    $errors[$key] = $lotId && !$lots
                        ? 'That lot can\'t be used (expired, empty or at another location).'
                        : 'Only ' . self::qty($available) . " {$line['unit_name']} usable at {$warehouse['name']}" . ($lotId ? ' in that lot' : '') . '.';
                    continue;
                }

                $left = $quantity;
                foreach ($lots as $lot) {
                    if ($left <= self::EPSILON) break;
                    $take = round(min($left, (float) $lot['quantity_on_hand']), 3);
                    $plan[] = ['line' => $line, 'lot_id' => (int) $lot['id'], 'quantity' => $take, 'fill' => $fill];
                    $left = round($left - $take, 3);
                }
            }

            if ($errors) {
                return $fail('Some medicines can\'t be given as entered.', $errors);
            }

            $now = date('Y-m-d H:i:s');
            // A high-alert medicine in it: a second person checks it before it's handed over.
            $needsCheck = (bool) array_filter($plan, fn($p) => !empty($p['line']['is_high_alert']));
            $stmt = $db->prepare("SELECT first_name, last_name FROM patients WHERE id = :id");
            $stmt->execute(['id' => $rx['patient_id']]);
            $patient = $stmt->fetch(PDO::FETCH_ASSOC);
            $patientName = trim(($patient['first_name'] ?? '') . ' ' . ($patient['last_name'] ?? ''));

            $db->prepare(
                "INSERT INTO prescription_dispenses (dispense_number, prescription_id, patient_id, warehouse_id, dispensed_date, notes,
                        discount_type, discount_rate, discount_id_no, discount_reason, status, check_status, created_at, created_by)
                 VALUES (:tmp, :rx, :patient, :wh, :date, :notes, :dtype, :drate, :did, :dreason, 'completed', :check, :now, :user)"
            )->execute([
                'tmp' => 'NEW-' . bin2hex(random_bytes(8)), 'rx' => $prescriptionId, 'patient' => $rx['patient_id'], 'wh' => $warehouseId,
                'date' => $today, 'notes' => self::text($data['notes'] ?? null, 500),
                'dtype' => $discount['type'], 'drate' => $discount['rate'], 'did' => $discount['id_no'], 'dreason' => $discount['reason'],
                'check' => $needsCheck ? 'awaiting' : null, 'now' => $now, 'user' => $userId
            ]);
            $dispenseId = (int) $db->lastInsertId();
            $number = 'DSP-' . date('Y') . '-' . str_pad((string) $dispenseId, 5, '0', STR_PAD_LEFT);
            $db->prepare("UPDATE prescription_dispenses SET dispense_number = :n WHERE id = :id")->execute(['n' => $number, 'id' => $dispenseId]);

            $insertItem = $db->prepare(
                "INSERT INTO prescription_dispense_items (dispense_id, prescription_item_id, fill_number, drug_id, lot_id, quantity, unit_cost, created_at)
                 VALUES (:d, :item, :fill, :drug, :lot, :qty, :cost, :now)"
            );
            $deduct = $db->prepare("UPDATE drug_inventory_lots SET quantity_on_hand = quantity_on_hand - :qty, updated_at = :now, updated_by = :user WHERE id = :id");

            foreach ($plan as $p) {
                $cost = StockLedgerService::lotCost($p['lot_id'], (int) $p['line']['drug_id']);
                $insertItem->execute(['d' => $dispenseId, 'item' => $p['line']['id'], 'fill' => $p['fill'], 'drug' => $p['line']['drug_id'], 'lot' => $p['lot_id'],
                    'qty' => $p['quantity'], 'cost' => $cost, 'now' => $now]);
                $itemId = (int) $db->lastInsertId();
                $deduct->execute(['qty' => $p['quantity'], 'now' => $now, 'user' => $userId, 'id' => $p['lot_id']]);

                StockLedgerService::record($p['lot_id'], 'dispensed', -$p['quantity'], 'prescription_dispense_items', $itemId, $userId, [
                    'date' => $today, 'unit_cost' => $cost, 'reference_no' => $number, 'counterparty' => $patientName, 'notes' => $rx['rx_number']
                ]);
            }

            // Charge the patient: per medicine, quantity x catalog selling price, less the discount.
            $byLine = [];
            foreach ($plan as $p) {
                $lineId = (int) $p['line']['id'];
                $byLine[$lineId] ??= ['line' => $p['line'], 'quantity' => 0.0, 'fill' => $p['fill']];
                $byLine[$lineId]['quantity'] = round($byLine[$lineId]['quantity'] + $p['quantity'], 3);
            }
            $insertCharge = $db->prepare(
                "INSERT INTO pharmacy_charges (dispense_id, patient_id, prescription_id, prescription_item_id, encounter_id, drug_id, description,
                        quantity, unit_price, gross_amount, discount_amount, net_amount, charge_date, status, created_at, created_by)
                 VALUES (:d, :patient, :rx, :item, :enc, :drug, :descr, :qty, :price, :gross, :disc, :net, :date, 'charged', :now, :user)"
            );
            $totals = ['gross' => 0.0, 'discount' => 0.0, 'net' => 0.0];
            foreach ($byLine as $lineId => $c) {
                $price = round((float) ($c['line']['selling_price'] ?? 0), 2);
                $gross = round($c['quantity'] * $price, 2);
                $off = round($gross * $discount['rate'] / 100, 2);
                $insertCharge->execute([
                    'd' => $dispenseId, 'patient' => $rx['patient_id'], 'rx' => $prescriptionId, 'item' => $lineId, 'enc' => $rx['encounter_id'],
                    'drug' => $c['line']['drug_id'],
                    'descr' => mb_substr($c['line']['drug_name'] . ' x ' . self::qty($c['quantity']) . ($c['fill'] > 1 ? ' (refill ' . ($c['fill'] - 1) . ')' : ''), 0, 255),
                    'qty' => $c['quantity'], 'price' => $price, 'gross' => $gross, 'disc' => $off, 'net' => round($gross - $off, 2),
                    'date' => $today, 'now' => $now, 'user' => $userId
                ]);
                $totals['gross'] += $gross;
                $totals['discount'] += $off;
            }
            $totals['net'] = round($totals['gross'] - $totals['discount'], 2);
            $db->prepare("UPDATE prescription_dispenses SET gross_amount = :g, discount_amount = :dc, net_amount = :n WHERE id = :id")
                ->execute(['g' => round($totals['gross'], 2), 'dc' => round($totals['discount'], 2), 'n' => $totals['net'], 'id' => $dispenseId]);

            // A refill given answers that medicine's pending refill request.
            $refilled = array_values(array_unique(array_map(fn($p) => (int) $p['line']['id'], array_filter($plan, fn($p) => $p['fill'] > 1))));
            if ($refilled) {
                $db->prepare(
                    "UPDATE prescription_refill_requests SET status = 'dispensed', dispense_id = :d, decided_at = :now, decided_by = :user
                     WHERE status = 'pending' AND prescription_item_id IN (" . implode(',', $refilled) . ")"
                )->execute(['d' => $dispenseId, 'now' => $now, 'user' => $userId]);
            }

            $status = self::refreshStatus($prescriptionId);
            $db->prepare("UPDATE prescriptions SET last_dispensed_at = :now, revision = revision + 1 WHERE id = :id")->execute(['now' => $now, 'id' => $prescriptionId]);

            $this->commit($db, $owns);
        } catch (\Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return [
            'success' => true,
            'message' => "Dispensed under {$number}." . ($status === 'partial' ? ' Some medicines are still to be given.' : '')
                . ($needsCheck ? ' It includes a high-alert medicine: a second person must check it before it\'s handed over.' : ''),
            'data' => ['dispense_id' => $dispenseId, 'dispense_number' => $number, 'dispense_status' => $status, 'net_amount' => $totals['net'],
                'needs_check' => $needsCheck]
        ];
    }

    /** Undo a dispensing: the stock goes back to the lots it came from. */
    public function void(int $dispenseId, string $reason, array $user): array
    {
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Enter why the dispensing is being undone.', 'errors' => ['reason' => 'Enter a reason.']];
        }

        $db = Database::connection();
        $owns = $this->begin($db);

        try {
            $stmt = $db->prepare("SELECT * FROM prescription_dispenses WHERE id = :id FOR UPDATE");
            $stmt->execute(['id' => $dispenseId]);
            $dispense = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$dispense) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Dispensing not found.', 'not_found' => true];
            }
            if ($dispense['status'] === 'voided') {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'This dispensing was already undone.'];
            }

            $db->prepare("SELECT id FROM prescriptions WHERE id = :id FOR UPDATE")->execute(['id' => $dispense['prescription_id']]);

            $stmt = $db->prepare(
                "SELECT i.*, l.deleted_at AS lot_deleted FROM prescription_dispense_items i
                 JOIN drug_inventory_lots l ON l.id = i.lot_id WHERE i.dispense_id = :id FOR UPDATE"
            );
            $stmt->execute(['id' => $dispenseId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (array_filter($items, fn($i) => $i['lot_deleted'] !== null)) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'A lot this was given from has since been removed, so the stock can\'t go back to it.'];
            }

            $now = date('Y-m-d H:i:s');
            $userId = (int) $user['id'];
            $stmt = $db->prepare("SELECT p.rx_number, pt.first_name, pt.last_name FROM prescriptions p JOIN patients pt ON pt.id = p.patient_id WHERE p.id = :id");
            $stmt->execute(['id' => $dispense['prescription_id']]);
            $rx = $stmt->fetch(PDO::FETCH_ASSOC);

            $restore = $db->prepare("UPDATE drug_inventory_lots SET quantity_on_hand = quantity_on_hand + :qty, updated_at = :now, updated_by = :user WHERE id = :id");
            foreach ($items as $item) {
                $restore->execute(['qty' => $item['quantity'], 'now' => $now, 'user' => $userId, 'id' => $item['lot_id']]);
                StockLedgerService::record((int) $item['lot_id'], 'dispense_voided', (float) $item['quantity'], 'prescription_dispense_items', (int) $item['id'], $userId, [
                    'unit_cost' => $item['unit_cost'], 'reference_no' => $dispense['dispense_number'],
                    'counterparty' => trim($rx['first_name'] . ' ' . $rx['last_name']), 'reason' => $reason, 'notes' => $rx['rx_number']
                ]);
            }

            $db->prepare("UPDATE prescription_dispenses SET status = 'voided', voided_at = :now, voided_by = :user, void_reason = :reason WHERE id = :id")
                ->execute(['now' => $now, 'user' => $userId, 'reason' => mb_substr($reason, 0, 500), 'id' => $dispenseId]);

            $db->prepare("UPDATE pharmacy_charges SET status = 'voided', voided_at = :now, voided_by = :user WHERE dispense_id = :id AND status = 'charged'")
                ->execute(['now' => $now, 'user' => $userId, 'id' => $dispenseId]);
            $paid = $this->paidFor($dispenseId);

            // A refill request this answered is waiting again.
            $db->prepare("UPDATE prescription_refill_requests SET status = 'pending', dispense_id = NULL, decided_at = NULL, decided_by = NULL WHERE dispense_id = :id")
                ->execute(['id' => $dispenseId]);

            // A closed prescription stays closed; otherwise its status follows what's still given.
            self::refreshStatus((int) $dispense['prescription_id']);
            $db->prepare("UPDATE prescriptions SET revision = revision + 1 WHERE id = :id")->execute(['id' => $dispense['prescription_id']]);

            $this->commit($db, $owns);
        } catch (\Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => "{$dispense['dispense_number']} undone; the stock is back and its charges are cancelled."
            . ($paid > 0.004 ? ' ₱' . number_format($paid, 2) . ' was paid for it — refund the patient and record it in the patient ledger.' : '')];
    }

    /**
     * The second check of a high-alert dispensing, by someone other than
     * who prepared it: right patient, medicine, strength, quantity, lot and
     * expiry, and directions. data: confirmed (all points checked), notes?
     * One that doesn't pass is undone instead (void()).
     */
    public function check(int $dispenseId, array $data, array $user): array
    {
        $confirmed = !empty($data['confirmed']) && $data['confirmed'] !== 'false';
        $db = Database::connection();
        $owns = $this->begin($db);

        try {
            $stmt = $db->prepare("SELECT d.*, " . self::userNameSql('d.checked_by') . " AS checked_by_name FROM prescription_dispenses d WHERE d.id = :id FOR UPDATE");
            $stmt->execute(['id' => $dispenseId]);
            $dispense = $stmt->fetch(PDO::FETCH_ASSOC);

            $message = null;
            if (!$dispense) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Dispensing not found.', 'not_found' => true];
            }
            if ($dispense['status'] !== 'completed') {
                $message = 'This dispensing was undone, so there\'s nothing to check.';
            } elseif ($dispense['check_status'] === 'checked') {
                $message = 'This dispensing was already checked' . ($dispense['checked_by_name'] ? " by {$dispense['checked_by_name']}" : '') . '.';
            } elseif ($dispense['check_status'] !== 'awaiting') {
                $message = 'This dispensing has no high-alert medicine, so it doesn\'t need a second check.';
            } elseif ((int) $dispense['created_by'] === (int) $user['id']) {
                $message = 'You prepared this dispensing, so someone else has to check it.';
            } elseif (!$confirmed) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Tick every point once you have checked it.', 'errors' => ['confirmed' => 'Tick every point.']];
            }

            if ($message) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $message];
            }

            $db->prepare("UPDATE prescription_dispenses SET check_status = 'checked', checked_at = :now, checked_by = :user, check_notes = :notes WHERE id = :id")
                ->execute(['now' => date('Y-m-d H:i:s'), 'user' => (int) $user['id'], 'notes' => self::text($data['notes'] ?? null, 500), 'id' => $dispenseId]);

            $this->commit($db, $owns);
        } catch (\Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => "{$dispense['dispense_number']} checked. It can be handed over to the patient."];
    }

    /** The pharmacy won't give the rest. What was given stays given. */
    public function close(int $prescriptionId, string $reason, array $user): array
    {
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Enter why the prescription is being closed.', 'errors' => ['reason' => 'Enter a reason.']];
        }

        $db = Database::connection();
        $owns = $this->begin($db);

        try {
            $stmt = $db->prepare("SELECT * FROM prescriptions WHERE id = :id AND deleted_at IS NULL FOR UPDATE");
            $stmt->execute(['id' => $prescriptionId]);
            $rx = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$rx) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Prescription not found.', 'not_found' => true];
            }
            if ($rx['status'] !== 'active' || in_array($rx['dispense_status'], ['closed', 'none'], true)) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Only a prescription still waiting to be dispensed, or with refills left, can be closed.'];
            }

            $now = date('Y-m-d H:i:s');
            $db->prepare(
                "UPDATE prescriptions SET dispense_status = 'closed', closed_at = :now, closed_by = :user, close_reason = :reason,
                        revision = revision + 1, updated_at = :now2, updated_by = :user2 WHERE id = :id"
            )->execute(['now' => $now, 'user' => (int) $user['id'], 'reason' => mb_substr($reason, 0, 500), 'now2' => $now, 'user2' => (int) $user['id'], 'id' => $prescriptionId]);
            $db->prepare(
                "UPDATE prescription_refill_requests SET status = 'declined', decided_at = :now, decided_by = :user, decline_reason = :reason
                 WHERE prescription_id = :id AND status = 'pending'"
            )->execute(['now' => $now, 'user' => (int) $user['id'], 'reason' => 'Prescription closed: ' . mb_substr($reason, 0, 470), 'id' => $prescriptionId]);

            $this->commit($db, $owns);
        } catch (\Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => "{$rx['rx_number']} closed."];
    }

    /** What a dispensing's medicine labels show. */
    public function labels(int $dispenseId): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT d.*, p.rx_number, p.prescriber_user_id, w.name AS warehouse_name,
                    pt.patient_no, pt.first_name, pt.middle_name, pt.last_name, pt.suffix,
                    " . self::userNameSql('p.prescriber_user_id') . " AS prescriber_name
             FROM prescription_dispenses d
             JOIN prescriptions p ON p.id = d.prescription_id
             JOIN patients pt ON pt.id = d.patient_id
             JOIN warehouses w ON w.id = d.warehouse_id
             WHERE d.id = :id"
        );
        $stmt->execute(['id' => $dispenseId]);
        $d = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$d) {
            return null;
        }

        $stmt = $db->prepare(
            "SELECT i.prescription_item_id, i.fill_number, SUM(i.quantity) AS quantity, MAX(pp.refills) AS refills,
                    GROUP_CONCAT(CONCAT(l.lot_number, IF(l.expires_date IS NULL, '', CONCAT(' exp ', DATE_FORMAT(l.expires_date, '%Y-%m-%d')))) ORDER BY i.id SEPARATOR '; ') AS lots,
                    MIN(l.expires_date) AS earliest_expiry,
                    pp.title, pp.dosage, pp.frequency, pp.route, pp.directions,
                    dr.name AS drug_name, dr.generic_name, dr.brand_name, dr.strength, df.name AS dosage_form, du.name AS unit_name
             FROM prescription_dispense_items i
             JOIN drug_inventory_lots l ON l.id = i.lot_id
             JOIN patient_prescriptions pp ON pp.id = i.prescription_item_id
             JOIN drugs dr ON dr.id = i.drug_id
             LEFT JOIN dosage_forms df ON df.id = dr.dosage_form_id
             LEFT JOIN amount_units du ON du.id = dr.dispensing_unit_id
             WHERE i.dispense_id = :id
             GROUP BY i.prescription_item_id, i.fill_number
             ORDER BY MIN(pp.line_no)"
        );
        $stmt->execute(['id' => $dispenseId]);

        $business = PrescriptionService::business();

        return [
            'dispense_number' => $d['dispense_number'],
            'dispensed_date' => $d['dispensed_date'],
            'status' => $d['status'],
            'rx_number' => $d['rx_number'],
            'patient_name' => self::personName($d),
            'patient_no' => $d['patient_no'],
            'prescriber_name' => $d['prescriber_name'],
            'warehouse_name' => $d['warehouse_name'],
            // The hospital as set up under Business Settings.
            'facility' => ['name' => $business['name'], 'phone' => $business['phone'], 'address' => $business['address'], 'email' => $business['email'], 'logo' => $business['logo']],
            'items' => array_map(fn($r) => [
                'title' => $r['title'], 'drug_name' => $r['drug_name'], 'generic_name' => $r['generic_name'], 'brand_name' => $r['brand_name'],
                'strength' => $r['strength'], 'dosage_form' => $r['dosage_form'], 'unit_name' => $r['unit_name'],
                'quantity' => (float) $r['quantity'], 'dosage' => $r['dosage'], 'frequency' => $r['frequency'], 'route' => $r['route'],
                'directions' => $r['directions'], 'lots' => $r['lots'], 'earliest_expiry' => $r['earliest_expiry'],
                'fill_label' => (int) $r['fill_number'] > 1 ? 'Refill ' . ((int) $r['fill_number'] - 1) . ' of ' . (int) $r['refills'] : null
            ], $stmt->fetchAll(PDO::FETCH_ASSOC))
        ];
    }

    /* ---------------------------------------------------------------
     * Status
     * ------------------------------------------------------------- */

    /**
     * Works out and saves a prescription's dispense_status from what's
     * been given: none / pending / partial / dispensed. A closed one stays
     * closed. Call inside the caller's transaction.
     */
    public static function refreshStatus(int $prescriptionId): string
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT dispense_status FROM prescriptions WHERE id = :id");
        $stmt->execute(['id' => $prescriptionId]);
        $current = $stmt->fetchColumn();

        if ($current === 'closed') {
            return 'closed';
        }

        $stmt = $db->prepare(
            "SELECT pp.id, pp.quantity, pp.refills, du.name AS unit_name
             FROM patient_prescriptions pp
             JOIN drugs dr ON dr.id = pp.drug_id
             LEFT JOIN amount_units du ON du.id = dr.dispensing_unit_id
             WHERE pp.prescription_id = :id AND pp.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $prescriptionId]);
        $lines = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $fills = self::fillsByLine($prescriptionId);
        $refillStarted = false;

        if (!$lines) {
            $status = 'none';
        } else {
            $complete = 0;
            $any = false;
            foreach ($lines as $l) {
                $state = self::lineState(self::parseQuantity($l['quantity'], $l['unit_name']), (int) ($l['refills'] ?? 0), $fills[(int) $l['id']] ?? []);
                $any = $any || $state['given_total'] > self::EPSILON;
                $refillStarted = $refillStarted || $state['current_fill'] > 1;
                if ($state['current_complete']) {
                    $complete++;
                }
            }
            // Each medicine is judged by the fill under way (a started refill counts).
            $status = $complete === count($lines) ? 'dispensed' : ($any ? 'partial' : 'pending');
        }

        // The queue goes by valid_until during the original fill, refill_until once a refill started.
        $db->prepare(
            "UPDATE prescriptions SET dispense_status = :s,
                    fillable_until = " . ($refillStarted ? 'COALESCE(refill_until, valid_until)' : 'valid_until') . "
             WHERE id = :id"
        )->execute(['s' => $status, 'id' => $prescriptionId]);

        return $status;
    }

    /**
     * The prescribed quantity as a number of dispensing units, when it
     * says so plainly: "21", "#21", "21 tablets", "21 tabs". Anything else
     * ("1 box", "2 bottles") is left to the pharmacist (null).
     */
    public static function parseQuantity(?string $text, ?string $unitName): ?float
    {
        $text = strtolower(trim((string) $text));
        if ($text === '' || !preg_match('/^#?\s*(\d+(?:\.\d+)?)\s*([a-z.\s()]*)$/', $text, $m)) {
            return null;
        }

        $word = trim(rtrim(trim($m[2]), '.'));
        $unit = strtolower(trim((string) $unitName));
        $plain = ['', 'pc', 'pcs', 'piece', 'pieces', 'unit', 'units'];
        $short = ['tablet' => ['tab', 'tabs'], 'capsule' => ['cap', 'caps']];

        if (in_array($word, $plain, true)
            || ($unit !== '' && in_array($word, [$unit, $unit . 's', $unit . 'es'], true))
            || ($unit !== '' && in_array($word, $short[$unit] ?? [], true))) {
            return (float) $m[1];
        }

        return null;
    }

    /** Quantity known: all of it given. Unknown: something given. */
    private static function lineComplete(?float $prescribed, float $given): bool
    {
        return $prescribed !== null ? $given >= $prescribed - self::EPSILON : $given > self::EPSILON;
    }

    /** prescription item id => [fill number => quantity given] (completed dispensings). */
    public static function fillsByLine(int $prescriptionId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT i.prescription_item_id, i.fill_number, SUM(i.quantity) AS qty
             FROM prescription_dispense_items i JOIN prescription_dispenses d ON d.id = i.dispense_id
             WHERE d.prescription_id = :id AND d.status = 'completed'
             GROUP BY i.prescription_item_id, i.fill_number"
        );
        $stmt->execute(['id' => $prescriptionId]);

        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[(int) $r['prescription_item_id']][(int) $r['fill_number']] = round((float) $r['qty'], 3);
        }

        return $out;
    }

    /**
     * Where a medicine line stands: the fill under way (the latest one
     * started; 1 = the original), what's been given in it, whether it's
     * complete, and the refills used / left.
     */
    public static function lineState(?float $prescribed, int $refills, array $fills): array
    {
        $current = $fills ? max(array_keys($fills)) : 1;
        $givenCurrent = round($fills[$current] ?? 0.0, 3);
        $used = $current - 1;

        return [
            'current_fill' => $current,
            'given_current' => $givenCurrent,
            'given_total' => round(array_sum($fills), 3),
            'current_complete' => self::lineComplete($prescribed, $givenCurrent),
            'refills_used' => $used,
            'refills_remaining' => max(0, $refills - $used)
        ];
    }

    /** prescription item id => its pending refill request. */
    private function pendingRequests(int $prescriptionId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT r.id, r.prescription_item_id, r.source, r.notes, r.created_at, " . self::userNameSql('r.created_by') . " AS requested_by_name
             FROM prescription_refill_requests r WHERE r.prescription_id = :id AND r.status = 'pending' ORDER BY r.created_at"
        );
        $stmt->execute(['id' => $prescriptionId]);

        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[(int) $r['prescription_item_id']] = [
                'id' => (int) $r['id'], 'prescription_item_id' => (int) $r['prescription_item_id'], 'source' => $r['source'],
                'notes' => $r['notes'], 'created_at' => $r['created_at'], 'requested_by_name' => $r['requested_by_name']
            ];
        }

        return $out;
    }

    /* ---------------------------------------------------------------
     * Charges & payment
     * ------------------------------------------------------------- */

    /**
     * The discount asked for: type (null = none), rate, ID number, reason --
     * or ['error', 'field'] when it can't be given.
     */
    private function validateDiscount(array $data, int $patientId): array
    {
        $type = trim((string) ($data['discount_type'] ?? ''));
        if ($type === '' || $type === 'none') {
            return ['type' => null, 'rate' => 0.0, 'id_no' => null, 'reason' => null];
        }
        if (!isset(self::DISCOUNTS[$type])) {
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
            $stmt->execute(['id' => $patientId]);
            $birthdate = $stmt->fetchColumn();
            if ($birthdate && (new \DateTime($birthdate))->diff(new \DateTime())->y < 60) {
                return ['error' => 'The Senior Citizen discount is for patients 60 or older. This patient\'s birthdate says otherwise.', 'field' => 'discount_type'];
            }
        }

        return ['type' => $type, 'rate' => self::DISCOUNTS[$type]['rate'], 'id_no' => $idNo, 'reason' => $reason];
    }

    /** Paid at the pharmacy (or later in the ledger) for a dispensing. */
    private function paidFor(int $dispenseId): float
    {
        $stmt = Database::connection()->prepare(
            "SELECT COALESCE(SUM(payment_amount), 0) FROM patient_ledger_payments WHERE dispense_id = :id AND deleted_at IS NULL"
        );
        $stmt->execute(['id' => $dispenseId]);

        return round((float) $stmt->fetchColumn(), 2);
    }

    /**
     * Take payment for a dispensing. data: amount, method, reference?
     * Recorded in the patient ledger against the prescription's visit (if
     * any). No more than what's still owed.
     */
    public function recordPayment(int $dispenseId, array $data, array $user): array
    {
        $amount = round((float) ($data['amount'] ?? 0), 2);
        $method = trim((string) ($data['method'] ?? ''));
        $reference = self::text($data['reference'] ?? null, 100);

        if ($amount <= 0) {
            return ['success' => false, 'message' => 'Enter the amount paid.', 'errors' => ['amount' => 'Enter the amount paid.']];
        }
        if (!in_array($method, self::PAYMENT_METHODS, true)) {
            return ['success' => false, 'message' => 'Choose how it was paid.', 'errors' => ['method' => 'Choose how it was paid.']];
        }

        $db = Database::connection();
        $owns = $this->begin($db);

        try {
            $stmt = $db->prepare(
                "SELECT d.*, p.encounter_id, p.rx_number FROM prescription_dispenses d JOIN prescriptions p ON p.id = d.prescription_id WHERE d.id = :id FOR UPDATE"
            );
            $stmt->execute(['id' => $dispenseId]);
            $dispense = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$dispense) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Dispensing not found.', 'not_found' => true];
            }
            if ($dispense['status'] !== 'completed') {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'This dispensing was undone, so there\'s nothing to pay.'];
            }
            if ($dispense['check_status'] === 'awaiting') {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'This dispensing has a high-alert medicine that hasn\'t had its second check yet. Take payment once it\'s checked and handed over.'];
            }

            $due = round((float) $dispense['net_amount'] - $this->paidFor($dispenseId), 2);
            if ($due <= 0) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'This dispensing is already paid in full.'];
            }
            if ($amount > $due + 0.004) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Only ₱' . number_format($due, 2) . ' is still owed.', 'errors' => ['amount' => 'At most ₱' . number_format($due, 2) . '.']];
            }

            $db->prepare(
                "INSERT INTO patient_ledger_payments (patient_id, encounter_id, dispense_id, payer_type, payment_type, payment_date, payment_amount, adjustment_amount, notes, created_at, created_by)
                 VALUES (:patient, :enc, :d, 'patient', :method, :date, :amount, 0, :notes, :now, :user)"
            )->execute([
                'patient' => $dispense['patient_id'], 'enc' => $dispense['encounter_id'], 'd' => $dispenseId, 'method' => $method,
                'date' => date('Y-m-d'), 'amount' => $amount,
                'notes' => mb_substr("Pharmacy {$dispense['dispense_number']} ({$dispense['rx_number']})" . ($reference ? " ref {$reference}" : ''), 0, 255),
                'now' => date('Y-m-d H:i:s'), 'user' => (int) $user['id']
            ]);

            $this->commit($db, $owns);
        } catch (\Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        $left = round($due - $amount, 2);

        return ['success' => true, 'message' => 'Payment of ₱' . number_format($amount, 2) . ' recorded.' . ($left > 0 ? ' ₱' . number_format($left, 2) . ' is still owed.' : ' Paid in full.'),
            'data' => ['balance' => $left]];
    }

    /** What the pharmacy charge slip / receipt shows. */
    public function chargeSlip(int $dispenseId): ?array
    {
        $labels = $this->labels($dispenseId);
        if (!$labels) {
            return null;
        }

        $db = Database::connection();
        $stmt = $db->prepare("SELECT * FROM prescription_dispenses WHERE id = :id");
        $stmt->execute(['id' => $dispenseId]);
        $d = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $db->prepare("SELECT description, quantity, unit_price, gross_amount, discount_amount, net_amount, status FROM pharmacy_charges WHERE dispense_id = :id ORDER BY id");
        $stmt->execute(['id' => $dispenseId]);
        $charges = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $db->prepare(
            "SELECT payment_date, payment_type, payment_amount, notes FROM patient_ledger_payments WHERE dispense_id = :id AND deleted_at IS NULL ORDER BY id"
        );
        $stmt->execute(['id' => $dispenseId]);
        $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $paid = round(array_sum(array_column($payments, 'payment_amount')), 2);

        return [
            'dispense_number' => $labels['dispense_number'], 'dispensed_date' => $labels['dispensed_date'], 'status' => $d['status'],
            'check_status' => $d['check_status'],
            'rx_number' => $labels['rx_number'], 'patient_name' => $labels['patient_name'], 'patient_no' => $labels['patient_no'],
            'prescriber_name' => $labels['prescriber_name'], 'facility' => $labels['facility'], 'warehouse_name' => $labels['warehouse_name'],
            'discount_label' => $d['discount_type'] ? (self::DISCOUNTS[$d['discount_type']]['label'] ?? $d['discount_type']) : null,
            'discount_rate' => (float) $d['discount_rate'], 'discount_id_no' => $d['discount_id_no'], 'discount_reason' => $d['discount_reason'],
            'charges' => array_map(fn($c) => [
                'description' => $c['description'], 'quantity' => (float) $c['quantity'], 'unit_price' => (float) $c['unit_price'],
                'gross_amount' => (float) $c['gross_amount'], 'discount_amount' => (float) $c['discount_amount'], 'net_amount' => (float) $c['net_amount'],
                'status' => $c['status']
            ], $charges),
            'gross_amount' => (float) $d['gross_amount'], 'discount_amount' => (float) $d['discount_amount'], 'net_amount' => (float) $d['net_amount'],
            'payments' => array_map(fn($p) => ['date' => $p['payment_date'], 'method' => $p['payment_type'], 'amount' => (float) $p['payment_amount']], $payments),
            'paid_amount' => $paid,
            'balance' => $d['status'] === 'completed' ? round((float) $d['net_amount'] - $paid, 2) : round(-$paid, 2)
        ];
    }

    /* ---------------------------------------------------------------
     * Refill requests
     * ------------------------------------------------------------- */

    /**
     * Refill standing of prescription medicine lines, for the patient
     * chart and portal: prescription item id => refills allowed / used /
     * left, refill_until, whether a refill can be asked for now, and the
     * latest request (pending, dispensed or declined).
     */
    public static function refillInfo(array $itemIds): array
    {
        $itemIds = array_values(array_unique(array_filter(array_map('intval', $itemIds))));
        if (!$itemIds) {
            return [];
        }

        $db = Database::connection();
        $in = implode(',', $itemIds);
        $today = date('Y-m-d');

        $lines = $db->query(
            "SELECT pp.id, pp.prescription_id, pp.drug_id, pp.quantity, pp.refills, du.name AS unit_name,
                    p.status, p.dispense_status, p.refill_until
             FROM patient_prescriptions pp
             JOIN prescriptions p ON p.id = pp.prescription_id
             LEFT JOIN drugs dr ON dr.id = pp.drug_id
             LEFT JOIN amount_units du ON du.id = dr.dispensing_unit_id
             WHERE pp.id IN ({$in})"
        )->fetchAll(PDO::FETCH_ASSOC);

        $fills = [];
        foreach ($db->query(
            "SELECT i.prescription_item_id, i.fill_number, SUM(i.quantity) AS qty
             FROM prescription_dispense_items i JOIN prescription_dispenses d ON d.id = i.dispense_id
             WHERE d.status = 'completed' AND i.prescription_item_id IN ({$in})
             GROUP BY i.prescription_item_id, i.fill_number"
        )->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $fills[(int) $r['prescription_item_id']][(int) $r['fill_number']] = (float) $r['qty'];
        }

        $latest = [];
        foreach ($db->query(
            "SELECT r.* FROM prescription_refill_requests r
             WHERE r.id IN (SELECT MAX(r2.id) FROM prescription_refill_requests r2 WHERE r2.prescription_item_id IN ({$in}) GROUP BY r2.prescription_item_id)"
        )->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $latest[(int) $r['prescription_item_id']] = [
                'id' => (int) $r['id'], 'status' => $r['status'], 'created_at' => $r['created_at'],
                'decided_at' => $r['decided_at'], 'decline_reason' => $r['decline_reason']
            ];
        }

        $out = [];
        foreach ($lines as $l) {
            $state = self::lineState(self::parseQuantity($l['quantity'], $l['unit_name']), (int) ($l['refills'] ?? 0), $fills[(int) $l['id']] ?? []);
            $request = $latest[(int) $l['id']] ?? null;
            $open = $l['status'] === 'active' && !in_array($l['dispense_status'], ['closed', 'none'], true) && $l['drug_id'] !== null;
            $out[(int) $l['id']] = [
                'refills_allowed' => (int) ($l['refills'] ?? 0),
                'refills_used' => $state['refills_used'],
                'refills_remaining' => $state['refills_remaining'],
                'refill_until' => $l['refill_until'],
                // The pharmacy closed it: no more refills from it, whatever the count says.
                'is_closed' => $l['dispense_status'] === 'closed',
                'current_fill_complete' => $state['current_complete'],
                'can_request_refill' => $open && $state['current_complete'] && $state['given_total'] > 0 && $state['refills_remaining'] > 0
                    && $l['refill_until'] !== null && $l['refill_until'] >= $today && ($request['status'] ?? null) !== 'pending',
                'refill_request' => $request
            ];
        }

        return $out;
    }

    /**
     * Ask for the next refill of one medicine (patient from the portal, or
     * staff). Refused when there's nothing to refill yet, none are left,
     * the refill period is over, or one is already waiting.
     */
    public function requestRefill(int $itemId, string $source, ?string $notes, int $userId): array
    {
        $db = Database::connection();
        $owns = $this->begin($db);

        try {
            $stmt = $db->prepare(
                "SELECT pp.id, pp.prescription_id, pp.patient_id, pp.title, pp.deleted_at FROM patient_prescriptions pp WHERE pp.id = :id"
            );
            $stmt->execute(['id' => $itemId]);
            $line = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$line || $line['deleted_at'] !== null || !$line['prescription_id']) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Prescription not found.', 'not_found' => true];
            }

            // One request at a time per prescription: lock it.
            $db->prepare("SELECT id FROM prescriptions WHERE id = :id FOR UPDATE")->execute(['id' => $line['prescription_id']]);
            $info = self::refillInfo([$itemId])[$itemId] ?? null;

            $message = null;
            if (($info['refill_request']['status'] ?? null) === 'pending') {
                $message = 'A refill of this medicine has already been requested and is waiting at the pharmacy.';
            } elseif (!$info || !$info['current_fill_complete'] || !$this->hasGiven($itemId)) {
                $message = 'This medicine hasn\'t been fully given yet — collect it at the pharmacy first.';
            } elseif ($info['refills_remaining'] < 1) {
                $message = 'No refills are left on this medicine.';
            } elseif (!$info['refill_until'] || $info['refill_until'] < date('Y-m-d')) {
                $message = 'The refill period for this prescription has ended.';
            } elseif (!$info['can_request_refill']) {
                $message = 'This medicine can\'t be refilled.';
            }

            if ($message) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => $message, 'no_refill' => true];
            }

            $db->prepare(
                "INSERT INTO prescription_refill_requests (prescription_id, prescription_item_id, patient_id, source, status, notes, created_at, created_by)
                 VALUES (:rx, :item, :patient, :source, 'pending', :notes, :now, :user)"
            )->execute([
                'rx' => $line['prescription_id'], 'item' => $itemId, 'patient' => $line['patient_id'],
                'source' => in_array($source, ['portal', 'staff'], true) ? $source : 'staff', 'notes' => self::text($notes, 500),
                'now' => date('Y-m-d H:i:s'), 'user' => $userId ?: null
            ]);
            $id = (int) $db->lastInsertId();

            $this->commit($db, $owns);
        } catch (\Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => 'Refill requested. The pharmacy will prepare it.', 'data' => ['id' => $id]];
    }

    /** The pharmacy won't give this refill; the patient sees the reason. */
    public function declineRefill(int $requestId, string $reason, array $user): array
    {
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Enter why the refill is declined. The patient will see it.', 'errors' => ['reason' => 'Enter a reason.']];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE prescription_refill_requests SET status = 'declined', decided_at = :now, decided_by = :user, decline_reason = :reason
             WHERE id = :id AND status = 'pending'"
        );
        $stmt->execute(['now' => date('Y-m-d H:i:s'), 'user' => (int) $user['id'], 'reason' => mb_substr($reason, 0, 500), 'id' => $requestId]);

        return $stmt->rowCount()
            ? ['success' => true, 'message' => 'Refill request declined.']
            : ['success' => false, 'message' => 'This refill request is no longer waiting.'];
    }

    /** A patient withdraws their own pending request. */
    public function cancelRefillRequest(int $requestId, int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "UPDATE prescription_refill_requests SET status = 'cancelled', decided_at = :now
             WHERE id = :id AND patient_id = :patient AND status = 'pending'"
        );
        $stmt->execute(['now' => date('Y-m-d H:i:s'), 'id' => $requestId, 'patient' => $patientId]);

        return $stmt->rowCount()
            ? ['success' => true, 'message' => 'Refill request cancelled.']
            : ['success' => false, 'message' => 'This refill request is no longer waiting.', 'not_found' => true];
    }

    private function hasGiven(int $itemId): bool
    {
        $stmt = Database::connection()->prepare(
            "SELECT 1 FROM prescription_dispense_items i JOIN prescription_dispenses d ON d.id = i.dispense_id
             WHERE i.prescription_item_id = :id AND d.status = 'completed' LIMIT 1"
        );
        $stmt->execute(['id' => $itemId]);

        return (bool) $stmt->fetchColumn();
    }

    private function history(int $prescriptionId, ?int $viewerId = null): array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT d.*, w.name AS warehouse_name, " . self::userNameSql('d.created_by') . " AS dispensed_by_name,
                    " . self::userNameSql('d.voided_by') . " AS voided_by_name,
                    " . self::userNameSql('d.checked_by') . " AS checked_by_name
             FROM prescription_dispenses d JOIN warehouses w ON w.id = d.warehouse_id
             WHERE d.prescription_id = :id ORDER BY d.created_at DESC, d.id DESC"
        );
        $stmt->execute(['id' => $prescriptionId]);
        $dispenses = $stmt->fetchAll(PDO::FETCH_ASSOC);
        if (!$dispenses) {
            return [];
        }

        $items = [];
        foreach ($db->query(
            "SELECT i.dispense_id, i.quantity, i.fill_number, pp.title, pp.refills, du.name AS unit_name, l.lot_number, l.expires_date, dr.is_high_alert
             FROM prescription_dispense_items i
             JOIN patient_prescriptions pp ON pp.id = i.prescription_item_id
             JOIN drug_inventory_lots l ON l.id = i.lot_id
             JOIN drugs dr ON dr.id = i.drug_id
             LEFT JOIN amount_units du ON du.id = dr.dispensing_unit_id
             WHERE i.dispense_id IN (" . implode(',', array_map(fn($d) => (int) $d['id'], $dispenses)) . ")
             ORDER BY pp.line_no, i.id"
        )->fetchAll(PDO::FETCH_ASSOC) as $i) {
            $items[(int) $i['dispense_id']][] = [
                'title' => $i['title'], 'quantity' => (float) $i['quantity'], 'unit_name' => $i['unit_name'],
                'lot_number' => $i['lot_number'], 'expires_date' => $i['expires_date'], 'is_high_alert' => (bool) $i['is_high_alert'],
                'fill_label' => (int) $i['fill_number'] > 1 ? 'Refill ' . ((int) $i['fill_number'] - 1) . ' of ' . (int) $i['refills'] : null
            ];
        }

        return array_map(fn($d) => [
            'id' => (int) $d['id'], 'dispense_number' => $d['dispense_number'], 'dispensed_date' => $d['dispensed_date'],
            'warehouse_name' => $d['warehouse_name'], 'dispensed_by_name' => $d['dispensed_by_name'], 'created_at' => $d['created_at'],
            'notes' => $d['notes'], 'status' => $d['status'], 'voided_at' => $d['voided_at'], 'voided_by_name' => $d['voided_by_name'],
            'void_reason' => $d['void_reason'], 'items' => $items[(int) $d['id']] ?? [],
            'check_status' => $d['check_status'], 'checked_at' => $d['checked_at'], 'checked_by_name' => $d['checked_by_name'], 'check_notes' => $d['check_notes'],
            'prepared_by_viewer' => $viewerId !== null && (int) $d['created_by'] === $viewerId,
            'can_check' => $d['status'] === 'completed' && $d['check_status'] === 'awaiting' && $viewerId !== null && (int) $d['created_by'] !== $viewerId,
            'discount_type' => $d['discount_type'], 'discount_label' => $d['discount_type'] ? (self::DISCOUNTS[$d['discount_type']]['label'] ?? $d['discount_type']) : null,
            'discount_rate' => (float) $d['discount_rate'], 'discount_id_no' => $d['discount_id_no'], 'discount_reason' => $d['discount_reason'],
            'gross_amount' => (float) $d['gross_amount'], 'discount_amount' => (float) $d['discount_amount'], 'net_amount' => (float) $d['net_amount'],
            'paid_amount' => $paid = $this->paidFor((int) $d['id']),
            'balance' => $d['status'] === 'completed' ? round((float) $d['net_amount'] - $paid, 2) : round(-$paid, 2)
        ], $dispenses);
    }

    /** The patient a prescription or dispensing belongs to (for access checks). */
    public function patientIdOfPrescription(int $id): ?int
    {
        $stmt = Database::connection()->prepare("SELECT patient_id FROM prescriptions WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);
        $v = $stmt->fetchColumn();
        return $v !== false ? (int) $v : null;
    }

    /* ---------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------- */

    private static function personName(array $r): string
    {
        return preg_replace('/\s+/', ' ', trim(implode(' ', array_filter([$r['first_name'] ?? '', $r['middle_name'] ?? '', $r['last_name'] ?? '', $r['suffix'] ?? '']))));
    }

    private static function qty(float $v): string
    {
        return rtrim(rtrim(number_format($v, 3, '.', ','), '0'), '.');
    }

    private static function text($value, int $max): ?string
    {
        $value = trim((string) ($value ?? ''));
        return $value === '' ? null : mb_substr($value, 0, $max);
    }

    private function begin(PDO $db): bool
    {
        if (!$db->inTransaction()) {
            $db->beginTransaction();
            return true;
        }
        $db->exec('SAVEPOINT dispensing_step');
        return false;
    }

    private function commit(PDO $db, bool $owns): void
    {
        $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT dispensing_step');
    }

    private function rollBack(PDO $db, bool $owns): void
    {
        $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT dispensing_step');
    }

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }
}
