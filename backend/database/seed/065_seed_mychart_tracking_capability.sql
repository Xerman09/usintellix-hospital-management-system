-- Seed: My Chart "Track My Health" capability
-- Subsystem: Patient Portal / RBAC. Grants the patient role the capability that
-- switches home-recorded readings (schema 307) on, so a hospital that does not
-- want patient-entered numbers in its system can turn the whole feature off from
-- the role capability matrix instead of a code change.
--
-- Idempotency: INSERT IGNORE against the uq_role_capability unique key. The
-- `patient` role row itself is created by seed 058, which this relies on; if that
-- has not run, this inserts nothing rather than creating a half-set-up role.

SET NAMES utf8mb4;

INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, 'mychart', 'mychart_self_tracking', 1
FROM `roles` r
WHERE r.name = 'patient';
