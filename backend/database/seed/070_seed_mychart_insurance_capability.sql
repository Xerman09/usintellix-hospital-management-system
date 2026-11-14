-- Seed: My Chart "my insurance" capability (Phase M12)
-- Subsystem: Patient Portal / RBAC. Grants the patient role the capability that lets a
-- patient see the coverage the hospital holds for them and ask for it to be added,
-- corrected or removed.
--
-- Separate from portal_allow_insurance_requests in general_settings (schema 336): this
-- one is role-level and decides whether the endpoints answer the patient role at all,
-- while that is operational policy, alongside the cap on how many requests may be open
-- at once. Seeing the coverage stays available when requests are switched off -- a
-- patient should be able to read what will be billed even where the hospital wants
-- changes handled at the desk.
--
-- Idempotency: INSERT IGNORE against the uq_role_capability unique key. The `patient`
-- role row itself is created by seed 058, which this relies on.

SET NAMES utf8mb4;

INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, 'mychart', 'mychart_insurance', 1
FROM `roles` r
WHERE r.name = 'patient';
