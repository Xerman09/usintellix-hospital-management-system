-- =============================================
-- Alter: patients — add OpenEMR-style "Choices" demographic fields
-- =============================================

ALTER TABLE patients

ADD COLUMN race VARCHAR(100) NULL AFTER blood_type,

ADD COLUMN ethnicity VARCHAR(100) NULL AFTER race,

ADD COLUMN religion VARCHAR(100) NULL AFTER ethnicity,

ADD COLUMN language VARCHAR(100) NULL AFTER religion;
