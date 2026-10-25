<?php

namespace App\Modules\InpatientBilling\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

class InpatientFolioService
{
    /**
     * Hospital Currency Symbol from business_settings
     */
    public static function currencySymbol(): string
    {
        static $symbol = null;
        if ($symbol === null) {
            try {
                $symbol = (string)(Database::connection()->query("SELECT currency_symbol FROM business_settings LIMIT 1")->fetchColumn() ?: '₱');
            } catch (\Throwable $e) {
                $symbol = '₱';
            }
        }
        return $symbol;
    }

    /**
     * Atomically generate sequential Inpatient Folio Number: FOL-YYYY-XXXXX
     */
    public static function generateFolioNumber(PDO $pdo, ?int $year = null): string
    {
        $year = $year ?: (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_seq FROM billing_folio_counters WHERE prefix_year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO billing_folio_counters (prefix_year, last_seq) VALUES (?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE billing_folio_counters SET last_seq = ? WHERE prefix_year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("FOL-%04d-%05d", $year, $seq);
    }

    /**
     * Atomically generate sequential Official Receipt Number: OR-YYYY-XXXXX
     */
    public static function generateReceiptNumber(PDO $pdo, ?int $year = null): string
    {
        $year = $year ?: (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_seq FROM billing_receipt_counters WHERE prefix_year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO billing_receipt_counters (prefix_year, last_seq) VALUES (?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE billing_receipt_counters SET last_seq = ? WHERE prefix_year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("OR-%04d-%05d", $year, $seq);
    }

    /**
     * Retrieve or create a Master Inpatient Folio for an Admission
     */
    public function getOrCreateFolioForAdmission(int $admissionId, ?int $userId = null): array
    {
        $pdo = Database::connection();

        // Check if folio already exists
        $stmt = $pdo->prepare("SELECT id FROM billing_inpatient_folios WHERE admission_id = ?");
        $stmt->execute([$admissionId]);
        $existingId = $stmt->fetchColumn();

        if ($existingId) {
            // Synchronize charges and return detail
            return $this->syncAndConsolidateFolio((int)$existingId);
        }

        // Fetch admission details
        $admStmt = $pdo->prepare("
            SELECT ia.*,
                   p.patient_no,
                   p.first_name,
                   p.last_name,
                   p.birthdate,
                   p.sex,
                   hb.bed_number,
                   hb.room_number,
                   hb.bed_type,
                   hb.daily_rate,
                   hw.ward_name,
                   hw.ward_code
            FROM inpatient_admissions ia
            LEFT JOIN patients p ON ia.patient_id = p.id
            LEFT JOIN hospital_beds hb ON ia.bed_id = hb.id
            LEFT JOIN hospital_wards hw ON ia.ward_id = hw.id
            WHERE ia.id = ?
        ");
        $admStmt->execute([$admissionId]);
        $adm = $admStmt->fetch(PDO::FETCH_ASSOC);

        if (!$adm) {
            throw new RuntimeException("Inpatient admission #{$admissionId} not found.");
        }

        $patientId = (int)($adm['patient_id'] ?: 0);
        if ($patientId <= 0) {
            throw new RuntimeException("Admission has no valid associated patient.");
        }

        $roomBedLabel = ($adm['ward_name'] ?: 'Ward') . ' · Room ' . ($adm['room_number'] ?: 'N/A') . ' · Bed ' . ($adm['bed_number'] ?: 'N/A');
        $attending = $adm['attending_physician'] ?: 'Attending Staff Physician';

        $pdo->beginTransaction();
        try {
            $folioNumber = self::generateFolioNumber($pdo);
            $admittedAt = $adm['admission_date'];
            $dischargedAt = $adm['discharge_date'] ?: null;

            $ins = $pdo->prepare("
                INSERT INTO billing_inpatient_folios (
                    folio_number, admission_id, patient_id, status,
                    admitted_at, discharged_at, room_bed_label, attending_physician,
                    created_by, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, 'open',
                    ?, ?, ?, ?,
                    ?, NOW(), NOW()
                )
            ");
            $ins->execute([
                $folioNumber,
                $admissionId,
                $patientId,
                $admittedAt,
                $dischargedAt,
                $roomBedLabel,
                $attending,
                $userId
            ]);

            $folioId = (int)$pdo->lastInsertId();
            $pdo->commit();

            // Run initial charge consolidation
            return $this->syncAndConsolidateFolio($folioId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Synchronize and Consolidate all inpatient charges into the Master Folio statement
     * Aggregates:
     *   1. Accommodation: Bed days x daily room rate
     *   2. Doctor Fees: Daily ward rounds and specialist visits
     *   3. Operating Theater: Surgery room time, anesthesia, instrument trays
     *   4. Diagnostics: Laboratory, pathology, and radiology imaging
     *   5. Pharmacy: Inpatient e-MAR doses and pharmacy dispenses
     */
    public function syncAndConsolidateFolio(int $folioId): array
    {
        $pdo = Database::connection();

        $folioStmt = $pdo->prepare("
            SELECT f.*,
                   ia.admission_number,
                   ia.admission_date,
                   ia.discharge_date,
                   ia.bed_id,
                   ia.ward_id,
                   hb.bed_type,
                   hb.room_number,
                   hb.bed_number,
                   hb.daily_rate,
                   hw.ward_name
            FROM billing_inpatient_folios f
            JOIN inpatient_admissions ia ON f.admission_id = ia.id
            LEFT JOIN hospital_beds hb ON ia.bed_id = hb.id
            LEFT JOIN hospital_wards hw ON ia.ward_id = hw.id
            WHERE f.id = ?
        ");
        $folioStmt->execute([$folioId]);
        $folio = $folioStmt->fetch(PDO::FETCH_ASSOC);

        if (!$folio) {
            throw new RuntimeException("Inpatient folio #{$folioId} not found.");
        }

        $admissionId = (int)$folio['admission_id'];
        $patientId = (int)$folio['patient_id'];
        $admitDate = $folio['admission_date'];
        $dischDate = $folio['discharge_date'] ?: date('Y-m-d H:i:s');
        $currency = self::currencySymbol();

        $pdo->beginTransaction();
        try {
            // ---------------------------------------------------------
            // 1. ACCOMMODATION (Bed days x daily room rate)
            // ---------------------------------------------------------
            $admitTime = strtotime($admitDate);
            $endTime = strtotime($dischDate);
            $hours = max(1, ($endTime - $admitTime) / 3600);
            $bedDays = max(1.0, round($hours / 24, 2));

            $dailyRate = (float)($folio['daily_rate'] ?: 1200.00);
            $accomTotal = round($bedDays * $dailyRate, 2);

            $bedLabel = ($folio['ward_name'] ?: 'Ward') . ' · ' . ($folio['room_number'] ?: 'Room') . ' · ' . ($folio['bed_number'] ?: 'Bed');
            $bedDesc = "Room & Board: {$folio['bed_type']} ({$bedLabel}) — " . number_format($bedDays, 1) . " day(s) @ {$currency}" . number_format($dailyRate, 2) . "/day";

            // Check if accommodation line item already exists
            $checkAccom = $pdo->prepare("SELECT id FROM billing_folio_line_items WHERE folio_id = ? AND charge_category = 'accommodation' AND source_table = 'hospital_beds'");
            $checkAccom->execute([$folioId]);
            $accomItemId = $checkAccom->fetchColumn();

            if ($accomItemId) {
                $updAccom = $pdo->prepare("
                    UPDATE billing_folio_line_items
                    SET item_description = ?,
                        service_date = ?,
                        quantity = ?,
                        unit_price = ?,
                        gross_amount = ?,
                        net_amount = ?,
                        updated_at = NOW()
                    WHERE id = ?
                ");
                $updAccom->execute([$bedDesc, substr($admitDate, 0, 10), $bedDays, $dailyRate, $accomTotal, $accomTotal, $accomItemId]);
            } else {
                $insAccom = $pdo->prepare("
                    INSERT INTO billing_folio_line_items (
                        folio_id, charge_category, source_table, source_id, item_code,
                        item_description, service_date, quantity, unit_price,
                        gross_amount, discount_amount, net_amount, status, created_at, updated_at
                    ) VALUES (
                        ?, 'accommodation', 'hospital_beds', ?, 'ACCOM-BED',
                        ?, ?, ?, ?,
                        ?, 0.00, ?, 'billed', NOW(), NOW()
                    )
                ");
                $insAccom->execute([$folioId, $folio['bed_id'], $bedDesc, substr($admitDate, 0, 10), $bedDays, $dailyRate, $accomTotal, $accomTotal]);
            }

            // Update bed_days in folio header
            $pdo->prepare("UPDATE billing_inpatient_folios SET bed_days = ? WHERE id = ?")->execute([$bedDays, $folioId]);

            // ---------------------------------------------------------
            // 2. DOCTOR FEES (Attending Physician & Daily Ward Rounds)
            // ---------------------------------------------------------
            $roundsStmt = $pdo->prepare("
                SELECT id, round_number, round_datetime, rounding_physician_name, clinical_trajectory
                FROM inpatient_daily_rounds
                WHERE admission_id = ? AND deleted_at IS NULL
                ORDER BY round_datetime ASC
            ");
            $roundsStmt->execute([$admissionId]);
            $rounds = $roundsStmt->fetchAll(PDO::FETCH_ASSOC);

            if (!empty($rounds)) {
                // If daily round notes exist, ensure a line item for each
                foreach ($rounds as $rnd) {
                    $chkRnd = $pdo->prepare("SELECT id FROM billing_folio_line_items WHERE folio_id = ? AND source_table = 'inpatient_daily_rounds' AND source_id = ?");
                    $chkRnd->execute([$folioId, $rnd['id']]);
                    if (!$chkRnd->fetchColumn()) {
                        $rndFee = 1200.00;
                        $desc = "Physician Daily Ward Round: {$rnd['rounding_physician_name']} ({$rnd['clinical_trajectory']} Status)";
                        $insRnd = $pdo->prepare("
                            INSERT INTO billing_folio_line_items (
                                folio_id, charge_category, source_table, source_id, item_code,
                                item_description, service_date, quantity, unit_price,
                                gross_amount, discount_amount, net_amount, performer_name, status, created_at, updated_at
                            ) VALUES (
                                ?, 'doctor_fees', 'inpatient_daily_rounds', ?, 'DOC-ROUND',
                                ?, ?, 1.000, ?,
                                ?, 0.00, ?, ?, 'billed', NOW(), NOW()
                            )
                        ");
                        $insRnd->execute([
                            $folioId, $rnd['id'], $desc, substr($rnd['round_datetime'], 0, 10),
                            $rndFee, $rndFee, $rndFee, $rnd['rounding_physician_name']
                        ]);
                    }
                }
            } else {
                // Check if standard attending doctor fee is already billed
                $chkAtt = $pdo->prepare("SELECT id FROM billing_folio_line_items WHERE folio_id = ? AND charge_category = 'doctor_fees' AND item_code = 'DOC-ATTENDING'");
                $chkAtt->execute([$folioId]);
                $attId = $chkAtt->fetchColumn();

                $doctorDays = ceil($bedDays);
                $roundRate = 1200.00;
                $docGross = round($doctorDays * $roundRate, 2);
                $attDoctor = $folio['attending_physician'] ?: 'Attending Physician';
                $attDesc = "Attending Physician Daily Clinical Care: {$attDoctor} — {$doctorDays} day(s) @ {$currency}" . number_format($roundRate, 2) . "/day";

                if ($attId) {
                    $pdo->prepare("UPDATE billing_folio_line_items SET quantity = ?, unit_price = ?, gross_amount = ?, net_amount = ?, item_description = ? WHERE id = ?")
                        ->execute([$doctorDays, $roundRate, $docGross, $docGross, $attDesc, $attId]);
                } else {
                    $insAtt = $pdo->prepare("
                        INSERT INTO billing_folio_line_items (
                            folio_id, charge_category, source_table, source_id, item_code,
                            item_description, service_date, quantity, unit_price,
                            gross_amount, discount_amount, net_amount, performer_name, status, created_at, updated_at
                        ) VALUES (
                            ?, 'doctor_fees', 'inpatient_admissions', ?, 'DOC-ATTENDING',
                            ?, ?, ?, ?,
                            ?, 0.00, ?, ?, 'billed', NOW(), NOW()
                        )
                    ");
                    $insAtt->execute([
                        $folioId, $admissionId, $attDesc, substr($admitDate, 0, 10),
                        $doctorDays, $roundRate, $docGross, $docGross, $attDoctor
                    ]);
                }
            }

            // ---------------------------------------------------------
            // 3. OPERATING THEATER (OR minutes, anesthesia, instrument trays)
            // ---------------------------------------------------------
            $orStmt = $pdo->prepare("
                SELECT ch.*, c.case_number, c.procedure_performed, c.lead_surgeon
                FROM or_charges ch
                JOIN or_surgical_cases c ON c.id = ch.case_id
                WHERE (c.admission_id = ? OR ch.patient_id = ?) AND ch.status = 'charged'
                ORDER BY ch.charge_date ASC, ch.id ASC
            ");
            $orStmt->execute([$admissionId, $patientId]);
            $orCharges = $orStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($orCharges as $ch) {
                $chkOr = $pdo->prepare("SELECT id FROM billing_folio_line_items WHERE folio_id = ? AND source_table = 'or_charges' AND source_id = ?");
                $chkOr->execute([$folioId, $ch['id']]);
                if (!$chkOr->fetchColumn()) {
                    $insOr = $pdo->prepare("
                        INSERT INTO billing_folio_line_items (
                            folio_id, charge_category, source_table, source_id, item_code,
                            item_description, service_date, quantity, unit_price,
                            gross_amount, discount_amount, net_amount, performer_name, status, created_at, updated_at
                        ) VALUES (
                            ?, 'operating_theater', 'or_charges', ?, ?,
                            ?, ?, ?, ?,
                            ?, ?, ?, ?, 'billed', NOW(), NOW()
                        )
                    ");
                    $itemCode = 'OR-' . strtoupper($ch['charge_type'] ?: 'SVC');
                    $insOr->execute([
                        $folioId, $ch['id'], $itemCode,
                        $ch['description'] . " [Case {$ch['case_number']}]",
                        $ch['charge_date'],
                        $ch['quantity'] ?: 1.0,
                        $ch['unit_price'] ?: $ch['gross_amount'],
                        $ch['gross_amount'],
                        $ch['discount_amount'],
                        $ch['net_amount'],
                        $ch['lead_surgeon']
                    ]);
                }
            }

            // ---------------------------------------------------------
            // 4. DIAGNOSTICS: LABORATORY & PATHOLOGY
            // ---------------------------------------------------------
            $labStmt = $pdo->prepare("
                SELECT ch.*, r.request_no
                FROM lab_charges ch
                LEFT JOIN lab_requests r ON r.id = ch.request_id
                WHERE ch.patient_id = ? AND ch.status = 'charged'
                ORDER BY ch.charge_date ASC, ch.id ASC
            ");
            $labStmt->execute([$patientId]);
            $labCharges = $labStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($labCharges as $ch) {
                $chkLab = $pdo->prepare("SELECT id FROM billing_folio_line_items WHERE folio_id = ? AND source_table = 'lab_charges' AND source_id = ?");
                $chkLab->execute([$folioId, $ch['id']]);
                if (!$chkLab->fetchColumn()) {
                    $insLab = $pdo->prepare("
                        INSERT INTO billing_folio_line_items (
                            folio_id, charge_category, source_table, source_id, item_code,
                            item_description, service_date, quantity, unit_price,
                            gross_amount, discount_amount, net_amount, status, created_at, updated_at
                        ) VALUES (
                            ?, 'laboratory', 'lab_charges', ?, 'LAB-TEST',
                            ?, ?, ?, ?,
                            ?, ?, ?, 'billed', NOW(), NOW()
                        )
                    ");
                    $insLab->execute([
                        $folioId, $ch['id'],
                        "Lab: " . ($ch['test_name'] ?: $ch['description']),
                        $ch['charge_date'],
                        $ch['quantity'] ?: 1.0,
                        $ch['unit_price'] ?: $ch['gross_amount'],
                        $ch['gross_amount'],
                        $ch['discount_amount'],
                        $ch['net_amount']
                    ]);
                }
            }

            // ---------------------------------------------------------
            // 5. DIAGNOSTICS: RADIOLOGY & IMAGING
            // ---------------------------------------------------------
            $radStmt = $pdo->prepare("
                SELECT ch.*, r.request_no
                FROM rad_charges ch
                LEFT JOIN rad_requests r ON r.id = ch.request_id
                WHERE ch.patient_id = ? AND ch.status = 'charged'
                ORDER BY ch.charge_date ASC, ch.id ASC
            ");
            $radStmt->execute([$patientId]);
            $radCharges = $radStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($radCharges as $ch) {
                $chkRad = $pdo->prepare("SELECT id FROM billing_folio_line_items WHERE folio_id = ? AND source_table = 'rad_charges' AND source_id = ?");
                $chkRad->execute([$folioId, $ch['id']]);
                if (!$chkRad->fetchColumn()) {
                    $insRad = $pdo->prepare("
                        INSERT INTO billing_folio_line_items (
                            folio_id, charge_category, source_table, source_id, item_code,
                            item_description, service_date, quantity, unit_price,
                            gross_amount, discount_amount, net_amount, status, created_at, updated_at
                        ) VALUES (
                            ?, 'radiology', 'rad_charges', ?, 'RAD-SCAN',
                            ?, ?, ?, ?,
                            ?, ?, ?, 'billed', NOW(), NOW()
                        )
                    ");
                    $insRad->execute([
                        $folioId, $ch['id'],
                        "Imaging: " . ($ch['study_name'] ?: $ch['description']),
                        $ch['charge_date'],
                        $ch['quantity'] ?: 1.0,
                        $ch['unit_price'] ?: $ch['gross_amount'],
                        $ch['gross_amount'],
                        $ch['discount_amount'],
                        $ch['net_amount']
                    ]);
                }
            }

            // ---------------------------------------------------------
            // 6. PHARMACY: INPATIENT e-MAR & MEDICATION DISPENSES
            // ---------------------------------------------------------
            // Inpatient MAR:
            $emarStmt = $pdo->prepare("
                SELECT ch.*
                FROM inpatient_med_charges ch
                WHERE (ch.admission_id = ? OR ch.patient_id = ?) AND ch.status = 'charged'
                ORDER BY ch.charge_date ASC, ch.id ASC
            ");
            $emarStmt->execute([$admissionId, $patientId]);
            $emarCharges = $emarStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($emarCharges as $ch) {
                $chkEmar = $pdo->prepare("SELECT id FROM billing_folio_line_items WHERE folio_id = ? AND source_table = 'inpatient_med_charges' AND source_id = ?");
                $chkEmar->execute([$folioId, $ch['id']]);
                if (!$chkEmar->fetchColumn()) {
                    $insEmar = $pdo->prepare("
                        INSERT INTO billing_folio_line_items (
                            folio_id, charge_category, source_table, source_id, item_code,
                            item_description, service_date, quantity, unit_price,
                            gross_amount, discount_amount, net_amount, status, created_at, updated_at
                        ) VALUES (
                            ?, 'pharmacy', 'inpatient_med_charges', ?, 'EMAR-MED',
                            ?, ?, ?, ?,
                            ?, ?, ?, 'billed', NOW(), NOW()
                        )
                    ");
                    $insEmar->execute([
                        $folioId, $ch['id'],
                        "e-MAR Dose: " . $ch['description'],
                        $ch['charge_date'],
                        $ch['quantity'] ?: 1.0,
                        $ch['unit_price'] ?: $ch['gross_amount'],
                        $ch['gross_amount'],
                        $ch['discount_amount'],
                        $ch['net_amount']
                    ]);
                }
            }

            // Outpatient / Take-home pharmacy dispenses during admission:
            $pharmStmt = $pdo->prepare("
                SELECT ch.*, d.dispense_number
                FROM pharmacy_charges ch
                JOIN prescription_dispenses d ON d.id = ch.dispense_id
                WHERE ch.patient_id = ? AND ch.status = 'charged'
                ORDER BY ch.charge_date ASC, ch.id ASC
            ");
            $pharmStmt->execute([$patientId]);
            $pharmCharges = $pharmStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($pharmCharges as $ch) {
                $chkPharm = $pdo->prepare("SELECT id FROM billing_folio_line_items WHERE folio_id = ? AND source_table = 'pharmacy_charges' AND source_id = ?");
                $chkPharm->execute([$folioId, $ch['id']]);
                if (!$chkPharm->fetchColumn()) {
                    $insPharm = $pdo->prepare("
                        INSERT INTO billing_folio_line_items (
                            folio_id, charge_category, source_table, source_id, item_code,
                            item_description, service_date, quantity, unit_price,
                            gross_amount, discount_amount, net_amount, status, created_at, updated_at
                        ) VALUES (
                            ?, 'pharmacy', 'pharmacy_charges', ?, 'PHARM-MED',
                            ?, ?, ?, ?,
                            ?, ?, ?, 'billed', NOW(), NOW()
                        )
                    ");
                    $insPharm->execute([
                        $folioId, $ch['id'],
                        "Pharmacy: " . $ch['description'] . " ({$ch['dispense_number']})",
                        $ch['charge_date'],
                        $ch['quantity'] ?: 1.0,
                        $ch['unit_price'] ?: $ch['gross_amount'],
                        $ch['gross_amount'],
                        $ch['discount_amount'],
                        $ch['net_amount']
                    ]);
                }
            }

            // ---------------------------------------------------------
            // 7. RECOMPUTE FINANCIAL TOTALS & REAL-TIME BALANCE
            // ---------------------------------------------------------
            $this->recalculateFolioFinancials($pdo, $folioId);

            $pdo->commit();
            return $this->getFolioDetail($folioId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Recalculate Subtotals, Discounts, Insurance Coverage, Payments, and Real-Time Balance
     */
    public function recalculateFolioFinancials(PDO $pdo, int $folioId): void
    {
        // Category Subtotals
        $subStmt = $pdo->prepare("
            SELECT charge_category,
                   SUM(gross_amount) AS total_gross,
                   SUM(discount_amount) AS total_discount,
                   SUM(net_amount) AS total_net
            FROM billing_folio_line_items
            WHERE folio_id = ? AND status = 'billed'
            GROUP BY charge_category
        ");
        $subStmt->execute([$folioId]);
        $subtotals = $subStmt->fetchAll(PDO::FETCH_ASSOC);

        $totAccom = 0.00;
        $totDoc = 0.00;
        $totOr = 0.00;
        $totLab = 0.00;
        $totRad = 0.00;
        $totPharm = 0.00;
        $totSupplies = 0.00;
        $grossTotal = 0.00;
        $lineItemDiscounts = 0.00;

        foreach ($subtotals as $st) {
            $cat = $st['charge_category'];
            $g = (float)$st['total_gross'];
            $d = (float)$st['total_discount'];
            $grossTotal += $g;
            $lineItemDiscounts += $d;

            if ($cat === 'accommodation') $totAccom += $g;
            elseif ($cat === 'doctor_fees') $totDoc += $g;
            elseif ($cat === 'operating_theater') $totOr += $g;
            elseif ($cat === 'laboratory') $totLab += $g;
            elseif ($cat === 'radiology') $totRad += $g;
            elseif ($cat === 'pharmacy') $totPharm += $g;
            elseif ($cat === 'supplies_misc') $totSupplies += $g;
        }

        // Fetch folio-level discounts & insurance coverage
        $fStmt = $pdo->prepare("SELECT discount_amount, insurance_covered_amount FROM billing_inpatient_folios WHERE id = ?");
        $fStmt->execute([$folioId]);
        $curFolio = $fStmt->fetch(PDO::FETCH_ASSOC);

        $folioDiscount = (float)($curFolio['discount_amount'] ?? 0);
        $totalDiscount = round($lineItemDiscounts + $folioDiscount, 2);
        $insuranceCovered = (float)($curFolio['insurance_covered_amount'] ?? 0);

        $netAmount = max(0.00, round($grossTotal - $totalDiscount - $insuranceCovered, 2));

        // Payments sum
        $payStmt = $pdo->prepare("
            SELECT COALESCE(SUM(amount), 0)
            FROM billing_folio_payments
            WHERE folio_id = ? AND status = 'valid'
        ");
        $payStmt->execute([$folioId]);
        $paidAmount = round((float)$payStmt->fetchColumn(), 2);

        $balanceDue = max(0.00, round($netAmount - $paidAmount, 2));

        // Update billing_inpatient_folios
        $upd = $pdo->prepare("
            UPDATE billing_inpatient_folios
            SET total_accommodation = ?,
                total_doctor_fees = ?,
                total_operating_theater = ?,
                total_laboratory = ?,
                total_radiology = ?,
                total_pharmacy = ?,
                total_supplies_misc = ?,
                gross_amount = ?,
                net_amount = ?,
                paid_amount = ?,
                balance_due = ?,
                status = CASE 
                    WHEN ? = 1 THEN 'closed'
                    WHEN ? <= 0 AND gross_amount > 0 THEN 'for_billing_clearance'
                    ELSE status 
                END,
                updated_at = NOW()
            WHERE id = ?
        ");
        $upd->execute([
            $totAccom,
            $totDoc,
            $totOr,
            $totLab,
            $totRad,
            $totPharm,
            $totSupplies,
            $grossTotal,
            $netAmount,
            $paidAmount,
            $balanceDue,
            ($balanceDue <= 0 && $paidAmount > 0) ? 1 : 0,
            $balanceDue,
            $folioId
        ]);
    }

    /**
     * Add a Manual Line Item to the Folio (e.g. Special Nursing, Consumables, Oxygen, Ambulance)
     */
    public function addManualLineItem(int $folioId, array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $cat = trim($data['charge_category'] ?? 'supplies_misc');
        $desc = trim($data['item_description'] ?? '');
        $qty = max(0.001, (float)($data['quantity'] ?? 1.0));
        $unitPrice = max(0.0, (float)($data['unit_price'] ?? 0.0));
        $discount = max(0.0, (float)($data['discount_amount'] ?? 0.0));
        $serviceDate = !empty($data['service_date']) ? $data['service_date'] : date('Y-m-d');
        $itemCode = !empty($data['item_code']) ? trim($data['item_code']) : 'MISC';
        $performer = !empty($data['performer_name']) ? trim($data['performer_name']) : null;

        if (empty($desc)) {
            throw new RuntimeException("Charge description is required.");
        }

        $gross = round($qty * $unitPrice, 2);
        $net = max(0.0, round($gross - $discount, 2));

        $ins = $pdo->prepare("
            INSERT INTO billing_folio_line_items (
                folio_id, charge_category, source_table, item_code,
                item_description, service_date, quantity, unit_price,
                gross_amount, discount_amount, net_amount, performer_name,
                status, notes, created_by, created_at, updated_at
            ) VALUES (
                ?, ?, 'manual', ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                'billed', ?, ?, NOW(), NOW()
            )
        ");
        $ins->execute([
            $folioId, $cat, $itemCode,
            $desc, $serviceDate, $qty, $unitPrice,
            $gross, $discount, $net, $performer,
            $data['notes'] ?? null, $userId
        ]);

        $this->recalculateFolioFinancials($pdo, $folioId);
        return $this->getFolioDetail($folioId);
    }

    /**
     * Void a Line Item on the Folio
     */
    public function voidLineItem(int $itemId, ?string $reason = null): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("SELECT folio_id FROM billing_folio_line_items WHERE id = ?");
        $stmt->execute([$itemId]);
        $folioId = (int)$stmt->fetchColumn();

        if ($folioId <= 0) {
            throw new RuntimeException("Folio line item #{$itemId} not found.");
        }

        $upd = $pdo->prepare("UPDATE billing_folio_line_items SET status = 'voided', notes = CONCAT(COALESCE(notes,''), ' [VOIDED: ', ?, ']'), updated_at = NOW() WHERE id = ?");
        $upd->execute([$reason ?: 'Voided by billing staff', $itemId]);

        $this->recalculateFolioFinancials($pdo, $folioId);
        return $this->getFolioDetail($folioId);
    }

    /**
     * Apply Senior Citizen / PWD Discounts & PhilHealth / HMO Insurance Coverage
     */
    public function applyDiscountAndInsurance(int $folioId, array $data): array
    {
        $pdo = Database::connection();
        $discountType = !empty($data['discount_type']) ? trim($data['discount_type']) : null;
        $discountAmount = max(0.0, (float)($data['discount_amount'] ?? 0.0));
        $insuranceCovered = max(0.0, (float)($data['insurance_covered_amount'] ?? 0.0));
        $notes = !empty($data['notes']) ? trim($data['notes']) : null;

        $upd = $pdo->prepare("
            UPDATE billing_inpatient_folios
            SET discount_type = ?,
                discount_amount = ?,
                insurance_covered_amount = ?,
                notes = CASE WHEN ? IS NOT NULL THEN CONCAT(COALESCE(notes,''), ' [', ?, ']') ELSE notes END,
                updated_at = NOW()
            WHERE id = ?
        ");
        $upd->execute([$discountType, $discountAmount, $insuranceCovered, $notes, $notes, $folioId]);

        $this->recalculateFolioFinancials($pdo, $folioId);
        return $this->getFolioDetail($folioId);
    }

    /**
     * Record Cashier Payment / Deposit on the Master Folio
     * Generates official receipt number OR-YYYY-XXXXX and updates real-time balance
     */
    public function recordFolioPayment(int $folioId, array $data, ?int $userId = null, ?string $cashierName = null): array
    {
        $pdo = Database::connection();
        $amount = (float)($data['amount'] ?? 0.0);
        $method = trim($data['payment_method'] ?? 'cash');
        $payerType = trim($data['payer_type'] ?? 'patient');
        $refNo = !empty($data['reference_no']) ? trim($data['reference_no']) : null;
        $notes = !empty($data['notes']) ? trim($data['notes']) : null;
        $cashier = $cashierName ?: 'Main Cashier Counter';

        if ($amount <= 0.0) {
            throw new RuntimeException("Payment amount must be greater than zero.");
        }

        $validMethods = ['cash', 'credit_card', 'debit_card', 'check', 'bank_transfer', 'gcash_maya', 'insurance_claim'];
        if (!in_array($method, $validMethods, true)) {
            throw new RuntimeException("Invalid payment method: '{$method}'.");
        }

        $pdo->beginTransaction();
        try {
            $receiptNo = self::generateReceiptNumber($pdo);

            $ins = $pdo->prepare("
                INSERT INTO billing_folio_payments (
                    folio_id, receipt_number, payer_type, payment_method,
                    amount, payment_date, reference_no, cashier_name,
                    cashier_id, notes, status, created_at
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, NOW(), ?, ?,
                    ?, ?, 'valid', NOW()
                )
            ");
            $ins->execute([
                $folioId, $receiptNo, $payerType, $method,
                $amount, $refNo, $cashier,
                $userId, $notes
            ]);

            // Also record in patient_ledger_payments for unified patient ledger history
            $fStmt = $pdo->prepare("SELECT patient_id, admission_id FROM billing_inpatient_folios WHERE id = ?");
            $fStmt->execute([$folioId]);
            $f = $fStmt->fetch(PDO::FETCH_ASSOC);

            if ($f) {
                $insLedger = $pdo->prepare("
                    INSERT INTO patient_ledger_payments (
                        patient_id, payer_type, payment_type, source,
                        reference_no, status, settled_at, payment_date,
                        payment_amount, notes, created_at, created_by
                    ) VALUES (
                        ?, ?, ?, 'counter',
                        ?, 'settled', NOW(), CURDATE(),
                        ?, ?, NOW(), ?
                    )
                ");
                $ledgerNote = "Inpatient Folio Payment [{$receiptNo}] - {$method}";
                if ($notes) $ledgerNote .= " ({$notes})";
                $insLedger->execute([
                    $f['patient_id'],
                    $payerType === 'insurance' ? 'insurance' : 'patient',
                    'INPATIENT_FOLIO',
                    $receiptNo,
                    $amount,
                    $ledgerNote,
                    $userId
                ]);
            }

            // Recalculate folio balance
            $this->recalculateFolioFinancials($pdo, $folioId);

            $pdo->commit();
            return $this->getFolioDetail($folioId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Issue Billing Clearance for Inpatient Discharge
     */
    public function issueBillingClearance(int $folioId, ?string $clearedBy = null, ?string $notes = null): array
    {
        $pdo = Database::connection();

        $fStmt = $pdo->prepare("SELECT balance_due, admission_id FROM billing_inpatient_folios WHERE id = ?");
        $fStmt->execute([$folioId]);
        $f = $fStmt->fetch(PDO::FETCH_ASSOC);

        if (!$f) {
            throw new RuntimeException("Folio #{$folioId} not found.");
        }

        $balance = (float)$f['balance_due'];
        if ($balance > 0.05 && empty($notes)) {
            throw new RuntimeException("Cannot issue billing clearance: Account has an outstanding balance of " . self::currencySymbol() . number_format($balance, 2) . ". Settle balance or provide financial clearance guarantee notes.");
        }

        $clearedByName = $clearedBy ?: 'Chief Cashier & Billing Officer';

        $pdo->beginTransaction();
        try {
            $upd = $pdo->prepare("
                UPDATE billing_inpatient_folios
                SET billing_cleared = 1,
                    billing_cleared_at = NOW(),
                    billing_cleared_by = ?,
                    status = 'closed',
                    notes = CASE WHEN ? IS NOT NULL THEN CONCAT(COALESCE(notes,''), ' [CLEARANCE: ', ?, ']') ELSE notes END,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $upd->execute([$clearedByName, $notes, $notes, $folioId]);

            // Update admission status to 'Pending Discharge' or record clearance
            $pdo->prepare("UPDATE inpatient_admissions SET status = 'Pending Discharge', updated_at = NOW() WHERE id = ? AND status = 'Admitted'")
                ->execute([(int)$f['admission_id']]);

            $pdo->commit();
            return $this->getFolioDetail($folioId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Get Complete Folio Statement of Account (SOA) Detail
     */
    public function getFolioDetail(int $folioId): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT f.*,
                   ia.admission_number,
                   ia.admission_date,
                   ia.discharge_date,
                   ia.status AS admission_status,
                   ia.admitting_diagnosis,
                   ia.attending_physician AS admission_doctor,
                   p.patient_no,
                   p.first_name,
                   p.last_name,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.birthdate,
                   p.sex,
                   hb.bed_number,
                   hb.room_number,
                   hb.bed_type,
                   hb.daily_rate,
                   hw.ward_name,
                   hw.ward_code
            FROM billing_inpatient_folios f
            JOIN inpatient_admissions ia ON f.admission_id = ia.id
            JOIN patients p ON f.patient_id = p.id
            LEFT JOIN hospital_beds hb ON ia.bed_id = hb.id
            LEFT JOIN hospital_wards hw ON ia.ward_id = hw.id
            WHERE f.id = ?
        ");
        $stmt->execute([$folioId]);
        $folio = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$folio) {
            return null;
        }

        // Fetch line items
        $lineStmt = $pdo->prepare("
            SELECT *
            FROM billing_folio_line_items
            WHERE folio_id = ?
            ORDER BY charge_category ASC, service_date ASC, id ASC
        ");
        $lineStmt->execute([$folioId]);
        $lineItems = $lineStmt->fetchAll(PDO::FETCH_ASSOC);

        // Group line items by category
        $categoryGroups = [
            'accommodation' => ['title' => 'Room & Accommodation Charges', 'code' => 'ACCOM', 'items' => [], 'subtotal' => 0.00],
            'doctor_fees' => ['title' => 'Attending Physician & Specialist Professional Fees', 'code' => 'PF', 'items' => [], 'subtotal' => 0.00],
            'operating_theater' => ['title' => 'Operating Theater, Anesthesia & Surgical Trays', 'code' => 'OR', 'items' => [], 'subtotal' => 0.00],
            'laboratory' => ['title' => 'Laboratory & Pathology Diagnostics', 'code' => 'LAB', 'items' => [], 'subtotal' => 0.00],
            'radiology' => ['title' => 'Radiology & Diagnostic Imaging', 'code' => 'RAD', 'items' => [], 'subtotal' => 0.00],
            'pharmacy' => ['title' => 'Inpatient e-MAR & Pharmacy Medications', 'code' => 'PHARM', 'items' => [], 'subtotal' => 0.00],
            'supplies_misc' => ['title' => 'Medical Supplies, Equipment & Miscellaneous', 'code' => 'MISC', 'items' => [], 'subtotal' => 0.00]
        ];

        foreach ($lineItems as $item) {
            $cat = $item['charge_category'];
            if (!isset($categoryGroups[$cat])) {
                $categoryGroups[$cat] = ['title' => ucfirst(str_replace('_', ' ', $cat)), 'code' => 'OTHER', 'items' => [], 'subtotal' => 0.00];
            }
            $categoryGroups[$cat]['items'][] = $item;
            if ($item['status'] === 'billed') {
                $categoryGroups[$cat]['subtotal'] += (float)$item['net_amount'];
            }
        }

        // Fetch payments
        $payStmt = $pdo->prepare("
            SELECT *
            FROM billing_folio_payments
            WHERE folio_id = ?
            ORDER BY payment_date ASC, id ASC
        ");
        $payStmt->execute([$folioId]);
        $payments = $payStmt->fetchAll(PDO::FETCH_ASSOC);

        // Patient Age calculation
        $age = null;
        if (!empty($folio['birthdate'])) {
            try {
                $dob = new \DateTime($folio['birthdate']);
                $now = new \DateTime();
                $age = $now->diff($dob)->y;
            } catch (\Throwable $e) {}
        }

        $currency = self::currencySymbol();

        return [
            'folio' => $folio,
            'patient' => [
                'id' => (int)$folio['patient_id'],
                'patient_no' => $folio['patient_no'],
                'name' => $folio['patient_name'],
                'age' => $age,
                'sex' => ucfirst((string)$folio['sex']),
                'birthdate' => $folio['birthdate']
            ],
            'admission' => [
                'id' => (int)$folio['admission_id'],
                'admission_number' => $folio['admission_number'],
                'admitted_at' => $folio['admitted_at'],
                'discharged_at' => $folio['discharged_at'],
                'bed_days' => (float)$folio['bed_days'],
                'room_bed' => $folio['room_bed_label'],
                'attending_physician' => $folio['attending_physician'],
                'diagnosis' => $folio['admitting_diagnosis'],
                'status' => $folio['admission_status']
            ],
            'financials' => [
                'currency' => $currency,
                'total_accommodation' => (float)$folio['total_accommodation'],
                'total_doctor_fees' => (float)$folio['total_doctor_fees'],
                'total_operating_theater' => (float)$folio['total_operating_theater'],
                'total_laboratory' => (float)$folio['total_laboratory'],
                'total_radiology' => (float)$folio['total_radiology'],
                'total_pharmacy' => (float)$folio['total_pharmacy'],
                'total_supplies_misc' => (float)$folio['total_supplies_misc'],
                'gross_amount' => (float)$folio['gross_amount'],
                'discount_type' => $folio['discount_type'],
                'discount_amount' => (float)$folio['discount_amount'],
                'insurance_covered_amount' => (float)$folio['insurance_covered_amount'],
                'net_amount' => (float)$folio['net_amount'],
                'paid_amount' => (float)$folio['paid_amount'],
                'balance_due' => (float)$folio['balance_due']
            ],
            'clearance' => [
                'is_cleared' => (bool)$folio['billing_cleared'],
                'cleared_at' => $folio['billing_cleared_at'],
                'cleared_by' => $folio['billing_cleared_by']
            ],
            'category_groups' => array_values($categoryGroups),
            'line_items' => $lineItems,
            'payments' => $payments
        ];
    }

    /**
     * List Master Inpatient Folios with Filters & Search
     */
    public function listFolios(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $pdo = Database::connection();
        $where = [];
        $params = [];

        if (!empty($filters['status'])) {
            $where[] = "f.status = ?";
            $params[] = $filters['status'];
        }

        if (isset($filters['billing_cleared']) && $filters['billing_cleared'] !== '') {
            $where[] = "f.billing_cleared = ?";
            $params[] = (int)$filters['billing_cleared'];
        }

        if (!empty($filters['patient_id'])) {
            $where[] = "f.patient_id = ?";
            $params[] = (int)$filters['patient_id'];
        }

        if (!empty($filters['search'])) {
            $term = '%' . trim($filters['search']) . '%';
            $where[] = "(f.folio_number LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.patient_no LIKE ? OR ia.admission_number LIKE ? OR f.room_bed_label LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = count($where) ? 'WHERE ' . implode(' AND ', $where) : '';

        $cStmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM billing_inpatient_folios f
            JOIN inpatient_admissions ia ON f.admission_id = ia.id
            JOIN patients p ON f.patient_id = p.id
            {$whereClause}
        ");
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $offset = max(0, ($page - 1) * $perPage);
        $stmt = $pdo->prepare("
            SELECT f.*,
                   ia.admission_number,
                   ia.status AS admission_status,
                   p.patient_no,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.birthdate,
                   p.sex
            FROM billing_inpatient_folios f
            JOIN inpatient_admissions ia ON f.admission_id = ia.id
            JOIN patients p ON f.patient_id = p.id
            {$whereClause}
            ORDER BY (f.billing_cleared = 0) DESC, f.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ");
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $currency = self::currencySymbol();
        foreach ($items as &$it) {
            $it['currency'] = $currency;
        }

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => (int)ceil($total / max(1, $perPage))
        ];
    }

    /**
     * Seeds realistic clinical charges across OR, Lab, Radiology, and Pharmacy for an admission
     * Useful for demonstrating comprehensive consolidation across all hospital modules
     */
    public function seedSampleClinicalCharges(int $admissionId, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $admStmt = $pdo->prepare("SELECT * FROM inpatient_admissions WHERE id = ?");
        $admStmt->execute([$admissionId]);
        $adm = $admStmt->fetch(PDO::FETCH_ASSOC);

        if (!$adm) {
            throw new RuntimeException("Admission #{$admissionId} not found.");
        }

        $patientId = (int)$adm['patient_id'];
        $admitDate = substr($adm['admission_date'], 0, 10);

        $pdo->beginTransaction();
        try {
            // 1. Seed Inpatient Daily Doctor Rounds if empty
            $rndCheck = $pdo->prepare("SELECT COUNT(*) FROM inpatient_daily_rounds WHERE admission_id = ?");
            $rndCheck->execute([$admissionId]);
            if ((int)$rndCheck->fetchColumn() === 0) {
                $insRnd = $pdo->prepare("
                    INSERT INTO inpatient_daily_rounds (
                        round_number, admission_id, patient_id, round_datetime,
                        rounding_physician_name, clinical_trajectory, subjective,
                        objective, assessment, plan, is_finalized, created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, NOW(),
                        ?, 'Stable', 'Patient resting comfortably. Pain well controlled 2/10.',
                        'Vitals stable. Abdomen soft, non-tender. Surgical site clean and dry.',
                        'Post-operative clinical recovery progressing smoothly. Afebrile.',
                        'Continue current IV antibiotic coverage and advance to soft cardiac diet.',
                        1, NOW(), NOW()
                    )
                ");
                $roundNo = "RND-" . date('Ymd') . "-" . rand(1000, 9999);
                $insRnd->execute([$roundNo, $admissionId, $patientId, $adm['attending_physician'] ?: 'Dr. Mark Villareal, MD']);
            }

            // 2. Seed OR Surgical Case & Charges if empty
            $orCaseCheck = $pdo->prepare("SELECT id FROM or_surgical_cases WHERE admission_id = ? OR patient_id = ?");
            $orCaseCheck->execute([$admissionId, $patientId]);
            $orCaseId = $orCaseCheck->fetchColumn();

            if (!$orCaseId) {
                $caseNo = "OR-" . date('Y') . "-" . rand(10000, 99999);
                $insCase = $pdo->prepare("
                    INSERT INTO or_surgical_cases (
                        case_number, admission_id, patient_id, patient_name, patient_mrn,
                        or_suite_id, or_suite_name, scheduled_date, scheduled_start_time, scheduled_end_time,
                        procedure_name, lead_surgeon, anesthesiologist, perioperative_stage,
                        billing_status, created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, ?, ?,
                        1, 'OR Suite 01 (Major Surgical)', ?, '08:00:00', '10:30:00',
                        'Laparoscopic Cholecystectomy with Cholangiogram', ?, 'Dr. Evelyn Cruz, MD (Anesthesiology)',
                        'Transferred / Discharged', 'charged', NOW(), NOW()
                    )
                ");
                $insCase->execute([
                    $caseNo, $admissionId, $patientId, $adm['patient_name'], $adm['patient_mrn'],
                    $admitDate, $adm['attending_physician'] ?: 'Dr. Mark Villareal, MD'
                ]);
                $orCaseId = (int)$pdo->lastInsertId();

                // Add standard OR charges
                $insOrCh = $pdo->prepare("
                    INSERT INTO or_charges (
                        case_id, patient_id, charge_type, description, quantity,
                        unit_price, gross_amount, discount_amount, net_amount,
                        charge_date, status, created_at
                    ) VALUES (
                        ?, ?, ?, ?, ?,
                        ?, ?, 0.00, ?,
                        ?, 'charged', NOW()
                    )
                ");
                $insOrCh->execute([$orCaseId, $patientId, 'or_time', 'Operating Room Base Utilization (150 mins)', 1, 15000.00, 15000.00, 15000.00, $admitDate]);
                $insOrCh->execute([$orCaseId, $patientId, 'anesthesia', 'General Endotracheal Anesthesia Management', 1, 8500.00, 8500.00, 8500.00, $admitDate]);
                $insOrCh->execute([$orCaseId, $patientId, 'supplies', 'Sterile Laparoscopic Trocar & Instrument Pack', 1, 4500.00, 4500.00, 4500.00, $admitDate]);
            }

            // 3. Seed Lab Charges
            $labCheck = $pdo->prepare("SELECT COUNT(*) FROM lab_charges WHERE patient_id = ?");
            $labCheck->execute([$patientId]);
            if ((int)$labCheck->fetchColumn() === 0) {
                $insLabCh = $pdo->prepare("
                    INSERT INTO lab_charges (
                        order_id, patient_id, test_name, description, quantity,
                        unit_price, gross_amount, discount_amount, net_amount,
                        charge_date, status, created_at
                    ) VALUES (
                        1, ?, ?, ?, 1,
                        ?, ?, 0.00, ?,
                        ?, 'charged', NOW()
                    )
                ");
                $insLabCh->execute([$patientId, 'Complete Blood Count (CBC with Platelets)', 'Automated hematology 5-part differential', 450.00, 450.00, 450.00, $admitDate]);
                $insLabCh->execute([$patientId, 'Serum Electrolytes Panel (Na, K, Cl)', 'Comprehensive renal metabolic electrolytes', 680.00, 680.00, 680.00, $admitDate]);
                $insLabCh->execute([$patientId, 'Blood Chemistry: Creatinine & BUN', 'Kidney function clearance panel', 520.00, 520.00, 520.00, $admitDate]);
            }

            // 4. Seed Radiology Charges
            $radCheck = $pdo->prepare("SELECT COUNT(*) FROM rad_charges WHERE patient_id = ?");
            $radCheck->execute([$patientId]);
            if ((int)$radCheck->fetchColumn() === 0) {
                $insRadCh = $pdo->prepare("
                    INSERT INTO rad_charges (
                        order_id, patient_id, study_name, description, quantity,
                        unit_price, gross_amount, discount_amount, net_amount,
                        charge_date, status, created_at
                    ) VALUES (
                        1, ?, ?, ?, 1,
                        ?, ?, 0.00, ?,
                        ?, 'charged', NOW()
                    )
                ");
                $insRadCh->execute([$patientId, 'Chest X-Ray PA View (Digital Radiography)', 'Pre-operative cardiopulmonary clearance radiograph', 850.00, 850.00, 850.00, $admitDate]);
                $insRadCh->execute([$patientId, 'Whole Abdominal Ultrasound with Doppler', 'High-resolution sonogram of gallbladder and biliary tree', 2200.00, 2200.00, 2200.00, $admitDate]);
            }

            // 5. Seed Inpatient e-MAR Medication Charges
            $emarCheck = $pdo->prepare("SELECT COUNT(*) FROM inpatient_med_charges WHERE admission_id = ?");
            $emarCheck->execute([$admissionId]);
            if ((int)$emarCheck->fetchColumn() === 0) {
                $defaultDrugId = (int)$pdo->query("SELECT id FROM drugs ORDER BY id ASC LIMIT 1")->fetchColumn();
                if ($defaultDrugId <= 0) $defaultDrugId = 10;

                // Ensure at least one order and administration exists to satisfy foreign key fk_imc_admin
                $meds = [
                    ['name' => 'IV Ceftriaxone 1g Vial (Reconstituted)', 'qty' => 2, 'price' => 750.00, 'total' => 1500.00],
                    ['name' => 'IV Paracetamol 1000mg/100mL Infusion Bottle', 'qty' => 3, 'price' => 380.00, 'total' => 1140.00],
                    ['name' => 'IV Omeprazole 40mg Vial with Diluent', 'qty' => 2, 'price' => 420.00, 'total' => 840.00],
                    ['name' => 'Plain Normal Saline 0.9% 1000mL IV Infusion Bag', 'qty' => 4, 'price' => 180.00, 'total' => 720.00]
                ];

                $insOrder = $pdo->prepare("
                    INSERT INTO inpatient_med_orders (
                        admission_id, patient_id, drug_id, drug_name, dose, dose_unit,
                        route, order_type, frequency, start_at, status, ordered_at
                    ) VALUES (
                        ?, ?, ?, ?, 1.0, 'dose',
                        'IV', 'scheduled', 'TID', NOW(), 'verified', NOW()
                    )
                ");

                $insAdmin = $pdo->prepare("
                    INSERT INTO inpatient_med_administrations (
                        order_id, admission_id, patient_id, status, given_at, initials, recorded_at
                    ) VALUES (
                        ?, ?, ?, 'given', NOW(), 'RN', NOW()
                    )
                ");

                $insEmarCh = $pdo->prepare("
                    INSERT INTO inpatient_med_charges (
                        administration_id, admission_id, patient_id, drug_id,
                        description, quantity, unit_price, gross_amount,
                        discount_amount, net_amount, charge_date, status, created_at
                    ) VALUES (
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        0.00, ?, ?, 'charged', NOW()
                    )
                ");

                foreach ($meds as $m) {
                    $insOrder->execute([$admissionId, $patientId, $defaultDrugId, $m['name']]);
                    $ordId = (int)$pdo->lastInsertId();

                    $insAdmin->execute([$ordId, $admissionId, $patientId]);
                    $adminId = (int)$pdo->lastInsertId();

                    $insEmarCh->execute([$adminId, $admissionId, $patientId, $defaultDrugId, $m['name'], $m['qty'], $m['price'], $m['total'], $m['total'], $admitDate]);
                }
            }

            $pdo->commit();

            // Re-sync folio
            $folio = $this->getOrCreateFolioForAdmission($admissionId, $userId);
            return $folio;
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }
}
