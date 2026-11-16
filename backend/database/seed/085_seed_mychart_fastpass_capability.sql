-- Seed: My Chart Fast Pass capability (Phase M18)
-- Subsystem: Patient Portal / RBAC. Grants the patient role the capability that lets a
-- patient ask to be offered an earlier appointment, and answer an offer when one comes.
--
-- Separate from portal_allow_fastpass (schema 342), which is operational policy: that
-- column switches the feature off for the whole hospital, this row decides whether the
-- endpoints answer the patient role at all.
--
-- One capability covers joining the list, leaving it, accepting and declining. They are
-- not separable in any way that would be useful -- a hospital that does not want patients
-- accepting offers does not want them joining the list either, and a patient who can be
-- offered a slot must be able to say no to it.
--
-- Without this row the feature is denied, because RoleAccess::hasPermission() treats a
-- missing row as not granted. It is not optional.
--
-- Idempotency: INSERT IGNORE against the uq_role_capability unique key. The `patient`
-- role row itself is created by seed 058, which this relies on.

SET NAMES utf8mb4;

INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, 'mychart', 'mychart_fastpass', 1
FROM `roles` r
WHERE r.name = 'patient';
