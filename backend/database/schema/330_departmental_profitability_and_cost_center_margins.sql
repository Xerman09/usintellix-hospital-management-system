-- Migration 330: Departmental Profitability & Cost Center Margins
-- Aggregates department gross collections minus direct operational costs:
--   1. Staff Salaries (Payroll, nursing wages, shift differentials, doctor commissions)
--   2. Medications (Dispensed & administered inpatient/outpatient pharmaceuticals)
--   3. Consumed Surgical & Medical Supplies (OR consumables, implants, PPE, non-pharma supplies)
-- Computes Department Contribution Margin ($) and Department Contribution Margin (%).

CREATE TABLE IF NOT EXISTS `analytics_department_cost_center_margins` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `summary_month` VARCHAR(7) NOT NULL COMMENT 'YYYY-MM format, e.g. 2026-10',
    `fiscal_year` SMALLINT UNSIGNED NOT NULL,
    `fiscal_month` TINYINT UNSIGNED NOT NULL,
    `period_start` DATE NOT NULL,
    `period_end` DATE NOT NULL,

    -- Department & Cost Center Identification
    `department_id` INT UNSIGNED NOT NULL,
    `department_code` VARCHAR(30) NOT NULL,
    `department_name` VARCHAR(150) NOT NULL,
    `cost_center_code` VARCHAR(40) NOT NULL COMMENT 'e.g. CC-100-EMERG, CC-200-SURG',
    `cost_center_type` ENUM(
        'Clinical Specialty',
        'Surgical & Perioperative',
        'Critical Care / Inpatient',
        'Diagnostic & Ancillary',
        'Emergency Services',
        'Administrative / Overhead'
    ) NOT NULL DEFAULT 'Clinical Specialty',
    `patient_volume` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Encounters, cases, or tests performed',

    -- Revenue & Gross Collections
    `gross_billed_charges` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `contractual_adjustments` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'HMO write-offs, senior/PWD discounts',
    `gross_collections` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'Gross collections (Cash + Verified Insurance)',
    `cash_collections` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `insurance_collections` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,

    -- Direct Operational Costs (The 3 Core Pillars + Equipment Maintenance)
    `cost_staff_salaries` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'Salaries, overtime, benefits & physician commissions',
    `cost_medications` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'Consumed drugs, IV fluids, contrast & anesthesia',
    `cost_surgical_supplies` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'Consumed surgical kits, sutures, implants, PPE & dressings',
    `cost_equipment_maintenance` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'Biomed PM, calibration & breakdown repairs',
    `total_direct_operational_costs` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'Sum of salaries + medications + surgical supplies + biomed',

    -- Contribution Margin Computation
    -- Contribution Margin ($) = Gross Collections - Total Direct Operational Costs
    -- Contribution Margin (%) = (Contribution Margin / Gross Collections) * 100
    `contribution_margin_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `contribution_margin_pct` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,

    -- Indirect Overhead & Net Operating Income
    `allocated_indirect_overhead` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'Allocated utilities, admin, IT, housekeeping',
    `net_operating_income` DECIMAL(14, 2) NOT NULL DEFAULT 0.00 COMMENT 'Contribution Margin - Allocated Indirect Overhead',
    `net_operating_margin_pct` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,

    `profitability_status` ENUM(
        'High Margin Leader',
        'Profitable',
        'Break-Even / Thin',
        'Loss-Making / Deficit',
        'Overhead Cost Center'
    ) NOT NULL DEFAULT 'Profitable',
    `budget_target_margin_pct` DECIMAL(5, 2) NOT NULL DEFAULT 25.00,
    `variance_from_target_pct` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,

    `calculated_source` VARCHAR(50) NOT NULL DEFAULT 'cost_center_engine',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY `uk_month_dept` (`summary_month`, `department_id`),
    INDEX `idx_summary_month` (`summary_month`),
    INDEX `idx_cost_center` (`cost_center_code`),
    INDEX `idx_contrib_margin_pct` (`contribution_margin_pct`),
    INDEX `idx_profitability_status` (`profitability_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- Seed Departmental Profitability & Cost Center Margins (Oct, Sep, Aug 2026)
-- Across all 12 Hospital Departments
-- =========================================================================

-- OCTOBER 2026
INSERT IGNORE INTO `analytics_department_cost_center_margins`
(`summary_month`, `fiscal_year`, `fiscal_month`, `period_start`, `period_end`, `department_id`, `department_code`, `department_name`, `cost_center_code`, `cost_center_type`, `patient_volume`, `gross_billed_charges`, `contractual_adjustments`, `gross_collections`, `cash_collections`, `insurance_collections`, `cost_staff_salaries`, `cost_medications`, `cost_surgical_supplies`, `cost_equipment_maintenance`, `total_direct_operational_costs`, `contribution_margin_amount`, `contribution_margin_pct`, `allocated_indirect_overhead`, `net_operating_income`, `net_operating_margin_pct`, `profitability_status`, `budget_target_margin_pct`, `variance_from_target_pct`)
VALUES
-- 1. General Surgery (High Revenue, Heavy Surgical Supply & Staff Cost, Strong Contribution Margin)
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 6, 'SURG', 'General Surgery', 'CC-201-SURG', 'Surgical & Perioperative', 142, 6450000.00, 450000.00, 6000000.00, 1500000.00, 4500000.00, 1650000.00, 580000.00, 1290000.00, 80000.00, 3600000.00, 2400000.00, 40.00, 550000.00, 1850000.00, 30.83, 'High Margin Leader', 35.00, 5.00),

-- 2. Cardiology (High Margin Leader - Cath Lab, Echo, Cardiac ICU consults)
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 4, 'CARD', 'Cardiology', 'CC-104-CARD', 'Clinical Specialty', 310, 4800000.00, 300000.00, 4500000.00, 1350000.00, 3150000.00, 1220000.00, 490000.00, 640000.00, 95000.00, 2445000.00, 2055000.00, 45.67, 420000.00, 1635000.00, 36.33, 'High Margin Leader', 38.00, 7.67),

-- 3. Intensive Care Unit (ICU) (High Volume & Revenue, High Nursing Salaries & Critical Care Meds)
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 7, 'ICU', 'Intensive Care Unit (ICU)', 'CC-301-ICU', 'Critical Care / Inpatient', 78, 5600000.00, 350000.00, 5250000.00, 1155000.00, 4095000.00, 1980000.00, 960000.00, 540000.00, 120000.00, 3600000.00, 1650000.00, 31.43, 620000.00, 1030000.00, 19.62, 'Profitable', 28.00, 3.43),

-- 4. Radiology & Diagnostic Imaging (CT, MRI, X-Ray, Ultrasound - High Contribution Margin)
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 8, 'RAD', 'Radiology & Diagnostic Imaging', 'CC-401-RAD', 'Diagnostic & Ancillary', 1420, 3650000.00, 250000.00, 3400000.00, 1190000.00, 2210000.00, 890000.00, 240000.00, 380000.00, 190000.00, 1700000.00, 1700000.00, 50.00, 380000.00, 1320000.00, 38.82, 'High Margin Leader', 42.00, 8.00),

-- 5. Clinical Laboratory & Pathology (High Test Volume, Low Med Cost, Reagent/Supply Cost)
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 9, 'LAB', 'Clinical Laboratory & Pathology', 'CC-402-LAB', 'Diagnostic & Ancillary', 3850, 3100000.00, 200000.00, 2900000.00, 1015000.00, 1885000.00, 760000.00, 45000.00, 680000.00, 65000.00, 1550000.00, 1350000.00, 46.55, 310000.00, 1040000.00, 35.86, 'High Margin Leader', 40.00, 6.55),

-- 6. Orthopedics & Sports Medicine (Joint Replacements, Implants & Fixation Supplies)
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 11, 'ORTHO', 'Orthopedics & Sports Medicine', 'CC-202-ORTHO', 'Surgical & Perioperative', 96, 3500000.00, 220000.00, 3280000.00, 820000.00, 2460000.00, 880000.00, 210000.00, 1090000.00, 50000.00, 2230000.00, 1050000.00, 32.01, 290000.00, 760000.00, 23.17, 'Profitable', 30.00, 2.01),

-- 7. Obstetrics & Gynecology (OB/GYN) (Maternity Packages, C-Section OR Supplies)
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 10, 'OBGYN', 'Obstetrics & Gynecology (OB/GYN)', 'CC-105-OBGYN', 'Clinical Specialty', 215, 2850000.00, 180000.00, 2670000.00, 934500.00, 1735500.00, 840000.00, 310000.00, 520000.00, 40000.00, 1710000.00, 960000.00, 35.96, 260000.00, 700000.00, 26.22, 'Profitable', 30.00, 5.96),

-- 8. Pharmacy Services (High Drug COGS, Moderate Contribution Margin)
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 12, 'PHARM', 'Pharmacy Services', 'CC-501-PHARM', 'Diagnostic & Ancillary', 4920, 4400000.00, 280000.00, 4120000.00, 1648000.00, 2472000.00, 590000.00, 2480000.00, 85000.00, 15000.00, 3170000.00, 950000.00, 23.06, 240000.00, 710000.00, 17.23, 'Profitable', 22.00, 1.06),

-- 9. Internal Medicine (Inpatient & OPD Consults, Moderate Margin)
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 3, 'INTMED', 'Internal Medicine', 'CC-101-INTMED', 'Clinical Specialty', 540, 2450000.00, 190000.00, 2260000.00, 791000.00, 1469000.00, 980000.00, 460000.00, 190000.00, 30000.00, 1660000.00, 600000.00, 26.55, 280000.00, 320000.00, 14.16, 'Profitable', 25.00, 1.55),

-- 10. Pediatrics (Thin Contribution Margin, High Nursing-to-Patient Ratio)
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 5, 'PEDI', 'Pediatrics', 'CC-103-PEDI', 'Clinical Specialty', 280, 1320000.00, 110000.00, 1210000.00, 484000.00, 726000.00, 690000.00, 240000.00, 145000.00, 25000.00, 1100000.00, 110000.00, 9.09, 160000.00, -50000.00, -4.13, 'Break-Even / Thin', 20.00, -10.91),

-- 11. Emergency Medicine (24/7 Mandatory Standby Staffing, Uncompensated Trauma Care -> Deficit Cost Center)
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 2, 'EMERG', 'Emergency Medicine', 'CC-100-EMERG', 'Emergency Services', 890, 2150000.00, 380000.00, 1770000.00, 708000.00, 1062000.00, 1280000.00, 420000.00, 390000.00, 60000.00, 2150000.00, -380000.00, -21.47, 310000.00, -690000.00, -38.98, 'Loss-Making / Deficit', 10.00, -31.47),

-- 12. Administration & Executive Support (Pure Overhead Cost Center)
('2026-10', 2026, 10, '2026-10-01', '2026-10-31', 1, 'ADMIN', 'Administration', 'CC-900-ADMIN', 'Administrative / Overhead', 0, 0.00, 0.00, 0.00, 0.00, 0.00, 1120000.00, 0.00, 45000.00, 25000.00, 1190000.00, -1190000.00, 0.00, 0.00, -1190000.00, 0.00, 'Overhead Cost Center', 0.00, 0.00);

-- SEPTEMBER 2026 (Historical Comparison)
INSERT IGNORE INTO `analytics_department_cost_center_margins`
(`summary_month`, `fiscal_year`, `fiscal_month`, `period_start`, `period_end`, `department_id`, `department_code`, `department_name`, `cost_center_code`, `cost_center_type`, `patient_volume`, `gross_billed_charges`, `contractual_adjustments`, `gross_collections`, `cash_collections`, `insurance_collections`, `cost_staff_salaries`, `cost_medications`, `cost_surgical_supplies`, `cost_equipment_maintenance`, `total_direct_operational_costs`, `contribution_margin_amount`, `contribution_margin_pct`, `allocated_indirect_overhead`, `net_operating_income`, `net_operating_margin_pct`, `profitability_status`, `budget_target_margin_pct`, `variance_from_target_pct`)
VALUES
('2026-09', 2026, 9, '2026-09-01', '2026-09-30', 6, 'SURG', 'General Surgery', 'CC-201-SURG', 'Surgical & Perioperative', 134, 6100000.00, 420000.00, 5680000.00, 1420000.00, 4260000.00, 1610000.00, 550000.00, 1240000.00, 75000.00, 3475000.00, 2205000.00, 38.82, 540000.00, 1665000.00, 29.31, 'High Margin Leader', 35.00, 3.82),
('2026-09', 2026, 9, '2026-09-01', '2026-09-30', 4, 'CARD', 'Cardiology', 'CC-104-CARD', 'Clinical Specialty', 295, 4550000.00, 280000.00, 4270000.00, 1281000.00, 2989000.00, 1190000.00, 470000.00, 610000.00, 90000.00, 2360000.00, 1910000.00, 44.73, 410000.00, 1500000.00, 35.13, 'High Margin Leader', 38.00, 6.73),
('2026-09', 2026, 9, '2026-09-01', '2026-09-30', 7, 'ICU', 'Intensive Care Unit (ICU)', 'CC-301-ICU', 'Critical Care / Inpatient', 74, 5350000.00, 330000.00, 5020000.00, 1104400.00, 3915600.00, 1940000.00, 920000.00, 520000.00, 115000.00, 3495000.00, 1525000.00, 30.38, 610000.00, 915000.00, 18.23, 'Profitable', 28.00, 2.38),
('2026-09', 2026, 9, '2026-09-01', '2026-09-30', 8, 'RAD', 'Radiology & Diagnostic Imaging', 'CC-401-RAD', 'Diagnostic & Ancillary', 1360, 3480000.00, 240000.00, 3240000.00, 1134000.00, 2106000.00, 875000.00, 230000.00, 365000.00, 180000.00, 1650000.00, 1590000.00, 49.07, 370000.00, 1220000.00, 37.65, 'High Margin Leader', 42.00, 7.07),
('2026-09', 2026, 9, '2026-09-01', '2026-09-30', 2, 'EMERG', 'Emergency Medicine', 'CC-100-EMERG', 'Emergency Services', 860, 2040000.00, 360000.00, 1680000.00, 672000.00, 1008000.00, 1260000.00, 405000.00, 375000.00, 55000.00, 2095000.00, -415000.00, -24.70, 305000.00, -720000.00, -42.86, 'Loss-Making / Deficit', 10.00, -34.70);
