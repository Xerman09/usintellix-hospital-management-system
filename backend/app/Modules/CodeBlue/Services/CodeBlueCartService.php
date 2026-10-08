<?php

namespace App\Modules\CodeBlue\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\DrugInventory\Services\StockLedgerService;
use PDO;

/**
 * Code Blue (module 10, Phase 3): crash-cart medicines come off stock.
 *
 *   * The admin registers the crash carts (storage locations, one per ward or general) and links
 *     each one-tap drug button to a catalog drug with how much of the dose one stock unit holds.
 *   * A code uses its ward's cart (or a general one); the team can switch it on the code.
 *   * take()     -- a drug entry on the code record deducts ceil(dose / amount per unit) units from
 *                   the cart, earliest expiry first, through the medicine ledger. Not enough in the cart:
 *                   what is there is deducted and the shortfall noted -- the record itself is never refused.
 *   * putBack()  -- the entry was struck out: the same lots get it back.
 *   * restockNotice() -- when the code ends, the pharmacy is told what to put back in the cart.
 */
class CodeBlueCartService
{
    private const EPSILON = 0.0005;

    // ------------------------------------------------------------------
    // Setup (admin)
    // ------------------------------------------------------------------

    public function setup(): array
    {
        $db = Database::connection();
        $carts = $db->query(
            "SELECT c.id, c.warehouse_id, c.ward_id, c.label, w.name AS location_name, hw.ward_name
             FROM code_blue_carts c JOIN warehouses w ON w.id = c.warehouse_id LEFT JOIN hospital_wards hw ON hw.id = c.ward_id
             ORDER BY hw.ward_name IS NULL, hw.ward_name, w.name"
        )->fetchAll(PDO::FETCH_ASSOC);
        $links = [];
        foreach ($db->query(
            "SELECT m.drug_key, m.drug_id, m.amount_per_unit, d.name AS drug_name, du.name AS unit_name
             FROM code_blue_cart_drugs m JOIN drugs d ON d.id = m.drug_id LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id"
        )->fetchAll(PDO::FETCH_ASSOC) as $l) {
            $links[$l['drug_key']] = ['drug_id' => (int) $l['drug_id'], 'drug_name' => $l['drug_name'], 'unit_name' => $l['unit_name'] ?: 'unit',
                'amount_per_unit' => (float) $l['amount_per_unit']];
        }
        $buttons = [];
        foreach (CodeBlueRecordService::DRUGS as $d) {
            $k = self::key($d['name'], $d['unit']);
            $buttons[$k] ??= ['key' => $k, 'name' => $d['name'], 'unit' => $d['unit'], 'doses' => [], 'link' => $links[$k] ?? null];
            $buttons[$k]['doses'][] = $d['dose'];
        }
        return [
            'carts' => array_map(fn($c) => ['id' => (int) $c['id'], 'warehouse_id' => (int) $c['warehouse_id'], 'ward_id' => $c['ward_id'] !== null ? (int) $c['ward_id'] : null,
                'label' => $c['label'], 'location_name' => $c['location_name'], 'ward_name' => $c['ward_name']], $carts),
            'buttons' => array_values($buttons),
            'locations' => $db->query("SELECT id, name FROM warehouses WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name")->fetchAll(PDO::FETCH_ASSOC),
            'wards' => $db->query("SELECT id, ward_name AS name FROM hospital_wards WHERE is_active = 1 ORDER BY ward_name")->fetchAll(PDO::FETCH_ASSOC),
            'drugs' => $db->query(
                "SELECT d.id, d.name, d.strength, du.name AS unit_name FROM drugs d LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
                 WHERE d.deleted_at IS NULL AND d.is_active = 1 AND d.allow_inventory = 1 ORDER BY d.name"
            )->fetchAll(PDO::FETCH_ASSOC),
        ];
    }

    /** data: warehouse_id, ward_id? (blank = general cart), label? */
    public function saveCart(array $data, array $actor): array
    {
        $db = Database::connection();
        $wh = (int) ($data['warehouse_id'] ?? 0);
        $ward = (int) ($data['ward_id'] ?? 0) ?: null;
        $st = $db->prepare("SELECT 1 FROM warehouses WHERE id = :id AND deleted_at IS NULL AND is_active = 1");
        $st->execute(['id' => $wh]);
        if (!$st->fetchColumn()) {
            return ['success' => false, 'message' => 'Choose the storage location that is the crash cart.', 'errors' => ['warehouse_id' => 'Required.']];
        }
        if ($ward) {
            $st = $db->prepare("SELECT 1 FROM hospital_wards WHERE id = :id");
            $st->execute(['id' => $ward]);
            if (!$st->fetchColumn()) {
                return ['success' => false, 'message' => 'Ward not found.', 'errors' => ['ward_id' => 'Not found.']];
            }
        }
        $cab = $db->prepare("SELECT ward_name FROM hospital_wards WHERE stock_warehouse_id = :w LIMIT 1");
        $cab->execute(['w' => $wh]);
        if ($cabWard = $cab->fetchColumn()) {
            return ['success' => false, 'message' => "That location is the {$cabWard} medicine cabinet. A crash cart needs its own storage location.", 'errors' => ['warehouse_id' => 'In use as a cabinet.']];
        }
        $label = trim((string) ($data['label'] ?? ''));
        $db->prepare(
            "INSERT INTO code_blue_carts (warehouse_id, ward_id, label, created_by, created_at) VALUES (:w, :ward, :l, :u, NOW())
             ON DUPLICATE KEY UPDATE ward_id = VALUES(ward_id), label = VALUES(label)"
        )->execute(['w' => $wh, 'ward' => $ward, 'l' => $label !== '' ? mb_substr($label, 0, 80) : null, 'u' => (int) $actor['id']]);
        return ['success' => true, 'message' => 'Crash cart saved.', 'data' => $this->setup()];
    }

    public function removeCart(int $warehouseId): array
    {
        Database::connection()->prepare("DELETE FROM code_blue_carts WHERE warehouse_id = :w")->execute(['w' => $warehouseId]);
        return ['success' => true, 'message' => 'Crash cart removed (past codes keep their records).', 'data' => $this->setup()];
    }

    /** data: links [{key, drug_id (0 = none), amount_per_unit}] */
    public function saveLinks(array $data, array $actor): array
    {
        $db = Database::connection();
        $valid = array_column($this->setup()['buttons'], null, 'key');
        $errors = [];
        $rows = [];
        foreach ((array) ($data['links'] ?? []) as $i => $l) {
            $k = (string) ($l['key'] ?? '');
            if (!isset($valid[$k])) {
                continue;
            }
            $drug = (int) ($l['drug_id'] ?? 0);
            if (!$drug) {
                $rows[$k] = null;
                continue;
            }
            $amt = $l['amount_per_unit'] ?? '';
            if (!is_numeric($amt) || (float) $amt <= 0) {
                $errors["links.{$i}.amount_per_unit"] = "{$valid[$k]['name']}: how many {$valid[$k]['unit']} in one unit of stock?";
                continue;
            }
            $st = $db->prepare("SELECT 1 FROM drugs WHERE id = :id AND deleted_at IS NULL");
            $st->execute(['id' => $drug]);
            if (!$st->fetchColumn()) {
                $errors["links.{$i}.drug_id"] = 'Drug not found.';
                continue;
            }
            $rows[$k] = ['drug' => $drug, 'amt' => round((float) $amt, 3)];
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        foreach ($rows as $k => $r) {
            if ($r === null) {
                $db->prepare("DELETE FROM code_blue_cart_drugs WHERE drug_key = :k")->execute(['k' => $k]);
            } else {
                $db->prepare(
                    "INSERT INTO code_blue_cart_drugs (drug_key, drug_id, amount_per_unit, updated_by, updated_at) VALUES (:k, :d, :a, :u, NOW())
                     ON DUPLICATE KEY UPDATE drug_id = VALUES(drug_id), amount_per_unit = VALUES(amount_per_unit), updated_by = VALUES(updated_by), updated_at = NOW()"
                )->execute(['k' => $k, 'd' => $r['drug'], 'a' => $r['amt'], 'u' => (int) $actor['id']]);
            }
        }
        return ['success' => true, 'message' => 'Drug links saved.', 'data' => $this->setup()];
    }

    // ------------------------------------------------------------------
    // On a code
    // ------------------------------------------------------------------

    /** The cart for a new code: the ward's, else the only general cart. */
    public function defaultCart(?int $wardId): ?int
    {
        $db = Database::connection();
        if ($wardId) {
            $st = $db->prepare("SELECT warehouse_id FROM code_blue_carts WHERE ward_id = :w ORDER BY id LIMIT 1");
            $st->execute(['w' => $wardId]);
            if ($wh = (int) $st->fetchColumn()) {
                return $wh;
            }
        }
        $general = $db->query("SELECT warehouse_id FROM code_blue_carts WHERE ward_id IS NULL")->fetchAll(PDO::FETCH_COLUMN);
        return count($general) === 1 ? (int) $general[0] : null;
    }

    /** The carts to choose from on a code, and what this code's cart holds (for "Other drug"). */
    public function forCode(?int $warehouseId): array
    {
        $db = Database::connection();
        $carts = $db->query(
            "SELECT c.warehouse_id, COALESCE(c.label, w.name) AS name, hw.ward_name FROM code_blue_carts c JOIN warehouses w ON w.id = c.warehouse_id
             LEFT JOIN hospital_wards hw ON hw.id = c.ward_id ORDER BY hw.ward_name IS NULL, hw.ward_name, w.name"
        )->fetchAll(PDO::FETCH_ASSOC);
        $stock = [];
        if ($warehouseId) {
            $st = $db->prepare(
                "SELECT d.id, d.name, du.name AS unit_name, SUM(l.quantity_on_hand) AS usable FROM drug_inventory_lots l JOIN drugs d ON d.id = l.drug_id
                 LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
                 WHERE l.warehouse_id = :w AND l.deleted_at IS NULL AND l.is_active = 1 AND l.quantity_on_hand > 0
                   AND (l.expires_date IS NULL OR l.expires_date >= CURDATE())
                 GROUP BY d.id, d.name, du.name ORDER BY d.name"
            );
            $st->execute(['w' => $warehouseId]);
            $stock = array_map(fn($r) => ['drug_id' => (int) $r['id'], 'name' => $r['name'], 'unit_name' => $r['unit_name'] ?: 'unit', 'usable' => (float) $r['usable']], $st->fetchAll(PDO::FETCH_ASSOC));
        }
        $linked = Database::connection()->query("SELECT drug_key FROM code_blue_cart_drugs")->fetchAll(PDO::FETCH_COLUMN);
        return [
            'carts' => array_map(fn($c) => ['warehouse_id' => (int) $c['warehouse_id'], 'name' => $c['name'] . ($c['ward_name'] ? " ({$c['ward_name']})" : ' (general)')], $carts),
            'stock' => $stock, 'linked' => $linked,
        ];
    }

    /** Switch the cart used at this code (later drug entries come from it). */
    public function setCart(int $eventId, ?int $warehouseId): array
    {
        $db = Database::connection();
        if ($warehouseId) {
            $st = $db->prepare("SELECT 1 FROM code_blue_carts WHERE warehouse_id = :w");
            $st->execute(['w' => $warehouseId]);
            if (!$st->fetchColumn()) {
                return ['success' => false, 'message' => 'That is not a crash cart.', 'errors' => ['warehouse_id' => 'Not a cart.']];
            }
        }
        $db->prepare("UPDATE code_blue_events SET cart_warehouse_id = :w WHERE id = :id")->execute(['w' => $warehouseId, 'id' => $eventId]);
        return ['success' => true, 'message' => $warehouseId ? 'Crash cart set: drugs recorded from now on come off its stock.' : 'No crash cart: drugs are recorded without taking stock.'];
    }

    /**
     * Take a drug entry's stock from the code's cart (called inside the record's transaction).
     * $stock: ['drug_id' => int, 'qty' => float] for "Other drug" from the cart; null = the button's link.
     */
    public function take(PDO $db, int $recordId, array $e, array $entry, ?array $stock, int $userId): void
    {
        $wh = (int) ($e['cart_warehouse_id'] ?? 0);
        if (!$wh) {
            return;
        }
        if ($stock === null) {
            $st = $db->prepare("SELECT drug_id, amount_per_unit FROM code_blue_cart_drugs WHERE drug_key = :k");
            $st->execute(['k' => self::key((string) $entry['value'], (string) $entry['unit'])]);
            $link = $st->fetch(PDO::FETCH_ASSOC);
            if (!$link) {
                return;
            }
            $stock = ['drug_id' => (int) $link['drug_id'], 'qty' => ceil(round((float) $entry['dose'] / (float) $link['amount_per_unit'], 6))];
        }
        $qty = round((float) $stock['qty'], 3);
        if ($qty <= 0) {
            return;
        }
        $lots = $db->prepare(
            "SELECT id, quantity_on_hand FROM drug_inventory_lots
             WHERE drug_id = :d AND warehouse_id = :w AND deleted_at IS NULL AND is_active = 1 AND quantity_on_hand > 0
               AND (expires_date IS NULL OR expires_date >= CURDATE())
             ORDER BY expires_date IS NULL, expires_date, id FOR UPDATE"
        );
        $lots->execute(['d' => $stock['drug_id'], 'w' => $wh]);
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $who = $e['location'];
        if ($e['patient_id']) {
            $p = $db->prepare("SELECT TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) FROM patients WHERE id = :id");
            $p->execute(['id' => $e['patient_id']]);
            $who = $p->fetchColumn() ?: $who;
        }
        $insert = $db->prepare("INSERT INTO code_blue_record_lots (record_id, lot_id, quantity, unit_cost, created_by, created_at) VALUES (:r, :l, :q, :c, :u, :now)");
        $deduct = $db->prepare("UPDATE drug_inventory_lots SET quantity_on_hand = quantity_on_hand - :q, updated_at = :now, updated_by = :u WHERE id = :id");
        $left = $qty;
        foreach ($lots->fetchAll(PDO::FETCH_ASSOC) as $lot) {
            if ($left <= self::EPSILON) {
                break;
            }
            $part = round(min($left, (float) $lot['quantity_on_hand']), 3);
            $cost = StockLedgerService::lotCost((int) $lot['id'], (int) $stock['drug_id']);
            $insert->execute(['r' => $recordId, 'l' => $lot['id'], 'q' => $part, 'c' => $cost, 'u' => $userId, 'now' => $now]);
            $rowId = (int) $db->lastInsertId();
            $deduct->execute(['q' => $part, 'now' => $now, 'u' => $userId, 'id' => $lot['id']]);
            StockLedgerService::record((int) $lot['id'], 'dispensed', -$part, 'code_blue_record_lots', $rowId, $userId, [
                'unit_cost' => $cost, 'reference_no' => "CODE-{$e['id']}", 'counterparty' => $who,
                'notes' => "Crash cart, Code Blue: {$entry['value']}",
            ]);
            $left = round($left - $part, 3);
        }
        $db->prepare("UPDATE code_blue_record SET stock_warehouse_id = :w, stock_drug_id = :d, stock_qty = :q, stock_short = :s WHERE id = :id")
            ->execute(['w' => $wh, 'd' => $stock['drug_id'], 'q' => $qty, 's' => $left > self::EPSILON ? $left : null, 'id' => $recordId]);
    }

    /** A struck-out drug entry: back into the cart, the same lots. */
    public function putBack(PDO $db, int $recordId, string $eventLabel, int $userId): void
    {
        $st = $db->prepare("SELECT * FROM code_blue_record_lots WHERE record_id = :r AND returned_at IS NULL ORDER BY id");
        $st->execute(['r' => $recordId]);
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $l) {
            $db->prepare("SELECT id FROM drug_inventory_lots WHERE id = :id FOR UPDATE")->execute(['id' => $l['lot_id']]);
            $db->prepare("UPDATE drug_inventory_lots SET quantity_on_hand = quantity_on_hand + :q, updated_at = :now, updated_by = :u WHERE id = :id")
                ->execute(['q' => $l['quantity'], 'now' => $now, 'u' => $userId, 'id' => $l['lot_id']]);
            $db->prepare("UPDATE code_blue_record_lots SET returned_at = :now, returned_by = :u WHERE id = :id")->execute(['now' => $now, 'u' => $userId, 'id' => $l['id']]);
            StockLedgerService::record((int) $l['lot_id'], 'dispense_voided', (float) $l['quantity'], 'code_blue_record_lots', (int) $l['id'], $userId, [
                'unit_cost' => $l['unit_cost'], 'reference_no' => $eventLabel, 'notes' => 'Struck out of the code record: back in the crash cart',
            ]);
        }
    }

    /** What this code took from the carts (net of struck-out entries), per drug. */
    public function used(int $eventId): array
    {
        $st = Database::connection()->prepare(
            "SELECT r.stock_warehouse_id, COALESCE(c.label, w.name) AS cart_name, r.stock_drug_id, d.name AS drug_name, du.name AS unit_name,
                    SUM(r.stock_qty) AS qty, SUM(COALESCE(r.stock_short, 0)) AS short
             FROM code_blue_record r JOIN drugs d ON d.id = r.stock_drug_id JOIN warehouses w ON w.id = r.stock_warehouse_id
             LEFT JOIN code_blue_carts c ON c.warehouse_id = r.stock_warehouse_id LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             WHERE r.event_id = :e AND r.voided_at IS NULL AND r.stock_drug_id IS NOT NULL
             GROUP BY r.stock_warehouse_id, cart_name, r.stock_drug_id, d.name, du.name ORDER BY cart_name, d.name"
        );
        $st->execute(['e' => $eventId]);
        return array_map(fn($r) => ['warehouse_id' => (int) $r['stock_warehouse_id'], 'cart_name' => $r['cart_name'], 'drug_id' => (int) $r['stock_drug_id'],
            'drug_name' => $r['drug_name'], 'unit_name' => $r['unit_name'] ?: 'unit', 'quantity' => (float) $r['qty'], 'short' => (float) $r['short']], $st->fetchAll(PDO::FETCH_ASSOC));
    }

    /** The code ended: tell the pharmacy what to put back in each cart. */
    public function restockNotice(int $eventId, string $location, ?int $actorId): void
    {
        $byCart = [];
        foreach ($this->used($eventId) as $u) {
            $byCart[$u['warehouse_id']]['name'] = $u['cart_name'];
            $byCart[$u['warehouse_id']]['lines'][] = self::num($u['quantity']) . " {$u['unit_name']} {$u['drug_name']}"
                . ($u['short'] > 0 ? ' (' . self::num($u['short']) . ' were not in the cart)' : '');
        }
        foreach ($byCart as $wh => $c) {
            AlertService::raise([
                'type' => 'medication', 'urgency' => 'urgent',
                'title' => "Restock crash cart: {$c['name']}",
                'body' => "Used at the Code Blue at {$location}: " . implode('; ', $c['lines']) . '. Refill and re-seal the cart.',
                'link' => ['tab' => 'code_blue'], 'targets' => [['role' => 'pharmacist'], ['role' => 'charge_nurse']],
                'source_type' => 'code_blue_events', 'source_id' => $eventId, 'dedupe_key' => "cartrestock:{$eventId}:{$wh}",
            ], $actorId);
        }
    }

    public static function key(string $name, string $unit): string
    {
        return mb_substr("{$name}|{$unit}", 0, 120);
    }

    public static function num(float $n): string
    {
        return rtrim(rtrim(number_format($n, 3, '.', ''), '0'), '.');
    }
}
