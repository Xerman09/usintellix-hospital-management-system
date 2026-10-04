-- ========================================================
-- Migration: 241_dispensing_controls.sql
-- Module: Pharmacy > Dispensing, Pharmacy Reports
-- Purpose: Controls on dispensing.
--            * High-alert second check: a dispensing that includes a
--              high-alert medicine (drugs.is_high_alert) waits for a
--              second person -- not the one who prepared it -- to check
--              it before it's handed over and paid for.
--              check_status: NULL = no check needed, 'awaiting', 'checked'.
--              A dispensing that fails the check is undone (voided).
--            * Indexes for the pharmacy reports (dispensing log by date,
--              prescriptions by prescriber and date).
--          Dispensings made before this need no check (NULL).
--          Safe to run again.
-- ========================================================

ALTER TABLE prescription_dispenses
    ADD COLUMN IF NOT EXISTS check_status VARCHAR(20) NULL AFTER status,
    ADD COLUMN IF NOT EXISTS checked_at DATETIME NULL AFTER check_status,
    ADD COLUMN IF NOT EXISTS checked_by INT NULL AFTER checked_at,
    ADD COLUMN IF NOT EXISTS check_notes VARCHAR(500) NULL AFTER checked_by;

CREATE INDEX IF NOT EXISTS idx_pd_check ON prescription_dispenses (check_status, status);

CREATE INDEX IF NOT EXISTS idx_pd_created ON prescription_dispenses (created_at);

CREATE INDEX IF NOT EXISTS idx_rx_prescriber_date ON prescriptions (prescriber_user_id, prescribed_date);
