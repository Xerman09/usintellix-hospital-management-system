-- Migration 325: Executive Financial and Business Intelligence (BI) Analytics
-- Revenue Per Available Bed (RevPAB), Department Margins & Bed Productivity
-- RevPAB = Total Inpatient Revenue / Total Available Bed Days
-- Broken down by ward class (ICU vs Private Suite vs General Ward) to identify underutilized facilities and loss-making units.

CREATE TABLE IF NOT EXISTS `analytics_financial_monthly_summaries` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `summary_month` VARCHAR(7) NOT NULL COMMENT 'YYYY-MM format, e.g. 2026-10',
    `fiscal_year` SMALLINT UNSIGNED NOT NULL,
    `fiscal_month` TINYINT UNSIGNED NOT NULL,
    `period_start` DATE NOT NULL,
    `period_end` DATE NOT NULL,
    `ward_id` INT NOT NULL DEFAULT 0 COMMENT '0 for Hospital-Wide aggregate',
    `ward_code` VARCHAR(30) NOT NULL DEFAULT 'ALL',
    `ward_name` VARCHAR(100) NOT NULL,
    `ward_class` ENUM(
        'ICU / Critical Care',
        'Private Suite / Executive',
        'Semi-Private / Surgical',
        'General Medical Ward',
        'Pediatric Care',
        'Maternity / OB-GYN',
        'Isolation Unit'
    ) NOT NULL DEFAULT 'General Medical Ward',
    
    -- Bed Capacity & Utilization
    `total_beds` INT UNSIGNED NOT NULL DEFAULT 0,
    `available_bed_days` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Total Available Bed Days = total_beds * days_in_month',
    `occupied_bed_days` INT UNSIGNED NOT NULL DEFAULT 0,
    `bed_occupancy_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `total_admissions` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_discharges` INT UNSIGNED NOT NULL DEFAULT 0,
    `avg_length_of_stay` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,

    -- Inpatient Revenue Streams
    `revenue_accommodation` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `revenue_operating_theater` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `revenue_pharmacy` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `revenue_laboratory` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `revenue_radiology` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `revenue_doctor_fees` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `revenue_supplies_misc` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `total_inpatient_revenue` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    
    -- Cash vs Insurance Accrual Split
    `insurance_accrued_revenue` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'Insurance Claims / Accounts Receivable',
    `cash_collected_revenue` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'Direct Cash / Credit Card Collections',
    `discounts_allowances` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `net_inpatient_revenue` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,

    -- Bed Productivity Key Metrics
    `revpab` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Revenue Per Available Bed = Total Inpatient Revenue / Available Bed Days',
    `revpob` DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Revenue Per Occupied Bed = Total Inpatient Revenue / Occupied Bed Days',

    -- Department Cost & Margin Analytics
    `cost_direct_staffing` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'Nursing, technician & resident payroll allocation',
    `cost_supplies_consumables` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'Medical-surgical, linens & pharmacy COGS',
    `cost_overhead_allocated` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'Utilities, biomedical maintenance, housekeeping',
    `total_operating_cost` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `department_margin_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'Net Inpatient Revenue - Total Operating Cost',
    `department_margin_pct` DECIMAL(6, 2) NOT NULL DEFAULT 0.00 COMMENT '(Margin / Net Revenue) * 100',
    `is_loss_making` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 if department operating at a deficit',
    `productivity_tier` ENUM('High Yield', 'Standard Yield', 'Sub-optimal', 'Critical Deficit') NOT NULL DEFAULT 'Standard Yield',

    `calculated_source` VARCHAR(50) NOT NULL DEFAULT 'bi_aggregation',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY `uk_month_ward` (`summary_month`, `ward_id`),
    INDEX `idx_month` (`summary_month`),
    INDEX `idx_ward_class` (`ward_class`),
    INDEX `idx_revpab` (`revpab`),
    INDEX `idx_loss_making` (`is_loss_making`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- Seed Historical 6-Month BI Monthly Summaries (May 2026 to October 2026)
-- Demonstrating ICU vs Private Suite vs General Medical vs Loss-making units
-- =========================================================================

-- OCTOBER 2026 (Current Month - 31 Days)
INSERT INTO `analytics_financial_monthly_summaries`
(`summary_month`, `fiscal_year`, `fiscal_month`, `period_start`, `period_end`, `ward_id`, `ward_code`, `ward_name`, `ward_class`, `total_beds`, `available_bed_days`, `occupied_bed_days`, `bed_occupancy_rate`, `total_admissions`, `total_discharges`, `avg_length_of_stay`, `revenue_accommodation`, `revenue_operating_theater`, `revenue_pharmacy`, `revenue_laboratory`, `revenue_radiology`, `revenue_doctor_fees`, `revenue_supplies_misc`, `total_inpatient_revenue`, `insurance_accrued_revenue`, `cash_collected_revenue`, `discounts_allowances`, `net_inpatient_revenue`, `revpab`, `revpob`, `cost_direct_staffing`, `cost_supplies_consumables`, `cost_overhead_allocated`, `total_operating_cost`, `department_margin_amount`, `department_margin_pct`, `is_loss_making`, `productivity_tier`)
VALUES
-- 1. Hospital-Wide Aggregate
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 0, 'ALL', 'All Wards / Entire Hospital', 'General Medical Ward', 57, 1767, 1414, 80.02, 385, 372, 3.80, 5240000.00, 3850000.00, 4210000.00, 2180000.00, 1650000.00, 2980000.00, 1120000.00, 21230000.00, 14861000.00, 6369000.00, 650000.00, 20580000.00, 12014.71, 15014.14, 6800000.00, 4100000.00, 3200000.00, 14100000.00, 6480000.00, 31.49, 0, 'High Yield'),

-- 2. Intensive Care Unit (ICU) - High Acuity, High RevPAB
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 1, 'ICU', 'Intensive Care Unit (ICU)', 'ICU / Critical Care', 24, 744, 632, 84.95, 78, 74, 8.54, 2528000.00, 1420000.00, 1680000.00, 950000.00, 680000.00, 1150000.00, 540000.00, 8948000.00, 6711000.00, 2237000.00, 180000.00, 8768000.00, 12026.88, 14158.23, 2950000.00, 1650000.00, 1200000.00, 5800000.00, 2968000.00, 33.85, 0, 'High Yield'),

-- 3. Private Suite / Executive Wing - Premium Rates, High Margin
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 6, 'PRIV-STE', 'Executive Private Suites', 'Private Suite / Executive', 6, 186, 162, 87.10, 42, 40, 3.86, 1134000.00, 680000.00, 460000.00, 290000.00, 220000.00, 540000.00, 160000.00, 3484000.00, 2090400.00, 1393600.00, 75000.00, 3409000.00, 18731.18, 21506.17, 720000.00, 410000.00, 390000.00, 1520000.00, 1889000.00, 55.41, 0, 'High Yield'),

-- 4. Surgical Inpatient Ward - Strong OR Procedure Inflow
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 2, 'SURG-W', 'Surgical Inpatient Ward', 'Semi-Private / Surgical', 8, 248, 208, 83.87, 85, 82, 2.45, 624000.00, 1250000.00, 780000.00, 380000.00, 310000.00, 480000.00, 220000.00, 4044000.00, 3033000.00, 1011000.00, 120000.00, 3924000.00, 16306.45, 19442.31, 1050000.00, 890000.00, 620000.00, 2560000.00, 1364000.00, 34.76, 0, 'High Yield'),

-- 5. General Medical Inpatient Ward - Standard Volume
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 3, 'MED-W', 'General Medical Ward', 'General Medical Ward', 8, 248, 194, 78.23, 76, 73, 2.55, 388000.00, 80000.00, 520000.00, 280000.00, 220000.00, 320000.00, 95000.00, 1903000.00, 1332100.00, 570900.00, 110000.00, 1793000.00, 7673.39, 9809.28, 820000.00, 360000.00, 410000.00, 1590000.00, 203000.00, 11.32, 0, 'Standard Yield'),

-- 6. Maternity / OB-GYN Unit - Bundled Deliveries & C-Sections
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 7, 'MAT-W', 'Maternal & Newborn Care Unit', 'Maternity / OB-GYN', 4, 124, 98, 79.03, 44, 43, 2.23, 294000.00, 380000.00, 340000.00, 140000.00, 110000.00, 320000.00, 65000.00, 1649000.00, 1154300.00, 494700.00, 95000.00, 1554000.00, 13298.39, 16826.53, 520000.00, 280000.00, 260000.00, 1060000.00, 494000.00, 31.79, 0, 'High Yield'),

-- 7. Pediatric Care Unit - Moderate utilization
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 4, 'PED-W', 'Pediatric Care Unit', 'Pediatric Care', 4, 124, 82, 66.13, 38, 38, 2.16, 180400.00, 40000.00, 260000.00, 85000.00, 70000.00, 120000.00, 25000.00, 780400.00, 546280.00, 234120.00, 45000.00, 735400.00, 6293.55, 9517.07, 430000.00, 150000.00, 160000.00, 740000.00, -4600.00, -0.63, 1, 'Sub-optimal'),

-- 8. Isolation Negative Pressure Unit - Low Occupancy / Deficit Facility (LOSS-MAKING UNIT)
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 5, 'ISOL', 'Isolation Negative Pressure Unit', 'Isolation Unit', 3, 93, 38, 40.86, 16, 16, 2.38, 87600.00, 0.00, 170000.00, 55000.00, 40000.00, 50000.00, 15000.00, 417600.00, 292320.00, 125280.00, 25000.00, 392600.00, 4490.32, 10989.47, 310000.00, 160000.00, 160000.00, 630000.00, -237400.00, -60.47, 1, 'Critical Deficit');

-- SEPTEMBER 2026 (30 Days)
INSERT INTO `analytics_financial_monthly_summaries`
(`summary_month`, `fiscal_year`, `fiscal_month`, `period_start`, `period_end`, `ward_id`, `ward_code`, `ward_name`, `ward_class`, `total_beds`, `available_bed_days`, `occupied_bed_days`, `bed_occupancy_rate`, `total_admissions`, `total_discharges`, `avg_length_of_stay`, `revenue_accommodation`, `revenue_operating_theater`, `revenue_pharmacy`, `revenue_laboratory`, `revenue_radiology`, `revenue_doctor_fees`, `revenue_supplies_misc`, `total_inpatient_revenue`, `insurance_accrued_revenue`, `cash_collected_revenue`, `discounts_allowances`, `net_inpatient_revenue`, `revpab`, `revpob`, `cost_direct_staffing`, `cost_supplies_consumables`, `cost_overhead_allocated`, `total_operating_cost`, `department_margin_amount`, `department_margin_pct`, `is_loss_making`, `productivity_tier`)
VALUES
('2026-09', 2026, 9, '2026-09-01', '2026-09-30', 0, 'ALL', 'All Wards / Entire Hospital', 'General Medical Ward', 57, 1710, 1342, 78.48, 362, 355, 3.71, 4980000.00, 3620000.00, 3980000.00, 2050000.00, 1540000.00, 2850000.00, 1060000.00, 20080000.00, 14056000.00, 6024000.00, 620000.00, 19460000.00, 11742.69, 14962.74, 6600000.00, 3950000.00, 3100000.00, 13650000.00, 5810000.00, 29.86, 0, 'High Yield'),
('2026-09', 2026, 9, '2026-09-01', '2026-09-30', 1, 'ICU', 'Intensive Care Unit (ICU)', 'ICU / Critical Care', 24, 720, 602, 83.61, 74, 71, 8.48, 2408000.00, 1350000.00, 1590000.00, 910000.00, 640000.00, 1100000.00, 510000.00, 8508000.00, 6381000.00, 2127000.00, 170000.00, 8338000.00, 11816.67, 14132.89, 2900000.00, 1600000.00, 1180000.00, 5680000.00, 2658000.00, 31.88, 0, 'High Yield'),
('2026-09', 2026, 9, '2026-09-01', '2026-09-30', 6, 'PRIV-STE', 'Executive Private Suites', 'Private Suite / Executive', 6, 180, 154, 85.56, 39, 38, 3.95, 1078000.00, 640000.00, 440000.00, 275000.00, 210000.00, 510000.00, 150000.00, 3303000.00, 1981800.00, 1321200.00, 70000.00, 3233000.00, 18350.00, 21448.05, 710000.00, 400000.00, 380000.00, 1490000.00, 1743000.00, 53.91, 0, 'High Yield'),
('2026-09', 2026, 9, '2026-09-01', '2026-09-30', 5, 'ISOL', 'Isolation Negative Pressure Unit', 'Isolation Unit', 3, 90, 32, 35.56, 13, 13, 2.46, 73600.00, 0.00, 145000.00, 48000.00, 35000.00, 42000.00, 12000.00, 355600.00, 248920.00, 106680.00, 20000.00, 335600.00, 3951.11, 11112.50, 305000.00, 155000.00, 155000.00, 615000.00, -279400.00, -83.25, 1, 'Critical Deficit');

-- AUGUST 2026 (31 Days)
INSERT INTO `analytics_financial_monthly_summaries`
(`summary_month`, `fiscal_year`, `fiscal_month`, `period_start`, `period_end`, `ward_id`, `ward_code`, `ward_name`, `ward_class`, `total_beds`, `available_bed_days`, `occupied_bed_days`, `bed_occupancy_rate`, `total_admissions`, `total_discharges`, `avg_length_of_stay`, `revenue_accommodation`, `revenue_operating_theater`, `revenue_pharmacy`, `revenue_laboratory`, `revenue_radiology`, `revenue_doctor_fees`, `revenue_supplies_misc`, `total_inpatient_revenue`, `insurance_accrued_revenue`, `cash_collected_revenue`, `discounts_allowances`, `net_inpatient_revenue`, `revpab`, `revpob`, `cost_direct_staffing`, `cost_supplies_consumables`, `cost_overhead_allocated`, `total_operating_cost`, `department_margin_amount`, `department_margin_pct`, `is_loss_making`, `productivity_tier`)
VALUES
('2026-08', 2026, 8, '2026-08-01', '2026-08-31', 0, 'ALL', 'All Wards / Entire Hospital', 'General Medical Ward', 57, 1767, 1380, 78.10, 370, 365, 3.73, 5120000.00, 3750000.00, 4100000.00, 2120000.00, 1600000.00, 2920000.00, 1090000.00, 20700000.00, 14490000.00, 6210000.00, 640000.00, 20060000.00, 11714.77, 15000.00, 6700000.00, 4050000.00, 3150000.00, 13900000.00, 6160000.00, 30.71, 0, 'High Yield'),
('2026-08', 2026, 8, '2026-08-01', '2026-08-31', 1, 'ICU', 'Intensive Care Unit (ICU)', 'ICU / Critical Care', 24, 744, 618, 83.06, 76, 73, 8.47, 2472000.00, 1390000.00, 1640000.00, 930000.00, 660000.00, 1120000.00, 525000.00, 8737000.00, 6552750.00, 2184250.00, 175000.00, 8562000.00, 11743.28, 14137.54, 2920000.00, 1620000.00, 1190000.00, 5730000.00, 2832000.00, 33.08, 0, 'High Yield'),
('2026-08', 2026, 8, '2026-08-01', '2026-08-31', 5, 'ISOL', 'Isolation Negative Pressure Unit', 'Isolation Unit', 3, 93, 35, 37.63, 14, 14, 2.50, 80500.00, 0.00, 158000.00, 51000.00, 38000.00, 46000.00, 14000.00, 387500.00, 271250.00, 116250.00, 22000.00, 365500.00, 4166.67, 11071.43, 308000.00, 158000.00, 158000.00, 624000.00, -258500.00, -70.73, 1, 'Critical Deficit');
