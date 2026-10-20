-- Seed: "Result Question" message type
-- Adds a dedicated message type so a question a patient asks about one of their test
-- results (sent from My Chart through the existing Messaging system) is labelled and
-- filterable in the staff inbox, rather than showing up as "Unassigned".
-- Idempotent: relies on the UNIQUE constraint on `name` (same mechanism as
-- 011_seed_message_types_statuses.sql and 021_seed_refill_request_message_type.sql).

SET NAMES utf8mb4;

INSERT IGNORE INTO message_types (name, created_at) VALUES
('Result Question', NOW());
