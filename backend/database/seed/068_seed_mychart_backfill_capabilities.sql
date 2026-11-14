-- Seed: My Chart capability backfill (Phase M9.5)
-- Subsystem: Patient Portal / RBAC. Grants the patient role the six capabilities added
-- when the features that shipped ungated were brought in line: visits and summaries,
-- billing viewing, account and access log, to-do and notifications, diagnosis guides,
-- and seeing one's own appointments.
--
-- *** THIS SEED IS NOT OPTIONAL. ***
--
-- Until now those fifteen endpoints answered any patient. They now go through
-- PortalGuard with a capability, and RoleAccess::hasPermission() treats a missing
-- role_permissions row as NOT granted -- so on a database where this seed has not run,
-- patients lose visits, billing, notifications, the diagnosis guides and their
-- appointment list. Apply it in the same deploy as the code, not after it.
--
-- Why gate them at all: every other part of My Chart could be switched off per
-- deployment and these could not, which meant a hospital that did not want, say,
-- patient-visible discharge summaries had no way to say so short of a code change.
--
-- Two patient actions stay deliberately ungated and are not listed here: revoking
-- someone's proxy access to your own record (a patient must always be able to cut off
-- access), and confirming attendance at an appointment (it changes nothing about the
-- booking). See the comment block in PortalGuard.
--
-- Idempotency: INSERT IGNORE against the uq_role_capability unique key, so re-running
-- changes nothing and leaves a capability an admin has since revoked alone. The
-- `patient` role row itself is created by seed 058, which this relies on; if that has
-- not run, this inserts nothing rather than creating a half-set-up role.

SET NAMES utf8mb4;

INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, 'mychart', c.capability, 1
FROM `roles` r
CROSS JOIN (
    SELECT 'mychart_visits_view' AS capability
    UNION ALL SELECT 'mychart_billing_view'
    UNION ALL SELECT 'mychart_account_view'
    UNION ALL SELECT 'mychart_notifications'
    UNION ALL SELECT 'mychart_diagnosis_guides'
    UNION ALL SELECT 'mychart_appointments_view'
) c
WHERE r.name = 'patient';
