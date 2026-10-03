-- ========================================================
-- Migration: 226_general_settings_timezone.sql
-- Module: Administration > General Settings
-- Purpose: The timezone the whole system runs in (an IANA name such as
--          Asia/Manila). Applied on every request to PHP (date()) and to
--          the database session (NOW(), CURDATE()), so every timestamp
--          the system records and every "today" it calculates follows the
--          hospital's local clock instead of the server's.
--          Changing it does not rewrite timestamps already stored.
-- ========================================================

ALTER TABLE general_settings
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Manila' AFTER two_factor_method;
