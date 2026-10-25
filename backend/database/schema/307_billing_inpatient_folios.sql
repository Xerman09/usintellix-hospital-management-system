-- 307_billing_inpatient_folios.sql
-- Consolidated Inpatient Master Folio and Line Items Ledger
-- Consolidates all inpatient charges:
--   1. Accommodation: Bed days x daily room rate
--   2. Doctor Fees: Attending physician daily rounds & specialist fees
--   3. Operating Theater: Surgery room minutes, anesthesia, instrument trays
--   4. Diagnostics: Lab tests, pathology, and imaging studies
--   5. Pharmacy: Inpatient e-MAR medications and supplies used
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `billing_inpatient_folios` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `folio_number` VARCHAR(50) NOT NULL UNIQUE,
    `admission_id` INT UNSIGNED NOT NULL,
    `patient_id` INT NOT NULL,
    `status` ENUM('open', 'interim', 'for_billing_clearance', 'closed', 'cancelled') NOT NULL DEFAULT 'open',
    
    -- Admission snapshot
    `admitted_at` DATETIME NOT NULL,
    `discharged_at` DATETIME DEFAULT NULL,
    `bed_days` DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    `room_bed_label` VARCHAR(100) DEFAULT NULL,
    `attending_physician` VARCHAR(150) DEFAULT NULL,
    
    -- Categorized Financial Subtotals
    `total_accommodation` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_doctor_fees` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_operating_theater` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_laboratory` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_radiology` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_pharmacy` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_supplies_misc` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    
    -- Real-Time Balance Tracking
    `gross_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `discount_type` VARCHAR(50) DEFAULT NULL,
    `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `insurance_covered_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `net_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `paid_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `balance_due` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    
    -- Billing Clearance
    `billing_cleared` TINYINT(1) NOT NULL DEFAULT 0,
    `billing_cleared_at` DATETIME DEFAULT NULL,
    `billing_cleared_by` VARCHAR(150) DEFAULT NULL,
    
    `notes` TEXT DEFAULT NULL,
    `created_by` INT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY `uq_admission_folio` (`admission_id`),
    KEY `idx_folio_patient` (`patient_id`),
    KEY `idx_folio_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_folio_line_items` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `folio_id` INT UNSIGNED NOT NULL,
    `charge_category` ENUM(
        'accommodation',
        'doctor_fees',
        'operating_theater',
        'laboratory',
        'radiology',
        'pharmacy',
        'supplies_misc'
    ) NOT NULL,
    `source_table` VARCHAR(64) DEFAULT NULL,
    `source_id` INT DEFAULT NULL,
    `item_code` VARCHAR(50) DEFAULT NULL,
    `item_description` VARCHAR(255) NOT NULL,
    `service_date` DATE NOT NULL,
    `quantity` DECIMAL(10,3) NOT NULL DEFAULT 1.000,
    `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `gross_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `net_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `is_covered_by_insurance` TINYINT(1) NOT NULL DEFAULT 0,
    `performer_name` VARCHAR(150) DEFAULT NULL,
    `status` ENUM('billed', 'voided', 'adjusted') NOT NULL DEFAULT 'billed',
    `notes` TEXT DEFAULT NULL,
    `created_by` INT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    KEY `idx_line_item_folio` (`folio_id`, `charge_category`),
    KEY `idx_line_item_source` (`source_table`, `source_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_folio_payments` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `folio_id` INT UNSIGNED NOT NULL,
    `receipt_number` VARCHAR(50) NOT NULL UNIQUE,
    `payer_type` ENUM('patient', 'insurance', 'hmo', 'guarantor') NOT NULL DEFAULT 'patient',
    `payment_method` ENUM('cash', 'credit_card', 'debit_card', 'check', 'bank_transfer', 'gcash_maya', 'insurance_claim') NOT NULL DEFAULT 'cash',
    `amount` DECIMAL(12,2) NOT NULL,
    `payment_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `reference_no` VARCHAR(100) DEFAULT NULL,
    `cashier_name` VARCHAR(150) NOT NULL,
    `cashier_id` INT DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `status` ENUM('valid', 'voided') NOT NULL DEFAULT 'valid',
    `voided_at` DATETIME DEFAULT NULL,
    `voided_by` INT DEFAULT NULL,
    `void_reason` VARCHAR(255) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    KEY `idx_folio_pay` (`folio_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_folio_counters` (
    `prefix_year` INT NOT NULL PRIMARY KEY,
    `last_seq` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_receipt_counters` (
    `prefix_year` INT NOT NULL PRIMARY KEY,
    `last_seq` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure default daily room rates on hospital_beds
UPDATE `hospital_beds` SET `daily_rate` = 2500.00 WHERE (`daily_rate` IS NULL OR `daily_rate` = 0) AND `bed_type` = 'ICU Monitor Bed';
UPDATE `hospital_beds` SET `daily_rate` = 1200.00 WHERE (`daily_rate` IS NULL OR `daily_rate` = 0) AND `bed_type` = 'Standard Acute Bed';
UPDATE `hospital_beds` SET `daily_rate` = 3000.00 WHERE (`daily_rate` IS NULL OR `daily_rate` = 0) AND `bed_type` = 'Negative Pressure Isolation';
UPDATE `hospital_beds` SET `daily_rate` = 1800.00 WHERE (`daily_rate` IS NULL OR `daily_rate` = 0) AND `bed_type` = 'Stepdown Bed';
UPDATE `hospital_beds` SET `daily_rate` = 1000.00 WHERE (`daily_rate` IS NULL OR `daily_rate` = 0) AND `bed_type` = 'Pediatric Crib';
UPDATE `hospital_beds` SET `daily_rate` = 2000.00 WHERE (`daily_rate` IS NULL OR `daily_rate` = 0) AND `bed_type` = 'Labor & Delivery Bed';
UPDATE `hospital_beds` SET `daily_rate` = 1000.00 WHERE (`daily_rate` IS NULL OR `daily_rate` = 0);
