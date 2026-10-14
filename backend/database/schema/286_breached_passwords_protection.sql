-- Migration 286: Breached Passwords Protection & Compromised Credentials Defense
-- HIPAA Security Rule § 164.308(a)(5)(ii)(D) & NIST SP 800-63B Memorized Secret Verifiers

SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'password_breached');

SET @sql := IF(@col_exists = 0, 
    'ALTER TABLE users ADD COLUMN password_breached TINYINT(1) NOT NULL DEFAULT 0 AFTER is_locked', 
    'SELECT "Column password_breached already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS `breached_passwords_list` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sha1_prefix` CHAR(5) NOT NULL,
    `sha1_hash` CHAR(40) NOT NULL UNIQUE,
    `sample_plain` VARCHAR(100) DEFAULT NULL,
    `breach_count` INT NOT NULL DEFAULT 1,
    `source` VARCHAR(100) DEFAULT 'SecLists/NIST',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_bpl_prefix` (`sha1_prefix`),
    INDEX `idx_bpl_hash` (`sha1_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
