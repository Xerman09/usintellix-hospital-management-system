-- Seed: AI analysis capability
-- Subsystem: AI analytics / RBAC. Grants the `ai_analysis` capability, which every AI
-- analysis surface checks before it spends anything. Idempotency: INSERT IGNORE against
-- the uq_role_capability unique key.
--
-- GRANTED TO ADMIN ONLY, ON PURPOSE.
--
-- Every other capability seed in this directory grants the role that obviously needs the
-- feature. This one does not, because every grant here is a standing authority to spend
-- the hospital's money with a third party, and "who may run this" is a decision for the
-- hospital rather than a default shipped by a migration.
--
-- RoleAccess::hasPermission() returns true for `admin` unconditionally, so strictly this
-- row changes nothing. It is written anyway so the capability exists as a visible row to
-- copy: adding the accountant or the revenue-cycle lead is one line below, taken
-- deliberately.
--
--   INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
--   SELECT r.id, 'ai_analysis', 'ai_analysis', 1 FROM `roles` r WHERE r.name = 'accountant';
--
-- Note that the capability is only half the gate. general_settings.allow_ai_analysis
-- defaults to 0 (schema 346), so nothing runs until somebody switches the feature on as
-- well -- which is the other half, and the one that costs money.

SET NAMES utf8mb4;

INSERT IGNORE INTO `role_permissions` (`role_id`, `module`, `capability`, `is_granted`)
SELECT r.id, 'ai_analysis', 'ai_analysis', 1
FROM `roles` r
WHERE r.name = 'admin';
