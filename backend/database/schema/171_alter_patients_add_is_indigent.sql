-- =============================================
-- Alter: patients
-- Adds is_indigent, a simple financial-hardship flag used by
-- Reports > Insurance > Indigents to select which patients belong on
-- that report. Boolean, same pattern as the existing allow_sms/
-- allow_hie/etc. flags already on this table.
-- =============================================

ALTER TABLE patients
    ADD COLUMN is_indigent TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_postcard;
