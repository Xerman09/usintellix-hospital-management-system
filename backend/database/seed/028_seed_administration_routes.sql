-- =============================================
-- Seed: starter administration routes
-- Routes now shared by the drug catalog and immunizations. Idempotent:
-- relies on the UNIQUE constraint on `name`. Admins can add, rename, or
-- remove entries from Admin > Immunization > Routes.
-- =============================================

INSERT IGNORE INTO administration_routes (name, description, created_at) VALUES
('Oral', 'PO', NOW()),
('Sublingual', 'SL', NOW()),
('Buccal', NULL, NOW()),
('Intravenous', 'IV', NOW()),
('Intramuscular', 'IM', NOW()),
('Subcutaneous', 'SC', NOW()),
('Intradermal', 'ID', NOW()),
('Topical', NULL, NOW()),
('Transdermal', NULL, NOW()),
('Inhalation', NULL, NOW()),
('Nasal', NULL, NOW()),
('Ophthalmic', 'Eye', NOW()),
('Otic', 'Ear', NOW()),
('Rectal', 'PR', NOW()),
('Vaginal', NULL, NOW()),
('Other', NULL, NOW());
