<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';

use App\Core\Database;

try {
    $pdo = Database::connection();
    echo "Seeding CSSD Sterilizer Equipment & Autoclave Batches...\n";

    // 1. Clear existing seed data safely
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE `cssd_sterilization_batch_items`;");
    $pdo->exec("TRUNCATE TABLE `cssd_sterilization_batches`;");
    $pdo->exec("TRUNCATE TABLE `cssd_sterilizer_machines`;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    $pdo->beginTransaction();

    // 2. Seed Sterilizer Machines
    $machines = [
        [
            'machine_code' => 'STER-AC-01',
            'machine_name' => 'Getinge GSS67H Pre-Vacuum Steam Autoclave #1',
            'sterilization_type' => 'steam_autoclave',
            'location' => 'CSSD Sterilizer Core Bay 1',
            'serial_number' => 'GT-GSS-99210-PH',
            'manufacturer' => 'Getinge Infection Control',
            'model_number' => 'GSS67H Pre-Vac',
            'chamber_volume_liters' => 450.00,
            'max_operating_temp_c' => 138.00,
            'max_operating_pressure_bar' => 3.20,
            'daily_bowie_dick_passed' => 1,
            'last_bowie_dick_at' => date('Y-m-d 06:30:00'),
            'status' => 'ready',
            'total_completed_cycles' => 148,
            'last_preventative_maintenance' => date('Y-m-d', strtotime('-45 days')),
            'next_maintenance_due' => date('Y-m-d', strtotime('+45 days')),
            'notes' => 'Primary high-capacity surgical set sterilizer. Bowie-Dick air removal verified daily.'
        ],
        [
            'machine_code' => 'STER-AC-02',
            'machine_name' => 'Getinge GSS67H Pre-Vacuum Steam Autoclave #2',
            'sterilization_type' => 'steam_autoclave',
            'location' => 'CSSD Sterilizer Core Bay 2',
            'serial_number' => 'GT-GSS-99211-PH',
            'manufacturer' => 'Getinge Infection Control',
            'model_number' => 'GSS67H Pre-Vac',
            'chamber_volume_liters' => 450.00,
            'max_operating_temp_c' => 138.00,
            'max_operating_pressure_bar' => 3.20,
            'daily_bowie_dick_passed' => 1,
            'last_bowie_dick_at' => date('Y-m-d 06:45:00'),
            'status' => 'in_cycle',
            'total_completed_cycles' => 132,
            'last_preventative_maintenance' => date('Y-m-d', strtotime('-30 days')),
            'next_maintenance_due' => date('Y-m-d', strtotime('+60 days')),
            'notes' => 'Currently running Cycle #2 (134°C Ortho Trauma wrapped load).'
        ],
        [
            'machine_code' => 'STER-PL-01',
            'machine_name' => 'ASP STERRAD 100NX Hydrogen Peroxide Vapor Plasma',
            'sterilization_type' => 'hydrogen_peroxide_plasma',
            'location' => 'CSSD Low-Temp Core Bay 3',
            'serial_number' => 'ASP-100NX-4410',
            'manufacturer' => 'Advanced Sterilization Products (ASP)',
            'model_number' => 'STERRAD 100NX ALLClear',
            'chamber_volume_liters' => 152.00,
            'max_operating_temp_c' => 55.00,
            'max_operating_pressure_bar' => 1.00,
            'daily_bowie_dick_passed' => 1,
            'last_bowie_dick_at' => date('Y-m-d 07:15:00'),
            'status' => 'ready',
            'total_completed_cycles' => 96,
            'last_preventative_maintenance' => date('Y-m-d', strtotime('-20 days')),
            'next_maintenance_due' => date('Y-m-d', strtotime('+70 days')),
            'notes' => 'Low-temperature vaporized H2O2 gas plasma for rigid endoscopes, cameras, and fiberoptic light cords.'
        ],
        [
            'machine_code' => 'STER-AC-03',
            'machine_name' => 'Tuttnauer 3870EAV High-Speed Emergency Autoclave',
            'sterilization_type' => 'steam_autoclave',
            'location' => 'OR Suite Sub-Core Urgent Bay',
            'serial_number' => 'TUTT-3870-8812',
            'manufacturer' => 'Tuttnauer Medical',
            'model_number' => '3870EAV Large Tabletop',
            'chamber_volume_liters' => 85.00,
            'max_operating_temp_c' => 137.00,
            'max_operating_pressure_bar' => 2.80,
            'daily_bowie_dick_passed' => 0,
            'last_bowie_dick_at' => date('Y-m-d 06:15:00'),
            'status' => 'quarantined_spore_failure',
            'total_completed_cycles' => 45,
            'last_preventative_maintenance' => date('Y-m-d', strtotime('-60 days')),
            'next_maintenance_due' => date('Y-m-d', strtotime('+30 days')),
            'notes' => 'Air removal vacuum failure detected on morning test pack. Lockout flag raised.'
        ]
    ];

    $stmtMachine = $pdo->prepare("
        INSERT INTO `cssd_sterilizer_machines` (
            `machine_code`, `machine_name`, `sterilization_type`, `location`,
            `serial_number`, `manufacturer`, `model_number`, `chamber_volume_liters`,
            `max_operating_temp_c`, `max_operating_pressure_bar`, `daily_bowie_dick_passed`,
            `last_bowie_dick_at`, `status`, `total_completed_cycles`, `last_preventative_maintenance`,
            `next_maintenance_due`, `notes`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $machineIds = [];
    foreach ($machines as $m) {
        $stmtMachine->execute([
            $m['machine_code'], $m['machine_name'], $m['sterilization_type'], $m['location'],
            $m['serial_number'], $m['manufacturer'], $m['model_number'], $m['chamber_volume_liters'],
            $m['max_operating_temp_c'], $m['max_operating_pressure_bar'], $m['daily_bowie_dick_passed'],
            $m['last_bowie_dick_at'], $m['status'], $m['total_completed_cycles'], $m['last_preventative_maintenance'],
            $m['next_maintenance_due'], $m['notes']
        ]);
        $machineIds[$m['machine_code']] = (int)$pdo->lastInsertId();
    }
    echo "Inserted " . count($machineIds) . " sterilizer equipment machines.\n";

    // 3. Retrieve physical tray IDs for linkage
    $physTrays = $pdo->query("SELECT id, tray_barcode, master_tray_id FROM cssd_physical_trays")->fetchAll(PDO::FETCH_ASSOC);
    $trayMap = [];
    foreach ($physTrays as $pt) {
        $trayMap[$pt['tray_barcode']] = $pt['id'];
    }

    // 4. Seed Sterilization Batches
    $batches = [
        [
            'batch_number' => 'BATCH-2026-0001',
            'sterilizer_machine_id' => $machineIds['STER-AC-01'],
            'cycle_number' => 1,
            'cycle_type' => 'wrapped_instruments_134c',
            'cycle_start_time' => date('Y-m-d 08:00:00', strtotime('-1 day')),
            'cycle_end_time' => date('Y-m-d 08:55:00', strtotime('-1 day')),
            'operator_name' => 'Maria Santos, CRCST',
            'supervisor_verified_by' => 'Nurse Supervisor Linda Chen',
            'peak_temperature_celsius' => 134.40,
            'pressure_bar' => 2.22,
            'hold_duration_minutes' => 18.00,
            'vacuum_leak_rate_mbar_min' => 0.65,
            'bowie_dick_test_result' => 'pass',
            'chemical_indicator_class' => 'class_5_integrator',
            'chemical_indicator_result' => 'pass',
            'biological_indicator_lot' => '3M-Attest-BI-4921B',
            'biological_spore_organism' => 'Geobacillus stearothermophilus',
            'biological_spore_result' => 'no_growth_negative',
            'spore_incubation_hours' => 24.0,
            'spore_read_at' => date('Y-m-d 09:00:00'),
            'spore_read_by' => 'Microbiology QA Officer Alan Wong',
            'batch_status' => 'released_sterile',
            'total_trays_loaded' => 2,
            'total_packs_loaded' => 4,
            'sterilization_date' => date('Y-m-d', strtotime('-1 day')),
            'sterile_shelf_life_days' => 180,
            'sterility_expiry_date' => date('Y-m-d', strtotime('+179 days')),
            'release_notes' => '100% parameter compliance. Peak 134.4°C held for 18.0 mins @ 2.22 bar. Spore negative. Thermal labels printed.',
            'items' => [
                ['barcode' => 'TRAY-2026-0001', 'desc' => 'Major Laparotomy Surgical Set (Tray A01)', 'type' => 'instrument_tray', 'wrapper' => 'rigid_container', 'shelf' => 'Rack 1 - Top Tier'],
                ['barcode' => 'TRAY-2026-0005', 'desc' => 'Cesarean Section & Maternity Tray (Tray B02)', 'type' => 'instrument_tray', 'wrapper' => 'rigid_container', 'shelf' => 'Rack 1 - Middle Tier'],
                ['barcode' => 'PACK-2026-0410', 'desc' => 'Electrosurgical Monopolar Pencils (Set of 4)', 'type' => 'peel_pouch', 'wrapper' => 'tyvek_pouch', 'shelf' => 'Rack 1 - Bottom Tier'],
                ['barcode' => 'PACK-2026-0411', 'desc' => 'Suction Tubing & Yankauer Tips', 'type' => 'peel_pouch', 'wrapper' => 'tyvek_pouch', 'shelf' => 'Rack 1 - Bottom Tier']
            ]
        ],
        [
            'batch_number' => 'BATCH-2026-0002',
            'sterilizer_machine_id' => $machineIds['STER-AC-01'],
            'cycle_number' => 2,
            'cycle_type' => 'wrapped_instruments_134c',
            'cycle_start_time' => date('Y-m-d 10:15:00', strtotime('-1 day')),
            'cycle_end_time' => date('Y-m-d 11:10:00', strtotime('-1 day')),
            'operator_name' => 'Johnathan Diaz, CRCST',
            'supervisor_verified_by' => 'Nurse Supervisor Linda Chen',
            'peak_temperature_celsius' => 134.20,
            'pressure_bar' => 2.20,
            'hold_duration_minutes' => 18.00,
            'vacuum_leak_rate_mbar_min' => 0.70,
            'bowie_dick_test_result' => 'pass',
            'chemical_indicator_class' => 'class_5_integrator',
            'chemical_indicator_result' => 'pass',
            'biological_indicator_lot' => '3M-Attest-BI-4921B',
            'biological_spore_organism' => 'Geobacillus stearothermophilus',
            'biological_spore_result' => 'no_growth_negative',
            'spore_incubation_hours' => 24.0,
            'spore_read_at' => date('Y-m-d 11:15:00'),
            'spore_read_by' => 'Microbiology QA Officer Alan Wong',
            'batch_status' => 'released_sterile',
            'total_trays_loaded' => 2,
            'total_packs_loaded' => 2,
            'sterilization_date' => date('Y-m-d', strtotime('-1 day')),
            'sterile_shelf_life_days' => 180,
            'sterility_expiry_date' => date('Y-m-d', strtotime('+179 days')),
            'release_notes' => 'Trays released directly to Labor & Delivery and OR Suite 2.',
            'items' => [
                ['barcode' => 'TRAY-2026-0004', 'desc' => 'Cesarean Section Tray (Tray B01 - L&D)', 'type' => 'instrument_tray', 'wrapper' => 'rigid_container', 'shelf' => 'Rack 1 - Top Tier'],
                ['barcode' => 'TRAY-2026-0002', 'desc' => 'Major Laparotomy Set (Tray A02 - OR 2)', 'type' => 'instrument_tray', 'wrapper' => 'rigid_container', 'shelf' => 'Rack 1 - Middle Tier']
            ]
        ],
        [
            'batch_number' => 'BATCH-2026-0003',
            'sterilizer_machine_id' => $machineIds['STER-AC-02'],
            'cycle_number' => 1,
            'cycle_type' => 'wrapped_instruments_134c',
            'cycle_start_time' => date('Y-m-d 07:30:00'),
            'cycle_end_time' => date('Y-m-d 08:25:00'),
            'operator_name' => 'Elena Vance, CST',
            'supervisor_verified_by' => 'CSSD Supervisor Marcus Cole',
            'peak_temperature_celsius' => 134.50,
            'pressure_bar' => 2.24,
            'hold_duration_minutes' => 18.00,
            'vacuum_leak_rate_mbar_min' => 0.50,
            'bowie_dick_test_result' => 'pass',
            'chemical_indicator_class' => 'class_5_integrator',
            'chemical_indicator_result' => 'pass',
            'biological_indicator_lot' => '3M-Attest-BI-4922C',
            'biological_spore_organism' => 'Geobacillus stearothermophilus',
            'biological_spore_result' => 'incubating_pending',
            'spore_incubation_hours' => 24.0,
            'spore_read_at' => null,
            'spore_read_by' => null,
            'batch_status' => 'cycle_passed_quarantined_bi',
            'total_trays_loaded' => 1,
            'total_packs_loaded' => 3,
            'sterilization_date' => date('Y-m-d'),
            'sterile_shelf_life_days' => 180,
            'sterility_expiry_date' => date('Y-m-d', strtotime('+180 days')),
            'release_notes' => 'Cycle complete. Biological indicator undergoing 24h incubation. Batch in release quarantine.',
            'items' => [
                ['barcode' => 'TRAY-2026-0007', 'desc' => 'Orthopedic Basic Bone & Trauma Set (Tray C02)', 'type' => 'instrument_tray', 'wrapper' => 'rigid_container', 'shelf' => 'Rack 1 - Middle Tier'],
                ['barcode' => 'PACK-2026-0418', 'desc' => 'Bone Graft Funnel & Impactor Set', 'type' => 'peel_pouch', 'wrapper' => 'tyvek_pouch', 'shelf' => 'Rack 1 - Top Tier']
            ]
        ],
        [
            'batch_number' => 'BATCH-2026-0004',
            'sterilizer_machine_id' => $machineIds['STER-AC-02'],
            'cycle_number' => 2,
            'cycle_type' => 'wrapped_instruments_134c',
            'cycle_start_time' => date('Y-m-d 09:10:00'),
            'cycle_end_time' => null,
            'operator_name' => 'Elena Vance, CST',
            'supervisor_verified_by' => 'CSSD Supervisor Marcus Cole',
            'peak_temperature_celsius' => 134.00,
            'pressure_bar' => 2.20,
            'hold_duration_minutes' => 18.00,
            'vacuum_leak_rate_mbar_min' => 0.55,
            'bowie_dick_test_result' => 'pass',
            'chemical_indicator_class' => 'class_5_integrator',
            'chemical_indicator_result' => 'pending',
            'biological_indicator_lot' => '3M-Attest-BI-4922C',
            'biological_spore_organism' => 'Geobacillus stearothermophilus',
            'biological_spore_result' => 'incubating_pending',
            'spore_incubation_hours' => 24.0,
            'spore_read_at' => null,
            'spore_read_by' => null,
            'batch_status' => 'in_progress',
            'total_trays_loaded' => 1,
            'total_packs_loaded' => 2,
            'sterilization_date' => date('Y-m-d'),
            'sterile_shelf_life_days' => 180,
            'sterility_expiry_date' => date('Y-m-d', strtotime('+180 days')),
            'release_notes' => 'Chamber pressurized. Holding at 134°C sterilization plateau.',
            'items' => [
                ['barcode' => 'TRAY-2026-0006', 'desc' => 'Orthopedic Basic Bone & Trauma Set (Tray C01)', 'type' => 'instrument_tray', 'wrapper' => 'rigid_container', 'shelf' => 'Rack 1 - Middle Tier']
            ]
        ],
        [
            'batch_number' => 'BATCH-2026-0005',
            'sterilizer_machine_id' => $machineIds['STER-AC-03'],
            'cycle_number' => 1,
            'cycle_type' => 'unwrapped_flash_134c',
            'cycle_start_time' => date('Y-m-d 06:10:00'),
            'cycle_end_time' => date('Y-m-d 06:28:00'),
            'operator_name' => 'Johnathan Diaz, CRCST',
            'supervisor_verified_by' => 'Nurse Supervisor Linda Chen',
            'peak_temperature_celsius' => 131.20,
            'pressure_bar' => 1.85,
            'hold_duration_minutes' => 4.00,
            'vacuum_leak_rate_mbar_min' => 2.40,
            'bowie_dick_test_result' => 'fail',
            'chemical_indicator_class' => 'class_5_integrator',
            'chemical_indicator_result' => 'fail',
            'biological_indicator_lot' => '3M-Attest-BI-4920A',
            'biological_spore_organism' => 'Geobacillus stearothermophilus',
            'biological_spore_result' => 'growth_positive',
            'spore_incubation_hours' => 24.0,
            'spore_read_at' => date('Y-m-d 07:30:00'),
            'spore_read_by' => 'Microbiology QA Officer Alan Wong',
            'batch_status' => 'batch_failed_quarantined',
            'total_trays_loaded' => 0,
            'total_packs_loaded' => 1,
            'sterilization_date' => date('Y-m-d'),
            'sterile_shelf_life_days' => 180,
            'sterility_expiry_date' => date('Y-m-d'),
            'release_notes' => 'SAFETY LOCKOUT: Bowie-Dick failed air removal (vacuum leak 2.4 mbar/min). Spore growth positive. Autoclave removed from clinical service.',
            'items' => [
                ['barcode' => 'PACK-TEST-FAIL', 'desc' => 'Bowie-Dick Daily Test Challenge Pack', 'type' => 'linen_pack', 'wrapper' => 'crepe_paper', 'shelf' => 'Rack 1 - Chamber Center']
            ]
        ]
    ];

    $stmtBatch = $pdo->prepare("
        INSERT INTO `cssd_sterilization_batches` (
            `batch_number`, `sterilizer_machine_id`, `cycle_number`, `cycle_type`,
            `cycle_start_time`, `cycle_end_time`, `operator_name`, `supervisor_verified_by`,
            `peak_temperature_celsius`, `pressure_bar`, `hold_duration_minutes`, `vacuum_leak_rate_mbar_min`,
            `bowie_dick_test_result`, `chemical_indicator_class`, `chemical_indicator_result`,
            `biological_indicator_lot`, `biological_spore_organism`, `biological_spore_result`,
            `spore_incubation_hours`, `spore_read_at`, `spore_read_by`, `batch_status`,
            `total_trays_loaded`, `total_packs_loaded`, `sterilization_date`, `sterile_shelf_life_days`,
            `sterility_expiry_date`, `release_notes`
        ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?
        )
    ");

    $stmtBatchItem = $pdo->prepare("
        INSERT INTO `cssd_sterilization_batch_items` (
            `batch_id`, `physical_tray_id`, `item_barcode`, `item_description`,
            `item_type`, `wrapper_type`, `load_rack_shelf`, `item_sterility_expiry_date`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");

    foreach ($batches as $b) {
        $stmtBatch->execute([
            $b['batch_number'], $b['sterilizer_machine_id'], $b['cycle_number'], $b['cycle_type'],
            $b['cycle_start_time'], $b['cycle_end_time'], $b['operator_name'], $b['supervisor_verified_by'],
            $b['peak_temperature_celsius'], $b['pressure_bar'], $b['hold_duration_minutes'], $b['vacuum_leak_rate_mbar_min'],
            $b['bowie_dick_test_result'], $b['chemical_indicator_class'], $b['chemical_indicator_result'],
            $b['biological_indicator_lot'], $b['biological_spore_organism'], $b['biological_spore_result'],
            $b['spore_incubation_hours'], $b['spore_read_at'], $b['spore_read_by'], $b['batch_status'],
            $b['total_trays_loaded'], $b['total_packs_loaded'], $b['sterilization_date'], $b['sterile_shelf_life_days'],
            $b['sterility_expiry_date'], $b['release_notes']
        ]);
        $batchId = (int)$pdo->lastInsertId();

        foreach ($b['items'] as $it) {
            $physId = $trayMap[$it['barcode']] ?? null;
            $stmtBatchItem->execute([
                $batchId, $physId, $it['barcode'], $it['desc'],
                $it['type'], $it['wrapper'], $it['shelf'], $b['sterility_expiry_date']
            ]);
        }
    }
    echo "Inserted " . count($batches) . " sterilization batches with items and biological spore verifications.\n";

    // Set sequence counter in billing_tariff_counters to last batch number (5)
    $pdo->prepare("
        UPDATE `billing_tariff_counters` SET `last_number` = 5
        WHERE `counter_type` = 'CSSD_BATCH' AND `year` = YEAR(CURRENT_DATE)
    ")->execute();

    $pdo->commit();
    echo "CSSD Sterilization Batches Seeding Completed Successfully!\n";
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "ERROR SEEDING CSSD BATCHES: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
