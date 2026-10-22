-- ============================================================================
-- Migration 299: Near-Expiry Automated Quarantine Lock (<60 days)
-- Flags lots expiring within <60 days as Quarantined, blocking them from
-- being selected or dispensed during outpatient and inpatient dispensing.
-- ============================================================================

-- 1. Add quarantine columns to drug_inventory_lots if not present
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'drug_inventory_lots'
  AND COLUMN_NAME = 'is_quarantined';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `drug_inventory_lots`
        ADD COLUMN `is_quarantined` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_active`,
        ADD COLUMN `quarantine_reason` VARCHAR(255) NULL DEFAULT NULL AFTER `is_quarantined`,
        ADD COLUMN `quarantined_at` DATETIME NULL DEFAULT NULL AFTER `quarantine_reason`,
        ADD COLUMN `quarantined_by` INT(11) NULL DEFAULT NULL AFTER `quarantined_at`,
        ADD INDEX `idx_lots_quarantine` (`is_quarantined`, `expires_date`)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Audit log of automated and manual quarantine scans
CREATE TABLE IF NOT EXISTS `pharmacy_quarantine_logs` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `execution_type` ENUM('cron_nightly', 'manual_scan', 'lot_update', 'quarantine_release') NOT NULL DEFAULT 'cron_nightly',
    `threshold_days` INT UNSIGNED NOT NULL DEFAULT 60,
    `target_date` DATE NOT NULL,
    `lots_quarantined_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_quantity_quarantined` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    `executed_by` INT UNSIGNED NULL DEFAULT NULL,
    `executed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `summary_notes` VARCHAR(500) NULL DEFAULT NULL,
    `details` LONGTEXT NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_quarantine_logs_date` (`target_date`),
    KEY `idx_quarantine_logs_type` (`execution_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Settings table for quarantine policy
CREATE TABLE IF NOT EXISTS `pharmacy_quarantine_settings` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `near_expiry_days` INT UNSIGNED NOT NULL DEFAULT 60 COMMENT 'Days threshold before lot expiry for quarantine lock',
    `auto_lock_enabled` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = auto quarantine in cron and on fetch',
    `allow_admin_override` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = allow authorized release with clinical justification',
    `last_cron_run_at` DATETIME NULL DEFAULT NULL,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings row if table is empty
INSERT INTO `pharmacy_quarantine_settings` (`id`, `near_expiry_days`, `auto_lock_enabled`, `allow_admin_override`)
SELECT 1, 60, 1, 1
WHERE NOT EXISTS (SELECT 1 FROM `pharmacy_quarantine_settings` WHERE `id` = 1);
