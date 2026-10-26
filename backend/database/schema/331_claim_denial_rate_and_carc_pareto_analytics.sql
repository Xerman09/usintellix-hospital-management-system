-- Migration 331: Claim Denial Rate & CARC Pareto Analytics
-- Measures gross claim denial percentages (by claim volume and dollar value),
-- First-Pass Clean Claim Rate %, Appeal Overturn Recovery %, and visualizes
-- CARC 80/20 Pareto Root-Cause Distribution (e.g., 42% Prior Auth, 28% Medical Necessity)
-- to drive immediate front-end and coding billing corrections.

CREATE TABLE IF NOT EXISTS `analytics_claim_denial_monthly_summaries` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `summary_month` VARCHAR(7) NOT NULL COMMENT 'YYYY-MM format, e.g. 2026-10',
    `fiscal_year` SMALLINT UNSIGNED NOT NULL,
    `fiscal_month` TINYINT UNSIGNED NOT NULL,
    `total_claims_submitted` INT UNSIGNED NOT NULL DEFAULT 0,
    `clean_claims_paid_first_pass` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_claims_denied` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_gross_billed_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `total_denied_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `total_recovered_on_appeal` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `total_written_off_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,

    -- Key Denial Rate KPIs
    `clean_claim_rate_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT 'First-pass clean claims / total claims * 100 (Target >= 95%)',
    `gross_claim_denial_rate_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT 'Denied claims / total claims submitted * 100 (Target < 5%)',
    `gross_dollar_denial_rate_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT 'Denied amount / total gross billed * 100',
    `appeal_recovery_rate_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00 COMMENT 'Recovered amount / total denied amount * 100',
    `net_denial_writeoff_pct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_denial_summary_month` (`summary_month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed 6-Month Claim Submission & Denial Rate History (May 2026 - October 2026)
INSERT IGNORE INTO `analytics_claim_denial_monthly_summaries`
(`summary_month`, `fiscal_year`, `fiscal_month`, `total_claims_submitted`, `clean_claims_paid_first_pass`, `total_claims_denied`, `total_gross_billed_amount`, `total_denied_amount`, `total_recovered_on_appeal`, `total_written_off_amount`, `clean_claim_rate_pct`, `gross_claim_denial_rate_pct`, `gross_dollar_denial_rate_pct`, `appeal_recovery_rate_pct`, `net_denial_writeoff_pct`)
VALUES
('2026-05', 2026, 5, 1180, 1070, 110, 13850000.00, 1295000.00, 680000.00, 310000.00, 90.68, 9.32, 9.35, 52.51, 2.24),
('2026-06', 2026, 6, 1210, 1105, 105, 14120000.00, 1210000.00, 665000.00, 285000.00, 91.32, 8.68, 8.57, 54.96, 2.02),
('2026-07', 2026, 7, 1245, 1145, 100, 14490000.00, 1150000.00, 655000.00, 240000.00, 91.97, 8.03, 7.94, 56.96, 1.66),
('2026-08', 2026, 8, 1260, 1164, 96, 14490000.00, 1090000.00, 640000.00, 215000.00, 92.38, 7.62, 7.52, 58.72, 1.48),
('2026-09', 2026, 9, 1235, 1146, 89, 14056000.00, 985000.00, 610000.00, 180000.00, 92.79, 7.21, 7.01, 61.93, 1.28),
('2026-10', 2026, 10, 1290, 1202, 88, 14861000.00, 964500.00, 482000.00, 112000.00, 93.18, 6.82, 6.49, 49.97, 0.75);

-- Seed Representative Claim Denials in `billing_claim_denials` to reflect realistic CARC Pareto distribution:
-- ~42% Prior Authorization (CO-197)
-- ~28% Medical Necessity (CO-50)
-- ~14% Coding / Bundling Errors (CO-16, CO-97)
-- ~8% Timely Filing (CO-29)
-- ~8% Eligibility / Duplicate (CO-22, CO-18)
INSERT IGNORE INTO `billing_claim_denials`
(`denial_number`, `claim_number`, `patient_id`, `payer_name`, `payer_id`, `service_date`, `denial_date`, `remittance_eob_number`, `billed_amount`, `allowed_amount`, `denied_amount`, `patient_responsibility`, `carc_code`, `carc_description`, `rarc_code`, `rarc_description`, `denial_category`, `root_cause_analysis`, `priority`, `timely_filing_deadline`, `status`, `appeal_level`, `assigned_to_name`, `recovered_amount`, `written_off_amount`, `resolution_notes`)
VALUES
-- Prior Auth Denials (CO-197) -> ~42% Share
('DEN-2026-00004', 'CLM-2026-99201', 28, 'Maxicare Healthcare Corp.', 'PAY-MAXI-01', '2026-10-02', '2026-10-09', 'EOB-2026-88101', 84500.00, 0.00, 84500.00, 0.00, 'CO-197', 'Precertification / Prior Authorization Absent', 'N386', 'This decision was based on a National Coverage Determination (NCD) or Local Coverage Determination (LCD).', 'prior_auth_missing', 'MRI Lumbar Spine & Orthopedic surgical consult ordered without attaching HMO Letter of Authorization (LOA) reference number.', 'urgent', '2026-11-15', 'appeal_in_progress', 'level_1_reconsideration', 'Clarissa Mendoza (RCM Specialist)', 0.00, 0.00, 'Retro-authorization requested from Maxicare Medical Director with emergency ER triage notes.'),
('DEN-2026-00005', 'CLM-2026-99205', 29, 'Medicard Philippines Inc.', 'PAY-MEDI-02', '2026-10-04', '2026-10-11', 'EOB-2026-88105', 96000.00, 0.00, 96000.00, 0.00, 'CO-197', 'Precertification / Prior Authorization Absent', 'N130', 'Consult plan benefit documents/guidelines for information about restrictions for this service.', 'prior_auth_missing', 'Elective Laparoscopic Cholecystectomy extended by 2 inpatient days without prior auth extension renewal.', 'urgent', '2026-11-18', 'appeal_submitted', 'level_1_reconsideration', 'Clarissa Mendoza (RCM Specialist)', 0.00, 0.00, 'Submitted operative report showing dense adhesions requiring extended inpatient monitoring.'),
('DEN-2026-00006', 'CLM-2026-99210', 30, 'Intellicare (Asalus Corp.)', 'PAY-INTL-03', '2026-10-06', '2026-10-13', 'EOB-2026-88112', 78200.00, 0.00, 78200.00, 0.00, 'CO-197', 'Precertification / Prior Authorization Absent', 'N386', 'Authorization reference number missing on 837I institutional claim.', 'prior_auth_missing', 'Front-desk admission clerk entered verbal approval name instead of 10-digit electronic LOA approval code.', 'high', '2026-11-20', 'overturned_won', 'level_1_reconsideration', 'Marco Villanueva (Senior Biller)', 78200.00, 0.00, 'Corrected claim submitted with verified LOA #INT-992817; paid in full.'),
('DEN-2026-00007', 'CLM-2026-99214', 31, 'Blue Cross Blue Shield', 'PAY-BCBS-04', '2026-10-08', '2026-10-15', 'EOB-2026-88119', 64000.00, 0.00, 64000.00, 0.00, 'CO-197', 'Precertification / Prior Authorization Absent', 'M15', 'Separately billed services/tests have been bundled.', 'prior_auth_missing', 'High-cost IV biological infusion administered in outpatient clinic before payer prior auth window cleared.', 'urgent', '2026-11-22', 'pending_review', 'none', 'Clarissa Mendoza (RCM Specialist)', 0.00, 0.00, 'Pending peer-to-peer physician review with attending rheumatologist.'),
('DEN-2026-00008', 'CLM-2026-99218', 1, 'PhilHealth (National Health Insurance)', 'PAY-PHIC-00', '2026-10-09', '2026-10-16', 'EOB-2026-88125', 52000.00, 0.00, 52000.00, 0.00, 'CO-197', 'Precertification / Prior Authorization Absent', 'N386', 'Pre-authorization for Z-Benefit package incomplete.', 'prior_auth_missing', 'Missing signed member empowerment form and pre-operative checklist attachment.', 'high', '2026-11-25', 'overturned_won', 'level_1_reconsideration', 'Marco Villanueva (Senior Biller)', 52000.00, 0.00, 'Motion for Reconsideration approved after uploading signed CF4 and checklist.'),
('DEN-2026-00009', 'CLM-2026-99222', 2, 'Cigna International Health', 'PAY-CIGN-05', '2026-10-11', '2026-10-18', 'EOB-2026-88131', 42500.00, 0.00, 42500.00, 0.00, 'CO-197', 'Precertification / Prior Authorization Absent', 'N130', 'Prior notification required for CT Coronary Angiogram.', 'prior_auth_missing', 'Outpatient cardiology diagnostic order scheduled same-day without payer pre-cert.', 'medium', '2026-11-28', 'pending_review', 'none', 'Clarissa Mendoza (RCM Specialist)', 0.00, 0.00, 'Gathering cardiology stress echo abnormality report to justify urgent same-day CT.'),

-- Medical Necessity Denials (CO-50) -> ~28% Share
('DEN-2026-00010', 'CLM-2026-88430', 3, 'Aetna Healthcare Services', 'PAY-AETN-06', '2026-10-03', '2026-10-10', 'EOB-2026-77201', 92000.00, 0.00, 92000.00, 0.00, 'CO-50', 'Not Deemed a Medical Necessity by Payer', 'N115', 'This decision was based on a Local Coverage Determination (LCD).', 'medical_necessity', 'Inpatient ICU step-down stay (3 days) challenged by payer utilization reviewer as manageable under 24-hour observation status.', 'urgent', '2026-11-14', 'appeal_in_progress', 'level_2_formal_appeal', 'Dr. Elena Rostova (CDI Physician Advisor)', 0.00, 0.00, 'Drafting formal clinical appeal citing NEWS2 score >= 7 and continuous vasopressor weaning logs.'),
('DEN-2026-00011', 'CLM-2026-88435', 4, 'Maxicare Healthcare Corp.', 'PAY-MAXI-01', '2026-10-07', '2026-10-14', 'EOB-2026-77209', 68500.00, 0.00, 68500.00, 0.00, 'CO-50', 'Not Deemed a Medical Necessity by Payer', 'N386', 'Diagnosis pointer ICD-10 R51.9 (Headache) does not support Brain MRI w/ Contrast.', 'medical_necessity', 'Coder billed nonspecific primary symptom ICD-10 R51.9 instead of G45.9 (Transient Cerebral Ischemic Attack) documented in neuro consult.', 'high', '2026-11-19', 'overturned_won', 'level_1_reconsideration', 'Marco Villanueva (Senior Biller)', 68500.00, 0.00, 'Recoded primary diagnosis to G45.9 with neurologist SOAP note; claim paid.'),
('DEN-2026-00012', 'CLM-2026-88440', 5, 'Pacific Cross Health Insurance', 'PAY-PACI-07', '2026-10-10', '2026-10-17', 'EOB-2026-77215', 58000.00, 0.00, 58000.00, 0.00, 'CO-50', 'Not Deemed a Medical Necessity by Payer', 'N115', 'Experimental or investigational panel.', 'medical_necessity', 'Comprehensive respiratory PCR multiplex panel ordered for uncomplicated upper respiratory infection.', 'medium', '2026-11-24', 'appeal_submitted', 'level_1_reconsideration', 'Dr. Elena Rostova (CDI Physician Advisor)', 0.00, 0.00, 'Submitted immunocompromised patient history and oncology comorbidity documentation.'),
('DEN-2026-00013', 'CLM-2026-88445', 28, 'Medicard Philippines Inc.', 'PAY-MEDI-02', '2026-10-12', '2026-10-19', 'EOB-2026-77222', 49000.00, 0.00, 49000.00, 0.00, 'CO-50', 'Not Deemed a Medical Necessity by Payer', 'N115', 'Frequency of laboratory cardiac troponin serial testing exceeded guideline.', 'medical_necessity', 'Four serial hs-Troponin I assays ordered within 12 hours without chest pain recurrence note.', 'medium', '2026-11-27', 'pending_review', 'none', 'Marco Villanueva (Senior Biller)', 0.00, 0.00, 'Requesting addendum from ER physician regarding dynamic ST-segment changes on telemetry.'),

-- Coding & Billing Errors (CO-16 / CO-97) -> ~14% Share
('DEN-2026-00014', 'CLM-2026-66102', 29, 'Intellicare (Asalus Corp.)', 'PAY-INTL-03', '2026-10-05', '2026-10-12', 'EOB-2026-66010', 76000.00, 0.00, 76000.00, 0.00, 'CO-97', 'Bundled Service Allowance Included in Another Service', 'M15', 'Separately billed surgical debridement bundled into primary ORIF procedure.', 'coding_billing_error', 'Missing Modifier -59 (Distinct Procedural Service) on secondary wound debridement performed on contralateral limb.', 'high', '2026-11-16', 'overturned_won', 'level_1_reconsideration', 'Marco Villanueva (Senior Biller)', 76000.00, 0.00, 'Appended Modifier -59 and laterality modifiers RT/LT with operative report; overturned.'),
('DEN-2026-00015', 'CLM-2026-66109', 30, 'PhilHealth (National Health Insurance)', 'PAY-PHIC-00', '2026-10-11', '2026-10-18', 'EOB-2026-66018', 61000.00, 0.00, 61000.00, 0.00, 'CO-16', 'Claim lacks information or has billing errors', 'MA30', 'Missing or invalid attending physician accreditation number.', 'coding_billing_error', 'New surgical fellow NPI/PhilHealth accreditation number not synced in provider master table at claim generation.', 'high', '2026-11-23', 'overturned_won', 'level_1_reconsideration', 'Clarissa Mendoza (RCM Specialist)', 61000.00, 0.00, 'Updated provider credentialing table and re-transmitted electronic claim.'),

-- Timely Filing (CO-29) -> ~8% Share
('DEN-2026-00016', 'CLM-2026-77325', 31, 'UnitedHealthcare Clinical Solutions', 'PAY-UHCS-08', '2026-07-28', '2026-10-16', 'EOB-2026-55004', 74500.00, 0.00, 74500.00, 0.00, 'CO-29', 'Time Limit for Filing Has Expired', 'N211', 'Alert: You may not appeal this decision unless proof of timely filing is submitted.', 'timely_filing', 'Initial claim held in billing scrubber queue awaiting operative pathology sign-off past 60-day HMO filing window.', 'urgent', '2026-11-10', 'upheld_lost', 'level_2_formal_appeal', 'Clarissa Mendoza (RCM Specialist)', 0.00, 74500.00, 'Payer upheld denial; workflow updated to auto-flag claims held > 30 days.'),

-- Eligibility / Coverage & Duplicate (CO-22 / CO-18) -> ~8% Share
('DEN-2026-00017', 'CLM-2026-55101', 1, 'Cigna International Health', 'PAY-CIGN-05', '2026-10-08', '2026-10-15', 'EOB-2026-44012', 45000.00, 0.00, 45000.00, 0.00, 'CO-22', 'Coordination of Benefits / Other Primary Payer', 'MA04', 'Secondary payment cannot be considered without the identity of or payment information from the primary payer.', 'eligibility_coverage', 'Patient covered by both PhilHealth and private HMO; primary PhilHealth deduction EOB not attached.', 'medium', '2026-11-21', 'overturned_won', 'level_1_reconsideration', 'Marco Villanueva (Senior Biller)', 45000.00, 0.00, 'Attached PhilHealth benefit deduction statement; secondary balance paid.'),
('DEN-2026-00018', 'CLM-2026-55108', 2, 'Maxicare Healthcare Corp.', 'PAY-MAXI-01', '2026-10-12', '2026-10-19', 'EOB-2026-44019', 31000.00, 0.00, 31000.00, 0.00, 'CO-18', 'Exact Duplicate Claim / Service', 'M86', 'Service denied because payment already made for same/similar procedure within set time frame.', 'duplicate_claim', 'Bilateral knee X-ray billed on two separate lines without Modifier -50 or RT/LT indicators.', 'low', '2026-11-29', 'overturned_won', 'level_1_reconsideration', 'Marco Villanueva (Senior Biller)', 31000.00, 0.00, 'Resubmitted with RT and LT modifiers proving bilateral diagnostic study.');
