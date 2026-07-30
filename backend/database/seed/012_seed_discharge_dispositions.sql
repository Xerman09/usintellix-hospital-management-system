-- =============================================
-- Seed: starter discharge dispositions
-- Idempotent: relies on the UNIQUE constraint on `name`. Admins can add,
-- rename, or remove entries afterward directly in the database.
-- =============================================

INSERT IGNORE INTO discharge_dispositions (name, created_at) VALUES
('Not Applicable', NOW()),
('Discharged to Home', NOW()),
('Discharged to Home Health Care', NOW()),
('Discharged/Transferred to a Skilled Nursing Facility', NOW()),
('Discharged/Transferred to an Intermediate Care Facility', NOW()),
('Discharged/Transferred to Another Type of Health Care Facility', NOW()),
('Left Against Medical Advice', NOW()),
('Expired', NOW()),
('Still a Patient', NOW());
