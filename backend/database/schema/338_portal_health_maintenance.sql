-- ============================================================================
-- Migration: 338_portal_health_maintenance.sql
-- My Chart Phase M14: what you are due for.
--
-- practice_rules (schema 009/010/148) and patient_reminders (143) already
-- decide who should be reminded of what, and patient_reminder_actions (173)
-- records that staff did something about it. Three things are missing before
-- any of it can be shown to a patient, and this migration adds exactly those.
--
-- 1. THERE IS NO RECURRENCE INTERVAL ANYWHERE.
--    practice_rules.reminder_intervals holds only warning and past-due offsets
--    (every seeded rule carries the same "2 Week / 1 Month" placeholder), which
--    say how long after a reminder is RAISED it starts to look late. Nothing
--    says a Pap smear is due every three years. Without that there is no
--    next-due date, and a screening panel without dates is just a list of
--    words. portal_health_maintenance_items.recurrence_val/_unit is that
--    interval.
--
-- 2. item_label IS CLINICAL TEXT. It comes from actions_list[0].category_title,
--    so it reads "Assessment - Pap Smear". The same lesson as the diagnosis
--    guides in M9: text written for a clinician is not text for a patient. Each
--    item carries its own patient wording -- what it is, why it matters, and
--    how to get it done.
--
-- 3. MOST SEEDED RULES HAVE NO DEMOGRAPHIC CRITERIA AT ALL, and
--    PatientReminderService::matchesDemographics([]) is true for everybody. So
--    every patient in this database currently has a "Data Entry - Social
--    Security Number" reminder and four diabetes reminders, whether or not they
--    are diabetic. Showing patients "the reminders they have" would therefore
--    tell healthy people to book a diabetic eye exam and ask them for a social
--    security number. An item row is the explicit, per-rule decision that this
--    one is fit to show, and needs_condition records the rules that are not --
--    they depend on the patient having the condition, which the engine does not
--    check.
--
-- An item is shown to a patient only when BOTH switches are on: the hospital's
-- existing practice_rules.is_patient_reminder (schema 148), which stays the
-- master switch on the practice-rules screen, AND this row's is_patient_visible,
-- which is what supplies the patient wording and the interval. Neither alone is
-- enough: a flag with no wording has nothing to say, and wording the hospital
-- has not approved should not be said.
--
-- Nothing here is derived-and-stored. The next-due date is computed on read
-- from the last completed action plus the interval, so it cannot go stale the
-- way patient_reminders.due_status does.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `portal_health_maintenance_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `practice_rule_id` INT NOT NULL,

    -- The patient's words for it. patient_label replaces item_label on screen.
    `patient_label` VARCHAR(150) NOT NULL,
    `what_it_is` VARCHAR(500) NULL DEFAULT NULL,
    `why_it_matters` VARCHAR(500) NULL DEFAULT NULL,
    `how_to_get_it` VARCHAR(500) NULL DEFAULT NULL,

    -- How often it comes round. This is the number that did not exist.
    `recurrence_val` INT NOT NULL DEFAULT 1,
    `recurrence_unit` ENUM('Day', 'Week', 'Month', 'Year') NOT NULL DEFAULT 'Year',

    -- How long past the next-due date before it reads as overdue rather than
    -- due. A three-yearly screening a fortnight late is not late.
    `grace_days` INT NOT NULL DEFAULT 30,

    -- The rule applies only to patients who have a condition, which the rules
    -- engine does not check (it matches age and sex). Such an item is never
    -- shown to a patient from the engine alone, whatever is_patient_visible
    -- says -- the column exists so the knowledge is written down rather than
    -- living in whoever remembered to leave the flag off.
    `needs_condition` TINYINT(1) NOT NULL DEFAULT 0,
    `condition_note` VARCHAR(255) NULL DEFAULT NULL COMMENT 'which condition, for whoever wires this up later',

    `is_patient_visible` TINYINT(1) NOT NULL DEFAULT 0,
    `sequence` INT NOT NULL DEFAULT 100,

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` INT NULL DEFAULT NULL,

    UNIQUE KEY `uq_phmi_rule` (`practice_rule_id`),
    INDEX `idx_phmi_visible` (`is_patient_visible`, `sequence`),
    CONSTRAINT `fk_phmi_rule`
        FOREIGN KEY (`practice_rule_id`) REFERENCES `practice_rules` (`id`)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- What the patient asks for about one of their own due items. Two actions, and
-- neither one writes the record:
--
--   book          "please arrange this for me". There is no patient-facing
--                 booking endpoint -- M10 gave patients reschedule, cancel and
--                 confirm on an appointment that already exists, deliberately
--                 not the power to create one. So this is a request the desk
--                 books, which is also how it works at the counter.
--   report_done   "I had this done, elsewhere". A claim, not a fact. On accept
--                 it is written through PatientReminderService::addAction(),
--                 the module's own record of an item being addressed, so the
--                 reminder closes by the same path a staff member would use.
--                 Nothing in patient_reminders is touched by a pending claim:
--                 a patient who misremembers must not be able to silence their
--                 own cancer screening reminder.
CREATE TABLE IF NOT EXISTS `portal_care_gap_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `patient_reminder_id` INT NOT NULL,
    `item_label` VARCHAR(255) NOT NULL COMMENT 'what it was called when asked, so later edits do not rewrite history',

    `action` ENUM('book', 'report_done') NOT NULL,
    `note` VARCHAR(500) NULL DEFAULT NULL COMMENT 'in the patient''s words',

    -- report_done only.
    `done_on` DATE NULL DEFAULT NULL,
    `done_where` VARCHAR(255) NULL DEFAULT NULL,

    `status` ENUM('pending', 'accepted', 'declined', 'withdrawn') NOT NULL DEFAULT 'pending',
    `reviewed_by` INT NULL DEFAULT NULL,
    `reviewed_at` DATETIME NULL DEFAULT NULL,
    `review_note` VARCHAR(255) NULL DEFAULT NULL COMMENT 'the patient reads this',
    `action_id` INT NULL DEFAULT NULL COMMENT 'patient_reminder_actions.id written on accepting a report_done',

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL DEFAULT NULL,

    INDEX `idx_pcgr_patient` (`patient_id`, `status`, `created_at`),
    INDEX `idx_pcgr_queue` (`status`, `created_at`),
    INDEX `idx_pcgr_reminder` (`patient_reminder_id`),
    CONSTRAINT `fk_pcgr_patient`
        FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
        ON UPDATE NO ACTION ON DELETE NO ACTION,
    CONSTRAINT `fk_pcgr_reminder`
        FOREIGN KEY (`patient_reminder_id`) REFERENCES `patient_reminders` (`id`)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Policy, beside the other portal settings (schemas 296, 334, 335, 336, 337).
-- Seeing what you are due for is separate from asking about it: a hospital may
-- want the panel visible while changes still happen at the desk.
ALTER TABLE `general_settings`
    ADD COLUMN IF NOT EXISTS `portal_allow_health_maintenance` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS `portal_allow_care_gap_requests` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS `portal_care_gap_max_pending` INT NOT NULL DEFAULT 5;
