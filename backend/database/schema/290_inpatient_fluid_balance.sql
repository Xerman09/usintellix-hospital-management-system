-- ====================================================================
-- SCHEMA MIGRATION: 290_inpatient_fluid_balance.sql
-- 24-Hour Fluid Balance Charts (Intake & Output / I&O Flowsheet)
-- Post-Op, Cardiac, Renal, and ICU Fluid Surveillance
-- ====================================================================

CREATE TABLE IF NOT EXISTS `inpatient_fluid_balance` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `entry_number` VARCHAR(32) NOT NULL UNIQUE,
    `admission_id` INT UNSIGNED NOT NULL,
    `patient_id` INT UNSIGNED NOT NULL,
    `recorded_at` DATETIME NOT NULL,
    `shift` VARCHAR(40) NOT NULL DEFAULT 'Day Shift (07:00-15:00)' COMMENT 'Day Shift (07:00-15:00), Evening Shift (15:00-23:00), Night Shift (23:00-07:00)',

    -- INTAKE (mL)
    `intake_oral_ml` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Oral fluids (water, juice, broth, oral meds) in mL',
    `intake_iv_ml` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'IV infusions, crystalloids, piggybacks, continuous drips in mL',
    `intake_blood_ml` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Blood products (PRBC, FFP, Platelets, Albumin) in mL',
    `intake_enteral_ml` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Tube feedings (NG/PEG enteral nutrition & flushes) in mL',
    `intake_other_ml` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Other intake / bladder or line irrigation in mL',
    `intake_total_ml` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Sum of all intake sources for this entry in mL',
    `intake_details` VARCHAR(255) NULL COMMENT 'Specific IV solution, rate, or oral fluid description',

    -- OUTPUT (mL)
    `output_urine_ml` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Voided or indwelling Foley urinary catheter output in mL',
    `output_drain_ml` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Jackson-Pratt (JP) / Hemovac surgical drains in mL',
    `output_emesis_ml` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Emesis / vomitus output in mL',
    `output_ng_ml` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Nasogastric (NG) / OG tube aspirate in mL',
    `output_chest_tube_ml` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Chest tube / pleural drainage in mL',
    `output_stool_other_ml` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Liquid stool, ostomy, or ultrafiltration output in mL',
    `output_total_ml` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Sum of all output sources for this entry in mL',
    `output_details` VARCHAR(255) NULL COMMENT 'Urine character/color, drain site number, or aspirate character',

    -- NET BALANCE & CLINICAL WARNINGS
    `entry_net_ml` INT NOT NULL DEFAULT 0 COMMENT 'Entry Net Balance (mL) = intake_total_ml - output_total_ml',
    `running_24h_net_ml` INT NOT NULL DEFAULT 0 COMMENT 'Running 24-Hour Net Balance (mL) = Sum(Intake 24h) - Sum(Output 24h)',
    `balance_alert_level` ENUM(
        'Normal / Euvolemic',
        'Fluid Overload Warning',
        'Critical Fluid Overload',
        'Negative Balance / Dehydration Warning',
        'Critical Negative Balance / Oliguria'
    ) NOT NULL DEFAULT 'Normal / Euvolemic',
    `clinical_notes` TEXT NULL COMMENT 'Nursing observations on edema, skin turgor, diuretic response, or oliguria',

    -- AUDIT & ATTRIBUTION
    `recorded_by` INT UNSIGNED NULL,
    `recorded_by_name` VARCHAR(150) NOT NULL,
    `created_by` INT UNSIGNED NULL,
    `updated_by` INT UNSIGNED NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,

    INDEX `idx_ifb_admission` (`admission_id`),
    INDEX `idx_ifb_patient` (`patient_id`),
    INDEX `idx_ifb_recorded_at` (`recorded_at`),
    INDEX `idx_ifb_alert` (`balance_alert_level`),
    INDEX `idx_ifb_deleted` (`deleted_at`),
    CONSTRAINT `fk_inpatient_fluid_balance_admission`
        FOREIGN KEY (`admission_id`)
        REFERENCES `inpatient_admissions` (`id`)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
