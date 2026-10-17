-- =====================================================================
-- Migration: 293_add_tax_and_institutional_id_to_business_settings.sql
-- Description: Add tax configuration (tax_name, tax_rate_percent) and
--              institutional identification (tax_id_number / TIN / EIN)
--              to business_settings for hospital-wide billing and compliance.
-- =====================================================================

ALTER TABLE `business_settings`
    ADD COLUMN IF NOT EXISTS `tax_name` VARCHAR(50) NULL DEFAULT 'VAT' AFTER `email`,
    ADD COLUMN IF NOT EXISTS `tax_rate_percent` DECIMAL(5,2) NOT NULL DEFAULT 12.00 AFTER `tax_name`,
    ADD COLUMN IF NOT EXISTS `tax_id_number` VARCHAR(50) NULL DEFAULT NULL AFTER `tax_rate_percent`;
