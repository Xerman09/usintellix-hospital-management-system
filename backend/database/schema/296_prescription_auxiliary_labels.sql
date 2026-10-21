-- ============================================================================
-- Migration 296: Standardized Dosing & Auxiliary Thermal Label Generator
-- Table: prescription_auxiliary_labels
-- ============================================================================
-- Stores customized standardized dosing instructions (Universal Medication
-- Schedule grid: Morning, Noon, Evening, Bedtime) and auxiliary warning
-- stickers ("Take with food", "Finish entire course of antibiotics",
-- "Avoid sunlight", "Do not crush", etc.) for thermal prescription labels.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `prescription_auxiliary_labels` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `dispense_id` INT UNSIGNED NOT NULL COMMENT 'FK to prescription_dispenses.id',
    `prescription_item_id` INT UNSIGNED NOT NULL COMMENT 'FK to patient_prescriptions.id',
    `standardized_sig` VARCHAR(500) NOT NULL COMMENT 'Expanded plain-language dosing direction for thermal label',
    `ums_schedule_json` VARCHAR(255) NULL COMMENT 'Universal Medication Schedule JSON {morning, noon, evening, bedtime}',
    `auxiliary_codes_json` TEXT NOT NULL COMMENT 'JSON array of selected auxiliary warning sticker codes',
    `thermal_format` ENUM('thermal_80x50mm', 'thermal_100x60mm', 'a4_sheet') NOT NULL DEFAULT 'thermal_80x50mm',
    `updated_by_user_id` INT UNSIGNED NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_dispense_item_aux_label` (`dispense_id`, `prescription_item_id`),
    KEY `idx_aux_label_dispense` (`dispense_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
