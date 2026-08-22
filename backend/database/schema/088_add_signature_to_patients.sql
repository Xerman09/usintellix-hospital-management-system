-- =============================================
-- Migration: Add signature to patients
-- =============================================

ALTER TABLE patients ADD COLUMN signature LONGTEXT NULL;
