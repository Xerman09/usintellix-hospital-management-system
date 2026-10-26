-- ============================================================================
-- Migration: 324_analytics_clinical_quality_kpis.sql
-- Subsystem: Clinical and Quality Dashboards
-- Purpose: Automated Bed Census & Hospital Utilization Analytics Engine
--          (BOR %, ALOS, BTI in days, 30-day readmissions, mortality, and HAIs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `analytics_clinical_quality_daily` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `census_date` DATE NOT NULL COMMENT 'Date of daily census snapshot',
    `ward_id` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '0 = Hospital-Wide Overall, or specific hospital_wards.id',
    `ward_name` VARCHAR(100) NOT NULL DEFAULT 'All Wards / Entire Hospital',
    `total_available_beds` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Operational beds set up and staffed for acute inpatient care',
    `occupied_beds` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Inpatients occupying a bed at midnight census',
    `vacant_beds` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Available beds unoccupied at midnight census',
    `maintenance_blocked_beds` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Beds locked out for repairs or terminal cleaning',
    `admissions_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'New inpatient admissions during this 24-hour cycle',
    `discharges_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Live inpatient discharges during this 24-hour cycle',
    `inpatient_deaths_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Inpatient deaths occurring during this 24-hour cycle',
    `transfers_in_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Intra-hospital transfers into this ward',
    `transfers_out_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Intra-hospital transfers out of this ward',
    `total_discharge_days` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Sum of total length of stay (days) for all patients discharged on census_date',
    `bor_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Bed Occupancy Rate %: (Occupied Beds / Available Beds) * 100',
    `alos_days` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Average Length of Stay (days): Total Discharge Days / Discharges',
    `bti_days` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Bed Turnover Interval (days): Vacant Bed Days / Total Discharges',
    `turnover_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Bed Turnover Rate: Discharges / Available Beds',
    `readmissions_30d_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Unplanned 30-day readmissions recorded on this date',
    `readmission_rate_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT '30-Day Readmission Rate %: Readmissions / Discharges * 100',
    `mortality_rate_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Inpatient Mortality Rate %: Deaths / (Discharges + Deaths) * 100',
    `hai_ssi_cases_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Healthcare-associated & surgical site infections detected on this date',
    `hai_rate_per_1000` DECIMAL(6,2) NOT NULL DEFAULT 0.00 COMMENT 'HAI infection rate per 1,000 occupied bed-days',
    `aggregation_source` ENUM('nightly_cron', 'manual_recalc', 'realtime_snapshot') NOT NULL DEFAULT 'nightly_cron',
    `calculated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY `uq_census_date_ward` (`census_date`, `ward_id`),
    INDEX `idx_census_date` (`census_date`),
    INDEX `idx_ward_id` (`ward_id`),
    INDEX `idx_bor` (`bor_percentage`),
    INDEX `idx_alos` (`alos_days`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
