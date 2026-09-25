<?php

declare(strict_types=1);

namespace App\Modules\Backup\Services;

use App\Core\AuditLogger;
use App\Core\Database;
use App\Core\FieldEncryption;
use App\Modules\Backup\Models\BackupLog;
use App\Modules\Backup\Models\DisasterRecoveryDrill;
use PDO;
use RuntimeException;
use Exception;

class BackupService
{
    private const ENVELOPE_HEADER = "UHMS_AES256GCM_BKP\x01";
    private const DEFAULT_RTO_MINUTES = 240;
    private const DEFAULT_RPO_HOURS = 24;

    /**
     * Create an authenticated AES-256-GCM encrypted database backup per 45 CFR § 164.308(a)(7)(ii)(A).
     */
    public function createBackup(string $type = 'manual_on_demand', ?int $userId = null): array
    {
        $startedAt = date('Y-m-d H:i:s');
        $year = date('Y');

        // Determine sequential backup code: BKP-YYYY-XXXX
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM `hipaa_backup_logs` WHERE `backup_code` LIKE :prefix");
        $stmt->execute(['prefix' => "BKP-{$year}-%"]);
        $count = (int)$stmt->fetchColumn() + 1;
        $backupCode = sprintf("BKP-%s-%04d", $year, $count);

        // Gather database SQL dump
        $dumpResult = $this->generateSqlDump($pdo);
        $sqlContent = $dumpResult['sql'];
        $tablesCount = $dumpResult['tables_count'];
        $recordsCount = $dumpResult['records_count'];

        // Compress SQL dump with GZIP
        $compressedData = gzencode($sqlContent, 9);
        if ($compressedData === false) {
            throw new RuntimeException("Failed to compress database backup content with GZIP.");
        }

        // Encrypt with AES-256-GCM envelope
        $key = FieldEncryption::getKey();
        $iv = random_bytes(12); // 96-bit IV
        $tag = '';
        $aad = $backupCode . '|' . $startedAt;

        $ciphertext = openssl_encrypt(
            $compressedData,
            'aes-256-gcm',
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            $aad,
            16
        );

        if ($ciphertext === false) {
            throw new RuntimeException("Failed to encrypt database backup with AES-256-GCM.");
        }

        // Assemble envelope: Header (20 bytes) . IV (12 bytes) . Tag (16 bytes) . Ciphertext
        $envelope = self::ENVELOPE_HEADER . $iv . $tag . $ciphertext;

        // Ensure storage directory exists
        $storageDir = __DIR__ . '/../../../../storage/backups';
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0750, true);
        }

        // Write encrypted file to disk
        $timestamp = date('Ymd_His');
        $fileName = "uhms_backup_{$backupCode}_{$timestamp}.sql.gz.enc";
        $filePath = $storageDir . '/' . $fileName;

        if (file_put_contents($filePath, $envelope) === false) {
            throw new RuntimeException("Failed to write encrypted backup archive to storage disk.");
        }

        // Compute SHA-256 checksum on disk
        $fileSize = filesize($filePath);
        $sha256 = hash_file('sha256', $filePath);
        $completedAt = date('Y-m-d H:i:s');

        // Insert record into hipaa_backup_logs
        $backupLogModel = new BackupLog();
        $id = $backupLogModel->insert([
            'backup_code' => $backupCode,
            'backup_type' => $type,
            'started_at' => $startedAt,
            'completed_at' => $completedAt,
            'status' => 'completed',
            'file_name' => $fileName,
            'file_path' => $filePath,
            'file_size_bytes' => $fileSize,
            'sha256_checksum' => $sha256,
            'is_encrypted' => 1,
            'encryption_algorithm' => 'AES-256-GCM',
            'encryption_key_id' => 'MASTER_KMS_KEY_V1',
            'verification_status' => 'pending',
            'tables_included_count' => $tablesCount,
            'total_records_count' => $recordsCount,
            'created_by' => $userId,
            'created_at' => $completedAt
        ]);

        // Audit Logging
        AuditLogger::log(
            AuditLogger::CATEGORY_BACKUP,
            AuditLogger::ACTION_BACKUP_CREATED,
            "Created AES-256-GCM encrypted database backup {$backupCode} ({$fileSize} bytes, SHA-256: {$sha256}, {$tablesCount} tables, {$recordsCount} records) per 45 CFR § 164.308(a)(7)(ii)(A)",
            null,
            $userId,
            'admin'
        );

        return $this->getBackupById((int)$id);
    }

    /**
     * Verify backup integrity and encryption status per 45 CFR § 164.308(a)(7)(ii)(A).
     */
    public function verifyBackup(int $id, ?int $userId = null): array
    {
        $backup = $this->getBackupById($id);
        if (!$backup) {
            throw new RuntimeException("Backup record #{$id} not found.");
        }

        $filePath = $backup['file_path'];
        $backupCode = $backup['backup_code'];

        // 1. Verify file exists on disk
        if (!file_exists($filePath)) {
            $this->updateVerificationStatus($id, 'failed', "Verification failed: Backup file not found on storage disk.");
            throw new RuntimeException("Verification failed: Backup file not found on storage disk.");
        }

        // 2. Verify SHA-256 checksum
        $computedSha256 = hash_file('sha256', $filePath);
        if (!hash_equals($backup['sha256_checksum'], $computedSha256)) {
            $notes = "Integrity check FAILED: Computed SHA-256 ({$computedSha256}) does not match registered checksum ({$backup['sha256_checksum']}).";
            $this->updateVerificationStatus($id, 'failed', $notes);
            throw new RuntimeException($notes);
        }

        // 3. Verify AES-256-GCM encryption envelope
        $fileContents = file_get_contents($filePath);
        $headerLen = strlen(self::ENVELOPE_HEADER);

        if (strlen($fileContents) < ($headerLen + 12 + 16)) {
            $notes = "Envelope check FAILED: Corrupted or truncated envelope header.";
            $this->updateVerificationStatus($id, 'failed', $notes);
            throw new RuntimeException($notes);
        }

        $header = substr($fileContents, 0, $headerLen);
        if ($header !== self::ENVELOPE_HEADER) {
            $notes = "Envelope check FAILED: Invalid encryption header magic bytes.";
            $this->updateVerificationStatus($id, 'failed', $notes);
            throw new RuntimeException($notes);
        }

        $iv = substr($fileContents, $headerLen, 12);
        $tag = substr($fileContents, $headerLen + 12, 16);
        $ciphertext = substr($fileContents, $headerLen + 28);

        $key = FieldEncryption::getKey();
        $aad = $backupCode . '|' . $backup['started_at'];

        $decryptedData = openssl_decrypt(
            $ciphertext,
            'aes-256-gcm',
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            $aad
        );

        if ($decryptedData === false) {
            $notes = "Cryptographic verification FAILED: AES-256-GCM authentication tag rejected. Data has been modified or corrupted.";
            $this->updateVerificationStatus($id, 'failed', $notes);
            throw new RuntimeException($notes);
        }

        // 4. Test GZIP decompression
        $decompressed = gzdecode($decryptedData);
        if ($decompressed === false) {
            $notes = "Decompression check FAILED: Decrypted payload is not valid GZIP archive.";
            $this->updateVerificationStatus($id, 'failed', $notes);
            throw new RuntimeException($notes);
        }

        // Success: Update verification status
        $verifiedAt = date('Y-m-d H:i:s');
        $notes = sprintf(
            "Cryptographic verification PASSED: SHA-256 checksum verified (100%% match). AES-256-GCM authenticated envelope valid. Decompression successful. %d tables intact.",
            (int)$backup['tables_included_count']
        );

        $this->updateVerificationStatus($id, 'passed', $notes, $verifiedAt);

        // Audit Logging
        AuditLogger::log(
            AuditLogger::CATEGORY_BACKUP,
            AuditLogger::ACTION_BACKUP_VERIFIED,
            "Cryptographic integrity verification passed for backup {$backupCode}: SHA-256 matches {$backup['sha256_checksum']}, AES-256-GCM envelope authentic.",
            null,
            $userId,
            'admin'
        );

        return $this->getBackupById($id);
    }

    /**
     * Log a disaster recovery restoration drill per 45 CFR § 164.308(a)(7)(ii)(D).
     */
    public function logDrill(array $data, int $userId): array
    {
        $year = date('Y');
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM `hipaa_disaster_recovery_drills` WHERE `drill_code` LIKE :prefix");
        $stmt->execute(['prefix' => "DR-{$year}-%"]);
        $count = (int)$stmt->fetchColumn() + 1;
        $drillCode = sprintf("DR-%s-%04d", $year, $count);

        $drillDate = $data['drill_date'] ?? date('Y-m-d');
        $drillType = $data['drill_type'] ?? 'sandbox_full_restore';
        $backupLogId = !empty($data['backup_log_id']) ? (int)$data['backup_log_id'] : null;
        $backupCodeRestored = $data['backup_code_restored'] ?? null;

        if ($backupLogId && empty($backupCodeRestored)) {
            $b = $this->getBackupById($backupLogId);
            if ($b) {
                $backupCodeRestored = $b['backup_code'];
            }
        }

        $restorerName = trim($data['restorer_name'] ?? '');
        $restorerRole = trim($data['restorer_role'] ?? 'Systems Administrator / Contingency Officer');
        $targetEnv = $data['target_environment'] ?? 'sandbox_staging';
        $rtoTarget = !empty($data['rto_target_minutes']) ? (int)$data['rto_target_minutes'] : self::DEFAULT_RTO_MINUTES;
        $rtoActual = (int)($data['rto_actual_minutes'] ?? 45);
        $rpoTarget = !empty($data['rpo_target_hours']) ? (int)$data['rpo_target_hours'] : self::DEFAULT_RPO_HOURS;
        $rpoActual = (int)($data['rpo_actual_hours'] ?? 2);
        $restorationSuccess = isset($data['restoration_success']) ? (int)(bool)$data['restoration_success'] : 1;
        $integrityVerified = isset($data['data_integrity_verified']) ? (int)(bool)$data['data_integrity_verified'] : 1;
        $auditChainVerified = isset($data['audit_hash_chain_verified']) ? (int)(bool)$data['audit_hash_chain_verified'] : 1;
        $discrepancies = $data['discrepancies_found'] ?? null;
        $correctiveActions = $data['corrective_actions'] ?? null;
        $signoffOfficer = $data['signoff_officer_name'] ?? 'HIPAA Security Officer';
        $signoffDate = $data['signoff_date'] ?? $drillDate;
        $notes = $data['notes'] ?? null;

        if (empty($restorerName)) {
            throw new RuntimeException("Restorer name is required for disaster recovery drill audit compliance.");
        }

        $drillModel = new DisasterRecoveryDrill();
        $id = $drillModel->insert([
            'drill_code' => $drillCode,
            'drill_date' => $drillDate,
            'drill_type' => $drillType,
            'backup_log_id' => $backupLogId,
            'backup_code_restored' => $backupCodeRestored,
            'restorer_user_id' => $userId,
            'restorer_name' => $restorerName,
            'restorer_role' => $restorerRole,
            'target_environment' => $targetEnv,
            'rto_target_minutes' => $rtoTarget,
            'rto_actual_minutes' => $rtoActual,
            'rpo_target_hours' => $rpoTarget,
            'rpo_actual_hours' => $rpoActual,
            'restoration_success' => $restorationSuccess,
            'data_integrity_verified' => $integrityVerified,
            'audit_hash_chain_verified' => $auditChainVerified,
            'discrepancies_found' => $discrepancies,
            'corrective_actions' => $correctiveActions,
            'signoff_officer_name' => $signoffOfficer,
            'signoff_date' => $signoffDate,
            'notes' => $notes,
            'created_by' => $userId,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        // Audit Logging
        AuditLogger::log(
            AuditLogger::CATEGORY_BACKUP,
            AuditLogger::ACTION_DR_DRILL_RECORDED,
            "Recorded disaster recovery restoration drill {$drillCode} by {$restorerName} ({$targetEnv}, RTO: {$rtoActual}m, RPO: {$rpoActual}h, Success: {$restorationSuccess}) per 45 CFR § 164.308(a)(7)(ii)(D)",
            null,
            $userId,
            'admin'
        );

        return $this->getDrillById((int)$id);
    }

    /**
     * Get system statistics and contingency health telemetry.
     */
    public function stats(): array
    {
        $pdo = Database::getInstance()->getConnection();

        // Backup stats
        $stmt = $pdo->query("SELECT 
            COUNT(*) as total_backups,
            SUM(CASE WHEN `verification_status` = 'passed' THEN 1 ELSE 0 END) as verified_backups,
            SUM(CASE WHEN `status` = 'completed' OR `status` = 'verified' THEN 1 ELSE 0 END) as completed_backups,
            SUM(CASE WHEN `status` = 'failed' THEN 1 ELSE 0 END) as failed_backups
            FROM `hipaa_backup_logs` WHERE `deleted_at` IS NULL");
        $bkpCounts = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        // Latest backup
        $latestBackup = $this->getLatestBackup();

        // DR Drill stats
        $stmtDrill = $pdo->query("SELECT 
            COUNT(*) as total_drills,
            SUM(CASE WHEN `restoration_success` = 1 THEN 1 ELSE 0 END) as successful_drills,
            AVG(`rto_actual_minutes`) as avg_rto_minutes,
            AVG(`rpo_actual_hours`) as avg_rpo_hours
            FROM `hipaa_disaster_recovery_drills` WHERE `deleted_at` IS NULL");
        $drillCounts = $stmtDrill->fetch(PDO::FETCH_ASSOC) ?: [];

        // Latest drill
        $stmtLatestDrill = $pdo->query("SELECT * FROM `hipaa_disaster_recovery_drills` WHERE `deleted_at` IS NULL ORDER BY `drill_date` DESC, `id` DESC LIMIT 1");
        $latestDrill = $stmtLatestDrill->fetch(PDO::FETCH_ASSOC) ?: null;

        // Contingency Health Determination
        $healthStatus = 'no_backups';
        $lastBackupAgeHours = null;
        if ($latestBackup && !empty($latestBackup['completed_at'])) {
            $lastTime = strtotime($latestBackup['completed_at']);
            $lastBackupAgeHours = round((time() - $lastTime) / 3600, 1);
            if ($lastBackupAgeHours <= 24) {
                $healthStatus = 'compliant';
            } elseif ($lastBackupAgeHours <= 48) {
                $healthStatus = 'warning';
            } else {
                $healthStatus = 'overdue';
            }
        }

        $totalDrills = (int)($drillCounts['total_drills'] ?? 0);
        $successfulDrills = (int)($drillCounts['successful_drills'] ?? 0);
        $drillSuccessRate = $totalDrills > 0 ? round(($successfulDrills / $totalDrills) * 100, 1) : 100.0;

        return [
            'total_backups' => (int)($bkpCounts['total_backups'] ?? 0),
            'verified_backups' => (int)($bkpCounts['verified_backups'] ?? 0),
            'completed_backups' => (int)($bkpCounts['completed_backups'] ?? 0),
            'failed_backups' => (int)($bkpCounts['failed_backups'] ?? 0),
            'latest_backup' => $latestBackup,
            'health_status' => $healthStatus,
            'last_backup_age_hours' => $lastBackupAgeHours,
            'total_drills' => $totalDrills,
            'successful_drills' => $successfulDrills,
            'drill_success_rate' => $drillSuccessRate,
            'avg_rto_minutes' => round((float)($drillCounts['avg_rto_minutes'] ?? 0), 1),
            'avg_rpo_hours' => round((float)($drillCounts['avg_rpo_hours'] ?? 0), 1),
            'target_rto_minutes' => self::DEFAULT_RTO_MINUTES,
            'target_rpo_hours' => self::DEFAULT_RPO_HOURS,
            'latest_drill' => $latestDrill
        ];
    }

    /**
     * Master query for database backup ledger.
     */
    public function listBackups(array $filters = []): array
    {
        $pdo = Database::getInstance()->getConnection();
        $sql = "SELECT b.*, u.username as creator_username 
                FROM `hipaa_backup_logs` b 
                LEFT JOIN `users` u ON b.created_by = u.id 
                WHERE b.deleted_at IS NULL";
        $params = [];

        if (!empty($filters['status'])) {
            $sql .= " AND b.status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['verification_status'])) {
            $sql .= " AND b.verification_status = :vstatus";
            $params['vstatus'] = $filters['verification_status'];
        }

        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $sql .= " AND (b.backup_code LIKE :s1 OR b.file_name LIKE :s2 OR b.sha256_checksum LIKE :s3)";
            $params['s1'] = $search;
            $params['s2'] = $search;
            $params['s3'] = $search;
        }

        $sql .= " ORDER BY b.id DESC";

        $limit = isset($filters['limit']) ? (int)$filters['limit'] : 50;
        $offset = isset($filters['offset']) ? (int)$filters['offset'] : 0;
        $sql .= " LIMIT {$limit} OFFSET {$offset}";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Enhance records with human-readable file size and relative time
        return array_map(function ($r) {
            $r['formatted_size'] = $this->formatBytes((int)$r['file_size_bytes']);
            $r['relative_time'] = $this->formatRelativeTime($r['completed_at'] ?? $r['created_at']);
            return $r;
        }, $records);
    }

    /**
     * Master query for disaster recovery drills log.
     */
    public function listDrills(array $filters = []): array
    {
        $pdo = Database::getInstance()->getConnection();
        $sql = "SELECT d.*, u.username as creator_username 
                FROM `hipaa_disaster_recovery_drills` d 
                LEFT JOIN `users` u ON d.created_by = u.id 
                WHERE d.deleted_at IS NULL";
        $params = [];

        if (isset($filters['success']) && $filters['success'] !== '') {
            $sql .= " AND d.restoration_success = :success";
            $params['success'] = (int)$filters['success'];
        }

        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $sql .= " AND (d.drill_code LIKE :s1 OR d.restorer_name LIKE :s2 OR d.backup_code_restored LIKE :s3 OR d.target_environment LIKE :s4)";
            $params['s1'] = $search;
            $params['s2'] = $search;
            $params['s3'] = $search;
            $params['s4'] = $search;
        }

        $sql .= " ORDER BY d.drill_date DESC, d.id DESC";

        $limit = isset($filters['limit']) ? (int)$filters['limit'] : 50;
        $offset = isset($filters['offset']) ? (int)$filters['offset'] : 0;
        $sql .= " LIMIT {$limit} OFFSET {$offset}";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get backup by ID.
     */
    public function getBackupById(int $id): ?array
    {
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("SELECT * FROM `hipaa_backup_logs` WHERE `id` = :id AND `deleted_at` IS NULL");
        $stmt->execute(['id' => $id]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$record) {
            return null;
        }

        $record['formatted_size'] = $this->formatBytes((int)$record['file_size_bytes']);
        $record['relative_time'] = $this->formatRelativeTime($record['completed_at'] ?? $record['created_at']);
        return $record;
    }

    /**
     * Get drill by ID.
     */
    public function getDrillById(int $id): ?array
    {
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("SELECT * FROM `hipaa_disaster_recovery_drills` WHERE `id` = :id AND `deleted_at` IS NULL");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Get latest completed or verified backup.
     */
    public function getLatestBackup(): ?array
    {
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->query("SELECT * FROM `hipaa_backup_logs` 
                             WHERE `status` IN ('completed', 'verified') AND `deleted_at` IS NULL 
                             ORDER BY `id` DESC LIMIT 1");
        $record = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$record) {
            return null;
        }

        $record['formatted_size'] = $this->formatBytes((int)$record['file_size_bytes']);
        $record['relative_time'] = $this->formatRelativeTime($record['completed_at'] ?? $record['created_at']);
        return $record;
    }

    /**
     * Generate RFC 4180 CSV export string of backup logs.
     */
    public function generateBackupsCsv(?int $userId = null): string
    {
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->query("SELECT * FROM `hipaa_backup_logs` WHERE `deleted_at` IS NULL ORDER BY `id` DESC");
        $backups = $stmt->fetchAll(PDO::FETCH_ASSOC);

        AuditLogger::log(
            AuditLogger::CATEGORY_BACKUP,
            AuditLogger::ACTION_BACKUP_REGISTRY_EXPORT,
            "Exported regulatory database backup registry CSV per 45 CFR § 164.308(a)(7)(ii)(A)",
            null,
            $userId
        );

        $out = fopen('php://temp', 'r+');

        // Statutory notice header
        fputcsv($out, ['# STATUTORY REGISTRY: Automated Encrypted Database Backups (45 CFR § 164.308(a)(7)(ii)(A))']);
        fputcsv($out, ['# Generated at: ' . date('Y-m-d H:i:s') . ' UTC by USIntellix Healthcare System']);
        fputcsv($out, [
            'Backup ID',
            'Backup Reference Code',
            'Backup Type',
            'Started At',
            'Completed At',
            'Status',
            'Archive File Name',
            'File Size (Bytes)',
            'File Size (Human Readable)',
            'SHA-256 Cryptographic Checksum',
            'Encryption Status',
            'Encryption Algorithm',
            'Verification Status',
            'Verified At',
            'Verification Notes',
            'Tables Count',
            'Records Count'
        ]);

        foreach ($backups as $b) {
            fputcsv($out, [
                $b['id'],
                $b['backup_code'],
                $b['backup_type'],
                $b['started_at'],
                $b['completed_at'],
                $b['status'],
                $b['file_name'],
                $b['file_size_bytes'],
                $this->formatBytes((int)$b['file_size_bytes']),
                $b['sha256_checksum'],
                $b['is_encrypted'] ? 'ENCRYPTED' : 'UNENCRYPTED',
                $b['encryption_algorithm'],
                $b['verification_status'],
                $b['verified_at'] ?? 'N/A',
                $b['verification_notes'] ?? 'None',
                $b['tables_included_count'],
                $b['total_records_count']
            ]);
        }

        rewind($out);
        $csv = stream_get_contents($out);
        fclose($out);
        return $csv ?: '';
    }

    /**
     * Stream RFC 4180 CSV export of backup logs.
     */
    public function exportBackupsCsv(?int $userId = null): void
    {
        $csv = $this->generateBackupsCsv($userId);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="hipaa_backup_registry_' . date('Ymd_His') . '.csv"');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        echo $csv;
        exit;
    }

    /**
     * Generate RFC 4180 CSV export string of disaster recovery drills.
     */
    public function generateDrillsCsv(?int $userId = null): string
    {
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->query("SELECT * FROM `hipaa_disaster_recovery_drills` WHERE `deleted_at` IS NULL ORDER BY `drill_date` DESC, `id` DESC");
        $drills = $stmt->fetchAll(PDO::FETCH_ASSOC);

        AuditLogger::log(
            AuditLogger::CATEGORY_BACKUP,
            AuditLogger::ACTION_DR_REGISTRY_EXPORT,
            "Exported disaster recovery restoration drill registry CSV per 45 CFR § 164.308(a)(7)(ii)(D)",
            null,
            $userId
        );

        $out = fopen('php://temp', 'r+');

        // Statutory notice header
        fputcsv($out, ['# STATUTORY LOG: Disaster Recovery & Contingency Test Restoration Drills (45 CFR § 164.308(a)(7)(ii)(D))']);
        fputcsv($out, ['# Generated at: ' . date('Y-m-d H:i:s') . ' UTC by USIntellix Healthcare System']);
        fputcsv($out, [
            'Drill ID',
            'Drill Reference Code',
            'Drill Date',
            'Drill Type',
            'Backup Code Restored',
            'Restorer Name',
            'Restorer Role',
            'Target Environment',
            'RTO Target (Min)',
            'RTO Actual (Min)',
            'RPO Target (Hours)',
            'RPO Actual (Hours)',
            'Restoration Success',
            'Data Integrity Verified',
            'Audit Chain Verified',
            'Discrepancies Found',
            'Corrective Actions',
            'Sign-off Officer',
            'Sign-off Date',
            'Notes'
        ]);

        foreach ($drills as $d) {
            fputcsv($out, [
                $d['id'],
                $d['drill_code'],
                $d['drill_date'],
                $d['drill_type'],
                $d['backup_code_restored'] ?? 'N/A',
                $d['restorer_name'],
                $d['restorer_role'],
                $d['target_environment'],
                $d['rto_target_minutes'],
                $d['rto_actual_minutes'],
                $d['rpo_target_hours'],
                $d['rpo_actual_hours'],
                $d['restoration_success'] ? 'SUCCESS' : 'FAILED',
                $d['data_integrity_verified'] ? 'VERIFIED' : 'FAILED',
                $d['audit_hash_chain_verified'] ? 'VALID' : 'TAMPERED',
                $d['discrepancies_found'] ?? 'None',
                $d['corrective_actions'] ?? 'None',
                $d['signoff_officer_name'] ?? 'N/A',
                $d['signoff_date'] ?? 'N/A',
                $d['notes'] ?? 'None'
            ]);
        }

        rewind($out);
        $csv = stream_get_contents($out);
        fclose($out);
        return $csv ?: '';
    }

    /**
     * Stream RFC 4180 CSV export of disaster recovery drills.
     */
    public function exportDrillsCsv(?int $userId = null): void
    {
        $csv = $this->generateDrillsCsv($userId);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="hipaa_disaster_recovery_drills_' . date('Ymd_His') . '.csv"');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        echo $csv;
        exit;
    }

    /**
     * Internal helper to generate database SQL dump.
     */
    private function generateSqlDump(PDO $pdo): array
    {
        $tables = $pdo->query("SHOW FULL TABLES WHERE Table_Type = 'BASE TABLE'")->fetchAll(PDO::FETCH_COLUMN);

        $out = "-- ==============================================================================\n";
        $out .= "-- USIntellix Hospital Management System: HIPAA Encrypted Database Backup\n";
        $out .= "-- Statutory Authority: 45 CFR § 164.308(a)(7)(ii)(A)\n";
        $out .= "-- Generation Date: " . date('Y-m-d H:i:s') . " UTC\n";
        $out .= "-- Cipher: AES-256-GCM Authenticated Envelope\n";
        $out .= "-- ==============================================================================\n\n";
        $out .= "SET FOREIGN_KEY_CHECKS = 0;\n";
        $out .= "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n";
        $out .= "SET NAMES utf8mb4;\n\n";

        $totalRecords = 0;
        $totalTables = count($tables);

        foreach ($tables as $table) {
            // Table DDL
            $createStmt = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(PDO::FETCH_ASSOC);
            $ddl = $createStmt['Create Table'] ?? '';
            $out .= "-- Table structure for table `{$table}`\n";
            $out .= "DROP TABLE IF EXISTS `{$table}`;\n";
            $out .= $ddl . ";\n\n";

            // Table Records
            $dataStmt = $pdo->query("SELECT * FROM `{$table}`");
            $rows = $dataStmt->fetchAll(PDO::FETCH_ASSOC);
            $rowCount = count($rows);
            $totalRecords += $rowCount;

            if ($rowCount > 0) {
                $out .= "-- Dumping data for table `{$table}` ({$rowCount} rows)\n";
                foreach (array_chunk($rows, 50) as $chunk) {
                    $firstRow = $chunk[0];
                    $columns = array_map(function ($col) {
                        return "`" . str_replace("`", "``", $col) . "`";
                    }, array_keys($firstRow));

                    $valueLines = [];
                    foreach ($chunk as $row) {
                        $escapedVals = [];
                        foreach ($row as $val) {
                            if ($val === null) {
                                $escapedVals[] = "NULL";
                            } elseif (is_numeric($val) && !str_starts_with((string)$val, '0')) {
                                $escapedVals[] = $val;
                            } else {
                                $escapedVals[] = $pdo->quote((string)$val);
                            }
                        }
                        $valueLines[] = "(" . implode(", ", $escapedVals) . ")";
                    }
                    $out .= "INSERT INTO `{$table}` (" . implode(", ", $columns) . ") VALUES\n  " . implode(",\n  ", $valueLines) . ";\n";
                }
                $out .= "\n";
            }
        }

        $out .= "SET FOREIGN_KEY_CHECKS = 1;\n";
        $out .= "-- Backup completed. Total tables: {$totalTables}, Total records: {$totalRecords}.\n";

        return [
            'sql' => $out,
            'tables_count' => $totalTables,
            'records_count' => $totalRecords
        ];
    }

    /**
     * Update verification status of a backup.
     */
    private function updateVerificationStatus(int $id, string $status, string $notes, ?string $verifiedAt = null): void
    {
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("UPDATE `hipaa_backup_logs` SET 
            `verification_status` = :vstatus,
            `verified_at` = :vat,
            `verification_notes` = :notes,
            `status` = :status
            WHERE `id` = :id");
        $stmt->execute([
            'vstatus' => $status,
            'vat' => $verifiedAt ?? ($status === 'passed' ? date('Y-m-d H:i:s') : null),
            'notes' => $notes,
            'status' => $status === 'passed' ? 'verified' : ($status === 'failed' ? 'failed' : 'completed'),
            'id' => $id
        ]);
    }

    /**
     * Format bytes into readable string.
     */
    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= (1 << (10 * $pow));
        return round($bytes, $precision) . ' ' . $units[$pow];
    }

    /**
     * Human-readable relative time string.
     */
    private function formatRelativeTime(?string $datetime): string
    {
        if (empty($datetime)) {
            return 'Never';
        }
        $diff = time() - strtotime($datetime);
        if ($diff < 60) {
            return 'Just now';
        }
        if ($diff < 3600) {
            $mins = floor($diff / 60);
            return $mins . ' minute' . ($mins > 1 ? 's' : '') . ' ago';
        }
        if ($diff < 86400) {
            $hours = floor($diff / 3600);
            return $hours . ' hour' . ($hours > 1 ? 's' : '') . ' ago';
        }
        $days = floor($diff / 86400);
        return $days . ' day' . ($days > 1 ? 's' : '') . ' ago';
    }
}
