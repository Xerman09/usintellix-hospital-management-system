-- =============================================
-- Seed: starter amount units
-- Measurement units plus the count/package units the drug catalog uses
-- for "Dispensing Unit" and "Package Unit". Idempotent: relies on the
-- UNIQUE constraint on `name` (case-insensitive, so an existing "ml"
-- row blocks "mL"). Admins can manage entries from Admin > Amount Units.
-- =============================================

INSERT IGNORE INTO amount_units (name, description, created_at) VALUES
('mg', 'Milligram', NOW()),
('mcg', 'Microgram', NOW()),
('g', 'Gram', NOW()),
('mL', 'Millilitre', NOW()),
('L', 'Litre', NOW()),
('IU', 'International unit', NOW()),
('tablet', 'Count unit', NOW()),
('capsule', 'Count unit', NOW()),
('ampule', 'Count unit', NOW()),
('vial', 'Count unit', NOW()),
('sachet', 'Count unit', NOW()),
('nebule', 'Count unit', NOW()),
('suppository', 'Count unit', NOW()),
('patch', 'Count unit', NOW()),
('piece', 'Count unit', NOW()),
('bottle', 'Package unit', NOW()),
('tube', 'Package unit', NOW()),
('box', 'Package unit', NOW()),
('blister pack', 'Package unit', NOW()),
('pack', 'Package unit', NOW());
