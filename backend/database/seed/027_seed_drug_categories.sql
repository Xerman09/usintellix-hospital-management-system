-- =============================================
-- Seed: starter drug (therapeutic) categories
-- Broad therapeutic classes for filtering and reporting on the drug
-- catalog. Idempotent: relies on the UNIQUE constraint on `name`.
-- Admins can add, rename, or remove entries from Admin > Drug Categories.
-- =============================================

INSERT IGNORE INTO drug_categories (name, description, created_at) VALUES
('Analgesic / Antipyretic', NULL, NOW()),
('NSAID', 'Non-steroidal anti-inflammatory drugs', NOW()),
('Opioid Analgesic', NULL, NOW()),
('Antibiotic', NULL, NOW()),
('Antifungal', NULL, NOW()),
('Antiviral', NULL, NOW()),
('Anthelmintic', NULL, NOW()),
('Antihypertensive', NULL, NOW()),
('Antidiabetic', NULL, NOW()),
('Lipid-lowering Agent', NULL, NOW()),
('Anticoagulant / Antiplatelet', NULL, NOW()),
('Antihistamine', NULL, NOW()),
('Bronchodilator / Anti-asthma', NULL, NOW()),
('Corticosteroid', NULL, NOW()),
('Antacid / Anti-ulcer', NULL, NOW()),
('Antiemetic', NULL, NOW()),
('Laxative / Antidiarrheal', NULL, NOW()),
('Anticonvulsant', NULL, NOW()),
('Antidepressant', NULL, NOW()),
('Antipsychotic', NULL, NOW()),
('Anxiolytic / Sedative', NULL, NOW()),
('Anesthetic', NULL, NOW()),
('Vitamin / Mineral Supplement', NULL, NOW()),
('IV Fluid / Electrolyte', NULL, NOW()),
('Vaccine / Immunological', NULL, NOW()),
('Hormone / Contraceptive', NULL, NOW()),
('Dermatological', NULL, NOW()),
('Ophthalmic / Otic', NULL, NOW()),
('Medical Supply', 'Non-drug consumables', NOW()),
('Other', NULL, NOW());
