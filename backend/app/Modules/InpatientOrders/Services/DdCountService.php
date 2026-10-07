<?php

namespace App\Modules\InpatientOrders\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\NursingStaff\Services\NursingShiftService;
use PDO;

/**
 * Dangerous-drug shift count of a ward cabinet (department medicine stock, Phase 3).
 *
 * At each shift change two nurses count every dangerous drug in the cabinet. The count is
 * blind -- the system figure is shown only after it is saved. Any difference makes the count
 * a discrepancy: each differing line needs a note, and the pharmacy and the ward's charge
 * nurses get an urgent alert. The pharmacist (or an admin) resolves it with a note (e.g.
 * found, recounted, stock corrected with a Stock Count). A cabinet holding dangerous drugs
 * whose count for the current shift isn't done an hour in reminds the ward's nurses.
 */
class DdCountService
{
    public const COUNTERS = ['admin', 'nurse', 'charge_nurse'];
    public const RESOLVERS = ['admin', 'pharmacist'];
    public const DUE_AFTER_MIN = 60;
    private const EPSILON = 0.0005;

    /** Dangerous drugs in the cabinet (on hand, expired included -- they are physically there) or with a level set. */
    public function items(int $warehouseId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT d.id AS drug_id, d.name, du.name AS unit_name,
                    COALESCE((SELECT SUM(l.quantity_on_hand) FROM drug_inventory_lots l
                              WHERE l.drug_id = d.id AND l.warehouse_id = :w1 AND l.deleted_at IS NULL), 0) AS on_hand
             FROM drugs d LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             WHERE d.deleted_at IS NULL AND d.controlled_class LIKE 'Dangerous Drug%'
               AND (EXISTS (SELECT 1 FROM drug_inventory_lots l WHERE l.drug_id = d.id AND l.warehouse_id = :w2 AND l.deleted_at IS NULL AND l.quantity_on_hand > 0)
                    OR EXISTS (SELECT 1 FROM warehouse_stock_levels s WHERE s.drug_id = d.id AND s.warehouse_id = :w3))
             ORDER BY d.name"
        );
        $stmt->execute(['w1' => $warehouseId, 'w2' => $warehouseId, 'w3' => $warehouseId]);
        return array_map(fn($r) => ['drug_id' => (int) $r['drug_id'], 'name' => $r['name'], 'unit_name' => $r['unit_name'] ?: 'unit',
            'on_hand' => round((float) $r['on_hand'], 3)], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** For the cabinet's "DD count" tab: what to count (no figures), this shift's count, recent counts. */
    public function status(int $wardId, array $actor): array
    {
        $wh = $this->cabinetOf($wardId);
        if (!$wh) {
            return ['cabinet' => null];
        }
        $cur = (new NursingShiftService())->current();
        $stmt = Database::connection()->prepare("SELECT id FROM dd_counts WHERE warehouse_id = :w ORDER BY id DESC LIMIT 10");
        $stmt->execute(['w' => $wh]);
        $recent = array_map(fn($id) => $this->count((int) $id), $stmt->fetchAll(PDO::FETCH_COLUMN));
        $thisShift = array_values(array_filter($recent, fn($c) => $c['shift_date'] === $cur['date'] && $c['shift_id'] === (int) $cur['shift']['id']));
        return [
            'cabinet' => $wh,
            'items' => array_map(fn($i) => ['drug_id' => $i['drug_id'], 'name' => $i['name'], 'unit_name' => $i['unit_name']], $this->items($wh)),
            'shift' => ['date' => $cur['date'], 'id' => (int) $cur['shift']['id'], 'name' => $cur['shift']['name'], 'start' => $cur['shift']['start']],
            'this_shift' => $thisShift[0] ?? null,
            'recent' => $recent,
            'can_count' => in_array($actor['role'] ?? '', self::COUNTERS, true) && (new RestockService())->isWardStaff($actor, $wardId),
            'can_resolve' => in_array($actor['role'] ?? '', self::RESOLVERS, true),
        ];
    }

    /** data: ward_id, lines [{drug_id, counted, note?}], note?, witness_username, witness_password */
    public function record(array $data, array $actor): array
    {
        $fail = fn(string $m, array $extra = []) => ['success' => false, 'message' => $m] + $extra;
        $wardId = (int) ($data['ward_id'] ?? 0);
        if (!in_array($actor['role'] ?? '', self::COUNTERS, true) || !(new RestockService())->isWardStaff($actor, $wardId)) {
            return $fail('The count is done by the ward\'s nurses.', ['forbidden' => true]);
        }
        $wh = $this->cabinetOf($wardId);
        if (!$wh) {
            return $fail('This ward has no medicine cabinet set up.');
        }
        $items = $this->items($wh);
        if (!$items) {
            return $fail('There are no dangerous drugs in this cabinet to count.');
        }
        $input = [];
        foreach ((array) ($data['lines'] ?? []) as $l) {
            if (is_array($l)) {
                $input[(int) ($l['drug_id'] ?? 0)] = $l;
            }
        }
        $errors = [];
        foreach ($items as $i) {
            $raw = $input[$i['drug_id']]['counted'] ?? null;
            if ($raw === null || $raw === '' || !is_numeric($raw) || (float) $raw < 0 || (float) $raw > 100000) {
                $errors["drug_{$i['drug_id']}"] = "Count {$i['name']} (0 if none).";
            }
        }
        if ($errors) {
            return $fail(reset($errors), ['errors' => $errors]);
        }

        // Second nurse, before anything is written.
        $witness = (new MarService())->witness($data, (int) $actor['id']);
        if (isset($witness['error'])) {
            return $witness['error'];
        }

        $db = Database::connection();
        $cur = (new NursingShiftService())->current();
        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT ddc');
        try {
            // The system figure now, with the lots locked so nothing moves while it is compared.
            $lock = $db->prepare("SELECT drug_id, SUM(quantity_on_hand) AS q FROM drug_inventory_lots WHERE warehouse_id = :w AND deleted_at IS NULL GROUP BY drug_id FOR UPDATE");
            $lock->execute(['w' => $wh]);
            $expected = array_map('floatval', $lock->fetchAll(PDO::FETCH_KEY_PAIR));
            $lines = [];
            $diffs = [];
            foreach ($items as $i) {
                $counted = round((float) $input[$i['drug_id']]['counted'], 3);
                $exp = round($expected[$i['drug_id']] ?? 0.0, 3);
                $diff = round($counted - $exp, 3);
                $note = trim((string) ($input[$i['drug_id']]['note'] ?? ''));
                $lines[] = [$i, $exp, $counted, $diff, $note];
                if (abs($diff) > self::EPSILON && $note === '') {
                    $owns ? ($db->inTransaction() && $db->rollBack()) : $db->exec('ROLLBACK TO SAVEPOINT ddc');
                    return $fail("{$i['name']} doesn't match the system figure. Recount it; if it is still different, add a note on that line.",
                        ['needs_note' => true, 'errors' => ["drug_{$i['drug_id']}" => 'Different from the system: add a note.']]);
                }
                if (abs($diff) > self::EPSILON) {
                    $diffs[] = "{$i['name']}: counted " . MedSupplyService::num($counted) . ', expected ' . MedSupplyService::num($exp)
                        . ' (' . ($diff > 0 ? '+' : '') . MedSupplyService::num($diff) . ')' . ($note !== '' ? " — {$note}" : '');
                }
            }
            $status = $diffs ? 'discrepancy' : 'ok';
            $note = trim((string) ($data['note'] ?? ''));
            $db->prepare(
                "INSERT INTO dd_counts (warehouse_id, ward_id, shift_date, shift_id, status, counted_by, witness_by, counted_at, note)
                 VALUES (:w, :ward, :d, :s, :st, :by, :wit, NOW(), :n)"
            )->execute(['w' => $wh, 'ward' => $wardId, 'd' => $cur['date'], 's' => $cur['shift']['id'], 'st' => $status,
                'by' => (int) $actor['id'], 'wit' => $witness['id'], 'n' => $note !== '' ? mb_substr($note, 0, 255) : null]);
            $id = (int) $db->lastInsertId();
            $ins = $db->prepare("INSERT INTO dd_count_lines (count_id, drug_id, expected, counted, difference, note) VALUES (:c, :d, :e, :n, :df, :note)");
            foreach ($lines as [$i, $exp, $counted, $diff, $lnote]) {
                $ins->execute(['c' => $id, 'd' => $i['drug_id'], 'e' => $exp, 'n' => $counted, 'df' => $diff, 'note' => $lnote !== '' ? mb_substr($lnote, 0, 255) : null]);
            }
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT ddc');
        } catch (\Throwable $e) {
            $owns ? ($db->inTransaction() && $db->rollBack()) : $db->exec('ROLLBACK TO SAVEPOINT ddc');
            throw $e;
        }

        AlertService::resolveByKey("ddcountdue:{$wh}:{$cur['date']}:{$cur['shift']['id']}", (int) $actor['id'], 'Counted');
        $count = $this->count($id);
        if ($diffs) {
            $targets = [['role' => 'pharmacist']];
            foreach ($this->chargeNurses($wardId) as $u) {
                $targets[] = ['user' => $u];
            }
            AlertService::raise([
                'type' => 'medication', 'urgency' => 'urgent',
                'title' => "Dangerous-drug count discrepancy: {$count['ward_name']} cabinet",
                'body' => implode('; ', $diffs) . ". Counted by {$count['counted_by_name']}, witness {$count['witness_name']}. Resolve it in the Ward Stock Report → DD counts.",
                'link' => ['tab' => 'ward_stock_report'], 'targets' => $targets,
                'source_type' => 'dd_counts', 'source_id' => $id, 'dedupe_key' => "ddcount:{$id}",
            ], (int) $actor['id']);
            return ['success' => true, 'message' => 'Count saved with a discrepancy — the pharmacy and the charge nurse were alerted.', 'data' => $count];
        }
        return ['success' => true, 'message' => 'Count saved: everything matches.', 'data' => $count];
    }

    /** The pharmacy (or an admin) closes a discrepancy with what was found / done. */
    public function resolve(int $id, string $note, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::RESOLVERS, true)) {
            return ['success' => false, 'message' => 'Discrepancies are resolved by the pharmacy.', 'forbidden' => true];
        }
        $c = $this->count($id);
        if (!$c) {
            return ['success' => false, 'message' => 'Count not found.', 'not_found' => true];
        }
        if ($c['status'] !== 'discrepancy') {
            return ['success' => false, 'message' => $c['status'] === 'resolved' ? 'Already resolved.' : 'This count had no discrepancy.'];
        }
        $note = trim($note);
        if ($note === '') {
            return ['success' => false, 'message' => 'Say what was found or done (e.g. recounted, found in the drawer; stock corrected with a Stock Count).',
                'errors' => ['note' => 'Required.']];
        }
        Database::connection()->prepare("UPDATE dd_counts SET status = 'resolved', resolved_by = :u, resolved_at = NOW(), resolution_note = :n WHERE id = :id AND status = 'discrepancy'")
            ->execute(['u' => (int) $actor['id'], 'n' => mb_substr($note, 0, 500), 'id' => $id]);
        AlertService::resolveByKey("ddcount:{$id}", (int) $actor['id'], 'Resolved');
        return ['success' => true, 'message' => 'Discrepancy resolved.', 'data' => $this->count($id)];
    }

    /** Alert job: cabinets with dangerous drugs whose count for the shift isn't done an hour in. */
    public function dueReminders(): int
    {
        $db = Database::connection();
        $cur = (new NursingShiftService())->current();
        $start = (new \DateTimeImmutable("{$cur['date']} {$cur['shift']['start']}:00", new \DateTimeZone('UTC')))->getTimestamp();
        $now = (new \DateTimeImmutable((string) $db->query("SELECT NOW()")->fetchColumn(), new \DateTimeZone('UTC')))->getTimestamp();
        if ($now < $start + self::DUE_AFTER_MIN * 60) {
            return 0;
        }
        $made = 0;
        foreach ((new RestockService())->cabinets() as $wh => $cab) {
            $onHand = array_filter($this->items((int) $wh), fn($i) => $i['on_hand'] > self::EPSILON);
            if (!$onHand) {
                continue;
            }
            $done = $db->prepare("SELECT COUNT(*) FROM dd_counts WHERE warehouse_id = :w AND shift_date = :d AND shift_id = :s");
            $done->execute(['w' => $wh, 'd' => $cur['date'], 's' => $cur['shift']['id']]);
            $key = "ddcountdue:{$wh}:{$cur['date']}:{$cur['shift']['id']}";
            $seen = $db->prepare("SELECT 1 FROM alerts WHERE dedupe_key = :k LIMIT 1");
            $seen->execute(['k' => $key]);
            if ((int) $done->fetchColumn() || $seen->fetchColumn()) {
                continue;
            }
            $targets = array_map(fn($u) => ['user' => $u], $this->wardNurses((int) $cab['ward_id']));
            AlertService::raise([
                'type' => 'medication', 'urgency' => 'info',
                'title' => "Dangerous-drug count due: {$cab['ward_name']} cabinet ({$cur['shift']['name']})",
                'body' => 'Count the dangerous drugs in the cabinet with a second nurse: Ward Cabinet → DD count.',
                'link' => ['tab' => 'ward_cabinet'], 'targets' => $targets ?: [['role' => 'charge_nurse']],
                'source_type' => 'warehouses', 'source_id' => (int) $wh, 'dedupe_key' => $key,
            ]);
            $made++;
        }
        return $made;
    }

    public function count(int $id): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT c.*, s.name AS shift_name, hw.ward_name, w.name AS cabinet_name, " . self::nameSql('c.counted_by') . " AS counted_by_name,
                    " . self::nameSql('c.witness_by') . " AS witness_name, " . self::nameSql('c.resolved_by') . " AS resolved_by_name
             FROM dd_counts c JOIN nursing_shifts s ON s.id = c.shift_id JOIN warehouses w ON w.id = c.warehouse_id
             LEFT JOIN hospital_wards hw ON hw.id = c.ward_id WHERE c.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $c = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$c) {
            return null;
        }
        $l = $db->prepare("SELECT l.*, d.name AS drug_name, du.name AS unit_name FROM dd_count_lines l JOIN drugs d ON d.id = l.drug_id
                           LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id WHERE l.count_id = :id ORDER BY d.name");
        $l->execute(['id' => $id]);
        return [
            'id' => (int) $c['id'], 'warehouse_id' => (int) $c['warehouse_id'], 'ward_id' => $c['ward_id'] !== null ? (int) $c['ward_id'] : null,
            'ward_name' => $c['ward_name'], 'cabinet_name' => $c['cabinet_name'],
            'shift_date' => $c['shift_date'], 'shift_id' => (int) $c['shift_id'], 'shift_name' => $c['shift_name'], 'status' => $c['status'],
            'counted_by_name' => $c['counted_by'] ? $c['counted_by_name'] : null, 'witness_name' => $c['witness_by'] ? $c['witness_name'] : null,
            'counted_at' => $c['counted_at'], 'note' => $c['note'],
            'resolved_by_name' => $c['resolved_by'] ? $c['resolved_by_name'] : null, 'resolved_at' => $c['resolved_at'], 'resolution_note' => $c['resolution_note'],
            'lines' => array_map(fn($r) => ['drug_id' => (int) $r['drug_id'], 'drug_name' => $r['drug_name'], 'unit_name' => $r['unit_name'] ?: 'unit',
                'expected' => (float) $r['expected'], 'counted' => (float) $r['counted'], 'difference' => (float) $r['difference'], 'note' => $r['note']],
                $l->fetchAll(PDO::FETCH_ASSOC)),
        ];
    }

    private function cabinetOf(int $wardId): ?int
    {
        $cab = array_values(array_filter((new RestockService())->cabinets(), fn($c) => (int) $c['ward_id'] === $wardId))[0] ?? null;
        return $cab ? (int) $cab['warehouse_id'] : null;
    }

    private function chargeNurses(int $wardId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT x.user_id FROM nurse_ward_assignments x JOIN users u ON u.id = x.user_id AND u.deleted_at IS NULL
             JOIN roles r ON r.id = u.role_id WHERE x.ward_id = :w AND r.name = 'charge_nurse'"
        );
        $stmt->execute(['w' => $wardId]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    private function wardNurses(int $wardId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT x.user_id FROM nurse_ward_assignments x JOIN users u ON u.id = x.user_id AND u.deleted_at IS NULL
             JOIN roles r ON r.id = u.role_id WHERE x.ward_id = :w AND r.name IN ('nurse', 'charge_nurse')"
        );
        $stmt->execute(['w' => $wardId]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    private static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL
                 WHERE nu.id = {$column} LIMIT 1)";
    }
}
