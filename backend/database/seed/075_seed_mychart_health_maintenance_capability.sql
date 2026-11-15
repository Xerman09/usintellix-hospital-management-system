-- Seed: My Chart "what you are due for" capability (Phase M14)
-- Subsystem: Patient Portal / RBAC. Grants the patient role the capability that lets a
-- patient see the screenings and vaccinations they are due for, and ask the clinic to
-- arrange one or to record that they had it done elsewhere.
--
-- Separate from the two general_settings switches (schema 338): this one is role-level
-- and decides whether the endpoints answer the patient role at all, while
-- portal_allow_health_maintenance and portal_allow_care_gap_requests are operational
-- policy. Seeing the panel stays available when requests are switched off -- a patient
-- should be able to read what they are due for even where the hospital wants the asking
-- done at the desk.
--
-- Without this row the feature is denied, because RoleAccess::hasPermission() treats a
-- missing row as not granted. It is not optional.
--
-- Idempotency: INSERT IGNORE against the uq_role_capability unique key. The `patient`
-- role row itself is created by seed 058, which this relies on.

SET NAMES utf8mb4;

INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, 'mychart', 'mychart_health_maintenance', 1
FROM `roles` r
WHERE r.name = 'patient';
