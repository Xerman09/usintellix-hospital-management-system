-- =====================================================================
-- Seed: 053_seed_currency_and_localization.sql
-- Description: Seed default currency and localization preferences into
--              business_settings.
-- =====================================================================

UPDATE `business_settings`
SET `currency_code` = COALESCE(`currency_code`, 'USD'),
    `currency_symbol` = COALESCE(`currency_symbol`, '$'),
    `currency_position` = COALESCE(`currency_position`, 'prefix'),
    `decimal_places` = COALESCE(`decimal_places`, 2)
WHERE `id` = 1;
