-- =====================================================================
-- Subsystem: Biomedical Engineering & Equipment Maintenance
-- File: 323_biomed_maintenance_and_work_orders.sql
-- Description: Preventive Maintenance (PM) Calendar, Automated Servicing
--              Intervals, Task Checklists, and Work Orders.
--              Covers high-risk machinery (ventilators, defibrillators,
--              anesthesia machines, dialysis units, infant incubators).
-- =====================================================================

-- 1. Preventive Maintenance (PM) Schedules & Recurring Service Intervals
CREATE TABLE IF NOT EXISTS `biomed_maintenance_schedules` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `schedule_code` VARCHAR(50) NOT NULL UNIQUE COMMENT 'e.g. PMS-2026-0001',
    `asset_id` INT NOT NULL COMMENT 'FK to hospital_equipment_assets.id',
    `title` VARCHAR(255) NOT NULL COMMENT 'e.g. Hamilton C6 Annual Overhaul & Oxygen Cell Calibration',
    `maintenance_type` ENUM(
        'preventive_maintenance',
        'electrical_safety_inspection',
        'calibration_certification',
        'software_firmware_update',
        'major_vendor_overhaul'
    ) NOT NULL DEFAULT 'preventive_maintenance',
    `frequency` ENUM(
        'monthly',
        'bi_monthly',
        'quarterly',
        'semi_annual',
        'annual',
        'biennial'
    ) NOT NULL DEFAULT 'annual',
    `interval_months` INT NOT NULL DEFAULT 12,
    `criticality_tier` ENUM(
        'life_critical',
        'high',
        'medium',
        'low'
    ) NOT NULL DEFAULT 'life_critical',
    `estimated_duration_hours` DECIMAL(4,2) NOT NULL DEFAULT 2.00,
    `last_performed_date` DATE NULL,
    `next_due_date` DATE NOT NULL,
    `grace_period_days` INT NOT NULL DEFAULT 14,
    `service_provider_type` ENUM(
        'in_house_biomed',
        'oem_authorized_service',
        'third_party_contractor'
    ) NOT NULL DEFAULT 'in_house_biomed',
    `vendor_or_contractor_name` VARCHAR(150) NULL DEFAULT 'In-House Biomedical Engineering',
    `contact_phone_or_email` VARCHAR(150) NULL,
    `assigned_engineer_staff_id` INT NULL,
    `assigned_engineer_name` VARCHAR(150) NULL DEFAULT 'Engr. David Santos, CBET (Biomedical Lead)',
    `task_checklist_json` LONGTEXT NOT NULL COMMENT 'Structured step-by-step PM inspection checklist with task items, standards/tolerances, and critical flags',
    `safety_standards_reference` VARCHAR(150) NULL DEFAULT 'IEC 62353 / NFPA 99 / AAMI',
    `status` ENUM('active', 'paused_standby', 'retired') NOT NULL DEFAULT 'active',
    `is_auto_generate_work_order` TINYINT(1) NOT NULL DEFAULT 1,
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_bms_code` (`schedule_code`),
    KEY `idx_bms_asset` (`asset_id`),
    KEY `idx_bms_due` (`next_due_date`),
    KEY `idx_bms_freq` (`frequency`),
    KEY `idx_bms_status` (`status`),
    KEY `idx_bms_tier` (`criticality_tier`),
    CONSTRAINT `fk_bms_asset` FOREIGN KEY (`asset_id`) REFERENCES `hospital_equipment_assets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Biomedical Maintenance & Breakdown Repair Work Orders
CREATE TABLE IF NOT EXISTS `biomed_work_orders` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `work_order_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'e.g. WO-2026-0001',
    `schedule_id` INT NULL COMMENT 'FK to biomed_maintenance_schedules.id if triggered from PM',
    `asset_id` INT NOT NULL COMMENT 'FK to hospital_equipment_assets.id',
    `work_order_type` ENUM(
        'preventive_maintenance',
        'breakdown_emergency_repair',
        'calibration_certification',
        'electrical_safety_check',
        'routine_inspection'
    ) NOT NULL DEFAULT 'preventive_maintenance',
    `priority` ENUM(
        'stat_life_critical',
        'urgent',
        'routine',
        'scheduled_pm'
    ) NOT NULL DEFAULT 'scheduled_pm',
    `scheduled_date` DATE NOT NULL,
    `started_at` DATETIME NULL,
    `completed_at` DATETIME NULL,
    `lead_engineer_name` VARCHAR(150) NOT NULL DEFAULT 'Engr. David Santos, CBET',
    `service_vendor_name` VARCHAR(150) NULL,
    `checklist_audit_json` LONGTEXT NULL COMMENT 'Checked tasks with pass/fail/value/notes',
    `electrical_safety_passed` TINYINT(1) NOT NULL DEFAULT 1,
    `calibration_passed` TINYINT(1) NOT NULL DEFAULT 1,
    `chassis_leakage_microamp` DECIMAL(6,2) NULL COMMENT 'Microamps (< 100 uA standard)',
    `ground_resistance_ohms` DECIMAL(5,3) NULL COMMENT 'Ohms (< 0.200 Ohm standard)',
    `parts_replaced_json` LONGTEXT NULL,
    `labor_hours` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `total_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `findings` TEXT NULL,
    `corrective_actions` TEXT NULL,
    `status` ENUM(
        'scheduled',
        'in_progress',
        'pending_parts',
        'completed_passed',
        'failed_quarantined',
        'cancelled'
    ) NOT NULL DEFAULT 'scheduled',
    `supervisor_signoff_by` VARCHAR(150) NULL,
    `supervisor_signed_at` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_bwo_no` (`work_order_number`),
    KEY `idx_bwo_schedule` (`schedule_id`),
    KEY `idx_bwo_asset` (`asset_id`),
    KEY `idx_bwo_status` (`status`),
    KEY `idx_bwo_type` (`work_order_type`),
    KEY `idx_bwo_sched_date` (`scheduled_date`),
    CONSTRAINT `fk_bwo_asset` FOREIGN KEY (`asset_id`) REFERENCES `hospital_equipment_assets` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_bwo_schedule` FOREIGN KEY (`schedule_id`) REFERENCES `biomed_maintenance_schedules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Initialize Sequence Counters in billing_tariff_counters
INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
VALUES
    ('BIOMED_PM', YEAR(CURRENT_DATE), 0),
    ('BIOMED_WO', YEAR(CURRENT_DATE), 0)
ON DUPLICATE KEY UPDATE `counter_type` = `counter_type`;
