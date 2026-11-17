-- Seed: My Chart chart-view capability (Phase M19)
-- Subsystem: Patient Portal / RBAC. Grants the patient role the capability that lets them
-- see the allergies, conditions, medicines, operations, implants and vaccinations recorded
-- about them, and raise a correction against any of it.
--
-- Separate from portal_allow_chart (schema 343), which is operational policy: that column
-- switches the chart off for the whole hospital, this row decides whether the endpoints
-- answer the patient role at all.
--
-- One capability covers reading and correcting, because they are not separable in any
-- useful way. A hospital that shows a patient their allergy list and gives them no way to
-- say it is wrong has built the worse half of this feature: the patient now knows the
-- record is wrong and can do nothing about it. If corrections are unwanted, switch them
-- off with portal_allow_chart_corrections and keep the reading.
--
-- Without this row the feature is denied, because RoleAccess::hasPermission() treats a
-- missing row as not granted. It is not optional.
--
-- Idempotency: INSERT IGNORE against the uq_role_capability unique key. The `patient`
-- role row itself is created by seed 058, which this relies on.

SET NAMES utf8mb4;

INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, 'mychart', 'mychart_chart', 1
FROM `roles` r
WHERE r.name = 'patient';
