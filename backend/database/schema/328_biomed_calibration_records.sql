-- ============================================================================
-- Migration: 328_biomed_calibration_records.sql
-- Subsystem: Biomedical Engineering & Equipment Maintenance
-- Purpose: NIST-Traceable Calibration & Electrical Safety (IEC 62353) Certification
-- ============================================================================

CREATE TABLE IF NOT EXISTS `biomed_calibration_records` (
    `id` INT(11) AUTO_INCREMENT PRIMARY KEY,
    `certificate_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Formal Certificate Number e.g. CAL-2026-0001',
    `asset_id` INT(11) NOT NULL COMMENT 'Target hospital equipment asset FK',
    `work_order_id` INT(11) NULL COMMENT 'Optional linked preventive or breakdown work order',
    `calibration_type` ENUM(
        'energy_output',
        'electrosurgical_power',
        'flow_and_pressure',
        'infusion_rate',
        'ecg_arrhythmia_sim',
        'radiology_kvp_timer',
        'electrical_safety_only',
        'comprehensive_calibration'
    ) NOT NULL DEFAULT 'comprehensive_calibration',
    `calibration_date` DATE NOT NULL,
    `next_due_date` DATE NOT NULL,
    `calibration_interval_months` INT NOT NULL DEFAULT 12,
    `environmental_temp_c` DECIMAL(4,1) NULL DEFAULT 22.0 COMMENT 'Ambient temperature during metrology session',
    `relative_humidity_pct` DECIMAL(4,1) NULL DEFAULT 45.0 COMMENT 'Ambient relative humidity %',
    `calibrated_by_name` VARCHAR(150) NOT NULL,
    `calibrated_by_role` VARCHAR(100) NOT NULL DEFAULT 'Biomedical Metrology Specialist',
    `calibrator_license_no` VARCHAR(100) NULL COMMENT 'PRC / CBET license or metrology cert #',
    `calibration_standard_used` VARCHAR(255) NOT NULL COMMENT 'Primary reference standard equipment name & model',
    `standard_serial_number` VARCHAR(100) NULL,
    `standard_nist_cert_number` VARCHAR(100) NOT NULL COMMENT 'NIST-traceable calibration cert number of standard',
    `standard_calibration_expiry` DATE NOT NULL COMMENT 'Standard certificate validity date',
    `traceability_statement` TEXT NULL COMMENT 'NIST/ISO 17025 unbroken chain traceability statement',

    -- Energy / Output Metrology Verification
    `set_point_output` DECIMAL(10,3) NULL COMMENT 'Nominal test set point (e.g. 200 Joules, 50 Watts)',
    `measured_output` DECIMAL(10,3) NULL COMMENT 'Observed measured output on calibrated standard',
    `output_unit` VARCHAR(20) NULL DEFAULT 'Joules' COMMENT 'Joules, Watts, mL/hr, cmH2O, mmHg, etc.',
    `tolerance_percentage` DECIMAL(5,2) NOT NULL DEFAULT 5.00 COMMENT 'Allowable tolerance +/- % e.g. 5.00%',
    `variance_percentage` DECIMAL(6,3) NULL COMMENT 'Measured variance %: ((measured - target) / target) * 100',
    `energy_calibration_passed` TINYINT(1) NOT NULL DEFAULT 1,
    `multi_point_data_json` LONGTEXT NULL COMMENT 'JSON array of multiple energy/parameter test points',

    -- Electrical Safety Testing (IEC 62353 / NFPA 99)
    `ground_wire_resistance_ohms` DECIMAL(6,4) NULL COMMENT 'Protective earth ground resistance (Limit: < 0.2000 Ohm)',
    `ground_resistance_passed` TINYINT(1) NOT NULL DEFAULT 1,
    `chassis_leakage_microamp` DECIMAL(6,2) NULL COMMENT 'Chassis leakage current (Limit: < 100 uA normal, < 500 uA fault)',
    `chassis_leakage_passed` TINYINT(1) NOT NULL DEFAULT 1,
    `lead_leakage_microamp` DECIMAL(6,2) NULL COMMENT 'Patient applied part / lead leakage (Limit: < 10 uA CF, < 50 uA BF)',
    `lead_leakage_passed` TINYINT(1) NOT NULL DEFAULT 1,
    `electrical_safety_passed` TINYINT(1) NOT NULL DEFAULT 1,

    -- Overall Certification & Tamper-Evident Sticker
    `overall_result` ENUM('passed', 'failed', 'conditional_pass') NOT NULL DEFAULT 'passed',
    `sticker_issued` TINYINT(1) NOT NULL DEFAULT 1,
    `sticker_serial_number` VARCHAR(50) NULL COMMENT 'Physical barcode sticker serial e.g. CAL-STK-2026-0001',
    `notes_and_remarks` TEXT NULL,
    `supervisor_approved_by` VARCHAR(150) NULL,
    `supervisor_approved_at` DATETIME NULL,
    `created_by` INT(11) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL,

    INDEX `idx_cal_asset` (`asset_id`),
    INDEX `idx_cal_date` (`calibration_date`),
    INDEX `idx_cal_next_due` (`next_due_date`),
    INDEX `idx_cal_result` (`overall_result`),
    CONSTRAINT `fk_biomed_cal_asset` FOREIGN KEY (`asset_id`) REFERENCES `hospital_equipment_assets`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_biomed_cal_wo` FOREIGN KEY (`work_order_id`) REFERENCES `biomed_work_orders`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sequence counter for calibration certificate numbers CAL-2026-0001
INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
VALUES ('BIOMED_CAL', 2026, 0)
ON DUPLICATE KEY UPDATE `counter_type` = `counter_type`;
