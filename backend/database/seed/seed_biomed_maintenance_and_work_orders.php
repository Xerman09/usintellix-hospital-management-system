<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';

use App\Core\Database;

try {
    $pdo = Database::connection();
    echo "Seeding Biomedical Preventive Maintenance Schedules & Work Orders...\n";

    // 1. Clear existing seed data safely
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE `biomed_work_orders`;");
    $pdo->exec("TRUNCATE TABLE `biomed_maintenance_schedules`;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    $pdo->beginTransaction();

    // 2. Fetch Assets
    $assets = $pdo->query("SELECT id, asset_tag, name, category, criticality_level FROM hospital_equipment_assets")->fetchAll(PDO::FETCH_ASSOC);
    $assetMap = [];
    foreach ($assets as $a) {
        $assetMap[$a['asset_tag']] = $a;
    }

    // Fallback helper
    $getAssetId = function($tag, $fallbackId) use ($assetMap) {
        return $assetMap[$tag]['id'] ?? $fallbackId;
    };

    // 3. Define Schedules with task checklists
    $schedules = [
        [
            'schedule_code' => 'PMS-2026-0001',
            'asset_id' => $getAssetId('EQ-VENT-001', 1),
            'title' => 'Hamilton C6 Intensive Care Ventilator Semi-Annual Calibration & Oxygen Cell Overhaul',
            'maintenance_type' => 'preventive_maintenance',
            'frequency' => 'semi_annual',
            'interval_months' => 6,
            'criticality_tier' => 'life_critical',
            'estimated_duration_hours' => 2.50,
            'last_performed_date' => date('Y-m-d', strtotime('-175 days')),
            'next_due_date' => date('Y-m-d', strtotime('+5 days')), // Due soon
            'grace_period_days' => 7,
            'service_provider_type' => 'in_house_biomed',
            'vendor_or_contractor_name' => 'In-House Biomedical Engineering Bay',
            'contact_phone_or_email' => 'biomed-lead@hospital.usintellix.internal',
            'assigned_engineer_staff_id' => 1,
            'assigned_engineer_name' => 'Engr. David Santos, CBET (Biomedical Lead)',
            'task_checklist_json' => json_encode([
                ['step' => 1, 'task' => 'Visual housing, pneumatic fittings, and medical-grade power cord inspection', 'standard' => 'Zero cracks or frayed wiring', 'is_critical' => 1],
                ['step' => 2, 'task' => 'Internal lithium-ion battery backup discharge load test (minimum 120 mins hold)', 'standard' => 'Capacity >= 90% OEM spec', 'is_critical' => 1],
                ['step' => 3, 'task' => 'Oxygen galvanic cell calibration at 21% ambient air and 100% pure medical O2', 'standard' => 'Tolerance within +/- 2% FiO2', 'is_critical' => 1],
                ['step' => 4, 'task' => 'Proximal flow sensor and pressure transducer baseline auto-zero calibration', 'standard' => 'Leak rate < 20 mL/min', 'is_critical' => 1],
                ['step' => 5, 'task' => 'HEPA air intake filter and cooling fan filter replacement', 'standard' => 'OEM genuine Hamilton filter pack installed', 'is_critical' => 0],
                ['step' => 6, 'task' => 'Electrical safety testing per IEC 62353 / NFPA 99 (Chassis leakage current & ground resistance)', 'standard' => 'Leakage < 100 uA, Ground resistance < 0.200 Ohm', 'is_critical' => 1],
                ['step' => 7, 'task' => 'Simulated test lung run: High pressure, low PEEP, apnea backup alarm verification', 'standard' => 'All audio-visual alarms trigger within 1.5s', 'is_critical' => 1]
            ]),
            'safety_standards_reference' => 'IEC 60601-2-12 / IEC 62353 / NFPA 99',
            'status' => 'active',
            'is_auto_generate_work_order' => 1,
            'notes' => 'Life-critical ventilator in Medical ICU Bay 1. Servicing requires coordination with Charge Nurse.'
        ],
        [
            'schedule_code' => 'PMS-2026-0002',
            'asset_id' => $getAssetId('EQ-DEFIB-001', 5),
            'title' => 'Zoll R Series ALS Clinical Defibrillator Quarterly Electrical Safety & Energy Discharge Test',
            'maintenance_type' => 'electrical_safety_inspection',
            'frequency' => 'quarterly',
            'interval_months' => 3,
            'criticality_tier' => 'life_critical',
            'estimated_duration_hours' => 1.75,
            'last_performed_date' => date('Y-m-d', strtotime('-78 days')),
            'next_due_date' => date('Y-m-d', strtotime('+12 days')),
            'grace_period_days' => 5,
            'service_provider_type' => 'in_house_biomed',
            'vendor_or_contractor_name' => 'In-House Biomedical Engineering Bay',
            'contact_phone_or_email' => 'biomed-lead@hospital.usintellix.internal',
            'assigned_engineer_staff_id' => 1,
            'assigned_engineer_name' => 'Engr. David Santos, CBET (Biomedical Lead)',
            'task_checklist_json' => json_encode([
                ['step' => 1, 'task' => 'External chassis, therapy cable, and multi-function paddle surface inspection', 'standard' => 'Clean paddle contact plates without pit burns', 'is_critical' => 1],
                ['step' => 2, 'task' => 'Energy discharge verification into 50-ohm test load at 30J, 100J, 200J biphasic', 'standard' => 'Energy delivery within +/- 3J or 5%', 'is_critical' => 1],
                ['step' => 3, 'task' => 'Internal sync cardioversion delay test from R-wave trigger peak', 'standard' => 'Discharge within 60 ms of R-wave', 'is_critical' => 1],
                ['step' => 4, 'task' => 'Transcutaneous pacemaker pulse rate and output current calibration (40-180 mA)', 'standard' => 'Pacing current within +/- 5%', 'is_critical' => 1],
                ['step' => 5, 'task' => 'SurePower rechargeable battery cycle test and smart charger health readout', 'standard' => 'Battery capacity >= 85%', 'is_critical' => 1],
                ['step' => 6, 'task' => 'Electrical safety chassis leakage test per NFPA 99 Healthcare Defibrillator standard', 'standard' => 'Leakage current < 50 uA in normal condition', 'is_critical' => 1]
            ]),
            'safety_standards_reference' => 'IEC 60601-2-4 / NFPA 99 / AHA Guidelines',
            'status' => 'active',
            'is_auto_generate_work_order' => 1,
            'notes' => 'Emergency Code Blue defibrillator assigned to Emergency Room Trauma Bay 1.'
        ],
        [
            'schedule_code' => 'PMS-2026-0003',
            'asset_id' => $getAssetId('EQ-ANES-001', 6),
            'title' => 'GE Healthcare Aisys CS2 Anesthesia Machine Semi-Annual Vaporizer Assay & Pipeline Leak Test',
            'maintenance_type' => 'calibration_certification',
            'frequency' => 'semi_annual',
            'interval_months' => 6,
            'criticality_tier' => 'life_critical',
            'estimated_duration_hours' => 3.00,
            'last_performed_date' => date('Y-m-d', strtotime('-185 days')),
            'next_due_date' => date('Y-m-d', strtotime('-5 days')), // OVERDUE!
            'grace_period_days' => 7,
            'service_provider_type' => 'oem_authorized_service',
            'vendor_or_contractor_name' => 'GE Healthcare Field Engineering Division',
            'contact_phone_or_email' => 'service.gehealthcare@pharma.ge.com / (02) 8888-4321',
            'assigned_engineer_staff_id' => null,
            'assigned_engineer_name' => 'Engr. Manuel Roxas (GE Field Specialist)',
            'task_checklist_json' => json_encode([
                ['step' => 1, 'task' => 'Medical gas pipeline inlet pressure and high-pressure manifold check (O2, N2O, Air)', 'standard' => 'Supply pressure 50-55 PSI without drop', 'is_critical' => 1],
                ['step' => 2, 'task' => 'Sevoflurane / Isoflurane cassette electronic vaporizer output concentration assay (Riken refractometer)', 'standard' => 'Vaporizer accuracy within +/- 0.1% volume', 'is_critical' => 1],
                ['step' => 3, 'task' => 'Nitrous oxide hypoxic guard fail-safe cutoff check (O2 < 25% auto-shutdown)', 'standard' => 'N2O completely stops if O2 pipeline disabled', 'is_critical' => 1],
                ['step' => 4, 'task' => 'Breathing circuit internal compliance and bellows leak rate test', 'standard' => 'Chamber decay < 50 mL/min at 30 cmH2O', 'is_critical' => 1],
                ['step' => 5, 'task' => 'Active anesthetic gas scavenging system (AGSS) vacuum flow rate verification', 'standard' => 'Flow rate 25-50 L/min', 'is_critical' => 1],
                ['step' => 6, 'task' => 'Electrical safety leakage and auxiliary electrical outlet load test per IEC 62353', 'standard' => 'Chassis leakage < 100 uA', 'is_critical' => 1]
            ]),
            'safety_standards_reference' => 'ASTM F1850 / ISO 80601-2-13 / NFPA 99',
            'status' => 'active',
            'is_auto_generate_work_order' => 1,
            'notes' => 'CRITICAL CALIBRATION HOLD: Vaporizer certification expired. Assigned to OR Suite 1.'
        ],
        [
            'schedule_code' => 'PMS-2026-0004',
            'asset_id' => $getAssetId('EQ-VENT-002', 2),
            'title' => 'Dräger Evita V800 Adult & Pediatric ICU Ventilator Annual Preventive Maintenance Overhaul',
            'maintenance_type' => 'preventive_maintenance',
            'frequency' => 'annual',
            'interval_months' => 12,
            'criticality_tier' => 'life_critical',
            'estimated_duration_hours' => 3.50,
            'last_performed_date' => date('Y-m-d', strtotime('-330 days')),
            'next_due_date' => date('Y-m-d', strtotime('+35 days')),
            'grace_period_days' => 14,
            'service_provider_type' => 'oem_authorized_service',
            'vendor_or_contractor_name' => 'Dräger Medical Field Service Division',
            'contact_phone_or_email' => 'service.draeger@draeger.com / (02) 8999-1234',
            'assigned_engineer_staff_id' => 1,
            'assigned_engineer_name' => 'Engr. David Santos, CBET & Dräger Technical Rep',
            'task_checklist_json' => json_encode([
                ['step' => 1, 'task' => 'Annual OEM PM service kit installation (O-rings, valves, microfilters)', 'standard' => 'Dräger Evita V-series 1-year kit installed', 'is_critical' => 1],
                ['step' => 2, 'task' => 'Expiratory valve disinfection integrity and PEEP membrane seal inspection', 'standard' => 'Zero micro-fissures in silicone membrane', 'is_critical' => 1],
                ['step' => 3, 'task' => 'Ultrasonic flow sensor calibration across neonatal (0.1 L/min) to adult (180 L/min)', 'standard' => 'Flow deviation < 3%', 'is_critical' => 1],
                ['step' => 4, 'task' => 'High-pressure O2 / Air blender valve calibration and gas mixer test', 'standard' => 'FiO2 delivered matches set value +/- 1%', 'is_critical' => 1],
                ['step' => 5, 'task' => 'IEC 62353 Electrical Safety Leakage Current and Ground Bond Resistance check', 'standard' => 'Chassis leakage < 80 uA, Ground < 0.150 Ohm', 'is_critical' => 1]
            ]),
            'safety_standards_reference' => 'ISO 80601-2-12 / IEC 62353',
            'status' => 'active',
            'is_auto_generate_work_order' => 1,
            'notes' => 'Advanced ventilator in Pediatric ICU Bed 2. 1-Year PM kit on standby in biomedical parts depot.'
        ],
        [
            'schedule_code' => 'PMS-2026-0005',
            'asset_id' => $getAssetId('EQ-MON-001', 3),
            'title' => 'Philips IntelliVue MX800 Bedside Patient Monitor Semi-Annual Multi-Parameter Calibration',
            'maintenance_type' => 'calibration_certification',
            'frequency' => 'semi_annual',
            'interval_months' => 6,
            'criticality_tier' => 'high',
            'estimated_duration_hours' => 1.50,
            'last_performed_date' => date('Y-m-d', strtotime('-160 days')),
            'next_due_date' => date('Y-m-d', strtotime('+20 days')),
            'grace_period_days' => 10,
            'service_provider_type' => 'in_house_biomed',
            'vendor_or_contractor_name' => 'In-House Biomedical Engineering Bay',
            'contact_phone_or_email' => 'biomed-lead@hospital.usintellix.internal',
            'assigned_engineer_staff_id' => 1,
            'assigned_engineer_name' => 'Engr. David Santos, CBET (Biomedical Lead)',
            'task_checklist_json' => json_encode([
                ['step' => 1, 'task' => 'ECG 12-lead patient simulator test (Amplitude: 1mV, Heart rate: 60/120/180 BPM)', 'standard' => 'HR displayed within +/- 1 BPM', 'is_critical' => 1],
                ['step' => 2, 'task' => 'Non-Invasive Blood Pressure (NIBP) pneumatic transducer leak test and calibration at 50/150/250 mmHg', 'standard' => 'Transducer error < 3 mmHg', 'is_critical' => 1],
                ['step' => 3, 'task' => 'SpO2 pulse oximeter optical simulator test across 70%-100% saturation range', 'standard' => 'SpO2 reading within +/- 2%', 'is_critical' => 1],
                ['step' => 4, 'task' => 'Invasive Blood Pressure (IBP) channel zero and 200 mmHg sensitivity assay', 'standard' => 'IBP pressure accuracy within 1%', 'is_critical' => 1],
                ['step' => 5, 'task' => 'Chassis leakage current and ground wire integrity test per IEC 62353', 'standard' => 'Ground resistance < 0.200 Ohm', 'is_critical' => 1]
            ]),
            'safety_standards_reference' => 'IEC 60601-2-49 / IEC 62353',
            'status' => 'active',
            'is_auto_generate_work_order' => 1,
            'notes' => 'Central monitor in Cardiac ICU Bed 1.'
        ],
        [
            'schedule_code' => 'PMS-2026-0006',
            'asset_id' => $getAssetId('EQ-PUMP-001', 10),
            'title' => 'B. Braun Space Infusion Syringe Pump Annual Volumetric Flow Accuracy & Occlusion Pressure Test',
            'maintenance_type' => 'preventive_maintenance',
            'frequency' => 'annual',
            'interval_months' => 12,
            'criticality_tier' => 'high',
            'estimated_duration_hours' => 1.25,
            'last_performed_date' => date('Y-m-d', strtotime('-340 days')),
            'next_due_date' => date('Y-m-d', strtotime('+25 days')),
            'grace_period_days' => 7,
            'service_provider_type' => 'in_house_biomed',
            'vendor_or_contractor_name' => 'In-House Biomedical Engineering Bay',
            'contact_phone_or_email' => 'biomed-lead@hospital.usintellix.internal',
            'assigned_engineer_staff_id' => 1,
            'assigned_engineer_name' => 'Engr. David Santos, CBET (Biomedical Lead)',
            'task_checklist_json' => json_encode([
                ['step' => 1, 'task' => 'Syringe barrel clamp sensor and plunger drive mechanism visual/mechanical test', 'standard' => 'Smooth linear drive without binding', 'is_critical' => 1],
                ['step' => 2, 'task' => 'Volumetric accuracy testing at 5 mL/h, 50 mL/h, and 200 mL/h using analytical balance', 'standard' => 'Delivery error < +/- 2%', 'is_critical' => 1],
                ['step' => 3, 'task' => 'Downstream occlusion pressure alarm threshold test (P1 to P9 pressure levels)', 'standard' => 'Alarm activates within +/- 0.2 bar of setpoint', 'is_critical' => 1],
                ['step' => 4, 'task' => 'Drop detector and air-in-line ultrasonic bubble sensor test', 'standard' => 'Triggers on single bubble > 50 uL', 'is_critical' => 1],
                ['step' => 5, 'task' => 'Battery backup operating duration test (minimum 4 hours at 25 mL/h)', 'standard' => 'Run duration > 4 hours', 'is_critical' => 1],
                ['step' => 6, 'task' => 'Chassis leakage current verification per IEC 62353', 'standard' => 'Leakage < 100 uA', 'is_critical' => 1]
            ]),
            'safety_standards_reference' => 'IEC 60601-2-24 / IEC 62353',
            'status' => 'active',
            'is_auto_generate_work_order' => 1,
            'notes' => 'Precision infusion pump for high-potency inotropes & chemotherapy infusions.'
        ]
    ];

    $stmtSched = $pdo->prepare("
        INSERT INTO `biomed_maintenance_schedules` (
            `schedule_code`, `asset_id`, `title`, `maintenance_type`, `frequency`,
            `interval_months`, `criticality_tier`, `estimated_duration_hours`,
            `last_performed_date`, `next_due_date`, `grace_period_days`,
            `service_provider_type`, `vendor_or_contractor_name`, `contact_phone_or_email`,
            `assigned_engineer_staff_id`, `assigned_engineer_name`, `task_checklist_json`,
            `safety_standards_reference`, `status`, `is_auto_generate_work_order`, `notes`
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?
        )
    ");

    $scheduleIds = [];
    foreach ($schedules as $s) {
        $stmtSched->execute([
            $s['schedule_code'], $s['asset_id'], $s['title'], $s['maintenance_type'], $s['frequency'],
            $s['interval_months'], $s['criticality_tier'], $s['estimated_duration_hours'],
            $s['last_performed_date'], $s['next_due_date'], $s['grace_period_days'],
            $s['service_provider_type'], $s['vendor_or_contractor_name'], $s['contact_phone_or_email'],
            $s['assigned_engineer_staff_id'], $s['assigned_engineer_name'], $s['task_checklist_json'],
            $s['safety_standards_reference'], $s['status'], $s['is_auto_generate_work_order'], $s['notes']
        ]);
        $scheduleIds[$s['schedule_code']] = (int)$pdo->lastInsertId();
    }

    echo "  -> Seeded 6 Preventive Maintenance Schedules.\n";

    // 4. Seed Work Orders
    $workOrders = [
        [
            'work_order_number' => 'WO-2026-0001',
            'schedule_id' => $scheduleIds['PMS-2026-0004'] ?? null,
            'asset_id' => $getAssetId('EQ-VENT-002', 2),
            'work_order_type' => 'preventive_maintenance',
            'priority' => 'scheduled_pm',
            'scheduled_date' => date('Y-m-d', strtotime('-30 days')),
            'started_at' => date('Y-m-d 08:30:00', strtotime('-30 days')),
            'completed_at' => date('Y-m-d 11:45:00', strtotime('-30 days')),
            'lead_engineer_name' => 'Engr. David Santos, CBET (Biomedical Lead)',
            'service_vendor_name' => 'Dräger Medical Field Service Division',
            'checklist_audit_json' => json_encode([
                ['step' => 1, 'task' => 'Annual OEM PM service kit installation', 'result' => 'pass', 'value' => 'Kit #8418902 installed'],
                ['step' => 2, 'task' => 'Expiratory valve disinfection integrity and PEEP membrane seal', 'result' => 'pass', 'value' => 'Membrane pliable, 0 fissures'],
                ['step' => 3, 'task' => 'Ultrasonic flow sensor calibration across neonatal to adult', 'result' => 'pass', 'value' => 'Deviation 0.8% (Target < 3%)'],
                ['step' => 4, 'task' => 'High-pressure O2 / Air blender valve calibration', 'result' => 'pass', 'value' => 'FiO2 100% reading: 99.8%'],
                ['step' => 5, 'task' => 'IEC 62353 Electrical Safety Leakage Current & Ground Resistance', 'result' => 'pass', 'value' => 'Leakage: 42 uA, Ground: 0.082 Ohm']
            ]),
            'electrical_safety_passed' => 1,
            'calibration_passed' => 1,
            'chassis_leakage_microamp' => 42.00,
            'ground_resistance_ohms' => 0.082,
            'parts_replaced_json' => json_encode([
                ['part_number' => 'DRG-8418902', 'part_name' => 'Evita V800 1-Year Preventive Service Seal Kit', 'qty' => 1, 'cost' => 680.00],
                ['part_number' => 'DRG-O2-CELL', 'part_name' => 'Paramagnetic O2 Fast Cell Sensor', 'qty' => 1, 'cost' => 320.00]
            ]),
            'labor_hours' => 3.25,
            'total_cost' => 1250.00,
            'findings' => 'Ventilator in good operational state. Expiratory valve membrane and O2 sensor replaced as per 1-year maintenance interval. Electrical safety testing meets IEC 62353 requirements.',
            'corrective_actions' => 'OEM PM kit installed, pressure calibration performed, verified with Bio-Tek VT-Plus HF Gas Flow Analyzer.',
            'status' => 'completed_passed',
            'supervisor_signoff_by' => 'Engr. David Santos, CBET (Biomedical Lead)',
            'supervisor_signed_at' => date('Y-m-d 12:00:00', strtotime('-30 days'))
        ],
        [
            'work_order_number' => 'WO-2026-0002',
            'schedule_id' => $scheduleIds['PMS-2026-0001'] ?? null,
            'asset_id' => $getAssetId('EQ-VENT-001', 1),
            'work_order_type' => 'preventive_maintenance',
            'priority' => 'urgent',
            'scheduled_date' => date('Y-m-d', strtotime('+5 days')),
            'started_at' => null,
            'completed_at' => null,
            'lead_engineer_name' => 'Engr. David Santos, CBET',
            'service_vendor_name' => 'In-House Biomedical Engineering Bay',
            'checklist_audit_json' => null,
            'electrical_safety_passed' => 1,
            'calibration_passed' => 1,
            'chassis_leakage_microamp' => null,
            'ground_resistance_ohms' => null,
            'parts_replaced_json' => null,
            'labor_hours' => 0.00,
            'total_cost' => 0.00,
            'findings' => 'Scheduled semi-annual PM and O2 sensor recalibration due in 5 days. Unit currently in MICU Bay 1.',
            'corrective_actions' => 'Work order pre-authorized. Parts kit reserved.',
            'status' => 'scheduled',
            'supervisor_signoff_by' => null,
            'supervisor_signed_at' => null
        ],
        [
            'work_order_number' => 'WO-2026-0003',
            'schedule_id' => $scheduleIds['PMS-2026-0003'] ?? null,
            'asset_id' => $getAssetId('EQ-ANES-001', 6),
            'work_order_type' => 'calibration_certification',
            'priority' => 'stat_life_critical',
            'scheduled_date' => date('Y-m-d'),
            'started_at' => date('Y-m-d 09:00:00'),
            'completed_at' => null,
            'lead_engineer_name' => 'Engr. Manuel Roxas (GE Field Engineer)',
            'service_vendor_name' => 'GE Healthcare Field Engineering Division',
            'checklist_audit_json' => json_encode([
                ['step' => 1, 'task' => 'Medical gas pipeline inlet pressure check', 'result' => 'pass', 'value' => '52 PSI stable'],
                ['step' => 2, 'task' => 'Sevoflurane electronic vaporizer concentration assay', 'result' => 'fail', 'value' => 'Measured 2.4% vs 2.0% setpoint (+20% error)'],
                ['step' => 3, 'task' => 'Nitrous oxide hypoxic guard fail-safe cutoff', 'result' => 'pass', 'value' => 'Cutoff verified at 24.5% O2']
            ]),
            'electrical_safety_passed' => 1,
            'calibration_passed' => 0,
            'chassis_leakage_microamp' => null,
            'ground_resistance_ohms' => null,
            'parts_replaced_json' => null,
            'labor_hours' => 2.00,
            'total_cost' => 450.00,
            'findings' => 'CRITICAL CALIBRATION DRIFT: Sevoflurane electronic cassette vaporizer is delivering 2.4% concentration at 2.0% dial setpoint (+20% overage). Lockout safety tag applied.',
            'corrective_actions' => 'Machine locked out with RED tag #LOCK-BIOMED-881. GE Healthcare field calibrator on site executing manifold sensor zeroing.',
            'status' => 'in_progress',
            'supervisor_signoff_by' => null,
            'supervisor_signed_at' => null
        ],
        [
            'work_order_number' => 'WO-2026-0004',
            'schedule_id' => $scheduleIds['PMS-2026-0002'] ?? null,
            'asset_id' => $getAssetId('EQ-DEFIB-001', 5),
            'work_order_type' => 'electrical_safety_check',
            'priority' => 'scheduled_pm',
            'scheduled_date' => date('Y-m-d', strtotime('+12 days')),
            'started_at' => null,
            'completed_at' => null,
            'lead_engineer_name' => 'Engr. David Santos, CBET',
            'service_vendor_name' => 'In-House Biomedical Engineering Bay',
            'checklist_audit_json' => null,
            'electrical_safety_passed' => 1,
            'calibration_passed' => 1,
            'chassis_leakage_microamp' => null,
            'ground_resistance_ohms' => null,
            'parts_replaced_json' => null,
            'labor_hours' => 0.00,
            'total_cost' => 0.00,
            'findings' => 'Quarterly electrical safety and 200J energy discharge test scheduled.',
            'corrective_actions' => null,
            'status' => 'scheduled',
            'supervisor_signoff_by' => null,
            'supervisor_signed_at' => null
        ]
    ];

    $stmtWo = $pdo->prepare("
        INSERT INTO `biomed_work_orders` (
            `work_order_number`, `schedule_id`, `asset_id`, `work_order_type`,
            `priority`, `scheduled_date`, `started_at`, `completed_at`,
            `lead_engineer_name`, `service_vendor_name`, `checklist_audit_json`,
            `electrical_safety_passed`, `calibration_passed`, `chassis_leakage_microamp`,
            `ground_resistance_ohms`, `parts_replaced_json`, `labor_hours`,
            `total_cost`, `findings`, `corrective_actions`, `status`,
            `supervisor_signoff_by`, `supervisor_signed_at`
        ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?
        )
    ");

    foreach ($workOrders as $wo) {
        $stmtWo->execute([
            $wo['work_order_number'], $wo['schedule_id'], $wo['asset_id'], $wo['work_order_type'],
            $wo['priority'], $wo['scheduled_date'], $wo['started_at'], $wo['completed_at'],
            $wo['lead_engineer_name'], $wo['service_vendor_name'], $wo['checklist_audit_json'],
            $wo['electrical_safety_passed'], $wo['calibration_passed'], $wo['chassis_leakage_microamp'],
            $wo['ground_resistance_ohms'], $wo['parts_replaced_json'], $wo['labor_hours'],
            $wo['total_cost'], $wo['findings'], $wo['corrective_actions'], $wo['status'],
            $wo['supervisor_signoff_by'], $wo['supervisor_signed_at']
        ]);
    }

    echo "  -> Seeded 4 Biomedical Work Orders.\n";

    // 5. Update Sequence Counters
    $pdo->exec("
        UPDATE `billing_tariff_counters` SET `last_number` = 6 WHERE `counter_type` = 'BIOMED_PM' AND `year` = YEAR(CURRENT_DATE);
        UPDATE `billing_tariff_counters` SET `last_number` = 4 WHERE `counter_type` = 'BIOMED_WO' AND `year` = YEAR(CURRENT_DATE);
    ");

    $pdo->commit();
    echo "Biomedical PM Schedules & Work Orders Seeded Successfully!\n";

} catch (\Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
