-- =====================================================================
-- Migration: 296_add_operational_policies_to_general_settings.sql
-- Description: Add hospital operational policies & system constants:
--              default_appointment_duration (minutes),
--              bed_turnover_buffer_minutes (turnover cleaning grace period),
--              inactivity_timeout_minutes (HIPAA automatic session logoff),
--              break_glass_requires_cosign (clinical emergency governance).
-- =====================================================================

ALTER TABLE `general_settings`
    ADD COLUMN IF NOT EXISTS `default_appointment_duration` INT NOT NULL DEFAULT 30 AFTER `email_gateway_provider`,
    ADD COLUMN IF NOT EXISTS `bed_turnover_buffer_minutes` INT NOT NULL DEFAULT 45 AFTER `default_appointment_duration`,
    ADD COLUMN IF NOT EXISTS `inactivity_timeout_minutes` INT NOT NULL DEFAULT 15 AFTER `bed_turnover_buffer_minutes`,
    ADD COLUMN IF NOT EXISTS `break_glass_requires_cosign` TINYINT(1) NOT NULL DEFAULT 1 AFTER `inactivity_timeout_minutes`;
