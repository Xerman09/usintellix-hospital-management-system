-- Migration 329: Executive Clinical Quality Scorecard
-- Hospital-Wide Clinical Safety Benchmarks:
-- 1. 30-Day Readmission Rate % (CMS / JCAHO Benchmark < 8.0%)
-- 2. Device-Associated HAI Rates per 1,000 Device Days (CAUTI, CLABSI, VAP)
-- 3. ER Door-to-Doctor Turnaround Time (Minutes, Median & 90th percentile, by ESI Acuity)
-- 4. Caesarean Section Rate % (Overall CS Rate, Robson Classification, NTSV Benchmark < 23.6%)

CREATE TABLE IF NOT EXISTS `obstetric_deliveries` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `delivery_number` VARCHAR(50) NOT NULL UNIQUE,
    `patient_id` INT UNSIGNED NULL,
    `patient_name` VARCHAR(150) NOT NULL,
    `patient_mrn` VARCHAR(50) NULL,
    `patient_age` INT UNSIGNED NULL,
    `delivery_datetime` DATETIME NOT NULL,
    `gestational_weeks` DECIMAL(4,1) NOT NULL DEFAULT 39.0,
    `gravida` INT UNSIGNED NOT NULL DEFAULT 1,
    `para` INT UNSIGNED NOT NULL DEFAULT 0,
    `delivery_type` ENUM(
        'Vaginal Spontaneous',
        'Vaginal Assisted (Vacuum/Forceps)',
        'Cesarean Elective',
        'Cesarean Emergency / STAT'
    ) NOT NULL DEFAULT 'Vaginal Spontaneous',
    `is_cesarean` TINYINT(1) GENERATED ALWAYS AS (
        CASE WHEN `delivery_type` IN ('Cesarean Elective', 'Cesarean Emergency / STAT') THEN 1 ELSE 0 END
    ) STORED,
    `robson_group` VARCHAR(150) NOT NULL DEFAULT 'Group 1 (Nulliparous, Single Cephalic, >=37w, Spontaneous)',
    `ntsv_qualifying` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 if Nulliparous, Term (>=37w), Singleton, Vertex',
    `indication` VARCHAR(255) NULL,
    `attending_obstetrician` VARCHAR(150) NOT NULL,
    `attending_pediatrician` VARCHAR(150) NULL,
    `labor_duration_hours` DECIMAL(4,1) NULL,
    `baby_gender` ENUM('Male', 'Female', 'Ambiguous') NOT NULL DEFAULT 'Female',
    `birth_weight_grams` INT UNSIGNED NOT NULL DEFAULT 3200,
    `apgar_1min` TINYINT UNSIGNED NOT NULL DEFAULT 8,
    `apgar_5min` TINYINT UNSIGNED NOT NULL DEFAULT 9,
    `estimated_blood_loss_ml` INT UNSIGNED NOT NULL DEFAULT 400,
    `maternal_complications` VARCHAR(255) NULL,
    `neonatal_complications` VARCHAR(255) NULL,
    `or_case_id` INT UNSIGNED NULL,
    `status` ENUM('Completed', 'Under Review', 'Verified') NOT NULL DEFAULT 'Completed',
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_delivery_dt` (`delivery_datetime`),
    INDEX `idx_delivery_type` (`delivery_type`),
    INDEX `idx_is_cesarean` (`is_cesarean`),
    INDEX `idx_ntsv` (`ntsv_qualifying`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `device_days_census` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `census_date` DATE NOT NULL,
    `ward_id` INT NOT NULL DEFAULT 0 COMMENT '0 for Hospital-Wide aggregate',
    `ward_name` VARCHAR(100) NOT NULL,
    `foley_catheter_days` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Urinary catheter days (CAUTI denominator)',
    `central_line_days` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Central venous line days (CLABSI denominator)',
    `ventilator_days` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Mechanical ventilator days (VAP denominator)',
    `inpatient_bed_days` INT UNSIGNED NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_census_ward` (`census_date`, `ward_id`),
    INDEX `idx_census_date` (`census_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Sample Delivery Records across past 60 days
INSERT IGNORE INTO `obstetric_deliveries`
(`delivery_number`, `patient_id`, `patient_name`, `patient_mrn`, `patient_age`, `delivery_datetime`, `gestational_weeks`, `gravida`, `para`, `delivery_type`, `robson_group`, `ntsv_qualifying`, `indication`, `attending_obstetrician`, `baby_gender`, `birth_weight_grams`, `apgar_1min`, `apgar_5min`, `estimated_blood_loss_ml`)
VALUES
('DEL-2026-0001', 1, 'Patient Ako', 'PAT-000001', 23, DATE_SUB(NOW(), INTERVAL 45 DAY), 39.2, 1, 0, 'Vaginal Spontaneous', 'Group 1 (Nulliparous, Single Cephalic, >=37w, Spontaneous)', 1, 'Normal spontaneous vaginal delivery', 'Dr. Patricia Santos, MD', 'Female', 3150, 9, 10, 300),
('DEL-2026-0002', 3, 'Patient Me', 'PAT-000003', 27, DATE_SUB(NOW(), INTERVAL 40 DAY), 38.6, 2, 1, 'Vaginal Spontaneous', 'Group 3 (Multiparous, Single Cephalic, >=37w, Spontaneous, No prior CS)', 0, 'Spontaneous onset labor', 'Dr. Patricia Santos, MD', 'Male', 3420, 8, 9, 350),
('DEL-2026-0003', 5, 'Patient Ako', 'PAT-000005', 28, DATE_SUB(NOW(), INTERVAL 35 DAY), 40.1, 1, 0, 'Cesarean Emergency / STAT', 'Group 1 (Nulliparous, Single Cephalic, >=37w, Spontaneous)', 1, 'Arrest of active phase / Cephalopelvic disproportion', 'Dr. Katherine Yu, MD', 'Male', 3780, 7, 9, 750),
('DEL-2026-0004', 29, 'Maria Reyes', 'PAT-000008', 31, DATE_SUB(NOW(), INTERVAL 30 DAY), 39.0, 2, 1, 'Cesarean Elective', 'Group 5 (Multiparous, Single Cephalic, >=37w, >=1 Prior CS)', 0, 'Repeat elective cesarean section', 'Dr. Katherine Yu, MD', 'Female', 3300, 9, 9, 650),
('DEL-2026-0005', 1, 'Patient Ako', 'PAT-000001', 23, DATE_SUB(NOW(), INTERVAL 25 DAY), 38.4, 1, 0, 'Vaginal Assisted (Vacuum/Forceps)', 'Group 1 (Nulliparous, Single Cephalic, >=37w, Spontaneous)', 1, 'Prolonged second stage of labor; vacuum-assisted', 'Dr. Patricia Santos, MD', 'Female', 3200, 7, 9, 450),
('DEL-2026-0006', 30, 'Josefina Morales', 'PAT-000009', 34, DATE_SUB(NOW(), INTERVAL 20 DAY), 39.5, 3, 2, 'Vaginal Spontaneous', 'Group 3 (Multiparous, Single Cephalic, >=37w, Spontaneous, No prior CS)', 0, 'Uncomplicated multiparous labor', 'Dr. Patricia Santos, MD', 'Male', 3550, 9, 10, 250),
('DEL-2026-0007', 3, 'Patient Me', 'PAT-000003', 27, DATE_SUB(NOW(), INTERVAL 14 DAY), 37.8, 1, 0, 'Cesarean Emergency / STAT', 'Group 2 (Nulliparous, Single Cephalic, >=37w, Induced/CS pre-labor)', 1, 'Category III fetal heart tracing / Acute fetal distress', 'Dr. Katherine Yu, MD', 'Female', 2980, 6, 8, 800),
('DEL-2026-0008', 5, 'Patient Ako', 'PAT-000005', 28, DATE_SUB(NOW(), INTERVAL 9 DAY), 39.1, 2, 1, 'Vaginal Spontaneous', 'Group 3 (Multiparous, Single Cephalic, >=37w, Spontaneous, No prior CS)', 0, 'Spontaneous delivery with intact perineum', 'Dr. Patricia Santos, MD', 'Male', 3400, 9, 9, 280),
('DEL-2026-0009', 1, 'Patient Ako', 'PAT-000001', 23, DATE_SUB(NOW(), INTERVAL 4 DAY), 38.9, 1, 0, 'Vaginal Spontaneous', 'Group 1 (Nulliparous, Single Cephalic, >=37w, Spontaneous)', 1, 'Normal spontaneous delivery', 'Dr. Patricia Santos, MD', 'Female', 3120, 9, 10, 300),
('DEL-2026-0010', 29, 'Maria Reyes', 'PAT-000008', 31, DATE_SUB(NOW(), INTERVAL 1 DAY), 39.4, 2, 1, 'Cesarean Elective', 'Group 5 (Multiparous, Single Cephalic, >=37w, >=1 Prior CS)', 0, 'Scheduled repeat C-section', 'Dr. Katherine Yu, MD', 'Male', 3620, 8, 9, 600);

-- Seed Baseline Device Days Census for Past 30 Days (ICU & Surgical Wards)
INSERT IGNORE INTO `device_days_census`
(`census_date`, `ward_id`, `ward_name`, `foley_catheter_days`, `central_line_days`, `ventilator_days`, `inpatient_bed_days`)
SELECT
    DATE_SUB(CURDATE(), INTERVAL seq DAY) AS census_date,
    0 AS ward_id,
    'All Wards / Entire Hospital' AS ward_name,
    FLOOR(18 + (RAND() * 8)) AS foley_catheter_days,
    FLOOR(10 + (RAND() * 5)) AS central_line_days,
    FLOOR(5 + (RAND() * 3)) AS ventilator_days,
    FLOOR(35 + (RAND() * 10)) AS inpatient_bed_days
FROM (
    SELECT 0 AS seq UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
    UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9
    UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14
    UNION ALL SELECT 15 UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19
    UNION ALL SELECT 20 UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24
    UNION ALL SELECT 25 UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29
) days;

-- Seed Sample Emergency Visits with Realistic Door-to-Doctor Turnaround Times
INSERT IGNORE INTO `er_visits`
(`visit_no`, `patient_id`, `status`, `arrived_at`, `arrival_mode`, `chief_complaint`, `acuity`, `doctor_user_id`, `triaged_at`, `doctor_at`, `registered_by`, `registered_at`, `closed_at`, `disposition`)
VALUES
('ER-2026-00101', 28, 'admitted', DATE_SUB(NOW(), INTERVAL 28 DAY), 'Ambulance', 'Severe substernal chest pain radiating to left arm', 1, 1, DATE_SUB(NOW(), INTERVAL 28 DAY) + INTERVAL 2 MINUTE, DATE_SUB(NOW(), INTERVAL 28 DAY) + INTERVAL 4 MINUTE, 1, DATE_SUB(NOW(), INTERVAL 28 DAY), DATE_SUB(NOW(), INTERVAL 28 DAY) + INTERVAL 120 MINUTE, 'Admitted'),
('ER-2026-00102', 31, 'discharged', DATE_SUB(NOW(), INTERVAL 25 DAY), 'Walk-in', 'Laceration to right forearm, active bleeding', 3, 1, DATE_SUB(NOW(), INTERVAL 25 DAY) + INTERVAL 8 MINUTE, DATE_SUB(NOW(), INTERVAL 25 DAY) + INTERVAL 22 MINUTE, 1, DATE_SUB(NOW(), INTERVAL 25 DAY), DATE_SUB(NOW(), INTERVAL 25 DAY) + INTERVAL 95 MINUTE, 'Discharged'),
('ER-2026-00103', 2, 'discharged', DATE_SUB(NOW(), INTERVAL 22 DAY), 'Walk-in', 'High fever, rigors, productive cough', 3, 1, DATE_SUB(NOW(), INTERVAL 22 DAY) + INTERVAL 7 MINUTE, DATE_SUB(NOW(), INTERVAL 22 DAY) + INTERVAL 28 MINUTE, 1, DATE_SUB(NOW(), INTERVAL 22 DAY), DATE_SUB(NOW(), INTERVAL 22 DAY) + INTERVAL 110 MINUTE, 'Discharged'),
('ER-2026-00104', 4, 'admitted', DATE_SUB(NOW(), INTERVAL 19 DAY), 'Ambulance', 'Acute shortness of breath, COPD exacerbation', 2, 1, DATE_SUB(NOW(), INTERVAL 19 DAY) + INTERVAL 3 MINUTE, DATE_SUB(NOW(), INTERVAL 19 DAY) + INTERVAL 11 MINUTE, 1, DATE_SUB(NOW(), INTERVAL 19 DAY), DATE_SUB(NOW(), INTERVAL 19 DAY) + INTERVAL 140 MINUTE, 'Admitted'),
('ER-2026-00105', 6, 'discharged', DATE_SUB(NOW(), INTERVAL 16 DAY), 'Walk-in', 'Right ankle inversion sprain, unable to bear weight', 4, 1, DATE_SUB(NOW(), INTERVAL 16 DAY) + INTERVAL 12 MINUTE, DATE_SUB(NOW(), INTERVAL 16 DAY) + INTERVAL 44 MINUTE, 1, DATE_SUB(NOW(), INTERVAL 16 DAY), DATE_SUB(NOW(), INTERVAL 16 DAY) + INTERVAL 85 MINUTE, 'Discharged'),
('ER-2026-00106', 28, 'admitted', DATE_SUB(NOW(), INTERVAL 12 DAY), 'Ambulance', 'Severe abdominal pain, RLQ tenderness, fever', 2, 1, DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 4 MINUTE, DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 14 MINUTE, 1, DATE_SUB(NOW(), INTERVAL 12 DAY), DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 160 MINUTE, 'Admitted'),
('ER-2026-00107', 31, 'discharged', DATE_SUB(NOW(), INTERVAL 9 DAY), 'Walk-in', 'Epistaxis uncontrolled after 30 mins direct pressure', 3, 1, DATE_SUB(NOW(), INTERVAL 9 DAY) + INTERVAL 6 MINUTE, DATE_SUB(NOW(), INTERVAL 9 DAY) + INTERVAL 19 MINUTE, 1, DATE_SUB(NOW(), INTERVAL 9 DAY), DATE_SUB(NOW(), INTERVAL 9 DAY) + INTERVAL 75 MINUTE, 'Discharged'),
('ER-2026-00108', 2, 'discharged', DATE_SUB(NOW(), INTERVAL 5 DAY), 'Walk-in', 'Mild allergic reaction, urticaria after shellfish ingestion', 4, 1, DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 9 MINUTE, DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 35 MINUTE, 1, DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY) + INTERVAL 65 MINUTE, 'Discharged'),
('ER-2026-00109', 4, 'admitted', DATE_SUB(NOW(), INTERVAL 3 DAY), 'Ambulance', 'Sudden onset focal neurological deficit, slurred speech', 1, 1, DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 2 MINUTE, DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 5 MINUTE, 1, DATE_SUB(NOW(), INTERVAL 3 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY) + INTERVAL 90 MINUTE, 'Admitted'),
('ER-2026-00110', 6, 'discharged', DATE_SUB(NOW(), INTERVAL 1 DAY), 'Walk-in', 'Dysuria and suprapubic cramping', 4, 1, DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 10 MINUTE, DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 38 MINUTE, 1, DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY) + INTERVAL 60 MINUTE, 'Discharged');
