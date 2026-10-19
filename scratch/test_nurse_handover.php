<?php

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Modules\InpatientAdmissions\Services\InpatientAdmissionsService;

echo "=== STARTING NURSE TRANSFER HANDOVER DUAL SIGN-OFF TEST ===\n\n";

$db = Database::connection();
$service = new InpatientAdmissionsService();

// Step 1: Find an active admission
$adm = $db->query("
    SELECT a.*, b.bed_number, b.ward_id AS current_ward_id 
    FROM inpatient_admissions a
    JOIN hospital_beds b ON a.bed_id = b.id
    WHERE a.status = 'Admitted'
    LIMIT 1
")->fetch(PDO::FETCH_ASSOC);

if (!$adm) {
    // If no active admission, find any available bed and admit a test patient
    $availBed = $db->query("SELECT id, bed_number, ward_id FROM hospital_beds WHERE status = 'Available' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    if (!$availBed) {
        // Reset a bed to available
        $db->query("UPDATE hospital_beds SET status = 'Available', current_admission_id = NULL LIMIT 1");
        $availBed = $db->query("SELECT id, bed_number, ward_id FROM hospital_beds WHERE status = 'Available' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
    }
    
    echo "Creating test admission for transfer handover test...\n";
    $admitRes = $service->admitPatient([
        'bed_id' => $availBed['id'],
        'patient_name' => 'Corazon Aquino Ramos',
        'patient_mrn' => 'PAT-TEST-HANDOVER',
        'patient_age' => 54,
        'gender' => 'Female',
        'admission_source' => 'Emergency Room (ER)',
        'admission_type' => 'Urgent',
        'admitting_diagnosis' => 'Severe Sepsis secondary to Pyelonephritis',
        'attending_physician' => 'Dr. Manuel Roxas, MD',
        'primary_nurse' => 'Nurse Carla Santos, RN',
        'isolation_precautions' => 'Contact'
    ]);
    $admissionId = (int)$admitRes['id'];
} else {
    $admissionId = (int)$adm['id'];
}

echo "[1] Using active admission ID: {$admissionId}\n";

// Step 2: Pick a destination available bed
$toBed = $db->query("
    SELECT id, bed_number, ward_id 
    FROM hospital_beds 
    WHERE status = 'Available' AND id != (SELECT bed_id FROM inpatient_admissions WHERE id = {$admissionId})
    LIMIT 1
")->fetch(PDO::FETCH_ASSOC);

if (!$toBed) {
    // Create or reset another bed as Available
    $db->query("UPDATE hospital_beds SET status = 'Available', current_admission_id = NULL WHERE id != (SELECT bed_id FROM inpatient_admissions WHERE id = {$admissionId}) LIMIT 1");
    $toBed = $db->query("
        SELECT id, bed_number, ward_id 
        FROM hospital_beds 
        WHERE status = 'Available' AND id != (SELECT bed_id FROM inpatient_admissions WHERE id = {$admissionId})
        LIMIT 1
    ")->fetch(PDO::FETCH_ASSOC);
}

$toBedId = (int)$toBed['id'];
echo "[2] Destination bed: ID {$toBedId} ({$toBed['bed_number']})\n";

// Step 3: Perform Transfer with SBAR and Sending Nurse Electronic Signature
echo "\n[3] Executing transfer with SBAR handover & Sending Nurse Sign-off...\n";
$vitals = [
    'bp' => '118/76',
    'hr' => 82,
    'rr' => 16,
    'temp' => 37.1,
    'spo2' => 98,
    'pain_scale' => '2/10 (mild left flank)'
];

$transferData = [
    'admission_id' => $admissionId,
    'to_bed_id' => $toBedId,
    'transfer_reason' => 'Step-down transfer to telemetry monitoring ward',
    'transfer_notes' => 'Patient stabilized post-IV antibiotic initiation. Catheter patent, urine output clear.',
    'transferred_by' => 'Nurse Carla Santos, RN',
    'sending_nurse_name' => 'Nurse Carla Santos, RN',
    'sending_nurse_signature' => 'Electronically Verified & Signed by Carla Santos, RN [PRC# 0498212] on ' . date('Y-m-d H:i:s'),
    'sbar_situation' => '54yo F with resolving sepsis transferred from ER to Acute Telemetry.',
    'sbar_background' => 'Admitted with acute pyelonephritis, IV Ceftriaxone day 1, no known drug allergies.',
    'sbar_assessment' => 'Vitals stable on room air. Flank pain improved from 7/10 to 2/10. IV site left forearm patent.',
    'sbar_recommendation' => 'Continue IV antibiotics at 20:00, monitor telemetry, strict I&O charting.',
    'vitals_at_transfer' => $vitals
];

$transferRes = $service->transferPatient($admissionId, $transferData, 1);
$transferId = (int)$transferRes['transfer_id'];
echo "-> Transfer created! Transfer ID: {$transferId}, Initial Status: {$transferRes['handover_status']}\n";
assert($transferRes['handover_status'] === 'Pending Acceptance', "Initial handover status must be 'Pending Acceptance'");

// Verify transfer in database
$detail = $service->getTransferDetail($transferId);
echo "-> Sending Nurse Signature: {$detail['sending_nurse_signature']}\n";
echo "-> SBAR Situation: {$detail['sbar_situation']}\n";
echo "-> Vitals BP: {$detail['vitals_at_transfer']['bp']}, SpO2: {$detail['vitals_at_transfer']['spo2']}%\n";
assert(!empty($detail['sending_nurse_signature']));
assert($detail['handover_status'] === 'Pending Acceptance');

// Step 4: Verify pending handovers list
echo "\n[4] Checking listPendingHandovers()...\n";
$pendingList = $service->listPendingHandovers();
echo "-> Total pending handovers found: " . count($pendingList) . "\n";
$foundInPending = array_filter($pendingList, fn($p) => $p['id'] == $transferId);
assert(!empty($foundInPending), "Newly created transfer must appear in pending handovers list");

// Step 5: Receiving Ward Accepting Nurse Bedside Sign-off
echo "\n[5] Receiving Ward Accepting Nurse Bedside Sign-off...\n";
$acceptData = [
    'receiving_nurse_name' => 'Nurse Jennifer Lopez, BSN, RN',
    'receiving_nurse_signature' => 'Electronically Verified & Accepted at Bedside by Jennifer Lopez, BSN, RN [PRC# 0512890] on ' . date('Y-m-d H:i:s'),
    'receiving_acceptance_notes' => 'Patient received at bedside. ID band confirmed with chart. IV fluids running as ordered. Patient oriented x4.',
    'handover_status' => 'Accepted'
];

$acceptRes = $service->acceptTransferHandover($transferId, $acceptData, 2);
echo "-> Acceptance result status: {$acceptRes['handover_status']}\n";
echo "-> Receiving Nurse Name: {$acceptRes['receiving_nurse_name']}\n";
echo "-> Receiving Nurse Signature: {$acceptRes['receiving_nurse_signature']}\n";
echo "-> Receiving Verified At: {$acceptRes['receiving_verified_at']}\n";

assert($acceptRes['handover_status'] === 'Accepted');
assert($acceptRes['receiving_nurse_name'] === 'Nurse Jennifer Lopez, BSN, RN');
assert(!empty($acceptRes['receiving_nurse_signature']));
assert(!empty($acceptRes['receiving_nurse_signed_at']));

// Step 6: Verify transfer is now removed from pending list
$pendingListAfter = $service->listPendingHandovers();
$foundAfter = array_filter($pendingListAfter, fn($p) => $p['id'] == $transferId);
assert(empty($foundAfter), "Accepted transfer must NO LONGER appear in pending handovers list");
echo "-> Transfer {$transferId} successfully cleared from pending handovers list!\n";

// Step 7: Verify whiteboard KPIs include pending_handovers_count
echo "\n[7] Checking Whiteboard KPIs...\n";
$wb = $service->getCensusWhiteboard();
echo "-> Whiteboard pending_handovers_count: {$wb['kpis']['pending_handovers_count']}\n";
assert(isset($wb['kpis']['pending_handovers_count']));

echo "\n*** ALL NURSE TRANSFER HANDOVER TESTS PASSED WITH DUAL SIGN-OFF! ***\n";
