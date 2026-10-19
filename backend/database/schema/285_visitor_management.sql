-- =====================================================================
-- Migration 285 / 303: Visitor Management System
-- Enterprise Hospital Visitor Governance, Security Barcodes, Bedside Quotas & Visiting Hours
-- =====================================================================

-- 1. Table for Ward-Specific Visitor Policies & Visiting Hours
CREATE TABLE IF NOT EXISTS `ward_visitor_policies` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `ward_id` INT UNSIGNED NULL,                                -- NULL indicates hospital-wide default policy
    `ward_type` VARCHAR(50) NULL,                                -- ICU, Maternity, Pediatric, Isolation, Medical, Surgical
    `max_active_visitors_per_bed` INT NOT NULL DEFAULT 2,        -- Max concurrent visitors per bedside
    `max_visit_duration_minutes` INT NOT NULL DEFAULT 120,       -- Default pass validity duration
    `visiting_hours_start` TIME NOT NULL DEFAULT '10:00:00',     -- Morning/standard opening
    `visiting_hours_end` TIME NOT NULL DEFAULT '20:00:00',       -- Evening closing
    `has_midday_break` TINYINT(1) NOT NULL DEFAULT 0,            -- 1 for split visiting hours (e.g. ICU)
    `visiting_hours_slot2_start` TIME NULL DEFAULT '17:00:00',   -- Afternoon slot start
    `visiting_hours_slot2_end` TIME NULL DEFAULT '18:00:00',     -- Afternoon slot end
    `allow_overnight_companion` TINYINT(1) NOT NULL DEFAULT 0,   -- 1 for pediatric or single watcher
    `requires_health_declaration` TINYINT(1) NOT NULL DEFAULT 1, -- Infection control screening
    `min_visitor_age` INT NOT NULL DEFAULT 12,                   -- Age restriction
    `notes` VARCHAR(255) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_wvp_ward` (`ward_id`),
    INDEX `idx_wvp_type` (`ward_type`),
    CONSTRAINT `fk_wvp_ward` FOREIGN KEY (`ward_id`) REFERENCES `hospital_wards` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table for Visitor Passes
CREATE TABLE IF NOT EXISTS `visitor_passes` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `pass_number` VARCHAR(60) NOT NULL UNIQUE,                  -- e.g. VIS-2026-00001
    `barcode_hash` VARCHAR(100) NULL,                           -- QR code / barcode verification hash
    `visitor_name` VARCHAR(150) NOT NULL,
    `id_document_type` VARCHAR(50) NOT NULL,                    -- National ID, Passport, Driver's License, SSS/UMID, etc.
    `id_document_number` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `email` VARCHAR(100) NULL,
    `patient_id` INT NULL,                                      -- Linked patient (matches patients.id int(11))
    `admission_id` INT UNSIGNED NULL,                           -- Linked active inpatient admission
    `ward_id` INT UNSIGNED NULL,                                -- Assigned ward
    `room_number` VARCHAR(50) NULL,                             -- Patient room
    `bed_number` VARCHAR(30) NULL,                              -- Patient bed
    `relationship_to_patient` ENUM(
        'Spouse',
        'Parent',
        'Child',
        'Sibling',
        'Relative',
        'Friend',
        'Legal Guardian',
        'Caregiver / Private Nurse',
        'Legal / Religious Representative',
        'Other'
    ) NOT NULL DEFAULT 'Relative',
    `check_in_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `valid_until` DATETIME NOT NULL,
    `check_out_time` DATETIME NULL,
    `status` ENUM('Active', 'Checked Out', 'Expired', 'Revoked') NOT NULL DEFAULT 'Active',
    `is_emergency_exception` TINYINT(1) NOT NULL DEFAULT 0,     -- Security supervisor override for after-hours/quota
    `issued_by` INT NULL,                                       -- User ID of security/receptionist who issued pass
    `checked_out_by` INT NULL,                                  -- User ID who processed check-out
    `revoked_by` INT NULL,                                      -- User ID if revoked
    `revocation_reason` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_vp_pass_num` (`pass_number`),
    INDEX `idx_vp_patient` (`patient_id`),
    INDEX `idx_vp_admission` (`admission_id`),
    INDEX `idx_vp_ward` (`ward_id`),
    INDEX `idx_vp_status` (`status`),
    INDEX `idx_vp_active_bed` (`admission_id`, `status`),
    INDEX `idx_vp_check_in` (`check_in_time`),
    INDEX `idx_vp_valid_until` (`valid_until`),
    CONSTRAINT `fk_vp_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_vp_admission` FOREIGN KEY (`admission_id`) REFERENCES `inpatient_admissions` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_vp_ward` FOREIGN KEY (`ward_id`) REFERENCES `hospital_wards` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed Default Ward Visitor Policies
INSERT INTO `ward_visitor_policies` 
    (`ward_id`, `ward_type`, `max_active_visitors_per_bed`, `max_visit_duration_minutes`, `visiting_hours_start`, `visiting_hours_end`, `has_midday_break`, `visiting_hours_slot2_start`, `visiting_hours_slot2_end`, `allow_overnight_companion`, `min_visitor_age`, `notes`)
VALUES
    -- Hospital-wide general fallback policy
    (NULL, 'General', 2, 120, '10:00:00', '20:00:00', 0, NULL, NULL, 0, 12, 'Standard hospital visiting hours: 10:00 AM to 8:00 PM. Maximum 2 visitors per bedside.'),
    -- ICU restricted policy (strict 2 slots: 11:00-12:00 and 17:00-18:00, max 1 visitor, min age 18)
    (NULL, 'ICU', 1, 60, '11:00:00', '12:00:00', 1, '17:00:00', '18:00:00', 0, 18, 'ICU Restricted Visiting Hours: 11:00 AM - 12:00 PM & 5:00 PM - 6:00 PM. Max 1 visitor at a time.'),
    -- Isolation Ward policy (strict PPE, 1 visitor, 30 mins)
    (NULL, 'Isolation', 1, 30, '14:00:00', '16:00:00', 0, NULL, NULL, 0, 18, 'Infection Control Isolation Ward. PPE required before entry. Max 1 visitor for 30 minutes.'),
    -- Pediatric Ward policy (parents allowed, overnight watcher permitted)
    (NULL, 'Pediatric', 2, 180, '09:00:00', '20:00:00', 0, NULL, NULL, 1, 0, 'Pediatric Ward: Parents and immediate guardians. 1 designated overnight companion permitted.'),
    -- Maternity Ward policy (1 companion permitted)
    (NULL, 'Maternity', 2, 120, '10:00:00', '20:00:00', 0, NULL, NULL, 1, 12, 'Maternity Suite: Spouse / primary birth partner priority.')
ON DUPLICATE KEY UPDATE `updated_at` = NOW();
