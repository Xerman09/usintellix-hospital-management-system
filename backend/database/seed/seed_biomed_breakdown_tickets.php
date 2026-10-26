<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';

use App\Core\Database;

try {
    $pdo = Database::connection();
    echo "Seeding Biomedical Breakdown Tickets & Urgent Repair Work Orders...\n";

    $pdo->beginTransaction();

    // Fetch equipment assets
    $assets = $pdo->query("SELECT id, asset_tag, name FROM hospital_equipment_assets")->fetchAll(PDO::FETCH_ASSOC);
    $assetMap = [];
    foreach ($assets as $a) {
        $assetMap[$a['asset_tag']] = $a['id'];
    }

    $ventId = $assetMap['EQ-VENT-001'] ?? 1;
    $anesId = $assetMap['EQ-ANES-001'] ?? 6;
    $defibId = $assetMap['EQ-DEFIB-001'] ?? 5;
    $pumpId = $assetMap['EQ-PUMP-001'] ?? 10;

    // Delete existing tickets if re-running
    $pdo->exec("DELETE FROM `biomed_work_orders` WHERE `ticket_number` IS NOT NULL;");

    $tickets = [
        [
            'work_order_number' => 'WO-2026-0005',
            'ticket_number' => 'TKT-2026-0001',
            'schedule_id' => null,
            'asset_id' => $ventId,
            'work_order_type' => 'breakdown_emergency_repair',
            'priority' => 'stat_life_critical',
            'scheduled_date' => date('Y-m-d'),
            'started_at' => date('Y-m-d H:i:s', strtotime('-2 hours')),
            'completed_at' => null,
            'lead_engineer_name' => 'Engr. David Santos, CBET (Biomedical Lead)',
            'service_vendor_name' => 'In-House Biomedical Engineering Bay',
            'reported_by_staff_name' => 'Nurse Sarah Jenkins, RN',
            'reported_by_role' => 'ICU Charge Nurse',
            'reporting_ward_or_dept' => 'Intensive Care Unit - Bed ICU-03',
            'reported_at' => date('Y-m-d H:i:s', strtotime('-3 hours')),
            'breakdown_symptom' => 'Continuous High-Pressure Occlusion Alarm / Ultrasonic Flow Sensor baseline drift error',
            'clinical_impact' => 'Critically ill patient immediately transferred to standby Dräger Evita V800. Machine red-tagged.',
            'checklist_audit_json' => json_encode([
                ['step' => 1, 'task' => 'Pneumatic flow transducer baseline check', 'result' => 'fail', 'value' => 'Drift > 18%'],
                ['step' => 2, 'task' => 'Expiratory valve diaphragm seal test', 'result' => 'fail', 'value' => 'Micro-fissure found'],
                ['step' => 3, 'task' => 'Electrical safety leakage test per IEC 62353', 'result' => 'pass', 'value' => 'Chassis 44 uA']
            ]),
            'electrical_safety_passed' => 1,
            'calibration_passed' => 0,
            'chassis_leakage_microamp' => 44.0,
            'ground_resistance_ohms' => 0.088,
            'parts_replaced_json' => json_encode([
                ['part_number' => 'HM-98212', 'part_name' => 'Hamilton Expiratory Membrane Valve Assembly', 'qty' => 1, 'cost' => 280.00],
                ['part_number' => 'HM-5510', 'part_name' => 'Ultrasonic Flow Sensor Calibration Adapter', 'qty' => 1, 'cost' => 120.00]
            ]),
            'labor_hours' => 2.50,
            'downtime_hours' => 3.00,
            'total_cost' => 550.00,
            'findings' => 'Patient alarm sounded while on volume-control ventilation. High peak inspiratory pressure alarm triggered repeatedly despite suctioning.',
            'root_cause_diagnostics' => 'Micro-fissure along the silicone edge of the expiratory membrane valve prevented complete pneumatic seal, creating false occlusion backpressure on the proximal flow sensor.',
            'corrective_actions' => 'Machine removed from patient bay. Expiratory membrane assembly replaced with new OEM kit. Currently running 2-hour lung simulator stress run.',
            'status' => 'in_progress',
            'supervisor_signoff_by' => null,
            'supervisor_signed_at' => null
        ],
        [
            'work_order_number' => 'WO-2026-0006',
            'ticket_number' => 'TKT-2026-0002',
            'schedule_id' => null,
            'asset_id' => $defibId,
            'work_order_type' => 'breakdown_emergency_repair',
            'priority' => 'urgent',
            'scheduled_date' => date('Y-m-d', strtotime('-1 day')),
            'started_at' => date('Y-m-d 10:00:00', strtotime('-1 day')),
            'completed_at' => date('Y-m-d 14:30:00', strtotime('-1 day')),
            'lead_engineer_name' => 'Engr. David Santos, CBET (Biomedical Lead)',
            'service_vendor_name' => 'In-House Biomedical Engineering Bay',
            'reported_by_staff_name' => 'Nurse Michael Chang, RN',
            'reported_by_role' => 'ER Trauma Bay Nurse',
            'reporting_ward_or_dept' => 'Emergency Department - Trauma Bay 1',
            'reported_at' => date('Y-m-d 09:30:00', strtotime('-1 day')),
            'breakdown_symptom' => 'Battery Depletion Warning with AC Power Plugged In / Therapy cable connector loose',
            'clinical_impact' => 'Backup Zoll M Series defibrillator rolled from CCU to ER Trauma Bay.',
            'checklist_audit_json' => json_encode([
                ['step' => 1, 'task' => 'AC mains charger power supply continuity', 'result' => 'pass', 'value' => 'Replaced 3.15A internal fuse'],
                ['step' => 2, 'task' => '200J Biphasic discharge test into 50-ohm load', 'result' => 'pass', 'value' => 'Delivered 201.4 Joules (+0.7%)'],
                ['step' => 3, 'task' => 'IEC 62353 Chassis leakage current & Ground resistance', 'result' => 'pass', 'value' => 'Leakage: 32.5 uA, Ground: 0.062 Ohm']
            ]),
            'electrical_safety_passed' => 1,
            'calibration_passed' => 1,
            'chassis_leakage_microamp' => 32.5,
            'ground_resistance_ohms' => 0.062,
            'parts_replaced_json' => json_encode([
                ['part_number' => 'ZL-8000-0588', 'part_name' => 'SurePower Internal AC Power Supply Fuse & Filter', 'qty' => 1, 'cost' => 85.00],
                ['part_number' => 'ZL-8000-1010', 'part_name' => 'Multi-Function Therapy Cable Harness Assembly', 'qty' => 1, 'cost' => 340.00]
            ]),
            'labor_hours' => 3.00,
            'downtime_hours' => 5.00,
            'total_cost' => 575.00,
            'findings' => 'Defibrillator display flashed "SERVICE SOON - BATTERY DEPLETED" even though AC green power LED was illuminated.',
            'root_cause_diagnostics' => 'Internal ceramic transient surge fuse was open on the smart charging board, preventing battery float charging; therapy cable strain-relief boot was severed internally causing intermittent paddle disconnects.',
            'corrective_actions' => 'Replaced internal fuse and upgraded to heavy-duty therapy harness cable. Full 200J biphasic discharge test verified into 50-ohm test dummy. Certified and returned to ER service.',
            'status' => 'completed_passed',
            'supervisor_signoff_by' => 'Engr. David Santos, CBET (Biomedical Lead)',
            'supervisor_signed_at' => date('Y-m-d 15:00:00', strtotime('-1 day'))
        ],
        [
            'work_order_number' => 'WO-2026-0007',
            'ticket_number' => 'TKT-2026-0003',
            'schedule_id' => null,
            'asset_id' => $pumpId,
            'work_order_type' => 'breakdown_emergency_repair',
            'priority' => 'routine',
            'scheduled_date' => date('Y-m-d'),
            'started_at' => date('Y-m-d 08:30:00'),
            'completed_at' => null,
            'lead_engineer_name' => 'Engr. David Santos, CBET',
            'service_vendor_name' => 'B. Braun Medical Field Support',
            'reported_by_staff_name' => 'Nurse Elena Rostova, RN',
            'reported_by_role' => 'Pediatric Ward Lead Nurse',
            'reporting_ward_or_dept' => 'Pediatric Inpatient Unit - Rm 302',
            'reported_at' => date('Y-m-d 08:00:00'),
            'breakdown_symptom' => 'Membrane keypad numeric key "4" not responding & intermittent downstream occlusion alarm',
            'clinical_impact' => 'Pump swapped out for sterile spare unit from central supply.',
            'checklist_audit_json' => json_encode([
                ['step' => 1, 'task' => 'Keypad matrix contact resistance test', 'result' => 'fail', 'value' => 'Key 4 open circuit'],
                ['step' => 2, 'task' => 'Pressure sensor zero baseline', 'result' => 'pending', 'value' => 'Awaiting keypad replacement']
            ]),
            'electrical_safety_passed' => 1,
            'calibration_passed' => 0,
            'chassis_leakage_microamp' => null,
            'ground_resistance_ohms' => null,
            'parts_replaced_json' => json_encode([
                ['part_number' => 'BB-8713030', 'part_name' => 'Infusomat Space Front Housing Membrane Keypad', 'qty' => 1, 'cost' => 135.00]
            ]),
            'labor_hours' => 1.50,
            'downtime_hours' => 2.50,
            'total_cost' => 210.00,
            'findings' => 'Pediatric nurse unable to program infusion rate containing digit 4. Intermittent occlusion beep occurred when IV line was completely unoccluded.',
            'root_cause_diagnostics' => 'IV medication fluid ingress along the keypad bezel eroded copper trace for key 4; optical pressure sensor barrel contaminated with dried saline crystal.',
            'corrective_actions' => 'Decontaminated pressure sensor barrel. Ordered OEM replacement membrane keypad assembly from B. Braun distributor.',
            'status' => 'pending_parts',
            'supervisor_signoff_by' => null,
            'supervisor_signed_at' => null
        ]
    ];

    $stmt = $pdo->prepare("
        INSERT INTO `biomed_work_orders` (
            `work_order_number`, `ticket_number`, `schedule_id`, `asset_id`, `work_order_type`,
            `priority`, `scheduled_date`, `started_at`, `completed_at`,
            `lead_engineer_name`, `service_vendor_name`, `reported_by_staff_name`,
            `reported_by_role`, `reporting_ward_or_dept`, `reported_at`,
            `breakdown_symptom`, `clinical_impact`, `checklist_audit_json`,
            `electrical_safety_passed`, `calibration_passed`, `chassis_leakage_microamp`,
            `ground_resistance_ohms`, `parts_replaced_json`, `labor_hours`,
            `downtime_hours`, `total_cost`, `findings`, `root_cause_diagnostics`,
            `corrective_actions`, `status`, `supervisor_signoff_by`, `supervisor_signed_at`
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?
        )
    ");

    foreach ($tickets as $t) {
        $stmt->execute([
            $t['work_order_number'], $t['ticket_number'], $t['schedule_id'], $t['asset_id'], $t['work_order_type'],
            $t['priority'], $t['scheduled_date'], $t['started_at'], $t['completed_at'],
            $t['lead_engineer_name'], $t['service_vendor_name'], $t['reported_by_staff_name'],
            $t['reported_by_role'], $t['reporting_ward_or_dept'], $t['reported_at'],
            $t['breakdown_symptom'], $t['clinical_impact'], $t['checklist_audit_json'],
            $t['electrical_safety_passed'], $t['calibration_passed'], $t['chassis_leakage_microamp'],
            $t['ground_resistance_ohms'], $t['parts_replaced_json'], $t['labor_hours'],
            $t['downtime_hours'], $t['total_cost'], $t['findings'], $t['root_cause_diagnostics'],
            $t['corrective_actions'], $t['status'], $t['supervisor_signoff_by'], $t['supervisor_signed_at']
        ]);
    }

    // Set assets status to 'Under Repair' for active breakdown tickets
    // 1. Hamilton C6 Ventilator is under repair!
    $pdo->prepare("
        UPDATE `hospital_equipment_assets`
        SET `status` = 'Under Repair',
            `status_reason` = 'CLINICAL LOCKOUT: Active Breakdown Ticket TKT-2026-0001 (Continuous Occlusion Alarm Drift)'
        WHERE `id` = ?
    ")->execute([$ventId]);

    // 2. B. Braun Pump is under repair!
    $pdo->prepare("
        UPDATE `hospital_equipment_assets`
        SET `status` = 'Under Repair',
            `status_reason` = 'CLINICAL LOCKOUT: Active Breakdown Ticket TKT-2026-0003 (Keypad 4 Sticky / Pending Parts)'
        WHERE `id` = ?
    ")->execute([$pumpId]);

    // Update sequence counter for tickets
    $pdo->exec("
        UPDATE `billing_tariff_counters` SET `last_number` = 3 WHERE `counter_type` = 'BIOMED_TKT' AND `year` = YEAR(CURRENT_DATE);
        UPDATE `billing_tariff_counters` SET `last_number` = 7 WHERE `counter_type` = 'BIOMED_WO' AND `year` = YEAR(CURRENT_DATE);
    ");

    $pdo->commit();
    echo "Breakdown Tickets Seeded Successfully! Active machines locked out to Under Repair.\n";
} catch (\Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
