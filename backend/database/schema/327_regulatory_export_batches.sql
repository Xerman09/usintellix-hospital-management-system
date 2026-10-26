-- =============================================================================
-- Migration: 327_regulatory_export_batches.sql
-- Subsystem: 3. Regulatory and Statutory Reporting (100% Missing Piece)
--   2. Health Authority Annual Hospital Statistical Report (AHSR) Engine
--      (regulatory_export_batches)
-- Purpose:
--   - Compiles Top 10 Leading Causes of Morbidity (by ICD-10, pediatric vs adult, male vs female)
--   - Compiles Top 10 Leading Causes of Mortality (by ICD-10, gross vs net >48h deaths)
--   - Surgical output counts (Major vs. Minor operations) and Obstetric Deliveries
--     (Normal Spontaneous Vaginal Delivery vs. Caesarean Section, livebirths)
--   - One-click encrypted / SHA-256 signed JSON / XML / CSV statutory export batches
--     for upload to national health portals (DOH Online National Electronic
--     Health Statistical Reporting System / CMS / NHS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS `regulatory_export_batches` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `batch_reference_no` VARCHAR(48) NOT NULL,
    `reporting_year` INT NOT NULL DEFAULT 2026,
    `reporting_period` VARCHAR(40) NOT NULL DEFAULT 'Annual 2026 (Jan-Dec)',
    `target_authority` VARCHAR(160) NOT NULL DEFAULT 'DOH Health Facilities & Services Regulatory Bureau (HFSRB - AHSR)',
    `facility_license_no` VARCHAR(60) NOT NULL DEFAULT 'DOH-LTO-2026-NCR-00491',
    `export_format` ENUM('JSON', 'XML', 'CSV') NOT NULL DEFAULT 'JSON',
    `encryption_standard` VARCHAR(80) NOT NULL DEFAULT 'AES-256-GCM + SHA-256 Digital Signature',
    `payload_sha256_hash` VARCHAR(64) NOT NULL,
    `authorized_bed_capacity` INT NOT NULL DEFAULT 250,
    `total_inpatient_discharges` INT NOT NULL DEFAULT 0,
    `total_inpatient_bed_days` INT NOT NULL DEFAULT 0,
    `bed_occupancy_rate_pct` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    `average_length_of_stay_days` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    `total_morbidity_cases_top10` INT NOT NULL DEFAULT 0,
    `total_mortality_deaths_top10` INT NOT NULL DEFAULT 0,
    `gross_mortality_rate_pct` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    `net_mortality_rate_pct` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    `major_surgeries_count` INT NOT NULL DEFAULT 0,
    `minor_surgeries_count` INT NOT NULL DEFAULT 0,
    `total_surgeries_count` INT NOT NULL DEFAULT 0,
    `normal_deliveries_nsvd_count` INT NOT NULL DEFAULT 0,
    `caesarean_deliveries_cs_count` INT NOT NULL DEFAULT 0,
    `assisted_instrumental_deliveries_count` INT NOT NULL DEFAULT 0,
    `total_deliveries_count` INT NOT NULL DEFAULT 0,
    `caesarean_section_rate_pct` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    `live_births_count` INT NOT NULL DEFAULT 0,
    `compiled_morbidity_json` LONGTEXT NULL,
    `compiled_mortality_json` LONGTEXT NULL,
    `compiled_surgical_obstetric_json` LONGTEXT NULL,
    `portal_submission_status` ENUM('Compiled - Ready for Upload', 'Encrypted & Exported', 'Uploaded to National Portal', 'Accepted by Health Authority') NOT NULL DEFAULT 'Compiled - Ready for Upload',
    `portal_acknowledgment_no` VARCHAR(80) NULL,
    `compiled_by` VARCHAR(120) NOT NULL DEFAULT 'Dr. Helena Vance, MD, MPH (Chief Medical Records & Epidemiology)',
    `compiled_at` DATETIME NOT NULL,
    `transmitted_at` DATETIME NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_ahsr_batch_ref` (`batch_reference_no`),
    KEY `idx_ahsr_year` (`reporting_year`),
    KEY `idx_ahsr_format` (`export_format`),
    KEY `idx_ahsr_status` (`portal_submission_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `regulatory_ahsr_morbidity_top10` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `reporting_year` INT NOT NULL DEFAULT 2026,
    `rank_no` INT NOT NULL,
    `icd10_code` VARCHAR(16) NOT NULL,
    `disease_description` VARCHAR(180) NOT NULL,
    `clinical_category` VARCHAR(100) NOT NULL,
    `male_cases` INT NOT NULL DEFAULT 0,
    `female_cases` INT NOT NULL DEFAULT 0,
    `pediatric_under_18` INT NOT NULL DEFAULT 0,
    `adult_18_to_59` INT NOT NULL DEFAULT 0,
    `geriatric_60_plus` INT NOT NULL DEFAULT 0,
    `total_discharges` INT NOT NULL DEFAULT 0,
    `share_of_morbidity_pct` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    `average_los_days` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    UNIQUE KEY `uk_ahsr_morb_year_rank` (`reporting_year`, `rank_no`),
    KEY `idx_ahsr_morb_icd10` (`icd10_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `regulatory_ahsr_mortality_top10` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `reporting_year` INT NOT NULL DEFAULT 2026,
    `rank_no` INT NOT NULL,
    `icd10_code` VARCHAR(16) NOT NULL,
    `underlying_cause_of_death` VARCHAR(180) NOT NULL,
    `clinical_department` VARCHAR(100) NOT NULL,
    `male_deaths` INT NOT NULL DEFAULT 0,
    `female_deaths` INT NOT NULL DEFAULT 0,
    `deaths_under_48h_er_inpatient` INT NOT NULL DEFAULT 0,
    `deaths_over_48h_net_institutional` INT NOT NULL DEFAULT 0,
    `total_deaths` INT NOT NULL DEFAULT 0,
    `share_of_mortality_pct` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    `case_fatality_rate_pct` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    UNIQUE KEY `uk_ahsr_mort_year_rank` (`reporting_year`, `rank_no`),
    KEY `idx_ahsr_mort_icd10` (`icd10_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `regulatory_ahsr_surgical_obstetric_summary` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `reporting_year` INT NOT NULL DEFAULT 2026,
    `category_group` ENUM('Surgical Output (Major vs Minor)', 'Obstetric Deliveries (Normal vs C-Section)') NOT NULL,
    `procedure_classification` VARCHAR(140) NOT NULL,
    `specialty_department` VARCHAR(120) NOT NULL,
    `elective_scheduled_count` INT NOT NULL DEFAULT 0,
    `emergency_stat_count` INT NOT NULL DEFAULT 0,
    `total_procedures_count` INT NOT NULL DEFAULT 0,
    `share_of_group_pct` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    `complication_or_ssi_rate_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `regulatory_benchmark_note` VARCHAR(180) NULL,
    UNIQUE KEY `uk_ahsr_surg_ob_year_proc` (`reporting_year`, `procedure_classification`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 1. Seed 2026 Top 10 Leading Causes of Morbidity (by ICD-10)
-- =============================================================================
INSERT INTO `regulatory_ahsr_morbidity_top10`
(`reporting_year`, `rank_no`, `icd10_code`, `disease_description`, `clinical_category`, `male_cases`, `female_cases`, `pediatric_under_18`, `adult_18_to_59`, `geriatric_60_plus`, `total_discharges`, `share_of_morbidity_pct`, `average_los_days`)
VALUES
(2026, 1, 'J18.9', 'Community-Acquired Pneumonia, Unspecified (Moderate to High Risk)', 'Respiratory Medicine', 642, 598, 380, 410, 450, 1240, 18.45, 4.80),
(2026, 2, 'I10', 'Essential (Primary) Hypertension & Hypertensive Urgency', 'Cardiology & Internal Medicine', 485, 535, 12, 468, 540, 1020, 15.18, 3.20),
(2026, 3, 'A09', 'Acute Gastroenteritis & Infectious Colitis with Moderate Dehydration', 'Gastroenterology & Pediatrics', 460, 430, 520, 240, 130, 890, 13.24, 2.90),
(2026, 4, 'N39.0', 'Complicated Urinary Tract Infection / Acute Pyelonephritis', 'Nephrology & Urology', 245, 515, 95, 395, 270, 760, 11.31, 3.70),
(2026, 5, 'A91', 'Dengue Hemorrhagic Fever / Dengue with Warning Signs', 'Infectious Diseases', 355, 325, 410, 235, 35, 680, 10.12, 4.50),
(2026, 6, 'E11.9', 'Type 2 Diabetes Mellitus with Hyperosmolar / Glycemic Uncontrol', 'Endocrinology', 290, 320, 8, 282, 320, 610, 9.08, 4.40),
(2026, 7, 'I21.9', 'Acute Myocardial Infarction (STEMI / NSTEMI Acute Coronary Syndrome)', 'Interventional Cardiology', 318, 192, 0, 215, 295, 510, 7.59, 5.90),
(2026, 8, 'K35.80', 'Acute Appendicitis (Uncomplicated & Perforated)', 'General Surgery', 235, 195, 145, 245, 40, 430, 6.40, 3.10),
(2026, 9, 'J44.1', 'Chronic Obstructive Pulmonary Disease (COPD) with Acute Exacerbation', 'Pulmonology', 228, 92, 0, 85, 235, 320, 4.76, 5.40),
(2026, 10, 'I63.9', 'Acute Ischemic Cerebral Infarction (CVA / Stroke)', 'Neurology & Stroke Unit', 148, 112, 2, 88, 170, 260, 3.87, 6.80)
ON DUPLICATE KEY UPDATE
    `disease_description` = VALUES(`disease_description`),
    `total_discharges` = VALUES(`total_discharges`),
    `share_of_morbidity_pct` = VALUES(`share_of_morbidity_pct`);

-- =============================================================================
-- 2. Seed 2026 Top 10 Leading Causes of Mortality (by ICD-10)
-- =============================================================================
INSERT INTO `regulatory_ahsr_mortality_top10`
(`reporting_year`, `rank_no`, `icd10_code`, `underlying_cause_of_death`, `clinical_department`, `male_deaths`, `female_deaths`, `deaths_under_48h_er_inpatient`, `deaths_over_48h_net_institutional`, `total_deaths`, `share_of_mortality_pct`, `case_fatality_rate_pct`)
VALUES
(2026, 1, 'I21.9', 'Acute Myocardial Infarction with Cardiogenic Shock', 'Cardiology & CCU', 38, 24, 26, 36, 62, 22.14, 12.16),
(2026, 2, 'A41.9', 'Refractory Septic Shock / Severe Sepsis Multi-Organ Failure', 'Critical Care ICU', 29, 25, 18, 36, 54, 19.29, 18.40),
(2026, 3, 'I63.9', 'Massive Cerebrovascular Infarction & Intracerebral Hemorrhage', 'Neuro-Critical Care', 24, 19, 15, 28, 43, 15.36, 16.54),
(2026, 4, 'J18.9', 'Severe Community-Acquired Pneumonia with ARDS (CAP-HR)', 'Pulmonology & MICU', 21, 16, 9, 28, 37, 13.21, 2.98),
(2026, 5, 'C34.90', 'Malignant Neoplasm of Bronchus & Lung (Metastatic Stage IV)', 'Medical Oncology', 17, 9, 4, 22, 26, 9.29, 21.67),
(2026, 6, 'N18.6', 'End-Stage Renal Disease (ESRD) with Uremic Encephalopathy / Hyperkalemia', 'Nephrology', 11, 9, 6, 14, 20, 7.14, 8.33),
(2026, 7, 'S06.5', 'Severe Traumatic Brain Injury (Subdural Hematoma - Polytrauma)', 'Trauma & Neurosurgery', 12, 4, 10, 6, 16, 5.71, 14.55),
(2026, 8, 'J44.1', 'COPD with Acute Hypercapnic Respiratory Failure', 'Pulmonology', 7, 3, 2, 8, 10, 3.57, 3.13),
(2026, 9, 'K74.60', 'Decompensated Hepatic Cirrhosis with Esophageal Variceal Hemorrhage', 'Gastroenterology', 5, 2, 3, 4, 7, 2.50, 9.46),
(2026, 10, 'A91', 'Severe Dengue Shock Syndrome (DSS Grade IV)', 'Pediatric & Adult ICU', 3, 2, 2, 3, 5, 1.79, 0.74)
ON DUPLICATE KEY UPDATE
    `underlying_cause_of_death` = VALUES(`underlying_cause_of_death`),
    `total_deaths` = VALUES(`total_deaths`),
    `share_of_mortality_pct` = VALUES(`share_of_mortality_pct`);

-- =============================================================================
-- 3. Seed Surgical Output Counts (Major vs. Minor) & Deliveries (Normal vs. C-Section)
-- =============================================================================
INSERT INTO `regulatory_ahsr_surgical_obstetric_summary`
(`reporting_year`, `category_group`, `procedure_classification`, `specialty_department`, `elective_scheduled_count`, `emergency_stat_count`, `total_procedures_count`, `share_of_group_pct`, `complication_or_ssi_rate_pct`, `regulatory_benchmark_note`)
VALUES
(2026, 'Surgical Output (Major vs Minor)', 'Major Surgical Operations — General, Laparoscopic & GI Surgery', 'General Surgery (Main OR)', 640, 280, 920, 29.30, 0.65, 'Includes Laparoscopic Cholecystectomy, Appendectomy, Colectomy, Herniorrhaphy'),
(2026, 'Surgical Output (Major vs Minor)', 'Major Surgical Operations — Orthopedic, Spine & Trauma Fixation', 'Orthopedic Surgery (Main OR)', 385, 195, 580, 18.47, 0.52, 'Includes Total Knee/Hip Arthroplasty, ORIF Internal Fixation'),
(2026, 'Surgical Output (Major vs Minor)', 'Major Surgical Operations — Cardiothoracic, Neuro & Urologic', 'Subspecialty OR Suites', 240, 90, 330, 10.51, 0.91, 'Includes CABG, Craniotomy, TURP, Percutaneous Nephrolithotomy'),
(2026, 'Surgical Output (Major vs Minor)', 'Minor Surgical Procedures — Excision, Debridement, Endoscopy & Biopsy', 'Minor OR & Ambulatory Day Surgery', 1050, 260, 1310, 41.72, 0.15, 'Outpatient & Day-Surgery Minor Procedures under Local/Conscious Sedation'),
(2026, 'Obstetric Deliveries (Normal vs C-Section)', 'Normal Spontaneous Vaginal Delivery (NSVD)', 'Labor & Delivery Suite (OB-GYN)', 980, 140, 1120, 69.14, 0.27, 'WHO / DOH Target: Normalcephalic singleton deliveries prioritized'),
(2026, 'Obstetric Deliveries (Normal vs C-Section)', 'Primary & Repeat Lower Segment Caesarean Section (LSCS)', 'Obstetric Operating Theatre', 260, 175, 435, 26.85, 0.69, 'Robson 10-Group Audited C-Section Rate: 26.85% (Target <= 28%)'),
(2026, 'Obstetric Deliveries (Normal vs C-Section)', 'Assisted Instrumental Vaginal Delivery (Vacuum / Forceps)', 'Labor & Delivery Suite (OB-GYN)', 25, 40, 65, 4.01, 0.45, 'Operative vaginal delivery for prolonged second stage of labor')
ON DUPLICATE KEY UPDATE
    `total_procedures_count` = VALUES(`total_procedures_count`),
    `share_of_group_pct` = VALUES(`share_of_group_pct`);

-- =============================================================================
-- 4. Seed Historical Regulatory Export Batches (JSON, XML, CSV)
-- =============================================================================
INSERT INTO `regulatory_export_batches`
(`batch_reference_no`, `reporting_year`, `reporting_period`, `target_authority`, `facility_license_no`, `export_format`, `encryption_standard`, `payload_sha256_hash`, `authorized_bed_capacity`, `total_inpatient_discharges`, `total_inpatient_bed_days`, `bed_occupancy_rate_pct`, `average_length_of_stay_days`, `total_morbidity_cases_top10`, `total_mortality_deaths_top10`, `gross_mortality_rate_pct`, `net_mortality_rate_pct`, `major_surgeries_count`, `minor_surgeries_count`, `total_surgeries_count`, `normal_deliveries_nsvd_count`, `caesarean_deliveries_cs_count`, `assisted_instrumental_deliveries_count`, `total_deliveries_count`, `caesarean_section_rate_pct`, `live_births_count`, `portal_submission_status`, `portal_acknowledgment_no`, `compiled_by`, `compiled_at`, `transmitted_at`)
VALUES
(
    'AHSR-2026-BATCH-001',
    2026,
    'Annual 2026 YTD (Jan - Oct)',
    'DOH Health Facilities & Services Regulatory Bureau (HFSRB - OHSRS)',
    'DOH-LTO-2026-NCR-00491',
    'JSON',
    'AES-256-GCM + SHA-256 Digital Signature',
    '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    250,
    8940,
    71820,
    78.71,
    4.35,
    6720,
    280,
    3.13,
    1.96,
    1830,
    1310,
    3140,
    1120,
    435,
    65,
    1620,
    26.85,
    1634,
    'Accepted by Health Authority',
    'DOH-OHSRS-2026-ACK-88412',
    'Dr. Helena Vance, MD, MPH (Chief Medical Records & Epidemiology)',
    DATE_SUB(NOW(), INTERVAL 3 DAY),
    DATE_SUB(NOW(), INTERVAL 2 DAY)
),
(
    'AHSR-2026-BATCH-002',
    2026,
    'Annual 2026 YTD (Jan - Oct)',
    'CMS / National Hospital Quality & Utilization Portal (HL7 CDA XML)',
    'DOH-LTO-2026-NCR-00491',
    'XML',
    'AES-256-GCM + SHA-256 Digital Signature',
    '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    250,
    8940,
    71820,
    78.71,
    4.35,
    6720,
    280,
    3.13,
    1.96,
    1830,
    1310,
    3140,
    1120,
    435,
    65,
    1620,
    26.85,
    1634,
    'Encrypted & Exported',
    'PORTAL-XML-2026-77319',
    'Dr. Helena Vance, MD, MPH (Chief Medical Records & Epidemiology)',
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    DATE_SUB(NOW(), INTERVAL 1 DAY)
),
(
    'AHSR-2026-BATCH-003',
    2026,
    'Annual 2026 YTD (Jan - Oct)',
    'PhilHealth / National Health Statistical Registry (CSV Flatfile)',
    'DOH-LTO-2026-NCR-00491',
    'CSV',
    'AES-256-GCM + SHA-256 Digital Signature',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    250,
    8940,
    71820,
    78.71,
    4.35,
    6720,
    280,
    3.13,
    1.96,
    1830,
    1310,
    3140,
    1120,
    435,
    65,
    1620,
    26.85,
    1634,
    'Compiled - Ready for Upload',
    NULL,
    'Dr. Helena Vance, MD, MPH (Chief Medical Records & Epidemiology)',
    NOW(),
    NULL
)
ON DUPLICATE KEY UPDATE
    `portal_submission_status` = VALUES(`portal_submission_status`),
    `total_surgeries_count` = VALUES(`total_surgeries_count`),
    `total_deliveries_count` = VALUES(`total_deliveries_count`);
