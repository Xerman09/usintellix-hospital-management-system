<?php

declare(strict_types=1);

/**
 * HIPAA § 164.312(a)(2)(iv) Field-Level Database Encryption Test Suite
 *
 * Verifies NIST SP 800-38D AES-256-GCM authenticated encryption at rest
 * for sensitive patient and financial fields:
 * - SSN and National IDs (patients)
 * - Credit Cards & Banking (patient_ledger_payments, facilities)
 * - Psychotherapy & Psychiatric Notes (patient_psychiatric_notes, encounter_soap_notes)
 */

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Core\FieldEncryption;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Services\PatientService;
use App\Modules\PatientLedger\Models\PatientLedgerPayment;
use App\Modules\PatientLedger\Services\PatientLedgerService;
use App\Modules\PatientPsychiatricNotes\Models\PatientPsychiatricNote;
use App\Modules\PatientPsychiatricNotes\Services\PatientPsychiatricNoteService;
use App\Modules\EncounterSoapNotes\Models\EncounterSoapNote;
use App\Modules\EncounterSoapNotes\Services\EncounterSoapNoteService;
use App\Modules\Facilities\Models\Facility;
use App\Modules\Users\Models\User;

Env::load();

echo "\n======================================================================\n";
echo "  HIPAA § 164.312(a)(2)(iv) FIELD-LEVEL DATABASE ENCRYPTION (AES-256-GCM)\n";
echo "======================================================================\n\n";

$db = Database::getInstance()->getConnection();
$passed = 0;
$failed = 0;

function reportTest(string $title, bool $success, string $details = ''): void {
    global $passed, $failed;
    if ($success) {
        $passed++;
        echo "  [PASS] {$title}\n";
        if (!empty($details)) {
            echo "         -> {$details}\n";
        }
    } else {
        $failed++;
        echo "  [FAIL] {$title}\n";
        if (!empty($details)) {
            echo "         -> Error: {$details}\n";
        }
    }
}

// ----------------------------------------------------------------------
// 1. Core Cryptographic Engine Verification
// ----------------------------------------------------------------------
echo "1. Testing AES-256-GCM Core Cryptographic Engine...\n";

$key = FieldEncryption::getKey();
reportTest(
    "256-bit binary encryption key derived",
    strlen($key) === 32,
    "Key length: " . (strlen($key) * 8) . " bits"
);

$plaintextSsn = "987-65-4321";
$encryptedSsn = FieldEncryption::encrypt($plaintextSsn);
reportTest(
    "Plaintext encrypted into envelope",
    FieldEncryption::isEncrypted($encryptedSsn),
    "Ciphertext: " . substr($encryptedSsn, 0, 32) . "..."
);

$decryptedSsn = FieldEncryption::decrypt($encryptedSsn);
reportTest(
    "Encrypted envelope decrypted successfully",
    $decryptedSsn === $plaintextSsn,
    "Decrypted matches original plaintext"
);

// Non-deterministic IV test
$encryptedSsn2 = FieldEncryption::encrypt($plaintextSsn);
reportTest(
    "Randomized 96-bit IV produces non-deterministic ciphertexts",
    $encryptedSsn !== $encryptedSsn2 && FieldEncryption::decrypt($encryptedSsn2) === $plaintextSsn,
    "Different ciphertexts decrypt to identical plaintext"
);

// Tamper resistance test
$rawPayload = base64_decode(substr($encryptedSsn, strlen(FieldEncryption::PREFIX)));
$tamperedRaw = $rawPayload;
$tamperedRaw[20] = chr(ord($tamperedRaw[20]) ^ 1); // Flip one bit in tag/ciphertext
$tamperedEnvelope = FieldEncryption::PREFIX . base64_encode($tamperedRaw);
$tamperedDecrypted = FieldEncryption::decrypt($tamperedEnvelope);
reportTest(
    "AEAD authentication tag detects tampering (decryption fails)",
    $tamperedDecrypted === null,
    "Tampered ciphertext was rejected safely"
);

// Masking helpers test
$maskedSsn = FieldEncryption::maskSsn($plaintextSsn);
$maskedCard = FieldEncryption::maskCard("4111111111114444");
$maskedNid = FieldEncryption::maskNationalId("NID-8874102");
reportTest(
    "PII masking utilities format safely",
    $maskedSsn === "***-**-4321" && $maskedCard === "**** **** **** 4444" && str_ends_with($maskedNid, "4102"),
    "SSN: $maskedSsn, Card: $maskedCard, NID: $maskedNid"
);

// ----------------------------------------------------------------------
// 2. Patient SSN and National ID Field-Level Encryption
// ----------------------------------------------------------------------
echo "\n2. Testing Patient Demographic Encryption (SSN & National ID)...\n";

$testUsername = 'test_enc_user_' . time();
$testUserId = (int) (new User())->create([
    'username'   => $testUsername,
    'password'   => User::hashPassword('Password123!'),
    'role_id'    => 1,
    'created_at' => date('Y-m-d H:i:s')
]);

$testPatientNo = 'TEST-ENC-' . time();
$patientModel = new Patient();
$testPatientId = (int) $patientModel->create([
    'user_id'      => $testUserId,
    'first_name'   => 'CryptoTest',
    'last_name'    => 'Patient',
    'patient_no'   => $testPatientNo,
    'sex'          => 'male',
    'birthdate'    => '1985-05-15',
    'civil_status' => 'Single',
    'blood_type'   => 'O+',
    'height'       => 175.0,
    'weight'       => 70.0,
    'ssn'          => '111-22-3333',
    'national_id'  => 'NID-PHIL-987654',
    'created_at'   => date('Y-m-d H:i:s'),
    'created_by'   => 1
]);

reportTest(
    "Test patient created via Model",
    $testPatientId > 0,
    "Patient ID: {$testPatientId}, Patient No: {$testPatientNo}"
);

// Direct raw MySQL query to prove storage is ciphertext
$stmt = $db->prepare("SELECT ssn, national_id FROM patients WHERE id = :id");
$stmt->execute(['id' => $testPatientId]);
$rawPatient = $stmt->fetch(PDO::FETCH_ASSOC);

reportTest(
    "Raw MySQL database stores SSN as AES-256-GCM ciphertext (NOT plaintext)",
    str_starts_with($rawPatient['ssn'] ?? '', 'enc:v1:'),
    "Raw DB ssn: " . substr($rawPatient['ssn'] ?? '', 0, 32) . "..."
);

reportTest(
    "Raw MySQL database stores National ID as AES-256-GCM ciphertext (NOT plaintext)",
    str_starts_with($rawPatient['national_id'] ?? '', 'enc:v1:'),
    "Raw DB national_id: " . substr($rawPatient['national_id'] ?? '', 0, 32) . "..."
);

// Transparent read via Model
$readPatient = (new Patient())->find($testPatientId);
reportTest(
    "Model find() automatically and transparently decrypts SSN and National ID",
    $readPatient['ssn'] === '111-22-3333' && $readPatient['national_id'] === 'NID-PHIL-987654',
    "Decrypted SSN: {$readPatient['ssn']}, National ID: {$readPatient['national_id']}"
);

// Update test
(new Patient())->update(['ssn' => '999-88-7777'], $testPatientId);
$stmt->execute(['id' => $testPatientId]);
$rawUpdated = $stmt->fetch(PDO::FETCH_ASSOC);
$readUpdated = (new Patient())->find($testPatientId);
reportTest(
    "Model update() transparently encrypts updated fields",
    str_starts_with($rawUpdated['ssn'] ?? '', 'enc:v1:') && $readUpdated['ssn'] === '999-88-7777',
    "Updated raw: " . substr($rawUpdated['ssn'], 0, 30) . "... | Decrypted: {$readUpdated['ssn']}"
);

// ----------------------------------------------------------------------
// 3. Credit Card & Payment Instrument Encryption at Rest
// ----------------------------------------------------------------------
echo "\n3. Testing Payment Instrument & Credit Card Encryption...\n";

$ledgerService = new PatientLedgerService();
$paymentRes = $ledgerService->addPayment($testPatientId, [
    'payer_type'        => 'patient',
    'payment_type'      => 'Credit Card',
    'card_number'       => '4242424242424242',
    'card_expiry'       => '08/29',
    'card_cvv'          => '321',
    'payment_date'      => date('Y-m-d'),
    'payment_amount'    => 75.00,
    'adjustment_amount' => 0.00,
    'notes'             => 'Clinical visit copay'
], 1);

reportTest(
    "Payment recorded via PatientLedgerService",
    $paymentRes['success'] === true,
    "Payment ID: " . ($paymentRes['data']['id'] ?? 'none')
);

$paymentId = (int) ($paymentRes['data']['id'] ?? 0);

// Raw DB check
$stmt = $db->prepare("SELECT card_number, card_expiry, card_cvv FROM patient_ledger_payments WHERE id = :id");
$stmt->execute(['id' => $paymentId]);
$rawPayment = $stmt->fetch(PDO::FETCH_ASSOC);

reportTest(
    "Raw MySQL database stores card_number as AES-256-GCM ciphertext",
    str_starts_with($rawPayment['card_number'] ?? '', 'enc:v1:'),
    "Raw card_number: " . substr($rawPayment['card_number'] ?? '', 0, 30) . "..."
);

reportTest(
    "Raw MySQL database stores card_expiry and card_cvv as AES-256-GCM ciphertext",
    str_starts_with($rawPayment['card_expiry'] ?? '', 'enc:v1:') && str_starts_with($rawPayment['card_cvv'] ?? '', 'enc:v1:'),
    "Raw CVV: " . substr($rawPayment['card_cvv'] ?? '', 0, 30) . "..."
);

// Read via Model
$readPayment = (new PatientLedgerPayment())->find($paymentId);
reportTest(
    "Model find() decrypts payment card details",
    $readPayment['card_number'] === '4242424242424242' && $readPayment['card_cvv'] === '321',
    "Decrypted Card: {$readPayment['card_number']}, Expiry: {$readPayment['card_expiry']}"
);

// Ledger list masking check
$ledgerData = $ledgerService->getLedger($testPatientId, date('Y-m-d'), date('Y-m-d'));
$paymentRows = array_filter($ledgerData['rows'], fn($r) => $r['row_type'] === 'payment');
$firstPayment = reset($paymentRows);
reportTest(
    "Ledger report displays safely masked card representation",
    !empty($firstPayment['card_number_masked']) && $firstPayment['card_number_masked'] === '**** **** **** 4242',
    "Masked: " . ($firstPayment['card_number_masked'] ?? 'none')
);

// ----------------------------------------------------------------------
// 4. Psychotherapy & Psychiatric Notes Encryption (HIPAA § 164.501)
// ----------------------------------------------------------------------
echo "\n4. Testing Psychotherapy & Psychiatric Notes Encryption...\n";

$psychService = new PatientPsychiatricNoteService();
$psychRes = $psychService->store([
    'patient_id'           => $testPatientId,
    'provider_id'          => 1,
    'session_date'         => date('Y-m-d'),
    'diagnosis_code'       => 'F43.10',
    'symptoms'             => 'Post-traumatic flashbacks and acute panic responses',
    'psychiatric_notes'    => 'Confidential psychotherapy evaluation session. Patient discussed high-stress triggers.',
    'treatment_plan'       => 'Trauma-informed cognitive restructuring, bi-weekly outpatient counseling.',
    'confidential_remarks' => 'Sensitive psychological notes separated from standard chart.'
], 1);

reportTest(
    "Psychiatric note recorded via PatientPsychiatricNoteService",
    $psychRes['success'] === true,
    "Psychiatric Note ID: " . ($psychRes['data']['id'] ?? 'none')
);

$psychNoteId = (int) ($psychRes['data']['id'] ?? 0);

// Raw DB check
$stmt = $db->prepare("SELECT symptoms, psychiatric_notes, treatment_plan, confidential_remarks FROM patient_psychiatric_notes WHERE id = :id");
$stmt->execute(['id' => $psychNoteId]);
$rawPsych = $stmt->fetch(PDO::FETCH_ASSOC);

reportTest(
    "Raw database stores psychiatric_notes as AES-256-GCM ciphertext",
    str_starts_with($rawPsych['psychiatric_notes'] ?? '', 'enc:v1:'),
    "Raw notes: " . substr($rawPsych['psychiatric_notes'] ?? '', 0, 30) . "..."
);

reportTest(
    "Raw database stores confidential_remarks and symptoms as AES-256-GCM ciphertext",
    str_starts_with($rawPsych['symptoms'] ?? '', 'enc:v1:') && str_starts_with($rawPsych['confidential_remarks'] ?? '', 'enc:v1:'),
    "Raw remarks: " . substr($rawPsych['confidential_remarks'] ?? '', 0, 30) . "..."
);

// Service read
$readPsych = $psychService->find($psychNoteId);
reportTest(
    "PsychiatricNoteService decrypts notes for authorized clinical view",
    str_contains($readPsych['psychiatric_notes'] ?? '', 'Confidential psychotherapy evaluation session')
    && str_contains($readPsych['confidential_remarks'] ?? '', 'Sensitive psychological notes'),
    "Decrypted note snippet: " . substr($readPsych['psychiatric_notes'] ?? '', 0, 45) . "..."
);

// ----------------------------------------------------------------------
// 5. Encounter SOAP Notes Encryption
// ----------------------------------------------------------------------
echo "\n5. Testing Encounter Clinical SOAP Notes Encryption...\n";

$existingEncId = (int) ($db->query("SELECT id FROM encounters LIMIT 1")->fetchColumn() ?: 1);

$soapModel = new EncounterSoapNote();
$soapId = $soapModel->create([
    'encounter_id' => $existingEncId,
    'author_name'  => 'Dr. Test Physician',
    'subjective'   => 'Patient reports severe persistent headaches.',
    'objective'    => 'BP 125/80, Neurological exam unremarkable.',
    'assessment'   => 'Tension-type headache, primary.',
    'plan'         => 'Prescribed NSAID therapy, hydration, follow-up in 14 days.',
    'created_at'   => date('Y-m-d H:i:s'),
    'created_by'   => 1
]);

reportTest(
    "SOAP note created via EncounterSoapNote model",
    $soapId > 0,
    "SOAP Note ID: {$soapId}"
);

// Raw DB check
$stmt = $db->prepare("SELECT subjective, objective, assessment, plan FROM encounter_soap_notes WHERE id = :id");
$stmt->execute(['id' => $soapId]);
$rawSoap = $stmt->fetch(PDO::FETCH_ASSOC);

reportTest(
    "Raw database stores SOAP clinical text as AES-256-GCM ciphertext",
    str_starts_with($rawSoap['subjective'] ?? '', 'enc:v1:')
    && str_starts_with($rawSoap['objective'] ?? '', 'enc:v1:')
    && str_starts_with($rawSoap['assessment'] ?? '', 'enc:v1:')
    && str_starts_with($rawSoap['plan'] ?? '', 'enc:v1:'),
    "Raw subjective: " . substr($rawSoap['subjective'] ?? '', 0, 30) . "..."
);

$readSoap = $soapModel->find($soapId);
reportTest(
    "SOAP note transparently decrypted on read",
    $readSoap['subjective'] === 'Patient reports severe persistent headaches.'
    && $readSoap['assessment'] === 'Tension-type headache, primary.',
    "Decrypted assessment: {$readSoap['assessment']}"
);

// ----------------------------------------------------------------------
// Clean Up Test Data
// ----------------------------------------------------------------------
$db->exec("DELETE FROM patient_psychiatric_notes WHERE id = {$psychNoteId}");
$db->exec("DELETE FROM patient_ledger_payments WHERE id = {$paymentId}");
$db->exec("DELETE FROM encounter_soap_notes WHERE id = {$soapId}");
$db->exec("DELETE FROM patients WHERE id = {$testPatientId}");
$db->exec("DELETE FROM users WHERE id = {$testUserId}");
echo "\nCleaned up all test records (Patient: $testPatientId, User: $testUserId).\n";

// ----------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------
echo "\n======================================================================\n";
echo "  SUMMARY: {$passed} PASSED, {$failed} FAILED\n";
echo "======================================================================\n\n";

if ($failed > 0) {
    exit(1);
}
