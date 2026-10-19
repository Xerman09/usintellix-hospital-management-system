-- Seed 058: My Chart (patient portal) capabilities
-- Subsystem: Patient Portal / RBAC. Registers the portal's own role in `roles` and
-- grants the patient role the My Chart capabilities, so a hospital can switch off
-- online payment, e-check-in, result viewing, proxy requests or record sharing from
-- the role capability matrix instead of a code change.
--
-- Idempotency: the role is inserted with INSERT ... SELECT ... WHERE NOT EXISTS, and
-- the capabilities with INSERT IGNORE against the uq_role_capability unique key, so
-- re-running changes nothing.
--
-- Note on the role row: patient accounts carry `users.role_id IS NULL` and the session
-- role string "patient" (AuthService), so this row does not change how a patient logs
-- in or what RoleMiddleware lets them call. It exists because role_permissions.role_id
-- is a foreign key to roles.id, and it is what RoleAccess::hasPermission('patient', ...)
-- joins on. The staff role picker filters it out (frontend add-employee.js).

SET NAMES utf8mb4;

INSERT INTO `roles` (`name`, `description`, `created_at`)
SELECT 'patient', 'Patient portal user (My Chart). Not a staff job role.', NOW()
WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `name` = 'patient');

INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, c.module, c.capability, 1
FROM `roles` r
CROSS JOIN (
    SELECT 'mychart' AS module, 'mychart_results_view' AS capability UNION ALL
    SELECT 'mychart', 'mychart_billing_pay' UNION ALL
    SELECT 'mychart', 'mychart_checkin' UNION ALL
    SELECT 'mychart', 'mychart_proxy_request' UNION ALL
    SELECT 'mychart', 'mychart_records_share'
) c
WHERE r.name = 'patient';
