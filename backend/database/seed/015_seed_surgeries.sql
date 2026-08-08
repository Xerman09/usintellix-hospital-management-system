-- =============================================
-- Seed: starter surgeries
-- Populates the Surgery Management catalog with a sample starting list.
-- Idempotent: relies on the UNIQUE constraint on `name`. Admins can add,
-- rename, or remove entries afterward via the Surgery Management screen.
-- =============================================

INSERT IGNORE INTO surgeries (name, created_at) VALUES
('ALT OD', NOW()),
('ALT OS', NOW()),
('appendectomy', NOW()),
('Blepharoplasty', NOW()),
('cholecystectomy', NOW()),
('LPI OD', NOW()),
('LPI OS', NOW());
