-- Seed: My Chart reading-import capability (Phase M17a)
-- Subsystem: Patient Portal / RBAC. Grants the patient role the capability that lets
-- readings be brought in from a health app or a device, and lets a patient see what has
-- been imported for them.
--
-- Separate from portal_allow_reading_import (schema 341), which is operational policy.
-- This row decides whether the endpoints answer the patient role at all.
--
-- Note that the capability is granted even though the native bridge that would use it
-- does not exist yet (M17b, blocked on the Expo build quota). That is deliberate: the
-- same endpoint backs the staff import screen, which works today, and when the bridge
-- does arrive it needs no RBAC change to start working.
--
-- Without this row the feature is denied, because RoleAccess::hasPermission() treats a
-- missing row as not granted. It is not optional.
--
-- Idempotency: INSERT IGNORE against the uq_role_capability unique key. The `patient`
-- role row itself is created by seed 058, which this relies on.

SET NAMES utf8mb4;

INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, 'mychart', 'mychart_reading_import', 1
FROM `roles` r
WHERE r.name = 'patient';
