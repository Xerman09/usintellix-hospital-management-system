-- =====================================================================
-- Migration: 297_patient_contact_histories.sql
-- Description: Contact & Address History Log (patient_contact_histories)
--              Tracks chronological residential, permanent, and billing
--              addresses and contact numbers with effective date ranges.
-- =====================================================================

CREATE TABLE IF NOT EXISTS `patient_contact_histories` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `patient_id` INT NOT NULL,
    `address_type` ENUM('residential', 'permanent', 'billing', 'temporary') NOT NULL DEFAULT 'residential',
    `address_line` VARCHAR(255) NULL,
    `address_line2` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `province` VARCHAR(100) NULL,
    `postal_code` VARCHAR(20) NULL,
    `country` VARCHAR(100) NULL DEFAULT 'Philippines',
    `home_phone` VARCHAR(50) NULL,
    `mobile_phone` VARCHAR(50) NULL,
    `work_phone` VARCHAR(50) NULL,
    `email` VARCHAR(255) NULL,
    `effective_from` DATE NOT NULL,
    `effective_to` DATE NULL,
    `is_current` TINYINT(1) NOT NULL DEFAULT 1,
    `change_reason` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME NULL,
    `created_by` INT NULL,
    `updated_at` DATETIME NULL,
    `updated_by` INT NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_pch_patient` (`patient_id`),
    INDEX `idx_pch_effective` (`patient_id`, `effective_from`, `effective_to`),
    INDEX `idx_pch_current` (`patient_id`, `is_current`),
    CONSTRAINT `fk_pch_patient`
        FOREIGN KEY (`patient_id`)
        REFERENCES `patients` (`id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
