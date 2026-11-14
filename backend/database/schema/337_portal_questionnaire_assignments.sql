-- ============================================================================
-- Migration: 337_portal_questionnaire_assignments.sql
-- My Chart Phase M13: questionnaires sent out between visits.
--
-- The questionnaire engine built for e-check-in (schema 305) only ever ran
-- inside the two days before an appointment. A PHQ-9 follow-up, a post-operative
-- check or a symptom diary has nothing to do with a booking -- it is sent after
-- a visit, answered at home, and read before the next one. This table is that
-- send: one row per questionnaire given to one patient, with a due date.
--
-- portal_questionnaire_assignments carries the score as well as the answers,
-- because a score has to be readable without re-adding the items. The answers
-- themselves go in portal_questionnaire_responses, the table e-check-in already
-- writes, so there stays one place a patient's answers live.
--
-- Where a home-completed PHQ-9 does NOT go, and why: encounter_phq9 and
-- encounter_gad7 (schemas 222-225) have encounter_id NOT NULL with a foreign key
-- to encounters, and one row per encounter. A questionnaire answered at home has
-- no encounter. Attaching it to the encounter it followed from would overwrite
-- the score the clinician keyed in at that visit, and inventing an encounter for
-- a questionnaire would put a visit in the record that never happened. So the
-- home score is authoritative here, and PortalQuestionnaireService::scoreHistory()
-- reads the in-visit and at-home scores into one timeline, each flagged by where
-- it came from. A clinician comparing today against the last visit gets both; no
-- row anywhere claims a visit took place.
--
-- The `use_context` column added to portal_questionnaires keeps the two catalogues
-- apart. It defaults to 'checkin', so every questionnaire that exists today
-- stays an e-check-in questionnaire and the follow-up picker starts empty.
-- ============================================================================

SET NAMES utf8mb4;

ALTER TABLE `portal_questionnaires`
    ADD COLUMN IF NOT EXISTS `use_context` ENUM('checkin', 'followup', 'both') NOT NULL DEFAULT 'checkin'
        COMMENT 'checkin = offered during e-check-in; followup = sendable between visits'
        AFTER `specialty`;

CREATE TABLE IF NOT EXISTS `portal_questionnaire_assignments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,

    -- How the answers are scored and labelled. 'questionnaire' means the
    -- questions come from portal_questionnaires (questionnaire_id); 'phq9' and
    -- 'gad7' mean they come from the instrument itself, which is why those two
    -- leave questionnaire_id NULL.
    `instrument` ENUM('questionnaire', 'phq9', 'gad7') NOT NULL DEFAULT 'questionnaire',
    `questionnaire_id` INT NULL DEFAULT NULL,

    -- The name at the time of sending. A questionnaire renamed later must not
    -- change what the patient was told they were answering.
    `title` VARCHAR(150) NOT NULL,
    `reason` VARCHAR(500) NULL DEFAULT NULL COMMENT 'why it was sent; the patient reads this',

    `encounter_id` INT NULL DEFAULT NULL COMMENT 'the visit it follows from, where there is one',
    `due_date` DATE NULL DEFAULT NULL,

    `status` ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    `assigned_by` INT NULL DEFAULT NULL,
    `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `opened_at` DATETIME NULL DEFAULT NULL COMMENT 'first time the patient opened it',
    `completed_at` DATETIME NULL DEFAULT NULL,
    `cancelled_at` DATETIME NULL DEFAULT NULL,
    `cancelled_by` INT NULL DEFAULT NULL,
    `cancel_reason` VARCHAR(255) NULL DEFAULT NULL,

    `response_id` INT NULL DEFAULT NULL COMMENT 'portal_questionnaire_responses.id',
    `total_score` INT NULL DEFAULT NULL COMMENT 'scored instruments only',
    `severity` VARCHAR(100) NULL DEFAULT NULL COMMENT 'the instrument''s own band, not a diagnosis',

    `alert_id` INT NULL DEFAULT NULL COMMENT 'the alert a crossing score raised, if any',
    `alerted_at` DATETIME NULL DEFAULT NULL,

    `reviewed_by` INT NULL DEFAULT NULL,
    `reviewed_at` DATETIME NULL DEFAULT NULL,

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL DEFAULT NULL,

    INDEX `idx_pqa_patient` (`patient_id`, `status`, `due_date`),
    INDEX `idx_pqa_queue` (`status`, `due_date`),
    INDEX `idx_pqa_review` (`instrument`, `completed_at`),
    INDEX `idx_pqa_encounter` (`encounter_id`),
    CONSTRAINT `fk_pqa_patient`
        FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
        ON UPDATE NO ACTION ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Policy, beside the other portal settings (schemas 296, 334, 335, 336).
-- portal_questionnaire_grace_days keeps a questionnaire answerable for a while
-- after its due date: a patient who answers two days late should still be heard,
-- and the alternative is a dead link and a phone call.
ALTER TABLE `general_settings`
    ADD COLUMN IF NOT EXISTS `portal_allow_questionnaires` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS `portal_questionnaire_grace_days` INT NOT NULL DEFAULT 14;

-- The answers still go in portal_questionnaire_responses, the table e-check-in
-- writes, so there stays one place a patient's answers live. This column says
-- which send they belong to; NULL means it came from e-check-in.
ALTER TABLE `portal_questionnaire_responses`
    ADD COLUMN IF NOT EXISTS `assignment_id` INT NULL DEFAULT NULL
        COMMENT 'portal_questionnaire_assignments.id -- NULL for an e-check-in answer'
        AFTER `questionnaire_id`,
    ADD INDEX IF NOT EXISTS `idx_pqr_assignment` (`assignment_id`);
