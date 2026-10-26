<?php
/**
 * Seeder: seed_biomed_calibration_records.php
 * Populates realistic NIST-traceable calibration and IEC 62353 electrical safety test certificates.
 */

require_once __DIR__ . '/../../app/Core/Env.php';
require_once __DIR__ . '/../../app/Core/Database.php';

use App\Core\Database;

$pdo = Database::connection();

echo "=== Seeding NIST-Traceable Calibration Records & Certifications ===\n";

// 1. Ensure Covidien ForceTriad ESU exists in hospital_equipment_assets for Electrosurgical Wattage calibration
$stmt = $pdo->prepare("SELECT id FROM hospital_equipment_assets WHERE asset_tag = 'EQ-SURG-002'");
$stmt->execute();
$esuId = $stmt->fetchColumn();

if (!$esuId) {
    echo "Inserting Covidien ForceTriad Electrosurgical Generator (EQ-SURG-002)...\n";
    $insEsu = $pdo->prepare("
        INSERT INTO hospital_equipment_assets (
            asset_tag,
            name,
            category,
            criticality_level,
            serial_number,
            model_number,
            manufacturer,
            purchase_date,
            purchase_cost,
            last_calibration_date,
            next_calibration_due,
            status,
            status_reason
        ) VALUES (
            'EQ-SURG-002',
            'Covidien ForceTriad Energy Platform Electrosurgical Generator',
            'Surgical',
            'Life Critical',
            'SN-VAL-90231',
            'ForceTriad-100',
            'Medtronic / Covidien',
            '2024-03-15',
            450000.00,
            '2026-10-26',
            '2027-10-26',
            'Operational',
            NULL
        )
    ");
    $insEsu->execute();
    $esuId = (int)$pdo->lastInsertId();
}

// 2. Fetch Asset IDs
$getAssetId = function($tag) use ($pdo) {
    $s = $pdo->prepare("SELECT id FROM hospital_equipment_assets WHERE asset_tag = ?");
    $s->execute([$tag]);
    return $s->fetchColumn();
};

$defibId = $getAssetId('EQ-DEFIB-001');
$ventId  = $getAssetId('EQ-VENT-001');
$anesId  = $getAssetId('EQ-ANES-001');

$certificates = [
    [
        'certificate_number'          => 'CAL-2026-0001',
        'asset_id'                    => $defibId,
        'calibration_type'            => 'energy_output',
        'calibration_date'            => '2026-10-26',
        'next_due_date'               => '2027-10-26',
        'calibration_interval_months' => 12,
        'environmental_temp_c'        => 22.4,
        'relative_humidity_pct'       => 46.2,
        'calibrated_by_name'          => 'Engr. Mark Villanueva, CBET',
        'calibrated_by_role'          => 'Senior Biomedical Metrologist',
        'calibrator_license_no'       => 'PRC-ECE-0045182 / CBET-US-9912',
        'calibration_standard_used'   => 'Fluke Biomedical Impulse 7000DP Precision Defibrillator / Transcutaneous Pacemaker Analyzer',
        'standard_serial_number'      => 'SN-IMP-77291',
        'standard_nist_cert_number'   => 'NIST-FLK-88219-A',
        'standard_calibration_expiry' => '2027-05-15',
        'traceability_statement'      => 'Measurements are directly traceable to the National Institute of Standards and Technology (NIST) via Fluke Metrology ISO/IEC 17025 accredited standards laboratory.',
        'set_point_output'            => 200.000,
        'measured_output'             => 201.400,
        'output_unit'                 => 'Joules',
        'tolerance_percentage'        => 5.00,
        'variance_percentage'         => 0.700,
        'energy_calibration_passed'   => 1,
        'multi_point_data_json'       => json_encode([
            ['test_param' => 'Energy Delivered 50J', 'set_point' => 50.0, 'measured' => 49.8, 'unit' => 'Joules', 'variance_pct' => -0.40, 'tolerance' => 5.0, 'status' => 'pass'],
            ['test_param' => 'Energy Delivered 100J', 'set_point' => 100.0, 'measured' => 100.5, 'unit' => 'Joules', 'variance_pct' => 0.50, 'tolerance' => 5.0, 'status' => 'pass'],
            ['test_param' => 'Energy Delivered 150J', 'set_point' => 150.0, 'measured' => 151.0, 'unit' => 'Joules', 'variance_pct' => 0.67, 'tolerance' => 5.0, 'status' => 'pass'],
            ['test_param' => 'Energy Delivered 200J (Max Biphasic)', 'set_point' => 200.0, 'measured' => 201.4, 'unit' => 'Joules', 'variance_pct' => 0.70, 'tolerance' => 5.0, 'status' => 'pass'],
            ['test_param' => 'Sync Cardioversion Delay', 'set_point' => 40.0, 'measured' => 38.2, 'unit' => 'ms', 'variance_pct' => -4.50, 'tolerance' => 15.0, 'status' => 'pass'],
        ], JSON_UNESCAPED_UNICODE),
        'ground_wire_resistance_ohms' => 0.0620,
        'ground_resistance_passed'    => 1,
        'chassis_leakage_microamp'    => 32.50,
        'chassis_leakage_passed'      => 1,
        'lead_leakage_microamp'       => 4.20,
        'lead_leakage_passed'         => 1,
        'electrical_safety_passed'    => 1,
        'overall_result'              => 'passed',
        'sticker_issued'              => 1,
        'sticker_serial_number'       => 'CAL-STK-2026-0001',
        'notes_and_remarks'           => 'Post-repair recertification complete. Delivered energy within +/-1% across all biphasic energy steps into 50-ohm test fixture. Electrical safety passes IEC 62353 limits with wide margin. Certified for immediate ER resuscitation service.',
        'supervisor_approved_by'      => 'Engr. David Santos, CBET (Director of Biomedical Engineering)',
        'supervisor_approved_at'      => '2026-10-26 09:30:00'
    ],
    [
        'certificate_number'          => 'CAL-2026-0002',
        'asset_id'                    => $esuId,
        'calibration_type'            => 'electrosurgical_power',
        'calibration_date'            => '2026-10-26',
        'next_due_date'               => '2027-10-26',
        'calibration_interval_months' => 12,
        'environmental_temp_c'        => 21.8,
        'relative_humidity_pct'       => 44.5,
        'calibrated_by_name'          => 'Engr. Mark Villanueva, CBET',
        'calibrated_by_role'          => 'Senior Biomedical Metrologist',
        'calibrator_license_no'       => 'PRC-ECE-0045182 / CBET-US-9912',
        'calibration_standard_used'   => 'Fluke Biomedical QA-ES III Electrosurgical Analyzer with REM Contact Resistance Module',
        'standard_serial_number'      => 'SN-QAES-44102',
        'standard_nist_cert_number'   => 'NIST-FLK-55410-B',
        'standard_calibration_expiry' => '2027-04-30',
        'traceability_statement'      => 'Measurements are directly traceable to NIST reference thermal converters and RF voltage/current standards under ISO 17025 accreditation.',
        'set_point_output'            => 50.000,
        'measured_output'             => 49.200,
        'output_unit'                 => 'Watts',
        'tolerance_percentage'        => 5.00,
        'variance_percentage'         => -1.600,
        'energy_calibration_passed'   => 1,
        'multi_point_data_json'       => json_encode([
            ['test_param' => 'Monopolar Pure Cut (300Ω Load)', 'set_point' => 120.0, 'measured' => 118.5, 'unit' => 'Watts', 'variance_pct' => -1.25, 'tolerance' => 5.0, 'status' => 'pass'],
            ['test_param' => 'Monopolar Fulgurate Coag (500Ω Load)', 'set_point' => 50.0, 'measured' => 49.2, 'unit' => 'Watts', 'variance_pct' => -1.60, 'tolerance' => 5.0, 'status' => 'pass'],
            ['test_param' => 'Bipolar Standard Macro (100Ω Load)', 'set_point' => 40.0, 'measured' => 40.8, 'unit' => 'Watts', 'variance_pct' => 2.00, 'tolerance' => 5.0, 'status' => 'pass'],
            ['test_param' => 'REM Return Electrode Monitoring Trip Point', 'set_point' => 135.0, 'measured' => 134.2, 'unit' => 'Ohms', 'variance_pct' => -0.59, 'tolerance' => 5.0, 'status' => 'pass'],
            ['test_param' => 'High-Frequency RF Leakage (Active Lead)', 'set_point' => 150.0, 'measured' => 48.0, 'unit' => 'mA', 'variance_pct' => -68.0, 'tolerance' => 100.0, 'status' => 'pass'],
        ], JSON_UNESCAPED_UNICODE),
        'ground_wire_resistance_ohms' => 0.0780,
        'ground_resistance_passed'    => 1,
        'chassis_leakage_microamp'    => 41.20,
        'chassis_leakage_passed'      => 1,
        'lead_leakage_microamp'       => 8.50,
        'lead_leakage_passed'         => 1,
        'electrical_safety_passed'    => 1,
        'overall_result'              => 'passed',
        'sticker_issued'              => 1,
        'sticker_serial_number'       => 'CAL-STK-2026-0002',
        'notes_and_remarks'           => 'Annual electrical safety and RF wattage output certification. REM dual-foil return pad interlock circuit tripped precisely at 134.2 Ohms (Spec 135 +/- 5 Ohms). RF leakage is safely below 100mA limit. Approved for OR suite surgical procedures.',
        'supervisor_approved_by'      => 'Engr. David Santos, CBET (Director of Biomedical Engineering)',
        'supervisor_approved_at'      => '2026-10-26 10:15:00'
    ],
    [
        'certificate_number'          => 'CAL-2026-0003',
        'asset_id'                    => $ventId,
        'calibration_type'            => 'flow_and_pressure',
        'calibration_date'            => '2026-10-26',
        'next_due_date'               => '2027-10-26',
        'calibration_interval_months' => 12,
        'environmental_temp_c'        => 22.0,
        'relative_humidity_pct'       => 45.0,
        'calibrated_by_name'          => 'Engr. Mark Villanueva, CBET',
        'calibrated_by_role'          => 'Senior Biomedical Metrologist',
        'calibrator_license_no'       => 'PRC-ECE-0045182 / CBET-US-9912',
        'calibration_standard_used'   => 'TSI Certifier Pro High-Flow Ventilator Test System',
        'standard_serial_number'      => 'SN-TSI-91048',
        'standard_nist_cert_number'   => 'NIST-TSI-33109-C',
        'standard_calibration_expiry' => '2027-03-20',
        'traceability_statement'      => 'Flow and pressure measurements are traceable to NIST primary standards through TSI Metrology Laboratory accredited under NVLAP ISO/IEC 17025.',
        'set_point_output'            => 500.000,
        'measured_output'             => 496.000,
        'output_unit'                 => 'mL Tidal Vol',
        'tolerance_percentage'        => 5.00,
        'variance_percentage'         => -0.800,
        'energy_calibration_passed'   => 1,
        'multi_point_data_json'       => json_encode([
            ['test_param' => 'Inspiratory Tidal Volume (Vt 500mL)', 'set_point' => 500.0, 'measured' => 496.0, 'unit' => 'mL', 'variance_pct' => -0.80, 'tolerance' => 5.0, 'status' => 'pass'],
            ['test_param' => 'PEEP Positive End-Expiratory Pressure', 'set_point' => 10.0, 'measured' => 10.1, 'unit' => 'cmH2O', 'variance_pct' => 1.00, 'tolerance' => 5.0, 'status' => 'pass'],
            ['test_param' => 'Peak Inspiratory Flow Rate (60 L/min)', 'set_point' => 60.0, 'measured' => 59.4, 'unit' => 'L/min', 'variance_pct' => -1.00, 'tolerance' => 5.0, 'status' => 'pass'],
            ['test_param' => 'FiO2 Oxygen Concentration (60% Setting)', 'set_point' => 60.0, 'measured' => 60.3, 'unit' => '% O2', 'variance_pct' => 0.50, 'tolerance' => 3.0, 'status' => 'pass'],
        ], JSON_UNESCAPED_UNICODE),
        'ground_wire_resistance_ohms' => 0.0510,
        'ground_resistance_passed'    => 1,
        'chassis_leakage_microamp'    => 28.00,
        'chassis_leakage_passed'      => 1,
        'lead_leakage_microamp'       => 0.00,
        'lead_leakage_passed'         => 1,
        'electrical_safety_passed'    => 1,
        'overall_result'              => 'passed',
        'sticker_issued'              => 1,
        'sticker_serial_number'       => 'CAL-STK-2026-0003',
        'notes_and_remarks'           => 'Post-repair calibration following expiratory membrane valve replacement. Flow, volume, and O2 blender calibrated across standard adult and pediatric compliance curves. Returned to ICU service.',
        'supervisor_approved_by'      => 'Engr. David Santos, CBET (Director of Biomedical Engineering)',
        'supervisor_approved_at'      => '2026-10-26 10:45:00'
    ]
];

$insSql = "
    INSERT INTO biomed_calibration_records (
        certificate_number,
        asset_id,
        calibration_type,
        calibration_date,
        next_due_date,
        calibration_interval_months,
        environmental_temp_c,
        relative_humidity_pct,
        calibrated_by_name,
        calibrated_by_role,
        calibrator_license_no,
        calibration_standard_used,
        standard_serial_number,
        standard_nist_cert_number,
        standard_calibration_expiry,
        traceability_statement,
        set_point_output,
        measured_output,
        output_unit,
        tolerance_percentage,
        variance_percentage,
        energy_calibration_passed,
        multi_point_data_json,
        ground_wire_resistance_ohms,
        ground_resistance_passed,
        chassis_leakage_microamp,
        chassis_leakage_passed,
        lead_leakage_microamp,
        lead_leakage_passed,
        electrical_safety_passed,
        overall_result,
        sticker_issued,
        sticker_serial_number,
        notes_and_remarks,
        supervisor_approved_by,
        supervisor_approved_at,
        created_by
    ) VALUES (
        :certificate_number,
        :asset_id,
        :calibration_type,
        :calibration_date,
        :next_due_date,
        :calibration_interval_months,
        :environmental_temp_c,
        :relative_humidity_pct,
        :calibrated_by_name,
        :calibrated_by_role,
        :calibrator_license_no,
        :calibration_standard_used,
        :standard_serial_number,
        :standard_nist_cert_number,
        :standard_calibration_expiry,
        :traceability_statement,
        :set_point_output,
        :measured_output,
        :output_unit,
        :tolerance_percentage,
        :variance_percentage,
        :energy_calibration_passed,
        :multi_point_data_json,
        :ground_wire_resistance_ohms,
        :ground_resistance_passed,
        :chassis_leakage_microamp,
        :chassis_leakage_passed,
        :lead_leakage_microamp,
        :lead_leakage_passed,
        :electrical_safety_passed,
        :overall_result,
        :sticker_issued,
        :sticker_serial_number,
        :notes_and_remarks,
        :supervisor_approved_by,
        :supervisor_approved_at,
        1
    )
    ON DUPLICATE KEY UPDATE
        calibration_standard_used = VALUES(calibration_standard_used),
        standard_nist_cert_number = VALUES(standard_nist_cert_number),
        variance_percentage = VALUES(variance_percentage),
        multi_point_data_json = VALUES(multi_point_data_json)
";

$stmtIns = $pdo->prepare($insSql);

foreach ($certificates as $cert) {
    if (!$cert['asset_id']) continue;
    $stmtIns->execute($cert);
    echo "Seeded Calibration Certificate: {$cert['certificate_number']} for Asset ID {$cert['asset_id']}\n";

    // Synchronize equipment asset dates
    $updAsset = $pdo->prepare("
        UPDATE hospital_equipment_assets
        SET last_calibration_date = ?,
            next_calibration_due = ?,
            status = 'Operational',
            status_reason = NULL
        WHERE id = ?
    ");
    $updAsset->execute([$cert['calibration_date'], $cert['next_due_date'], $cert['asset_id']]);
}

// Update sequence counter
$pdo->exec("
    INSERT INTO billing_tariff_counters (counter_type, year, last_number)
    VALUES ('BIOMED_CAL', 2026, 3)
    ON DUPLICATE KEY UPDATE last_number = GREATEST(last_number, 3)
");

echo "NIST Calibration records successfully seeded!\n";
