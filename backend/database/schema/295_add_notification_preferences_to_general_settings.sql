-- =====================================================================
-- Migration: 295_add_notification_preferences_to_general_settings.sql
-- Description: Add system-wide master notification channel switches:
--              notification_sms_enabled, notification_email_enabled,
--              notification_in_app_enabled, plus gateway provider configurations.
-- =====================================================================

ALTER TABLE `general_settings`
    ADD COLUMN IF NOT EXISTS `notification_sms_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `timezone`,
    ADD COLUMN IF NOT EXISTS `notification_email_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `notification_sms_enabled`,
    ADD COLUMN IF NOT EXISTS `notification_in_app_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `notification_email_enabled`,
    ADD COLUMN IF NOT EXISTS `sms_gateway_provider` VARCHAR(50) NOT NULL DEFAULT 'Twilio' AFTER `notification_in_app_enabled`,
    ADD COLUMN IF NOT EXISTS `email_gateway_provider` VARCHAR(50) NOT NULL DEFAULT 'SMTP' AFTER `sms_gateway_provider`;
