<?php

namespace App\Modules\PharmacyReports\Services;

use App\Core\Database;
use App\Modules\Dispensing\Services\DispensingService;
use App\Modules\DrugInventory\Services\StockLedgerService;
use App\Modules\PatientPrescriptions\Services\PrescriptionService;
use PDO;

/**
 * Pharmacy > Pharmacy Reports: controls on what leaves the pharmacy.
 *
 *   * dispensingLog()  -- every medicine given: when, to whom, by whom,
 *                         from which lot and location, checked by whom
 *   * dangerousDrugs() -- the Dangerous Drugs register (RA 9165): per
 *                         dangerous drug, every receipt, transfer,
 *                         dispensing and adjustment with a running balance;
 *                         dispensings show the patient, prescriber, S2 and
 *                         prescription number
 *   * unfilled()       -- prescriptions not yet given, or only partly,
 *                         still fillable or already lapsed
 *   * byPrescriber()   -- prescriptions written per doctor and how many
 *                         were filled
 *
 * Quantities are in each medicine's dispensing unit.
 */
class PharmacyReportService
{
    public const ROLES = DispensingService::ROLES;

    public const CLASSES = [
        'dangerous' => PrescriptionService::DANGEROUS_CLASS,
        'precursor' => 'Controlled Precursor'
    ];

    private const ROW_LIMIT = 5000;

    /** A user's name (employees e joined to users u), else the username. */
    private const USER_NAME = "MAX(COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username))";

    private const EPSILON = 0.0005;

    /** Who ordered a dangerous drug: the prescriber, or for one used in surgery the anesthesiologist (else the surgeon). */
    private const ORDERED_BY = "COALESCE(p.prescriber_user_id, oc.anesthesiologist_user_id, oc.lead_surgeon_user_id)";

    public function options(): array
    {
        $db = Database::connection();

        return [
            'warehouses' => $db->query("SELECT id, name FROM warehouses WHERE deleted_at IS NULL ORDER BY name")->fetchAll(PDO::FETCH_ASSOC),
            'drugs' => $db->query(
                "SELECT d.id, d.name, d.controlled_class, d.is_high_alert FROM drugs d
                 WHERE d.deleted_at IS NULL AND (d.allow_inventory = 1 OR EXISTS (SELECT 1 FROM prescription_dispense_items i WHERE i.drug_id = d.id))
                 ORDER BY d.name"
            )->fetchAll(PDO::FETCH_ASSOC),
            'controlled_drugs' => $db->query(
                "SELECT d.id, d.name, d.controlled_class FROM drugs d
                 WHERE d.controlled_class IN (" . $this->classList() . ")
                   AND (d.deleted_at IS NULL OR EXISTS (SELECT 1 FROM drug_stock_movements m WHERE m.drug_id = d.id))
                 ORDER BY d.name"
            )->fetchAll(PDO::FETCH_ASSOC),
            // Doctors, and anyone else who has written a prescription.
            'prescribers' => $db->query(
                "SELECT u.id, " . self::USER_NAME . " AS name
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE EXISTS (SELECT 1 FROM employees e2 JOIN providers pr ON pr.employee_id = e2.id AND pr.deleted_at IS NULL WHERE e2.user_id = u.id AND e2.deleted_at IS NULL)
                    OR EXISTS (SELECT 1 FROM prescriptions p WHERE p.prescriber_user_id = u.id)
                 GROUP BY u.id ORDER BY name"
            )->fetchAll(PDO::FETCH_ASSOC),
            'dispensers' => $db->query(
                "SELECT u.id, " . self::USER_NAME . " AS name
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE EXISTS (SELECT 1 FROM prescription_dispenses d WHERE d.created_by = u.id) GROUP BY u.id ORDER BY name"
            )->fetchAll(PDO::FETCH_ASSOC),
            'classes' => array_map(fn($k, $v) => ['value' => $k, 'label' => $v], array_keys(self::CLASSES), self::CLASSES)
        ];
    }

    /* ---------------------------------------------------------------
     * Dispensing log
     * ------------------------------------------------------------- */

    /**
     * Filters: date_from?, date_to? (dispensed), warehouse_id?, drug_id?,
     * prescriber_id?, dispensed_by?, status (completed | voided | all),
     * flag (high_alert | controlled)?, q? (patient, Rx or DSP number)
     */
    public function dispensingLog(array $filters): array
    {
        $db = Database::connection();
        $where = ['1 = 1'];
        $params = [];

        $from = $this->date($filters['date_from'] ?? null);
        $to = $this->date($filters['date_to'] ?? null);
        if ($from) {
            $where[] = 'd.dispensed_date >= :from';
            $params['from'] = $from;
        }
        if ($to) {
            $where[] = 'd.dispensed_date <= :to';
            $params['to'] = $to;
        }
        foreach (['warehouse_id' => 'd.warehouse_id', 'drug_id' => 'i.drug_id', 'prescriber_id' => 'p.prescriber_user_id', 'dispensed_by' => 'd.created_by'] as $key => $column) {
            if (!empty($filters[$key])) {
                $where[] = "{$column} = :{$key}";
                $params[$key] = (int) $filters[$key];
            }
        }

        $status = in_array($filters['status'] ?? '', ['completed', 'voided', 'all'], true) ? $filters['status'] : 'completed';
        if ($status !== 'all') {
            $where[] = 'd.status = :status';
            $params['status'] = $status;
        }

        $flag = $filters['flag'] ?? '';
        if ($flag === 'high_alert') {
            $where[] = 'dr.is_high_alert = 1';
        } elseif ($flag === 'controlled') {
            $where[] = 'dr.controlled_class IN (' . $this->classList() . ')';
        }

        $q = trim((string) ($filters['q'] ?? ''));
        if ($q !== '') {
            $like = '%' . addcslashes($q, '%_\\') . '%';
            $where[] = "(d.dispense_number LIKE :q1 OR p.rx_number LIKE :q2 OR pt.patient_no LIKE :q3
                         OR CONCAT_WS(' ', pt.first_name, pt.middle_name, pt.last_name) LIKE :q4 OR CONCAT_WS(' ', pt.last_name, pt.first_name) LIKE :q5)";
            $params += ['q1' => $like, 'q2' => $like, 'q3' => $like, 'q4' => $like, 'q5' => $like];
        }

        $stmt = $db->prepare(
            "SELECT i.id, i.dispense_id, i.prescription_item_id, i.quantity, i.fill_number, i.unit_cost,
                    d.dispense_number, d.dispensed_date, d.created_at, d.status, d.check_status, d.checked_at, d.void_reason, d.voided_at, d.patient_id,
                    p.id AS prescription_id, p.rx_number, pp.refills,
                    pt.patient_no, pt.first_name, pt.middle_name, pt.last_name, pt.suffix,
                    dr.name AS drug_name, dr.generic_name, dr.controlled_class, dr.is_high_alert, du.name AS unit_name,
                    l.lot_number, l.expires_date, w.name AS warehouse_name,
                    " . self::userNameSql('d.created_by') . " AS dispensed_by_name,
                    " . self::userNameSql('d.checked_by') . " AS checked_by_name,
                    " . self::userNameSql('p.prescriber_user_id') . " AS prescriber_name
             FROM prescription_dispense_items i
             JOIN prescription_dispenses d ON d.id = i.dispense_id
             JOIN prescriptions p ON p.id = d.prescription_id
             JOIN patient_prescriptions pp ON pp.id = i.prescription_item_id
             JOIN patients pt ON pt.id = d.patient_id
             JOIN drugs dr ON dr.id = i.drug_id
             LEFT JOIN amount_units du ON du.id = dr.dispensing_unit_id
             JOIN drug_inventory_lots l ON l.id = i.lot_id
             JOIN warehouses w ON w.id = d.warehouse_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY d.created_at DESC, d.id DESC, i.id
             LIMIT " . (self::ROW_LIMIT + 1)
        );
        $stmt->execute($params);
        $all = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $truncated = count($all) > self::ROW_LIMIT;
        $all = array_slice($all, 0, self::ROW_LIMIT);

        // What was charged for the medicines shown (charges are per medicine per dispensing, not per lot).
        $charged = 0.0;
        $pairs = [];
        foreach ($all as $r) {
            if ($r['status'] === 'completed') {
                $pairs[(int) $r['dispense_id']][(int) $r['prescription_item_id']] = true;
            }
        }
        if ($pairs) {
            foreach ($db->query(
                "SELECT dispense_id, prescription_item_id, net_amount FROM pharmacy_charges
                 WHERE status = 'charged' AND dispense_id IN (" . implode(',', array_keys($pairs)) . ")"
            )->fetchAll(PDO::FETCH_ASSOC) as $c) {
                if (isset($pairs[(int) $c['dispense_id']][(int) $c['prescription_item_id']])) {
                    $charged += (float) $c['net_amount'];
                }
            }
        }

        $completed = array_filter($all, fn($r) => $r['status'] === 'completed');

        return [
            'filters' => ['date_from' => $from, 'date_to' => $to, 'status' => $status],
            'rows' => array_map(fn($r) => [
                'id' => (int) $r['id'],
                'dispense_id' => (int) $r['dispense_id'],
                'dispense_number' => $r['dispense_number'],
                'dispensed_date' => $r['dispensed_date'],
                'dispensed_at' => $r['created_at'],
                'status' => $r['status'],
                'void_reason' => $r['void_reason'],
                'check_status' => $r['check_status'],
                'checked_by_name' => $r['checked_by_name'],
                'checked_at' => $r['checked_at'],
                'prescription_id' => (int) $r['prescription_id'],
                'rx_number' => $r['rx_number'],
                'prescriber_name' => $r['prescriber_name'],
                'patient_id' => (int) $r['patient_id'],
                'patient_no' => $r['patient_no'],
                'patient_name' => self::personName($r),
                'drug_name' => $r['drug_name'],
                'generic_name' => $r['generic_name'],
                'is_controlled' => in_array($r['controlled_class'], self::CLASSES, true),
                'controlled_class' => $r['controlled_class'],
                'is_high_alert' => (bool) $r['is_high_alert'],
                'quantity' => (float) $r['quantity'],
                'unit_name' => $r['unit_name'],
                'fill_label' => (int) $r['fill_number'] > 1 ? 'Refill ' . ((int) $r['fill_number'] - 1) . ' of ' . (int) $r['refills'] : null,
                'lot_number' => $r['lot_number'],
                'expires_date' => $r['expires_date'],
                'warehouse_name' => $r['warehouse_name'],
                'dispensed_by_name' => $r['dispensed_by_name'],
                'cost_value' => round((float) $r['quantity'] * (float) $r['unit_cost'], 2)
            ], $all),
            'totals' => [
                'dispensings' => count(array_unique(array_column($completed, 'dispense_id'))),
                'patients' => count(array_unique(array_column($completed, 'patient_id'))),
                'lines' => count($completed),
                'cost_value' => round(array_sum(array_map(fn($r) => (float) $r['quantity'] * (float) $r['unit_cost'], $completed)), 2),
                'charged' => round($charged, 2),
                'voided' => count(array_unique(array_column(array_filter($all, fn($r) => $r['status'] === 'voided'), 'dispense_id'))),
                'awaiting_check' => count(array_unique(array_column(array_filter($completed, fn($r) => $r['check_status'] === 'awaiting'), 'dispense_id')))
            ],
            'truncated' => $truncated
        ];
    }

    /* ---------------------------------------------------------------
     * Dangerous Drugs register
     * ------------------------------------------------------------- */

    /**
     * Filters: class (dangerous | precursor | all), drug_id?, warehouse_id?,
     * date_from?, date_to?. One section per drug that moved or is on hand.
     */
    public function dangerousDrugs(array $filters): array
    {
        $db = Database::connection();
        $classKey = in_array($filters['class'] ?? '', ['dangerous', 'precursor', 'all'], true) ? $filters['class'] : 'dangerous';
        $classes = $classKey === 'all' ? array_values(self::CLASSES) : [self::CLASSES[$classKey]];
        $from = $this->date($filters['date_from'] ?? null);
        $to = $this->date($filters['date_to'] ?? null);
        $warehouseId = !empty($filters['warehouse_id']) ? (int) $filters['warehouse_id'] : null;

        $drugWhere = ['d.controlled_class IN (' . implode(',', array_map(fn($c) => $db->quote($c), $classes)) . ')'];
        if (!empty($filters['drug_id'])) {
            $drugWhere[] = 'd.id = ' . (int) $filters['drug_id'];
        }

        $drugs = $db->query(
            "SELECT d.id, d.name, d.generic_name, d.brand_name, d.strength, d.controlled_class, d.deleted_at,
                    df.name AS dosage_form, du.name AS unit_name
             FROM drugs d
             LEFT JOIN dosage_forms df ON df.id = d.dosage_form_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             WHERE " . implode(' AND ', $drugWhere) . "
             ORDER BY COALESCE(NULLIF(d.generic_name, ''), d.name), d.name"
        )->fetchAll(PDO::FETCH_ASSOC);

        $sections = [];
        foreach ($drugs as $drug) {
            $section = $this->registerFor($drug, $warehouseId, $from, $to);
            if ($section) {
                $sections[] = $section;
            }
        }

        $business = PrescriptionService::business();

        return [
            'filters' => ['class' => $classKey, 'date_from' => $from, 'date_to' => $to, 'warehouse_id' => $warehouseId],
            'facility' => ['name' => $business['name'], 'address' => $business['address']],
            'warehouse_name' => $warehouseId ? StockLedgerService::warehouseName($warehouseId) : null,
            'drug_count' => count($drugs),
            'sections' => $sections,
            'all_reconciled' => !array_filter($sections, fn($s) => $s['reconciled'] === false)
        ];
    }

    /** One drug's register page; null when it neither moved in the period nor is on hand. */
    private function registerFor(array $drug, ?int $warehouseId, ?string $from, ?string $to): ?array
    {
        $db = Database::connection();
        $where = ['m.drug_id = :drug'];
        $params = ['drug' => $drug['id']];
        if ($warehouseId) {
            $where[] = 'm.warehouse_id = :wh';
            $params['wh'] = $warehouseId;
        }
        if ($to) {
            $where[] = 'm.movement_date <= :to';
            $params['to'] = $to;
        }

        // Dispensings: who got it, on whose prescription.
        $stmt = $db->prepare(
            "SELECT m.*, l.lot_number, l.expires_date, w.name AS warehouse_name,
                    " . self::userNameSql('m.created_by') . " AS recorded_by,
                    di.dispense_id, pd.dispense_number, p.rx_number, p.prescribed_date,
                    pt.patient_no, pt.first_name, pt.middle_name, pt.last_name, pt.suffix,
                    (SELECT CONCAT_WS(', ', NULLIF(pc.address_line, ''), NULLIF(pc.city, ''), NULLIF(pc.province, ''))
                     FROM patient_contacts pc WHERE pc.patient_id = pt.id AND pc.deleted_at IS NULL ORDER BY pc.id LIMIT 1) AS patient_address,
                    oc.case_number AS or_case_number, oc.scheduled_date AS or_case_date,
                    " . self::userNameSql(self::ORDERED_BY) . " AS prescriber_name,
                    (SELECT pr.s2_number FROM employees e JOIN providers pr ON pr.employee_id = e.id AND pr.deleted_at IS NULL
                     WHERE e.user_id = " . self::ORDERED_BY . " AND e.deleted_at IS NULL LIMIT 1) AS prescriber_s2,
                    (SELECT pr.license_number FROM employees e JOIN providers pr ON pr.employee_id = e.id AND pr.deleted_at IS NULL
                     WHERE e.user_id = " . self::ORDERED_BY . " AND e.deleted_at IS NULL LIMIT 1) AS prescriber_prc
             FROM drug_stock_movements m
             JOIN drug_inventory_lots l ON l.id = m.lot_id
             JOIN warehouses w ON w.id = m.warehouse_id
             LEFT JOIN prescription_dispense_items di ON m.source_type = 'prescription_dispense_items' AND di.id = m.source_id
             LEFT JOIN prescription_dispenses pd ON pd.id = di.dispense_id
             LEFT JOIN prescriptions p ON p.id = pd.prescription_id
             LEFT JOIN or_case_item_lots oil ON m.source_type = 'or_case_item_lots' AND oil.id = m.source_id
             LEFT JOIN or_case_items oi ON oi.id = oil.item_id
             LEFT JOIN or_surgical_cases oc ON oc.id = oi.case_id
             LEFT JOIN patients pt ON pt.id = COALESCE(pd.patient_id, oc.patient_id)
             WHERE " . implode(' AND ', $where) . "
             ORDER BY m.movement_date, m.movement_type = 'opening' DESC, m.created_at, m.id"
        );
        $stmt->execute($params);

        $balance = 0.0;
        $opening = 0.0;
        $rows = [];
        $in = 0.0;
        $out = 0.0;
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $m) {
            $qty = (float) $m['quantity'];
            $balance = round($balance + $qty, 3);
            if ($from && $m['movement_date'] < $from) {
                $opening = $balance;
                continue;
            }
            if ($qty >= 0) {
                $in += $qty;
            } else {
                $out -= $qty;
            }
            $isDispense = $m['dispense_id'] !== null || $m['or_case_number'] !== null;

            $rows[] = [
                'id' => (int) $m['id'],
                'date' => $m['movement_date'],
                'recorded_at' => $m['created_at'],
                'type' => $m['movement_type'],
                'type_label' => $m['or_case_number'] !== null
                    ? ($m['movement_type'] === 'dispensed' ? 'Used in surgery' : 'Surgery use undone')
                    : (StockLedgerService::TYPES[$m['movement_type']] ?? $m['movement_type']),
                'reference_no' => $m['reference_no'],
                // Received from (supplier / location) or given to (patient).
                'counterparty' => $isDispense ? self::personName($m) : $m['counterparty'],
                'patient_no' => $isDispense ? $m['patient_no'] : null,
                'patient_address' => $isDispense ? $m['patient_address'] : null,
                // Used in surgery: the OR case stands in for the prescription.
                'rx_number' => $m['rx_number'] ?? $m['or_case_number'],
                'prescribed_date' => $m['prescribed_date'] ?? $m['or_case_date'],
                'prescriber_name' => $m['prescriber_name'],
                'prescriber_s2' => $m['prescriber_s2'],
                'prescriber_prc' => $m['prescriber_prc'],
                'reason' => $m['reason'],
                'warehouse_name' => $m['warehouse_name'],
                'lot_number' => $m['lot_number'],
                'expires_date' => $m['expires_date'],
                'quantity_in' => $qty > 0 ? $qty : null,
                'quantity_out' => $qty < 0 ? -$qty : null,
                'balance' => $balance,
                'recorded_by' => $m['recorded_by']
            ];
        }

        $lotWhere = ['l.drug_id = :drug', 'l.deleted_at IS NULL'];
        $lotParams = ['drug' => $drug['id']];
        if ($warehouseId) {
            $lotWhere[] = 'l.warehouse_id = :wh';
            $lotParams['wh'] = $warehouseId;
        }
        $stmt = $db->prepare("SELECT COALESCE(SUM(l.quantity_on_hand), 0) FROM drug_inventory_lots l WHERE " . implode(' AND ', $lotWhere));
        $stmt->execute($lotParams);
        $onHand = round((float) $stmt->fetchColumn(), 3);

        if (!$rows && abs($opening) < self::EPSILON && abs($onHand) < self::EPSILON) {
            return null;
        }

        $isCurrent = $to === null || $to >= date('Y-m-d');

        return [
            'drug_id' => (int) $drug['id'],
            'drug_name' => $drug['name'],
            'generic_name' => $drug['generic_name'],
            'brand_name' => $drug['brand_name'],
            'strength' => $drug['strength'],
            'dosage_form' => $drug['dosage_form'],
            'unit_name' => $drug['unit_name'],
            'controlled_class' => $drug['controlled_class'],
            'opening_balance' => $from ? $opening : 0.0,
            'total_in' => round($in, 3),
            'total_out' => round($out, 3),
            'closing_balance' => $balance,
            'on_hand' => $onHand,
            // The register must end at what's on the shelf; a difference is a discrepancy to report.
            'reconciled' => $isCurrent ? abs($balance - $onHand) < self::EPSILON : null,
            'rows' => $rows
        ];
    }

    /* ---------------------------------------------------------------
     * Unfilled prescriptions
     * ------------------------------------------------------------- */

    /**
     * Filters: date_from?, date_to? (prescribed), prescriber_id?,
     * state (open | lapsed | all). Open = can still be filled; lapsed =
     * its validity (or refill period) ended before it was fully given.
     */
    public function unfilled(array $filters): array
    {
        $db = Database::connection();
        $today = date('Y-m-d');
        $where = ["p.deleted_at IS NULL", "p.status = 'active'", "p.dispense_status IN ('pending', 'partial')"];
        $params = [];

        $from = $this->date($filters['date_from'] ?? null);
        $to = $this->date($filters['date_to'] ?? null);
        if ($from) {
            $where[] = 'p.prescribed_date >= :from';
            $params['from'] = $from;
        }
        if ($to) {
            $where[] = 'p.prescribed_date <= :to';
            $params['to'] = $to;
        }
        if (!empty($filters['prescriber_id'])) {
            $where[] = 'p.prescriber_user_id = :prescriber';
            $params['prescriber'] = (int) $filters['prescriber_id'];
        }

        $state = in_array($filters['state'] ?? '', ['open', 'lapsed', 'all'], true) ? $filters['state'] : 'all';
        if ($state === 'open') {
            $where[] = '(p.fillable_until IS NULL OR p.fillable_until >= :today)';
            $params['today'] = $today;
        } elseif ($state === 'lapsed') {
            $where[] = 'p.fillable_until < :today';
            $params['today'] = $today;
        }

        $stmt = $db->prepare(
            "SELECT p.id, p.rx_number, p.patient_id, p.prescribed_date, p.valid_until, p.refill_until, p.fillable_until, p.dispense_status, p.last_dispensed_at,
                    pt.patient_no, pt.first_name, pt.middle_name, pt.last_name, pt.suffix,
                    (SELECT pc.mobile_phone FROM patient_contacts pc WHERE pc.patient_id = pt.id AND pc.deleted_at IS NULL ORDER BY pc.id LIMIT 1) AS mobile_phone,
                    " . self::userNameSql('p.prescriber_user_id') . " AS prescriber_name
             FROM prescriptions p JOIN patients pt ON pt.id = p.patient_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY p.prescribed_date, p.id
             LIMIT " . (self::ROW_LIMIT + 1)
        );
        $stmt->execute($params);
        $list = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $truncated = count($list) > self::ROW_LIMIT;
        $list = array_slice($list, 0, self::ROW_LIMIT);

        $lines = [];
        $fills = [];
        if ($list) {
            $ids = implode(',', array_map(fn($r) => (int) $r['id'], $list));
            foreach ($db->query(
                "SELECT pp.id, pp.prescription_id, pp.title, pp.quantity, pp.refills, pp.drug_id, dr.controlled_class, dr.is_high_alert, du.name AS unit_name
                 FROM patient_prescriptions pp
                 LEFT JOIN drugs dr ON dr.id = pp.drug_id
                 LEFT JOIN amount_units du ON du.id = dr.dispensing_unit_id
                 WHERE pp.prescription_id IN ({$ids}) AND pp.deleted_at IS NULL
                 ORDER BY pp.line_no, pp.id"
            )->fetchAll(PDO::FETCH_ASSOC) as $l) {
                $lines[(int) $l['prescription_id']][] = $l;
            }
            foreach ($db->query(
                "SELECT i.prescription_item_id, i.fill_number, SUM(i.quantity) AS qty
                 FROM prescription_dispense_items i JOIN prescription_dispenses d ON d.id = i.dispense_id
                 WHERE d.status = 'completed' AND d.prescription_id IN ({$ids})
                 GROUP BY i.prescription_item_id, i.fill_number"
            )->fetchAll(PDO::FETCH_ASSOC) as $f) {
                $fills[(int) $f['prescription_item_id']][(int) $f['fill_number']] = round((float) $f['qty'], 3);
            }
        }

        $rows = [];
        $totals = ['count' => 0, 'open' => 0, 'lapsed' => 0, 'never_given' => 0, 'partly_given' => 0, 'controlled' => 0];
        foreach ($list as $r) {
            $lapsed = $r['fillable_until'] !== null && $r['fillable_until'] < $today;
            $medicines = [];
            $controlled = false;
            foreach ($lines[(int) $r['id']] ?? [] as $l) {
                $catalog = $l['drug_id'] !== null;
                $prescribed = $catalog ? DispensingService::parseQuantity($l['quantity'], $l['unit_name']) : null;
                $s = DispensingService::lineState($prescribed, (int) ($l['refills'] ?? 0), $fills[(int) $l['id']] ?? []);
                $controlled = $controlled || in_array($l['controlled_class'], self::CLASSES, true);
                $medicines[] = [
                    'title' => $l['title'],
                    'in_catalog' => $catalog,
                    'quantity' => $l['quantity'],
                    'unit_name' => $l['unit_name'],
                    'prescribed_quantity' => $prescribed,
                    'given' => $s['given_current'],
                    'fill_label' => $s['current_fill'] === 1 ? null : 'Refill ' . ($s['current_fill'] - 1),
                    'is_complete' => $catalog && $s['current_complete'],
                    'is_controlled' => in_array($l['controlled_class'], self::CLASSES, true),
                    'is_high_alert' => (bool) $l['is_high_alert']
                ];
            }

            $totals['count']++;
            $totals[$lapsed ? 'lapsed' : 'open']++;
            $totals[$r['dispense_status'] === 'pending' ? 'never_given' : 'partly_given']++;
            $totals['controlled'] += $controlled ? 1 : 0;

            $rows[] = [
                'id' => (int) $r['id'],
                'rx_number' => $r['rx_number'],
                'prescribed_date' => $r['prescribed_date'],
                'days_waiting' => (int) (new \DateTime($r['prescribed_date']))->diff(new \DateTime($today))->days,
                'fillable_until' => $r['fillable_until'],
                'is_lapsed' => $lapsed,
                'dispense_status' => $r['dispense_status'],
                'status_label' => DispensingService::STATUS_LABELS[$r['dispense_status']] ?? $r['dispense_status'],
                'last_dispensed_at' => $r['last_dispensed_at'],
                'patient_id' => (int) $r['patient_id'],
                'patient_no' => $r['patient_no'],
                'patient_name' => self::personName($r),
                'mobile_phone' => $r['mobile_phone'],
                'prescriber_name' => $r['prescriber_name'],
                'has_controlled' => $controlled,
                'medicines' => $medicines
            ];
        }

        return ['filters' => ['date_from' => $from, 'date_to' => $to, 'state' => $state], 'rows' => $rows, 'totals' => $totals, 'truncated' => $truncated];
    }

    /* ---------------------------------------------------------------
     * Prescriptions by doctor
     * ------------------------------------------------------------- */

    /** Filters: date_from?, date_to? (prescribed), prescriber_id? */
    public function byPrescriber(array $filters): array
    {
        $db = Database::connection();
        $today = date('Y-m-d');
        $where = ['p.deleted_at IS NULL'];
        $params = ['today' => $today, 'today2' => $today];

        $from = $this->date($filters['date_from'] ?? null);
        $to = $this->date($filters['date_to'] ?? null);
        if ($from) {
            $where[] = 'p.prescribed_date >= :from';
            $params['from'] = $from;
        }
        if ($to) {
            $where[] = 'p.prescribed_date <= :to';
            $params['to'] = $to;
        }
        if (!empty($filters['prescriber_id'])) {
            $where[] = 'p.prescriber_user_id = :prescriber';
            $params['prescriber'] = (int) $filters['prescriber_id'];
        }
        $scope = implode(' AND ', $where);

        $stmt = $db->prepare(
            "SELECT p.prescriber_user_id, " . self::userNameSql('p.prescriber_user_id') . " AS prescriber_name,
                    COUNT(*) AS total,
                    COUNT(DISTINCT p.patient_id) AS patients,
                    SUM(p.status = 'cancelled') AS cancelled,
                    SUM(p.status = 'active' AND p.dispense_status = 'dispensed') AS dispensed,
                    SUM(p.status = 'active' AND p.dispense_status IN ('pending', 'partial') AND (p.fillable_until IS NULL OR p.fillable_until >= :today)) AS open_count,
                    SUM(p.status = 'active' AND p.dispense_status IN ('pending', 'partial') AND p.fillable_until < :today2) AS lapsed,
                    SUM(p.status = 'active' AND p.dispense_status = 'partial') AS partial,
                    SUM(p.status = 'active' AND p.dispense_status = 'closed') AS closed,
                    SUM(p.status = 'active' AND p.dispense_status = 'none') AS outside,
                    SUM((SELECT COUNT(*) FROM patient_prescriptions pp WHERE pp.prescription_id = p.id AND pp.deleted_at IS NULL)) AS medicines,
                    SUM(EXISTS (SELECT 1 FROM patient_prescriptions pp JOIN drugs dr ON dr.id = pp.drug_id
                                WHERE pp.prescription_id = p.id AND pp.deleted_at IS NULL AND dr.controlled_class IN (" . $this->classList() . "))) AS controlled
             FROM prescriptions p
             WHERE {$scope}
             GROUP BY p.prescriber_user_id
             ORDER BY total DESC, prescriber_name"
        );
        $stmt->execute($params);
        $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Each doctor's most-prescribed medicines.
        $top = [];
        $topParams = array_diff_key($params, ['today' => 1, 'today2' => 1]);
        $stmt = $db->prepare(
            "SELECT p.prescriber_user_id, COALESCE(dr.generic_name, pp.title) AS medicine, COUNT(*) AS times
             FROM patient_prescriptions pp
             JOIN prescriptions p ON p.id = pp.prescription_id
             LEFT JOIN drugs dr ON dr.id = pp.drug_id
             WHERE {$scope} AND p.status = 'active' AND pp.deleted_at IS NULL
             GROUP BY p.prescriber_user_id, medicine
             ORDER BY times DESC, medicine"
        );
        $stmt->execute($topParams);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $t) {
            $key = (int) $t['prescriber_user_id'];
            if (count($top[$key] ?? []) < 3) {
                $top[$key][] = ['medicine' => $t['medicine'], 'times' => (int) $t['times']];
            }
        }

        $rows = array_map(function ($g) use ($top) {
            $fillable = (int) $g['total'] - (int) $g['cancelled'] - (int) $g['outside'];
            return [
                'prescriber_id' => $g['prescriber_user_id'] !== null ? (int) $g['prescriber_user_id'] : null,
                'prescriber_name' => $g['prescriber_name'] ?: 'Not recorded',
                'total' => (int) $g['total'],
                'patients' => (int) $g['patients'],
                'medicines' => (int) $g['medicines'],
                'controlled' => (int) $g['controlled'],
                'dispensed' => (int) $g['dispensed'],
                'partial' => (int) $g['partial'],
                'open' => (int) $g['open_count'],
                'lapsed' => (int) $g['lapsed'],
                'closed' => (int) $g['closed'],
                'cancelled' => (int) $g['cancelled'],
                'outside' => (int) $g['outside'],
                // Of the prescriptions the pharmacy could fill, how many were given in full.
                'fill_rate' => $fillable > 0 ? round((int) $g['dispensed'] * 100 / $fillable, 1) : null,
                'top_medicines' => $top[(int) $g['prescriber_user_id']] ?? []
            ];
        }, $groups);

        $sum = fn(string $k) => array_sum(array_column($rows, $k));
        $fillable = $sum('total') - $sum('cancelled') - $sum('outside');

        return [
            'filters' => ['date_from' => $from, 'date_to' => $to],
            'rows' => $rows,
            'totals' => [
                'total' => $sum('total'), 'medicines' => $sum('medicines'), 'controlled' => $sum('controlled'), 'dispensed' => $sum('dispensed'),
                'partial' => $sum('partial'), 'open' => $sum('open'), 'lapsed' => $sum('lapsed'), 'closed' => $sum('closed'),
                'cancelled' => $sum('cancelled'), 'outside' => $sum('outside'),
                'fill_rate' => $fillable > 0 ? round($sum('dispensed') * 100 / $fillable, 1) : null
            ]
        ];
    }

    /* ---------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------- */

    private function classList(): string
    {
        $db = Database::connection();
        return implode(',', array_map(fn($c) => $db->quote($c), array_values(self::CLASSES)));
    }

    private function date($value): ?string
    {
        $value = trim((string) $value);
        $date = \DateTime::createFromFormat('Y-m-d', $value);

        return $date !== false && $date->format('Y-m-d') === $value ? $value : null;
    }

    private static function personName(array $r): string
    {
        return preg_replace('/\s+/', ' ', trim(implode(' ', array_filter([$r['first_name'] ?? '', $r['middle_name'] ?? '', $r['last_name'] ?? '', $r['suffix'] ?? '']))));
    }

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }
}
