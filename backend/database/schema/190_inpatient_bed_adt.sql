-- =========================================================
-- INPATIENT BED MANAGEMENT & WARD CENSUS (ADT) SCHEMA
-- =========================================================

CREATE TABLE IF NOT EXISTS `hospital_wards` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `ward_code` VARCHAR(30) NOT NULL UNIQUE,
    `ward_name` VARCHAR(100) NOT NULL,
    `ward_type` ENUM('ICU', 'Surgical', 'Medical', 'Pediatric', 'Maternity', 'Isolation') NOT NULL DEFAULT 'Medical',
    `floor_location` VARCHAR(100) NOT NULL DEFAULT '2nd Floor - West Tower',
    `gender_restriction` ENUM('All', 'Male Only', 'Female Only', 'Pediatric') NOT NULL DEFAULT 'All',
    `total_beds_count` INT NOT NULL DEFAULT 0,
    `head_nurse` VARCHAR(100) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_ward_type` (`ward_type`),
    INDEX `idx_ward_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hospital_beds` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `ward_id` INT UNSIGNED NOT NULL,
    `bed_number` VARCHAR(30) NOT NULL UNIQUE,
    `room_number` VARCHAR(50) NOT NULL,
    `bed_type` ENUM('Standard Acute Bed', 'ICU Monitor Bed', 'Negative Pressure Isolation', 'Stepdown Bed', 'Pediatric Crib', 'Labor & Delivery Bed') NOT NULL DEFAULT 'Standard Acute Bed',
    `status` ENUM('Available', 'Occupied', 'Pending Discharge', 'Dirty / Turnover', 'Maintenance', 'Blocked') NOT NULL DEFAULT 'Available',
    `current_admission_id` INT UNSIGNED NULL,
    `features` TEXT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_bed_ward` (`ward_id`),
    INDEX `idx_bed_status` (`status`),
    INDEX `idx_bed_room` (`room_number`),
    INDEX `idx_bed_current_adm` (`current_admission_id`),
    CONSTRAINT `fk_beds_ward` FOREIGN KEY (`ward_id`) REFERENCES `hospital_wards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inpatient_admissions` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `admission_number` VARCHAR(50) NOT NULL UNIQUE,
    `patient_id` INT UNSIGNED NULL,
    `patient_name` VARCHAR(150) NOT NULL,
    `patient_mrn` VARCHAR(50) NULL,
    `patient_age` INT NULL,
    `gender` VARCHAR(20) NULL,
    `ward_id` INT UNSIGNED NOT NULL,
    `bed_id` INT UNSIGNED NOT NULL,
    `admission_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `admission_source` ENUM('Outpatient Clinic', 'Emergency Room (ER)', 'Post-Op PACU / Surgical', 'Direct Transfer / Outside Hospital') NOT NULL DEFAULT 'Outpatient Clinic',
    `admission_type` ENUM('Elective', 'Emergency / STAT', 'Urgent', 'Newborn') NOT NULL DEFAULT 'Elective',
    `admitting_diagnosis` VARCHAR(255) NOT NULL,
    `attending_physician` VARCHAR(150) NOT NULL,
    `primary_nurse` VARCHAR(150) NULL,
    `isolation_precautions` ENUM('Standard', 'Contact', 'Droplet', 'Airborne', 'Strict Protective Neutropenic') NOT NULL DEFAULT 'Standard',
    `expected_discharge_date` DATE NULL,
    `status` ENUM('Admitted', 'Pending Discharge', 'Discharged', 'Transferred', 'Deceased') NOT NULL DEFAULT 'Admitted',
    `discharge_date` DATETIME NULL,
    `discharge_disposition` VARCHAR(150) NULL,
    `discharge_notes` TEXT NULL,
    `discharge_physician` VARCHAR(150) NULL,
    `created_by` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_adm_patient` (`patient_id`),
    INDEX `idx_adm_mrn` (`patient_mrn`),
    INDEX `idx_adm_ward` (`ward_id`),
    INDEX `idx_adm_bed` (`bed_id`),
    INDEX `idx_adm_status` (`status`),
    INDEX `idx_adm_date` (`admission_date`),
    CONSTRAINT `fk_adm_ward` FOREIGN KEY (`ward_id`) REFERENCES `hospital_wards` (`id`),
    CONSTRAINT `fk_adm_bed` FOREIGN KEY (`bed_id`) REFERENCES `hospital_beds` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inpatient_transfers` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `admission_id` INT UNSIGNED NOT NULL,
    `patient_id` INT UNSIGNED NULL,
    `from_ward_id` INT UNSIGNED NOT NULL,
    `from_bed_id` INT UNSIGNED NOT NULL,
    `to_ward_id` INT UNSIGNED NOT NULL,
    `to_bed_id` INT UNSIGNED NOT NULL,
    `transfer_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `transfer_reason` VARCHAR(255) NOT NULL,
    `transfer_notes` TEXT NULL,
    `transferred_by` VARCHAR(150) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_trans_adm` (`admission_id`),
    INDEX `idx_trans_patient` (`patient_id`),
    CONSTRAINT `fk_trans_adm` FOREIGN KEY (`admission_id`) REFERENCES `inpatient_admissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
