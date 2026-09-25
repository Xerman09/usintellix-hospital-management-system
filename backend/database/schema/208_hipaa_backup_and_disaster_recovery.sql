-- ==============================================================================
-- Migration 208: Automated Encrypted Backup & Disaster Recovery Verification Console
-- Statutory Authority: 45 CFR § 164.308(a)(7) (HIPAA Contingency Plan)
--   - § 164.308(a)(7)(ii)(A): Data Backup Plan (Required)
--   - § 164.308(a)(7)(ii)(B): Disaster Recovery Plan (Required)
--   - § 164.308(a)(7)(ii)(C): Emergency Mode Operation Plan (Required)
--   - § 164.308(a)(7)(ii)(D): Testing and Revision Procedures (Addressable)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `hipaa_backup_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `backup_code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Sequential reference code, e.g. BKP-2026-0001',
    `backup_type` ENUM('scheduled_daily', 'manual_on_demand', 'pre_migration', 'emergency') NOT NULL DEFAULT 'manual_on_demand',
    `started_at` DATETIME NOT NULL,
    `completed_at` DATETIME NULL,
    `status` ENUM('in_progress', 'completed', 'verified', 'failed') NOT NULL DEFAULT 'in_progress',
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_size_bytes` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `sha256_checksum` CHAR(64) NOT NULL,
    `is_encrypted` TINYINT(1) NOT NULL DEFAULT 1,
    `encryption_algorithm` VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
    `encryption_key_id` VARCHAR(100) DEFAULT 'MASTER_KMS_KEY_V1',
    `verification_status` ENUM('pending', 'passed', 'failed') NOT NULL DEFAULT 'pending',
    `verified_at` DATETIME NULL,
    `verification_notes` TEXT NULL,
    `tables_included_count` INT NOT NULL DEFAULT 0,
    `total_records_count` INT NOT NULL DEFAULT 0,
    `created_by` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL,
    INDEX `idx_bkp_code` (`backup_code`),
    INDEX `idx_bkp_status` (`status`),
    INDEX `idx_bkp_verification` (`verification_status`),
    INDEX `idx_bkp_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hipaa_disaster_recovery_drills` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `drill_code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Sequential reference code, e.g. DR-2026-0001',
    `drill_date` DATE NOT NULL,
    `drill_type` ENUM('tabletop_simulation', 'sandbox_full_restore', 'failover_switchover', 'point_in_time_recovery') NOT NULL DEFAULT 'sandbox_full_restore',
    `backup_log_id` INT NULL COMMENT 'FK to hipaa_backup_logs(id)',
    `backup_code_restored` VARCHAR(50) NULL,
    `restorer_user_id` INT NULL,
    `restorer_name` VARCHAR(255) NOT NULL,
    `restorer_role` VARCHAR(100) NOT NULL,
    `target_environment` ENUM('sandbox_staging', 'isolated_recovery_host', 'dr_hot_site', 'local_verification_container') NOT NULL DEFAULT 'sandbox_staging',
    `rto_target_minutes` INT NOT NULL DEFAULT 240 COMMENT 'Recovery Time Objective target in minutes',
    `rto_actual_minutes` INT NOT NULL COMMENT 'Actual restoration duration in minutes',
    `rpo_target_hours` INT NOT NULL DEFAULT 24 COMMENT 'Recovery Point Objective target in hours',
    `rpo_actual_hours` INT NOT NULL COMMENT 'Data loss window in hours',
    `restoration_success` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Restored successfully, 0 = Failed',
    `data_integrity_verified` TINYINT(1) NOT NULL DEFAULT 1,
    `audit_hash_chain_verified` TINYINT(1) NOT NULL DEFAULT 1,
    `discrepancies_found` TEXT NULL,
    `corrective_actions` TEXT NULL,
    `signoff_officer_name` VARCHAR(255) NULL,
    `signoff_date` DATE NULL,
    `notes` TEXT NULL,
    `created_by` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL,
    INDEX `idx_dr_code` (`drill_code`),
    INDEX `idx_dr_date` (`drill_date`),
    INDEX `idx_dr_success` (`restoration_success`),
    INDEX `idx_dr_target_env` (`target_environment`),
    CONSTRAINT `fk_dr_backup_log` FOREIGN KEY (`backup_log_id`) REFERENCES `hipaa_backup_logs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
