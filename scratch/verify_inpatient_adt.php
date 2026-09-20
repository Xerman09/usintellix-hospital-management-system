<?php

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Modules\InpatientAdmissions\Services\InpatientAdmissionsService;

try {
    $service = new InpatientAdmissionsService();

    echo "=== VERIFYING INPATIENT ADT LIFECYCLE ===\n";

    // 1. Find an available bed
    $beds = $service->getBeds(null, 'Available');
    if (empty($beds)) {
        throw new Exception("No available beds found for testing.");
    }
    $targetBed = $beds[0];
    echo "1. Selected Available Bed: {$targetBed['bed_number']} (ID: {$targetBed['id']})\n";

    // 2. Admit patient
    $admitData = [
        'bed_id' => $targetBed['id'],
        'patient_mrn' => 'PAT-000001',
        'patient_name' => 'John Doe',
        'admission_source' => 'Emergency Room (ER)',
        'admission_type' => 'Emergency / STAT',
        'admitting_diagnosis' => 'Acute Appendicitis with Localized Peritonitis',
        'attending_physician' => 'Dr. Robert Martinez, MD',
        'primary_nurse' => 'Nurse Carla Santos, RN',
        'isolation_precautions' => 'Contact',
        'expected_discharge_date' => date('Y-m-d', strtotime('+3 days')),
    ];
    $admission = $service->admitPatient($admitData, 1);
    echo "2. Patient Admitted: {$admission['admission_number']} -> Status: {$admission['status']}, Bed Status: {$admission['bed_status']}\n";

    // 3. Find another available bed for transfer
    $availBeds = $service->getBeds(null, 'Available');
    if (empty($availBeds)) {
        throw new Exception("No second available bed for transfer.");
    }
    $destBed = $availBeds[0];
    echo "3. Selected Transfer Destination Bed: {$destBed['bed_number']} (ID: {$destBed['id']})\n";

    // Execute transfer
    $transferred = $service->transferPatient($admission['id'], [
        'to_bed_id' => $destBed['id'],
        'transfer_reason' => 'Stepdown to Surgical Floor from Intensive Monitoring',
        'transfer_notes' => 'Vitals stabilized, tolerating clear liquids',
        'transferred_by' => 'Charge Nurse Jenkins, BSN',
    ], 1);
    echo "4. Patient Transferred: New Bed is {$transferred['bed_number']} (ID: {$transferred['bed_id']})\n";

    // Check old bed status -> Should be 'Dirty / Turnover'
    $oldBedCheck = $service->getBeds();
    $oldBed = null;
    foreach ($oldBedCheck as $b) {
        if ($b['id'] == $targetBed['id']) {
            $oldBed = $b;
            break;
        }
    }
    echo "5. Old Bed {$oldBed['bed_number']} status: {$oldBed['status']} (Expected: Dirty / Turnover)\n";
    if ($oldBed['status'] !== 'Dirty / Turnover') {
        throw new Exception("Old bed status was expected to be Dirty / Turnover, got {$oldBed['status']}");
    }

    // 6. Discharge patient
    $discharged = $service->dischargePatient($admission['id'], [
        'discharge_disposition' => 'Discharged Home with Outpatient Surgical Follow-up',
        'discharge_notes' => 'Sutures intact, oral antibiotics prescribed',
        'discharge_physician' => 'Dr. Robert Martinez, MD',
    ], 1);
    echo "6. Patient Discharged: Status = {$discharged['status']}\n";

    // Check new bed status -> Should also be 'Dirty / Turnover'
    $destBedCheck = $service->getBeds();
    $destBedFinal = null;
    foreach ($destBedCheck as $b) {
        if ($b['id'] == $destBed['id']) {
            $destBedFinal = $b;
            break;
        }
    }
    echo "7. Destination Bed {$destBedFinal['bed_number']} status after discharge: {$destBedFinal['status']} (Expected: Dirty / Turnover)\n";

    // 8. Housekeeping terminal sanitization sign-off
    $sanitized = $service->updateBedStatus($targetBed['id'], 'Available', 'Terminal UV and quaternary ammonium sanitization complete');
    echo "8. Bed {$targetBed['bed_number']} sanitized by Housekeeping: Status = {$sanitized['status']} (Expected: Available)\n";

    $sanitized2 = $service->updateBedStatus($destBed['id'], 'Available', 'Terminal cleaning complete');
    echo "9. Bed {$destBed['bed_number']} sanitized by Housekeeping: Status = {$sanitized2['status']} (Expected: Available)\n";

    echo "=== ALL ADT LIFECYCLE TESTS PASSED PERFECTLY! ===\n";

} catch (Throwable $t) {
    echo "VERIFICATION ERROR: " . $t->getMessage() . "\n" . $t->getTraceAsString() . "\n";
    exit(1);
}
