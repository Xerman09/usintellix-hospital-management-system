-- =====================================================================
-- Migration: 294_add_currency_and_localization_to_business_settings.sql
-- Description: Add currency & localization preferences:
--              currency_code (e.g. USD, PHP, EUR),
--              currency_symbol (e.g. $, ₱, €, £),
--              currency_position (prefix vs suffix),
--              decimal_places (e.g. 2, 0).
-- =====================================================================

ALTER TABLE `business_settings`
    ADD COLUMN IF NOT EXISTS `currency_code` VARCHAR(10) NOT NULL DEFAULT 'USD' AFTER `tax_id_number`,
    ADD COLUMN IF NOT EXISTS `currency_symbol` VARCHAR(10) NOT NULL DEFAULT '$' AFTER `currency_code`,
    ADD COLUMN IF NOT EXISTS `currency_position` ENUM('prefix', 'suffix') NOT NULL DEFAULT 'prefix' AFTER `currency_symbol`,
    ADD COLUMN IF NOT EXISTS `decimal_places` TINYINT UNSIGNED NOT NULL DEFAULT 2 AFTER `currency_position`;
