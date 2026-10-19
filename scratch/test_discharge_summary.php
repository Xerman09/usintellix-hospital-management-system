<?php

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Modules\InpatientAdmissions\Services\DischargeSummaryService;
use App\Modules\InpatientAdmissions\Services\InpatientAdmissionsService;

try {
    $db = Database::connection();
    $dsService = new DischargeSummaryService();
    $admService = new InpatientAdmissionsService();

    echo "=== DISCHARGE SUMMARY END-TO-END TEST ===\n";

    // 1. Fetch an active admission or create one for testing
    $activeAdm = $db->query("SELECT * FROM inpatient_admissions WHERE status = 'Admitted' LIMIT 1")->fetch(PDO::FETCH_ASSOC);

    if (!$activeAdm) {
        // Find an available bed and patient to admit
        $bed = $db->query("SELECT * FROM hospital_beds WHERE status = 'Available' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        $patient = $db->query("SELECT * FROM patients WHERE deleted_at IS NULL LIMIT 1")->fetch(PDO::FETCH_ASSOC);

        if (!$bed || !$patient) {
            throw new Exception("Cannot seed test admission: need at least 1 patient and 1 available bed.");
        }

        $activeAdm = $admService->admitPatient([
            'patient_id'            => (int) $patient['id'],
            'bed_id'                => (int) $bed['id'],
            'admission_source'      => 'Outpatient Clinic',
            'admission_type'        => 'Elective',
            'admitting_diagnosis'   => 'Acute Bronchitis with Bronchospasm (J20.9)',
            'attending_physician'   => 'Dr. Emily Watson, MD',
            'primary_nurse'         => 'Nurse Sarah Jenkins, RN',
            'isolation_precautions' => 'Standard'
        ], 1);
        echo "Created test admission ID: {$activeAdm['id']} (Admission #: {$activeAdm['admission_number']})\n";
    } else {
        echo "Using existing active admission ID: {$activeAdm['id']} (Admission #: {$activeAdm['admission_number']})\n";
    }

    $admId = (int) $activeAdm['id'];

    echo "\n=== TEST 1: Pre-Populate Discharge Summary Data ===\n";
    $prepop = $dsService->getPrePopulatedAdmissionData($admId);
    echo "Has existing: " . ($prepop['has_existing'] ? 'true' : 'false') . "\n";
    echo "Patient Name: {$prepop['summary']['patient_name']}\n";
    echo "Admitting Diagnosis: {$prepop['summary']['admitting_diagnosis']}\n";
    assert(!empty($prepop['summary']['patient_name']), "Should pre-populate patient name");
    assert(!empty($prepop['summary']['admitting_diagnosis']), "Should pre-populate admitting diagnosis");

    echo "\n=== TEST 2: Save Draft Discharge Summary ===\n";
    $draftPayload = [
        'admitting_diagnosis'      => $prepop['summary']['admitting_diagnosis'],
        'discharge_diagnosis'      => 'Resolved Acute Bronchitis, Secondary Mild Dehydration',
        'hospital_course_summary'  => 'Patient received nebulization therapy with Salbutamol and IV fluids. Respiratory distress cleared completely within 48 hours.',
        'significant_procedures'   => 'Chest X-Ray (AP/Lateral), Serial Peak Flow Monitoring',
        'discharge_condition'      => 'Improved',
        'discharge_disposition'    => 'Discharged Home with Self-Care',
        'discharge_medications'    => '• Salbutamol Inhaler 100mcg - 2 puffs Q6H PRN wheezing' . "\n" . '• Amoxicillin 500mg - 1 capsule TID for 5 days',
        'diet_instructions'        => 'Regular diet, oral hydration 2L/day.',
        'activity_restrictions'    => 'Avoid vigorous aerobic exertion for 7 days.',
        'follow_up_instructions'   => 'Follow up at Pulmonary Clinic in 7 days. Return to ER if cyanosis or severe chest pain occurs.',
        'attending_physician_name' => 'Dr. Emily Watson, MD',
        'physician_license_number' => 'MD-0987123'
    ];

    $draftRes = $dsService->saveDraft($admId, $draftPayload, 1);
    echo "Draft saved: " . ($draftRes['success'] ? 'true' : 'false') . "\n";
    echo "Summary Number: {$draftRes['data']['summary_number']}\n";
    echo "Is Finalized: " . ($draftRes['data']['is_finalized'] ? '1' : '0') . "\n";
    assert($draftRes['success'] === true, "Draft save must succeed");
    assert($draftRes['data']['is_finalized'] == 0, "Draft should not be finalized");
    assert(!empty($draftRes['data']['summary_number']), "Summary number must be generated");

    echo "\n=== TEST 3: Validation on Finalization ===\n";
    $invalidPayload = $draftPayload;
    $invalidPayload['discharge_diagnosis'] = ''; // Missing required
    try {
        $dsService->finalize($admId, $invalidPayload, 1);
        assert(false, "Finalization without discharge diagnosis must fail");
    } catch (Exception $e) {
        echo "Validation caught expected error: " . $e->getMessage() . "\n";
        assert(strpos($e->getMessage(), 'Discharge Diagnosis') !== false, "Error message must mention missing diagnosis");
    }

    echo "\n=== TEST 4: Sign & Finalize Clinical Discharge Summary ===\n";
    $finalizeRes = $dsService->finalize($admId, $draftPayload, 1);
    echo "Finalize result: " . ($finalizeRes['success'] ? 'true' : 'false') . "\n";
    echo "Electronic Signature: {$finalizeRes['data']['electronic_signature']}\n";
    echo "Signature Date: {$finalizeRes['data']['signature_date']}\n";
    assert($finalizeRes['success'] === true, "Finalization must succeed");
    assert($finalizeRes['data']['is_finalized'] == 1, "Must be flagged as is_finalized = 1");
    assert(!empty($finalizeRes['data']['electronic_signature']), "Must contain electronic signature stamp");

    // Verify admission updated
    $updatedAdm = $db->query("SELECT * FROM inpatient_admissions WHERE id = {$admId}")->fetch(PDO::FETCH_ASSOC);
    echo "Admission status: {$updatedAdm['status']}\n";
    echo "Discharge Disposition: {$updatedAdm['discharge_disposition']}\n";
    echo "Discharge Date: {$updatedAdm['discharge_date']}\n";
    assert($updatedAdm['status'] === 'Discharged', "Admission status must be synchronized to Discharged");
    assert(!empty($updatedAdm['discharge_date']), "Discharge date must be set");

    // Verify bed marked Dirty / Turnover
    $bedId = (int) $activeAdm['bed_id'];
    $updatedBed = $db->query("SELECT * FROM hospital_beds WHERE id = {$bedId}")->fetch(PDO::FETCH_ASSOC);
    echo "Bed status after discharge: {$updatedBed['status']}\n";
    assert($updatedBed['status'] === 'Dirty / Turnover', "Bed must be transitioned to Dirty / Turnover");
    assert($updatedBed['current_admission_id'] === null, "current_admission_id on bed must be cleared");

    echo "\n=== TEST 5: Generate Print-Ready HTML / PDF View ===\n";
    $html = $dsService->generatePrintHtml($admId);
    echo "Generated HTML size: " . strlen($html) . " bytes\n";
    assert(strpos($html, 'CLINICAL DISCHARGE SUMMARY') !== false, "HTML must contain CLINICAL DISCHARGE SUMMARY header");
    assert(strpos($html, $finalizeRes['data']['summary_number']) !== false, "HTML must include summary number");
    assert(strpos($html, 'Electronically Verified') !== false, "HTML must include electronic signature stamp");
    assert(strpos($html, 'Resolved Acute Bronchitis') !== false, "HTML must include final discharge diagnosis");
    assert(strpos($html, '@media print') !== false, "HTML must contain print media stylesheet");

    echo "\nALL DISCHARGE SUMMARY UNIT, SERVICE, ADT SYNCHRONIZATION, AND PRINT GENERATOR TESTS PASSED!\n";
} catch (Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
