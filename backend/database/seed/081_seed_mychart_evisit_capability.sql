-- Seed: My Chart e-visit capability (Phase M15a)
-- Subsystem: Patient Portal / RBAC. Grants the patient role the capability that lets a
-- patient raise an asynchronous e-visit, read the reply, and ask one follow-up question.
--
-- There are TWO switches and they do different jobs. This row decides whether the
-- endpoints answer the patient role at all. portal_allow_evisits (schema 340) is
-- operational policy and ships OFF, because an e-visit puts clinical triage in front of
-- a patient and the questionnaires in seeds 079 and 080 have not been signed off by a
-- clinician yet. Granting the capability here does not make the feature live; it means
-- that when a hospital does switch it on, it works without a code change.
--
-- Without this row the feature is denied, because RoleAccess::hasPermission() treats a
-- missing row as not granted. It is not optional.
--
-- Idempotency: INSERT IGNORE against the uq_role_capability unique key. The `patient`
-- role row itself is created by seed 058, which this relies on.

SET NAMES utf8mb4;

INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, 'mychart', 'mychart_evisits', 1
FROM `roles` r
WHERE r.name = 'patient';
