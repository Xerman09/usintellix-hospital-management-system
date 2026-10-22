-- ============================================================================
-- Migration 298: Extemporaneous Compounding & Specialized Formulations
-- (pharmacy_compounding_records, pharmacy_compounding_ingredients, pharmacy_compounding_formulas)
-- Supports IV admixtures, TPN, oncology dilutions, and pediatric suspensions.
-- Tracks master formulas, raw ingredient batch lots, cleanroom hood numbers,
-- Beyond-Use Dates (BUD), and mandatory dual pharmacist sign-offs.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `pharmacy_compounding_formulas` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `formula_code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `formulation_type` ENUM('iv_admixture', 'tpn', 'oncology_dilution', 'pediatric_suspension', 'ophthalmic', 'topical', 'other') NOT NULL DEFAULT 'iv_admixture',
    `target_drug_id` INT NULL DEFAULT NULL,
    `standard_yield_quantity` DECIMAL(12,3) NOT NULL DEFAULT 1.000,
    `yield_unit` VARCHAR(50) NOT NULL DEFAULT 'mL',
    `default_bud_hours` INT UNSIGNED NOT NULL DEFAULT 24 COMMENT 'Beyond-use date in hours',
    `default_storage_condition` VARCHAR(150) NOT NULL DEFAULT 'Refrigerate (2-8°C)',
    `default_cleanroom_hood` VARCHAR(100) NULL DEFAULT 'Laminar Flow Hood LFH-01',
    `standard_sop_instructions` TEXT NULL DEFAULT NULL,
    `is_sterile` TINYINT(1) NOT NULL DEFAULT 1,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_by` INT UNSIGNED NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_compounding_formula_code` (`formula_code`),
    KEY `idx_compounding_formula_type` (`formulation_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pharmacy_compounding_records` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `compounding_number` VARCHAR(50) NOT NULL,
    `formula_id` INT UNSIGNED NULL DEFAULT NULL,
    `formulation_name` VARCHAR(255) NOT NULL,
    `formulation_type` ENUM('iv_admixture', 'tpn', 'oncology_dilution', 'pediatric_suspension', 'ophthalmic', 'topical', 'other') NOT NULL DEFAULT 'iv_admixture',
    `patient_id` INT NULL DEFAULT NULL,
    `prescription_id` INT NULL DEFAULT NULL,
    `encounter_id` INT NULL DEFAULT NULL,
    `admission_id` INT NULL DEFAULT NULL,
    `yield_quantity` DECIMAL(12,3) NOT NULL DEFAULT 1.000,
    `yield_unit` VARCHAR(50) NOT NULL DEFAULT 'mL',
    `cleanroom_hood_number` VARCHAR(100) NOT NULL COMMENT 'Cleanroom hood / BSC identifier',
    `cleanroom_suite` VARCHAR(100) NOT NULL DEFAULT 'Central Pharmacy Cleanroom Suite',
    `prepared_at` DATETIME NOT NULL,
    `beyond_use_date` DATETIME NOT NULL COMMENT 'Beyond-Use Date (BUD)',
    `storage_condition` VARCHAR(150) NOT NULL DEFAULT 'Refrigerate (2-8°C)',
    `special_instructions` TEXT NULL DEFAULT NULL,
    `visual_inspection_checks` JSON NULL DEFAULT NULL COMMENT 'particulate_free, container_intact, labeling_correct, volume_verified',
    `status` ENUM('draft', 'prepared', 'inspected_approved', 'inspected_rejected', 'dispensed', 'discarded', 'voided') NOT NULL DEFAULT 'prepared',
    `resulting_lot_id` INT NULL DEFAULT NULL,
    `resulting_lot_number` VARCHAR(100) NULL DEFAULT NULL,
    `prepared_by_user_id` INT UNSIGNED NOT NULL COMMENT 'Preparing Pharmacist / Technician',
    `preparation_notes` TEXT NULL DEFAULT NULL,
    `inspected_by_user_id` INT UNSIGNED NULL DEFAULT NULL COMMENT 'Second Pharmacist Dual Sign-Off',
    `inspected_at` DATETIME NULL DEFAULT NULL,
    `inspection_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `inspection_notes` TEXT NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_compounding_number` (`compounding_number`),
    KEY `idx_compounding_patient` (`patient_id`),
    KEY `idx_compounding_prescription` (`prescription_id`),
    KEY `idx_compounding_status` (`status`),
    KEY `idx_compounding_bud` (`beyond_use_date`),
    KEY `idx_compounding_prepared_at` (`prepared_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pharmacy_compounding_ingredients` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `compounding_id` INT UNSIGNED NOT NULL,
    `drug_id` INT NULL DEFAULT NULL,
    `ingredient_name` VARCHAR(255) NOT NULL,
    `source_lot_id` INT NULL DEFAULT NULL,
    `source_lot_number` VARCHAR(100) NOT NULL,
    `source_lot_expiry` DATE NULL DEFAULT NULL,
    `source_warehouse_id` INT NULL DEFAULT NULL,
    `quantity_consumed` DECIMAL(12,3) NOT NULL,
    `unit` VARCHAR(50) NOT NULL,
    `unit_cost` DECIMAL(12,4) NULL DEFAULT 0.0000,
    `total_cost` DECIMAL(12,2) NULL DEFAULT 0.00,
    `notes` VARCHAR(255) NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_comp_ing_record` (`compounding_id`),
    KEY `idx_comp_ing_lot` (`source_lot_id`),
    KEY `idx_comp_ing_lot_number` (`source_lot_number`),
    CONSTRAINT `fk_comp_ing_record` FOREIGN KEY (`compounding_id`) REFERENCES `pharmacy_compounding_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed: Standard Master Compounding Formulas
INSERT INTO `pharmacy_compounding_formulas`
    (`formula_code`, `name`, `formulation_type`, `standard_yield_quantity`, `yield_unit`, `default_bud_hours`, `default_storage_condition`, `default_cleanroom_hood`, `standard_sop_instructions`, `is_sterile`)
VALUES
    ('FORM-TPN-01', 'Total Parenteral Nutrition (TPN) Standard Adult 2000 mL', 'tpn', 2000.000, 'mL', 24, 'Refrigerate (2-8°C)', 'Cleanroom Laminar Flow Hood LFH-01', 'Aseptically combine amino acids (Travasol/Aminosyn), 50% dextrose, electrolytes (NaCl, KCl, MgSO4, K-Phos), M.V.I., and trace elements in EVA parenteral bag. Filter with 0.22 micron filter.', 1),
    ('FORM-TPN-NEO', 'Neonatal TPN Starter Admixture 250 mL', 'tpn', 250.000, 'mL', 24, 'Refrigerate (2-8°C), Protect from Light', 'Cleanroom Laminar Flow Hood LFH-01', 'Pediatric amino acid 6% + D10W, calcium gluconate, sodium acetate, heparin 0.5 unit/mL. Inspect for precipitation before release.', 1),
    ('FORM-OMEP-SUSP', 'Omeprazole 2 mg/mL Pediatric Oral Suspension 100 mL', 'pediatric_suspension', 100.000, 'mL', 720, 'Refrigerate (2-8°C)', 'Non-Sterile Compounding Station BSC-01', 'Empty 10 capsules of Omeprazole 20mg into mortar. Add 8.4% Sodium Bicarbonate solution gradually with geometric dilution to make 100 mL. Shake well before use.', 0),
    ('FORM-KCL-NS', 'Potassium Chloride 20 mEq in 0.9% Normal Saline 1000 mL', 'iv_admixture', 1000.000, 'mL', 48, 'Room Temperature (20-25°C)', 'Cleanroom Laminar Flow Hood LFH-02', 'Aseptically inject 10 mL KCl (2 mEq/mL) into 1000 mL 0.9% Sodium Chloride bag. Invert 10 times to ensure thorough mixing. Affix high-alert potassium warning auxiliary label.', 1),
    ('FORM-VANCO-D5W', 'Vancomycin 1 g in 5% Dextrose in Water (D5W) 250 mL', 'iv_admixture', 250.000, 'mL', 96, 'Refrigerate (2-8°C)', 'Cleanroom Laminar Flow Hood LFH-02', 'Reconstitute 1 g Vancomycin vial with 20 mL sterile water for injection. Transfer to 250 mL D5W bag. Final concentration 4 mg/mL.', 1),
    ('FORM-PACLI-DIL', 'Paclitaxel 100 mg / 500 mL 0.9% Normal Saline (Oncology)', 'oncology_dilution', 500.000, 'mL', 24, 'Room Temperature (20-25°C), Protect from Light', 'Biological Safety Cabinet (Class II Type B2) BSC-03', 'Compound in negative pressure cytotoxic suite. Use non-PVC bag and 0.22 micron in-line IV filter. Inspect for particulates.', 1),
    ('FORM-SILD-SYR', 'Sildenafil 2.5 mg/mL Pediatric Oral Suspension 60 mL', 'pediatric_suspension', 60.000, 'mL', 1440, 'Room Temperature (20-25°C)', 'Non-Sterile Compounding Station BSC-01', 'Crush 3 tablets Sildenafil 50mg in mortar. Reconstitute with 1:1 mixture of Ora-Sweet and Ora-Plus to 60 mL total volume.', 0)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
