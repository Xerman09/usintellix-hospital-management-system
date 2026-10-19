-- =====================================================================
-- Migration: 298_alter_patients_mpi_verification.sql
-- (Corresponding to Item 2: Official Identity Document Verification)
-- Description: Official Identity Document Verification fields for MPI
--              Adds identity_status, id_document_type, id_document_number,
--              verified_by, verified_at, and verification_notes.
-- =====================================================================

ALTER TABLE `patients`
    ADD COLUMN IF NOT EXISTS `identity_status` ENUM('Unverified', 'Pending Verification', 'Verified', 'Restricted') NOT NULL DEFAULT 'Unverified' AFTER `registration_status`,
    ADD COLUMN IF NOT EXISTS `id_document_type` VARCHAR(50) NULL DEFAULT NULL AFTER `national_id`,
    ADD COLUMN IF NOT EXISTS `id_document_number` TEXT NULL DEFAULT NULL AFTER `id_document_type`,
    ADD COLUMN IF NOT EXISTS `verified_by` INT(11) NULL DEFAULT NULL AFTER `id_document_number`,
    ADD COLUMN IF NOT EXISTS `verified_at` DATETIME NULL DEFAULT NULL AFTER `verified_by`,
    ADD COLUMN IF NOT EXISTS `verification_notes` TEXT NULL DEFAULT NULL AFTER `verified_at`;

-- Indexes and foreign key
SET @exist_fk := (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'patients'
      AND CONSTRAINT_NAME = 'fk_patients_verified_by'
);

SET @sql_fk := IF(@exist_fk = 0,
    'ALTER TABLE `patients` ADD CONSTRAINT `fk_patients_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;',
    'SELECT 1;'
);
PREPARE stmt_fk FROM @sql_fk;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

SET @exist_idx := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'patients'
      AND INDEX_NAME = 'idx_patients_identity_status'
);

SET @sql_idx := IF(@exist_idx = 0,
    'ALTER TABLE `patients` ADD INDEX `idx_patients_identity_status` (`identity_status`);',
    'SELECT 1;'
);
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;
