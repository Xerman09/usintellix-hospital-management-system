-- =====================================================================
-- Subsystem: Biomedical Engineering & Equipment Maintenance
-- File: 327_biomed_breakdown_ticketing.sql
-- Description: Breakdown Ticketing & Urgent Repair Work Orders
--              Captures nurse/clinician breakdown alerts, automatic
--              equipment lockout (Under Repair / Out of Service),
--              root-cause diagnostics, spare parts replaced, and labor costs.
-- =====================================================================

-- 1. Extend biomed_work_orders with clinical breakdown ticketing attributes
ALTER TABLE `biomed_work_orders`
    ADD COLUMN IF NOT EXISTS `ticket_number` VARCHAR(50) NULL COMMENT 'e.g. TKT-2026-0001' AFTER `work_order_number`,
    ADD COLUMN IF NOT EXISTS `reported_by_staff_name` VARCHAR(150) NULL COMMENT 'e.g. Nurse Sarah Jenkins, RN (ICU Charge Nurse)' AFTER `ticket_number`,
    ADD COLUMN IF NOT EXISTS `reported_by_role` VARCHAR(100) NULL COMMENT 'e.g. ICU Charge Nurse / OR Circulating Nurse' AFTER `reported_by_staff_name`,
    ADD COLUMN IF NOT EXISTS `reporting_ward_or_dept` VARCHAR(150) NULL COMMENT 'e.g. Intensive Care Unit - Bed ICU-04' AFTER `reported_by_role`,
    ADD COLUMN IF NOT EXISTS `reported_at` DATETIME NULL COMMENT 'Time failure occurred or alarm sounded' AFTER `reporting_ward_or_dept`,
    ADD COLUMN IF NOT EXISTS `breakdown_symptom` VARCHAR(255) NULL COMMENT 'e.g. Continuous High-Pressure Occlusion Alarm / Vaporizer cassette failure' AFTER `reported_at`,
    ADD COLUMN IF NOT EXISTS `clinical_impact` VARCHAR(255) NULL COMMENT 'e.g. Patient transferred to standby backup ventilator immediately' AFTER `breakdown_symptom`,
    ADD COLUMN IF NOT EXISTS `root_cause_diagnostics` TEXT NULL COMMENT 'Root-cause diagnostic analysis by CBET engineer' AFTER `findings`,
    ADD COLUMN IF NOT EXISTS `downtime_hours` DECIMAL(6,2) NULL COMMENT 'Total duration machine was unavailable for clinical use' AFTER `labor_hours`,
    ADD INDEX IF NOT EXISTS `idx_bwo_ticket` (`ticket_number`);

-- 2. Initialize sequence counter for Breakdown Tickets
INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
VALUES ('BIOMED_TKT', YEAR(CURRENT_DATE), 0)
ON DUPLICATE KEY UPDATE `counter_type` = `counter_type`;
