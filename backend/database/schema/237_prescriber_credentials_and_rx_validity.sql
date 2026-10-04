-- ========================================================
-- Migration: 237_prescriber_credentials_and_rx_validity.sql
-- Module: Providers, General Settings, Prescriptions
-- Purpose: What a Philippine prescription slip needs.
--            * providers: PTR number + date issued, and S2 license
--              number + expiry (needed to prescribe dangerous drugs
--              under RA 9165). license_number is the PRC license.
--            * general_settings.prescription_validity_days: how long a
--              new prescription can be filled (default 30 days).
--            * prescriptions.valid_until: fixed when the prescription is
--              written, so changing the setting later doesn't change
--              prescriptions already given. Existing prescriptions get
--              their date + 30 days.
--          Safe to run again.
-- ========================================================

ALTER TABLE providers
    ADD COLUMN IF NOT EXISTS ptr_number VARCHAR(50) NULL AFTER license_number,
    ADD COLUMN IF NOT EXISTS ptr_date DATE NULL AFTER ptr_number,
    ADD COLUMN IF NOT EXISTS s2_number VARCHAR(50) NULL AFTER ptr_date,
    ADD COLUMN IF NOT EXISTS s2_expiry_date DATE NULL AFTER s2_number;

ALTER TABLE general_settings
    ADD COLUMN IF NOT EXISTS prescription_validity_days INT NOT NULL DEFAULT 30 AFTER timezone;

ALTER TABLE prescriptions
    ADD COLUMN IF NOT EXISTS valid_until DATE NULL AFTER prescribed_date;

UPDATE prescriptions
SET valid_until = DATE_ADD(prescribed_date, INTERVAL 30 DAY)
WHERE valid_until IS NULL;
