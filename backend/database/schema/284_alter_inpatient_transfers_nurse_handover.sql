-- =====================================================================
-- Migration: 284_alter_inpatient_transfers_nurse_handover.sql
-- Description: Inpatient Transfer Nurse Handover Dual Sign-Off Schema
--              Captures sending nurse clinical handover (SBAR & transfer vitals)
--              and receiving ward accepting nurse sign-off / bedside verification.
-- =====================================================================

ALTER TABLE `inpatient_transfers`
    ADD COLUMN IF NOT EXISTS `handover_status` ENUM('Pending Acceptance', 'Accepted', 'Rejected') NOT NULL DEFAULT 'Pending Acceptance' AFTER `transferred_by`,
    ADD COLUMN IF NOT EXISTS `sending_nurse_id` INT UNSIGNED NULL DEFAULT NULL AFTER `handover_status`,
    ADD COLUMN IF NOT EXISTS `sending_nurse_name` VARCHAR(150) NULL DEFAULT NULL AFTER `sending_nurse_id`,
    ADD COLUMN IF NOT EXISTS `sending_nurse_signature` VARCHAR(255) NULL DEFAULT NULL AFTER `sending_nurse_name`,
    ADD COLUMN IF NOT EXISTS `sending_nurse_signed_at` DATETIME NULL DEFAULT NULL AFTER `sending_nurse_signature`,
    ADD COLUMN IF NOT EXISTS `sbar_situation` TEXT NULL DEFAULT NULL AFTER `sending_nurse_signed_at`,
    ADD COLUMN IF NOT EXISTS `sbar_background` TEXT NULL DEFAULT NULL AFTER `sbar_situation`,
    ADD COLUMN IF NOT EXISTS `sbar_assessment` TEXT NULL DEFAULT NULL AFTER `sbar_background`,
    ADD COLUMN IF NOT EXISTS `sbar_recommendation` TEXT NULL DEFAULT NULL AFTER `sbar_assessment`,
    ADD COLUMN IF NOT EXISTS `vitals_at_transfer` JSON NULL DEFAULT NULL AFTER `sbar_recommendation`,
    ADD COLUMN IF NOT EXISTS `receiving_nurse_id` INT UNSIGNED NULL DEFAULT NULL AFTER `vitals_at_transfer`,
    ADD COLUMN IF NOT EXISTS `receiving_nurse_name` VARCHAR(150) NULL DEFAULT NULL AFTER `receiving_nurse_id`,
    ADD COLUMN IF NOT EXISTS `receiving_nurse_signature` VARCHAR(255) NULL DEFAULT NULL AFTER `receiving_nurse_name`,
    ADD COLUMN IF NOT EXISTS `receiving_nurse_signed_at` DATETIME NULL DEFAULT NULL AFTER `receiving_nurse_signature`,
    ADD COLUMN IF NOT EXISTS `receiving_acceptance_notes` TEXT NULL DEFAULT NULL AFTER `receiving_nurse_signed_at`,
    ADD COLUMN IF NOT EXISTS `receiving_verified_at` DATETIME NULL DEFAULT NULL AFTER `receiving_acceptance_notes`,
    ADD COLUMN IF NOT EXISTS `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- Add Index for handover status
SET @exist_idx := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'inpatient_transfers'
      AND INDEX_NAME = 'idx_trans_handover_status'
);

SET @sql_idx := IF(@exist_idx = 0,
    'ALTER TABLE `inpatient_transfers` ADD INDEX `idx_trans_handover_status` (`handover_status`);',
    'SELECT 1;'
);
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;
