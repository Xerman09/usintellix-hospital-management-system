<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';

use App\Core\Database;

echo "Seeding Periodic Performance Evaluations (hr_performance_evaluations)...\n";

$pdo = Database::connection();

// Check if already seeded
$cnt = (int)$pdo->query("SELECT COUNT(*) FROM hr_performance_evaluations")->fetchColumn();
if ($cnt > 0) {
    echo "Performance evaluations already seeded ({$cnt} records found).\n";
    exit(0);
}

$evaluations = [
    // 1. Dr. Elena Rostova - Surgery Chief (Exceptional)
    [
        'code' => 'PE-2026-0001',
        'emp_id' => 102,
        'name' => 'Dr. Elena Rostova, MD, FACS',
        'job_title' => 'Chief of Surgery / Trauma Attending',
        'dept_id' => 2,
        'dept_name' => 'General Surgery',
        'cycle' => 'annual',
        'start_date' => '2025-01-01',
        'end_date' => '2025-12-31',
        'year' => 2026,
        'eval_type' => 'supervisor',
        'evaluator_id' => 104,
        'evaluator_name' => 'Dr. Arthur Sterling, MD',
        'evaluator_title' => 'Chief Medical Officer',
        'score_clinical' => 4.90,
        'score_bedside' => 4.70,
        'score_doc' => 4.80,
        'score_teamwork' => 4.90,
        'score_ethics' => 5.00,
        'overall' => 4.86,
        'tier' => 'exceptional',
        'strengths' => 'Pioneered laparoscopic colorectal pathways reducing postoperative stay by 1.8 days. Maintained a 0% surgical site infection rate in elective abdominal cases. Exceptional crisis leadership during mass trauma activations.',
        'areas_dev' => 'Mentorship transition: delegate administrative scheduling duties to junior surgical faculty.',
        'goals' => 'Lead the hospital-wide robotic surgical accreditation initiative for the upcoming accreditation cycle.',
        'action_plan' => 'Establish monthly surgical morbidity and mortality simulation drills with OR nursing staff.',
        'recommendation' => 'eligible_for_merit_promotion',
        'rec_notes' => 'Highest recommendation for surgical recredentialing and clinical executive bonus.',
        'status' => 'finalized',
        'employee_comments' => 'Grateful for the support of the executive leadership and multidisciplinary OR surgical team.',
        'approving_name' => 'Dr. Arthur Sterling, MD',
        'approving_title' => 'Chief Medical Officer'
    ],

    // 2. Dr. Sofia Morales - Emergency Medicine (Exceeds Expectations)
    [
        'code' => 'PE-2026-0002',
        'emp_id' => 109,
        'name' => 'Dr. Sofia Morales, MD',
        'job_title' => 'Emergency Medicine Attending',
        'dept_id' => 5,
        'dept_name' => 'Emergency Department',
        'cycle' => 'annual',
        'start_date' => '2025-01-01',
        'end_date' => '2025-12-31',
        'year' => 2026,
        'eval_type' => 'supervisor',
        'evaluator_id' => 104,
        'evaluator_name' => 'Dr. Arthur Sterling, MD',
        'evaluator_title' => 'Chief Medical Officer',
        'score_clinical' => 4.60,
        'score_bedside' => 4.30,
        'score_doc' => 4.10,
        'score_teamwork' => 4.80,
        'score_ethics' => 4.50,
        'overall' => 4.46,
        'tier' => 'exceeds_expectations',
        'strengths' => 'Superb rapid-sequence intubation and resuscitation execution in pediatric and adult polytrauma. Highly respected by emergency nursing teams for clear closed-loop communication.',
        'areas_dev' => 'Documentation timeliness: complete electronic discharge instructions before shift handoff to avoid chart backlog.',
        'goals' => 'Attain Point-of-Care Ultrasound (POCUS) institutional proctor status.',
        'action_plan' => 'Participate in quarterly ED-ICU joint critical care handoff quality improvement rounds.',
        'recommendation' => 'recredential_full_privileges',
        'rec_notes' => 'Unconditional renewal of emergency medicine attending privileges.',
        'status' => 'finalized',
        'employee_comments' => 'Will focus on chart closure velocity during high-volume nocturnal surges.',
        'approving_name' => 'Dr. Arthur Sterling, MD',
        'approving_title' => 'Chief Medical Officer'
    ],

    // 3. Dr. Jonathan Hayes - Interventional Cardiology (Exceptional Recredentialing Review)
    [
        'code' => 'PE-2026-0003',
        'emp_id' => 103,
        'name' => 'Dr. Jonathan Hayes, MD, FACC',
        'job_title' => 'Interventional Cardiologist',
        'dept_id' => 3,
        'dept_name' => 'Cardiology',
        'cycle' => 'recredentialing_peer_review',
        'start_date' => '2024-01-01',
        'end_date' => '2025-12-31',
        'year' => 2026,
        'eval_type' => 'department_chair',
        'evaluator_id' => 104,
        'evaluator_name' => 'Dr. Arthur Sterling, MD',
        'evaluator_title' => 'Chief Medical Officer',
        'score_clinical' => 4.90,
        'score_bedside' => 4.50,
        'score_doc' => 4.70,
        'score_teamwork' => 4.60,
        'score_ethics' => 4.80,
        'overall' => 4.70,
        'tier' => 'exceptional',
        'strengths' => 'Average Door-to-Balloon (D2B) time of 48 minutes for STEMI activations, far exceeding national 90-minute benchmarks. Zero complications in complex radial access interventions.',
        'areas_dev' => 'Bedside post-procedure consultation family updates during weekend on-call.',
        'goals' => 'Establish transcatheter aortic valve replacement (TAVR) clinical registry.',
        'action_plan' => 'Formalize weekly cath lab multidisciplinary case reviews with cardiothoracic surgery.',
        'recommendation' => 'recredential_full_privileges',
        'rec_notes' => 'Full recredentialing for invasive cardiology and coronary intervention confirmed.',
        'status' => 'finalized',
        'employee_comments' => 'Proud of our cath lab team performance and quality metrics.',
        'approving_name' => 'Dr. Arthur Sterling, MD',
        'approving_title' => 'Chief Medical Officer'
    ],

    // 4. Dr. Marcus Vance - Internal Medicine (Exceptional Bedside Manner & Ethics)
    [
        'code' => 'PE-2026-0004',
        'emp_id' => 101,
        'name' => 'Dr. Marcus Vance, MD',
        'job_title' => 'Attending Physician - Internal Medicine',
        'dept_id' => 1,
        'dept_name' => 'Internal Medicine',
        'cycle' => 'annual',
        'start_date' => '2025-01-01',
        'end_date' => '2025-12-31',
        'year' => 2026,
        'eval_type' => 'supervisor',
        'evaluator_id' => 104,
        'evaluator_name' => 'Dr. Arthur Sterling, MD',
        'evaluator_title' => 'Chief Medical Officer',
        'score_clinical' => 4.60,
        'score_bedside' => 5.00,
        'score_doc' => 4.80,
        'score_teamwork' => 4.70,
        'score_ethics' => 5.00,
        'overall' => 4.82,
        'tier' => 'exceptional',
        'strengths' => 'Top decile HCAHPS patient satisfaction scores for physician communication. Exceptional diagnostic diligence in complex multisystem chronic diseases and antimicrobial stewardship.',
        'areas_dev' => 'Explore formal clinical research publication of rare internal medicine cases.',
        'goals' => 'Chair the hospital Antibiotic Stewardship Committee in 2027.',
        'action_plan' => 'Implement structured clinical handover checklists for internal medicine ward transitions.',
        'recommendation' => 'eligible_for_merit_promotion',
        'rec_notes' => 'Recommended for Clinical Professor distinction and department leadership.',
        'status' => 'finalized',
        'employee_comments' => 'Patient-centered communication remains my highest priority.',
        'approving_name' => 'Dr. Arthur Sterling, MD',
        'approving_title' => 'Chief Medical Officer'
    ],

    // 5. Dr. Christopher Nolan - Orthopedic Surgery (Exceeds Expectations)
    [
        'code' => 'PE-2026-0005',
        'emp_id' => 108,
        'name' => 'Dr. Christopher Nolan, MD',
        'job_title' => 'Attending Orthopedic Surgeon',
        'dept_id' => 6,
        'dept_name' => 'Orthopedics',
        'cycle' => 'annual',
        'start_date' => '2025-01-01',
        'end_date' => '2025-12-31',
        'year' => 2026,
        'eval_type' => 'supervisor',
        'evaluator_id' => 102,
        'evaluator_name' => 'Dr. Elena Rostova, MD, FACS',
        'evaluator_title' => 'Chief of Surgery',
        'score_clinical' => 4.40,
        'score_bedside' => 3.60,
        'score_doc' => 3.40,
        'score_teamwork' => 3.90,
        'score_ethics' => 4.00,
        'overall' => 3.86,
        'tier' => 'exceeds_expectations',
        'strengths' => 'High surgical productivity with outstanding mechanical alignment outcomes in total knee and hip arthroplasties. Strong patient functional recovery scores.',
        'areas_dev' => 'Documentation accuracy: ensure operative descriptions and implant lot serial numbers are logged within 2 hours of case finish.',
        'goals' => 'Standardize joint replacement clinical pathways to support same-day outpatient discharge.',
        'action_plan' => 'Adopt voice dictation templates for immediate postoperative note finalization.',
        'recommendation' => 'continue_current_tier',
        'rec_notes' => 'Satisfactory surgical volume; documentation timeliness improvement required.',
        'status' => 'finalized',
        'employee_comments' => 'Acknowledged. Will integrate voice dictation into OR routine.',
        'approving_name' => 'Dr. Elena Rostova, MD',
        'approving_title' => 'Chief of Surgery'
    ],

    // 6. Dr. Jennifer Reyes - OB-GYN (Exceptional)
    [
        'code' => 'PE-2026-0006',
        'emp_id' => 111,
        'name' => 'Dr. Jennifer Reyes, MD, FACOG',
        'job_title' => 'Attending Obstetrician & Gynecologist',
        'dept_id' => 7,
        'dept_name' => 'Obstetrics & Gynecology',
        'cycle' => 'annual',
        'start_date' => '2025-01-01',
        'end_date' => '2025-12-31',
        'year' => 2026,
        'eval_type' => 'supervisor',
        'evaluator_id' => 104,
        'evaluator_name' => 'Dr. Arthur Sterling, MD',
        'evaluator_title' => 'Chief Medical Officer',
        'score_clinical' => 4.70,
        'score_bedside' => 4.80,
        'score_doc' => 4.60,
        'score_teamwork' => 4.70,
        'score_ethics' => 4.90,
        'overall' => 4.74,
        'tier' => 'exceptional',
        'strengths' => 'Lowest primary Cesarean section rate in the department without compromising neonatal outcomes. Superb maternal hemorrhage crisis drill leadership.',
        'areas_dev' => 'Encourage postpartum depression screening outreach in outpatient clinic.',
        'goals' => 'Formulate hospital high-risk obstetric rapid response team guidelines.',
        'action_plan' => 'Conduct quarterly interdisciplinary simulations with labor nurses and neonatology.',
        'recommendation' => 'recredential_full_privileges',
        'rec_notes' => 'Unrestricted recredentialing and commendation for clinical safety.',
        'status' => 'finalized',
        'employee_comments' => 'Thankful for the dedication of our labor & delivery nursing colleagues.',
        'approving_name' => 'Dr. Arthur Sterling, MD',
        'approving_title' => 'Chief Medical Officer'
    ],

    // 7. Rochelle Dizon - ICU Nurse Specialist (Exceeds Expectations)
    [
        'code' => 'PE-2026-0007',
        'emp_id' => 112,
        'name' => 'Rochelle Dizon, BSN, RN, CCRN',
        'job_title' => 'Critical Care Nurse Specialist (ICU)',
        'dept_id' => 4,
        'dept_name' => 'Intensive Care Unit (ICU)',
        'cycle' => 'annual',
        'start_date' => '2025-01-01',
        'end_date' => '2025-12-31',
        'year' => 2026,
        'eval_type' => 'supervisor',
        'evaluator_id' => 110,
        'evaluator_name' => 'Maria Santos, RN',
        'evaluator_title' => 'Senior Inpatient Nursing Supervisor',
        'score_clinical' => 4.60,
        'score_bedside' => 4.30,
        'score_doc' => 4.40,
        'score_teamwork' => 4.80,
        'score_ethics' => 4.60,
        'overall' => 4.54,
        'tier' => 'exceptional',
        'strengths' => 'Mastery in arterial line, central venous pressure, and ECMO circuit monitoring. Outstanding code blue response calm demeanor.',
        'areas_dev' => 'Family counseling during acute palliative care transitions in ICU.',
        'goals' => 'Complete Adult Critical Care Nurse Preceptor certification.',
        'action_plan' => 'Mentor incoming graduate nurses through structured ICU hemodynamic modules.',
        'recommendation' => 'eligible_for_merit_promotion',
        'rec_notes' => 'Recommended for ICU Charge Nurse promotion.',
        'status' => 'finalized',
        'employee_comments' => 'Excited to mentor new nurses joining our critical care unit.',
        'approving_name' => 'Maria Santos, RN',
        'approving_title' => 'Senior Inpatient Nursing Supervisor'
    ],

    // 8. Maria Santos - Senior Staff Nurse (Meets Expectations / Exceeds)
    [
        'code' => 'PE-2026-0008',
        'emp_id' => 110,
        'name' => 'Maria Santos, RN',
        'job_title' => 'Senior Inpatient Staff Nurse',
        'dept_id' => 8,
        'dept_name' => 'Nursing Services',
        'cycle' => 'annual',
        'start_date' => '2025-01-01',
        'end_date' => '2025-12-31',
        'year' => 2026,
        'eval_type' => 'supervisor',
        'evaluator_id' => 104,
        'evaluator_name' => 'Dr. Arthur Sterling, MD',
        'evaluator_title' => 'Chief Medical Officer',
        'score_clinical' => 4.00,
        'score_bedside' => 4.40,
        'score_doc' => 3.90,
        'score_teamwork' => 4.30,
        'score_ethics' => 4.40,
        'overall' => 4.20,
        'tier' => 'exceeds_expectations',
        'strengths' => 'Dependable unit charge nurse leadership, zero medication administration discrepancies, deep compassion toward geriatric inpatients.',
        'areas_dev' => 'Renew expired life support credentials (NRP) immediately to maintain floater flexibility.',
        'goals' => 'Obtain Certified Medical-Surgical Registered Nurse (CMSRN) credential.',
        'action_plan' => 'Enroll in hands-on clinical simulation recertification stations.',
        'recommendation' => 'continue_current_tier',
        'rec_notes' => 'Strong performance; resolve certification gaps as scheduled.',
        'status' => 'finalized',
        'employee_comments' => 'Recertification is booked for next week.',
        'approving_name' => 'Dr. Arthur Sterling, MD',
        'approving_title' => 'Chief Medical Officer'
    ]
];

$stmt = $pdo->prepare("
    INSERT INTO `hr_performance_evaluations` (
        `evaluation_code`, `employee_id`, `employee_name`, `job_title`,
        `department_id`, `department_name`, `evaluation_cycle`, `evaluation_period_start`,
        `evaluation_period_end`, `evaluation_year`, `evaluator_type`, `evaluator_id`,
        `evaluator_name`, `evaluator_title`, `score_clinical_competence`, `score_bedside_manner`,
        `score_documentation_accuracy`, `score_teamwork_ethics`, `score_professionalism_compliance`,
        `overall_score`, `performance_tier`, `key_strengths`, `areas_for_development`,
        `development_goals`, `action_plan`, `evaluator_recommendation`, `recommendation_notes`,
        `status`, `employee_comments`, `employee_acknowledged_at`, `approving_officer_name`,
        `approving_officer_title`, `approved_at`, `created_at`, `updated_at`
    ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, NOW(), ?,
        ?, NOW(), NOW(), NOW()
    )
");

foreach ($evaluations as $e) {
    $stmt->execute([
        $e['code'], $e['emp_id'], $e['name'], $e['job_title'],
        $e['dept_id'], $e['dept_name'], $e['cycle'], $e['start_date'],
        $e['end_date'], $e['year'], $e['eval_type'], $e['evaluator_id'],
        $e['evaluator_name'], $e['evaluator_title'], $e['score_clinical'], $e['score_bedside'],
        $e['score_doc'], $e['score_teamwork'], $e['score_ethics'],
        $e['overall'], $e['tier'], $e['strengths'], $e['areas_dev'],
        $e['goals'], $e['action_plan'], $e['recommendation'], $e['rec_notes'],
        $e['status'], $e['employee_comments'], $e['approving_name'],
        $e['approving_title']
    ]);
}

// Update sequence counter
$pdo->exec("UPDATE `billing_tariff_counters` SET `last_number` = 8 WHERE `counter_type` = 'PERF_EVAL' AND `year` = 2026");

echo "Seeded " . count($evaluations) . " multi-source performance evaluations.\n";
