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

    private const QUEUE_LIMIT = 300;

    /* ---------------------------------------------------------------
     * Reading
     * ------------------------------------------------------------- */

    /** Filters: view (to_fill | expired | partial | dispensed | closed | all), q? */
    public function queue(array $filters): array
    {
        $db = Database::connection();
        $today = date('Y-m-d');
        $view = $filters['view'] ?? 'to_fill';
        $where = ["p.deleted_at IS NULL", "p.status = 'active'"];
        $params = [];

        switch ($view) {
            case 'expired':
                $where[] = "p.dispense_status IN ('pending', 'partial') AND p.valid_until < :today";
                $params['today'] = $today;
                $order = 'p.valid_until DESC, p.id DESC';
                break;
            case 'partial':
                $where[] = "p.dispense_status = 'partial' AND (p.valid_until IS NULL OR p.valid_until >= :today)";
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
                $where[] = "p.dispense_status IN ('pending', 'partial') AND (p.valid_until IS NULL OR p.valid_until >= :today)";
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
            "SELECT p.id, p.rx_number, p.patient_id, p.prescribed_date, p.valid_until, p.dispense_status, p.last_dispensed_at, p.closed_at,
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
                SUM(CASE WHEN dispense_status IN ('pending', 'partial') AND (valid_until IS NULL OR valid_until >= :t1) THEN 1 ELSE 0 END) AS to_fill,
                SUM(CASE WHEN dispense_status = 'partial' AND (valid_until IS NULL OR valid_until >= :t2) THEN 1 ELSE 0 END) AS partial,
                SUM(CASE WHEN dispense_status IN ('pending', 'partial') AND valid_until < :t3 THEN 1 ELSE 0 END) AS expired
             FROM prescriptions WHERE deleted_at IS NULL AND status = 'active'"
        );
        $counts->execute(['t1' => $today, 't2' => $today, 't3' => $today]);
        $c = $counts->fetch(PDO::FETCH_ASSOC);

        return [
            'view' => $view,
            'counts' => ['to_fill' => (int) $c['to_fill'], 'partial' => (int) $c['partial'], 'expired' => (int) $c['expired']],
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
                'is_expired' => $r['valid_until'] !== null && $r['valid_until'] < $today,
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

    /** One prescription, ready to dispense. */
    public function detail(int $prescriptionId): ?array
    {
        $slip = (new PrescriptionService())->get($prescriptionId);
        if (!$slip) {
            return null;
        }

        $db = Database::connection();
        $today = date('Y-m-d');

        $stmt = $db->prepare(
            "SELECT p.dispense_status, p.closed_at, p.close_reason, " . self::userNameSql('p.closed_by') . " AS closed_by_name,
                    pt.patient_no, pt.first_name, pt.middle_name, pt.last_name, pt.suffix, pt.sex, pt.birthdate
             FROM prescriptions p JOIN patients pt ON pt.id = p.patient_id WHERE p.id = :id"
        );
        $stmt->execute(['id' => $prescriptionId]);
        $head = $stmt->fetch(PDO::FETCH_ASSOC);

        $given = $this->givenByLine($prescriptionId);

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

        $items = array_map(function ($item) use ($given, $lots) {
            $prescribed = self::parseQuantity($item['quantity'], $item['drug_unit_name']);
            $dispensed = round($given[$item['id']] ?? 0, 3);

            return $item + [
                'can_dispense' => $item['drug_id'] !== null,
                'prescribed_quantity' => $prescribed,
                'dispensed_quantity' => $dispensed,
                'remaining_quantity' => $prescribed !== null ? max(0.0, round($prescribed - $dispensed, 3)) : null,
                'is_complete' => self::lineComplete($prescribed, $dispensed),
                'lots' => $item['drug_id'] !== null ? ($lots[$item['drug_id']] ?? []) : []
            ];
        }, $slip['items']);

        $statusOpen = $slip['status'] === 'active' && in_array($head['dispense_status'], ['pending', 'partial'], true);

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
            // Why it can't be dispensed right now, if it can't.
            'blocked_reason' => $slip['status'] === 'cancelled' ? 'This prescription was cancelled.'
                : ($slip['is_expired'] && $statusOpen ? 'This prescription expired on ' . $slip['valid_until'] . ' and can no longer be filled. The doctor needs to write a new one.' : null),
            'can_dispense' => $statusOpen && !$slip['is_expired'],
            'can_close' => $statusOpen,
            'history' => $this->history($prescriptionId)
        ];
    }

    public function options(): array
    {
        return [
            'warehouses' => Database::connection()->query(
                "SELECT id, name, code, location_type FROM warehouses WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name"
            )->fetchAll(PDO::FETCH_ASSOC)
        ];
    }

    /* ---------------------------------------------------------------
     * Dispensing
     * ------------------------------------------------------------- */

    /**
     * data: prescription_id, warehouse_id, notes?,
     *       items: [{prescription_item_id, quantity, lot_id?}]
     * lot_id picks one lot; without it, earliest expiry first at the location.
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
            if ($rx['valid_until'] !== null && $rx['valid_until'] < $today) {
                return $fail("This prescription expired on {$rx['valid_until']} and can no longer be filled.");
            }
            if (!in_array($rx['dispense_status'], ['pending', 'partial'], true)) {
                return $fail('This prescription has nothing left to dispense.');
            }

            $stmt = $db->prepare("SELECT id, name FROM warehouses WHERE id = :id AND deleted_at IS NULL AND is_active = 1");
            $stmt->execute(['id' => $warehouseId]);
            $warehouse = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$warehouse) {
                return $fail('Choose the storage location you are dispensing from.', ['warehouse_id' => 'Choose a location.']);
            }

            $stmt = $db->prepare(
                "SELECT pp.id, pp.drug_id, pp.title, pp.quantity, d.name AS drug_name, du.name AS unit_name
                 FROM patient_prescriptions pp
                 LEFT JOIN drugs d ON d.id = pp.drug_id
                 LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
                 WHERE pp.prescription_id = :id AND pp.deleted_at IS NULL"
            );
            $stmt->execute(['id' => $prescriptionId]);
            $lines = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), null, 'id');
            $given = $this->givenByLine($prescriptionId);

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
                $already = $given[$lineId] ?? 0.0;
                if ($prescribed !== null && $quantity > $prescribed - $already + self::EPSILON) {
                    $left = max(0, round($prescribed - $already, 3));
                    $errors[$key] = $left > 0
                        ? 'Only ' . self::qty($left) . " {$line['unit_name']} left to give on this prescription."
                        : 'This medicine has already been given in full.';
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
                    $plan[] = ['line' => $line, 'lot_id' => (int) $lot['id'], 'quantity' => $take];
                    $left = round($left - $take, 3);
                }
            }

            if ($errors) {
                return $fail('Some medicines can\'t be given as entered.', $errors);
            }

            $now = date('Y-m-d H:i:s');
            $stmt = $db->prepare("SELECT first_name, last_name FROM patients WHERE id = :id");
            $stmt->execute(['id' => $rx['patient_id']]);
            $patient = $stmt->fetch(PDO::FETCH_ASSOC);
            $patientName = trim(($patient['first_name'] ?? '') . ' ' . ($patient['last_name'] ?? ''));

            $db->prepare(
                "INSERT INTO prescription_dispenses (dispense_number, prescription_id, patient_id, warehouse_id, dispensed_date, notes, status, created_at, created_by)
                 VALUES (:tmp, :rx, :patient, :wh, :date, :notes, 'completed', :now, :user)"
            )->execute([
                'tmp' => 'NEW-' . bin2hex(random_bytes(8)), 'rx' => $prescriptionId, 'patient' => $rx['patient_id'], 'wh' => $warehouseId,
                'date' => $today, 'notes' => self::text($data['notes'] ?? null, 500), 'now' => $now, 'user' => $userId
            ]);
            $dispenseId = (int) $db->lastInsertId();
            $number = 'DSP-' . date('Y') . '-' . str_pad((string) $dispenseId, 5, '0', STR_PAD_LEFT);
            $db->prepare("UPDATE prescription_dispenses SET dispense_number = :n WHERE id = :id")->execute(['n' => $number, 'id' => $dispenseId]);

            $insertItem = $db->prepare(
                "INSERT INTO prescription_dispense_items (dispense_id, prescription_item_id, drug_id, lot_id, quantity, unit_cost, created_at)
                 VALUES (:d, :item, :drug, :lot, :qty, :cost, :now)"
            );
            $deduct = $db->prepare("UPDATE drug_inventory_lots SET quantity_on_hand = quantity_on_hand - :qty, updated_at = :now, updated_by = :user WHERE id = :id");

            foreach ($plan as $p) {
                $cost = StockLedgerService::lotCost($p['lot_id'], (int) $p['line']['drug_id']);
                $insertItem->execute(['d' => $dispenseId, 'item' => $p['line']['id'], 'drug' => $p['line']['drug_id'], 'lot' => $p['lot_id'],
                    'qty' => $p['quantity'], 'cost' => $cost, 'now' => $now]);
                $itemId = (int) $db->lastInsertId();
                $deduct->execute(['qty' => $p['quantity'], 'now' => $now, 'user' => $userId, 'id' => $p['lot_id']]);

                StockLedgerService::record($p['lot_id'], 'dispensed', -$p['quantity'], 'prescription_dispense_items', $itemId, $userId, [
                    'date' => $today, 'unit_cost' => $cost, 'reference_no' => $number, 'counterparty' => $patientName, 'notes' => $rx['rx_number']
                ]);
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
            'message' => "Dispensed under {$number}." . ($status === 'partial' ? ' Some medicines are still to be given.' : ''),
            'data' => ['dispense_id' => $dispenseId, 'dispense_number' => $number, 'dispense_status' => $status]
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

            // A closed prescription stays closed; otherwise its status follows what's still given.
            self::refreshStatus((int) $dispense['prescription_id']);
            $db->prepare("UPDATE prescriptions SET revision = revision + 1 WHERE id = :id")->execute(['id' => $dispense['prescription_id']]);

            $this->commit($db, $owns);
        } catch (\Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }

        return ['success' => true, 'message' => "{$dispense['dispense_number']} undone; the stock is back."];
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
            if ($rx['status'] !== 'active' || !in_array($rx['dispense_status'], ['pending', 'partial'], true)) {
                $this->rollBack($db, $owns);
                return ['success' => false, 'message' => 'Only a prescription still waiting to be dispensed can be closed.'];
            }

            $now = date('Y-m-d H:i:s');
            $db->prepare(
                "UPDATE prescriptions SET dispense_status = 'closed', closed_at = :now, closed_by = :user, close_reason = :reason,
                        revision = revision + 1, updated_at = :now2, updated_by = :user2 WHERE id = :id"
            )->execute(['now' => $now, 'user' => (int) $user['id'], 'reason' => mb_substr($reason, 0, 500), 'now2' => $now, 'user2' => (int) $user['id'], 'id' => $prescriptionId]);

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
            "SELECT i.prescription_item_id, SUM(i.quantity) AS quantity,
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
             GROUP BY i.prescription_item_id
             ORDER BY MIN(pp.line_no)"
        );
        $stmt->execute(['id' => $dispenseId]);

        $facility = $db->query(
            "SELECT name, physical_address_line1, physical_city, phone FROM facilities WHERE deleted_at IS NULL AND COALESCE(is_inactive, 0) = 0
             ORDER BY is_primary_business_entity DESC, is_service_location DESC, id LIMIT 1"
        )->fetch(PDO::FETCH_ASSOC) ?: null;

        return [
            'dispense_number' => $d['dispense_number'],
            'dispensed_date' => $d['dispensed_date'],
            'status' => $d['status'],
            'rx_number' => $d['rx_number'],
            'patient_name' => self::personName($d),
            'patient_no' => $d['patient_no'],
            'prescriber_name' => $d['prescriber_name'],
            'warehouse_name' => $d['warehouse_name'],
            'facility' => $facility ? ['name' => $facility['name'], 'phone' => $facility['phone'],
                'address' => implode(', ', array_filter([$facility['physical_address_line1'], $facility['physical_city']]))] : null,
            'items' => array_map(fn($r) => [
                'title' => $r['title'], 'drug_name' => $r['drug_name'], 'generic_name' => $r['generic_name'], 'brand_name' => $r['brand_name'],
                'strength' => $r['strength'], 'dosage_form' => $r['dosage_form'], 'unit_name' => $r['unit_name'],
                'quantity' => (float) $r['quantity'], 'dosage' => $r['dosage'], 'frequency' => $r['frequency'], 'route' => $r['route'],
                'directions' => $r['directions'], 'lots' => $r['lots'], 'earliest_expiry' => $r['earliest_expiry']
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
            "SELECT pp.id, pp.quantity, du.name AS unit_name,
                    COALESCE((SELECT SUM(i.quantity) FROM prescription_dispense_items i JOIN prescription_dispenses d ON d.id = i.dispense_id
                              WHERE i.prescription_item_id = pp.id AND d.status = 'completed'), 0) AS given
             FROM patient_prescriptions pp
             JOIN drugs dr ON dr.id = pp.drug_id
             LEFT JOIN amount_units du ON du.id = dr.dispensing_unit_id
             WHERE pp.prescription_id = :id AND pp.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $prescriptionId]);
        $lines = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$lines) {
            $status = 'none';
        } else {
            $complete = 0;
            $any = false;
            foreach ($lines as $l) {
                $given = (float) $l['given'];
                $any = $any || $given > self::EPSILON;
                if (self::lineComplete(self::parseQuantity($l['quantity'], $l['unit_name']), $given)) {
                    $complete++;
                }
            }
            $status = $complete === count($lines) ? 'dispensed' : ($any ? 'partial' : 'pending');
        }

        $db->prepare("UPDATE prescriptions SET dispense_status = :s WHERE id = :id")->execute(['s' => $status, 'id' => $prescriptionId]);

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

    /** prescription item id => quantity given (completed dispensings). */
    private function givenByLine(int $prescriptionId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT i.prescription_item_id, SUM(i.quantity) AS qty
             FROM prescription_dispense_items i JOIN prescription_dispenses d ON d.id = i.dispense_id
             WHERE d.prescription_id = :id AND d.status = 'completed'
             GROUP BY i.prescription_item_id"
        );
        $stmt->execute(['id' => $prescriptionId]);

        return array_map('floatval', array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'qty', 'prescription_item_id'));
    }

    private function history(int $prescriptionId): array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT d.*, w.name AS warehouse_name, " . self::userNameSql('d.created_by') . " AS dispensed_by_name,
                    " . self::userNameSql('d.voided_by') . " AS voided_by_name
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
            "SELECT i.dispense_id, i.quantity, pp.title, du.name AS unit_name, l.lot_number, l.expires_date
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
                'lot_number' => $i['lot_number'], 'expires_date' => $i['expires_date']
            ];
        }

        return array_map(fn($d) => [
            'id' => (int) $d['id'], 'dispense_number' => $d['dispense_number'], 'dispensed_date' => $d['dispensed_date'],
            'warehouse_name' => $d['warehouse_name'], 'dispensed_by_name' => $d['dispensed_by_name'], 'created_at' => $d['created_at'],
            'notes' => $d['notes'], 'status' => $d['status'], 'voided_at' => $d['voided_at'], 'voided_by_name' => $d['voided_by_name'],
            'void_reason' => $d['void_reason'], 'items' => $items[(int) $d['id']] ?? []
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
