<?php

namespace App\Modules\InpatientOrders\Services;

use App\Core\Database;
use App\Modules\DrugInventory\Services\StockLedgerService;
use PDO;

/**
 * Where a ward dose comes from, and what it costs the patient (MAR Phase 4).
 *
 *   * stock  -- taken from a storage location: the ward's own stock (hospital_wards.
 *               stock_warehouse_id) or the pharmacy (general_settings.inpatient_pharmacy_warehouse_id).
 *               Earliest expiry first, never expired; each lot used writes the medicine
 *               ledger ('dispensed', source inpatient_med_admin_lots). The dose is charged to
 *               the patient ledger at the catalog selling price (inpatient_med_charges).
 *   * opened -- the patient's container opened at an earlier dose of the same order
 *               (multi-dose vial, inhaler, syrup, cream): nothing taken or charged again.
 *   * own    -- the patient's own supply: nothing taken or charged.
 * Voiding the dose puts the stock back ('dispense_voided') and voids the charge.
 */
class MedSupplyService
{
    public const SOURCES = ['stock', 'opened', 'own'];
    public const SETTINGS_ROLES = ['admin'];
    private const EPSILON = 0.0005;
    /** Units that come as one container used over many doses. */
    private const MULTI_DOSE_UNITS = ['bottle', 'tube', 'pen', 'inhaler', 'jar', 'can'];
    private const MASS = ['mcg' => 0.001, 'mg' => 1.0, 'g' => 1000.0];
    private const VOLUME = ['ml' => 1.0, 'l' => 1000.0];

    /**
     * The give form's "Taken from" choices for an order: locations with usable stock (the ward's
     * own stock and the pharmacy first), the opened container (when an earlier dose took one),
     * the patient's own supply; plus the default choice and quantity, and the price.
     */
    public function options(int $orderId): ?array
    {
        $db = Database::connection();
        $o = $this->order($db, $orderId);
        if (!$o) {
            return null;
        }
        [$wardWh, $pharmacyWh] = $this->locations($db, (int) $o['ward_id']);
        $stmt = $db->prepare(
            "SELECT w.id, w.name, SUM(l.quantity_on_hand) AS usable FROM drug_inventory_lots l JOIN warehouses w ON w.id = l.warehouse_id
             WHERE l.drug_id = :d AND l.deleted_at IS NULL AND l.is_active = 1 AND l.quantity_on_hand > 0
               AND (l.expires_date IS NULL OR l.expires_date >= CURDATE()) AND w.deleted_at IS NULL AND w.is_active = 1
             GROUP BY w.id, w.name"
        );
        $stmt->execute(['d' => $o['drug_id']]);
        $stock = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $w) {
            $stock[(int) $w['id']] = ['id' => (int) $w['id'], 'name' => $w['name'], 'usable' => round((float) $w['usable'], 3)];
        }
        $label = function (int $id, string $name) use ($wardWh, $pharmacyWh) {
            return $id === $wardWh ? "Ward stock — {$name}" : ($id === $pharmacyWh ? "Pharmacy — {$name}" : $name);
        };
        $locations = [];
        foreach ([$wardWh, $pharmacyWh] as $id) {
            if ($id && !isset($locations[$id])) {
                $locations[$id] = ['id' => $id, 'label' => $label($id, $stock[$id]['name'] ?? $this->warehouseName($db, $id)),
                    'usable' => $stock[$id]['usable'] ?? 0.0, 'kind' => $id === $wardWh ? 'ward' : 'pharmacy'];
            }
        }
        foreach ($stock as $id => $w) {
            $locations[$id] ??= ['id' => $id, 'label' => $w['name'], 'usable' => $w['usable'], 'kind' => 'other'];
        }

        $multi = $this->isMultiDose($o);
        $qty = $this->defaultQuantity($o);
        // An opened container only makes sense for multi-dose items (vial, inhaler, syrup...).
        $opened = $multi && $this->hasOpened($db, $orderId);
        $default = null;
        if ($multi && $opened) {
            $default = ['source' => 'opened', 'warehouse_id' => null];
        } else {
            foreach ($locations as $l) {
                if ($l['usable'] + self::EPSILON >= $qty) {
                    $default = ['source' => 'stock', 'warehouse_id' => $l['id']];
                    break;
                }
            }
        }
        return [
            'locations' => array_values($locations),
            'default' => $default,
            'quantity' => $qty,
            'unit_name' => $o['unit_name'] ?: 'unit',
            'multi_dose' => $multi,
            'opened_available' => $opened,
            'unit_price' => $o['selling_price'] !== null ? (float) $o['selling_price'] : null,
            'ward_stock_set' => $wardWh !== null,
        ];
    }

    /**
     * Check a supply choice before the dose is written. data: supply_source?, warehouse_id?, stock_quantity?
     * Returns ['source', 'warehouse_id', 'quantity'] or ['error' => result]. No source: the default choice.
     */
    public function resolve(array $o, array $data): array
    {
        $fail = fn(string $m, string $field = 'supply_source') => ['error' => ['success' => false, 'message' => $m, 'errors' => [$field => $m]]];
        $opts = $this->options((int) $o['id']);
        $source = (string) ($data['supply_source'] ?? '');
        if ($source === '') {
            if (!$opts['default']) {
                return $fail("No usable stock of {$o['drug_name']} at the ward or the pharmacy. Ask the pharmacy, or record it as the patient's own supply.");
            }
            $source = $opts['default']['source'];
            $data['warehouse_id'] = $opts['default']['warehouse_id'];
        }
        if (!in_array($source, self::SOURCES, true)) {
            return $fail('Choose where the dose was taken from.');
        }
        if ($source === 'opened') {
            if (!$opts['opened_available']) {
                return $fail('Only a multi-dose item (vial, inhaler, syrup...) opened at an earlier dose of this order can be used: take it from stock.');
            }
            return ['source' => 'opened', 'warehouse_id' => null, 'quantity' => null];
        }
        if ($source === 'own') {
            return ['source' => 'own', 'warehouse_id' => null, 'quantity' => null];
        }
        $wh = (int) ($data['warehouse_id'] ?? 0);
        $loc = null;
        foreach ($opts['locations'] as $l) {
            if ($l['id'] === $wh) {
                $loc = $l;
            }
        }
        if (!$loc) {
            return $fail('Choose the storage location it was taken from.', 'warehouse_id');
        }
        $raw = $data['stock_quantity'] ?? null;
        $qty = $raw === null || $raw === '' ? $opts['quantity'] : filter_var($raw, FILTER_VALIDATE_FLOAT);
        if ($qty === false || $qty <= 0 || $qty > 1000) {
            return $fail('Enter how many ' . $opts['unit_name'] . '(s) were taken from stock.', 'stock_quantity');
        }
        $qty = round((float) $qty, 3);
        if ($qty > $loc['usable'] + self::EPSILON) {
            return $fail('Only ' . self::num($loc['usable']) . " {$opts['unit_name']}(s) usable at {$loc['label']}.", 'stock_quantity');
        }
        return ['source' => 'stock', 'warehouse_id' => $wh, 'quantity' => $qty];
    }

    /**
     * Take the dose from stock and charge it (inside the recording transaction).
     * Returns ['charged' => net amount | null, 'no_price' => bool, 'warehouse' => name], or ['error' => message].
     */
    public function take(PDO $db, int $administrationId, array $o, int $warehouseId, float $qty, int $userId, string $givenAt): array
    {
        $stmt = $db->prepare(
            "SELECT id, quantity_on_hand FROM drug_inventory_lots
             WHERE drug_id = :d AND warehouse_id = :w AND deleted_at IS NULL AND is_active = 1 AND quantity_on_hand > 0
               AND (expires_date IS NULL OR expires_date >= CURDATE())
             ORDER BY expires_date IS NULL, expires_date, id FOR UPDATE"
        );
        $stmt->execute(['d' => $o['drug_id'], 'w' => $warehouseId]);
        $lots = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $usable = array_sum(array_map(fn($l) => (float) $l['quantity_on_hand'], $lots));
        if ($qty > $usable + self::EPSILON) {
            return ['error' => 'Not enough usable stock at that location any more (' . self::num($usable) . ' left). Reload and choose again.'];
        }
        $adm = $db->prepare("SELECT admission_number, patient_name FROM inpatient_admissions WHERE id = :id");
        $adm->execute(['id' => $o['admission_id']]);
        $a = $adm->fetch(PDO::FETCH_ASSOC);
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $insert = $db->prepare("INSERT INTO inpatient_med_admin_lots (administration_id, lot_id, quantity, unit_cost, created_at) VALUES (:a, :l, :q, :c, :now)");
        $deduct = $db->prepare("UPDATE drug_inventory_lots SET quantity_on_hand = quantity_on_hand - :q, updated_at = :now, updated_by = :u WHERE id = :id");
        $left = $qty;
        foreach ($lots as $lot) {
            if ($left <= self::EPSILON) {
                break;
            }
            $part = round(min($left, (float) $lot['quantity_on_hand']), 3);
            $cost = StockLedgerService::lotCost((int) $lot['id'], (int) $o['drug_id']);
            $insert->execute(['a' => $administrationId, 'l' => $lot['id'], 'q' => $part, 'c' => $cost, 'now' => $now]);
            $rowId = (int) $db->lastInsertId();
            $deduct->execute(['q' => $part, 'now' => $now, 'u' => $userId ?: null, 'id' => $lot['id']]);
            StockLedgerService::record((int) $lot['id'], 'dispensed', -$part, 'inpatient_med_admin_lots', $rowId, $userId, [
                'unit_cost' => $cost, 'reference_no' => $a['admission_number'], 'counterparty' => $a['patient_name'],
                'notes' => "Given on the ward: {$o['drug_name']}",
            ]);
            $left = round($left - $part, 3);
        }

        // The charge: catalog selling price per dispensing unit.
        $price = $o['selling_price'] !== null ? (float) $o['selling_price'] : 0.0;
        if ($price <= 0 || !$o['patient_id']) {
            return ['charged' => null, 'no_price' => $price <= 0, 'warehouse' => $this->warehouseName($db, $warehouseId)];
        }
        $gross = round($price * $qty, 2);
        $dose = self::num($o['dose']);
        $unit = $o['unit_name'] ?: 'unit';
        $db->prepare(
            "INSERT INTO inpatient_med_charges (administration_id, admission_id, patient_id, drug_id, description, quantity, unit_price, gross_amount,
                discount_amount, net_amount, charge_date, status, created_at, created_by)
             VALUES (:a, :adm, :p, :d, :desc, :q, :price, :gross, 0, :gross2, :date, 'charged', :now, :u)"
        )->execute([
            'a' => $administrationId, 'adm' => $o['admission_id'], 'p' => $o['patient_id'], 'd' => $o['drug_id'],
            'desc' => mb_substr("{$o['drug_name']} — {$dose} {$o['dose_unit']} {$o['route']} (" . self::num($qty) . " {$unit})", 0, 255),
            'q' => $qty, 'price' => $price, 'gross' => $gross, 'gross2' => $gross, 'date' => substr($givenAt, 0, 10), 'now' => $now, 'u' => $userId ?: null,
        ]);
        return ['charged' => $gross, 'no_price' => false, 'warehouse' => $this->warehouseName($db, $warehouseId)];
    }

    /** The dose was voided: stock back to its lots, charge voided (inside the void transaction). */
    public function giveBack(PDO $db, int $administrationId, string $reason, int $userId): void
    {
        $stmt = $db->prepare(
            "SELECT al.*, a.admission_number, a.patient_name FROM inpatient_med_admin_lots al
             JOIN inpatient_med_administrations r ON r.id = al.administration_id JOIN inpatient_admissions a ON a.id = r.admission_id
             WHERE al.administration_id = :a AND al.returned_at IS NULL ORDER BY al.id FOR UPDATE"
        );
        $stmt->execute(['a' => $administrationId]);
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $al) {
            $db->prepare("SELECT id FROM drug_inventory_lots WHERE id = :id FOR UPDATE")->execute(['id' => $al['lot_id']]);
            $db->prepare("UPDATE drug_inventory_lots SET quantity_on_hand = quantity_on_hand + :q, updated_at = :now, updated_by = :u WHERE id = :id")
                ->execute(['q' => $al['quantity'], 'now' => $now, 'u' => $userId ?: null, 'id' => $al['lot_id']]);
            $db->prepare("UPDATE inpatient_med_admin_lots SET returned_at = :now WHERE id = :id")->execute(['now' => $now, 'id' => $al['id']]);
            StockLedgerService::record((int) $al['lot_id'], 'dispense_voided', (float) $al['quantity'], 'inpatient_med_admin_lots', (int) $al['id'], $userId, [
                'unit_cost' => $al['unit_cost'], 'reference_no' => $al['admission_number'], 'counterparty' => $al['patient_name'], 'reason' => $reason,
            ]);
        }
        $db->prepare("UPDATE inpatient_med_charges SET status = 'voided', voided_at = :now, voided_by = :u, void_reason = :r WHERE administration_id = :a AND status = 'charged'")
            ->execute(['now' => $now, 'u' => $userId ?: null, 'r' => mb_substr($reason, 0, 255), 'a' => $administrationId]);
    }

    /** Charges of an admission (the MAR's summary): live total and lines. */
    public function chargesFor(int $admissionId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT c.id, c.administration_id, c.description, c.quantity, c.unit_price, c.net_amount, c.charge_date, c.status, c.void_reason
             FROM inpatient_med_charges c WHERE c.admission_id = :a ORDER BY c.id"
        );
        $stmt->execute(['a' => $admissionId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $live = array_filter($rows, fn($r) => $r['status'] === 'charged');
        return ['total' => round(array_sum(array_map(fn($r) => (float) $r['net_amount'], $live)), 2), 'count' => count($live)];
    }

    // ------------------------------------------------------------------
    // Settings: the ward stock location of each ward, the pharmacy location
    // ------------------------------------------------------------------

    public function settings(): array
    {
        $db = Database::connection();
        return [
            'pharmacy_warehouse_id' => ($v = $db->query("SELECT inpatient_pharmacy_warehouse_id FROM general_settings LIMIT 1")->fetchColumn()) ? (int) $v : null,
            'default_pharmacy_warehouse_id' => $this->locations($db, 0)[1],
            'wards' => array_map(fn($w) => ['id' => (int) $w['id'], 'name' => $w['ward_name'], 'stock_warehouse_id' => $w['stock_warehouse_id'] !== null ? (int) $w['stock_warehouse_id'] : null],
                $db->query("SELECT id, ward_name, stock_warehouse_id FROM hospital_wards WHERE is_active = 1 ORDER BY ward_name")->fetchAll(PDO::FETCH_ASSOC)),
            'warehouses' => array_map(fn($w) => ['id' => (int) $w['id'], 'name' => $w['name']],
                $db->query("SELECT id, name FROM warehouses WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name")->fetchAll(PDO::FETCH_ASSOC)),
        ];
    }

    /** data: pharmacy_warehouse_id?, wards: {ward_id: warehouse_id|null} */
    public function saveSettings(array $data, array $actor): array
    {
        if (!in_array($actor['role'] ?? '', self::SETTINGS_ROLES, true)) {
            return ['success' => false, 'message' => 'Only an admin can change where ward medicines come from.', 'forbidden' => true];
        }
        $db = Database::connection();
        $valid = array_map('intval', $db->query("SELECT id FROM warehouses WHERE deleted_at IS NULL AND is_active = 1")->fetchAll(PDO::FETCH_COLUMN));
        $wh = fn($v) => $v === null || $v === '' || (int) $v === 0 ? null : (int) $v;
        $pharmacy = $wh($data['pharmacy_warehouse_id'] ?? null);
        if ($pharmacy !== null && !in_array($pharmacy, $valid, true)) {
            return ['success' => false, 'message' => 'Choose an active storage location for the pharmacy.', 'errors' => ['pharmacy_warehouse_id' => 'Invalid.']];
        }
        $wards = is_array($data['wards'] ?? null) ? $data['wards'] : [];
        foreach ($wards as $wardId => $w) {
            if ($wh($w) !== null && !in_array($wh($w), $valid, true)) {
                return ['success' => false, 'message' => 'Choose an active storage location for each ward.', 'errors' => ["ward_{$wardId}" => 'Invalid.']];
            }
        }
        $db->prepare("UPDATE general_settings SET inpatient_pharmacy_warehouse_id = :w")->execute(['w' => $pharmacy]);
        $upd = $db->prepare("UPDATE hospital_wards SET stock_warehouse_id = :w WHERE id = :id");
        foreach ($wards as $wardId => $w) {
            $upd->execute(['w' => $wh($w), 'id' => (int) $wardId]);
        }
        return ['success' => true, 'message' => 'Saved where ward medicines come from.', 'data' => $this->settings()];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** [ward stock location or null, pharmacy location or null]. Pharmacy: the setting, else a location named "pharmacy". */
    private function locations(PDO $db, int $wardId): array
    {
        $ward = null;
        if ($wardId) {
            $stmt = $db->prepare("SELECT w.id FROM hospital_wards hw JOIN warehouses w ON w.id = hw.stock_warehouse_id AND w.deleted_at IS NULL AND w.is_active = 1 WHERE hw.id = :id");
            $stmt->execute(['id' => $wardId]);
            $ward = ($v = $stmt->fetchColumn()) ? (int) $v : null;
        }
        $pharmacy = $db->query(
            "SELECT w.id FROM general_settings g JOIN warehouses w ON w.id = g.inpatient_pharmacy_warehouse_id AND w.deleted_at IS NULL AND w.is_active = 1 LIMIT 1"
        )->fetchColumn();
        if (!$pharmacy) {
            $pharmacy = $db->query("SELECT id FROM warehouses WHERE deleted_at IS NULL AND is_active = 1 AND name LIKE '%pharmac%' ORDER BY id LIMIT 1")->fetchColumn();
        }
        return [$ward, $pharmacy ? (int) $pharmacy : null];
    }

    private function order(PDO $db, int $orderId): ?array
    {
        $stmt = $db->prepare(
            "SELECT o.*, a.ward_id, d.strength, d.selling_price, du.name AS unit_name FROM inpatient_med_orders o
             JOIN inpatient_admissions a ON a.id = o.admission_id JOIN drugs d ON d.id = o.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id WHERE o.id = :id"
        );
        $stmt->execute(['id' => $orderId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * A container used over many doses: strength given as a concentration ("100 IU/ml", "1%"),
     * or a tube / pen / inhaler / bottle -- except a bottle of a plain volume ("1000 ml" IV fluid),
     * which is used up by one dose.
     */
    public function isMultiDose(array $o): bool
    {
        $strength = (string) ($o['strength'] ?? '');
        $unit = strtolower((string) ($o['unit_name'] ?? ''));
        if (str_contains($strength, '/') || str_contains($strength, '%')) {
            return true;
        }
        if ($unit === 'bottle') {
            return !preg_match('/^\s*[\d.]+\s*(ml|l)\s*$/i', $strength);
        }
        return in_array($unit, self::MULTI_DOSE_UNITS, true);
    }

    /**
     * How many dispensing units one dose takes: 1 container for multi-dose items; the dose
     * itself when ordered in tablets / capsules...; else dose / strength (tablets in halves,
     * anything else whole units, the rest wasted). 1 when it can't be worked out.
     */
    public function defaultQuantity(array $o): float
    {
        if ($this->isMultiDose($o)) {
            return 1.0;
        }
        $unit = strtolower((string) ($o['unit_name'] ?? ''));
        $doseUnit = strtolower((string) $o['dose_unit']);
        $dose = (float) $o['dose'];
        if ($unit !== '' && ($doseUnit === $unit || rtrim($doseUnit, 's') === rtrim($unit, 's'))) {
            return max(0.5, $dose);
        }
        if (!preg_match('/^\s*([\d.]+)\s*([a-z]+)\s*$/i', (string) ($o['strength'] ?? ''), $m)) {
            return 1.0;
        }
        $sUnit = strtolower($m[2]);
        $per = (float) $m[1];
        $base = null;
        foreach ([self::MASS, self::VOLUME, ['iu' => 1.0, 'units' => 1.0, 'unit' => 1.0]] as $family) {
            if (isset($family[$sUnit], $family[$doseUnit])) {
                $base = $dose * $family[$doseUnit] / ($per * $family[$sUnit]);
            }
        }
        if ($base === null || $base <= 0) {
            return 1.0;
        }
        return $unit === 'tablet' ? max(0.5, ceil($base * 2 - 1e-9) / 2) : max(1.0, ceil($base - 1e-9));
    }

    private function hasOpened(PDO $db, int $orderId): bool
    {
        $stmt = $db->prepare(
            "SELECT 1 FROM inpatient_med_administrations WHERE order_id = :o AND status = 'given' AND voided_at IS NULL AND supply_source = 'stock' LIMIT 1"
        );
        $stmt->execute(['o' => $orderId]);
        return (bool) $stmt->fetchColumn();
    }

    private function warehouseName(PDO $db, int $id): string
    {
        $stmt = $db->prepare("SELECT name FROM warehouses WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return (string) $stmt->fetchColumn();
    }

    public static function num($v): string
    {
        return rtrim(rtrim(number_format((float) $v, 3, '.', ''), '0'), '.');
    }
}
