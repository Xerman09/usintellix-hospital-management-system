-- ============================================================================
-- Migration: 334_portal_appointment_self_service.sql
-- My Chart Phase M10: letting a patient move, cancel and confirm their own
-- appointment.
--
-- Until now a patient could book (POST /appointments admits the patient role)
-- but not change anything: PUT and DELETE are staff-only. So the only way to
-- move an appointment was to telephone the desk, which is where no-shows come
-- from.
--
-- Two things this adds.
--
-- 1. State on `appointments`, so the desk sees what the patient did without
--    opening an audit log. A patient cancel sets status = 'cancelled' and keeps
--    the row -- it must never soft-delete, or the appointment vanishes from the
--    desk's day and nobody knows the slot came free.
--
--    `rescheduled_count` exists because repeated moves are a real pattern and a
--    decent no-show predictor, and because the from-date/from-time columns only
--    hold the LAST move. The full narrative (every move, with timestamps and who
--    did it) is already written to portal_audit_logs by PortalAudit, so there is
--    no separate history table here.
--
-- 2. Three settings on `general_settings`, the single-row settings table the
--    other operational policies live on (schema 296). A hospital that does not
--    want patients moving their own appointments switches it off here rather
--    than by a code change, and sets how close to the appointment self-service
--    stops being allowed.
-- ============================================================================

SET NAMES utf8mb4;

ALTER TABLE `appointments`
    ADD COLUMN IF NOT EXISTS `patient_confirmed_at` DATETIME NULL DEFAULT NULL AFTER `status`,
    ADD COLUMN IF NOT EXISTS `cancelled_at` DATETIME NULL DEFAULT NULL AFTER `patient_confirmed_at`,
    ADD COLUMN IF NOT EXISTS `cancel_reason` VARCHAR(255) NULL DEFAULT NULL AFTER `cancelled_at`,
    ADD COLUMN IF NOT EXISTS `cancelled_by_patient` TINYINT(1) NOT NULL DEFAULT 0 AFTER `cancel_reason`,
    ADD COLUMN IF NOT EXISTS `rescheduled_count` INT NOT NULL DEFAULT 0 AFTER `cancelled_by_patient`,
    ADD COLUMN IF NOT EXISTS `last_rescheduled_at` DATETIME NULL DEFAULT NULL AFTER `rescheduled_count`,
    ADD COLUMN IF NOT EXISTS `rescheduled_from_date` DATE NULL DEFAULT NULL AFTER `last_rescheduled_at`,
    ADD COLUMN IF NOT EXISTS `rescheduled_from_time` TIME NULL DEFAULT NULL AFTER `rescheduled_from_date`,
    ADD COLUMN IF NOT EXISTS `rescheduled_by_patient` TINYINT(1) NOT NULL DEFAULT 0 AFTER `rescheduled_from_time`;

-- The desk's day view filters on these, and the portal lists a patient's own
-- upcoming appointments by date.
ALTER TABLE `appointments`
    ADD INDEX IF NOT EXISTS `idx_appointments_patient_confirmed` (`patient_confirmed_at`),
    ADD INDEX IF NOT EXISTS `idx_appointments_patient_date` (`patient_id`, `appointment_date`);

-- How close to the appointment a patient may still change it, and whether they
-- may at all. 24 hours is the default because it leaves the desk a working day
-- to offer the freed slot to somebody else.
ALTER TABLE `general_settings`
    ADD COLUMN IF NOT EXISTS `portal_appointment_cutoff_hours` INT NOT NULL DEFAULT 24,
    ADD COLUMN IF NOT EXISTS `portal_allow_self_reschedule` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS `portal_allow_self_cancel` TINYINT(1) NOT NULL DEFAULT 1;
