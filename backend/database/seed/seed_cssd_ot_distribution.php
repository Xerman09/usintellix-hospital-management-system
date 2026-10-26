<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';

use App\Core\Database;

try {
    $pdo = Database::connection();
    echo "Seeding CSSD OT Distribution, Returns & Missing Instrument Logs...\n";

    // 1. Clear existing seed data safely
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE `cssd_missing_instrument_logs`;");
    $pdo->exec("TRUNCATE TABLE `cssd_tray_return_reconciliations`;");
    $pdo->exec("TRUNCATE TABLE `cssd_ot_dispatches`;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    $pdo->beginTransaction();

    // 2. Fetch required trays and cases for FK references
    $tray1 = $pdo->query("SELECT id, tray_barcode, master_tray_id FROM cssd_physical_trays WHERE id = 1")->fetch(PDO::FETCH_ASSOC);
    $tray2 = $pdo->query("SELECT id, tray_barcode, master_tray_id FROM cssd_physical_trays WHERE id = 2")->fetch(PDO::FETCH_ASSOC);
    $tray3 = $pdo->query("SELECT id, tray_barcode, master_tray_id FROM cssd_physical_trays WHERE id = 3")->fetch(PDO::FETCH_ASSOC);
    $tray4 = $pdo->query("SELECT id, tray_barcode, master_tray_id FROM cssd_physical_trays WHERE id = 4")->fetch(PDO::FETCH_ASSOC);
    $tray8 = $pdo->query("SELECT id, tray_barcode, master_tray_id FROM cssd_physical_trays WHERE id = 8")->fetch(PDO::FETCH_ASSOC);

    // Fallbacks if IDs differ
    if (!$tray1) $tray1 = ['id' => 1, 'tray_barcode' => 'TRAY-2026-0001', 'master_tray_id' => 1];
    if (!$tray2) $tray2 = ['id' => 2, 'tray_barcode' => 'TRAY-2026-0002', 'master_tray_id' => 2];
    if (!$tray3) $tray3 = ['id' => 3, 'tray_barcode' => 'TRAY-2026-0003', 'master_tray_id' => 3];
    if (!$tray4) $tray4 = ['id' => 4, 'tray_barcode' => 'TRAY-2026-0004', 'master_tray_id' => 4];
    if (!$tray8) $tray8 = ['id' => 8, 'tray_barcode' => 'TRAY-2026-0008', 'master_tray_id' => 5];

    // Seed Dispatches
    $dispatches = [
        [
            'dispatch_number' => 'DISP-2026-0001',
            'physical_tray_id' => $tray1['id'],
            'tray_barcode' => $tray1['tray_barcode'],
            'master_tray_id' => $tray1['master_tray_id'],
            'surgical_case_id' => 1,
            'surgical_case_number' => 'OR-2026-0101',
            'or_suite_name' => 'OR Suite 1 - General Surgery',
            'patient_id' => 1,
            'patient_name' => 'Joshua Miguel Reyes',
            'procedure_name' => 'Laparoscopic Cholecystectomy with Cholangiogram',
            'primary_surgeon' => 'Dr. Mark Villareal, MD, FPCS',
            'circulating_nurse' => 'Nurse Patrick Dizon, RN',
            'scrub_nurse' => 'Nurse Teresa Aquino, RN',
            'dispatched_by_name' => 'CSSD Tech Roberto Luna',
            'received_by_name' => 'Nurse Patrick Dizon, RN',
            'dispatched_at' => date('Y-m-d H:i:s', strtotime('-4 hours')),
            'received_in_or_at' => date('Y-m-d H:i:s', strtotime('-3 hours 45 minutes')),
            'sterility_verified' => 1,
            'chemical_indicator_checked' => 1,
            'sterile_expiry_date' => date('Y-m-d', strtotime('+120 days')),
            'dispatch_status' => 'returned_to_cssd',
            'case_priority' => 'elective',
            'transport_container_barcode' => 'CART-OR-01',
            'notes' => 'Sterile seal and Class 5 indicator verified intact upon delivery.'
        ],
        [
            'dispatch_number' => 'DISP-2026-0002',
            'physical_tray_id' => $tray2['id'],
            'tray_barcode' => $tray2['tray_barcode'],
            'master_tray_id' => $tray2['master_tray_id'],
            'surgical_case_id' => 2,
            'surgical_case_number' => 'OR-2026-0102',
            'or_suite_name' => 'OR Suite 2 - Ortho & Trauma',
            'patient_id' => 2,
            'patient_name' => 'Danilo Macapagal Castro',
            'procedure_name' => 'Right Total Knee Arthroplasty (TKA)',
            'primary_surgeon' => 'Dr. Robert Tan, MD, FPOA',
            'circulating_nurse' => 'Nurse Gina Santos, RN',
            'scrub_nurse' => 'Nurse Eduardo Cruz, RN',
            'dispatched_by_name' => 'CSSD Tech Roberto Luna',
            'received_by_name' => 'Nurse Gina Santos, RN',
            'dispatched_at' => date('Y-m-d H:i:s', strtotime('-2 hours')),
            'received_in_or_at' => date('Y-m-d H:i:s', strtotime('-1 hour 50 minutes')),
            'sterility_verified' => 1,
            'chemical_indicator_checked' => 1,
            'sterile_expiry_date' => date('Y-m-d', strtotime('+150 days')),
            'dispatch_status' => 'in_surgery',
            'case_priority' => 'elective',
            'transport_container_barcode' => 'CART-ORTHO-02',
            'notes' => 'Heavy orthopedic instrumentation. Temperature & humidity tags checked.'
        ],
        [
            'dispatch_number' => 'DISP-2026-0003',
            'physical_tray_id' => $tray4['id'],
            'tray_barcode' => $tray4['tray_barcode'],
            'master_tray_id' => $tray4['master_tray_id'],
            'surgical_case_id' => null,
            'surgical_case_number' => null,
            'or_suite_name' => 'Labor & Delivery OR 1',
            'patient_id' => null,
            'patient_name' => 'Maria Kristina Gonzales',
            'procedure_name' => 'Emergency Cesarean Delivery (C-Section)',
            'primary_surgeon' => 'Dr. Elena Ramos, MD, FPOGS',
            'circulating_nurse' => 'Nurse Carmela Valerio, RN',
            'scrub_nurse' => 'Nurse Joanne Lim, RN',
            'dispatched_by_name' => 'CSSD Tech Juan Reyes',
            'received_by_name' => 'Nurse Carmela Valerio, RN',
            'dispatched_at' => date('Y-m-d H:i:s', strtotime('-1 hour')),
            'received_in_or_at' => date('Y-m-d H:i:s', strtotime('-50 minutes')),
            'sterility_verified' => 1,
            'chemical_indicator_checked' => 1,
            'sterile_expiry_date' => date('Y-m-d', strtotime('+160 days')),
            'dispatch_status' => 'in_surgery',
            'case_priority' => 'stat_emergency',
            'transport_container_barcode' => 'TOTE-OB-01',
            'notes' => 'STAT Emergency dispatch for fetal distress indication.'
        ],
        [
            'dispatch_number' => 'DISP-2026-0004',
            'physical_tray_id' => $tray3['id'],
            'tray_barcode' => $tray3['tray_barcode'],
            'master_tray_id' => $tray3['master_tray_id'],
            'surgical_case_id' => null,
            'surgical_case_number' => 'OR-2026-0099',
            'or_suite_name' => 'Emergency Minor OR',
            'patient_id' => null,
            'patient_name' => 'Gabriel Alonzo Perez',
            'procedure_name' => 'Emergency Wound Debridement & Tendon Repair',
            'primary_surgeon' => 'Dr. Arthur Sterling, MD, FACS',
            'circulating_nurse' => 'Nurse Michael Torres, RN',
            'scrub_nurse' => 'Nurse Teresa Aquino, RN',
            'dispatched_by_name' => 'CSSD Tech Roberto Luna',
            'received_by_name' => 'Nurse Michael Torres, RN',
            'dispatched_at' => date('Y-m-d H:i:s', strtotime('-6 hours')),
            'received_in_or_at' => date('Y-m-d H:i:s', strtotime('-5 hours 45 minutes')),
            'sterility_verified' => 1,
            'chemical_indicator_checked' => 1,
            'sterile_expiry_date' => date('Y-m-d', strtotime('+90 days')),
            'dispatch_status' => 'returned_to_cssd',
            'case_priority' => 'urgent',
            'transport_container_barcode' => 'CART-EMERG-03',
            'notes' => 'Returned post-op to CSSD Decontamination.'
        ],
        [
            'dispatch_number' => 'DISP-2026-0005',
            'physical_tray_id' => $tray8['id'],
            'tray_barcode' => $tray8['tray_barcode'],
            'master_tray_id' => $tray8['master_tray_id'],
            'surgical_case_id' => 4,
            'surgical_case_number' => 'OR-2026-0104',
            'or_suite_name' => 'OR Suite 4 - Neurosurgery & Spine',
            'patient_id' => 4,
            'patient_name' => 'Alfonso Carandang Soriano',
            'procedure_name' => 'Right Frontotemporal Craniotomy and Aneurysm Clipping',
            'primary_surgeon' => 'Dr. Antonio Delgado, MD, FPCS, FICS',
            'circulating_nurse' => 'Nurse Maria Ocampo, RN',
            'scrub_nurse' => 'Nurse Gabriel Santos, RN',
            'dispatched_by_name' => 'CSSD Tech Juan Reyes',
            'received_by_name' => 'Nurse Maria Ocampo, RN',
            'dispatched_at' => date('Y-m-d H:i:s', strtotime('-8 hours')),
            'received_in_or_at' => date('Y-m-d H:i:s', strtotime('-7 hours 45 minutes')),
            'sterility_verified' => 1,
            'chemical_indicator_checked' => 1,
            'sterile_expiry_date' => date('Y-m-d', strtotime('+140 days')),
            'dispatch_status' => 'quarantined_incident',
            'case_priority' => 'elective',
            'transport_container_barcode' => 'CART-NEURO-01',
            'notes' => 'Returned with missing aneurysm clip applier and bent micro forceps.'
        ]
    ];

    $stmtDisp = $pdo->prepare("
        INSERT INTO `cssd_ot_dispatches` (
            `dispatch_number`, `physical_tray_id`, `tray_barcode`, `master_tray_id`,
            `surgical_case_id`, `surgical_case_number`, `or_suite_name`, `patient_id`,
            `patient_name`, `procedure_name`, `primary_surgeon`, `circulating_nurse`,
            `scrub_nurse`, `dispatched_by_name`, `received_by_name`, `dispatched_at`,
            `received_in_or_at`, `sterility_verified`, `chemical_indicator_checked`,
            `sterile_expiry_date`, `dispatch_status`, `case_priority`,
            `transport_container_barcode`, `notes`
        ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?
        )
    ");

    $dispatchIds = [];
    foreach ($dispatches as $d) {
        $stmtDisp->execute([
            $d['dispatch_number'], $d['physical_tray_id'], $d['tray_barcode'], $d['master_tray_id'],
            $d['surgical_case_id'], $d['surgical_case_number'], $d['or_suite_name'], $d['patient_id'],
            $d['patient_name'], $d['procedure_name'], $d['primary_surgeon'], $d['circulating_nurse'],
            $d['scrub_nurse'], $d['dispatched_by_name'], $d['received_by_name'], $d['dispatched_at'],
            $d['received_in_or_at'], $d['sterility_verified'], $d['chemical_indicator_checked'],
            $d['sterile_expiry_date'], $d['dispatch_status'], $d['case_priority'],
            $d['transport_container_barcode'], $d['notes']
        ]);
        $dispatchIds[$d['dispatch_number']] = (int)$pdo->lastInsertId();
    }

    echo "  -> Seeded 5 OT Dispatches.\n";

    // 3. Seed Return Reconciliations
    $returns = [
        [
            'return_number' => 'RET-2026-0001',
            'dispatch_id' => $dispatchIds['DISP-2026-0004'] ?? null,
            'physical_tray_id' => $tray3['id'],
            'tray_barcode' => $tray3['tray_barcode'],
            'surgical_case_id' => null,
            'returned_from_or_suite' => 'Emergency Minor OR',
            'returned_by_name' => 'Nurse Michael Torres, RN',
            'received_by_cssd_tech' => 'CSSD Decontamination Tech Danilo Santos',
            'received_at' => date('Y-m-d H:i:s', strtotime('-2 hours 30 minutes')),
            'expected_pieces' => 18,
            'counted_pieces' => 18,
            'missing_count' => 0,
            'damaged_count' => 0,
            'bioburden_level' => 'moderate',
            'reconciliation_status' => 'reconciled_complete',
            'is_rsi_alert_triggered' => 0,
            'checklist_audit_json' => json_encode([
                ['seq' => 1, 'name' => 'Scalpel Handle #3', 'status' => 'present'],
                ['seq' => 2, 'name' => 'Curved Mayo Scissors 6.75"', 'status' => 'present'],
                ['seq' => 3, 'name' => 'Metzenbaum Scissors 7"', 'status' => 'present'],
                ['seq' => 4, 'name' => 'Adson Tissue Forceps 1x2 Teeth', 'status' => 'present'],
                ['seq' => 5, 'name' => 'Kelly Forceps Curved (4 pcs)', 'status' => 'present'],
                ['seq' => 6, 'name' => 'Mosquito Forceps Curved (4 pcs)', 'status' => 'present'],
                ['seq' => 7, 'name' => 'Senn Retractor Pair', 'status' => 'present'],
                ['seq' => 8, 'name' => 'Mayo-Hegar Needle Holder 7"', 'status' => 'present'],
                ['seq' => 9, 'name' => 'Yankauer Suction Tube with Tip', 'status' => 'present']
            ]),
            'decon_bay_assigned' => 'Decon Bay 1 - Ultrasonic Tank A',
            'notes' => 'All 18 items accounted for. Transferred to ultrasonic pre-wash.'
        ],
        [
            'return_number' => 'RET-2026-0002',
            'dispatch_id' => $dispatchIds['DISP-2026-0005'] ?? null,
            'physical_tray_id' => $tray8['id'],
            'tray_barcode' => $tray8['tray_barcode'],
            'surgical_case_id' => 4,
            'returned_from_or_suite' => 'OR Suite 4 - Neurosurgery & Spine',
            'returned_by_name' => 'Nurse Maria Ocampo, RN',
            'received_by_cssd_tech' => 'CSSD Decontamination Tech Danilo Santos',
            'received_at' => date('Y-m-d H:i:s', strtotime('-1 hour 15 minutes')),
            'expected_pieces' => 24,
            'counted_pieces' => 22,
            'missing_count' => 1,
            'damaged_count' => 1,
            'bioburden_level' => 'heavy_gross_blood',
            'reconciliation_status' => 'quarantined_safety_incident',
            'is_rsi_alert_triggered' => 1,
            'checklist_audit_json' => json_encode([
                ['seq' => 1, 'name' => 'Yasargil Micro Scissors Straight', 'status' => 'present'],
                ['seq' => 2, 'name' => 'Micro Yasargil Aneurysm Clip Applier', 'status' => 'missing', 'incident' => 'RSI Alert: Missing post-craniotomy'],
                ['seq' => 3, 'name' => 'Micro-Bipolar Coagulation Forceps 7in', 'status' => 'damaged', 'incident' => 'Tip bent and cracked insulation'],
                ['seq' => 4, 'name' => 'Bipolar Cable 3m', 'status' => 'present'],
                ['seq' => 5, 'name' => 'Rhoton Micro Dissector #1 to #6', 'status' => 'present'],
                ['seq' => 6, 'name' => 'Frazier Suction Cannula 8 Fr & 10 Fr', 'status' => 'present'],
                ['seq' => 7, 'name' => 'Leyla-Yasargil Flexible Brain Retractor Arm', 'status' => 'present']
            ]),
            'decon_bay_assigned' => 'Quarantine Biohazard Holding Rack Q-1',
            'notes' => 'CRITICAL RSI INCIDENT: 1 Aneurysm Clip Applier missing from tray return. OR Suite 4 alerted immediately.'
        ]
    ];

    $stmtRet = $pdo->prepare("
        INSERT INTO `cssd_tray_return_reconciliations` (
            `return_number`, `dispatch_id`, `physical_tray_id`, `tray_barcode`,
            `surgical_case_id`, `returned_from_or_suite`, `returned_by_name`,
            `received_by_cssd_tech`, `received_at`, `expected_pieces`,
            `counted_pieces`, `missing_count`, `damaged_count`,
            `bioburden_level`, `reconciliation_status`, `is_rsi_alert_triggered`,
            `checklist_audit_json`, `decon_bay_assigned`, `notes`
        ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?
        )
    ");

    $returnIds = [];
    foreach ($returns as $r) {
        $stmtRet->execute([
            $r['return_number'], $r['dispatch_id'], $r['physical_tray_id'], $r['tray_barcode'],
            $r['surgical_case_id'], $r['returned_from_or_suite'], $r['returned_by_name'],
            $r['received_by_cssd_tech'], $r['received_at'], $r['expected_pieces'],
            $r['counted_pieces'], $r['missing_count'], $r['damaged_count'],
            $r['bioburden_level'], $r['reconciliation_status'], $r['is_rsi_alert_triggered'],
            $r['checklist_audit_json'], $r['decon_bay_assigned'], $r['notes']
        ]);
        $returnIds[$r['return_number']] = (int)$pdo->lastInsertId();
    }

    echo "  -> Seeded 2 Tray Return Reconciliations.\n";

    // 4. Seed Missing Instrument Logs / RSI Incident Records
    $incidents = [
        [
            'incident_number' => 'INC-2026-0001',
            'return_id' => $returnIds['RET-2026-0002'] ?? null,
            'dispatch_id' => $dispatchIds['DISP-2026-0005'] ?? null,
            'physical_tray_id' => $tray8['id'],
            'tray_barcode' => $tray8['tray_barcode'],
            'master_tray_name' => 'Specialized Neurosurgical Micro Set',
            'master_tray_item_id' => 2,
            'instrument_name' => 'Micro Yasargil Aneurysm Clip Applier',
            'instrument_type' => 'clamping_occluding',
            'quantity_missing' => 1,
            'quantity_damaged' => 0,
            'incident_type' => 'retained_surgical_item_risk',
            'severity_level' => 'critical_rsi_alert',
            'or_suite_name' => 'OR Suite 4 - Neurosurgery & Spine',
            'surgical_case_id' => 4,
            'patient_mrn' => 'MRN-2026-0104',
            'lead_surgeon' => 'Dr. Antonio Delgado, MD, FPCS, FICS',
            'circulating_nurse' => 'Nurse Maria Ocampo, RN',
            'scrub_nurse' => 'Nurse Gabriel Santos, RN',
            'investigation_status' => 'found_in_or_linens',
            'xray_ordered' => 1,
            'xray_findings' => 'Intraoperative C-Arm fluoroscopy negative for radiopaque surgical instrument in cranial operative field.',
            'xray_performed_at' => date('Y-m-d H:i:s', strtotime('-1 hour')),
            'found_location_details' => 'Found wrapped within blue sterile Mayo stand drape inside OR 4 dirty linen hamper.',
            'reported_at' => date('Y-m-d H:i:s', strtotime('-1 hour 15 minutes')),
            'reported_by_name' => 'Danilo Santos (CSSD Decon Tech)',
            'investigated_by_name' => 'Nurse Maria Ocampo, RN (OR 4 Circulator)',
            'resolved_at' => date('Y-m-d H:i:s', strtotime('-30 minutes')),
            'resolution_notes' => 'Patient cleared by Dr. Delgado. Instrument recovered intact from linen hamper, ultrasonic cleaned, and returned to CSSD inventory.',
            'corrective_action' => 'Mandatory secondary linen shake-down protocol reinforced for scrub nurse and orderly.'
        ],
        [
            'incident_number' => 'INC-2026-0002',
            'return_id' => $returnIds['RET-2026-0002'] ?? null,
            'dispatch_id' => $dispatchIds['DISP-2026-0005'] ?? null,
            'physical_tray_id' => $tray8['id'],
            'tray_barcode' => $tray8['tray_barcode'],
            'master_tray_name' => 'Specialized Neurosurgical Micro Set',
            'master_tray_item_id' => 3,
            'instrument_name' => 'Micro-Bipolar Coagulation Forceps 7in',
            'instrument_type' => 'clamping_occluding',
            'quantity_missing' => 0,
            'quantity_damaged' => 1,
            'incident_type' => 'damaged_blunt_cracked',
            'severity_level' => 'minor_maintenance',
            'or_suite_name' => 'OR Suite 4 - Neurosurgery & Spine',
            'surgical_case_id' => 4,
            'patient_mrn' => 'MRN-2026-0104',
            'lead_surgeon' => 'Dr. Antonio Delgado, MD, FPCS, FICS',
            'circulating_nurse' => 'Nurse Maria Ocampo, RN',
            'scrub_nurse' => 'Nurse Gabriel Santos, RN',
            'investigation_status' => 'sent_for_repair',
            'xray_ordered' => 0,
            'xray_findings' => null,
            'xray_performed_at' => null,
            'found_location_details' => 'Returned inside container with mechanical tip distortion.',
            'reported_at' => date('Y-m-d H:i:s', strtotime('-1 hour 10 minutes')),
            'reported_by_name' => 'Danilo Santos (CSSD Decon Tech)',
            'investigated_by_name' => 'Nurse Maria Santos, RN (CSSD Supervisor)',
            'resolved_at' => null,
            'resolution_notes' => 'Insulation recoating and tip realignment required. RMA #RMA-NEURO-8819 issued to Karl Storz service center.',
            'corrective_action' => 'Sent to manufacturer authorized repair facility; backup loaner forceps placed in tray.'
        ],
        [
            'incident_number' => 'INC-2026-0003',
            'return_id' => null,
            'dispatch_id' => null,
            'physical_tray_id' => $tray1['id'],
            'tray_barcode' => $tray1['tray_barcode'],
            'master_tray_name' => 'Major Laparotomy Surgical Set',
            'master_tray_item_id' => null,
            'instrument_name' => 'Curved Kelly Hemostatic Forceps 5.5 in',
            'instrument_type' => 'clamping_occluding',
            'quantity_missing' => 1,
            'quantity_damaged' => 0,
            'incident_type' => 'missing_unaccounted',
            'severity_level' => 'high_priority',
            'or_suite_name' => 'OR Suite 3 - L&D C-Section',
            'surgical_case_id' => null,
            'patient_mrn' => null,
            'lead_surgeon' => 'Dr. Elena Ramos, MD, FPOGS',
            'circulating_nurse' => 'Nurse Carmela Valerio, RN',
            'scrub_nurse' => 'Nurse Joanne Lim, RN',
            'investigation_status' => 'active_search_in_or',
            'xray_ordered' => 1,
            'xray_findings' => 'Abdominal scout film clear. Suspected dropped off sterile field or trapped in suction waste canister.',
            'xray_performed_at' => date('Y-m-d H:i:s', strtotime('-5 hours')),
            'found_location_details' => null,
            'reported_at' => date('Y-m-d H:i:s', strtotime('-6 hours')),
            'reported_by_name' => 'Danilo Santos (CSSD Decon Tech)',
            'investigated_by_name' => 'Nurse Maria Santos, RN (CSSD Supervisor)',
            'resolved_at' => null,
            'resolution_notes' => 'Active search underway. Tray quarantined in holding bay until piece located or replacement authorized.',
            'corrective_action' => 'Waste bag inspection and biohazard canister protocol initiated.'
        ]
    ];

    $stmtInc = $pdo->prepare("
        INSERT INTO `cssd_missing_instrument_logs` (
            `incident_number`, `return_id`, `dispatch_id`, `physical_tray_id`,
            `tray_barcode`, `master_tray_name`, `master_tray_item_id`, `instrument_name`,
            `instrument_type`, `quantity_missing`, `quantity_damaged`, `incident_type`,
            `severity_level`, `or_suite_name`, `surgical_case_id`, `patient_mrn`,
            `lead_surgeon`, `circulating_nurse`, `scrub_nurse`, `investigation_status`,
            `xray_ordered`, `xray_findings`, `xray_performed_at`, `found_location_details`,
            `reported_at`, `reported_by_name`, `investigated_by_name`, `resolved_at`,
            `resolution_notes`, `corrective_action`
        ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?
        )
    ");

    foreach ($incidents as $inc) {
        $stmtInc->execute([
            $inc['incident_number'], $inc['return_id'], $inc['dispatch_id'], $inc['physical_tray_id'],
            $inc['tray_barcode'], $inc['master_tray_name'], $inc['master_tray_item_id'], $inc['instrument_name'],
            $inc['instrument_type'], $inc['quantity_missing'], $inc['quantity_damaged'], $inc['incident_type'],
            $inc['severity_level'], $inc['or_suite_name'], $inc['surgical_case_id'], $inc['patient_mrn'],
            $inc['lead_surgeon'], $inc['circulating_nurse'], $inc['scrub_nurse'], $inc['investigation_status'],
            $inc['xray_ordered'], $inc['xray_findings'], $inc['xray_performed_at'], $inc['found_location_details'],
            $inc['reported_at'], $inc['reported_by_name'], $inc['investigated_by_name'], $inc['resolved_at'],
            $inc['resolution_notes'], $inc['corrective_action']
        ]);
    }

    echo "  -> Seeded 3 Missing Instrument Incident Records.\n";

    // 5. Update Sequence Counters
    $pdo->exec("
        UPDATE `billing_tariff_counters` SET `last_number` = 5 WHERE `counter_type` = 'CSSD_DISPATCH' AND `year` = YEAR(CURRENT_DATE);
        UPDATE `billing_tariff_counters` SET `last_number` = 2 WHERE `counter_type` = 'CSSD_RETURN' AND `year` = YEAR(CURRENT_DATE);
        UPDATE `billing_tariff_counters` SET `last_number` = 3 WHERE `counter_type` = 'CSSD_INCIDENT' AND `year` = YEAR(CURRENT_DATE);
    ");

    $pdo->commit();
    echo "CSSD OT Distribution & Missing Instrument Logs Seeded Successfully!\n";

} catch (\Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
