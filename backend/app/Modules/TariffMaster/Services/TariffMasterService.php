<?php

namespace App\Modules\TariffMaster\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

class TariffMasterService
{
    /**
     * Atomically generate unique tariff code
     */
    public static function generateTariffCode(PDO $pdo, string $category = 'general'): string
    {
        $prefixMap = [
            'consultation' => 'TAR-CNS',
            'nursing_care' => 'TAR-NRS',
            'bedside_procedure' => 'TAR-PRC',
            'operating_theater' => 'TAR-SUR',
            'emergency_service' => 'TAR-EMR',
            'diagnostic_lab' => 'TAR-LAB',
            'radiology_imaging' => 'TAR-RAD',
            'supplies_equipment' => 'TAR-SUP',
            'room_board' => 'TAR-ROM',
            'miscellaneous' => 'TAR-MSC'
        ];
        $p = $prefixMap[$category] ?? 'TAR-SRV';

        $year = (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'TARIFF' AND year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO billing_tariff_counters (counter_type, year, last_number) VALUES ('TARIFF', ?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE billing_tariff_counters SET last_number = ? WHERE counter_type = 'TARIFF' AND year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("%s-%04d-%04d", $p, $year, $seq);
    }

    /**
     * Atomically generate unique package code
     */
    public static function generatePackageCode(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'PACKAGE' AND year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO billing_tariff_counters (counter_type, year, last_number) VALUES ('PACKAGE', ?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE billing_tariff_counters SET last_number = ? WHERE counter_type = 'PACKAGE' AND year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("PKG-%04d-%04d", $year, $seq);
    }

    /**
     * List tariffs with search, filter, and pagination
     */
    public function listTariffs(array $filters): array
    {
        $pdo = Database::connection();

        $page = max(1, (int)($filters['page'] ?? 1));
        $perPage = max(1, min(100, (int)($filters['per_page'] ?? 20)));
        $offset = ($page - 1) * $perPage;

        $where = ["1=1"];
        $params = [];

        if (!empty($filters['category']) && $filters['category'] !== 'all') {
            $where[] = "t.category = ?";
            $params[] = $filters['category'];
        }

        if (isset($filters['is_active']) && $filters['is_active'] !== 'all' && $filters['is_active'] !== '') {
            $where[] = "t.is_active = ?";
            $params[] = (int)$filters['is_active'];
        }

        if (!empty($filters['department_id']) && $filters['department_id'] !== 'all') {
            $where[] = "t.department_id = ?";
            $params[] = (int)$filters['department_id'];
        }

        if (!empty($filters['q'])) {
            $q = '%' . trim($filters['q']) . '%';
            $where[] = "(
                t.tariff_code LIKE ? OR
                t.service_name LIKE ? OR
                t.cpt_hcpcs_code LIKE ? OR
                t.description LIKE ?
            )";
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
        }

        $whereSql = implode(" AND ", $where);

        $countSql = "SELECT COUNT(*) FROM billing_tariff_master t WHERE {$whereSql}";
        $cStmt = $pdo->prepare($countSql);
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $dataSql = "
            SELECT
                t.*,
                d.name AS department_name
            FROM billing_tariff_master t
            LEFT JOIN departments d ON d.id = t.department_id
            WHERE {$whereSql}
            ORDER BY t.category ASC, t.service_name ASC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $dStmt = $pdo->prepare($dataSql);
        $dStmt->execute($params);
        $rows = $dStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'data' => $rows,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => (int)ceil($total / $perPage)
        ];
    }

    /**
     * Get single tariff detail
     */
    public function getTariffDetail(int $id): ?array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("
            SELECT
                t.*,
                d.name AS department_name
            FROM billing_tariff_master t
            LEFT JOIN departments d ON d.id = t.department_id
            WHERE t.id = ?
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    /**
     * Create a new Tariff Book Entry
     */
    public function createTariff(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $serviceName = trim($data['service_name'] ?? '');
        $category = trim($data['category'] ?? 'bedside_procedure');
        $billingUnit = trim($data['billing_unit'] ?? 'per_procedure');
        $price = round(max(0.0, (float)($data['standard_price'] ?? 0.0)), 2);
        $emrSur = round(max(0.0, (float)($data['emergency_surcharge_pct'] ?? 0.0)), 2);
        $nightSur = round(max(0.0, (float)($data['night_diff_surcharge_pct'] ?? 0.0)), 2);
        $holSur = round(max(0.0, (float)($data['holiday_surcharge_pct'] ?? 0.0)), 2);
        $taxable = !empty($data['taxability_flag']) ? 1 : 0;
        $taxRate = $taxable ? round(max(0.0, (float)($data['tax_rate_pct'] ?? 12.0)), 2) : 0.00;
        $hmoCovered = isset($data['hmo_covered_flag']) ? (int)$data['hmo_covered_flag'] : 1;
        $hmoReimb = isset($data['hmo_standard_reimbursement']) && $data['hmo_standard_reimbursement'] !== ''
            ? (float)$data['hmo_standard_reimbursement']
            : null;
        $cpt = !empty($data['cpt_hcpcs_code']) ? trim($data['cpt_hcpcs_code']) : null;
        $desc = !empty($data['description']) ? trim($data['description']) : null;
        $deptId = !empty($data['department_id']) ? (int)$data['department_id'] : null;

        if (empty($serviceName)) {
            throw new RuntimeException("Service Name is required.");
        }

        $code = !empty($data['tariff_code']) ? trim($data['tariff_code']) : self::generateTariffCode($pdo, $category);

        $ins = $pdo->prepare("
            INSERT INTO billing_tariff_master (
                tariff_code, service_name, category, department_id, billing_unit,
                standard_price, emergency_surcharge_pct, night_diff_surcharge_pct,
                holiday_surcharge_pct, taxability_flag, tax_rate_pct, hmo_covered_flag,
                hmo_standard_reimbursement, cpt_hcpcs_code, description, is_active,
                created_by
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, 1,
                ?
            )
        ");

        $ins->execute([
            $code,
            $serviceName,
            $category,
            $deptId,
            $billingUnit,
            $price,
            $emrSur,
            $nightSur,
            $holSur,
            $taxable,
            $taxRate,
            $hmoCovered,
            $hmoReimb,
            $cpt,
            $desc,
            $userId
        ]);

        $newId = (int)$pdo->lastInsertId();
        return $this->getTariffDetail($newId);
    }

    /**
     * Update an existing Tariff Book Entry
     */
    public function updateTariff(int $id, array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("SELECT * FROM billing_tariff_master WHERE id = ?");
        $stmt->execute([$id]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$existing) {
            throw new RuntimeException("Tariff entry #{$id} not found.");
        }

        $serviceName = trim($data['service_name'] ?? $existing['service_name']);
        $category = trim($data['category'] ?? $existing['category']);
        $billingUnit = trim($data['billing_unit'] ?? $existing['billing_unit']);
        $price = isset($data['standard_price']) ? round(max(0.0, (float)$data['standard_price']), 2) : (float)$existing['standard_price'];
        $emrSur = isset($data['emergency_surcharge_pct']) ? (float)$data['emergency_surcharge_pct'] : (float)$existing['emergency_surcharge_pct'];
        $nightSur = isset($data['night_diff_surcharge_pct']) ? (float)$data['night_diff_surcharge_pct'] : (float)$existing['night_diff_surcharge_pct'];
        $holSur = isset($data['holiday_surcharge_pct']) ? (float)$data['holiday_surcharge_pct'] : (float)$existing['holiday_surcharge_pct'];
        $taxable = isset($data['taxability_flag']) ? ((int)$data['taxability_flag'] ? 1 : 0) : (int)$existing['taxability_flag'];
        $taxRate = $taxable ? (isset($data['tax_rate_pct']) ? (float)$data['tax_rate_pct'] : (float)$existing['tax_rate_pct']) : 0.00;
        $hmoCovered = isset($data['hmo_covered_flag']) ? (int)$data['hmo_covered_flag'] : (int)$existing['hmo_covered_flag'];
        $hmoReimb = isset($data['hmo_standard_reimbursement']) && $data['hmo_standard_reimbursement'] !== ''
            ? (float)$data['hmo_standard_reimbursement']
            : (isset($existing['hmo_standard_reimbursement']) ? (float)$existing['hmo_standard_reimbursement'] : null);
        $cpt = isset($data['cpt_hcpcs_code']) ? trim($data['cpt_hcpcs_code']) : $existing['cpt_hcpcs_code'];
        $desc = isset($data['description']) ? trim($data['description']) : $existing['description'];
        $deptId = isset($data['department_id']) && $data['department_id'] !== '' ? (int)$data['department_id'] : $existing['department_id'];
        $isActive = isset($data['is_active']) ? (int)$data['is_active'] : (int)$existing['is_active'];

        $upd = $pdo->prepare("
            UPDATE billing_tariff_master SET
                service_name = ?,
                category = ?,
                department_id = ?,
                billing_unit = ?,
                standard_price = ?,
                emergency_surcharge_pct = ?,
                night_diff_surcharge_pct = ?,
                holiday_surcharge_pct = ?,
                taxability_flag = ?,
                tax_rate_pct = ?,
                hmo_covered_flag = ?,
                hmo_standard_reimbursement = ?,
                cpt_hcpcs_code = ?,
                description = ?,
                is_active = ?,
                updated_by = ?
            WHERE id = ?
        ");

        $upd->execute([
            $serviceName,
            $category,
            $deptId,
            $billingUnit,
            $price,
            $emrSur,
            $nightSur,
            $holSur,
            $taxable,
            $taxRate,
            $hmoCovered,
            $hmoReimb,
            $cpt,
            $desc,
            $isActive,
            $userId,
            $id
        ]);

        return $this->getTariffDetail($id);
    }

    /**
     * Surcharge & Tax Dynamic Calculation Engine
     */
    public function calculatePriceWithSurcharges(
        int $tariffId,
        bool $isEmergency = false,
        bool $isNight = false,
        bool $isHoliday = false,
        int $quantity = 1
    ): array {
        $tariff = $this->getTariffDetail($tariffId);
        if (!$tariff) {
            throw new RuntimeException("Tariff #{$tariffId} not found.");
        }

        $base = (float)$tariff['standard_price'];
        $qty = max(1, $quantity);

        $emrRate = $isEmergency ? (float)$tariff['emergency_surcharge_pct'] : 0.0;
        $nightRate = $isNight ? (float)$tariff['night_diff_surcharge_pct'] : 0.0;
        $holRate = $isHoliday ? (float)$tariff['holiday_surcharge_pct'] : 0.0;

        $emrAmount = round(($base * ($emrRate / 100.0)) * $qty, 2);
        $nightAmount = round(($base * ($nightRate / 100.0)) * $qty, 2);
        $holAmount = round(($base * ($holRate / 100.0)) * $qty, 2);

        $subtotal = round(($base * $qty) + $emrAmount + $nightAmount + $holAmount, 2);

        $taxAmount = 0.00;
        if (!empty($tariff['taxability_flag']) && (float)$tariff['tax_rate_pct'] > 0) {
            $taxAmount = round($subtotal * ((float)$tariff['tax_rate_pct'] / 100.0), 2);
        }

        $total = round($subtotal + $taxAmount, 2);

        return [
            'tariff_id' => $tariff['id'],
            'tariff_code' => $tariff['tariff_code'],
            'service_name' => $tariff['service_name'],
            'billing_unit' => $tariff['billing_unit'],
            'quantity' => $qty,
            'unit_price' => $base,
            'base_charges' => round($base * $qty, 2),
            'is_emergency' => $isEmergency,
            'emergency_surcharge_pct' => $emrRate,
            'emergency_surcharge_amount' => $emrAmount,
            'is_night' => $isNight,
            'night_diff_surcharge_pct' => $nightRate,
            'night_diff_surcharge_amount' => $nightAmount,
            'is_holiday' => $isHoliday,
            'holiday_surcharge_pct' => $holRate,
            'holiday_surcharge_amount' => $holAmount,
            'subtotal' => $subtotal,
            'taxable' => (bool)$tariff['taxability_flag'],
            'tax_rate_pct' => (float)$tariff['tax_rate_pct'],
            'tax_amount' => $taxAmount,
            'total_amount' => $total,
            'hmo_covered' => (bool)$tariff['hmo_covered_flag'],
            'hmo_standard_reimbursement' => $tariff['hmo_standard_reimbursement'] ? (float)$tariff['hmo_standard_reimbursement'] : null
        ];
    }

    /**
     * List Service Packages
     */
    public function listServicePackages(array $filters = []): array
    {
        $pdo = Database::connection();

        $sql = "
            SELECT
                p.*,
                d.name AS department_name,
                (SELECT COUNT(*) FROM billing_package_items WHERE package_id = p.id) AS item_count,
                (SELECT SUM(unit_price * quantity) FROM billing_package_items WHERE package_id = p.id) AS component_sum
            FROM billing_service_packages p
            LEFT JOIN departments d ON d.id = p.department_id
            WHERE 1=1
            ORDER BY p.package_name ASC
        ";

        $stmt = $pdo->query($sql);
        $packages = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $packages;
    }

    /**
     * Get Package Detail with Items
     */
    public function getPackageDetail(int $id): ?array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("
            SELECT p.*, d.name AS department_name
            FROM billing_service_packages p
            LEFT JOIN departments d ON d.id = p.department_id
            WHERE p.id = ?
        ");
        $stmt->execute([$id]);
        $pkg = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$pkg) {
            return null;
        }

        $iStmt = $pdo->prepare("
            SELECT pi.*, t.tariff_code, t.category AS tariff_category
            FROM billing_package_items pi
            LEFT JOIN billing_tariff_master t ON t.id = pi.tariff_id
            WHERE pi.package_id = ?
            ORDER BY pi.id ASC
        ");
        $iStmt->execute([$id]);
        $pkg['items'] = $iStmt->fetchAll(PDO::FETCH_ASSOC);

        return $pkg;
    }

    /**
     * Get summary metrics for the Master Tariff Book
     */
    public function getTariffSummaryMetrics(): array
    {
        $pdo = Database::connection();

        $tStmt = $pdo->query("
            SELECT
                COUNT(*) AS total_tariffs,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS count_active,
                AVG(standard_price) AS avg_standard_price,
                SUM(CASE WHEN hmo_covered_flag = 1 THEN 1 ELSE 0 END) AS count_hmo_covered,
                SUM(CASE WHEN taxability_flag = 1 THEN 1 ELSE 0 END) AS count_taxable,
                SUM(CASE WHEN emergency_surcharge_pct > 0 THEN 1 ELSE 0 END) AS count_with_emergency_surcharge
            FROM billing_tariff_master
        ");
        $tRes = $tStmt->fetch(PDO::FETCH_ASSOC);

        $pkgStmt = $pdo->query("SELECT COUNT(*) FROM billing_service_packages WHERE is_active = 1");
        $pkgCount = (int)$pkgStmt->fetchColumn();

        // Group by category
        $catStmt = $pdo->query("
            SELECT category, COUNT(*) AS count_services, AVG(standard_price) AS avg_price
            FROM billing_tariff_master
            GROUP BY category
            ORDER BY count_services DESC
        ");
        $categories = $catStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total_tariffs' => (int)($tRes['total_tariffs'] ?? 0),
            'count_active' => (int)($tRes['count_active'] ?? 0),
            'avg_standard_price' => round((float)($tRes['avg_standard_price'] ?? 0.0), 2),
            'count_hmo_covered' => (int)($tRes['count_hmo_covered'] ?? 0),
            'count_taxable' => (int)($tRes['count_taxable'] ?? 0),
            'count_with_emergency_surcharge' => (int)($tRes['count_with_emergency_surcharge'] ?? 0),
            'count_packages' => $pkgCount,
            'category_breakdown' => $categories
        ];
    }

    /**
     * Seed a comprehensive, authentic institutional Hospital Master Tariff Book
     */
    public function seedHospitalMasterCatalog(): array
    {
        $pdo = Database::connection();

        $checkStmt = $pdo->query("SELECT COUNT(*) FROM billing_tariff_master");
        $existing = (int)$checkStmt->fetchColumn();

        if ($existing >= 15) {
            return [
                'seeded' => 0,
                'message' => "Hospital Master Tariff Book already catalogued {$existing} entries.",
                'summary' => $this->getTariffSummaryMetrics()
            ];
        }

        // Standard Hospital Master Tariff Items
        $tariffs = [
            // Consultations
            [
                'code' => 'TAR-CNS-001',
                'name' => 'General Physician / OPD Consultation',
                'cat' => 'consultation',
                'dept' => 3, // Internal Medicine
                'unit' => 'per_visit',
                'price' => 500.00,
                'emr' => 25.00,
                'night' => 15.00,
                'hol' => 30.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 450.00,
                'cpt' => '99213',
                'desc' => 'Outpatient primary care doctor evaluation and management.'
            ],
            [
                'code' => 'TAR-CNS-002',
                'name' => 'Specialist / Subspecialist Consultation',
                'cat' => 'consultation',
                'dept' => 4, // Cardiology
                'unit' => 'per_visit',
                'price' => 1200.00,
                'emr' => 30.00,
                'night' => 20.00,
                'hol' => 35.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 1000.00,
                'cpt' => '99243',
                'desc' => 'Board-certified specialist consultation (Cardiology, Ortho, Surgery, etc.).'
            ],
            [
                'code' => 'TAR-CNS-003',
                'name' => 'Inpatient Attending Daily Ward Rounds (Per Diem)',
                'cat' => 'consultation',
                'dept' => 3,
                'unit' => 'per_day',
                'price' => 800.00,
                'emr' => 0.00,
                'night' => 0.00,
                'hol' => 20.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 700.00,
                'cpt' => '99232',
                'desc' => 'Daily inpatient medical evaluation, treatment plan adjustments, and progress notes.'
            ],
            [
                'code' => 'TAR-CNS-004',
                'name' => 'Intensive Care Unit (ICU) Critical Care Specialist Management',
                'cat' => 'consultation',
                'dept' => 7, // ICU
                'unit' => 'per_day',
                'price' => 2500.00,
                'emr' => 20.00,
                'night' => 25.00,
                'hol' => 40.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 2200.00,
                'cpt' => '99291',
                'desc' => 'Critical care management of hemodynamically unstable or mechanically ventilated patient.'
            ],

            // Routine Nursing Per Diem
            [
                'code' => 'TAR-NRS-001',
                'name' => 'General Inpatient Ward Routine Nursing Care (Per Diem)',
                'cat' => 'nursing_care',
                'dept' => 1, // Nursing / Admin
                'unit' => 'per_day',
                'price' => 650.00,
                'emr' => 0.00,
                'night' => 10.00,
                'hol' => 20.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 550.00,
                'cpt' => 'REV-0120',
                'desc' => 'Routine 24-hour nursing assessments, e-MAR medication administration, and vital signs monitoring.'
            ],
            [
                'code' => 'TAR-NRS-002',
                'name' => 'ICU Critical Care Specialized Nursing Care (Per Diem)',
                'cat' => 'nursing_care',
                'dept' => 7,
                'unit' => 'per_day',
                'price' => 1800.00,
                'emr' => 15.00,
                'night' => 20.00,
                'hol' => 30.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 1500.00,
                'cpt' => 'REV-0200',
                'desc' => '1:1 or 1:2 intensive nursing care, arterial line / CVP monitoring, inotrope titration.'
            ],
            [
                'code' => 'TAR-NRS-003',
                'name' => 'Inpatient Isolation Barrier Nursing Care (Infection Control)',
                'cat' => 'nursing_care',
                'dept' => 1,
                'unit' => 'per_day',
                'price' => 950.00,
                'emr' => 0.00,
                'night' => 10.00,
                'hol' => 20.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 800.00,
                'cpt' => 'REV-0160',
                'desc' => 'Contact/droplet/airborne precautions, PPE barrier care protocols for communicable disease.'
            ],

            // Bedside Procedures
            [
                'code' => 'TAR-PRC-001',
                'name' => 'Intravenous (IV) Cannulation & Infusion Setup',
                'cat' => 'bedside_procedure',
                'dept' => 1,
                'unit' => 'per_procedure',
                'price' => 350.00,
                'emr' => 20.00,
                'night' => 15.00,
                'hol' => 25.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 300.00,
                'cpt' => '36000',
                'desc' => 'Peripheral IV line placement, sterile dressing, and primary infusion set calibration.'
            ],
            [
                'code' => 'TAR-PRC-002',
                'name' => 'Foley Urethral Catheterization (Insertion & Closed Drainage)',
                'cat' => 'bedside_procedure',
                'dept' => 1,
                'unit' => 'per_procedure',
                'price' => 600.00,
                'emr' => 25.00,
                'night' => 20.00,
                'hol' => 30.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 500.00,
                'cpt' => '51702',
                'desc' => 'Aseptic insertion of indwelling Foley urinary catheter with urometer drainage bag.'
            ],
            [
                'code' => 'TAR-PRC-003',
                'name' => '12-Lead Electrocardiogram (ECG) with Physician Reading',
                'cat' => 'bedside_procedure',
                'dept' => 4,
                'unit' => 'per_test',
                'price' => 450.00,
                'emr' => 30.00,
                'night' => 20.00,
                'hol' => 35.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 400.00,
                'cpt' => '93000',
                'desc' => 'Diagnostic 12-lead cardiac ECG tracing and certified cardiologist interpretation.'
            ],
            [
                'code' => 'TAR-PRC-004',
                'name' => 'Complex Sterile Surgical Wound Dressing & Debridement',
                'cat' => 'bedside_procedure',
                'dept' => 6, // Surgery
                'unit' => 'per_procedure',
                'price' => 750.00,
                'emr' => 20.00,
                'night' => 15.00,
                'hol' => 25.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 650.00,
                'cpt' => '97597',
                'desc' => 'Wound assessment, non-excisional debridement, antimicrobial packing, sterile barrier wrap.'
            ],
            [
                'code' => 'TAR-PRC-005',
                'name' => 'Nebulization Therapy Session (Medication Inhalation)',
                'cat' => 'bedside_procedure',
                'dept' => 3,
                'unit' => 'per_session',
                'price' => 200.00,
                'emr' => 15.00,
                'night' => 15.00,
                'hol' => 20.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 180.00,
                'cpt' => '94640',
                'desc' => 'Ultrasonic or jet aerosol bronchodilator inhalation delivery with respiratory vitals.'
            ],

            // Operating Theater & Anesthesia
            [
                'code' => 'TAR-SUR-001',
                'name' => 'Operating Theater Room Fee (Major Surgery - First 2 Hours)',
                'cat' => 'operating_theater',
                'dept' => 6,
                'unit' => 'per_procedure',
                'price' => 8500.00,
                'emr' => 35.00,
                'night' => 25.00,
                'hol' => 50.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 7500.00,
                'cpt' => 'REV-0360',
                'desc' => 'Laminar airflow surgical suite, anesthesia workstation, sterile drape sets, and scrub nursing.'
            ],
            [
                'code' => 'TAR-SUR-002',
                'name' => 'Operating Theater Additional Time (Per 30 Minutes)',
                'cat' => 'operating_theater',
                'dept' => 6,
                'unit' => 'per_hour',
                'price' => 1500.00,
                'emr' => 35.00,
                'night' => 25.00,
                'hol' => 50.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 1300.00,
                'cpt' => 'REV-0361',
                'desc' => 'Extended surgical room minutes beyond base 2-hour window.'
            ],
            [
                'code' => 'TAR-SUR-003',
                'name' => 'Post-Anesthesia Care Unit (PACU / Recovery Room)',
                'cat' => 'operating_theater',
                'dept' => 6,
                'unit' => 'per_hour',
                'price' => 950.00,
                'emr' => 20.00,
                'night' => 20.00,
                'hol' => 30.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 850.00,
                'cpt' => 'REV-0710',
                'desc' => 'Immediate post-operative hemodynamic monitoring, airway management, and pain titration.'
            ],

            // Emergency Department Specifics
            [
                'code' => 'TAR-EMR-001',
                'name' => 'Emergency Room Facility Fee (Level 4 High-Complexity Care)',
                'cat' => 'emergency_service',
                'dept' => 2, // Emergency
                'unit' => 'per_visit',
                'price' => 1600.00,
                'emr' => 20.00,
                'night' => 20.00,
                'hol' => 30.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 1400.00,
                'cpt' => '99284',
                'desc' => 'Acute resuscitation bay facility charge, triage priority 1 or 2 with multi-organ evaluation.'
            ],
            [
                'code' => 'TAR-EMR-002',
                'name' => 'Cardiopulmonary Resuscitation (CPR) & Defibrillation Team',
                'cat' => 'emergency_service',
                'dept' => 2,
                'unit' => 'per_procedure',
                'price' => 3200.00,
                'emr' => 0.00,
                'night' => 0.00,
                'hol' => 0.00,
                'tax' => 0,
                'hmo' => 1,
                'reimb' => 2800.00,
                'cpt' => '92950',
                'desc' => 'Emergency Code Blue medical resuscitation response, synchronized cardioversion / defibrillation.'
            ]
        ];

        $insCount = 0;
        foreach ($tariffs as $t) {
            $ins = $pdo->prepare("
                INSERT INTO billing_tariff_master (
                    tariff_code, service_name, category, department_id, billing_unit,
                    standard_price, emergency_surcharge_pct, night_diff_surcharge_pct,
                    holiday_surcharge_pct, taxability_flag, tax_rate_pct, hmo_covered_flag,
                    hmo_standard_reimbursement, cpt_hcpcs_code, description, is_active
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, 0.00, ?,
                    ?, ?, ?, 1
                )
            ");
            $ins->execute([
                $t['code'],
                $t['name'],
                $t['cat'],
                $t['dept'],
                $t['unit'],
                $t['price'],
                $t['emr'],
                $t['night'],
                $t['hol'],
                $t['tax'],
                $t['hmo'],
                $t['reimb'],
                $t['cpt'],
                $t['desc']
            ]);
            $insCount++;
        }

        // Seed Sample Service Packages
        $packages = [
            [
                'code' => 'PKG-MAT-001',
                'name' => 'Normal Spontaneous Delivery (NSD) Maternity Package',
                'type' => 'maternity_delivery',
                'dept' => 10, // OB/GYN
                'price' => 28000.00,
                'disc' => 24500.00,
                'days' => 2,
                'room' => 'Semi-Private Room',
                'desc' => 'Comprehensive 2-day delivery package covering OB delivery, nursery care, routine newborn vaccines, and postpartum care.',
                'inc' => '2 days semi-private room, labor room & delivery suite fees, OB attending fee, routine medications, newborn screening & Hep B / BCG vaccines.',
                'exc' => 'Cesarean conversion, neonatal intensive care (NICU), phototherapy, blood transfusion.',
                'items' => [
                    ['code' => 'TAR-ROM-001', 'name' => 'Semi-Private Room & Board (2 Days)', 'price' => 3000.00, 'qty' => 2],
                    ['code' => 'TAR-SUR-001', 'name' => 'Delivery Room Facility & Equipment', 'price' => 7500.00, 'qty' => 1],
                    ['code' => 'TAR-CNS-001', 'name' => 'Attending Obstetrician Delivery Care', 'price' => 9000.00, 'qty' => 1],
                    ['code' => 'TAR-NRS-001', 'name' => 'Postpartum Routine Nursing Care (2 Days)', 'price' => 1300.00, 'qty' => 2],
                    ['code' => 'TAR-PRC-001', 'name' => 'Newborn Care & Initial Physical Assessment', 'price' => 3700.00, 'qty' => 1]
                ]
            ],
            [
                'code' => 'PKG-SUR-001',
                'name' => 'Laparoscopic Cholecystectomy Surgical Package',
                'type' => 'surgical_procedure',
                'dept' => 6, // Surgery
                'price' => 65000.00,
                'disc' => 58000.00,
                'days' => 3,
                'room' => 'Private Room',
                'desc' => 'Minimally invasive gallbladder removal package inclusive of pre-op routine labs, laparoscopic instrument trays, and surgeon/anesthesia fees.',
                'inc' => '3 days private room, operating suite, laparoscopic camera tower, general anesthesia, surgical attending & assist fees, routine post-op analgesia.',
                'exc' => 'Open conversion, blood transfusion, ICU transfer, specialized non-formulary antibiotics.',
                'items' => [
                    ['code' => 'TAR-ROM-002', 'name' => 'Private Room & Board (3 Days)', 'price' => 6000.00, 'qty' => 3],
                    ['code' => 'TAR-SUR-001', 'name' => 'Operating Theater Suite & Laparoscopic Tower', 'price' => 16500.00, 'qty' => 1],
                    ['code' => 'TAR-CNS-002', 'name' => 'Surgical Attending & Assistant Fee', 'price' => 24000.00, 'qty' => 1],
                    ['code' => 'TAR-SUR-003', 'name' => 'PACU Recovery Monitoring', 'price' => 1900.00, 'qty' => 1],
                    ['code' => 'TAR-NRS-001', 'name' => 'Inpatient Nursing Care (3 Days)', 'price' => 1950.00, 'qty' => 3]
                ]
            ],
            [
                'code' => 'PKG-EXC-001',
                'name' => 'Comprehensive Executive Health Screening Checkup',
                'type' => 'executive_checkup',
                'dept' => 3,
                'price' => 12500.00,
                'disc' => 9999.00,
                'days' => 0,
                'room' => 'Outpatient Wellness Lounge',
                'desc' => 'Same-day executive wellness package including complete blood count, comprehensive metabolic panel, lipid profile, chest X-ray, 12-lead ECG, abdominal ultrasound, and physician report.',
                'inc' => 'CBC, Lipid Profile, Liver & Kidney Function Tests, Fasting Blood Glucose, HbA1c, 12-Lead ECG, Chest X-Ray, Abdominal Ultrasound, Physician Consult.',
                'exc' => 'Further specialty diagnostic imaging (CT/MRI), biopsy procedures, cardiac stress echo.',
                'items' => [
                    ['code' => 'TAR-CNS-002', 'name' => 'Internal Medicine Specialist Wellness Exam', 'price' => 1200.00, 'qty' => 1],
                    ['code' => 'TAR-PRC-003', 'name' => '12-Lead Electrocardiogram (ECG)', 'price' => 450.00, 'qty' => 1],
                    ['code' => 'TAR-LAB-001', 'name' => 'Comprehensive Metabolic & Lipid Blood Panel', 'price' => 3800.00, 'qty' => 1],
                    ['code' => 'TAR-RAD-001', 'name' => 'Chest Radiograph & Abdominal Sonogram', 'price' => 4500.00, 'qty' => 1]
                ]
            ]
        ];

        foreach ($packages as $pkg) {
            $pIns = $pdo->prepare("
                INSERT INTO billing_service_packages (
                    package_code, package_name, package_type, department_id,
                    standard_package_price, discounted_price, included_bed_days,
                    included_room_type, description, inclusions_summary,
                    exclusions_summary, is_active
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, 1
                )
            ");
            $pIns->execute([
                $pkg['code'],
                $pkg['name'],
                $pkg['type'],
                $pkg['dept'],
                $pkg['price'],
                $pkg['disc'],
                $pkg['days'],
                $pkg['room'],
                $pkg['desc'],
                $pkg['inc'],
                $pkg['exc']
            ]);
            $pkgId = (int)$pdo->lastInsertId();

            foreach ($pkg['items'] as $item) {
                $iIns = $pdo->prepare("
                    INSERT INTO billing_package_items (
                        package_id, item_code, item_name, quantity, unit_price, covered_amount
                    ) VALUES (?, ?, ?, ?, ?, ?)
                ");
                $iIns->execute([
                    $pkgId,
                    $item['code'],
                    $item['name'],
                    $item['qty'],
                    $item['price'],
                    $item['price']
                ]);
            }
        }

        return [
            'seeded' => $insCount,
            'packages_seeded' => count($packages),
            'message' => "Successfully seeded {$insCount} hospital master tariff items and " . count($packages) . " bundled service packages.",
            'summary' => $this->getTariffSummaryMetrics()
        ];
    }
}
