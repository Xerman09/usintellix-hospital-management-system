-- =====================================================================
-- Seed: 055_seed_operational_policies.sql
-- Description: Seed initial default hospital operational policies & system
--              constants into general_settings.
-- =====================================================================

UPDATE `general_settings`
SET `default_appointment_duration` = COALESCE(`default_appointment_duration`, 30),
    `bed_turnover_buffer_minutes` = COALESCE(`bed_turnover_buffer_minutes`, 45),
    `inactivity_timeout_minutes` = COALESCE(`inactivity_timeout_minutes`, 15),
    `break_glass_requires_cosign` = COALESCE(`break_glass_requires_cosign`, 1)
WHERE `id` = 1;
