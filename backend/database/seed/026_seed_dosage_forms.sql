-- =============================================
-- Seed: starter dosage forms
-- Common dosage forms for the drug catalog's "Dosage Form" dropdown.
-- Idempotent: relies on the UNIQUE constraint on `name`. Admins can add,
-- rename, or remove entries afterward from Admin > Dosage Forms.
-- =============================================

INSERT IGNORE INTO dosage_forms (name, description, created_at) VALUES
('Tablet', NULL, NOW()),
('Film-coated Tablet', NULL, NOW()),
('Chewable Tablet', NULL, NOW()),
('Extended-release Tablet', NULL, NOW()),
('Capsule', NULL, NOW()),
('Softgel Capsule', NULL, NOW()),
('Syrup', NULL, NOW()),
('Suspension', NULL, NOW()),
('Oral Drops', NULL, NOW()),
('Oral Solution', NULL, NOW()),
('Powder for Suspension', 'Reconstitute before use', NOW()),
('Injection (Solution)', NULL, NOW()),
('Powder for Injection', 'Reconstitute before use', NOW()),
('IV Infusion', NULL, NOW()),
('Cream', NULL, NOW()),
('Ointment', NULL, NOW()),
('Gel', NULL, NOW()),
('Lotion', NULL, NOW()),
('Eye Drops', NULL, NOW()),
('Ear Drops', NULL, NOW()),
('Nasal Spray', NULL, NOW()),
('Metered-dose Inhaler', NULL, NOW()),
('Nebule (Inhalation Solution)', NULL, NOW()),
('Suppository', NULL, NOW()),
('Transdermal Patch', NULL, NOW()),
('Sachet / Granules', NULL, NOW()),
('Lozenge', NULL, NOW()),
('Other', NULL, NOW());
