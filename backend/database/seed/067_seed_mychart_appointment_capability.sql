-- Seed: My Chart "manage my appointment" capability
-- Subsystem: Patient Portal / RBAC (Phase M10). Grants the patient role the capability
-- that switches self-service rescheduling, cancelling and confirming on, so a hospital
-- that wants appointment changes to go through the desk can turn the whole feature off
-- from the role capability matrix instead of a code change.
--
-- Note this is separate from the two switches in general_settings
-- (portal_allow_self_reschedule / portal_allow_self_cancel, schema 334): this one is
-- role-level and governs whether the endpoints answer the patient role at all, while
-- those are operational policy and govern reschedule and cancel independently. Reading
-- an appointment and confirming attendance stay available while both are off, because
-- confirming is not a change to the booking.
--
-- Idempotency: INSERT IGNORE against the uq_role_capability unique key. The `patient`
-- role row itself is created by seed 058, which this relies on; if that has not run,
-- this inserts nothing rather than creating a half-set-up role.

SET NAMES utf8mb4;

INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, 'mychart', 'mychart_appointment_manage', 1
FROM `roles` r
WHERE r.name = 'patient';
