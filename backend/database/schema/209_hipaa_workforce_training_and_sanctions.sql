-- ==============================================================================
-- Migration 209: Workforce HIPAA Training Tracking & Disciplinary Sanctions Log
-- Statutory Citations:
--   - 45 CFR § 164.308(a)(5): Security awareness and training (30-day & annual)
--   - 45 CFR § 164.308(a)(1)(ii)(C): Sanction policy (Mandatory disciplinary log)
-- ==============================================================================

-- 1. Extend employees table with HIPAA certification fields
ALTER TABLE `employees`
    ADD COLUMN `hipaa_initial_training_date` DATE NULL AFTER `phone`,
    ADD COLUMN `hipaa_last_refresher_date` DATE NULL AFTER `hipaa_initial_training_date`,
    ADD COLUMN `hipaa_next_refresher_due` DATE NULL AFTER `hipaa_last_refresher_date`,
    ADD COLUMN `hipaa_training_status` ENUM('compliant', 'approaching_due', 'overdue', 'exempt') NOT NULL DEFAULT 'overdue' AFTER `hipaa_next_refresher_due`,
    ADD COLUMN `hipaa_training_score` DECIMAL(5,2) NULL AFTER `hipaa_training_status`,
    ADD COLUMN `hipaa_cert_ref` VARCHAR(100) NULL AFTER `hipaa_training_score`,
    ADD COLUMN `hipaa_curriculum_name` VARCHAR(255) NULL AFTER `hipaa_cert_ref`;

ALTER TABLE `employees`
    ADD INDEX `idx_emp_hipaa_training_status` (`hipaa_training_status`),
    ADD INDEX `idx_emp_hipaa_refresher_due` (`hipaa_next_refresher_due`);

-- 2. Create hipaa_workforce_trainings historical ledger
CREATE TABLE IF NOT EXISTS `hipaa_workforce_trainings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `employee_id` INT NOT NULL,
    `user_id` INT NULL,
    `training_type` ENUM('initial_orientation', 'annual_refresher', 'remedial_post_incident', 'specialized_role_based') NOT NULL,
    `curriculum_title` VARCHAR(255) NOT NULL,
    `completion_date` DATE NOT NULL,
    `expiration_date` DATE NOT NULL,
    `score_percent` DECIMAL(5,2) NULL,
    `passing_threshold` DECIMAL(5,2) NOT NULL DEFAULT 80.00,
    `status` ENUM('passed', 'failed', 'in_progress') NOT NULL DEFAULT 'passed',
    `certificate_code` VARCHAR(100) NOT NULL UNIQUE,
    `delivery_method` ENUM('lms_elearning', 'classroom_instructor', 'proctored_assessment', 'external_accredited') NOT NULL DEFAULT 'lms_elearning',
    `trainer_or_proctor` VARCHAR(255) NULL,
    `verification_officer_id` INT NULL,
    `verification_notes` TEXT NULL,
    `created_at` DATETIME NOT NULL,
    `created_by` INT NULL,
    INDEX `idx_trainings_emp` (`employee_id`),
    INDEX `idx_trainings_user` (`user_id`),
    INDEX `idx_trainings_type` (`training_type`),
    INDEX `idx_trainings_comp_date` (`completion_date`),
    INDEX `idx_trainings_exp_date` (`expiration_date`),
    INDEX `idx_trainings_status` (`status`),
    INDEX `idx_trainings_cert` (`certificate_code`),
    CONSTRAINT `fk_trainings_employee`
        FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_trainings_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 3. Create hipaa_workforce_sanctions disciplinary ledger
CREATE TABLE IF NOT EXISTS `hipaa_workforce_sanctions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sanction_code` VARCHAR(50) NOT NULL UNIQUE,
    `employee_id` INT NOT NULL,
    `user_id` INT NULL,
    `incident_id` BIGINT UNSIGNED NULL,
    `violation_date` DATE NOT NULL,
    `reported_date` DATE NOT NULL,
    `violation_category` ENUM(
        'unauthorized_phi_snooping',
        'improper_phi_disclosure',
        'credential_sharing',
        'unencrypted_device',
        'failure_to_report_incident',
        'phishing_social_engineering',
        'willful_neglect_data_theft',
        'other_policy_breach'
    ) NOT NULL,
    `severity_level` ENUM('minor', 'moderate', 'serious', 'critical_gross_misconduct') NOT NULL,
    `disciplinary_action` ENUM(
        'verbal_counseling',
        'written_reprimand',
        'suspension_without_pay',
        'immediate_termination',
        'credential_revocation_referral'
    ) NOT NULL,
    `investigation_findings` TEXT NOT NULL,
    `disciplinary_rationale` TEXT NOT NULL,
    `sanction_effective_date` DATE NOT NULL,
    `sanction_end_date` DATE NULL,
    `suspension_days` INT NULL DEFAULT 0,
    `remediation_required` ENUM('mandatory_retraining', 'supervised_audit_period', 'access_downgrade', 'none') NOT NULL DEFAULT 'mandatory_retraining',
    `remediation_deadline` DATE NULL,
    `remediation_completed_date` DATE NULL,
    `sanctioning_officer_name` VARCHAR(255) NOT NULL,
    `sanctioning_officer_role` VARCHAR(255) NOT NULL,
    `signoff_date` DATE NOT NULL,
    `appeal_status` ENUM('none', 'pending_appeal', 'appeal_upheld', 'appeal_denied') NOT NULL DEFAULT 'none',
    `status` ENUM('under_investigation', 'sanction_imposed', 'remediation_active', 'closed_remediated', 'appealed') NOT NULL DEFAULT 'sanction_imposed',
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL,
    `created_by` INT NULL,
    INDEX `idx_sanctions_emp` (`employee_id`),
    INDEX `idx_sanctions_user` (`user_id`),
    INDEX `idx_sanctions_incident` (`incident_id`),
    INDEX `idx_sanctions_code` (`sanction_code`),
    INDEX `idx_sanctions_date` (`violation_date`),
    INDEX `idx_sanctions_cat` (`violation_category`),
    INDEX `idx_sanctions_sev` (`severity_level`),
    INDEX `idx_sanctions_action` (`disciplinary_action`),
    INDEX `idx_sanctions_status` (`status`),
    CONSTRAINT `fk_sanctions_employee`
        FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_sanctions_user`
        FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_sanctions_incident`
        FOREIGN KEY (`incident_id`) REFERENCES `hipaa_security_incidents` (`id`)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
