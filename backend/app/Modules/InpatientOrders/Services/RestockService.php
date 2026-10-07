<?php

namespace App\Modules\InpatientOrders\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\NursingStaff\Services\NursingStaffService;
use App\Modules\StockLevels\Services\StockLevelService;
use App\Modules\StockTransfers\Services\StockTransferService;
use PDO;

/**
 * Restocking department cabinets (department medicine stock, Phase 2).
 *
 *   * check()   -- after stock leaves a cabinet (and every minute from the alert job): items
 *                  below their minimum go on the cabinet's automatic restock request -- a stock
 *                  transfer 'requested' from the pharmacy location -- for enough to bring them
 *                  back up to the maximum (less what's already on the way or asked for). One
 *                  open automatic request per cabinet; it is kept up to date until it is sent.
 *                  The pharmacy is alerted when it is made or changes. Urgent when an item has
 *                  run out, or when a nurse flags it.
 *   * fill()    -- the pharmacy sends it (quantities can be changed); the ward is told.
 *   * receive() -- the ward confirms what arrived (StockTransferService::receive).
 */
class RestockService
{
    /** Who fills (sends) restock requests. */
    public const FILLERS = ['admin', 'pharmacist'];
    private const EPSILON = 0.0005;

    /** Cabinets: storage locations linked to a ward (hospital_wards.stock_warehouse_id). warehouse_id => ward row */
    public function cabinets(): array
    {
        $rows = Database::connection()->query(
            "SELECT hw.stock_warehouse_id AS warehouse_id, hw.id AS ward_id, hw.ward_name, w.name AS cabinet_name
             FROM hospital_wards hw JOIN warehouses w ON w.id = hw.stock_warehouse_id AND w.deleted_at IS NULL AND w.is_active = 1
             WHERE hw.is_active = 1"
        )->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r['warehouse_id']] ??= $r;
        }
        return $out;
    }

    /** Check every cabinet (alert job). Returns what changed. */
    public function checkAll(): array
    {
        $done = [];
        foreach (array_keys($this->cabinets()) as $wh) {
            if ($r = $this->check($wh, null)) {
                $done[] = $r;
            }
        }
        return $done;
    }

    /**
     * Bring the cabinet's automatic restock request up to date. Returns
     * ['transfer_id', 'st_number', 'created', 'urgent', 'lines'] when something was made or changed, else null.
     */
    public function check(int $warehouseId, ?int $userId): ?array
    {
        $cab = $this->cabinets()[$warehouseId] ?? null;
        $pharmacy = (new MedSupplyService())->pharmacyLocation();
        if (!$cab || !$pharmacy || $pharmacy === $warehouseId) {
            return null;
        }
        $db = Database::connection();
        $items = array_values(array_filter((new StockLevelService())->levels($warehouseId)['items'] ?? [],
            fn($i) => $i['min_level'] !== null && $i['is_active']));
        if (!$items) {
            return null;
        }
        $auto = $this->openAuto($db, $warehouseId);
        $autoQty = [];
        foreach ($auto['items'] ?? [] as $l) {
            $autoQty[(int) $l['drug_id']] = ($autoQty[(int) $l['drug_id']] ?? 0) + (float) $l['quantity'];
        }

        // What each item below its minimum still needs to reach its maximum.
        $lines = [];
        $out = [];
        foreach ($items as $i) {
            if ($i['usable'] >= $i['min_level'] - self::EPSILON) {
                continue;
            }
            $target = $i['max_level'] ?? $i['min_level'];
            $askedElsewhere = max(0.0, (float) $i['requested'] - ($autoQty[$i['drug_id']] ?? 0));
            $need = ceil($target - $i['usable'] - (float) $i['incoming'] - $askedElsewhere - 1e-9);
            if ($need > 0) {
                $lines[$i['drug_id']] = (float) $need;
                if ($i['usable'] <= self::EPSILON) {
                    $out[] = $i['drug_name'];
                }
            }
        }
        if (!$lines) {
            return null;
        }
        $urgent = (bool) $out;
        $outReason = $out ? 'Out of stock: ' . implode(', ', $out) : null;

        if (!$auto) {
            $res = (new StockTransferService())->create([
                'from_warehouse_id' => $pharmacy, 'to_warehouse_id' => $warehouseId, 'priority' => $urgent ? 'urgent' : 'normal',
                'notes' => "Automatic restock: items below their minimum in the {$cab['ward_name']} cabinet.",
                'items' => array_map(fn($d, $q) => ['drug_id' => $d, 'quantity' => $q], array_keys($lines), $lines),
                'action' => 'request',
            ], ['id' => $userId ?: 0, 'role' => 'system'], true);
            if (empty($res['success'])) {
                error_log('auto restock failed: ' . json_encode($res));
                return null;
            }
            $id = (int) $res['data']['id'];
            // Made by the system (no user when it comes from the alert job).
            $db->prepare("UPDATE stock_transfers SET is_auto = 1, urgent_reason = :r, created_by = NULLIF(created_by, 0), requested_by = NULLIF(requested_by, 0),
                             updated_by = NULLIF(updated_by, 0) WHERE id = :id")->execute(['r' => $outReason, 'id' => $id]);
            $db->prepare("UPDATE stock_transfer_history SET user_id = NULLIF(user_id, 0) WHERE stock_transfer_id = :id")->execute(['id' => $id]);
            $result = ['transfer_id' => $id, 'st_number' => $res['data']['st_number'], 'created' => true, 'urgent' => $urgent, 'lines' => $lines];
        } else {
            $same = $autoQty == $lines;
            $becameUrgent = $urgent && $auto['priority'] !== 'urgent';
            if ($same && !$becameUrgent) {
                return null;
            }
            $id = (int) $auto['id'];
            $owns = !$db->inTransaction();
            $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT restock');
            try {
                $db->prepare("SELECT id FROM stock_transfers WHERE id = :id AND status = 'requested' FOR UPDATE")->execute(['id' => $id]);
                $db->prepare("DELETE FROM stock_transfer_items WHERE stock_transfer_id = :id")->execute(['id' => $id]);
                $ins = $db->prepare("INSERT INTO stock_transfer_items (stock_transfer_id, line_no, drug_id, quantity, created_at) VALUES (:t, :n, :d, :q, :now)");
                $n = 0;
                foreach ($lines as $drugId => $q) {
                    $ins->execute(['t' => $id, 'n' => ++$n, 'd' => $drugId, 'q' => $q, 'now' => date('Y-m-d H:i:s')]);
                }
                $db->prepare(
                    "UPDATE stock_transfers SET updated_at = :now, priority = IF(:u = 1, 'urgent', priority),
                        urgent_reason = IF(:u2 = 1 AND flagged_by IS NULL, :r, urgent_reason) WHERE id = :id"
                )->execute(['now' => date('Y-m-d H:i:s'), 'u' => $urgent ? 1 : 0, 'u2' => $urgent ? 1 : 0, 'r' => $outReason, 'id' => $id]);
                $db->prepare("INSERT INTO stock_transfer_history (stock_transfer_id, action, notes, user_id, created_at) VALUES (:t, 'updated', :n, :u, :now)")
                    ->execute(['t' => $id, 'n' => 'Automatic restock updated: ' . count($lines) . ' item(s) below minimum', 'u' => $userId ?: null, 'now' => date('Y-m-d H:i:s')]);
                $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT restock');
            } catch (\Throwable $e) {
                $owns ? ($db->inTransaction() && $db->rollBack()) : $db->exec('ROLLBACK TO SAVEPOINT restock');
                throw $e;
            }
            $result = ['transfer_id' => $id, 'st_number' => $auto['st_number'], 'created' => false, 'urgent' => $urgent || $auto['priority'] === 'urgent', 'lines' => $lines];
        }
        $this->alertPharmacy($result['transfer_id'], $userId);
        return $result;
    }

    /** The pharmacy's queue: restock requests to the cabinets waiting to be filled, and those on the way. */
    public function queue(): array
    {
        $cabs = $this->cabinets();
        if (!$cabs) {
            return ['waiting' => [], 'on_the_way' => [], 'counts' => ['waiting' => 0, 'urgent' => 0, 'on_the_way' => 0]];
        }
        $db = Database::connection();
        $in = implode(',', array_keys($cabs));
        $ids = $db->query(
            "SELECT id FROM stock_transfers WHERE deleted_at IS NULL AND status IN ('requested', 'in_transit') AND to_warehouse_id IN ({$in})
             ORDER BY status = 'in_transit', priority = 'urgent' DESC, COALESCE(requested_at, created_at)"
        )->fetchAll(PDO::FETCH_COLUMN);
        $rows = array_map(fn($id) => $this->request((int) $id), $ids);
        $waiting = array_values(array_filter($rows, fn($r) => $r['status'] === 'requested'));
        return [
            'waiting' => $waiting,
            'on_the_way' => array_values(array_filter($rows, fn($r) => $r['status'] === 'in_transit')),
            'counts' => ['waiting' => count($waiting), 'urgent' => count(array_filter($waiting, fn($r) => $r['urgent'])),
                'on_the_way' => count($rows) - count($waiting)],
            'can_fill' => true,
        ];
    }

    /** A cabinet's open requests and the last few received (the ward's Restock tab). */
    public function forCabinet(int $warehouseId): array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT id FROM stock_transfers WHERE deleted_at IS NULL AND to_warehouse_id = :w
               AND (status IN ('requested', 'in_transit') OR (status = 'received' AND received_at >= :since))
             ORDER BY FIELD(status, 'in_transit', 'requested', 'received'), id DESC LIMIT 20"
        );
        $stmt->execute(['w' => $warehouseId, 'since' => date('Y-m-d H:i:s', time() - 3 * 86400)]);
        return array_map(fn($id) => $this->request((int) $id), $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /** The pharmacy sends it. quantities: {item_id: qty} (0 = leave that line out); sent_via? */
    public function fill(int $id, array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::FILLERS, true)) {
            return ['success' => false, 'message' => 'Restock requests are filled by the pharmacy.', 'forbidden' => true];
        }
        $r = $this->request($id);
        if (!$r || !isset($this->cabinets()[$r['to_warehouse_id']])) {
            return ['success' => false, 'message' => 'Restock request not found.', 'not_found' => true];
        }
        if ($r['status'] !== 'requested') {
            return ['success' => false, 'message' => "{$r['st_number']} was already {$r['status']}."];
        }
        $db = Database::connection();
        $qty = is_array($data['quantities'] ?? null) ? $data['quantities'] : [];
        foreach ($r['lines'] as $l) {
            if (!array_key_exists((string) $l['item_id'], $qty) && !array_key_exists($l['item_id'], $qty)) {
                continue;
            }
            $v = $qty[$l['item_id']] ?? $qty[(string) $l['item_id']];
            if ($v === '' || !is_numeric($v) || (float) $v < 0 || (float) $v > 100000) {
                return ['success' => false, 'message' => "Enter a quantity for {$l['drug_name']} (0 to leave it out).", 'errors' => ["q{$l['item_id']}" => 'Invalid.']];
            }
        }
        $kept = array_filter($r['lines'], fn($l) => (float) ($qty[$l['item_id']] ?? $qty[(string) $l['item_id']] ?? $l['quantity']) > self::EPSILON);
        if (!$kept) {
            return ['success' => false, 'message' => 'Nothing to send. Cancel the request instead, or enter the quantities.'];
        }
        foreach ($r['lines'] as $l) {
            $v = (float) ($qty[$l['item_id']] ?? $qty[(string) $l['item_id']] ?? $l['quantity']);
            if ($v <= self::EPSILON) {
                $db->prepare("DELETE FROM stock_transfer_items WHERE id = :id")->execute(['id' => $l['item_id']]);
            } elseif (abs($v - $l['quantity']) > self::EPSILON) {
                $db->prepare("UPDATE stock_transfer_items SET quantity = :q WHERE id = :id")->execute(['q' => round($v, 3), 'id' => $l['item_id']]);
            }
        }
        $res = (new StockTransferService())->send($id, ['sent_via' => trim((string) ($data['sent_via'] ?? '')) ?: 'Pharmacy restock'], $actor);
        if (empty($res['success'])) {
            // Put the requested quantities back as they were.
            $db->prepare("DELETE FROM stock_transfer_items WHERE stock_transfer_id = :id")->execute(['id' => $id]);
            $ins = $db->prepare("INSERT INTO stock_transfer_items (id, stock_transfer_id, line_no, drug_id, quantity, created_at) VALUES (:i, :t, :n, :d, :q, :now)");
            foreach ($r['lines'] as $n => $l) {
                $ins->execute(['i' => $l['item_id'], 't' => $id, 'n' => $n + 1, 'd' => $l['drug_id'], 'q' => $l['quantity'], 'now' => date('Y-m-d H:i:s')]);
            }
            return $res;
        }
        AlertService::resolveByKey("restock:{$id}", (int) $actor['id'], 'Sent');
        $cab = $this->cabinets()[$r['to_warehouse_id']];
        AlertService::raise([
            'type' => 'low_stock', 'urgency' => $r['urgent'] ? 'urgent' : 'info',
            'title' => "Restock on the way: {$r['st_number']} to the {$cab['ward_name']} cabinet",
            'body' => count($kept) . ' item(s) sent by the pharmacy. Check them in and confirm receipt in Ward Cabinet → Restock.',
            'link' => ['tab' => 'ward_cabinet'], 'targets' => $this->wardTargets((int) $cab['ward_id']),
            'source_type' => 'stock_transfers', 'source_id' => $id, 'dedupe_key' => "restocksent:{$id}",
        ], (int) $actor['id']);
        return ['success' => true, 'message' => "{$r['st_number']} sent to the {$cab['ward_name']} cabinet. The ward confirms receipt.", 'data' => $this->request($id)];
    }

    /** The ward confirms what arrived. data: lots? [{id, quantity_received, short_reason?, short_notes?}] (left out = arrived in full) */
    public function receive(int $id, array $data, array $actor): array
    {
        $r = $this->request($id);
        $cab = $r ? ($this->cabinets()[$r['to_warehouse_id']] ?? null) : null;
        if (!$r || !$cab) {
            return ['success' => false, 'message' => 'Restock not found.', 'not_found' => true];
        }
        if (!$this->isWardStaff($actor, (int) $cab['ward_id'])) {
            return ['success' => false, 'message' => 'Receipt is confirmed by a nurse of the ward.', 'forbidden' => true];
        }
        $res = (new StockTransferService())->receive($id, $data, $actor, true);
        if (empty($res['success'])) {
            return $res;
        }
        AlertService::resolveByKey("restocksent:{$id}", (int) $actor['id'], 'Received');
        // Anything short may leave an item below its minimum again.
        try {
            $this->check($r['to_warehouse_id'], (int) $actor['id']);
        } catch (\Throwable $e) {
            error_log('restock check failed: ' . $e->getMessage());
        }
        return ['success' => true, 'message' => "Receipt of {$r['st_number']} confirmed; the stock is in the cabinet.", 'data' => $this->request($id)];
    }

    /** A nurse flags a waiting request as urgent (e.g. a patient needs it now). */
    public function markUrgent(int $id, string $reason, array $actor): array
    {
        $r = $this->request($id);
        $cab = $r ? ($this->cabinets()[$r['to_warehouse_id']] ?? null) : null;
        if (!$r || !$cab) {
            return ['success' => false, 'message' => 'Restock request not found.', 'not_found' => true];
        }
        if (!$this->isWardStaff($actor, (int) $cab['ward_id'])) {
            return ['success' => false, 'message' => 'Only the ward\'s nurses can flag its requests.', 'forbidden' => true];
        }
        if ($r['status'] !== 'requested') {
            return ['success' => false, 'message' => "{$r['st_number']} was already {$r['status']}."];
        }
        $reason = trim($reason);
        if ($reason === '') {
            return ['success' => false, 'message' => 'Say why it is urgent (e.g. a patient\'s dose is due).', 'errors' => ['reason' => 'Required.']];
        }
        $db = Database::connection();
        $now = date('Y-m-d H:i:s');   // the stock transfers' own clock
        $db->prepare("UPDATE stock_transfers SET priority = 'urgent', urgent_reason = :r, flagged_by = :u, updated_at = :now WHERE id = :id")
            ->execute(['r' => mb_substr($reason, 0, 255), 'u' => (int) $actor['id'], 'now' => $now, 'id' => $id]);
        $db->prepare("INSERT INTO stock_transfer_history (stock_transfer_id, action, notes, user_id, created_at) VALUES (:t, 'flagged_urgent', :n, :u, :now)")
            ->execute(['t' => $id, 'n' => mb_substr($reason, 0, 255), 'u' => (int) $actor['id'], 'now' => $now]);
        $this->alertPharmacy($id, (int) $actor['id']);
        return ['success' => true, 'message' => "{$r['st_number']} flagged urgent; the pharmacy was alerted.", 'data' => $this->request($id)];
    }

    /** "Request restock now" from the ward: run the check (and flag urgent if asked). */
    public function requestNow(int $wardId, bool $urgent, string $reason, array $actor): array
    {
        if (!$this->isWardStaff($actor, $wardId)) {
            return ['success' => false, 'message' => 'Only the ward\'s nurses can ask for its restock.', 'forbidden' => true];
        }
        $wh = array_values(array_filter($this->cabinets(), fn($c) => (int) $c['ward_id'] === $wardId))[0]['warehouse_id'] ?? null;
        if (!$wh) {
            return ['success' => false, 'message' => 'This ward has no medicine cabinet set up.'];
        }
        if (!(new MedSupplyService())->pharmacyLocation()) {
            return ['success' => false, 'message' => 'No pharmacy location is set (Medicine Rounds → Supply settings).'];
        }
        $this->check((int) $wh, (int) $actor['id']);
        $auto = $this->openAuto(Database::connection(), (int) $wh);
        if (!$auto) {
            return ['success' => false, 'message' => 'Nothing in the cabinet is below its minimum, and nothing is waiting to be restocked.'];
        }
        if ($urgent) {
            return $this->markUrgent((int) $auto['id'], $reason, $actor);
        }
        return ['success' => true, 'message' => "{$auto['st_number']} is with the pharmacy.", 'data' => $this->request((int) $auto['id'])];
    }

    /** One restock request with its lines, the cabinet's and the pharmacy's stock of each, and what was sent. */
    public function request(int $id): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT t.*, wf.name AS from_name, wt.name AS to_name, " . self::nameSql('t.requested_by') . " AS requested_by_name,
                    " . self::nameSql('t.sent_by') . " AS sent_by_name, " . self::nameSql('t.received_by') . " AS received_by_name,
                    " . self::nameSql('t.flagged_by') . " AS flagged_by_name
             FROM stock_transfers t JOIN warehouses wf ON wf.id = t.from_warehouse_id JOIN warehouses wt ON wt.id = t.to_warehouse_id
             WHERE t.id = :id AND t.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);
        $t = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$t) {
            return null;
        }
        $stmt = $db->prepare(
            "SELECT i.id AS item_id, i.drug_id, i.quantity, d.name AS drug_name, du.name AS unit_name,
                    (SELECT COALESCE(SUM(l.quantity_on_hand), 0) FROM drug_inventory_lots l WHERE l.drug_id = i.drug_id AND l.warehouse_id = :to1
                       AND l.deleted_at IS NULL AND l.is_active = 1 AND (l.expires_date IS NULL OR l.expires_date >= CURDATE())) AS cabinet_usable,
                    (SELECT COALESCE(SUM(l.quantity_on_hand), 0) FROM drug_inventory_lots l WHERE l.drug_id = i.drug_id AND l.warehouse_id = :from1
                       AND l.deleted_at IS NULL AND l.is_active = 1 AND (l.expires_date IS NULL OR l.expires_date >= CURDATE())) AS pharmacy_usable,
                    sl.min_level, sl.max_level
             FROM stock_transfer_items i JOIN drugs d ON d.id = i.drug_id LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN warehouse_stock_levels sl ON sl.warehouse_id = :to2 AND sl.drug_id = i.drug_id
             WHERE i.stock_transfer_id = :id ORDER BY i.line_no, i.id"
        );
        $stmt->execute(['to1' => $t['to_warehouse_id'], 'from1' => $t['from_warehouse_id'], 'to2' => $t['to_warehouse_id'], 'id' => $id]);
        $lines = array_map(fn($l) => [
            'item_id' => (int) $l['item_id'], 'drug_id' => (int) $l['drug_id'], 'drug_name' => $l['drug_name'], 'unit_name' => $l['unit_name'] ?: 'unit',
            'quantity' => (float) $l['quantity'], 'cabinet_usable' => round((float) $l['cabinet_usable'], 3), 'pharmacy_usable' => round((float) $l['pharmacy_usable'], 3),
            'min_level' => $l['min_level'] !== null ? (float) $l['min_level'] : null, 'max_level' => $l['max_level'] !== null ? (float) $l['max_level'] : null,
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
        $stmt = $db->prepare(
            "SELECT tl.id, tl.drug_id, d.name AS drug_name, tl.lot_number, tl.expires_date, tl.quantity_sent, tl.quantity_received
             FROM stock_transfer_lots tl JOIN drugs d ON d.id = tl.drug_id WHERE tl.stock_transfer_id = :id ORDER BY tl.id"
        );
        $stmt->execute(['id' => $id]);
        $cab = $this->cabinets()[(int) $t['to_warehouse_id']] ?? null;
        return [
            'id' => (int) $t['id'], 'st_number' => $t['st_number'], 'status' => $t['status'], 'is_auto' => (int) $t['is_auto'] === 1,
            'urgent' => $t['priority'] === 'urgent', 'urgent_reason' => $t['urgent_reason'], 'flagged_by_name' => $t['flagged_by'] ? $t['flagged_by_name'] : null,
            'from_warehouse_id' => (int) $t['from_warehouse_id'], 'from_name' => $t['from_name'],
            'to_warehouse_id' => (int) $t['to_warehouse_id'], 'to_name' => $t['to_name'], 'ward_id' => $cab ? (int) $cab['ward_id'] : null, 'ward_name' => $cab['ward_name'] ?? null,
            'requested_at' => $t['requested_at'] ?? $t['created_at'], 'requested_by_name' => $t['requested_by'] ? $t['requested_by_name'] : null,
            // Stock transfers keep their times on the PHP clock (StockTransferService uses date()).
            'waiting_minutes' => max(0, (int) floor((time() - strtotime((string) ($t['requested_at'] ?? $t['created_at']))) / 60)),
            'sent_at' => $t['sent_at'], 'sent_by_name' => $t['sent_by'] ? $t['sent_by_name'] : null,
            'received_at' => $t['received_at'], 'received_by_name' => $t['received_by'] ? $t['received_by_name'] : null,
            'notes' => $t['notes'], 'lines' => $lines,
            'lots' => array_map(fn($l) => ['id' => (int) $l['id'], 'drug_name' => $l['drug_name'], 'lot_number' => $l['lot_number'], 'expires_date' => $l['expires_date'],
                'quantity_sent' => (float) $l['quantity_sent'], 'quantity_received' => $l['quantity_received'] !== null ? (float) $l['quantity_received'] : null],
                $stmt->fetchAll(PDO::FETCH_ASSOC)),
            'short_reasons' => StockTransferService::SHORT_REASONS,
        ];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    private function openAuto(PDO $db, int $warehouseId): ?array
    {
        $stmt = $db->prepare("SELECT * FROM stock_transfers WHERE to_warehouse_id = :w AND is_auto = 1 AND status = 'requested' AND deleted_at IS NULL ORDER BY id DESC LIMIT 1");
        $stmt->execute(['w' => $warehouseId]);
        $t = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$t) {
            return null;
        }
        $items = $db->prepare("SELECT drug_id, quantity FROM stock_transfer_items WHERE stock_transfer_id = :id");
        $items->execute(['id' => $t['id']]);
        $t['items'] = $items->fetchAll(PDO::FETCH_ASSOC);
        return $t;
    }

    /** Alert the pharmacy (pharmacists; admins when there are none) about a waiting request; replaces the earlier alert. */
    private function alertPharmacy(int $id, ?int $userId): void
    {
        $r = $this->request($id);
        if (!$r) {
            return;
        }
        $hasPharmacist = (int) Database::connection()->query(
            "SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name = 'pharmacist' AND u.deleted_at IS NULL"
        )->fetchColumn();
        AlertService::resolveByKey("restock:{$id}", $userId, 'Updated');
        $names = array_map(fn($l) => "{$l['drug_name']} × " . MedSupplyService::num($l['quantity']), $r['lines']);
        AlertService::raise([
            'type' => 'low_stock', 'urgency' => $r['urgent'] ? 'urgent' : 'info',
            'title' => ($r['urgent'] ? 'URGENT restock: ' : 'Restock request: ') . "{$r['st_number']} — {$r['ward_name']} cabinet, " . count($r['lines']) . ' item(s)',
            'body' => ($r['urgent_reason'] ? "{$r['urgent_reason']}. " : '') . implode('; ', array_slice($names, 0, 8)) . (count($names) > 8 ? '; …' : '')
                . '. Fill it in Restock Requests.',
            'link' => ['tab' => 'restock_queue'], 'targets' => [['role' => $hasPharmacist ? 'pharmacist' : 'admin']],
            'source_type' => 'stock_transfers', 'source_id' => $id, 'dedupe_key' => "restock:{$id}",
        ], $userId);
    }

    /** The ward's nurses and charge nurses; all nurses when nobody is linked to the ward. */
    private function wardTargets(int $wardId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT x.user_id FROM nurse_ward_assignments x JOIN users u ON u.id = x.user_id AND u.deleted_at IS NULL
             JOIN roles r ON r.id = u.role_id WHERE x.ward_id = :w AND r.name IN ('nurse', 'charge_nurse')"
        );
        $stmt->execute(['w' => $wardId]);
        $ids = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
        return $ids ? array_map(fn($u) => ['user' => $u], $ids) : [['role' => 'nurse']];
    }

    /** Admin; a nurse / charge nurse linked to the ward (or not linked to any ward yet). */
    private function isWardStaff(array $actor, int $wardId): bool
    {
        $role = (string) ($actor['role'] ?? '');
        if ($role === 'admin') {
            return true;
        }
        if (!in_array($role, ['nurse', 'charge_nurse'], true)) {
            return false;
        }
        $wards = (new NursingStaffService())->wardIds((int) $actor['id']);
        return !$wards || in_array($wardId, $wards, true);
    }

    private static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL
                 WHERE nu.id = {$column} LIMIT 1)";
    }
}
