-- =====================================================================
-- Seed: 052_seed_tax_and_institutional_id.sql
-- Description: Seed initial default tax rates and hospital institutional
--              identification number (TIN/EIN) into business_settings.
-- =====================================================================

UPDATE `business_settings`
SET `tax_name` = COALESCE(`tax_name`, 'VAT'),
    `tax_rate_percent` = COALESCE(`tax_rate_percent`, 12.00),
    `tax_id_number` = COALESCE(`tax_id_number`, 'TIN-482-901-736-000')
WHERE `id` = 1;
