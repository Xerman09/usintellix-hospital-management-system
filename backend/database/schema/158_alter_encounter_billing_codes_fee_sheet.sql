-- =============================================
-- Alter: encounter_billing_codes
-- Adds the fields a real (OpenEMR-style) fee sheet needs per charge line:
-- units (quantity billed), modifier (CPT modifier code), justify (a
-- comma-separated list of encounter_diagnoses.id values this charge is
-- justified against), and auth_number (prior authorization number).
-- Also adds soft-delete so individual fee sheet rows can be removed one
-- at a time (via the new EncounterBillingCodes CRUD) without disturbing
-- the existing whole-encounter delete-then-reinsert save path, which
-- continues to hard-delete-and-recreate at encounter-save time.
-- =============================================

ALTER TABLE encounter_billing_codes
    ADD COLUMN units INT NOT NULL DEFAULT 1 AFTER fee;

ALTER TABLE encounter_billing_codes
    ADD COLUMN modifier VARCHAR(20) NULL AFTER units;

ALTER TABLE encounter_billing_codes
    ADD COLUMN justify VARCHAR(100) NULL AFTER modifier;

ALTER TABLE encounter_billing_codes
    ADD COLUMN auth_number VARCHAR(50) NULL AFTER justify;

ALTER TABLE encounter_billing_codes
    ADD COLUMN deleted_at DATETIME NULL AFTER created_at;

ALTER TABLE encounter_billing_codes
    ADD COLUMN deleted_by INT NULL AFTER deleted_at;

ALTER TABLE encounter_billing_codes
    ADD INDEX idx_encounter_billing_codes_deleted_by (deleted_by);
