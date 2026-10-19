<?php

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Modules\Patients\Services\MpiService;
use App\Modules\Patients\Services\PatientService;

try {
    $mpi = new MpiService();

    echo "=== TEST 1: Exact Match Scoring ===\n";
    $p1 = [
        'first_name' => 'Maria',
        'last_name' => 'Santos',
        'birthdate' => '1985-04-15',
        'sex' => 'female',
        'city' => 'Manila',
        'mobile_phone' => '09171234567'
    ];
    $scoreExact = $mpi->scoreMatch($p1, $p1);
    echo "Exact Match Score: {$scoreExact['score']} ({$scoreExact['level']})\n";
    assert($scoreExact['score'] >= 90, "Exact match should be >= 90");

    echo "\n=== TEST 2: Phonetic Name + Exact DOB ===\n";
    $targetPhonetic = [
        'first_name' => 'Jonathon',
        'last_name' => 'Smythe',
        'birthdate' => '1990-08-20',
        'sex' => 'male'
    ];
    $candidatePhonetic = [
        'first_name' => 'Jonathan',
        'last_name' => 'Smith',
        'birthdate' => '1990-08-20',
        'sex' => 'male'
    ];
    $scorePhonetic = $mpi->scoreMatch($candidatePhonetic, $targetPhonetic);
    echo "Phonetic Score: {$scorePhonetic['score']} ({$scorePhonetic['level']})\n";
    echo "Factors: " . implode(', ', $scorePhonetic['factors']) . "\n";
    assert($scorePhonetic['score'] >= 80, "Phonetic match + exact DOB should be >= 80");

    echo "\n=== TEST 3: Transposed Birthdate ===\n";
    $targetTransposed = [
        'first_name' => 'Roberto',
        'last_name' => 'Cruz',
        'birthdate' => '1992-05-11',
        'sex' => 'male'
    ];
    $candidateTransposed = [
        'first_name' => 'Roberto',
        'last_name' => 'Cruz',
        'birthdate' => '1992-11-05',
        'sex' => 'male'
    ];
    $scoreTransposed = $mpi->scoreMatch($candidateTransposed, $targetTransposed);
    echo "Transposed DOB Score: {$scoreTransposed['score']} ({$scoreTransposed['level']})\n";
    echo "Factors: " . implode(', ', $scoreTransposed['factors']) . "\n";
    $hasTransposedFactor = false;
    foreach ($scoreTransposed['factors'] as $factor) {
        if (stripos($factor, 'Transposed birthdate') !== false) {
            $hasTransposedFactor = true;
            break;
        }
    }
    assert($hasTransposedFactor, "Should identify transposed DOB");

    echo "\n=== TEST 4: Official ID Exact Match ===\n";
    $targetId = [
        'first_name' => 'Different',
        'last_name' => 'Name',
        'birthdate' => '1990-01-01',
        'id_document_number' => 'PASSPORT-12345678'
    ];
    $candidateId = [
        'first_name' => 'Someone',
        'last_name' => 'Else',
        'birthdate' => '1995-02-02',
        'id_document_number' => 'PASSPORT-12345678'
    ];
    $scoreId = $mpi->scoreMatch($candidateId, $targetId);
    echo "ID Match Score: {$scoreId['score']} ({$scoreId['level']})\n";
    assert($scoreId['score'] === 100, "Official ID exact match must score 100");

    echo "\n=== TEST 5: Sex Mismatch Penalty ===\n";
    $targetMale = [
        'first_name' => 'Alex',
        'last_name' => 'Reyes',
        'birthdate' => '1988-10-10',
        'sex' => 'male'
    ];
    $candidateFemale = [
        'first_name' => 'Alex',
        'last_name' => 'Reyes',
        'birthdate' => '1988-10-10',
        'sex' => 'female'
    ];
    $scoreSexMismatch = $mpi->scoreMatch($candidateFemale, $targetMale);
    echo "Sex Mismatch Score: {$scoreSexMismatch['score']} (Exact was {$scoreExact['score']})\n";
    echo "Factors: " . implode(', ', $scoreSexMismatch['factors']) . "\n";
    $hasSexPenalty = false;
    foreach ($scoreSexMismatch['factors'] as $factor) {
        if (stripos($factor, 'sex mismatch') !== false) {
            $hasSexPenalty = true;
            break;
        }
    }
    assert($hasSexPenalty, "Should apply sex mismatch penalty");
    assert($scoreSexMismatch['score'] === 75, "Score should reflect -25 deduction from 100");

    echo "\n=== TEST 6: PatientService checkMpiDuplicates API check ===\n";
    $patientService = new PatientService();
    $dupCheck = $patientService->checkMpiDuplicates([
        'first_name' => 'NonExistentPersonName12345XYZ',
        'last_name' => 'NoWayThisExistsInDB999',
        'birthdate' => '1950-01-01'
    ]);
    echo "Check non-existent duplicates: " . count($dupCheck['matches']) . " matches found. Has high confidence: " . ($dupCheck['has_high_confidence'] ? 'true' : 'false') . "\n";
    assert(count($dupCheck['matches']) === 0, "Non-existent person should have 0 matches");
    assert($dupCheck['has_high_confidence'] === false, "Should not have high confidence duplicate");

    echo "\n=== TEST 7: Query Real Patient and Detect Duplicate ===\n";
    $db = \App\Core\Database::connection();
    $realPatient = $db->query("SELECT id, first_name, last_name, birthdate, sex FROM patients WHERE deleted_at IS NULL LIMIT 1")->fetch(PDO::FETCH_ASSOC);

    if ($realPatient) {
        echo "Testing with existing patient: {$realPatient['first_name']} {$realPatient['last_name']} (ID: {$realPatient['id']}, DOB: {$realPatient['birthdate']})\n";
        $dupCheckReal = $patientService->checkMpiDuplicates([
            'first_name' => $realPatient['first_name'],
            'last_name' => $realPatient['last_name'],
            'birthdate' => $realPatient['birthdate'],
            'sex' => $realPatient['sex']
        ]);
        echo "Found " . count($dupCheckReal['matches']) . " match(es). Top score: " . ($dupCheckReal['matches'][0]['score'] ?? 0) . "%\n";
        assert(count($dupCheckReal['matches']) >= 1, "Should find at least 1 match for existing patient");
        assert($dupCheckReal['has_high_confidence'] === true, "Should flag as high confidence duplicate");

        echo "\n=== TEST 8: Registration Duplicate Prevention ===\n";
        $regAttempt = $patientService->register([
            'username' => 'test_dup_' . time(),
            'password' => 'Password123!',
            'first_name' => $realPatient['first_name'],
            'last_name' => $realPatient['last_name'],
            'birthdate' => $realPatient['birthdate'],
            'sex' => $realPatient['sex'],
            'civil_status' => 'Single',
            'blood_type' => 'O+',
            'height' => '170',
            'weight' => '65'
        ], 1);

        echo "Registration without override success: " . ($regAttempt['success'] ? 'true' : 'false') . "\n";
        echo "Registration is_duplicate flagged: " . (!empty($regAttempt['is_duplicate']) ? 'true' : 'false') . "\n";
        assert($regAttempt['success'] === false, "Registration without override must fail");
        assert(!empty($regAttempt['is_duplicate']), "Must set is_duplicate flag");
        assert(!empty($regAttempt['duplicate_matches']), "Must return duplicate matches");
        echo "Duplicate message: " . $regAttempt['message'] . "\n";

        echo "\n=== TEST 9: Registration With force_duplicate_override ===\n";
        $regOverrideAttempt = $patientService->register([
            'username' => 'test_override_' . time(),
            'password' => 'Password123!',
            'first_name' => $realPatient['first_name'],
            'last_name' => $realPatient['last_name'],
            'birthdate' => $realPatient['birthdate'],
            'sex' => $realPatient['sex'],
            'civil_status' => 'Single',
            'blood_type' => 'O+',
            'height' => '170',
            'weight' => '65',
            'force_duplicate_override' => 1
        ], 1);

        echo "Registration with override success: " . ($regOverrideAttempt['success'] ? 'true' : 'false') . "\n";
        echo "Registration is_duplicate flagged: " . (!empty($regOverrideAttempt['is_duplicate']) ? 'true' : 'false') . "\n";
        assert(empty($regOverrideAttempt['is_duplicate']), "Must NOT set is_duplicate flag when overridden");
        if ($regOverrideAttempt['success']) {
            $createdPatientId = (int)$regOverrideAttempt['data']['patient_id'];
            $createdUserId = (int)$regOverrideAttempt['data']['user_id'];
            echo "Successfully created patient ID: {$createdPatientId} (Patient No: " . $regOverrideAttempt['data']['patient_no'] . ")\n";
            $db->exec("DELETE FROM patient_contacts WHERE patient_id = {$createdPatientId}");
            $db->exec("DELETE FROM patient_employers WHERE patient_id = {$createdPatientId}");
            $db->exec("DELETE FROM patient_guardians WHERE patient_id = {$createdPatientId}");
            $db->exec("DELETE FROM patients WHERE id = {$createdPatientId}");
            $db->exec("DELETE FROM users WHERE id = {$createdUserId}");
            echo "Cleaned up temporary test patient.\n";
        }
        // Also cleanup lingering test patients if any
        $lingering = $db->query("SELECT id, user_id FROM patients WHERE patient_no IN ('PAT-000064', 'PAT-000065')")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($lingering as $l) {
            $pid = (int)$l['id'];
            $uid = (int)$l['user_id'];
            $db->exec("DELETE FROM patient_contacts WHERE patient_id = {$pid}");
            $db->exec("DELETE FROM patient_employers WHERE patient_id = {$pid}");
            $db->exec("DELETE FROM patient_guardians WHERE patient_id = {$pid}");
            $db->exec("DELETE FROM patients WHERE id = {$pid}");
            if ($uid) $db->exec("DELETE FROM users WHERE id = {$uid}");
        }
    }

    echo "\nALL MPI UNIT, SERVICE, AND REGISTRATION TESTS PASSED!\n";
} catch (Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
    exit(1);
}
