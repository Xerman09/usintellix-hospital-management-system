<?php

namespace App\Modules\InpatientOrders\Services;

use App\Core\Database;
use App\Modules\DrugInventory\Services\StockLedgerService;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\NursingStaff\Services\NursingStaffService;
use App\Modules\StockLevels\Services\StockLevelService;
use PDO;

/**
 * Ward medicine cabinets (department medicine stock, Phase 1).
 *
 * A ward's cabinet is the storage location linked to it (hospital_wards.stock_warehouse_id),
 * with minimum / maximum levels per medicine (warehouse_stock_levels). A nurse takes medicine
 * out for one patient's order and dose time ("withdrawal"): it is deducted at once, earliest
 * expiry first, through the medicine ledger ('dispensed', source cabinet_withdrawal_lots).
 * It is then given (recorded on the MAR, which links it to the dose and charges the patient),
 * returned to the cabinet ('dispense_voided'), or wasted (with a reason; a witness for
 * high-alert and controlled medicines). Withdrawals still open after an hour remind the nurse.
 */
class CabinetService
{
    public const TAKERS = ['admin', 'nurse', 'charge_nurse'];
    public const VIEWERS = ['admin', 'nurse', 'charge_nurse', 'pharmacist', 'doctor'];
    /** Who sets the cabinet's minimum / maximum levels. A charge nurse only for their own wards. */
    public const LEVEL_EDITORS = ['admin', 'pharmacist', 'charge_nurse'];
    public const OPEN_REMIND_MIN = 60;
    private const EPSILON = 0.0005;
    private const ACTIVE = "('Admitted', 'Pending Discharge')";

    private MarService $mar;
    private MedSupplyService $supply;

    public function __construct()
    {
        $this->mar = new MarService();
        $this->supply = new MedSupplyService();
    }

    /**
     * One ward's cabinet: stock with min / max status, the patients' doses that can be taken
     * out now, what is taken and not yet given, and recent activity. filters: ward_id?
     */
    public function view(array $filters, array $actor): array
    {
        $db = Database::connection();
        $wards = $db->query(
            "SELECT hw.id, hw.ward_name, hw.stock_warehouse_id, w.name AS cabinet_name FROM hospital_wards hw
             LEFT JOIN warehouses w ON w.id = hw.stock_warehouse_id AND w.deleted_at IS NULL AND w.is_active = 1
             WHERE hw.is_active = 1 ORDER BY hw.ward_name"
        )->fetchAll(PDO::FETCH_ASSOC);
        $mine = (new NursingStaffService())->wardIds((int) ($actor['id'] ?? 0));
        $wardId = (int) ($filters['ward_id'] ?? 0);
        if (!$wardId) {
            foreach ($wards as $w) {
                if (in_array((int) $w['id'], $mine, true)) {
                    $wardId = (int) $w['id'];
                    break;
                }
            }
        }
        $wardId = $wardId ?: (int) (array_values(array_filter($wards, fn($w) => $w['cabinet_name']))[0]['id'] ?? $wards[0]['id'] ?? 0);
        $ward = array_values(array_filter($wards, fn($w) => (int) $w['id'] === $wardId))[0] ?? null;
        $base = [
            'ward_id' => $wardId,
            'wards' => array_map(fn($w) => ['id' => (int) $w['id'], 'name' => $w['ward_name'], 'cabinet' => $w['cabinet_name'],
                'mine' => in_array((int) $w['id'], $mine, true)], $wards),
            'can_edit_levels' => $this->canEditLevels($actor, $wardId),
        ];
        if (!$ward || !$ward['cabinet_name']) {
            return $base + ['cabinet' => null];
        }
        $cabinetId = (int) $ward['stock_warehouse_id'];

        // Stock: anything with a level or usable stock in the cabinet.
        $levels = (new StockLevelService())->levels($cabinetId);
        $stock = array_values(array_filter($levels['items'] ?? [], fn($i) => $i['min_level'] !== null || $i['on_hand'] > self::EPSILON));
        $usable = [];
        foreach ($stock as $i) {
            $usable[$i['drug_id']] = $i['usable'];
        }

        // Patients and the doses that can be taken out now.
        $stmt = $db->prepare(
            "SELECT a.id FROM inpatient_admissions a JOIN hospital_beds b ON b.id = a.bed_id
             WHERE a.ward_id = :w AND a.status IN " . self::ACTIVE . " ORDER BY b.room_number, b.bed_number"
        );
        $stmt->execute(['w' => $wardId]);
        $openByKey = [];
        foreach ($this->openRows($db, $cabinetId) as $o) {
            $openByKey[$o['order_id'] . '|' . ($o['slot_at'] ?? '')][] = $o;
        }
        $patients = [];
        foreach (array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN)) as $admId) {
            $m = $this->mar->forAdmission($admId, [], $actor);
            $doses = [];
            foreach ($m['rows'] as $row) {
                $o = $row['order'];
                if (!in_array($o['state'], ['active', 'pending'], true)) {
                    continue;
                }
                $info = $this->supply->order($db, $o['id']);
                $qty = $this->supply->defaultQuantity($info);
                $entry = fn(?string $slot, string $state, ?string $blocked = null) => [
                    'order_id' => $o['id'], 'drug_id' => (int) $info['drug_id'], 'drug_name' => $o['drug_name'],
                    'dose' => "{$o['dose_text']} {$o['dose_unit']} {$o['route']}", 'how' => $o['how'], 'order_type' => $o['order_type'],
                    'slot_at' => $slot, 'state' => $state, 'blocked' => $blocked, 'quantity' => $qty, 'unit_name' => $info['unit_name'] ?: 'unit',
                    'in_cabinet' => $usable[(int) $info['drug_id']] ?? 0.0, 'needs_witness' => $o['needs_witness'],
                    'taken' => $openByKey[$o['id'] . '|' . ($slot ?? '')] ?? [],
                ];
                if ($o['state'] === 'pending') {
                    // Not verified yet: can only be taken with an override (an emergency).
                    foreach ($o['order_type'] === 'prn' ? [null] : $this->mar->dueSlots($o['id'], true) as $slot) {
                        $doses[] = $entry($slot, 'unverified') + ['is_stat' => $o['is_stat']];
                    }
                } elseif ($o['order_type'] === 'prn') {
                    $doses[] = $entry(null, 'prn', $row['prn']['blocked'] ?? null);
                } else {
                    foreach ($row['slots'] as $s) {
                        if (in_array($s['state'], ['due', 'late'], true)) {
                            $doses[] = $entry($s['at'], $s['state']);
                        }
                    }
                }
            }
            $a = $m['admission'];
            $patients[] = [
                'admission_id' => $admId, 'patient_name' => $a['patient_name'], 'room' => $a['room'], 'bed' => $a['bed'],
                'allergies' => array_column($m['allergies'], 'name'), 'nurse_name' => $m['shift']['nurse_name'],
                'can_take' => $m['can_give'], 'doses' => $doses,
            ];
        }

        $act = $db->prepare($this->rowSql() . " WHERE w.warehouse_id = :c ORDER BY w.id DESC LIMIT 40");
        $act->execute(['c' => $cabinetId]);

        return $base + [
            'cabinet' => ['id' => $cabinetId, 'name' => $ward['cabinet_name']],
            'stock' => $stock,
            'stock_counts' => $levels['counts'] ?? null,
            // Medicines that can be given a level here (for "add a medicine" when editing levels).
            'catalog' => $base['can_edit_levels'] ? array_values(array_map(fn($i) => ['drug_id' => $i['drug_id'], 'name' => $i['drug_name'], 'unit_name' => $i['unit_name']],
                array_filter($levels['items'] ?? [], fn($i) => $i['is_active'] && $i['min_level'] === null && $i['on_hand'] <= self::EPSILON))) : [],
            'patients' => $patients,
            'open' => $this->openRows($db, $cabinetId),
            'restock' => (new RestockService())->forCabinet($cabinetId),
            'pharmacy_set' => (new MedSupplyService())->pharmacyLocation() !== null,
            'activity' => array_map(fn($r) => $this->shape($r), $act->fetchAll(PDO::FETCH_ASSOC)),
            'can_take' => in_array($actor['role'] ?? '', self::TAKERS, true),
            'now' => (string) $db->query("SELECT NOW()")->fetchColumn(),
        ];
    }

    /**
     * Take out for one patient's dose. data: order_id, slot_at (not for as-needed), quantity?, note?,
     * override_reason? -- an emergency dose of an order the pharmacist hasn't verified yet (logged, the pharmacy alerted).
     */
    public function withdraw(array $data, array $actor): array
    {
        $fail = fn(string $m, array $extra = []) => ['success' => false, 'message' => $m] + $extra;
        if (!in_array($actor['role'] ?? '', self::TAKERS, true)) {
            return $fail('Medicine is taken out of the cabinet by a nurse.', ['forbidden' => true]);
        }
        $db = Database::connection();
        $o = $this->supply->order($db, (int) ($data['order_id'] ?? 0));
        if (!$o) {
            return $fail('Order not found.', ['not_found' => true]);
        }
        $adm = $db->prepare("SELECT a.status, a.patient_id, a.admission_number, a.patient_name, hw.stock_warehouse_id FROM inpatient_admissions a
                             JOIN hospital_wards hw ON hw.id = a.ward_id WHERE a.id = :id");
        $adm->execute(['id' => $o['admission_id']]);
        $a = $adm->fetch(PDO::FETCH_ASSOC);
        if (!in_array($a['status'], ['Admitted', 'Pending Discharge'], true)) {
            return $fail('This patient is no longer admitted.');
        }
        if (!$this->mar->canGive($actor, (int) $o['admission_id'])) {
            return $fail('Only a nurse of this ward (or the patient\'s nurse this shift) can take medicine out for this patient.', ['forbidden' => true]);
        }
        $cabinetId = (int) $a['stock_warehouse_id'];
        if (!$cabinetId) {
            return $fail('This ward has no medicine cabinet set up (Medicine Rounds → Supply settings).');
        }
        $overrideReason = trim((string) ($data['override_reason'] ?? ''));
        $override = $o['status'] === 'pending';
        if ($override && $overrideReason === '') {
            return $fail('This order is waiting for the pharmacist to verify it. In an emergency you can take it with an override: give the reason.',
                ['needs_override' => true, 'errors' => ['override_reason' => 'Required for an override.']]);
        }
        $slot = $o['order_type'] === 'prn' ? null : (string) ($data['slot_at'] ?? '');
        if ($why = $this->mar->doseCheck((int) $o['id'], $slot, $override)) {
            return $fail($why, ['errors' => ['slot_at' => $why]]);
        }
        $slotAt = $slot !== null ? str_replace('T', ' ', substr($slot, 0, 16)) . ':00' : null;
        $dup = $db->prepare("SELECT COUNT(*) FROM cabinet_withdrawals WHERE order_id = :o AND status = 'open' AND slot_at <=> :s");
        $dup->execute(['o' => $o['id'], 's' => $slotAt]);
        if ((int) $dup->fetchColumn()) {
            return $fail('This dose was already taken out and is waiting to be given (or returned).', ['conflict' => true]);
        }
        $raw = $data['quantity'] ?? null;
        $qty = $raw === null || $raw === '' ? $this->supply->defaultQuantity($o) : filter_var($raw, FILTER_VALIDATE_FLOAT);
        if ($qty === false || $qty <= 0 || $qty > 1000) {
            return $fail('Enter how many to take out.', ['errors' => ['quantity' => 'Invalid.']]);
        }
        $qty = round((float) $qty, 3);
        $note = trim((string) ($data['note'] ?? ''));

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT cab_w');
        try {
            $stmt = $db->prepare(
                "SELECT id, quantity_on_hand FROM drug_inventory_lots
                 WHERE drug_id = :d AND warehouse_id = :w AND deleted_at IS NULL AND is_active = 1 AND quantity_on_hand > 0
                   AND (expires_date IS NULL OR expires_date >= CURDATE())
                 ORDER BY expires_date IS NULL, expires_date, id FOR UPDATE"
            );
            $stmt->execute(['d' => $o['drug_id'], 'w' => $cabinetId]);
            $lots = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $usable = array_sum(array_map(fn($l) => (float) $l['quantity_on_hand'], $lots));
            if ($qty > $usable + self::EPSILON) {
                $this->rollBack($db, $owns);
                return $fail($usable > 0 ? 'Only ' . MedSupplyService::num($usable) . ' usable in the cabinet.' : "No usable {$o['drug_name']} in the cabinet: ask the pharmacy.",
                    ['errors' => ['quantity' => 'Not enough in the cabinet.']]);
            }
            $now = (string) $db->query("SELECT NOW()")->fetchColumn();
            $db->prepare(
                "INSERT INTO cabinet_withdrawals (warehouse_id, admission_id, patient_id, order_id, drug_id, slot_at, quantity, status, note, is_override, override_reason, withdrawn_by, withdrawn_at)
                 VALUES (:w, :a, :p, :o, :d, :s, :q, 'open', :n, :ov, :ovr, :by, :now)"
            )->execute([
                'w' => $cabinetId, 'a' => $o['admission_id'], 'p' => $a['patient_id'], 'o' => $o['id'], 'd' => $o['drug_id'], 's' => $slotAt,
                'q' => $qty, 'n' => $note !== '' ? mb_substr($note, 0, 255) : null, 'by' => (int) $actor['id'], 'now' => $now,
                'ov' => $override ? 1 : 0, 'ovr' => $override ? mb_substr($overrideReason, 0, 255) : null,
            ]);
            $id = (int) $db->lastInsertId();
            $insert = $db->prepare("INSERT INTO cabinet_withdrawal_lots (withdrawal_id, lot_id, quantity, unit_cost, created_at) VALUES (:w, :l, :q, :c, :now)");
            $deduct = $db->prepare("UPDATE drug_inventory_lots SET quantity_on_hand = quantity_on_hand - :q, updated_at = :now, updated_by = :u WHERE id = :id");
            $left = $qty;
            foreach ($lots as $lot) {
                if ($left <= self::EPSILON) {
                    break;
                }
                $part = round(min($left, (float) $lot['quantity_on_hand']), 3);
                $cost = StockLedgerService::lotCost((int) $lot['id'], (int) $o['drug_id']);
                $insert->execute(['w' => $id, 'l' => $lot['id'], 'q' => $part, 'c' => $cost, 'now' => $now]);
                $rowId = (int) $db->lastInsertId();
                $deduct->execute(['q' => $part, 'now' => $now, 'u' => (int) $actor['id'], 'id' => $lot['id']]);
                StockLedgerService::record((int) $lot['id'], 'dispensed', -$part, 'cabinet_withdrawal_lots', $rowId, (int) $actor['id'], [
                    'unit_cost' => $cost, 'reference_no' => $a['admission_number'], 'counterparty' => $a['patient_name'],
                    'notes' => "Taken from the ward cabinet: {$o['drug_name']}",
                ]);
                $left = round($left - $part, 3);
            }
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT cab_w');
        } catch (\Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }
        if ($override) {
            // The pharmacy must verify the order now.
            AlertService::raise([
                'type' => 'medication', 'urgency' => 'urgent',
                'title' => "Override: {$o['drug_name']} taken for {$a['patient_name']} before verification",
                'body' => "Reason: {$overrideReason}. Taken out of the ward cabinet by " . ($this->name((int) $actor['id'])) . '. Verify (or reject) the order now.',
                'patient_id' => $a['patient_id'], 'link' => ['tab' => 'med_verification'],
                'targets' => [['role' => 'pharmacist']], 'source_type' => 'cabinet_withdrawals', 'source_id' => $id, 'dedupe_key' => "override:{$id}",
            ], (int) $actor['id']);
        }
        // Below the minimum now? Restock request to the pharmacy.
        try {
            (new RestockService())->check($cabinetId, (int) $actor['id']);
        } catch (\Throwable $e) {
            error_log('restock check failed: ' . $e->getMessage());
        }
        $w = $this->withdrawal($id);
        return ['success' => true, 'message' => MedSupplyService::num($qty) . " {$w['unit_name']}(s) of {$o['drug_name']} taken out for {$a['patient_name']}"
            . ($override ? ' with an override; the pharmacy was alerted to verify the order' : '') . '. Record the dose on the MAR when given.', 'data' => $w];
    }

    /** Put it back in the cabinet (not given). */
    public function giveBack(int $id, string $reason, array $actor): array
    {
        $db = Database::connection();
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT cab_w');
        try {
            $w = $this->lockOpen($db, $id, $actor);
            if (isset($w['error'])) {
                $this->rollBack($db, $owns);
                return $w['error'];
            }
            $reason = trim($reason) !== '' ? trim($reason) : 'Not given';
            $now = (string) $db->query("SELECT NOW()")->fetchColumn();
            $stmt = $db->prepare("SELECT * FROM cabinet_withdrawal_lots WHERE withdrawal_id = :w AND returned_at IS NULL ORDER BY id");
            $stmt->execute(['w' => $id]);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $l) {
                $db->prepare("SELECT id FROM drug_inventory_lots WHERE id = :id FOR UPDATE")->execute(['id' => $l['lot_id']]);
                $db->prepare("UPDATE drug_inventory_lots SET quantity_on_hand = quantity_on_hand + :q, updated_at = :now, updated_by = :u WHERE id = :id")
                    ->execute(['q' => $l['quantity'], 'now' => $now, 'u' => (int) $actor['id'], 'id' => $l['lot_id']]);
                $db->prepare("UPDATE cabinet_withdrawal_lots SET returned_at = :now WHERE id = :id")->execute(['now' => $now, 'id' => $l['id']]);
                StockLedgerService::record((int) $l['lot_id'], 'dispense_voided', (float) $l['quantity'], 'cabinet_withdrawal_lots', (int) $l['id'], (int) $actor['id'], [
                    'unit_cost' => $l['unit_cost'], 'reference_no' => $w['admission_number'], 'counterparty' => $w['patient_name'], 'reason' => mb_substr($reason, 0, 255),
                ]);
            }
            $db->prepare("UPDATE cabinet_withdrawals SET status = 'returned', closed_by = :u, closed_at = :now, close_reason = :r WHERE id = :id")
                ->execute(['u' => (int) $actor['id'], 'now' => $now, 'r' => mb_substr($reason, 0, 255), 'id' => $id]);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT cab_w');
        } catch (\Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }
        AlertService::resolveByKey("cabopen:{$id}", (int) $actor['id'], 'Returned');
        return ['success' => true, 'message' => 'Returned to the cabinet.', 'data' => $this->withdrawal($id)];
    }

    /** Dropped, contaminated, part not used...: stays out of stock, not charged. data: reason, witness_username/password (high-alert / controlled) */
    public function waste(int $id, array $data, array $actor): array
    {
        $reason = trim((string) ($data['reason'] ?? ''));
        if ($reason === '') {
            return ['success' => false, 'message' => 'Say why it is wasted (e.g. dropped on the floor).', 'errors' => ['reason' => 'Required.']];
        }
        $db = Database::connection();
        $check = $this->withdrawal($id);
        if (!$check) {
            return ['success' => false, 'message' => 'Not found.', 'not_found' => true];
        }
        $witness = null;
        if ($check['needs_witness'] && $check['status'] === 'open') {
            $witness = $this->mar->witness($data, (int) $actor['id']);
            if (isset($witness['error'])) {
                return $witness['error'];
            }
        }
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT cab_w');
        try {
            $w = $this->lockOpen($db, $id, $actor);
            if (isset($w['error'])) {
                $this->rollBack($db, $owns);
                return $w['error'];
            }
            $db->prepare("UPDATE cabinet_withdrawals SET status = 'wasted', closed_by = :u, closed_at = NOW(), close_reason = :r, witness_by = :wb WHERE id = :id")
                ->execute(['u' => (int) $actor['id'], 'r' => mb_substr($reason, 0, 255), 'wb' => $witness['id'] ?? null, 'id' => $id]);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT cab_w');
        } catch (\Throwable $e) {
            $this->rollBack($db, $owns);
            throw $e;
        }
        AlertService::resolveByKey("cabopen:{$id}", (int) $actor['id'], 'Wasted');
        return ['success' => true, 'message' => 'Recorded as wasted' . ($witness ? ", witnessed by {$witness['name']}" : '') . '; the patient is not charged.', 'data' => $this->withdrawal($id)];
    }

    /** data: levels [{drug_id, min_level, max_level}] -- the cabinet's minimum / maximum (Stock Levels rules). */
    public function saveLevels(int $wardId, array $levels, array $actor): array
    {
        if (!$this->canEditLevels($actor, $wardId)) {
            return ['success' => false, 'message' => 'The cabinet levels are set by the pharmacy, an admin or the ward\'s charge nurse.', 'forbidden' => true];
        }
        $stmt = Database::connection()->prepare("SELECT stock_warehouse_id FROM hospital_wards WHERE id = :id");
        $stmt->execute(['id' => $wardId]);
        $cabinetId = (int) $stmt->fetchColumn();
        if (!$cabinetId) {
            return ['success' => false, 'message' => 'This ward has no medicine cabinet set up.'];
        }
        $res = (new StockLevelService())->save($cabinetId, $levels, (int) $actor['id']);
        if (!empty($res['success'])) {
            // A minimum raised above the stock: restock request now.
            try {
                $made = (new RestockService())->check($cabinetId, (int) $actor['id']);
                if ($made) {
                    $res['message'] .= " Restock request {$made['st_number']} " . ($made['created'] ? 'sent to' : 'updated for') . ' the pharmacy.';
                }
            } catch (\Throwable $e) {
                error_log('restock check failed: ' . $e->getMessage());
            }
        }
        return $res;
    }

    public function withdrawal(int $id): ?array
    {
        $stmt = Database::connection()->prepare($this->rowSql() . " WHERE w.id = :id");
        $stmt->execute(['id' => $id]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return $r ? $this->shape($r) : null;
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    private function canEditLevels(array $actor, int $wardId): bool
    {
        $role = (string) ($actor['role'] ?? '');
        if ($role === 'charge_nurse') {
            return in_array($wardId, (new NursingStaffService())->wardIds((int) $actor['id']), true);
        }
        return in_array($role, self::LEVEL_EDITORS, true);
    }

    /** The withdrawal, locked, if still open and the actor may close it. */
    private function lockOpen(PDO $db, int $id, array $actor): array
    {
        $stmt = $db->prepare(
            "SELECT w.*, a.admission_number, a.patient_name FROM cabinet_withdrawals w JOIN inpatient_admissions a ON a.id = w.admission_id WHERE w.id = :id FOR UPDATE"
        );
        $stmt->execute(['id' => $id]);
        $w = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$w) {
            return ['error' => ['success' => false, 'message' => 'Not found.', 'not_found' => true]];
        }
        if ($w['status'] !== 'open') {
            return ['error' => ['success' => false, 'message' => "This was already {$w['status']}."]];
        }
        if ((int) $w['withdrawn_by'] !== (int) ($actor['id'] ?? 0) && !in_array($actor['role'] ?? '', ['admin', 'charge_nurse'], true)) {
            return ['error' => ['success' => false, 'message' => 'Only the nurse who took it out (or the charge nurse) can return or waste it.', 'forbidden' => true]];
        }
        return $w;
    }

    private function openRows(PDO $db, int $cabinetId): array
    {
        $stmt = $db->prepare($this->rowSql() . " WHERE w.warehouse_id = :c AND w.status = 'open' ORDER BY w.withdrawn_at");
        $stmt->execute(['c' => $cabinetId]);
        return array_map(fn($r) => $this->shape($r), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    private function rowSql(): string
    {
        return "SELECT w.*, o.drug_name, o.dose, o.dose_unit, o.route, a.patient_name, b.room_number, b.bed_number, d.is_high_alert, d.controlled_class,
                       du.name AS unit_name, TIMESTAMPDIFF(MINUTE, w.withdrawn_at, NOW()) AS open_minutes,
                       " . self::nameSql('w.withdrawn_by') . " AS withdrawn_by_name, " . self::nameSql('w.closed_by') . " AS closed_by_name,
                       " . self::nameSql('w.witness_by') . " AS witness_name
                FROM cabinet_withdrawals w JOIN inpatient_med_orders o ON o.id = w.order_id
                JOIN inpatient_admissions a ON a.id = w.admission_id JOIN hospital_beds b ON b.id = a.bed_id
                JOIN drugs d ON d.id = w.drug_id LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id";
    }

    private function shape(array $r): array
    {
        return [
            'id' => (int) $r['id'], 'order_id' => (int) $r['order_id'], 'admission_id' => (int) $r['admission_id'],
            'patient_name' => $r['patient_name'], 'room' => $r['room_number'], 'bed' => $r['bed_number'],
            'drug_name' => $r['drug_name'], 'dose' => MedSupplyService::num($r['dose']) . " {$r['dose_unit']} {$r['route']}",
            'quantity' => (float) $r['quantity'], 'unit_name' => $r['unit_name'] ?: 'unit', 'slot_at' => $r['slot_at'],
            'status' => $r['status'], 'note' => $r['note'],
            'withdrawn_by' => $r['withdrawn_by'] !== null ? (int) $r['withdrawn_by'] : null, 'withdrawn_by_name' => $r['withdrawn_by'] ? $r['withdrawn_by_name'] : null,
            'withdrawn_at' => $r['withdrawn_at'], 'open_minutes' => $r['status'] === 'open' ? (int) $r['open_minutes'] : null,
            'closed_by_name' => $r['closed_by'] ? $r['closed_by_name'] : null, 'closed_at' => $r['closed_at'], 'close_reason' => $r['close_reason'],
            'witness_name' => $r['witness_by'] ? $r['witness_name'] : null,
            'administration_id' => $r['administration_id'] !== null ? (int) $r['administration_id'] : null,
            'needs_witness' => (int) $r['is_high_alert'] === 1 || ($r['controlled_class'] ?? 'None') !== 'None',
            'is_override' => (int) ($r['is_override'] ?? 0) === 1, 'override_reason' => $r['override_reason'] ?? null,
            'override_reviewed_at' => $r['override_reviewed_at'] ?? null, 'override_review_note' => $r['override_review_note'] ?? null,
        ];
    }

    private function name(int $userId): string
    {
        $stmt = Database::connection()->prepare("SELECT " . self::nameSql(':id'));
        $stmt->execute(['id' => $userId]);
        return (string) $stmt->fetchColumn();
    }

    private function rollBack(PDO $db, bool $owns): void
    {
        $owns ? ($db->inTransaction() && $db->rollBack()) : $db->exec('ROLLBACK TO SAVEPOINT cab_w');
    }

    private static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL
                 WHERE nu.id = {$column} LIMIT 1)";
    }
}
