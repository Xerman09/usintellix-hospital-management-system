-- ============================================================================
-- Migration: 341_portal_reading_imports.sql
-- My Chart Phase M17a: bringing readings in from a health app or a device.
--
-- Track My Health (M7) is manual entry only, and typing a blood pressure every
-- day does not last. This adds the server side of importing: a batch endpoint
-- with deduplication, per-reading plausibility checks, provenance a clinician
-- can read, and -- the part that took the most care -- a rule about when an
-- imported reading may page somebody.
--
-- WHAT IS AND IS NOT IN THIS PHASE.
--
-- M17 as planned needs native modules on both platforms (Apple HealthKit,
-- Google Fit) to read from the phone's health store. Those cannot be compiled
-- until the Expo build quota resets, which also blocks M11's picker. So the
-- native bridge is M17b and still outstanding.
--
-- What is here is the contract that bridge will call, which is the hard part and
-- is testable without it: POST /mychart/readings/import takes a batch and
-- answers with what it accepted, skipped and refused. The same endpoint backs a
-- staff screen, so a clinic can load a patient's exported readings today rather
-- than after the quota resets.
--
-- THE RULE THAT MATTERS MOST: AN IMPORT MUST NOT PAGE ANYBODY ABOUT HISTORY.
--
-- M7's record() raises an urgent care-team alert for every reading outside the
-- safety band, one alert per reading, with no deduplication. That is right for
-- somebody typing in a reading they just took. Applied to an import it is a
-- disaster: a phone handing over three months of blood pressure would raise a
-- separate urgent alert for every out-of-band sample, dozens of pages about
-- readings from six weeks ago, and the real one buried among them.
--
-- So an import does NOT go through record(), and the rule is:
--
--   * every out-of-band reading is still FLAGGED (out_of_band = 1), so the
--     clinician sees it on the chart and nothing is hidden;
--   * only readings taken within portal_import_alert_hours of now can raise an
--     alert at all -- a reading from September is history, not news;
--   * and those raise ONE alert for the whole batch, naming the worst and
--     counting the rest, rather than one alert each.
--
-- The import record keeps both counts, so a clinician reading it sees "14 were
-- outside the band, 13 of them historical and not alerted" rather than having to
-- work out why their pager did not go off.
--
-- DEDUPLICATION, because a re-sync is the normal case and not an error.
--
-- A health app asked for "blood pressure since January" hands over the same
-- samples every time. Two keys guard against that:
--
--   external_id  the app's own identifier for the sample, when it has one.
--                HealthKit and Google Fit both give stable UUIDs.
--   dedupe_hash  a content hash of kind + taken_at + values, for sources with
--                no identifier (a CSV export, a nurse pasting figures in).
--
-- Both are unique per patient and only ever set on imported rows, so a patient
-- recording something by hand is never blocked by them -- and two genuinely
-- identical readings at the same minute for the same measure are a duplicate by
-- any reasonable definition.
--
-- A duplicate is reported as skipped, not as an error. Re-running an import is
-- expected to be safe and quiet.
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- Provenance and dedupe keys on the readings themselves.
--
-- `source` already exists from M7 as enum('patient','device') and answers the
-- clinician's first question -- did a human type this, or did a machine produce
-- it. It does not answer the second, which is "which machine", so these add it.
-- ----------------------------------------------------------------------------
ALTER TABLE `patient_self_readings`
    ADD COLUMN IF NOT EXISTS `source_app` VARCHAR(60) NULL
        COMMENT 'M17a: Apple Health, Google Fit, a CSV paste, a named device app',
    ADD COLUMN IF NOT EXISTS `device_name` VARCHAR(120) NULL
        COMMENT 'M17a: the measuring device, when the app reports it',
    ADD COLUMN IF NOT EXISTS `external_id` VARCHAR(120) NULL
        COMMENT 'M17a: the source app''s own id for this sample, for dedupe on re-sync',
    ADD COLUMN IF NOT EXISTS `dedupe_hash` CHAR(40) NULL
        COMMENT 'M17a: sha1 of kind|taken_at|values, for sources with no id. NULL on hand-entered rows.',
    ADD COLUMN IF NOT EXISTS `import_id` INT(11) NULL
        COMMENT 'M17a: the batch this arrived in';

-- Unique only where the column is set: MySQL allows any number of NULLs in a
-- unique index, so hand-entered readings (which leave both NULL) are untouched.
ALTER TABLE `patient_self_readings`
    ADD UNIQUE KEY IF NOT EXISTS `uq_self_reading_external` (`patient_id`, `source_app`, `external_id`),
    ADD UNIQUE KEY IF NOT EXISTS `uq_self_reading_dedupe` (`patient_id`, `dedupe_hash`),
    ADD KEY IF NOT EXISTS `idx_self_reading_import` (`import_id`);

-- ----------------------------------------------------------------------------
-- One import.
--
-- Worth a table of its own rather than inferring batches from created_at: a
-- clinician looking at a run of device readings needs to know where they came
-- from, who loaded them, and what was thrown away. "Nothing imported" and "all
-- 40 were duplicates" look identical on the chart and mean different things.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portal_reading_imports` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `patient_id` INT(11) NOT NULL,

    `source_app` VARCHAR(60) NOT NULL,
    `device_name` VARCHAR(120) NULL,

    -- Who caused it. A patient syncing their phone and a nurse pasting a CSV
    -- are both legitimate and a clinician should be able to tell them apart.
    `is_patient_initiated` TINYINT(1) NOT NULL DEFAULT 1,
    `started_by` INT(11) NULL,

    `total_submitted` INT(11) NOT NULL DEFAULT 0,
    `accepted` INT(11) NOT NULL DEFAULT 0,
    `duplicates` INT(11) NOT NULL DEFAULT 0,
    `rejected` INT(11) NOT NULL DEFAULT 0,

    -- Why each refused reading was refused, as JSON. Kept because "we dropped
    -- 6 of your readings" with no reason is not something a patient or a
    -- clinician can act on.
    `reject_reasons` TEXT NULL,

    `earliest_reading` DATETIME NULL,
    `latest_reading` DATETIME NULL,

    -- out_of_band readings in this batch, and how many of those were recent
    -- enough to be worth telling somebody about. The difference is the point.
    `flagged_count` INT(11) NOT NULL DEFAULT 0,
    `alertable_count` INT(11) NOT NULL DEFAULT 0,
    `alert_id` INT(11) NULL,

    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_portal_reading_import_patient` (`patient_id`, `created_at`),
    KEY `idx_portal_reading_import_source` (`source_app`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Policy.
--
-- portal_import_alert_hours is the one that carries clinical weight. Raise it
-- and an import of last week's readings starts paging the care team; drop it to
-- zero and a device that just measured 220/130 raises nothing. 24 hours means
-- "this is current" without reaching back into history.
-- ----------------------------------------------------------------------------
ALTER TABLE `general_settings`
    ADD COLUMN IF NOT EXISTS `portal_allow_reading_import` TINYINT(1) NOT NULL DEFAULT 1
        COMMENT 'M17a: readings may be brought in from a health app or device',
    ADD COLUMN IF NOT EXISTS `portal_import_alert_hours` INT(11) NOT NULL DEFAULT 24
        COMMENT 'M17a: only imported readings this recent may raise a care-team alert',
    ADD COLUMN IF NOT EXISTS `portal_import_max_rows` INT(11) NOT NULL DEFAULT 500
        COMMENT 'M17a: readings accepted in one batch',
    ADD COLUMN IF NOT EXISTS `portal_import_max_per_day` INT(11) NOT NULL DEFAULT 20
        COMMENT 'M17a: import batches one patient may run in a day';
