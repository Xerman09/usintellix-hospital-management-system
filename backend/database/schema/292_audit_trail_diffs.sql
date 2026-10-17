-- ==========================================================
-- Migration 292: Granular Entity Data Change History (audit_trail_diffs)
-- Tracks before-and-after snapshots and field-level diffs across entities
-- for full HIPAA § 164.312(b) audit trail compliance.
-- ==========================================================

CREATE TABLE IF NOT EXISTS `audit_trail_diffs` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `table_name` VARCHAR(64) NOT NULL,
    `record_id` INT(11) UNSIGNED NOT NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL DEFAULT 'UPDATE',
    `changed_fields` LONGTEXT NOT NULL COMMENT 'JSON array of modified attribute names',
    `old_values` LONGTEXT NULL DEFAULT NULL COMMENT 'JSON object snapshot prior to modification',
    `new_values` LONGTEXT NULL DEFAULT NULL COMMENT 'JSON object snapshot post modification',
    `user_id` INT(11) NULL DEFAULT NULL,
    `ip_address` VARCHAR(45) NULL DEFAULT '127.0.0.1',
    `user_agent` VARCHAR(255) NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_diff_table_record` (`table_name`, `record_id`),
    INDEX `idx_diff_user` (`user_id`),
    INDEX `idx_diff_action` (`action`),
    INDEX `idx_diff_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Immutability Guard: Prohibit updates on historical diff logs
DROP TRIGGER IF EXISTS trg_audit_trail_diffs_immutability_guard;

DELIMITER $$
CREATE TRIGGER trg_audit_trail_diffs_immutability_guard
BEFORE UPDATE ON audit_trail_diffs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'HIPAA § 164.312(b) VIOLATION: Audit trail diffs are append-only and cryptographically immutable. Record updates are prohibited.';
END$$
DELIMITER ;

-- Retention Guard: Prohibit deletions within mandatory 6-year retention window
DROP TRIGGER IF EXISTS trg_audit_trail_diffs_retention_guard;

DELIMITER $$
CREATE TRIGGER trg_audit_trail_diffs_retention_guard
BEFORE DELETE ON audit_trail_diffs
FOR EACH ROW
BEGIN
    IF OLD.created_at >= DATE_SUB(NOW(), INTERVAL 6 YEAR) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'HIPAA § 164.316(b)(2)(i) VIOLATION: Immutable retention policy prohibits deletion of audit trail diffs within 6 years of creation.';
    END IF;
END$$
DELIMITER ;
