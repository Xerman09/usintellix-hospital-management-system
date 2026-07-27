-- =============================================
-- Seed: starter message types and statuses
-- Idempotent: relies on the UNIQUE constraint on `name`. Admins can add,
-- rename, or remove entries afterward from the Message Types & Statuses
-- management screen.
-- =============================================

INSERT IGNORE INTO message_types (name, created_at) VALUES
('Unassigned', NOW()),
('Chart Note', NOW()),
('Insurance', NOW()),
('New Document', NOW()),
('Pharmacy', NOW());

INSERT IGNORE INTO message_statuses (name, created_at) VALUES
('New', NOW()),
('Read', NOW()),
('In Progress', NOW()),
('Closed', NOW());
