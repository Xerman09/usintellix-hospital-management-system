-- ============================================================================
-- Migration: 340_portal_evisits.sql
-- My Chart Phase M15a: asynchronous e-visits.
--
-- A patient describes a problem by answering a structured questionnaire, a
-- clinician reads it and replies, and the reply creates a real encounter. No
-- video, no appointment, no waiting room.
--
-- WHY THIS AND NOT VIDEO.
--
-- M15 as planned is video visits, and it is explicitly blocked on decisions
-- nobody has made: which video provider, what happens on a dropped call, how
-- the consultation is billed, and what bandwidth patients actually have. The
-- plan's own third bullet says to consider the asynchronous e-visit first
-- because it reuses M13, needs no video stack, and covers much of the demand.
-- That is what this is. When the video decisions are made, a video visit is an
-- appointment of a new visit type and M10's reschedule and cancel apply to it
-- unchanged -- none of this gets in the way of that.
--
-- THE ONE PROPERTY THAT MATTERS MOST: AN E-VISIT IS NOT AN EMERGENCY ROUTE.
--
-- The dangerous failure is not a missed diagnosis. It is a patient typing
-- "crushing chest pain" into a form, seeing "thank you, a doctor will reply",
-- and waiting at home. So the questionnaires carry red-flag answers (see the
-- `red_flag` key added to portal_questionnaires.questions below), and a
-- submission that trips one is REFUSED at the point of submission:
--
--   * status is 'refused' and the row is deliberately NOT in any clinician
--     queue. Nothing about a refused row implies somebody is coming.
--   * the patient is told to go now, and told in plain words that nobody is
--     watching the message and not to wait for a reply.
--   * an alert is still raised to the care team, because a hospital should know
--     that one of its patients reported chest pain through the portal. The
--     alert is a record and a chance, never a promise, and the patient is never
--     told to expect a call because of it.
--
-- Recording the refusal rather than discarding it is deliberate. A patient who
-- is turned away and then does not go to hospital is exactly the case somebody
-- needs to be able to find afterwards.
--
-- THE CLINICAL RECORD GOES THROUGH THE NORMAL ENCOUNTER PATH.
--
-- The plan is explicit that a parallel telehealth record would be a second
-- source of truth. So a clinician's reply calls EncounterService::store() and
-- the resulting encounter id is kept on the e-visit row. The note, any orders
-- and any billing then hang off a normal encounter, found by the normal
-- screens, with a visit category that says it happened online (seed 079).
--
-- WHAT THIS DELIBERATELY DOES NOT DO.
--
--   * It does not prescribe, and says so to the patient. A prescription from a
--     questionnaire with no examination is a decision for the hospital's
--     clinical governance, not for a schema comment.
--   * It does not triage by severity or order the queue by anything other than
--     how long somebody has waited. Sorting by a computed urgency would be a
--     clinical judgement made by code.
--   * It does not let a patient reopen a case for ever. One follow-up question
--     inside a window (portal_evisit_followup_days) keeps a thread useful
--     without turning it into an open-ended consultation channel.
-- ============================================================================

SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- Let a questionnaire be marked as an e-visit form.
--
-- MODIFY rather than ADD: this is an existing enum and re-running the statement
-- simply restates the same definition. M5's e-check-in resolution filters
-- `use_context IN ('checkin','both')` and M13's follow-up catalogue filters
-- `use_context = 'followup'`, both explicitly -- which is exactly why those
-- filters were added in M13, and why a third value can be introduced here
-- without either of them changing behaviour.
-- ----------------------------------------------------------------------------
ALTER TABLE `portal_questionnaires`
    MODIFY COLUMN `use_context` ENUM('checkin', 'followup', 'both', 'evisit')
        NOT NULL DEFAULT 'checkin';

-- ----------------------------------------------------------------------------
-- What a patient is allowed to raise an e-visit about.
--
-- One row per accepted complaint, each pointing at the questionnaire that asks
-- about it. Same reasoning as M14's health-maintenance items and M16's package
-- visibility: which problems are safe to handle without examining somebody is a
-- clinical decision, it is different per hospital, and it belongs in a row with
-- a reason attached rather than in a blanket switch.
--
-- An empty table means the feature is off in practice, which is the right
-- default for something nobody has signed off yet.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portal_evisit_reasons` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,

    -- The patient's words. "A cough or a cold", not "upper respiratory tract
    -- infection".
    `patient_label` VARCHAR(255) NOT NULL,
    `patient_blurb` VARCHAR(500) NULL,

    -- Which questionnaire to ask. NULL falls back to the general e-visit form.
    `questionnaire_id` INT(11) NULL,

    -- Said on the form before they start, so somebody with the wrong problem
    -- stops before typing it all out.
    `not_for_text` VARCHAR(500) NULL,

    `is_patient_visible` TINYINT(1) NOT NULL DEFAULT 0,
    `hide_reason` VARCHAR(255) NULL,
    `sequence` INT(11) NOT NULL DEFAULT 0,

    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` INT(11) NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_portal_evisit_reason_code` (`code`),
    KEY `idx_portal_evisit_reason_visible` (`is_patient_visible`, `sequence`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- One e-visit.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portal_evisits` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `patient_id` INT(11) NOT NULL,

    -- A reference the patient can quote on the phone.
    `evisit_no` VARCHAR(40) NOT NULL,

    `reason_id` INT(11) NULL,
    `reason_code` VARCHAR(50) NULL,
    -- Snapshotted, like M16's estimate titles: rewording a reason later must
    -- not change what an answered case says it was about.
    `reason_label` VARCHAR(255) NOT NULL,

    `questionnaire_id` INT(11) NULL,
    `questionnaire_code` VARCHAR(50) NULL,

    -- The answers AND the question labels as they were asked, as JSON. The
    -- labels are stored with them for the same reason M13 snapshots its
    -- assignment title: a questionnaire edited next month must not silently
    -- change what a patient appears to have been asked.
    `answers` LONGTEXT NULL,

    -- 'submitted'  waiting for a clinician
    -- 'answered'   a clinician has replied
    -- 'refused'    a red-flag answer stopped it; NOT in any queue
    -- 'withdrawn'  the patient took it back before anyone replied
    -- 'closed'     finished, no further follow-up accepted
    `status` ENUM('submitted', 'answered', 'refused', 'withdrawn', 'closed')
        NOT NULL DEFAULT 'submitted',

    `submitted_at` DATETIME NOT NULL,

    -- When the hospital said it would reply by. Stored rather than computed so
    -- that changing the policy later does not retroactively make old cases look
    -- late, or on time.
    `due_by` DATETIME NULL,

    -- Claimed, so two clinicians do not both write a reply to the same case.
    -- Advisory only: it does not lock anything, it just shows on the queue.
    `claimed_by` INT(11) NULL,
    `claimed_at` DATETIME NULL,

    `answered_by` INT(11) NULL,
    `answered_at` DATETIME NULL,

    -- What the clinician decided. Deliberately has no 'prescribed' value: see
    -- the header.
    `outcome` ENUM('advice', 'come_in', 'emergency', 'referred', 'test_ordered') NULL,

    -- The encounter this produced. The note, orders and billing hang off this,
    -- through the normal screens.
    `encounter_id` INT(11) NULL,

    -- Red-flag handling. Kept on refused rows so the hospital can see how often
    -- this happens and for what.
    `red_flag_triggered` TINYINT(1) NOT NULL DEFAULT 0,
    `red_flag_keys` VARCHAR(500) NULL,
    `red_flag_note` VARCHAR(500) NULL,
    `alert_id` INT(11) NULL,

    `withdrawn_at` DATETIME NULL,
    `closed_at` DATETIME NULL,
    `closed_by` INT(11) NULL,

    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL,
    `deleted_by` INT(11) NULL,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_portal_evisit_no` (`evisit_no`),
    KEY `idx_portal_evisit_patient` (`patient_id`, `status`, `deleted_at`),
    -- The queue reads this: waiting cases, oldest first.
    KEY `idx_portal_evisit_queue` (`status`, `due_by`),
    KEY `idx_portal_evisit_encounter` (`encounter_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- The thread: the clinician's reply, and a follow-up question or two.
--
-- A table rather than reply_text / follow_up_text columns on the e-visit,
-- because the one-follow-up rule is then enforced by counting rows instead of
-- by whether a column happens to be null, and because a second reply does not
-- have to overwrite the first.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portal_evisit_messages` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `evisit_id` INT(11) NOT NULL,

    `author_type` ENUM('patient', 'clinician') NOT NULL,
    `author_user_id` INT(11) NULL,

    `body` TEXT NOT NULL,

    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_portal_evisit_message` (`evisit_id`, `created_at`),
    CONSTRAINT `fk_portal_evisit_message_evisit`
        FOREIGN KEY (`evisit_id`) REFERENCES `portal_evisits` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Policy.
--
-- portal_evisit_reply_hours is the promise the hospital makes. It is not
-- decoration: the queue sorts by it and the patient is shown it, so setting it
-- to something nobody can meet produces visibly late cases rather than quiet
-- ones.
--
-- portal_evisit_max_open defaults to 1. An e-visit is a consultation, and a
-- patient with four open consultations about four problems is a patient who
-- should be seen.
-- ----------------------------------------------------------------------------
ALTER TABLE `general_settings`
    ADD COLUMN IF NOT EXISTS `portal_allow_evisits` TINYINT(1) NOT NULL DEFAULT 0
        COMMENT 'M15a: patients can raise an asynchronous e-visit. Off until clinically signed off.',
    ADD COLUMN IF NOT EXISTS `portal_evisit_reply_hours` INT(11) NOT NULL DEFAULT 24
        COMMENT 'M15a: hours the hospital undertakes to reply within',
    ADD COLUMN IF NOT EXISTS `portal_evisit_max_open` INT(11) NOT NULL DEFAULT 1
        COMMENT 'M15a: how many e-visits one patient may have open at once',
    ADD COLUMN IF NOT EXISTS `portal_evisit_followup_days` INT(11) NOT NULL DEFAULT 7
        COMMENT 'M15a: days after a reply during which one follow-up question is accepted';
