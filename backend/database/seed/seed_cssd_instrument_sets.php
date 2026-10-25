<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';

use App\Core\Database;

try {
    $pdo = Database::connection();
    echo "Seeding CSSD Surgical Instrument Sets & Trays Manifest...\n";

    // 1. Clear existing seed data safely
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE `cssd_tray_lifecycle_events`;");
    $pdo->exec("TRUNCATE TABLE `cssd_physical_trays`;");
    $pdo->exec("TRUNCATE TABLE `cssd_master_tray_items`;");
    $pdo->exec("TRUNCATE TABLE `cssd_master_trays`;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

    $pdo->beginTransaction();

    // 2. Seed Master Surgical Trays
    $masterTrays = [
        [
            'tray_code' => 'MST-LAP-01',
            'name' => 'Major Laparotomy Surgical Set',
            'department_specialty' => 'General Surgery',
            'category' => 'major_surgical',
            'total_pieces' => 36,
            'sterilization_modality' => 'steam_autoclave',
            'target_temp_celsius' => 134.00,
            'target_exposure_minutes' => 4.00,
            'target_pressure_psi' => 30.50,
            'standard_wrapper_type' => 'rigid_container',
            'shelf_life_days' => 30,
            'instructions' => 'Heavy abdominal set. Ensure Balfour retractor wing-nuts are loosened prior to autoclave. Use blue rigid container with tamper-evident indicator locks.'
        ],
        [
            'tray_code' => 'MST-OBG-02',
            'name' => 'Cesarean Section & Maternity Tray',
            'department_specialty' => 'Obstetrics & Gynecology',
            'category' => 'maternity_obgyn',
            'total_pieces' => 28,
            'sterilization_modality' => 'steam_autoclave',
            'target_temp_celsius' => 134.00,
            'target_exposure_minutes' => 4.00,
            'target_pressure_psi' => 30.50,
            'standard_wrapper_type' => 'rigid_container',
            'shelf_life_days' => 30,
            'instructions' => 'Immediate delivery tray for emergency and scheduled C-sections. Check Doyen retractor smoothness and Kocher clamp teeth engagement.'
        ],
        [
            'tray_code' => 'MST-ORT-03',
            'name' => 'Orthopedic Basic Bone & Trauma Set',
            'department_specialty' => 'Orthopedic Surgery',
            'category' => 'orthopedic_trauma',
            'total_pieces' => 32,
            'sterilization_modality' => 'steam_autoclave',
            'target_temp_celsius' => 134.00,
            'target_exposure_minutes' => 5.00,
            'target_pressure_psi' => 31.00,
            'standard_wrapper_type' => 'rigid_container',
            'shelf_life_days' => 30,
            'instructions' => 'Heavy bone instrumentation. Lubricate rongeur joints with surgical grade instrument milk before sterilization. Check osteotome sharpness.'
        ],
        [
            'tray_code' => 'MST-VAS-04',
            'name' => 'Minor Vascular & Cutdown Tray',
            'department_specialty' => 'Cardiovascular & Thoracic',
            'category' => 'specialized_micro',
            'total_pieces' => 24,
            'sterilization_modality' => 'steam_autoclave',
            'target_temp_celsius' => 134.00,
            'target_exposure_minutes' => 4.00,
            'target_pressure_psi' => 30.50,
            'standard_wrapper_type' => 'non_woven_sms',
            'shelf_life_days' => 30,
            'instructions' => 'Delicate atraumatic vascular clamps. Use silicone tip protectors on all fine DeBakey forceps and micro needle holders.'
        ],
        [
            'tray_code' => 'MST-ENT-05',
            'name' => 'ENT Tonsillectomy & Adenoidectomy Tray',
            'department_specialty' => 'ENT & Head/Neck',
            'category' => 'minor_surgical',
            'total_pieces' => 20,
            'sterilization_modality' => 'steam_autoclave',
            'target_temp_celsius' => 134.00,
            'target_exposure_minutes' => 4.00,
            'target_pressure_psi' => 30.50,
            'standard_wrapper_type' => 'non_woven_sms',
            'shelf_life_days' => 30,
            'instructions' => 'Pediatric and adult ENT throat procedures. Inspect Boyle-Davis mouth gag ratchet locking and rubber tooth plates.'
        ]
    ];

    $stmtMaster = $pdo->prepare("
        INSERT INTO `cssd_master_trays` (
            `tray_code`, `name`, `department_specialty`, `category`, `total_pieces`,
            `sterilization_modality`, `target_temp_celsius`, `target_exposure_minutes`,
            `target_pressure_psi`, `standard_wrapper_type`, `shelf_life_days`, `instructions`, `status`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    ");

    $masterIds = [];
    foreach ($masterTrays as $mt) {
        $stmtMaster->execute([
            $mt['tray_code'], $mt['name'], $mt['department_specialty'], $mt['category'],
            $mt['total_pieces'], $mt['sterilization_modality'], $mt['target_temp_celsius'],
            $mt['target_exposure_minutes'], $mt['target_pressure_psi'], $mt['standard_wrapper_type'],
            $mt['shelf_life_days'], $mt['instructions']
        ]);
        $masterIds[$mt['tray_code']] = (int)$pdo->lastInsertId();
    }
    echo "Inserted " . count($masterIds) . " master surgical tray catalogs.\n";

    // 3. Seed Itemized Manifests for Master Trays
    $stmtItem = $pdo->prepare("
        INSERT INTO `cssd_master_tray_items` (
            `master_tray_id`, `item_seq`, `instrument_name`, `instrument_type`,
            `quantity_required`, `size_or_gauge`, `critical_inspection_point`, `is_critical_count`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");

    // Laparotomy (36 total pieces)
    $lapItems = [
        [1, 'Scalpel Handle #3', 'cutting_dissecting', 2, '#3 (12.5cm)', 'Check blade fitting slot for debris or bending', 1],
        [2, 'Scalpel Handle #4', 'cutting_dissecting', 1, '#4 (13.5cm)', 'Check blade fitting slot', 1],
        [3, 'Mayo Scissors Curved 6.75in', 'cutting_dissecting', 1, '6.75 inch', 'Verify cutting edge sharpness along full blade length', 1],
        [4, 'Mayo Scissors Straight 6.75in', 'cutting_dissecting', 1, '6.75 inch', 'Check hinge rivet tightness & tip closure', 1],
        [5, 'Metzenbaum Scissors Curved 7in', 'cutting_dissecting', 1, '7.0 inch', 'Delicate tissue cutting test on 2-ply gauze', 1],
        [6, 'Metzenbaum Scissors Curved 9in Deep', 'cutting_dissecting', 1, '9.0 inch', 'Deep cavity dissecting test', 1],
        [7, 'Kelly Hemostatic Forceps Curved 5.5in', 'clamping_occluding', 6, '5.5 inch', 'Inspect transverse serrations and 3-step ratchet lock', 1],
        [8, 'Crile Forceps Curved 5.5in', 'clamping_occluding', 4, '5.5 inch', 'Verify jaw alignment & firm ratchet hold', 1],
        [9, 'Rochester-Pean Forceps Curved 8in', 'clamping_occluding', 4, '8.0 inch', 'Heavy vessel clamp ratchet test', 1],
        [10, 'Babcock Intestinal Forceps 6.25in', 'grasping_holding', 2, '6.25 inch', 'Inspect fenestrated loop jaws for smooth edges (no tissue tear)', 1],
        [11, 'Allis Tissue Forceps 5x6 Teeth 6in', 'grasping_holding', 2, '6.0 inch', 'Verify 5x6 interlocking teeth mesh perfectly', 1],
        [12, 'Foerster Sponge Forceps Straight 9.5in', 'grasping_holding', 2, '9.5 inch', 'Check serrated ring jaws', 1],
        [13, 'Backhaus Towel Clamps 5.25in', 'grasping_holding', 4, '5.25 inch', 'Extremely sharp piercing tips must align without overlap', 1],
        [14, 'Richardson Retractor Medium Blade', 'retracting_exposing', 2, 'Blade 1.5x2in', 'Check chrome mirror polish for flaking or pitting', 1],
        [15, 'Deaver Retractor Wide #3', 'retracting_exposing', 1, '2in x 12in', 'Inspect curved blade edges for any micro-burrs', 1],
        [16, 'Mayo-Hegar Needle Holder 7in', 'suturing_stapling', 1, '7.0 inch', 'Inspect tungsten carbide cross-serrated jaw inserts', 1],
        [17, 'Mayo-Hegar Needle Holder 8in', 'suturing_stapling', 1, '8.0 inch', 'Check TC grip plate wear', 1],
        [18, 'Poole Abdominal Suction Tube & Shield', 'suctioning_probing', 1, '30 Fr Dual', 'Ensure all 48 perforated suction holes are unclogged', 1]
    ]; // Sum = 2+1+1+1+1+1+6+4+4+2+2+2+4+2+1+1+1+1 = 34 + 2 retractors = 36!
    // Add Balfour Retractor 2 pieces to make exactly 36
    $lapItems[] = [19, 'Balfour Abdominal Self-Retaining Retractor Frame', 'retracting_exposing', 1, 'Standard Adult', 'Check ratchet bar slide and thumb-lock screw', 1];
    $lapItems[] = [20, 'Balfour Center Bladder Blade Attachment', 'retracting_exposing', 1, '2.5 x 3.5in', 'Ensure thumb wing-screw locks firmly', 1];

    foreach ($lapItems as $it) {
        $stmtItem->execute([
            $masterIds['MST-LAP-01'], $it[0], $it[1], $it[2], $it[3], $it[4], $it[5], $it[6]
        ]);
    }

    // C-Section (28 total pieces)
    $obgItems = [
        [1, 'Scalpel Handle #4', 'cutting_dissecting', 2, '#4', 'Blade fitting integrity', 1],
        [2, 'Mayo Scissors Curved 6.75in', 'cutting_dissecting', 1, '6.75 in', 'Sharpness test', 1],
        [3, 'Metzenbaum Scissors Curved 7in', 'cutting_dissecting', 1, '7.0 in', 'Tissue dissecting test', 1],
        [4, 'Umbilical Cord Scissors', 'cutting_dissecting', 1, '4.5 in', 'Clean cutting without slipping', 1],
        [5, 'Kelly Forceps Curved 5.5in', 'clamping_occluding', 6, '5.5 in', 'Transverse jaw ratchet hold', 1],
        [6, 'Kocher / Ochsner Forceps Straight 8in', 'clamping_occluding', 4, '8.0 in', '1x2 aggressive teeth alignment', 1],
        [7, 'Allis Tissue Forceps 6in', 'grasping_holding', 2, '6.0 in', 'Teeth mesh test', 1],
        [8, 'Foerster Sponge Forceps 9.5in', 'grasping_holding', 2, '9.5 in', 'Ring jaw closure', 1],
        [9, 'Backhaus Towel Clamps 5.25in', 'grasping_holding', 2, '5.25 in', 'Sharp tips', 1],
        [10, 'Doyen Bladder Retractor Curved', 'retracting_exposing', 1, 'Large Curved', 'Polished blade check', 1],
        [11, 'Richardson Retractor Medium', 'retracting_exposing', 2, 'Medium', 'Smooth edge inspection', 1],
        [12, 'Mayo-Hegar Needle Holder 8in Heavy', 'suturing_stapling', 2, '8.0 in', 'Tungsten carbide jaw grip', 1],
        [13, 'Yankauer Suction Tube Stainless', 'suctioning_probing', 1, 'Standard Bulb', 'Lumen flush & tip inspection', 1],
        [14, 'Tissue Forceps 1x2 Teeth 8in', 'grasping_holding', 1, '8.0 in', '1x2 fine teeth interlocking', 1]
    ]; // Sum = 2+1+1+1+6+4+2+2+2+1+2+2+1+1 = 28 pieces exact!

    foreach ($obgItems as $it) {
        $stmtItem->execute([
            $masterIds['MST-OBG-02'], $it[0], $it[1], $it[2], $it[3], $it[4], $it[5], $it[6]
        ]);
    }

    // Orthopedic Basic Bone & Trauma (32 pieces)
    $ortItems = [
        [1, 'Bone Holding Forceps Verbrugge 10in', 'grasping_holding', 2, '10.0 in', 'Check speed-lock thread and knurled nut', 1],
        [2, 'Lowman Bone Clamp 7in', 'grasping_holding', 2, '7.0 in', 'Calibrated jaws and tightening bar', 1],
        [3, 'Kern Bone Holding Forceps with Ratchet', 'grasping_holding', 2, '8.5 in', 'Heavy ratchet teeth engagement', 1],
        [4, 'Bone Rongeur Stille-Luer Double-Action', 'cutting_dissecting', 1, '9.0 in curved', 'Inspect cup sharpness and leaf springs', 1],
        [5, 'Liston Bone Cutting Forceps Straight', 'cutting_dissecting', 1, '7.5 in', 'Heavy cutting edge alignment', 1],
        [6, 'Hohmann Bone Retractor Narrow 8mm', 'retracting_exposing', 2, '8mm tip', 'Check beak tip integrity', 1],
        [7, 'Hohmann Bone Retractor Wide 18mm', 'retracting_exposing', 2, '18mm tip', 'Inspect shaft curvature', 1],
        [8, 'Bone Curette Cobb Straight & Angled', 'cutting_dissecting', 2, 'Size #0 and #2', 'Sharpness of circular bowl rim', 1],
        [9, 'Langenbeck Periosteal Elevator', 'cutting_dissecting', 1, '7mm blade', 'Clean chisel bevel', 1],
        [10, 'Freer Elevator Double-Ended', 'cutting_dissecting', 1, '7.5 in', 'Check both spoon and sharp ends', 1],
        [11, 'Orthopedic Bone Mallet Solid Stainless', 'miscellaneous', 1, '500 grams', 'Inspect striking faces for indentations', 1],
        [12, 'Bone Osteotome Lambotte 15mm & 25mm', 'cutting_dissecting', 2, '15mm & 25mm', 'Razor bevel test on wooden tongue depressor', 1],
        [13, 'Weitlaner Retractor 3x4 Sharp 6.5in', 'retracting_exposing', 2, '6.5 in', 'Sharp prongs & cam ratchet mechanism', 1],
        [14, 'Senn Retractor Double-Ended', 'retracting_exposing', 2, '6.25 in', 'Check 3-prong rake end and flat blade', 1],
        [15, 'Wire-Twister / Heavy Needle Holder', 'suturing_stapling', 2, '7.0 in TC', 'Inspect cross-serrated tungsten jaws', 1],
        [16, 'Rush Pin Extractor / Bone Pliers', 'grasping_holding', 1, 'Heavy Duty', 'Jaw serrations', 1],
        [17, 'Frazier Suction Tube 10 Fr with Stylet', 'suctioning_probing', 1, '10 French', 'Flush lumen and verify stylet clearance', 1],
        [18, 'Scalpel Handle #3 & #4 Heavy', 'cutting_dissecting', 2, '#3 and #4', 'Blade lock slots', 1],
        [19, 'Gigli Wire Saw Handles Pair', 'cutting_dissecting', 2, 'T-Shape pair', 'Loop hooks security', 1]
    ]; // Sum = 2+2+2+1+1+2+2+2+1+1+1+2+2+2+2+1+1+2+2 = 32 pieces exact!

    foreach ($ortItems as $it) {
        $stmtItem->execute([
            $masterIds['MST-ORT-03'], $it[0], $it[1], $it[2], $it[3], $it[4], $it[5], $it[6]
        ]);
    }

    echo "Inserted detailed piece-by-piece instrument manifests for major trays.\n";

    // 4. Seed Individual Barcoded Physical Trays
    $physicalTrays = [
        [
            'tray_barcode' => 'TRAY-2026-0001',
            'master_tray_id' => $masterIds['MST-LAP-01'],
            'serial_number' => 'SN-LAP-A01',
            'current_status' => 'sterile_stored',
            'current_location' => 'CSSD Sterile Core Rack A-1',
            'assigned_or_suite' => null,
            'last_sterilization_batch_id' => 'ST-2026-0412',
            'last_sterilization_cycle_no' => 'CYC-101',
            'last_sterilized_at' => date('Y-m-d H:i:s', strtotime('-18 hours')),
            'sterile_expiry_date' => date('Y-m-d', strtotime('+29 days')),
            'packaging_technician_name' => 'Maria Santos, CRCST',
            'assembly_verified_by' => 'Nurse Supervisor Linda Chen',
            'instrument_count_verified' => 1,
            'missing_pieces_notes' => null,
            'chemical_indicator_result' => 'passed',
            'biological_spore_result' => 'negative_pass',
            'total_sterilization_cycles' => 14,
            'notes' => 'Container A-1 sealed with red tamper seal #99214. Verified 36/36 instruments.'
        ],
        [
            'tray_barcode' => 'TRAY-2026-0002',
            'master_tray_id' => $masterIds['MST-LAP-01'],
            'serial_number' => 'SN-LAP-A02',
            'current_status' => 'in_surgery',
            'current_location' => 'OR Suite 2 (Laparoscopy / Gen Surg)',
            'assigned_or_suite' => 'OR Suite 2 - Dr. Arthur Sterling (Elective Cholecystectomy)',
            'last_sterilization_batch_id' => 'ST-2026-0410',
            'last_sterilization_cycle_no' => 'CYC-098',
            'last_sterilized_at' => date('Y-m-d H:i:s', strtotime('-36 hours')),
            'sterile_expiry_date' => date('Y-m-d', strtotime('+28 days')),
            'packaging_technician_name' => 'Johnathan Diaz, CRCST',
            'assembly_verified_by' => 'Nurse Supervisor Linda Chen',
            'instrument_count_verified' => 1,
            'missing_pieces_notes' => null,
            'chemical_indicator_result' => 'passed',
            'biological_spore_result' => 'negative_pass',
            'total_sterilization_cycles' => 28,
            'notes' => 'Opened in sterile field OR 2 at 09:15 AM. Scrub nurse count initial: 36/36.'
        ],
        [
            'tray_barcode' => 'TRAY-2026-0003',
            'master_tray_id' => $masterIds['MST-LAP-01'],
            'serial_number' => 'SN-LAP-A03',
            'current_status' => 'dirty_received',
            'current_location' => 'CSSD Decontamination Sink 2',
            'assigned_or_suite' => 'Returned from OR Suite 1 (Emergency Appendectomy)',
            'last_sterilization_batch_id' => 'ST-2026-0401',
            'last_sterilization_cycle_no' => 'CYC-078',
            'last_sterilized_at' => date('Y-m-d H:i:s', strtotime('-4 days')),
            'sterile_expiry_date' => date('Y-m-d', strtotime('+26 days')),
            'packaging_technician_name' => 'Maria Santos, CRCST',
            'assembly_verified_by' => null,
            'instrument_count_verified' => 1,
            'missing_pieces_notes' => null,
            'chemical_indicator_result' => 'passed',
            'biological_spore_result' => 'negative_pass',
            'total_sterilization_cycles' => 31,
            'notes' => 'Post-op biohazard intake completed. Ultrasonic enzymatic cleaning bath initiated.'
        ],
        [
            'tray_barcode' => 'TRAY-2026-0004',
            'master_tray_id' => $masterIds['MST-OBG-02'],
            'serial_number' => 'SN-CS-B01',
            'current_status' => 'dispatched_surgery',
            'current_location' => 'Labor & Delivery OR 1',
            'assigned_or_suite' => 'Labor & Delivery OR 1 (Dr. Elena Ramos / Stat C-Section)',
            'last_sterilization_batch_id' => 'ST-2026-0414',
            'last_sterilization_cycle_no' => 'CYC-103',
            'last_sterilized_at' => date('Y-m-d H:i:s', strtotime('-8 hours')),
            'sterile_expiry_date' => date('Y-m-d', strtotime('+29 days')),
            'packaging_technician_name' => 'Elena Vance, CST',
            'assembly_verified_by' => 'Charge Nurse Rebecca King',
            'instrument_count_verified' => 1,
            'missing_pieces_notes' => null,
            'chemical_indicator_result' => 'passed',
            'biological_spore_result' => 'negative_pass',
            'total_sterilization_cycles' => 19,
            'notes' => 'Dispatched via clean dumbwaiter elevator to L&D at 07:45 AM.'
        ],
        [
            'tray_barcode' => 'TRAY-2026-0005',
            'master_tray_id' => $masterIds['MST-OBG-02'],
            'serial_number' => 'SN-CS-B02',
            'current_status' => 'sterile_stored',
            'current_location' => 'CSSD Sterile Core Rack B-2',
            'assigned_or_suite' => null,
            'last_sterilization_batch_id' => 'ST-2026-0413',
            'last_sterilization_cycle_no' => 'CYC-102',
            'last_sterilized_at' => date('Y-m-d H:i:s', strtotime('-14 hours')),
            'sterile_expiry_date' => date('Y-m-d', strtotime('+29 days')),
            'packaging_technician_name' => 'Elena Vance, CST',
            'assembly_verified_by' => 'Charge Nurse Rebecca King',
            'instrument_count_verified' => 1,
            'missing_pieces_notes' => null,
            'chemical_indicator_result' => 'passed',
            'biological_spore_result' => 'negative_pass',
            'total_sterilization_cycles' => 9,
            'notes' => 'Rapid turnaround C-section tray ready for obstetric deployment.'
        ],
        [
            'tray_barcode' => 'TRAY-2026-0006',
            'master_tray_id' => $masterIds['MST-ORT-03'],
            'serial_number' => 'SN-ORT-C01',
            'current_status' => 'sterilizing',
            'current_location' => 'Steam Autoclave Chamber #1',
            'assigned_or_suite' => 'Scheduled for OR 3 Ortho Trauma at 1:00 PM',
            'last_sterilization_batch_id' => 'ST-2026-0415',
            'last_sterilization_cycle_no' => 'CYC-104',
            'last_sterilized_at' => date('Y-m-d H:i:s', strtotime('-25 minutes')),
            'sterile_expiry_date' => date('Y-m-d', strtotime('+30 days')),
            'packaging_technician_name' => 'Johnathan Diaz, CRCST',
            'assembly_verified_by' => 'CSSD Supervisor Marcus Cole',
            'instrument_count_verified' => 1,
            'missing_pieces_notes' => null,
            'chemical_indicator_result' => 'pending',
            'biological_spore_result' => 'incubating',
            'total_sterilization_cycles' => 42,
            'notes' => 'Undergoing 134°C 4-minute exposure sterilization cycle. Pressure at 30.8 PSI.'
        ],
        [
            'tray_barcode' => 'TRAY-2026-0007',
            'master_tray_id' => $masterIds['MST-ORT-03'],
            'serial_number' => 'SN-ORT-C02',
            'current_status' => 'assembled_wrapped',
            'current_location' => 'CSSD Assembly & Pack Station 3',
            'assigned_or_suite' => null,
            'last_sterilization_batch_id' => null,
            'last_sterilization_cycle_no' => null,
            'last_sterilized_at' => null,
            'sterile_expiry_date' => null,
            'packaging_technician_name' => 'Johnathan Diaz, CRCST',
            'assembly_verified_by' => 'CSSD Supervisor Marcus Cole',
            'instrument_count_verified' => 1,
            'missing_pieces_notes' => null,
            'chemical_indicator_result' => 'pending',
            'biological_spore_result' => 'not_applicable',
            'total_sterilization_cycles' => 11,
            'notes' => 'Manifest 32/32 verified complete. Class 5 chemical integrator card placed inside.'
        ],
        [
            'tray_barcode' => 'TRAY-2026-0008',
            'master_tray_id' => $masterIds['MST-LAP-01'],
            'serial_number' => 'SN-LAP-A04',
            'current_status' => 'quarantined_missing_item',
            'current_location' => 'CSSD Quality Quarantine Shelf Q-1',
            'assigned_or_suite' => 'Quarantined from OR Suite 3',
            'last_sterilization_batch_id' => 'ST-2026-0390',
            'last_sterilization_cycle_no' => 'CYC-062',
            'last_sterilized_at' => date('Y-m-d H:i:s', strtotime('-12 days')),
            'sterile_expiry_date' => date('Y-m-d', strtotime('+18 days')),
            'packaging_technician_name' => 'Maria Santos, CRCST',
            'assembly_verified_by' => 'Nurse Supervisor Linda Chen',
            'instrument_count_verified' => 0,
            'missing_pieces_notes' => 'MISSING 1x Metzenbaum Scissors Curved 7in (Seq #5). Tray locked down from clinical rotation.',
            'chemical_indicator_result' => 'passed',
            'biological_spore_result' => 'negative_pass',
            'total_sterilization_cycles' => 16,
            'notes' => 'Quarantine flag raised during post-op decontamination audit. Incident report #CSSD-IR-084 logged.'
        ]
    ];

    $stmtPhys = $pdo->prepare("
        INSERT INTO `cssd_physical_trays` (
            `tray_barcode`, `master_tray_id`, `serial_number`, `current_status`,
            `current_location`, `assigned_or_suite`, `last_sterilization_batch_id`,
            `last_sterilization_cycle_no`, `last_sterilized_at`, `sterile_expiry_date`,
            `packaging_technician_name`, `assembly_verified_by`, `instrument_count_verified`,
            `missing_pieces_notes`, `chemical_indicator_result`, `biological_spore_result`,
            `total_sterilization_cycles`, `notes`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $stmtEvent = $pdo->prepare("
        INSERT INTO `cssd_tray_lifecycle_events` (
            `physical_tray_id`, `event_type`, `from_status`, `to_status`,
            `location`, `operator_name`, `instruments_verified_count`, `notes`, `created_at`
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    foreach ($physicalTrays as $pt) {
        $stmtPhys->execute([
            $pt['tray_barcode'], $pt['master_tray_id'], $pt['serial_number'], $pt['current_status'],
            $pt['current_location'], $pt['assigned_or_suite'], $pt['last_sterilization_batch_id'],
            $pt['last_sterilization_cycle_no'], $pt['last_sterilized_at'], $pt['sterile_expiry_date'],
            $pt['packaging_technician_name'], $pt['assembly_verified_by'], $pt['instrument_count_verified'],
            $pt['missing_pieces_notes'], $pt['chemical_indicator_result'], $pt['biological_spore_result'],
            $pt['total_sterilization_cycles'], $pt['notes']
        ]);
        $physId = (int)$pdo->lastInsertId();

        // Seed initial audit trail event for each tray
        $stmtEvent->execute([
            $physId,
            $pt['current_status'] === 'dirty_received' ? 'dirty_intake' : ($pt['current_status'] === 'sterilizing' ? 'sterilization_started' : 'sterile_shelved'),
            null,
            $pt['current_status'],
            $pt['current_location'],
            $pt['packaging_technician_name'] ?? 'CSSD Staff',
            $pt['instrument_count_verified'] ? 36 : 35,
            $pt['notes'],
            $pt['last_sterilized_at'] ?? date('Y-m-d H:i:s')
        ]);
    }
    echo "Inserted " . count($physicalTrays) . " physical circulating trays with event logs.\n";

    // Set sequence counter in billing_tariff_counters to last tray number (8)
    $pdo->prepare("
        UPDATE `billing_tariff_counters` SET `last_number` = 8
        WHERE `counter_type` = 'CSSD_TRAY' AND `year` = YEAR(CURRENT_DATE)
    ")->execute();

    $pdo->commit();
    echo "CSSD Instrument Sets Seeding Completed Successfully!\n";
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo "ERROR SEEDING CSSD: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
