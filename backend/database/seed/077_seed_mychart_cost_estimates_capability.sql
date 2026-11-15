-- Seed: My Chart cost estimates capability (Phase M16)
-- Subsystem: Patient Portal / RBAC. Grants the patient role the capability that lets a
-- patient see the hospital's priced packages, ask for a written estimate, and read the
-- estimates issued to them.
--
-- Separate from the switches in schema 339: this one is role-level and decides whether
-- the endpoints answer the patient role at all, while portal_allow_cost_estimates and
-- portal_allow_estimate_requests are operational policy. Browsing prices stays available
-- when requests are switched off -- publishing a price list costs nothing to answer,
-- while a written estimate needs somebody at the desk to prepare it.
--
-- Without this row the feature is denied, because RoleAccess::hasPermission() treats a
-- missing row as not granted. It is not optional.
--
-- Idempotency: INSERT IGNORE against the uq_role_capability unique key. The `patient`
-- role row itself is created by seed 058, which this relies on.

SET NAMES utf8mb4;

INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, 'mychart', 'mychart_cost_estimates', 1
FROM `roles` r
WHERE r.name = 'patient';
