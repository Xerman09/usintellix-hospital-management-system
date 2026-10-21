-- =====================================================================
-- Migration 297: Automated Dosage Limits & Pediatric/Renal Thresholds
-- Table: drug_dosage_limits
-- Purpose: Rules engine catalog checking max_single_dose, max_daily_dose,
--          pediatric mg/kg/dose limits, and impaired renal clearance (eGFR)
--          thresholds to prevent 10-fold overdoses (e.g., Paracetamol 40g
--          instead of 4g) and pediatric/renal prescribing errors.
-- =====================================================================

CREATE TABLE IF NOT EXISTS `drug_dosage_limits` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `drug_id` INT UNSIGNED NULL,
    `generic_keyword` VARCHAR(120) NOT NULL,
    `display_name` VARCHAR(160) NOT NULL,
    `default_unit_strength_mg` DECIMAL(10,2) NOT NULL DEFAULT 500.00,
    `max_single_dose_mg` DECIMAL(10,2) NOT NULL,
    `max_daily_dose_mg` DECIMAL(10,2) NOT NULL,
    `pediatric_mg_kg_per_dose` DECIMAL(8,2) NULL,
    `pediatric_max_mg_kg_per_dose` DECIMAL(8,2) NULL,
    `pediatric_max_mg_kg_per_day` DECIMAL(8,2) NULL,
    `renal_egfr_warning_threshold` DECIMAL(6,2) NULL DEFAULT 60.00,
    `renal_egfr_contraindicated_threshold` DECIMAL(6,2) NULL DEFAULT 30.00,
    `renal_adjustment_guidance` VARCHAR(500) NULL,
    `clinical_overdose_warning` VARCHAR(500) NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_drug_dosage_limit_keyword` (`generic_keyword`),
    INDEX `idx_drug_dosage_limit_drug_id` (`drug_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `drug_dosage_limits` (
    `generic_keyword`, `display_name`, `default_unit_strength_mg`,
    `max_single_dose_mg`, `max_daily_dose_mg`,
    `pediatric_mg_kg_per_dose`, `pediatric_max_mg_kg_per_dose`, `pediatric_max_mg_kg_per_day`,
    `renal_egfr_warning_threshold`, `renal_egfr_contraindicated_threshold`,
    `renal_adjustment_guidance`, `clinical_overdose_warning`
) VALUES
(
    'paracetamol', 'Paracetamol / Acetaminophen', 500.00,
    1000.00, 4000.00,
    15.00, 15.00, 75.00,
    30.00, 10.00,
    'Extend dosing interval to every 6–8 hours when eGFR < 30 mL/min (every 8 hours if eGFR < 10 mL/min).',
    'SEVERE HEPATOTOXICITY RISK: Adult maximum is 1,000 mg (1 g) per single dose and 4,000 mg (4 g) per 24 hours; pediatric maximum is 15 mg/kg/dose (up to 75 mg/kg/day).'
),
(
    'acetaminophen', 'Acetaminophen (Paracetamol)', 500.00,
    1000.00, 4000.00,
    15.00, 15.00, 75.00,
    30.00, 10.00,
    'Extend dosing interval to every 6–8 hours when eGFR < 30 mL/min.',
    'SEVERE HEPATOTOXICITY RISK: Adult maximum is 1,000 mg (1 g) per single dose and 4,000 mg (4 g) per 24 hours; pediatric maximum is 15 mg/kg/dose.'
),
(
    'ibuprofen', 'Ibuprofen (NSAID)', 400.00,
    800.00, 3200.00,
    10.00, 10.00, 40.00,
    60.00, 30.00,
    'AVOID in eGFR < 30 mL/min (nephrotoxic NSAID). Use lowest effective dose with caution if eGFR 30–59 mL/min.',
    'GI bleeding & acute kidney injury risk: Max adult dose is 800 mg/dose (3,200 mg/day); pediatric max is 10 mg/kg/dose (40 mg/kg/day).'
),
(
    'amoxicillin', 'Amoxicillin', 500.00,
    1000.00, 3000.00,
    25.00, 45.00, 90.00,
    30.00, 10.00,
    'eGFR 10–30 mL/min: 250–500 mg every 12 hours; eGFR < 10 mL/min: 250–500 mg every 24 hours.',
    'Neurotoxicity / crystalluria risk at excessive doses: Max adult single dose 1,000 mg (3,000 mg/day); pediatric max 45 mg/kg/dose (90 mg/kg/day).'
),
(
    'co-amoxiclav', 'Co-Amoxiclav (Amoxicillin/Clavulanate)', 625.00,
    1000.00, 3000.00,
    25.00, 45.00, 90.00,
    30.00, 10.00,
    'Avoid 875/125 mg or 1000 mg tabs if eGFR < 30 mL/min; reduce to 250/125–500/125 mg Q12H (Q24H if eGFR < 10 mL/min).',
    'Clavulanate GI intolerance & hepatotoxicity risk: Max adult single dose 1,000 mg (3,000 mg/day); pediatric max 45 mg/kg/dose.'
),
(
    'cefuroxime', 'Cefuroxime Axetil / Sodium', 500.00,
    1500.00, 4500.00,
    15.00, 20.00, 40.00,
    30.00, 10.00,
    'eGFR 10–29 mL/min: Give standard individual dose every 24 hours; eGFR < 10 mL/min: every 48 hours.',
    'Seizure threshold reduction in overdose, especially with renal impairment: Max oral adult dose 500 mg BID (IV up to 1,500 mg TID).'
),
(
    'azithromycin', 'Azithromycin', 500.00,
    1000.00, 1000.00,
    10.00, 12.00, 12.00,
    15.00, null,
    'Use caution when eGFR < 10–15 mL/min (35% increase in AUC).',
    'QTc prolongation & arrhythmia risk: Max single/daily adult dose is 500–1,000 mg; pediatric max is 10–12 mg/kg/day.'
),
(
    'ciprofloxacin', 'Ciprofloxacin', 500.00,
    750.00, 1500.00,
    10.00, 15.00, 30.00,
    50.00, 30.00,
    'eGFR 30–50 mL/min: 250–500 mg PO Q12H; eGFR < 30 mL/min: 250–500 mg PO Q18–24H.',
    'Tendon rupture, CNS neurotoxicity & QTc risk: Max oral single dose 750 mg (1,500 mg/day); pediatric max 15 mg/kg/dose.'
),
(
    'metformin', 'Metformin HCl', 500.00,
    1000.00, 2550.00,
    10.00, 15.00, 35.00,
    45.00, 30.00,
    'CONTRAINDICATED when eGFR < 30 mL/min (Lactic Acidosis risk). If eGFR 30–44 mL/min, do not initiate or reduce dose by 50% (max 1,000 mg/day).',
    'LACTIC ACIDOSIS RISK: Max adult single dose 1,000 mg and max daily dose 2,550 mg/day (1,000 mg/day if eGFR 30–44 mL/min).'
),
(
    'morphine', 'Morphine Sulfate', 10.00,
    30.00, 120.00,
    0.10, 0.20, 0.80,
    50.00, 30.00,
    'Active metabolite (M6G) accumulates in renal failure causing fatal respiratory depression. Reduce dose by 50–75% if eGFR < 50 mL/min; avoid if eGFR < 30 mL/min.',
    'FATAL RESPIRATORY DEPRESSION RISK: Opioid-naive single dose should not exceed 10–30 mg PO; pediatric max 0.1–0.2 mg/kg/dose.'
),
(
    'tramadol', 'Tramadol HCl', 50.00,
    100.00, 400.00,
    1.00, 2.00, 8.00,
    30.00, 10.00,
    'eGFR < 30 mL/min: Extend dosing interval to every 12 hours and do not exceed 200 mg/day.',
    'SEIZURE & RESPIRATORY DEPRESSION RISK: Max adult single dose 100 mg and max daily dose 400 mg/day (200 mg/day in renal impairment).'
),
(
    'gentamicin', 'Gentamicin Sulfate', 80.00,
    400.00, 500.00,
    2.50, 7.50, 7.50,
    60.00, 30.00,
    'NEPHROTOXIC & OTOTOXIC AMINOGLYCOSIDE: Extend interval to Q24H–Q48H when eGFR < 60 mL/min and monitor trough levels.',
    'SEVERE NEPHROTOXICITY & IRREVERSIBLE OTOTOXICITY: Max 5–7.5 mg/kg/day; mandatory renal interval adjustment required.'
),
(
    'vancomycin', 'Vancomycin HCl', 500.00,
    2000.00, 4000.00,
    15.00, 20.00, 60.00,
    60.00, 30.00,
    'Renally cleared glycopeptide: Adjust dosing interval (Q24H or per trough/AUC monitoring) when eGFR < 60 mL/min.',
    'Nephrotoxicity & Red Man Syndrome risk: Max single dose 2,000 mg (4,000 mg/day); pediatric 15–20 mg/kg/dose.'
),
(
    'furosemide', 'Furosemide', 40.00,
    200.00, 600.00,
    1.00, 2.00, 6.00,
    30.00, 10.00,
    'Monitor electrolytes and serum creatinine closely in CKD; discontinue if anuria persists.',
    'Ototoxicity & severe hypokalemia/dehydration risk: Max adult single dose 200 mg (600 mg/day); pediatric max 2 mg/kg/dose (6 mg/kg/day).'
),
(
    'digoxin', 'Digoxin', 0.25,
    0.50, 0.50,
    0.005, 0.01, 0.02,
    60.00, 30.00,
    'NARROW THERAPEUTIC INDEX: Reduce maintenance dose by 50% (0.0625–0.125 mg daily or every other day) when eGFR < 60 mL/min.',
    'FATAL DIGITALIS TOXICITY / ARRHYTHMIA RISK: Maintenance dose rarely exceeds 0.25 mg/day (0.50 mg max loading).'
),
(
    'gabapentin', 'Gabapentin', 300.00,
    1200.00, 3600.00,
    10.00, 15.00, 45.00,
    60.00, 30.00,
    '100% renally excreted: eGFR 30–59 mL/min max 1,400 mg/day; eGFR 15–29 mL/min max 700 mg/day; eGFR < 15 mL/min max 300 mg/day.',
    'CNS depression & neurotoxicity in renal impairment: Max adult dose 1,200 mg TID (3,600 mg/day) with normal renal function.'
),
(
    'allopurinol', 'Allopurinol', 100.00,
    300.00, 800.00,
    5.00, 10.00, 10.00,
    60.00, 30.00,
    'DRESS / Stevens-Johnson Syndrome risk in CKD: Start at 50–100 mg/day when eGFR < 60 mL/min (max 100–200 mg/day if eGFR < 30 mL/min).',
    'Severe hypersensitivity & hepatotoxicity risk: Max single dose 300 mg (800 mg/day in normal renal function).'
),
(
    'omeprazole', 'Omeprazole', 20.00,
    40.00, 80.00,
    1.00, 1.50, 2.00,
    null, null,
    'No routine renal dose adjustment required; monitor magnesium with chronic therapy.',
    'Standard adult maximum is 40 mg per single dose (80 mg/day); pediatric 1 mg/kg/dose.'
)
ON DUPLICATE KEY UPDATE
    `display_name` = VALUES(`display_name`),
    `default_unit_strength_mg` = VALUES(`default_unit_strength_mg`),
    `max_single_dose_mg` = VALUES(`max_single_dose_mg`),
    `max_daily_dose_mg` = VALUES(`max_daily_dose_mg`),
    `pediatric_mg_kg_per_dose` = VALUES(`pediatric_mg_kg_per_dose`),
    `pediatric_max_mg_kg_per_dose` = VALUES(`pediatric_max_mg_kg_per_dose`),
    `pediatric_max_mg_kg_per_day` = VALUES(`pediatric_max_mg_kg_per_day`),
    `renal_egfr_warning_threshold` = VALUES(`renal_egfr_warning_threshold`),
    `renal_egfr_contraindicated_threshold` = VALUES(`renal_egfr_contraindicated_threshold`),
    `renal_adjustment_guidance` = VALUES(`renal_adjustment_guidance`),
    `clinical_overdose_warning` = VALUES(`clinical_overdose_warning`);
