<?php
require_once 'backend/app/Core/Autoload.php';

use App\Core\Database;

$db = Database::connection();

// 1. Run the schema creation
$sql = file_get_contents('backend/database/schema/105_or_management.sql');
$db->exec($sql);
echo "Tables or_suites and or_surgical_cases created successfully.\n";

// 2. Clear old data if re-seeding
$db->exec("SET FOREIGN_KEY_CHECKS = 0;");
$db->exec("TRUNCATE TABLE or_surgical_cases;");
$db->exec("TRUNCATE TABLE or_suites;");
$db->exec("SET FOREIGN_KEY_CHECKS = 1;");

// 3. Seed Suites
$suites = [
    [
        'suite_code' => 'OR-01',
        'suite_name' => 'OR Suite 1 - General Surgery',
        'suite_type' => 'Major OR',
        'floor_location' => '3rd Floor - Main Surgical Tower',
        'status' => 'In Surgery',
        'equipment_spec' => 'HD 4K Laparoscopy Tower, Valleylab FT10 Cautery, Stryker Suction, Anesthesia Workstation Datex-Ohmeda',
    ],
    [
        'suite_code' => 'OR-02',
        'suite_name' => 'OR Suite 2 - Ortho & Trauma',
        'suite_type' => 'Major OR',
        'floor_location' => '3rd Floor - Main Surgical Tower',
        'status' => 'Cleaning / Turnover',
        'equipment_spec' => 'Siemens C-Arm Fluoroscopy, Orthopedic Radiotransparent Traction Table, Stryker System 8 Power Tools',
    ],
    [
        'suite_code' => 'OR-03',
        'suite_name' => 'OR Suite 3 - Cardiothoracic & Vascular',
        'suite_type' => 'Major OR',
        'floor_location' => '3rd Floor - Main Surgical Tower',
        'status' => 'Available',
        'equipment_spec' => 'Heart-Lung Cardiopulmonary Bypass Machine, Maquet IABP, GE Vivid TEE Ultrasound, Medtronic Cell Saver',
    ],
    [
        'suite_code' => 'OR-04',
        'suite_name' => 'OR Suite 4 - Neurosurgery & Spine',
        'suite_type' => 'Major OR',
        'floor_location' => '3rd Floor - Main Surgical Tower',
        'status' => 'In Surgery',
        'equipment_spec' => 'Zeiss Kinevo 900 Surgical Microscope, Medtronic StealthStation Neuronavigation, Mayfield Skull Clamp',
    ],
    [
        'suite_code' => 'OR-05',
        'suite_name' => 'Minor OR Suite - Ambulatory',
        'suite_type' => 'Minor OR',
        'floor_location' => '2nd Floor - Outpatient Surgical Wing',
        'status' => 'Available',
        'equipment_spec' => 'Day Surgery Table, ConMed Electrosurgical Generator, Dual Mobile Surgical LED Lights, Bair Hugger',
    ],
    [
        'suite_code' => 'OR-06',
        'suite_name' => 'Endoscopy & GI Suite',
        'suite_type' => 'Endoscopy',
        'floor_location' => '2nd Floor - Diagnostic Center',
        'status' => 'In Surgery',
        'equipment_spec' => 'Olympus EVIS X1 Video Endoscopy System, CO2 Insufflator, ERBE VIO 3 Electrosurgical Unit',
    ],
];

$suiteStmt = $db->prepare("
    INSERT INTO or_suites (suite_code, suite_name, suite_type, floor_location, status, equipment_spec, is_active)
    VALUES (:suite_code, :suite_name, :suite_type, :floor_location, :status, :equipment_spec, 1)
");

$suiteMap = [];
foreach ($suites as $s) {
    $suiteStmt->execute($s);
    $suiteMap[$s['suite_code']] = [
        'id' => (int) $db->lastInsertId(),
        'name' => $s['suite_name']
    ];
}
echo "Seeded " . count($suites) . " OR Suites.\n";

// 4. Fetch registered patients from `patients` table
$patients = $db->query("SELECT id, patient_no, first_name, middle_name, last_name, sex, birthdate FROM patients ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);

function getAge($dob) {
    if (!$dob) return 45;
    return (new DateTime())->diff(new DateTime($dob))->y;
}

function getFullName($p) {
    return trim(($p['first_name'] ?? '') . ' ' . ($p['middle_name'] ?? '') . ' ' . ($p['last_name'] ?? ''));
}

$today = date('Y-m-d');
$yesterday = date('Y-m-d', strtotime('-1 day'));
$tomorrow = date('Y-m-d', strtotime('+1 day'));

// Seed surgical cases
$cases = [
    // Case 1: In Room / Incision right now in OR-01 (General Surgery)
    [
        'case_number' => 'OR-' . date('Y') . '-0101',
        'patient_idx' => 27, // Joshua Miguel Reyes
        'suite_code' => 'OR-01',
        'scheduled_date' => $today,
        'scheduled_start_time' => '08:00:00',
        'scheduled_end_time' => '10:30:00',
        'estimated_duration_minutes' => 150,
        'actual_in_room_time' => $today . ' 07:55:00',
        'actual_incision_time' => $today . ' 08:22:00',
        'actual_closing_time' => null,
        'actual_out_room_time' => null,
        'surgical_specialty' => 'General Surgery',
        'procedure_name' => 'Laparoscopic Cholecystectomy with Cholangiogram',
        'preop_diagnosis' => 'Acute Cholecystitis with Cholelithiasis',
        'postop_diagnosis' => null,
        'lead_surgeon' => 'Dr. Mark Villareal, MD, FPCS',
        'assistant_surgeon' => 'Dr. Carlo Mendoza, MD',
        'anesthesiologist' => 'Dr. Karen Ong, MD, DPBA',
        'scrub_nurse' => 'Nurse Joy Ramos, RN',
        'circulating_nurse' => 'Nurse Patrick Dizon, RN',
        'anesthesia_type' => 'General (Endotracheal)',
        'case_priority' => 'Urgent',
        'perioperative_stage' => 'Incision / In Progress',
        'preop_cleared' => 1,
        'consent_signed' => 1,
        'blood_reserved' => 1,
        'blood_units_reserved' => 2,
        'implants_required' => 0,
        'implant_details' => null,
        'estimated_blood_loss_ml' => 50,
        'specimens_sent' => 'Gallbladder to Pathology (Routine Histology)',
        'pacu_bed_no' => null,
        'pacu_aldrete_score' => null,
        'postop_disposition' => 'PACU',
        'notes' => 'Pneumoperitoneum established safely. Adhesions noted around cystic duct.',
    ],
    // Case 2: In PACU from OR-02 (Orthopedics)
    [
        'case_number' => 'OR-' . date('Y') . '-0102',
        'patient_idx' => 26, // Danilo Castro
        'suite_code' => 'OR-02',
        'scheduled_date' => $today,
        'scheduled_start_time' => '07:30:00',
        'scheduled_end_time' => '10:00:00',
        'estimated_duration_minutes' => 150,
        'actual_in_room_time' => $today . ' 07:32:00',
        'actual_incision_time' => $today . ' 08:05:00',
        'actual_closing_time' => $today . ' 09:48:00',
        'actual_out_room_time' => $today . ' 10:05:00',
        'turnover_duration_minutes' => 25,
        'surgical_specialty' => 'Orthopedic Surgery',
        'procedure_name' => 'Right Total Knee Arthroplasty (TKA)',
        'preop_diagnosis' => 'Severe Osteoarthritis, Right Knee (Grade IV)',
        'postop_diagnosis' => 'Severe Tricompartmental Osteoarthritis, Right Knee',
        'lead_surgeon' => 'Dr. Robert Tan, MD, FPOA',
        'assistant_surgeon' => 'Dr. Eric Lim, MD',
        'anesthesiologist' => 'Dr. Teresa Santos, MD, DPBA',
        'scrub_nurse' => 'Nurse Anna Perez, RN',
        'circulating_nurse' => 'Nurse Gina Santos, RN',
        'anesthesia_type' => 'Spinal Anesthesia with Adductor Canal Block',
        'case_priority' => 'Elective',
        'perioperative_stage' => 'In PACU',
        'preop_cleared' => 1,
        'consent_signed' => 1,
        'blood_reserved' => 1,
        'blood_units_reserved' => 2,
        'implants_required' => 1,
        'implant_details' => 'Zimmer Biomet Persona PS Knee System (Femoral Size 5, Tibial Tray Size 4)',
        'estimated_blood_loss_ml' => 150,
        'specimens_sent' => 'Femoral & Tibial Bone Cuts',
        'pacu_bed_no' => 'PACU-03',
        'pacu_aldrete_score' => 8,
        'postop_disposition' => 'Orthopedic Ward Room 412',
        'notes' => 'Procedure uneventful. Tourniquet time 48 min. ROM 0-110 deg achieved post-fixation.',
    ],
    // Case 3: Upcoming in OR-02 (Next case today)
    [
        'case_number' => 'OR-' . date('Y') . '-0103',
        'patient_idx' => 25, // Rosalia Gomez
        'suite_code' => 'OR-02',
        'scheduled_date' => $today,
        'scheduled_start_time' => '11:00:00',
        'scheduled_end_time' => '13:00:00',
        'estimated_duration_minutes' => 120,
        'actual_in_room_time' => null,
        'actual_incision_time' => null,
        'actual_closing_time' => null,
        'actual_out_room_time' => null,
        'surgical_specialty' => 'Orthopedic Surgery',
        'procedure_name' => 'Open Reduction Internal Fixation (ORIF) Right Distal Radius',
        'preop_diagnosis' => 'Displaced Comminuted Colles Fracture, Right Wrist',
        'postop_diagnosis' => null,
        'lead_surgeon' => 'Dr. Robert Tan, MD, FPOA',
        'assistant_surgeon' => null,
        'anesthesiologist' => 'Dr. Teresa Santos, MD, DPBA',
        'scrub_nurse' => 'Nurse Anna Perez, RN',
        'circulating_nurse' => 'Nurse Gina Santos, RN',
        'anesthesia_type' => 'Regional (Supraclavicular Nerve Block) + Sedation',
        'case_priority' => 'Urgent',
        'perioperative_stage' => 'Pre-Op Holding',
        'preop_cleared' => 1,
        'consent_signed' => 1,
        'blood_reserved' => 0,
        'blood_units_reserved' => 0,
        'implants_required' => 1,
        'implant_details' => 'Synthes 2.4mm Variable Angle LCP Volar Extra-Articular Distal Radius Plate',
        'estimated_blood_loss_ml' => null,
        'specimens_sent' => null,
        'pacu_bed_no' => null,
        'pacu_aldrete_score' => null,
        'postop_disposition' => 'Day Surgery Unit',
        'notes' => 'Patient waiting in Pre-Op Holding Bay 2. Surgical site marked by Dr. Tan.',
    ],
    // Case 4: Major Neurosurgery in OR-04 (Incision / In Progress)
    [
        'case_number' => 'OR-' . date('Y') . '-0104',
        'patient_idx' => 24, // Alfonso Soriano
        'suite_code' => 'OR-04',
        'scheduled_date' => $today,
        'scheduled_start_time' => '07:30:00',
        'scheduled_end_time' => '13:30:00',
        'estimated_duration_minutes' => 360,
        'actual_in_room_time' => $today . ' 07:25:00',
        'actual_incision_time' => $today . ' 08:35:00',
        'actual_closing_time' => null,
        'actual_out_room_time' => null,
        'surgical_specialty' => 'Neurosurgery',
        'procedure_name' => 'Right Frontotemporal Craniotomy and Aneurysm Clipping',
        'preop_diagnosis' => 'Unruptured Right Middle Cerebral Artery (MCA) Bifurcation Aneurysm (8mm)',
        'postop_diagnosis' => null,
        'lead_surgeon' => 'Dr. Antonio Delgado, MD, FPCS, FICS',
        'assistant_surgeon' => 'Dr. Ronald Santos, MD',
        'anesthesiologist' => 'Dr. Karen Ong, MD, DPBA',
        'scrub_nurse' => 'Nurse Elena Cruz, RN',
        'circulating_nurse' => 'Nurse Maria Ocampo, RN',
        'anesthesia_type' => 'General (Total Intravenous Anesthesia - TIVA) with Neuro-monitoring',
        'case_priority' => 'Elective',
        'perioperative_stage' => 'Incision / In Progress',
        'preop_cleared' => 1,
        'consent_signed' => 1,
        'blood_reserved' => 1,
        'blood_units_reserved' => 4,
        'implants_required' => 1,
        'implant_details' => 'Yasargil Titanium Aneurysm Clip Standard Curved (FT740T)',
        'estimated_blood_loss_ml' => 200,
        'specimens_sent' => null,
        'pacu_bed_no' => null,
        'pacu_aldrete_score' => null,
        'postop_disposition' => 'Neuro ICU Bed 2',
        'notes' => 'Neuronavigation registered with sub-millimeter accuracy. Microdissection of Sylvian fissure underway.',
    ],
    // Case 5: Endoscopy Suite in progress
    [
        'case_number' => 'OR-' . date('Y') . '-0105',
        'patient_idx' => 23, // Bienvenido Perez
        'suite_code' => 'OR-06',
        'scheduled_date' => $today,
        'scheduled_start_time' => '09:00:00',
        'scheduled_end_time' => '10:30:00',
        'estimated_duration_minutes' => 90,
        'actual_in_room_time' => $today . ' 08:55:00',
        'actual_incision_time' => $today . ' 09:10:00',
        'actual_closing_time' => null,
        'actual_out_room_time' => null,
        'surgical_specialty' => 'Gastroenterology / GI Surgery',
        'procedure_name' => 'Therapeutic Colonoscopy with Polypectomy and EMR',
        'preop_diagnosis' => 'Colonic Polyps with Lower GI Bleeding',
        'postop_diagnosis' => null,
        'lead_surgeon' => 'Dr. Fernando Gomez, MD, FPCP, PSG',
        'assistant_surgeon' => null,
        'anesthesiologist' => 'Dr. Karen Ong, MD, DPBA',
        'scrub_nurse' => 'Nurse Laila Reyes, RN',
        'circulating_nurse' => 'Nurse Patrick Dizon, RN',
        'anesthesia_type' => 'MAC (Monitored Anesthesia Care) / Deep Propofol Sedation',
        'case_priority' => 'Elective',
        'perioperative_stage' => 'Incision / In Progress',
        'preop_cleared' => 1,
        'consent_signed' => 1,
        'blood_reserved' => 0,
        'blood_units_reserved' => 0,
        'implants_required' => 0,
        'implant_details' => null,
        'estimated_blood_loss_ml' => 10,
        'specimens_sent' => 'Descending Colon Polyp (20mm sessile) in Formalin for Biopsy',
        'pacu_bed_no' => null,
        'pacu_aldrete_score' => null,
        'postop_disposition' => 'Endoscopy Recovery Unit',
        'notes' => 'Submucosal lifting with saline-adrenaline injected. En-bloc snare resection.',
    ],
    // Case 6: Minor OR Suite - Scheduled for afternoon
    [
        'case_number' => 'OR-' . date('Y') . '-0106',
        'patient_idx' => 22, // Guillermo Navarro
        'suite_code' => 'OR-05',
        'scheduled_date' => $today,
        'scheduled_start_time' => '13:00:00',
        'scheduled_end_time' => '14:00:00',
        'estimated_duration_minutes' => 60,
        'actual_in_room_time' => null,
        'actual_incision_time' => null,
        'actual_closing_time' => null,
        'actual_out_room_time' => null,
        'surgical_specialty' => 'Plastics & Reconstructive',
        'procedure_name' => 'Wide Local Excision of Sebaceous Cyst and Flap Closure',
        'preop_diagnosis' => 'Infected Sebaceous Cyst, Posterior Neck',
        'postop_diagnosis' => null,
        'lead_surgeon' => 'Dr. Melissa Alcantara, MD',
        'assistant_surgeon' => null,
        'anesthesiologist' => 'Dr. Teresa Santos, MD, DPBA',
        'scrub_nurse' => 'Nurse Joy Ramos, RN',
        'circulating_nurse' => 'Nurse Patrick Dizon, RN',
        'anesthesia_type' => 'Local with Sedation',
        'case_priority' => 'Elective',
        'perioperative_stage' => 'Scheduled',
        'preop_cleared' => 1,
        'consent_signed' => 1,
        'blood_reserved' => 0,
        'blood_units_reserved' => 0,
        'implants_required' => 0,
        'implant_details' => null,
        'estimated_blood_loss_ml' => null,
        'specimens_sent' => null,
        'pacu_bed_no' => null,
        'pacu_aldrete_score' => null,
        'postop_disposition' => 'Outpatient Discharge',
        'notes' => 'Patient prepped for afternoon ambulatory list.',
    ],
    // Case 7: OR-03 (Cardiothoracic) - Scheduled for afternoon (CABG)
    [
        'case_number' => 'OR-' . date('Y') . '-0107',
        'patient_idx' => 21, // Rhea Dimaculangan
        'suite_code' => 'OR-03',
        'scheduled_date' => $today,
        'scheduled_start_time' => '13:30:00',
        'scheduled_end_time' => '18:30:00',
        'estimated_duration_minutes' => 300,
        'actual_in_room_time' => null,
        'actual_incision_time' => null,
        'actual_closing_time' => null,
        'actual_out_room_time' => null,
        'surgical_specialty' => 'Cardiothoracic Surgery',
        'procedure_name' => 'Coronary Artery Bypass Graft (CABG x3: LIMA-LAD, SVG-OM, SVG-RCA)',
        'preop_diagnosis' => 'Triple Vessel Coronary Artery Disease with Unstable Angina',
        'postop_diagnosis' => null,
        'lead_surgeon' => 'Dr. Victor Laurel, MD, FPCS, TCVS',
        'assistant_surgeon' => 'Dr. Carlo Mendoza, MD',
        'anesthesiologist' => 'Dr. Karen Ong, MD, DPBA',
        'scrub_nurse' => 'Nurse Elena Cruz, RN',
        'circulating_nurse' => 'Nurse Maria Ocampo, RN',
        'anesthesia_type' => 'General Anesthesia (High-Dose Narcotic)',
        'case_priority' => 'Urgent',
        'perioperative_stage' => 'Pre-Op Holding',
        'preop_cleared' => 1,
        'consent_signed' => 1,
        'blood_reserved' => 1,
        'blood_units_reserved' => 6,
        'implants_required' => 1,
        'implant_details' => 'Sternal Wires, Gore-Tex Vascular Graft',
        'estimated_blood_loss_ml' => null,
        'specimens_sent' => null,
        'pacu_bed_no' => null,
        'pacu_aldrete_score' => null,
        'postop_disposition' => 'Cardiovascular ICU Bed 1',
        'notes' => 'Patient in Holding Bay 1. Crossmatched 4 units PRBC, 2 units FFP verified in blood bank.',
    ],
    // Case 8: Yesterday case (Transferred/Discharged)
    [
        'case_number' => 'OR-' . date('Y') . '-0098',
        'patient_idx' => 20, // Generoso Flores
        'suite_code' => 'OR-01',
        'scheduled_date' => $yesterday,
        'scheduled_start_time' => '09:00:00',
        'scheduled_end_time' => '11:00:00',
        'estimated_duration_minutes' => 120,
        'actual_in_room_time' => $yesterday . ' 08:50:00',
        'actual_incision_time' => $yesterday . ' 09:20:00',
        'actual_closing_time' => $yesterday . ' 10:45:00',
        'actual_out_room_time' => $yesterday . ' 11:00:00',
        'turnover_duration_minutes' => 20,
        'surgical_specialty' => 'General Surgery',
        'procedure_name' => 'Open Inguinal Hernia Repair with Prolene Mesh (Lichtenstein Technique)',
        'preop_diagnosis' => 'Direct Right Inguinal Hernia',
        'postop_diagnosis' => 'Direct Inguinal Hernia, Right, Reduced with Prolene Mesh',
        'lead_surgeon' => 'Dr. Mark Villareal, MD, FPCS',
        'assistant_surgeon' => null,
        'anesthesiologist' => 'Dr. Teresa Santos, MD, DPBA',
        'scrub_nurse' => 'Nurse Joy Ramos, RN',
        'circulating_nurse' => 'Nurse Patrick Dizon, RN',
        'anesthesia_type' => 'Spinal Anesthesia',
        'case_priority' => 'Elective',
        'perioperative_stage' => 'Transferred / Discharged',
        'preop_cleared' => 1,
        'consent_signed' => 1,
        'blood_reserved' => 0,
        'blood_units_reserved' => 0,
        'implants_required' => 1,
        'implant_details' => 'Ethicon Prolene Mesh 3x5 inch',
        'estimated_blood_loss_ml' => 30,
        'specimens_sent' => null,
        'pacu_bed_no' => 'PACU-01',
        'pacu_aldrete_score' => 10,
        'pacu_discharge_time' => $yesterday . ' 13:00:00',
        'postop_disposition' => 'Surgical Inpatient Floor Room 308',
        'notes' => 'Patient recovered fully, vital signs stable, transferred to ward.',
    ],
];

$caseStmt = $db->prepare("
    INSERT INTO or_surgical_cases (
        case_number, patient_id, patient_name, patient_mrn, patient_age, gender,
        or_suite_id, or_suite_name, scheduled_date, scheduled_start_time, scheduled_end_time, estimated_duration_minutes,
        actual_in_room_time, actual_incision_time, actual_closing_time, actual_out_room_time, turnover_duration_minutes,
        surgical_specialty, procedure_name, preop_diagnosis, postop_diagnosis,
        lead_surgeon, assistant_surgeon, anesthesiologist, scrub_nurse, circulating_nurse,
        anesthesia_type, case_priority, perioperative_stage,
        preop_cleared, consent_signed, blood_reserved, blood_units_reserved,
        implants_required, implant_details, estimated_blood_loss_ml, specimens_sent,
        pacu_bed_no, pacu_aldrete_score, pacu_discharge_time, postop_disposition,
        safety_checklist_id, delay_reason, notes, created_by, created_at
    ) VALUES (
        :case_number, :patient_id, :patient_name, :patient_mrn, :patient_age, :gender,
        :or_suite_id, :or_suite_name, :scheduled_date, :scheduled_start_time, :scheduled_end_time, :estimated_duration_minutes,
        :actual_in_room_time, :actual_incision_time, :actual_closing_time, :actual_out_room_time, :turnover_duration_minutes,
        :surgical_specialty, :procedure_name, :preop_diagnosis, :postop_diagnosis,
        :lead_surgeon, :assistant_surgeon, :anesthesiologist, :scrub_nurse, :circulating_nurse,
        :anesthesia_type, :case_priority, :perioperative_stage,
        :preop_cleared, :consent_signed, :blood_reserved, :blood_units_reserved,
        :implants_required, :implant_details, :estimated_blood_loss_ml, :specimens_sent,
        :pacu_bed_no, :pacu_aldrete_score, :pacu_discharge_time, :postop_disposition,
        :safety_checklist_id, :delay_reason, :notes, 1, NOW()
    )
");

$insertedCount = 0;
foreach ($cases as $c) {
    $p = $patients[$c['patient_idx']] ?? $patients[0];
    $suite = $suiteMap[$c['suite_code']];

    $caseStmt->execute([
        'case_number' => $c['case_number'],
        'patient_id' => $p['id'],
        'patient_name' => getFullName($p),
        'patient_mrn' => $p['patient_no'],
        'patient_age' => getAge($p['birthdate']),
        'gender' => $p['sex'] === 'Female' ? 'Female' : 'Male',
        'or_suite_id' => $suite['id'],
        'or_suite_name' => $suite['name'],
        'scheduled_date' => $c['scheduled_date'],
        'scheduled_start_time' => $c['scheduled_start_time'],
        'scheduled_end_time' => $c['scheduled_end_time'],
        'estimated_duration_minutes' => $c['estimated_duration_minutes'],
        'actual_in_room_time' => $c['actual_in_room_time'],
        'actual_incision_time' => $c['actual_incision_time'],
        'actual_closing_time' => $c['actual_closing_time'],
        'actual_out_room_time' => $c['actual_out_room_time'],
        'turnover_duration_minutes' => $c['turnover_duration_minutes'] ?? null,
        'surgical_specialty' => $c['surgical_specialty'],
        'procedure_name' => $c['procedure_name'],
        'preop_diagnosis' => $c['preop_diagnosis'],
        'postop_diagnosis' => $c['postop_diagnosis'] ?? null,
        'lead_surgeon' => $c['lead_surgeon'],
        'assistant_surgeon' => $c['assistant_surgeon'],
        'anesthesiologist' => $c['anesthesiologist'],
        'scrub_nurse' => $c['scrub_nurse'],
        'circulating_nurse' => $c['circulating_nurse'],
        'anesthesia_type' => $c['anesthesia_type'],
        'case_priority' => $c['case_priority'],
        'perioperative_stage' => $c['perioperative_stage'],
        'preop_cleared' => $c['preop_cleared'],
        'consent_signed' => $c['consent_signed'],
        'blood_reserved' => $c['blood_reserved'],
        'blood_units_reserved' => $c['blood_units_reserved'],
        'implants_required' => $c['implants_required'],
        'implant_details' => $c['implant_details'],
        'estimated_blood_loss_ml' => $c['estimated_blood_loss_ml'],
        'specimens_sent' => $c['specimens_sent'],
        'pacu_bed_no' => $c['pacu_bed_no'],
        'pacu_aldrete_score' => $c['pacu_aldrete_score'],
        'pacu_discharge_time' => $c['pacu_discharge_time'] ?? null,
        'postop_disposition' => $c['postop_disposition'],
        'safety_checklist_id' => null,
        'delay_reason' => null,
        'notes' => $c['notes'],
    ]);

    $caseId = (int) $db->lastInsertId();

    // If active case in suite, update current_case_id
    if (in_array($c['perioperative_stage'], ['In Room / Induction', 'Incision / In Progress', 'Closing / Extubation'])) {
        $db->exec("UPDATE or_suites SET current_case_id = {$caseId}, status = 'In Surgery' WHERE id = {$suite['id']}");
    }
    $insertedCount++;
}

echo "Successfully seeded {$insertedCount} surgical cases with real EHR patients!\n";
