-- ============================================================================
-- Migration: 343_portal_chart.sql
-- My Chart Phase M19: showing the patient the chart the hospital already holds.
--
-- Allergies, conditions, medications, operations, implants and immunizations
-- are all recorded in this system and none of them has ever been visible to the
-- person they describe. This phase shows them, and adds a way for the patient to
-- say "that is not right".
--
-- ----------------------------------------------------------------------------
-- THE ONE RULE THIS PHASE TURNS ON: verification_status IS A GATE, NOT A LABEL
-- ----------------------------------------------------------------------------
--
-- Every one of these tables carries `verification_status`, and the staff screen
-- offers four values (patient-issues.view.js): Unconfirmed, Confirmed, Refuted,
-- Entered in Error. They are the FHIR set and they do not mean shades of
-- confidence -- two of them mean the opposite of the row's own content:
--
--   Refuted          a clinician decided the patient does NOT have this.
--   Entered in Error the row should never have existed.
--
-- In this database, right now, 5 of 6 allergies are Unconfirmed, and there is a
-- Refuted problem and a Refuted medication. So a chart screen that simply listed
-- what the tables hold would tell a patient they have a condition a clinician
-- explicitly ruled out, and show a mistaken entry as fact. That is not a cosmetic
-- bug; it is the whole risk of this phase in one line.
--
-- So the service shows Confirmed and Unconfirmed only, Unconfirmed always
-- carries words saying it is not confirmed, and NULL is treated as Unconfirmed --
-- never as Confirmed, because an absent assertion is not an assertion.
--
-- `portal_chart_show_unconfirmed` lets a hospital go further and show only what
-- has been confirmed. It is ON by default, because a patient who can see an
-- unconfirmed allergy is the person most likely to be able to confirm or deny it,
-- and that is the point of showing them at all.
--
-- ----------------------------------------------------------------------------
-- WHAT IS DELIBERATELY NOT SHOWN
-- ----------------------------------------------------------------------------
--
--   `comments` on every one of these tables is free text written by staff FOR
--   staff. It is not drafted for the person it is about, nobody has reviewed it
--   with that reader in mind, and it can contain anything. It is never sent to
--   the patient. If something in it matters to them, it belongs in the record
--   properly, not leaked through a column nobody wrote for this audience.
--
--   Clinician-facing coding (`coding`, `classification_type`, `occurrence`,
--   `outcome`) is also withheld -- an ICD or SNOMED string tells a patient
--   nothing and invites them to search it.
--
--   `patient_medical_problems.comments` is where "query X, rule out Y" tends to
--   live, which is exactly the sort of thinking that alarms a reader it was not
--   written for.
--
-- ----------------------------------------------------------------------------
-- A CORRECTION PATH, BECAUSE A LIST YOU CANNOT CHALLENGE IS WORSE THAN NO LIST
-- ----------------------------------------------------------------------------
--
-- The patient is the only person who knows whether their own allergy list is
-- right, and showing it to them without a way to say "that is wrong" produces a
-- patient who knows the record is wrong and cannot do anything about it.
--
-- `portal_chart_corrections` is that path. It is deliberately NOT an edit: a
-- patient never writes to their own clinical record. It raises a reviewable
-- request against one named item, which a clinician accepts or declines with a
-- reason the patient reads -- the same shape as M11's uploads and M12's insurance
-- corrections.
--
-- It is also the nearest thing this system has to the formal amendment right
-- under 45 CFR 164.526, which has a staff module (`Amendments`) and no patient
-- path at all. This is not that -- there is no response clock and no appeal --
-- and it should not be mistaken for it. Named here so nobody ticks that box on
-- the strength of this table.
--
-- ----------------------------------------------------------------------------
-- WHAT THE CCD SUMMARY ACTUALLY RETURNS, SINCE IT IS EASY TO MISREAD
-- ----------------------------------------------------------------------------
--
-- GET /health-summary looks like it returns twenty-odd sections. Fourteen of its
-- keys are hard-coded empty arrays: procedures, vital_signs, advance_directives,
-- goals, health_concerns, treatment_plan, social_history, functional_status,
-- mental_status, medical_equipment, payers, assessments, clinical_reminders and
-- reasons_for_referral. Only allergies, problems, medications, prescriptions,
-- results, immunizations and encounters are populated.
--
-- This phase therefore reads the source tables directly rather than that summary,
-- and covers operations (`patient_surgeries`) and implants
-- (`patient_medical_devices`) which the summary does not populate at all.
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- Which parts of the chart this hospital shows, and how each is introduced.
--
-- A row per section rather than a column per section, so adding one later is a
-- seed and not a migration, and so the wording a patient reads is data a
-- clinician can edit without a deployment.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portal_chart_sections` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,

    -- Matches PortalChartService::SECTIONS. Not free text.
    `section_code` VARCHAR(40) NOT NULL,

    -- What the patient sees as the heading. "Conditions", not "Problem list" --
    -- being told you are a list of problems is not how anyone wants to read it.
    `label` VARCHAR(80) NOT NULL,

    -- One or two sentences under the heading, saying what this list is and what
    -- it is not. This is the sentence that stops an incomplete list reading as a
    -- complete one.
    `blurb` VARCHAR(400) NULL DEFAULT NULL,

    -- Shown when the section has nothing in it. "No allergies recorded" must not
    -- read as "no allergies" -- the difference matters and only words carry it.
    `empty_text` VARCHAR(300) NULL DEFAULT NULL,

    `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,

    -- Whether a patient may raise a correction against items in this section.
    -- On for everything by default; a hospital that wants immunization queries
    -- by telephone only can switch that one off.
    `allow_corrections` TINYINT(1) NOT NULL DEFAULT 1,

    `sequence` INT NOT NULL DEFAULT 100,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL DEFAULT NULL,
    `updated_by` INT(11) NULL DEFAULT NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_portal_chart_section` (`section_code`),
    KEY `idx_portal_chart_section_order` (`is_enabled`, `sequence`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- "That does not look right."
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portal_chart_corrections` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `patient_id` INT(11) NOT NULL,

    -- Which list, and which row in it. `item_id` is the source table's own id.
    `section_code` VARCHAR(40) NOT NULL,
    `item_id` INT(11) NOT NULL,

    -- What the item was CALLED when the patient objected to it, copied rather
    -- than joined. The row may be corrected, superseded or soft-deleted before
    -- anybody reads the request, and "the patient says this is wrong" is
    -- meaningless once you can no longer see what "this" was.
    `item_label` VARCHAR(200) NOT NULL,

    -- What the patient says is wrong. Their words, not a form.
    `says` TEXT NOT NULL,

    -- What they would like done, as far as they are concerned. Advisory only:
    -- the clinician decides, and `remove` never deletes anything by itself.
    `asks` ENUM('remove','correct','add_detail','unsure') NOT NULL DEFAULT 'unsure',

    `status` ENUM('pending','accepted','declined','withdrawn') NOT NULL DEFAULT 'pending',

    -- The clinician's answer, which the patient reads. Required on a decline:
    -- being told no with no reason is worse than not being able to ask.
    `response` VARCHAR(500) NULL DEFAULT NULL,

    `reviewed_by` INT(11) NULL DEFAULT NULL,
    `reviewed_at` DATETIME NULL DEFAULT NULL,

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` INT(11) NULL DEFAULT NULL,
    `updated_at` DATETIME NULL DEFAULT NULL,

    PRIMARY KEY (`id`),
    KEY `idx_chart_correction_queue` (`status`, `created_at`),
    KEY `idx_chart_correction_patient` (`patient_id`, `status`),

    -- One open request per item per patient. A second is not a second problem,
    -- it is the same person asking again, and the desk should see one row.
    UNIQUE KEY `uq_chart_correction_open` (`patient_id`, `section_code`, `item_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Policy.
-- ----------------------------------------------------------------------------
ALTER TABLE `general_settings`
    -- The master switch for the whole chart view.
    ADD COLUMN IF NOT EXISTS `portal_allow_chart` TINYINT(1) NOT NULL DEFAULT 1,

    -- Whether items that nobody has confirmed are shown at all. ON by default --
    -- see the header. A hospital that turns this off shows a shorter, more
    -- certain chart and loses the corrections that unconfirmed items attract.
    ADD COLUMN IF NOT EXISTS `portal_chart_show_unconfirmed` TINYINT(1) NOT NULL DEFAULT 1,

    -- Whether the patient may raise a correction at all.
    ADD COLUMN IF NOT EXISTS `portal_allow_chart_corrections` TINYINT(1) NOT NULL DEFAULT 1,

    -- How many corrections one patient may have waiting. Stops a list of
    -- twenty items becoming twenty requests in one sitting, which helps nobody
    -- -- least of all the patient, whose real objection gets lost among them.
    ADD COLUMN IF NOT EXISTS `portal_chart_max_pending` INT NOT NULL DEFAULT 5;
