-- =====================================================================
-- Migration 320: Bundled Health & Surgical Packages & Automated Overage Engine
-- (Fulfills Schema Migration specification for Bundled Packages & Overages)
-- Tables: alter billing_service_packages, billing_package_enrollments, billing_package_overage_items
-- Fixed-price packaged procedures (Normal Delivery, C-Section, Lap Chole)
-- with automated calculation of overage charges for days, OR minutes, and medications
-- exceeding package limits.
-- =====================================================================

-- 1. Enhance billing_service_packages with automated overage threshold rules
ALTER TABLE `billing_service_packages`
    ADD COLUMN IF NOT EXISTS `overage_room_daily_rate` DECIMAL(12,2) NOT NULL DEFAULT 1500.00 AFTER `included_room_type`,
    ADD COLUMN IF NOT EXISTS `included_or_minutes` INT NOT NULL DEFAULT 120 AFTER `overage_room_daily_rate`,
    ADD COLUMN IF NOT EXISTS `overage_or_hourly_rate` DECIMAL(12,2) NOT NULL DEFAULT 2000.00 AFTER `included_or_minutes`,
    ADD COLUMN IF NOT EXISTS `included_meds_allowance` DECIMAL(12,2) NOT NULL DEFAULT 500.00 AFTER `overage_or_hourly_rate`,
    ADD COLUMN IF NOT EXISTS `included_lab_allowance` DECIMAL(12,2) NOT NULL DEFAULT 300.00 AFTER `included_meds_allowance`,
    ADD COLUMN IF NOT EXISTS `overage_nursing_daily_rate` DECIMAL(12,2) NOT NULL DEFAULT 650.00 AFTER `included_lab_allowance`;

-- 2. Patient Package Enrollment & Billing Reconciliation Ledger
CREATE TABLE IF NOT EXISTS `billing_package_enrollments` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `enrollment_number` VARCHAR(50) NOT NULL UNIQUE,
    `package_id` INT UNSIGNED NOT NULL,
    `patient_id` INT NOT NULL,
    `admission_id` INT UNSIGNED DEFAULT NULL,
    `folio_id` INT UNSIGNED DEFAULT NULL,

    `enrolled_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `base_package_price` DECIMAL(12,2) NOT NULL,

    -- Room Stay Tracking & Overage
    `actual_bed_days` INT NOT NULL DEFAULT 1,
    `included_bed_days` INT NOT NULL DEFAULT 0,
    `overage_bed_days` INT NOT NULL DEFAULT 0,
    `overage_bed_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    -- Operating Room Time Tracking & Overage
    `actual_or_minutes` INT NOT NULL DEFAULT 0,
    `included_or_minutes` INT NOT NULL DEFAULT 0,
    `overage_or_minutes` INT NOT NULL DEFAULT 0,
    `overage_or_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    -- Pharmacy Medications Tracking & Overage
    `actual_meds_charges` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `included_meds_allowance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `overage_meds_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    -- Clinical Laboratory Tracking & Overage
    `actual_labs_charges` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `included_labs_allowance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `overage_labs_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    -- Additional Uncovered Hospital Add-ons
    `other_addons_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    -- Consolidated Billing Totals
    `total_overage_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `final_total_package_bill` DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    -- Status & Workflow
    `status` ENUM('active', 'completed', 'cancelled', 'converted_to_regular') NOT NULL DEFAULT 'active',
    `settlement_status` ENUM('unbilled', 'billed_to_folio', 'settled') NOT NULL DEFAULT 'unbilled',

    `notes` TEXT DEFAULT NULL,
    `enrolled_by` INT DEFAULT NULL,
    `enrolled_by_name` VARCHAR(150) NOT NULL DEFAULT 'Admissions / Billing Officer',

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY `idx_bpe_patient` (`patient_id`),
    KEY `idx_bpe_package` (`package_id`),
    KEY `idx_bpe_admission` (`admission_id`),
    KEY `idx_bpe_folio` (`folio_id`),
    KEY `idx_bpe_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Itemized Overage Charges Breakdown Table
CREATE TABLE IF NOT EXISTS `billing_package_overage_items` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `enrollment_id` INT UNSIGNED NOT NULL,
    `overage_type` ENUM(
        'bed_days',
        'operating_room_time',
        'medications',
        'laboratory',
        'specialist_consult',
        'other_procedure'
    ) NOT NULL,
    `item_description` VARCHAR(255) NOT NULL,
    `included_limit` VARCHAR(100) DEFAULT NULL,
    `actual_usage` VARCHAR(100) DEFAULT NULL,
    `excess_units` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `unit_rate` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_overage_charge` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `notes` TEXT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY `idx_bpoi_enrollment` (`enrollment_id`),
    KEY `idx_bpoi_type` (`overage_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Initialize package enrollment counter
INSERT IGNORE INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`) VALUES
('PACKAGE_ENROLLMENT', YEAR(CURRENT_DATE()), 0);

-- 5. Update existing packages with realistic overage threshold parameters
UPDATE `billing_service_packages`
SET
    overage_room_daily_rate = 1200.00,
    included_or_minutes = 90,
    overage_or_hourly_rate = 1500.00,
    included_meds_allowance = 400.00,
    included_lab_allowance = 250.00,
    overage_nursing_daily_rate = 650.00
WHERE `package_code` = 'PKG-MAT-001';

UPDATE `billing_service_packages`
SET
    overage_room_daily_rate = 1800.00,
    included_or_minutes = 120,
    overage_or_hourly_rate = 2200.00,
    included_meds_allowance = 800.00,
    included_lab_allowance = 450.00,
    overage_nursing_daily_rate = 750.00
WHERE `package_code` = 'PKG-SUR-001';

-- Insert standard C-Section Delivery Package if not present
INSERT IGNORE INTO `billing_service_packages` (
    `package_code`, `package_name`, `package_type`, `department_id`,
    `standard_package_price`, `discounted_price`, `included_bed_days`,
    `included_room_type`, `overage_room_daily_rate`, `included_or_minutes`,
    `overage_or_hourly_rate`, `included_meds_allowance`, `included_lab_allowance`,
    `overage_nursing_daily_rate`, `description`, `inclusions_summary`,
    `exclusions_summary`, `is_active`
) VALUES (
    'PKG-MAT-002', 'Cesarean Section (C-Section) Surgical Delivery Package',
    'maternity_delivery', 10, 48000.00, 42000.00, 3, 'Semi-Private Room',
    1500.00, 120, 2000.00, 1000.00, 500.00, 700.00,
    '3-day surgical cesarean section delivery bundle inclusive of OR room, spinal anesthesia, obstetrician & pediatrician attending fees, and routine nursery care.',
    '3 days semi-private room, major OR suite, spinal anesthesia kit, OB surgeon & assist fees, routine post-op analgesia, newborn routine screening and initial immunizations.',
    'Complicated general anesthesia conversion, NICU incubator care, phototherapy, blood transfusions, emergency hysterectomy.',
    1
);
