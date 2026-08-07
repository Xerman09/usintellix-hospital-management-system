-- =============================================
-- Seed: starter screening tools
-- Populates the Screening Tool catalog used by the SDOH Assessment form's
-- "Screening Tool" dropdown. Idempotent: relies on the UNIQUE constraint
-- on `name`. Admins can add, rename, or remove entries afterward via the
-- Screening Tools admin screen.
-- =============================================

INSERT IGNORE INTO screening_tools (name, description, created_at) VALUES
('Hunger Vital Sign (2-item)', '2-question food insecurity screener (LOINC 88122-7 / 88123-5) used to score the Hunger Vital Signs section of the SDOH Assessment.', NOW()),
('AHC HRSN – Core', 'CMS Accountable Health Communities Health-Related Social Needs screening tool, core domains: housing instability, food insecurity, transportation, utility needs, interpersonal safety.', NOW()),
('AHC HRSN – Supplemental', 'CMS Accountable Health Communities Health-Related Social Needs screening tool, supplemental domains: financial strain, employment, family/community support, education, physical activity, substance use, mental health, disability.', NOW()),
('PRAPARE', 'Protocol for Responding to and Assessing Patients'' Assets, Risks, and Experiences — a standardized social determinants of health screening tool developed by NACHC.', NOW()),
('Intimate Partner Violence – HARK', 'HARK (Humiliation, Afraid, Rape, Kick) screening tool for intimate partner violence.', NOW());
