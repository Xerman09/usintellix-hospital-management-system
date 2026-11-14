-- Seed: My Chart "questionnaires between visits" capability (Phase M13)
-- Subsystem: Patient Portal / RBAC. Grants the patient role the capability that lets a
-- patient see the questionnaires their clinician has sent them and answer them at home.
--
-- Separate from portal_allow_questionnaires in general_settings (schema 337): this one is
-- role-level and decides whether the endpoints answer the patient role at all, while that
-- is operational policy, alongside the grace period after the due date. Note that the
-- setting switches off *sending* and *answering*, not reading: a patient should still be
-- able to see what they already answered.
--
-- Without this row the feature is denied, because RoleAccess::hasPermission() treats a
-- missing row as not granted. It is not optional.
--
-- Idempotency: INSERT IGNORE against the uq_role_capability unique key. The `patient`
-- role row itself is created by seed 058, which this relies on.

SET NAMES utf8mb4;

INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, 'mychart', 'mychart_questionnaires', 1
FROM `roles` r
WHERE r.name = 'patient';
