-- Seed: "Refill Request" message type
-- Adds a dedicated message type so patient-submitted prescription refill
-- requests (sent via the Messaging system) are labeled and filterable in
-- the staff inbox, rather than showing up as "Unassigned".
-- Idempotent: relies on the UNIQUE constraint on `name` (same mechanism as
-- 011_seed_message_types_statuses.sql).

INSERT IGNORE INTO message_types (name, created_at) VALUES
('Refill Request', NOW());
