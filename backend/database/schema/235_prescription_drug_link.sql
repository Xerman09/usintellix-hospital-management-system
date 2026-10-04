-- ========================================================
-- Migration: 235_prescription_drug_link.sql
-- Module: Patient Dashboard > Prescriptions
-- Purpose: Link a prescription to the exact Drug Catalog item (drugs)
--          the pharmacy stocks and dispenses, so the pharmacy knows
--          which product to give and stock can be deducted.
--            * drug_id is new and nullable: prescriptions written before
--              this, or typed as free text, have none. medication_id
--              (the old name-only medications list) is kept untouched
--              for those records -- no existing patient data is changed.
--          Safe to run again.
-- ========================================================

ALTER TABLE patient_prescriptions
    ADD COLUMN IF NOT EXISTS drug_id INT NULL AFTER medication_id;

CREATE INDEX IF NOT EXISTS idx_pp_drug ON patient_prescriptions (drug_id);

ALTER TABLE patient_prescriptions
    ADD CONSTRAINT fk_pp_drug
        FOREIGN KEY IF NOT EXISTS (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION;
