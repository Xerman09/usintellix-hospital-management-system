<?php
/**
 * Automated Verification: Automated Encrypted Backup & Disaster Recovery Verification Console
 * Statutory Citations: 45 CFR § 164.308(a)(7), § 164.308(a)(7)(ii)(A), § 164.308(a)(7)(ii)(D)
 */

declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Core\AuditLogger;
use App\Modules\Backup\Services\BackupService;

Env::load();

$passed = 0;
$failed = 0;

function report(bool $condition, string $title, string $detail = ''): void {
    global $passed, $failed;
    if ($condition) {
        $passed++;
        echo "  [PASS] {$title}\n";
    } else {
        $failed++;
        echo "  [FAIL] {$title}\n";
        if ($detail) {
            echo "         Detail: {$detail}\n";
        }
    }
}

echo "======================================================================\n";
echo "  HIPAA ENCRYPTED BACKUP & DISASTER RECOVERY (§ 164.308(a)(7)) TEST SUITE\n";
echo "======================================================================\n\n";

$pdo = Database::getInstance()->getConnection();
$backupService = new BackupService();

$createdBackupIds = [];
$createdDrillIds = [];
$createdFiles = [];

try {
    // ------------------------------------------------------------------
    // 1. Database Schema & Migration 208 Verification
    // ------------------------------------------------------------------
    echo "1. Testing Database Schema & Columns (Migration 208)...\n";

    // hipaa_backup_logs
    $stmtTables = $pdo->query("SHOW TABLES LIKE 'hipaa_backup_logs'");
    report($stmtTables->rowCount() > 0, "Table 'hipaa_backup_logs' exists in database");

    $stmtCols = $pdo->query("SHOW COLUMNS FROM `hipaa_backup_logs`");
    $bkpCols = $stmtCols->fetchAll(PDO::FETCH_COLUMN);

    $expectedBkpCols = [
        'id', 'backup_code', 'backup_type', 'started_at', 'completed_at',
        'status', 'file_name', 'file_path', 'file_size_bytes', 'sha256_checksum',
        'is_encrypted', 'encryption_algorithm', 'encryption_key_id',
        'verification_status', 'verified_at', 'verification_notes',
        'tables_included_count', 'total_records_count', 'created_by', 'created_at'
    ];
    foreach ($expectedBkpCols as $col) {
        report(in_array($col, $bkpCols, true), "Column '{$col}' exists in hipaa_backup_logs");
    }

    // hipaa_disaster_recovery_drills
    $stmtTablesDrill = $pdo->query("SHOW TABLES LIKE 'hipaa_disaster_recovery_drills'");
    report($stmtTablesDrill->rowCount() > 0, "Table 'hipaa_disaster_recovery_drills' exists in database");

    $stmtColsDrill = $pdo->query("SHOW COLUMNS FROM `hipaa_disaster_recovery_drills`");
    $drillCols = $stmtColsDrill->fetchAll(PDO::FETCH_COLUMN);

    $expectedDrillCols = [
        'id', 'drill_code', 'drill_date', 'drill_type', 'backup_log_id',
        'backup_code_restored', 'restorer_user_id', 'restorer_name', 'restorer_role',
        'target_environment', 'rto_target_minutes', 'rto_actual_minutes',
        'rpo_target_hours', 'rpo_actual_hours', 'restoration_success',
        'data_integrity_verified', 'audit_hash_chain_verified', 'discrepancies_found',
        'corrective_actions', 'signoff_officer_name', 'signoff_date', 'notes'
    ];
    foreach ($expectedDrillCols as $col) {
        report(in_array($col, $drillCols, true), "Column '{$col}' exists in hipaa_disaster_recovery_drills");
    }

    // ------------------------------------------------------------------
    // 2. Testing Encrypted Backup Creation (§ 164.308(a)(7)(ii)(A))
    // ------------------------------------------------------------------
    echo "\n2. Testing AES-256-GCM Encrypted Backup Generation (§ 164.308(a)(7)(ii)(A))...\n";

    $backup = $backupService->createBackup('manual_on_demand', 1);
    $createdBackupIds[] = $backup['id'];
    $createdFiles[] = $backup['file_path'];

    report(!empty($backup['id']), "Encrypted backup created with database ID: " . $backup['id']);
    report((bool)preg_match('/^BKP-\d{4}-\d{4}$/', $backup['backup_code']), "Backup code formatted sequentially: " . $backup['backup_code']);
    report(file_exists($backup['file_path']), "Encrypted archive file exists on disk: " . $backup['file_name']);
    report($backup['file_size_bytes'] > 0, "Archive file size is non-empty ({$backup['formatted_size']})");
    report(filesize($backup['file_path']) === (int)$backup['file_size_bytes'], "Disk file size matches database metadata");
    report($backup['is_encrypted'] == 1, "is_encrypted flag asserted to 1");
    report($backup['encryption_algorithm'] === 'AES-256-GCM', "Encryption algorithm verified as AES-256-GCM");
    report($backup['status'] === 'completed', "Initial status marked as completed");
    report($backup['verification_status'] === 'pending', "Initial verification status is pending");
    report($backup['tables_included_count'] > 0, "Tables included count recorded ({$backup['tables_included_count']} tables)");
    report($backup['total_records_count'] > 0, "Total records dumped recorded ({$backup['total_records_count']} rows)");

    // Verify SHA-256 matches actual file on disk
    $actualFileHash = hash_file('sha256', $backup['file_path']);
    report(hash_equals($backup['sha256_checksum'], $actualFileHash), "SHA-256 checksum matches exact disk file hash ({$actualFileHash})");

    // Verify raw envelope header
    $fileData = file_get_contents($backup['file_path']);
    $headerPrefix = substr($fileData, 0, 18);
    report($headerPrefix === "UHMS_AES256GCM_BKP", "Envelope contains authenticated magic header: UHMS_AES256GCM_BKP");

    // ------------------------------------------------------------------
    // 3. Testing Cryptographic Integrity & Encryption Verification Engine
    // ------------------------------------------------------------------
    echo "\n3. Testing Cryptographic Integrity & Verification Engine (§ 164.308(a)(7)(ii)(A))...\n";

    $verified = $backupService->verifyBackup((int)$backup['id'], 1);
    report($verified['verification_status'] === 'passed', "Verification status transitioned to 'passed'");
    report($verified['status'] === 'verified', "Backup status updated to 'verified'");
    report(!empty($verified['verified_at']), "Verification timestamp recorded: " . $verified['verified_at']);
    report(str_contains($verified['verification_notes'], 'Cryptographic verification PASSED'), "Verification notes confirm cryptographic validation");
    report(str_contains($verified['verification_notes'], 'SHA-256 checksum verified (100% match)'), "Verification notes confirm 100% SHA-256 match");
    report(str_contains($verified['verification_notes'], 'AES-256-GCM authenticated envelope valid'), "Verification notes confirm AES-256-GCM auth tag valid");

    // ------------------------------------------------------------------
    // 4. Testing Tamper Detection & Corruption Resistance
    // ------------------------------------------------------------------
    echo "\n4. Testing Tamper Detection & Corruption Resistance...\n";

    // 4a. Tamper disk checksum
    $originalFileBytes = file_get_contents($backup['file_path']);
    $tamperedBytes = $originalFileBytes;
    // Flip byte in ciphertext area
    $tamperedBytes[strlen($tamperedBytes) - 10] = chr(ord($tamperedBytes[strlen($tamperedBytes) - 10]) ^ 0xFF);
    file_put_contents($backup['file_path'], $tamperedBytes);

    $tamperDetected = false;
    try {
        $backupService->verifyBackup((int)$backup['id'], 1);
    } catch (\Throwable $e) {
        $tamperDetected = true;
        report(true, "Tampered archive correctly detected and rejected: " . $e->getMessage());
    }

    if (!$tamperDetected) {
        report(false, "Tampered archive was NOT rejected!");
    }

    // Restore original file
    file_put_contents($backup['file_path'], $originalFileBytes);
    $reverified = $backupService->verifyBackup((int)$backup['id'], 1);
    report($reverified['verification_status'] === 'passed', "Re-verification succeeded after restoring original archive");

    // ------------------------------------------------------------------
    // 5. Testing Disaster Recovery Restoration Drill Tracking (§ 164.308(a)(7)(ii)(D))
    // ------------------------------------------------------------------
    echo "\n5. Testing Disaster Recovery Restoration Drill Tracking (§ 164.308(a)(7)(ii)(D))...\n";

    $drillData = [
        'drill_date' => date('Y-m-d'),
        'drill_type' => 'sandbox_full_restore',
        'backup_log_id' => $backup['id'],
        'backup_code_restored' => $backup['backup_code'],
        'restorer_name' => 'Sarah Connor, CISSP',
        'restorer_role' => 'Contingency Planning Lead / Systems Architect',
        'target_environment' => 'sandbox_staging',
        'rto_target_minutes' => 240,
        'rto_actual_minutes' => 38,
        'rpo_target_hours' => 24,
        'rpo_actual_hours' => 1,
        'restoration_success' => 1,
        'data_integrity_verified' => 1,
        'audit_hash_chain_verified' => 1,
        'signoff_officer_name' => 'Chief Information Security Officer (CISO)',
        'notes' => 'Simulated primary database volume loss. Restored AES-256-GCM encrypted backup into sandbox MySQL host. All 42 tables mounted with 100% row count match.'
    ];

    $drill = $backupService->logDrill($drillData, 1);
    $createdDrillIds[] = $drill['id'];

    report(!empty($drill['id']), "Disaster recovery drill recorded with ID: " . $drill['id']);
    report((bool)preg_match('/^DR-\d{4}-\d{4}$/', $drill['drill_code']), "Drill reference code formatted sequentially: " . $drill['drill_code']);
    report($drill['restorer_name'] === 'Sarah Connor, CISSP', "Restorer name recorded accurately");
    report($drill['target_environment'] === 'sandbox_staging', "Target environment recorded as sandbox_staging");
    report((int)$drill['rto_actual_minutes'] === 38, "Actual RTO recorded as 38 minutes (&le; 240 min target)");
    report((int)$drill['rpo_actual_hours'] === 1, "Actual RPO recorded as 1 hour (&le; 24 hour target)");
    report($drill['restoration_success'] == 1, "Restoration success asserted to 1 (SUCCESS)");
    report($drill['data_integrity_verified'] == 1, "Data integrity verified asserted to 1");
    report($drill['audit_hash_chain_verified'] == 1, "Audit hash chain verified asserted to 1");

    // Test missing restorer name validation
    $missingRestorerRejected = false;
    try {
        $backupService->logDrill(['restorer_name' => ''], 1);
    } catch (\Throwable $e) {
        $missingRestorerRejected = true;
        report(true, "Missing restorer name correctly rejected: " . $e->getMessage());
    }
    if (!$missingRestorerRejected) {
        report(false, "Drill without restorer name was NOT rejected!");
    }

    // ------------------------------------------------------------------
    // 6. Testing Telemetry & Contingency Health KPIs
    // ------------------------------------------------------------------
    echo "\n6. Testing Contingency Health Stats & Telemetry...\n";

    $stats = $backupService->stats();
    report($stats['total_backups'] >= 1, "Stats reflect total backups: " . $stats['total_backups']);
    report($stats['verified_backups'] >= 1, "Stats reflect verified backups: " . $stats['verified_backups']);
    report(!empty($stats['latest_backup']), "Stats contain latest completed backup object");
    report($stats['latest_backup']['backup_code'] === $backup['backup_code'], "Latest backup matches newly created backup");
    report($stats['health_status'] === 'compliant', "Health status evaluated as COMPLIANT (within 24 hours)");
    report($stats['total_drills'] >= 1, "Stats reflect total DR drills: " . $stats['total_drills']);
    report($stats['successful_drills'] >= 1, "Stats reflect successful DR drills: " . $stats['successful_drills']);
    report($stats['drill_success_rate'] == 100.0, "Drill success rate is 100%");
    report($stats['avg_rto_minutes'] > 0, "Average RTO calculated: " . $stats['avg_rto_minutes'] . " minutes");

    // ------------------------------------------------------------------
    // 7. Testing Regulatory RFC 4180 CSV Exports
    // ------------------------------------------------------------------
    echo "\n7. Testing Regulatory RFC 4180 CSV Compliance Exports...\n";

    // 7a. Backups CSV
    $backupsCsv = $backupService->generateBackupsCsv(1);
    report(str_contains($backupsCsv, '# STATUTORY REGISTRY: Automated Encrypted Database Backups (45 CFR § 164.308(a)(7)(ii)(A))'), "Backups CSV includes statutory header citing § 164.308(a)(7)(ii)(A)");
    report(str_contains($backupsCsv, 'Backup Reference Code') && str_contains($backupsCsv, 'SHA-256 Cryptographic Checksum'), "Backups CSV includes standard column headers");
    report(str_contains($backupsCsv, $backup['backup_code']), "Backups CSV includes generated backup reference code");
    report(str_contains($backupsCsv, $backup['sha256_checksum']), "Backups CSV includes exact SHA-256 checksum");
    report(str_contains($backupsCsv, 'AES-256-GCM'), "Backups CSV includes AES-256-GCM cipher indicator");
    report(str_contains($backupsCsv, 'ENCRYPTED'), "Backups CSV includes ENCRYPTED status");

    // 7b. Drills CSV
    $drillsCsv = $backupService->generateDrillsCsv(1);
    report(str_contains($drillsCsv, '# STATUTORY LOG: Disaster Recovery & Contingency Test Restoration Drills (45 CFR § 164.308(a)(7)(ii)(D))'), "Drills CSV includes statutory header citing § 164.308(a)(7)(ii)(D)");
    report(str_contains($drillsCsv, 'Drill Reference Code') && str_contains($drillsCsv, 'Target Environment'), "Drills CSV includes standard column headers");
    report(str_contains($drillsCsv, $drill['drill_code']), "Drills CSV includes generated drill reference code");
    report(str_contains($drillsCsv, 'Sarah Connor, CISSP'), "Drills CSV includes restorer name");
    report(str_contains($drillsCsv, 'SUCCESS'), "Drills CSV reflects successful outcome");

    // ------------------------------------------------------------------
    // 8. Testing HMAC-SHA-256 Chained Audit Trail
    // ------------------------------------------------------------------
    echo "\n8. Testing HMAC-SHA-256 Chained Audit Trail & Cryptographic Chain...\n";

    $stmtAudit = $pdo->prepare("SELECT * FROM `hipaa_audit_logs` WHERE `event_category` = :cat ORDER BY `id` ASC");
    $stmtAudit->execute(['cat' => AuditLogger::CATEGORY_BACKUP]);
    $auditEntries = $stmtAudit->fetchAll(PDO::FETCH_ASSOC);

    report(count($auditEntries) > 0, "Audit logs found under event_category 'BACKUP_CONTINGENCY'");

    $auditActions = array_column($auditEntries, 'action');
    report(in_array(AuditLogger::ACTION_BACKUP_CREATED, $auditActions, true), "Logged action " . AuditLogger::ACTION_BACKUP_CREATED);
    report(in_array(AuditLogger::ACTION_BACKUP_VERIFIED, $auditActions, true), "Logged action " . AuditLogger::ACTION_BACKUP_VERIFIED);
    report(in_array(AuditLogger::ACTION_DR_DRILL_RECORDED, $auditActions, true), "Logged action " . AuditLogger::ACTION_DR_DRILL_RECORDED);
    report(in_array(AuditLogger::ACTION_BACKUP_REGISTRY_EXPORT, $auditActions, true), "Logged action " . AuditLogger::ACTION_BACKUP_REGISTRY_EXPORT);
    report(in_array(AuditLogger::ACTION_DR_REGISTRY_EXPORT, $auditActions, true), "Logged action " . AuditLogger::ACTION_DR_REGISTRY_EXPORT);

    // Verify entire HMAC-SHA-256 hash chain
    $integrity = AuditLogger::verifyIntegrity();
    report($integrity['valid'] === true, "Complete HIPAA audit sequential HMAC-SHA-256 hash chain is VALID (0 tampering detected)");

} catch (\Throwable $e) {
    $failed++;
    echo "\n[EXCEPTION] Fatal error during test execution:\n";
    echo $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
} finally {
    // Cleanup generated drill fixture records
    if (!empty($createdDrillIds)) {
        $inDrills = implode(',', array_map('intval', $createdDrillIds));
        $pdo->exec("DELETE FROM `hipaa_disaster_recovery_drills` WHERE `id` IN ({$inDrills})");
    }
    // Cleanup generated backup fixture records and disk files
    if (!empty($createdBackupIds)) {
        $inBackups = implode(',', array_map('intval', $createdBackupIds));
        $pdo->exec("DELETE FROM `hipaa_backup_logs` WHERE `id` IN ({$inBackups})");
    }
    foreach ($createdFiles as $f) {
        if (file_exists($f)) {
            @unlink($f);
        }
    }
}

echo "\n======================================================================\n";
echo "  TEST SUMMARY: {$passed} Passed, {$failed} Failed\n";
echo "======================================================================\n";

exit($failed > 0 ? 1 : 0);
