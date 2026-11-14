-- Seed: My Chart "send a file in" capability (Phase M11)
-- Subsystem: Patient Portal / RBAC. Grants the patient role the capability that switches
-- patient uploads on -- insurance cards, IDs, outside results, photographs.
--
-- Separate from portal_allow_uploads in general_settings (schema 335): this one is
-- role-level and decides whether the endpoints answer the patient role at all, while
-- that is operational policy alongside the size and per-day limits.
--
-- Idempotency: INSERT IGNORE against the uq_role_capability unique key. The `patient`
-- role row itself is created by seed 058, which this relies on.

SET NAMES utf8mb4;

INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, 'mychart', 'mychart_uploads', 1
FROM `roles` r
WHERE r.name = 'patient';
