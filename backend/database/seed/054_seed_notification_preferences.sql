-- =====================================================================
-- Seed: 054_seed_notification_preferences.sql
-- Description: Seed initial default notification preferences and gateway
--              providers into general_settings.
-- =====================================================================

UPDATE `general_settings`
SET `notification_sms_enabled` = COALESCE(`notification_sms_enabled`, 1),
    `notification_email_enabled` = COALESCE(`notification_email_enabled`, 1),
    `notification_in_app_enabled` = COALESCE(`notification_in_app_enabled`, 1),
    `sms_gateway_provider` = COALESCE(`sms_gateway_provider`, 'Twilio'),
    `email_gateway_provider` = COALESCE(`email_gateway_provider`, 'SMTP')
WHERE `id` = 1;
