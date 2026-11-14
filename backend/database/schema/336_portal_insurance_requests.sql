-- ============================================================================
-- Migration: 336_portal_insurance_requests.sql
-- My Chart Phase M12: a patient asking for their insurance on file to be added,
-- corrected or removed.
--
-- The rule is the one e-check-in already states in PortalCheckinService: a
-- patient never edits the insurance record itself -- the desk does that with the
-- card in hand. e-Check-in could only capture "something changed" as a sentence
-- on one appointment, and only in the 48 hours before it. This gives the same
-- idea a life of its own: a request, with the proposed values, at any time, that
-- a staff member applies or declines.
--
-- So these rows are NOT coverage. `patient_insurances` stays the only record of
-- what the hospital will bill, and nothing here reaches it until somebody
-- accepts the request, at which point the service performs the insert, update or
-- soft-delete itself. A patient claiming to have PhilHealth does not make it so.
--
-- `patient_insurance_id` is the row being changed, and NULL means "add new
-- coverage". `insurance_id` is the payer they picked from the list;
-- `insurer_name_text` is there because the list will not always have their HMO,
-- and a request naming an unknown insurer is still useful to the desk -- better
-- than forcing them to pick the wrong one.
--
-- `upload_id` points at the card photograph when they sent one (patient_uploads,
-- schema 335). Nullable, because the app cannot take photographs yet and because
-- a correction to a policy number needs no picture.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `patient_insurance_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `requested_by` INT NULL DEFAULT NULL COMMENT 'users.id -- the patient, or a proxy acting for them',
    `action` ENUM('add', 'update', 'remove') NOT NULL,
    `patient_insurance_id` INT NULL DEFAULT NULL COMMENT 'the coverage being changed; NULL when adding',

    -- What the patient says it should be. Deliberately mirrors patient_insurances
    -- rather than being a free-text blob, so the desk can apply it in one click
    -- instead of retyping from a paragraph.
    `insurance_id` INT NULL DEFAULT NULL COMMENT 'insurances.id, when they found their insurer in the list',
    `insurer_name_text` VARCHAR(255) NULL DEFAULT NULL COMMENT 'what they typed when it was not in the list',
    `insurance_type` ENUM('primary', 'secondary', 'tertiary') NULL DEFAULT NULL,
    `policy_number` VARCHAR(100) NULL DEFAULT NULL,
    `group_number` VARCHAR(100) NULL DEFAULT NULL,
    `subscriber_name` VARCHAR(255) NULL DEFAULT NULL,
    `effective_date` DATE NULL DEFAULT NULL,

    `note` VARCHAR(500) NULL DEFAULT NULL COMMENT 'what changed, in the patient''s words',
    `upload_id` INT NULL DEFAULT NULL COMMENT 'patient_uploads.id -- the card photograph, when sent',

    `status` ENUM('pending', 'applied', 'declined') NOT NULL DEFAULT 'pending',
    `reviewed_by` INT NULL DEFAULT NULL,
    `reviewed_at` DATETIME NULL DEFAULT NULL,
    `review_note` VARCHAR(255) NULL DEFAULT NULL COMMENT 'why it was declined; the patient reads this',
    `applied_insurance_id` INT NULL DEFAULT NULL COMMENT 'patient_insurances.id written or changed on apply',

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL DEFAULT NULL,
    `deleted_by` INT NULL DEFAULT NULL,

    INDEX `idx_pir_patient` (`patient_id`, `created_at`),
    INDEX `idx_pir_status` (`status`, `created_at`),
    CONSTRAINT `fk_pir_patient`
        FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
        ON UPDATE NO ACTION ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Policy, beside the other portal settings (schemas 296, 334, 335).
ALTER TABLE `general_settings`
    ADD COLUMN IF NOT EXISTS `portal_allow_insurance_requests` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS `portal_insurance_max_pending` INT NOT NULL DEFAULT 3;
