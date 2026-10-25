<?php

namespace App\Modules\TariffMaster\Services;

use App\Core\Database;
use App\Modules\InpatientBilling\Services\InpatientFolioService;
use PDO;
use RuntimeException;

class PackageOverageService
{
    /**
     * Atomically generate unique package enrollment number PEN-YYYY-XXXXX
     */
    public static function generateEnrollmentNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'PACKAGE_ENROLLMENT' AND year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO billing_tariff_counters (counter_type, year, last_number) VALUES ('PACKAGE_ENROLLMENT', ?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE billing_tariff_counters SET last_number = ? WHERE counter_type = 'PACKAGE_ENROLLMENT' AND year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("PEN-%04d-%05d", $year, $seq);
    }

    /**
     * Enroll a patient into a Bundled Health or Surgical Service Package
     */
    public function enrollPatient(array $data, ?int $userId = null, ?string $userName = null): array
    {
        $pdo = Database::connection();

        $packageId = (int)($data['package_id'] ?? 0);
        $patientId = (int)($data['patient_id'] ?? 0);
        $admissionId = !empty($data['admission_id']) ? (int)$data['admission_id'] : null;
        $folioId = !empty($data['folio_id']) ? (int)$data['folio_id'] : null;
        $notes = !empty($data['notes']) ? trim($data['notes']) : null;
        $officer = $userName ?: 'Admissions / Billing Officer';

        if ($packageId <= 0 || $patientId <= 0) {
            throw new RuntimeException("Valid Package ID and Patient ID are required.");
        }

        // Fetch package definition
        $pStmt = $pdo->prepare("SELECT * FROM billing_service_packages WHERE id = ?");
        $pStmt->execute([$packageId]);
        $pkg = $pStmt->fetch(PDO::FETCH_ASSOC);

        if (!$pkg) {
            throw new RuntimeException("Service package #{$packageId} not found.");
        }

        $basePrice = (float)($pkg['discounted_price'] > 0 ? $pkg['discounted_price'] : $pkg['standard_package_price']);

        $pdo->beginTransaction();
        try {
            $enrollNo = self::generateEnrollmentNumber($pdo);

            $ins = $pdo->prepare("
                INSERT INTO billing_package_enrollments (
                    enrollment_number, package_id, patient_id, admission_id, folio_id,
                    enrolled_date, base_package_price,
                    actual_bed_days, included_bed_days, overage_bed_days, overage_bed_amount,
                    actual_or_minutes, included_or_minutes, overage_or_minutes, overage_or_amount,
                    actual_meds_charges, included_meds_allowance, overage_meds_amount,
                    actual_labs_charges, included_labs_allowance, overage_labs_amount,
                    other_addons_amount, total_overage_amount, final_total_package_bill,
                    status, settlement_status, notes, enrolled_by, enrolled_by_name
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    NOW(), ?,
                    1, ?, 0, 0.00,
                    0, ?, 0, 0.00,
                    0.00, ?, 0.00,
                    0.00, ?, 0.00,
                    0.00, 0.00, ?,
                    'active', 'unbilled', ?, ?, ?
                )
            ");

            $ins->execute([
                $enrollNo,
                $packageId,
                $patientId,
                $admissionId,
                $folioId,
                $basePrice,
                (int)$pkg['included_bed_days'],
                (int)$pkg['included_or_minutes'],
                (float)$pkg['included_meds_allowance'],
                (float)$pkg['included_lab_allowance'],
                $basePrice,
                $notes,
                $userId,
                $officer
            ]);

            $newId = (int)$pdo->lastInsertId();

            $pdo->commit();
            return $this->getEnrollmentDetail($newId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw new RuntimeException("Failed to enroll patient in package: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Automated Overage Calculation Engine
     * Evaluates room stay, OR minutes, medication allowances, and lab allowances against package limits
     */
    public function calculateOverages(int $enrollmentId, ?array $actuals = null): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("
            SELECT e.*, p.overage_room_daily_rate, p.overage_or_hourly_rate,
                   p.overage_nursing_daily_rate, p.package_name, p.package_code
            FROM billing_package_enrollments e
            JOIN billing_service_packages p ON p.id = e.package_id
            WHERE e.id = ?
        ");
        $stmt->execute([$enrollmentId]);
        $enr = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$enr) {
            throw new RuntimeException("Package enrollment #{$enrollmentId} not found.");
        }

        // Merge actual usage inputs (or keep current values in enrollment)
        $actualDays = isset($actuals['actual_bed_days']) ? max(1, (int)$actuals['actual_bed_days']) : (int)$enr['actual_bed_days'];
        $actualOrMins = isset($actuals['actual_or_minutes']) ? max(0, (int)$actuals['actual_or_minutes']) : (int)$enr['actual_or_minutes'];
        $actualMeds = isset($actuals['actual_meds_charges']) ? round(max(0.0, (float)$actuals['actual_meds_charges']), 2) : (float)$enr['actual_meds_charges'];
        $actualLabs = isset($actuals['actual_labs_charges']) ? round(max(0.0, (float)$actuals['actual_labs_charges']), 2) : (float)$enr['actual_labs_charges'];
        $otherAddons = isset($actuals['other_addons_amount']) ? round(max(0.0, (float)$actuals['other_addons_amount']), 2) : (float)$enr['other_addons_amount'];

        $incDays = (int)$enr['included_bed_days'];
        $incOrMins = (int)$enr['included_or_minutes'];
        $incMeds = (float)$enr['included_meds_allowance'];
        $incLabs = (float)$enr['included_labs_allowance'];

        $roomRate = (float)$enr['overage_room_daily_rate'];
        $nursingRate = (float)$enr['overage_nursing_daily_rate'];
        $orRate = (float)$enr['overage_or_hourly_rate'];

        // 1. Bed Stay Overage Calculation
        $overageDays = max(0, $actualDays - $incDays);
        $overageBedAmount = round($overageDays * ($roomRate + $nursingRate), 2);

        // 2. OR Time Overage Calculation
        $overageOrMins = max(0, $actualOrMins - $incOrMins);
        $overageOrHours = $overageOrMins > 0 ? (int)ceil($overageOrMins / 60) : 0;
        $overageOrAmount = round($overageOrHours * $orRate, 2);

        // 3. Medications Allowance Overage
        $overageMedsAmount = round(max(0.0, $actualMeds - $incMeds), 2);

        // 4. Diagnostic Lab Allowance Overage
        $overageLabsAmount = round(max(0.0, $actualLabs - $incLabs), 2);

        // Total Overages & Final Package Bill
        $totalOverage = round($overageBedAmount + $overageOrAmount + $overageMedsAmount + $overageLabsAmount + $otherAddons, 2);
        $finalBill = round((float)$enr['base_package_price'] + $totalOverage, 2);

        $pdo->beginTransaction();
        try {
            // Update enrollment ledger
            $upd = $pdo->prepare("
                UPDATE billing_package_enrollments SET
                    actual_bed_days = ?,
                    overage_bed_days = ?,
                    overage_bed_amount = ?,
                    actual_or_minutes = ?,
                    overage_or_minutes = ?,
                    overage_or_amount = ?,
                    actual_meds_charges = ?,
                    overage_meds_amount = ?,
                    actual_labs_charges = ?,
                    overage_labs_amount = ?,
                    other_addons_amount = ?,
                    total_overage_amount = ?,
                    final_total_package_bill = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");

            $upd->execute([
                $actualDays,
                $overageDays,
                $overageBedAmount,
                $actualOrMins,
                $overageOrMins,
                $overageOrAmount,
                $actualMeds,
                $overageMedsAmount,
                $actualLabs,
                $overageLabsAmount,
                $otherAddons,
                $totalOverage,
                $finalBill,
                $enrollmentId
            ]);

            // Rebuild itemized overage lines for clear patient statement
            $delItems = $pdo->prepare("DELETE FROM billing_package_overage_items WHERE enrollment_id = ?");
            $delItems->execute([$enrollmentId]);

            $insItem = $pdo->prepare("
                INSERT INTO billing_package_overage_items (
                    enrollment_id, overage_type, item_description,
                    included_limit, actual_usage, excess_units,
                    unit_rate, total_overage_charge, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");

            if ($overageDays > 0) {
                $insItem->execute([
                    $enrollmentId,
                    'bed_days',
                    "Extra Inpatient Bed Days & Nursing Care ({$overageDays} day" . ($overageDays == 1 ? '' : 's') . ")",
                    "{$incDays} Days Included",
                    "{$actualDays} Days Total Stay",
                    $overageDays,
                    $roomRate + $nursingRate,
                    $overageBedAmount,
                    "Room daily rate ($" . number_format($roomRate, 2) . ") + Nursing per diem ($" . number_format($nursingRate, 2) . ")"
                ]);
            }

            if ($overageOrMins > 0) {
                $insItem->execute([
                    $enrollmentId,
                    'operating_room_time',
                    "Excess Operating Room Suite Time ({$overageOrMins} mins / {$overageOrHours} hr" . ($overageOrHours == 1 ? '' : 's') . ")",
                    "{$incOrMins} Mins Included",
                    "{$actualOrMins} Mins Total Surgery",
                    $overageOrHours,
                    $orRate,
                    $overageOrAmount,
                    "Billed per hour or fraction beyond package allowance ($" . number_format($orRate, 2) . "/hr)"
                ]);
            }

            if ($overageMedsAmount > 0) {
                $insItem->execute([
                    $enrollmentId,
                    'medications',
                    "Pharmacy Medications Exceeding Package Allowance",
                    "$" . number_format($incMeds, 2) . " Formulary Allowance",
                    "$" . number_format($actualMeds, 2) . " Total Dispensed",
                    $overageMedsAmount,
                    1.00,
                    $overageMedsAmount,
                    "Non-formulary or extra medications exceeding included package allowance"
                ]);
            }

            if ($overageLabsAmount > 0) {
                $insItem->execute([
                    $enrollmentId,
                    'laboratory',
                    "Diagnostic Laboratory Tests Exceeding Package Allowance",
                    "$" . number_format($incLabs, 2) . " Routine Lab Allowance",
                    "$" . number_format($actualLabs, 2) . " Total Tests",
                    $overageLabsAmount,
                    1.00,
                    $overageLabsAmount,
                    "Additional pathology or special diagnostic panels beyond package scope"
                ]);
            }

            if ($otherAddons > 0) {
                $insItem->execute([
                    $enrollmentId,
                    'other_procedure',
                    "Specialized Hospital Add-ons / Complication Procedures",
                    "Excluded from Package",
                    "Add-on Provided",
                    1.00,
                    $otherAddons,
                    $otherAddons,
                    "Additional unbundled procedures or specialist consultations"
                ]);
            }

            $pdo->commit();
            return $this->getEnrollmentDetail($enrollmentId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw new RuntimeException("Failed to calculate overage: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Auto-sync actual consumption from Admission & Master Folio
     */
    public function syncEnrollmentFromAdmission(int $enrollmentId): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("SELECT * FROM billing_package_enrollments WHERE id = ?");
        $stmt->execute([$enrollmentId]);
        $enr = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$enr) {
            throw new RuntimeException("Enrollment #{$enrollmentId} not found.");
        }

        $admissionId = (int)$enr['admission_id'];
        $folioId = (int)$enr['folio_id'];

        $actualDays = (int)$enr['actual_bed_days'];
        $actualOrMins = (int)$enr['actual_or_minutes'];
        $actualMeds = (float)$enr['actual_meds_charges'];
        $actualLabs = (float)$enr['actual_labs_charges'];

        // If admission exists, calculate days from admitted_at to now/discharged_at
        if ($admissionId > 0) {
            $aStmt = $pdo->prepare("
                SELECT
                    admitted_at,
                    COALESCE(discharged_at, NOW()) AS end_date,
                    GREATEST(1, DATEDIFF(COALESCE(discharged_at, NOW()), admitted_at)) AS calculated_days
                FROM inpatient_admissions WHERE id = ?
            ");
            $aStmt->execute([$admissionId]);
            $adm = $aStmt->fetch(PDO::FETCH_ASSOC);
            if ($adm && !empty($adm['calculated_days'])) {
                $actualDays = (int)$adm['calculated_days'];
            }

            // Check actual OR minutes from surgery requests if exists
            $orStmt = $pdo->prepare("
                SELECT SUM(COALESCE(actual_duration_minutes, estimated_duration_minutes, 0)) AS total_mins
                FROM surgery_requests
                WHERE admission_id = ?
            ");
            $orStmt->execute([$admissionId]);
            $orMins = $orStmt->fetchColumn();
            if ($orMins !== false && (int)$orMins > 0) {
                $actualOrMins = (int)$orMins;
            }
        }

        // If folio exists, pull actual pharmacy and lab totals
        if ($folioId > 0) {
            $fStmt = $pdo->prepare("SELECT total_pharmacy, total_laboratory FROM billing_inpatient_folios WHERE id = ?");
            $fStmt->execute([$folioId]);
            $fol = $fStmt->fetch(PDO::FETCH_ASSOC);
            if ($fol) {
                if ((float)$fol['total_pharmacy'] > 0) {
                    $actualMeds = (float)$fol['total_pharmacy'];
                }
                if ((float)$fol['total_laboratory'] > 0) {
                    $actualLabs = (float)$fol['total_laboratory'];
                }
            }
        }

        return $this->calculateOverages($enrollmentId, [
            'actual_bed_days' => $actualDays,
            'actual_or_minutes' => $actualOrMins,
            'actual_meds_charges' => $actualMeds,
            'actual_labs_charges' => $actualLabs
        ]);
    }

    /**
     * Post package base fee + itemized overages to Master Inpatient Folio
     */
    public function postToFolio(int $enrollmentId, ?int $targetFolioId = null, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("
            SELECT e.*, p.package_name, p.package_code
            FROM billing_package_enrollments e
            JOIN billing_service_packages p ON p.id = e.package_id
            WHERE e.id = ?
        ");
        $stmt->execute([$enrollmentId]);
        $enr = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$enr) {
            throw new RuntimeException("Enrollment #{$enrollmentId} not found.");
        }

        $folioId = $targetFolioId ?: (int)$enr['folio_id'];
        if ($folioId <= 0) {
            throw new RuntimeException("Target Master Folio ID is required to post package charges.");
        }

        $pdo->beginTransaction();
        try {
            // 1. Post Base Package Fee
            $insBase = $pdo->prepare("
                INSERT INTO billing_folio_line_items (
                    folio_id, charge_category, source_table, source_id,
                    item_code, item_description, service_date, quantity,
                    unit_price, gross_amount, discount_amount, net_amount,
                    is_covered_by_insurance, performer_name, status, notes, created_by
                ) VALUES (
                    ?, 'supplies_misc', 'billing_package_enrollments', ?,
                    ?, ?, CURRENT_DATE(), 1.00,
                    ?, ?, 0.00, ?,
                    1, 'Hospital Package Desk', 'billed', 'Bundled Health & Surgical Package', ?
                )
            ");
            $basePrice = (float)$enr['base_package_price'];
            $insBase->execute([
                $folioId,
                $enrollmentId,
                $enr['package_code'],
                "BUNDLED PACKAGE: {$enr['package_name']} ({$enr['enrollment_number']})",
                $basePrice,
                $basePrice,
                $basePrice,
                $userId
            ]);

            // 2. Post itemized overage charges if any
            $oStmt = $pdo->prepare("SELECT * FROM billing_package_overage_items WHERE enrollment_id = ?");
            $oStmt->execute([$enrollmentId]);
            $overages = $oStmt->fetchAll(PDO::FETCH_ASSOC);

            $catMap = [
                'bed_days' => 'accommodation',
                'operating_room_time' => 'operating_theater',
                'medications' => 'pharmacy',
                'laboratory' => 'laboratory',
                'other_procedure' => 'doctor_fees'
            ];

            foreach ($overages as $ov) {
                $cat = $catMap[$ov['overage_type']] ?? 'supplies_misc';
                $amt = (float)$ov['total_overage_charge'];
                if ($amt <= 0) continue;

                $insOv = $pdo->prepare("
                    INSERT INTO billing_folio_line_items (
                        folio_id, charge_category, source_table, source_id,
                        item_code, item_description, service_date, quantity,
                        unit_price, gross_amount, discount_amount, net_amount,
                        is_covered_by_insurance, performer_name, status, notes, created_by
                    ) VALUES (
                        ?, ?, 'billing_package_overage_items', ?,
                        ?, ?, CURRENT_DATE(), 1.00,
                        ?, ?, 0.00, ?,
                        1, 'Hospital Package Desk', 'billed', ?, ?
                    )
                ");

                $code = "OVG-" . strtoupper(substr($ov['overage_type'], 0, 3));
                $insOv->execute([
                    $folioId,
                    $cat,
                    (int)$ov['id'],
                    $code,
                    "PACKAGE OVERAGE: {$ov['item_description']}",
                    $amt,
                    $amt,
                    $amt,
                    $ov['notes'],
                    $userId
                ]);
            }

            // Update enrollment status
            $updEnr = $pdo->prepare("
                UPDATE billing_package_enrollments SET
                    folio_id = ?,
                    settlement_status = 'billed_to_folio',
                    status = 'completed'
                WHERE id = ?
            ");
            $updEnr->execute([$folioId, $enrollmentId]);

            // Recalculate Folio
            InpatientFolioService::recalculateFolioFinancials($pdo, $folioId);

            $pdo->commit();
            return $this->getEnrollmentDetail($enrollmentId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw new RuntimeException("Failed to post package charges to folio: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Get single package enrollment detail with all overage items
     */
    public function getEnrollmentDetail(int $id): ?array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("
            SELECT
                e.*,
                p.package_name,
                p.package_code,
                p.package_type,
                p.included_room_type,
                p.overage_room_daily_rate,
                p.overage_or_hourly_rate,
                p.overage_nursing_daily_rate,
                CONCAT(pt.first_name, ' ', pt.last_name) AS patient_name,
                pt.patient_no,
                pt.birthdate,
                pt.sex,
                f.folio_number,
                f.balance_due AS folio_balance
            FROM billing_package_enrollments e
            JOIN billing_service_packages p ON p.id = e.package_id
            JOIN patients pt ON pt.id = e.patient_id
            LEFT JOIN billing_inpatient_folios f ON f.id = e.folio_id
            WHERE e.id = ?
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $oStmt = $pdo->prepare("
            SELECT * FROM billing_package_overage_items
            WHERE enrollment_id = ?
            ORDER BY id ASC
        ");
        $oStmt->execute([$id]);
        $row['overage_items'] = $oStmt->fetchAll(PDO::FETCH_ASSOC);

        return $row;
    }

    /**
     * List patient package enrollments with search & filters
     */
    public function listEnrollments(array $filters): array
    {
        $pdo = Database::connection();

        $page = max(1, (int)($filters['page'] ?? 1));
        $perPage = max(1, min(100, (int)($filters['per_page'] ?? 15)));
        $offset = ($page - 1) * $perPage;

        $where = ["1=1"];
        $params = [];

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $where[] = "e.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['package_id']) && $filters['package_id'] !== 'all') {
            $where[] = "e.package_id = ?";
            $params[] = (int)$filters['package_id'];
        }

        if (!empty($filters['patient_id'])) {
            $where[] = "e.patient_id = ?";
            $params[] = (int)$filters['patient_id'];
        }

        if (!empty($filters['q'])) {
            $q = '%' . trim($filters['q']) . '%';
            $where[] = "(
                e.enrollment_number LIKE ? OR
                p.package_name LIKE ? OR
                p.package_code LIKE ? OR
                pt.patient_no LIKE ? OR
                pt.first_name LIKE ? OR
                pt.last_name LIKE ? OR
                CONCAT(pt.first_name, ' ', pt.last_name) LIKE ?
            )";
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
        }

        $whereSql = implode(" AND ", $where);

        $countSql = "
            SELECT COUNT(*)
            FROM billing_package_enrollments e
            JOIN billing_service_packages p ON p.id = e.package_id
            JOIN patients pt ON pt.id = e.patient_id
            WHERE {$whereSql}
        ";
        $cStmt = $pdo->prepare($countSql);
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $dataSql = "
            SELECT
                e.*,
                p.package_name,
                p.package_code,
                p.package_type,
                CONCAT(pt.first_name, ' ', pt.last_name) AS patient_name,
                pt.patient_no,
                f.folio_number
            FROM billing_package_enrollments e
            JOIN billing_service_packages p ON p.id = e.package_id
            JOIN patients pt ON pt.id = e.patient_id
            LEFT JOIN billing_inpatient_folios f ON f.id = e.folio_id
            WHERE {$whereSql}
            ORDER BY e.id DESC
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
     * Get Executive KPI Metrics for Bundled Packages & Overages
     */
    public function getEnrollmentSummaryMetrics(): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->query("
            SELECT
                COUNT(*) AS total_enrollments,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS count_active,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS count_completed,
                SUM(base_package_price) AS total_base_revenue,
                SUM(total_overage_amount) AS total_overage_revenue,
                SUM(final_total_package_bill) AS total_package_revenue,
                AVG(CASE WHEN total_overage_amount > 0 THEN total_overage_amount ELSE NULL END) AS avg_overage_when_exceeded,
                SUM(CASE WHEN total_overage_amount > 0 THEN 1 ELSE 0 END) AS count_with_overage
            FROM billing_package_enrollments
        ");
        $res = $stmt->fetch(PDO::FETCH_ASSOC);

        $tot = (int)($res['total_enrollments'] ?? 0);
        $withOv = (int)($res['count_with_overage'] ?? 0);
        $ovPct = $tot > 0 ? round(($withOv / $tot) * 100, 1) : 0.0;

        return [
            'total_enrollments' => $tot,
            'count_active' => (int)($res['count_active'] ?? 0),
            'count_completed' => (int)($res['count_completed'] ?? 0),
            'total_base_revenue' => (float)($res['total_base_revenue'] ?? 0.0),
            'total_overage_revenue' => (float)($res['total_overage_revenue'] ?? 0.0),
            'total_package_revenue' => (float)($res['total_package_revenue'] ?? 0.0),
            'avg_overage' => round((float)($res['avg_overage_when_exceeded'] ?? 0.0), 2),
            'overage_incident_rate' => $ovPct
        ];
    }

    /**
     * Seed realistic patient package enrollments with calculated overages for demonstration
     */
    public function seedRealisticEnrollmentDemo(): array
    {
        $pdo = Database::connection();

        $cntStmt = $pdo->query("SELECT COUNT(*) FROM billing_package_enrollments");
        $existing = (int)$cntStmt->fetchColumn();

        if ($existing >= 3) {
            return [
                'seeded' => 0,
                'message' => "Package enrollments already contain {$existing} records.",
                'summary' => $this->getEnrollmentSummaryMetrics()
            ];
        }

        // Get Packages
        $pStmt = $pdo->query("SELECT id, package_code FROM billing_service_packages ORDER BY id ASC");
        $packages = $pStmt->fetchAll(PDO::FETCH_KEY_PAIR); // id => code
        $codeToId = array_flip($packages); // code => id

        // Get Patients
        $patStmt = $pdo->query("SELECT id FROM patients ORDER BY id ASC LIMIT 5");
        $patIds = $patStmt->fetchAll(PDO::FETCH_COLUMN);
        if (empty($patIds)) {
            $patIds = [42];
        }

        $seeded = 0;

        // Case 1: Normal Delivery with 1 Bed Day Overage and $85 Meds Overage
        $nsdId = $codeToId['PKG-MAT-001'] ?? null;
        if ($nsdId && isset($patIds[0])) {
            $enr1 = $this->enrollPatient([
                'package_id' => $nsdId,
                'patient_id' => $patIds[0],
                'notes' => 'Maternity admission: Patient stayed 1 extra day for observation of mild newborn jaundice.'
            ], 1, 'OB Admissions Clerk');

            // Actuals: 3 days stay (1 extra), 90 mins OR/delivery, $485 meds ($85 over allowance)
            $this->calculateOverages($enr1['id'], [
                'actual_bed_days' => 3,
                'actual_or_minutes' => 90,
                'actual_meds_charges' => 485.00,
                'actual_labs_charges' => 250.00
            ]);
            $seeded++;
        }

        // Case 2: Laparoscopic Cholecystectomy with 45 mins OR Overage and $220 Meds Overage
        $lapId = $codeToId['PKG-SUR-001'] ?? null;
        if ($lapId && isset($patIds[1])) {
            $enr2 = $this->enrollPatient([
                'package_id' => $lapId,
                'patient_id' => $patIds[1],
                'notes' => 'Elective cholecystectomy: Extensive adhesions required extra 45 surgical minutes.'
            ], 1, 'Surgical Admissions Desk');

            // Actuals: 3 days stay (within 3 days), 165 mins OR (45 mins extra -> 1 hr overage), $1020 meds ($220 over allowance)
            $this->calculateOverages($enr2['id'], [
                'actual_bed_days' => 3,
                'actual_or_minutes' => 165,
                'actual_meds_charges' => 1020.00,
                'actual_labs_charges' => 450.00
            ]);
            $seeded++;
        }

        // Case 3: C-Section Package on track with 0 Overage
        $csecId = $codeToId['PKG-MAT-002'] ?? null;
        if ($csecId && isset($patIds[2])) {
            $enr3 = $this->enrollPatient([
                'package_id' => $csecId,
                'patient_id' => $patIds[2],
                'notes' => 'Scheduled repeat C-section delivery: Uneventful recovery within 3 days.'
            ], 1, 'OB Admissions Clerk');

            // Actuals: 3 days stay, 110 mins OR (within 120), $850 meds (within 1000)
            $this->calculateOverages($enr3['id'], [
                'actual_bed_days' => 3,
                'actual_or_minutes' => 110,
                'actual_meds_charges' => 850.00,
                'actual_labs_charges' => 480.00
            ]);
            $seeded++;
        }

        return [
            'seeded' => $seeded,
            'message' => "Successfully seeded {$seeded} authentic patient package enrollments with automated overages.",
            'summary' => $this->getEnrollmentSummaryMetrics()
        ];
    }
}
