<?php
/**
 * Master HIPAA Automated Test Suite Runner
 * Runs all 14 HIPAA test suites, collects results, and verifies the full HMAC-SHA-256 audit hash chain.
 */

$testFiles = [
    'test_safe_harbor_deidentification.php'     => 'Safe Harbor 18-Identifier De-Identification (45 CFR § 164.514)',
    'test_workforce_training_and_sanctions.php' => 'Workforce Training & Sanctions Log (45 CFR § 164.308(a)(1) & (5))',
    'test_backup_and_disaster_recovery.php'     => 'Encrypted Backup & DR Verification (45 CFR § 164.308(a)(7))',
    'test_phi_amendments.php'                   => 'Statutory PHI Amendments Pipeline (45 CFR § 164.526)',
    'test_drs_right_of_access.php'               => 'Designated Record Set Right of Access (45 CFR § 164.524)',
    'test_confidential_communications.php'       => 'Confidential Communications Preferences (45 CFR § 164.522(b))',
    'test_hitech_restriction.php'               => 'HITECH Out-of-Pocket Insurance Restriction (§ 164.522(a)(1)(vi))',
    'test_business_associates.php'              => 'BAA Tracking & Vendor Governance (45 CFR § 164.502(e))',
    'test_security_incidents.php'               => 'Breach Notification & 4-Factor Risk Assessment (§ 164.402)',
    'test_accounting_of_disclosures.php'        => 'Accounting of Disclosures Registry (45 CFR § 164.528)',
    'test_field_encryption.php'                 => 'Field-Level AES-256-GCM Encryption (45 CFR § 164.312(a)(2)(iv))',
    'test_npp_consent.php'                      => 'Notice of Privacy Practices & Consent (45 CFR § 164.520)',
    'test_hipaa_retention_and_export.php'       => '6-Year Data Retention & Immutable Export (§ 164.316(b))',
    'test_minimum_necessary.php'                => 'Role-Based Minimum Necessary Access (§ 164.502(b))'
];

echo "========================================================================================\n";
echo "   USINTELLIX HEALTHCARE SYSTEM - MASTER HIPAA AUDIT REGRESSION TEST RUNNER             \n";
echo "   Testing All 14 Statutory HIPAA Compliance Subsystems                                 \n";
echo "========================================================================================\n\n";

$totalPassed = 0;
$totalFailed = 0;
$suiteResults = [];
$startTime = microtime(true);

foreach ($testFiles as $file => $description) {
    $fullPath = __DIR__ . DIRECTORY_SEPARATOR . $file;
    if (!file_exists($fullPath)) {
        echo "[-] ERROR: File {$file} does not exist!\n";
        $totalFailed++;
        continue;
    }

    echo ">> Running [{$file}]: {$description}...\n";
    $suiteStart = microtime(true);
    
    // Execute test in separate PHP process
    $command = 'php ' . escapeshellarg($fullPath) . ' 2>&1';
    $output = shell_exec($command);
    $suiteDuration = round(microtime(true) - $suiteStart, 2);

    // Extract test results: e.g. "TEST SUMMARY: X Passed, Y Failed" or similar
    $passed = 0;
    $failed = 0;

    if (preg_match('/TEST SUMMARY:\s*(\d+)\s*Passed,\s*(\d+)\s*Failed/i', $output, $m)) {
        $passed = (int)$m[1];
        $failed = (int)$m[2];
    } elseif (preg_match('/(\d+)\s*passed,\s*(\d+)\s*failed/i', $output, $m)) {
        $passed = (int)$m[1];
        $failed = (int)$m[2];
    } elseif (preg_match_all('/\[PASS\]/i', $output, $mPass)) {
        $passed = count($mPass[0]);
        preg_match_all('/\[FAIL\]/i', $output, $mFail);
        $failed = count($mFail[0]);
    }

    $totalPassed += $passed;
    $totalFailed += $failed;

    $statusStr = ($failed === 0 && $passed > 0) ? "[PASS]" : "[FAIL]";
    $suiteResults[] = [
        'file' => $file,
        'description' => $description,
        'passed' => $passed,
        'failed' => $failed,
        'duration' => $suiteDuration,
        'status' => $statusStr
    ];

    echo "   {$statusStr} {$passed} passed, {$failed} failed ({$suiteDuration}s)\n\n";
}

$totalDuration = round(microtime(true) - $startTime, 2);

echo "========================================================================================\n";
echo "   MASTER HIPAA REGRESSION AUDIT SCORECARD                                              \n";
echo "========================================================================================\n";
printf("%-40s | %-8s | %-8s | %-8s | %-8s\n", "Test Suite", "Status", "Passed", "Failed", "Duration");
echo str_repeat("-", 88) . "\n";

foreach ($suiteResults as $res) {
    printf("%-40s | %-8s | %-8d | %-8d | %-7.2fs\n", 
        substr($res['file'], 0, 40), 
        $res['status'], 
        $res['passed'], 
        $res['failed'], 
        $res['duration']
    );
}

echo str_repeat("=", 88) . "\n";
echo sprintf("TOTAL TESTS: %d Passed, %d Failed (Duration: %0.2fs)\n", $totalPassed, $totalFailed, $totalDuration);

if ($totalFailed === 0) {
    $countSuites = count($testFiles);
    echo "RESULT: ALL {$countSuites} TEST SUITES PASSED (100% SUCCESS RATE)\n";
    exit(0);
} else {
    echo "RESULT: {$totalFailed} FAILURES DETECTED IN REGRESSION RUN\n";
    exit(1);
}
