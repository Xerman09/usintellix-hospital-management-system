-- =============================================
-- Add photo (profile picture) support to patients
-- =============================================

ALTER TABLE patients
ADD COLUMN photo VARCHAR(255) NULL AFTER weight;
