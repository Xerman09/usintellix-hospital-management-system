-- 104_surgical_safety_checklists.sql
-- JCAHO: Surgical Safety & Universal Protocol "Time-Out" Audit Schema

CREATE TABLE IF NOT EXISTS `surgical_safety_checklists` (
    `id`                                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `case_number`                           VARCHAR(30)   NOT NULL UNIQUE,
    `surgery_date`                          DATE          NOT NULL,
    `or_suite`                              VARCHAR(50)   NOT NULL,
    `patient_id`                            INT UNSIGNED  DEFAULT NULL,
    `patient_name`                          VARCHAR(200)  NOT NULL,
    `patient_mrn`                           VARCHAR(80)   NOT NULL,
    `patient_age`                           INT UNSIGNED  NOT NULL,
    `gender`                                ENUM('Male', 'Female', 'Other') NOT NULL DEFAULT 'Male',
    `procedure_planned`                     VARCHAR(255)  NOT NULL,
    `procedure_actual`                      VARCHAR(255)  DEFAULT NULL,
    `surgical_specialty`                    VARCHAR(150)  NOT NULL,
    `operating_surgeon`                     VARCHAR(200)  NOT NULL,
    `anesthesiologist`                      VARCHAR(200)  NOT NULL,
    `circulating_nurse`                     VARCHAR(200)  NOT NULL,
    `scrub_nurse`                           VARCHAR(200)  DEFAULT NULL,

    -- Phase 1: Sign-In / Pre-Procedure
    `patient_identity_confirmed`            TINYINT(1)    NOT NULL DEFAULT 1,
    `surgical_consent_confirmed`            TINYINT(1)    NOT NULL DEFAULT 1,
    `site_marking_required`                 TINYINT(1)    NOT NULL DEFAULT 1,
    `site_marked_by_surgeon`                TINYINT(1)    NOT NULL DEFAULT 1,
    `anesthesia_safety_check_done`          TINYINT(1)    NOT NULL DEFAULT 1,
    `pulse_oximeter_functioning`            TINYINT(1)    NOT NULL DEFAULT 1,
    `allergy_check_done`                    TINYINT(1)    NOT NULL DEFAULT 1,
    `airway_aspiration_risk`                TINYINT(1)    NOT NULL DEFAULT 0,
    `blood_loss_risk_over_500ml`            TINYINT(1)    NOT NULL DEFAULT 0,

    -- Phase 2: Time-Out (Pre-Incision)
    `time_out_performed`                    TINYINT(1)    NOT NULL DEFAULT 1,
    `time_out_timestamp`                    VARCHAR(20)   DEFAULT NULL,
    `team_members_introduced`               TINYINT(1)    NOT NULL DEFAULT 1,
    `patient_name_verbally_confirmed`       TINYINT(1)    NOT NULL DEFAULT 1,
    `procedure_verbally_confirmed`          TINYINT(1)    NOT NULL DEFAULT 1,
    `site_laterality_verbally_confirmed`    TINYINT(1)    NOT NULL DEFAULT 1,
    `patient_position_confirmed`            TINYINT(1)    NOT NULL DEFAULT 1,
    `antibiotic_prophylaxis_given`          TINYINT(1)    NOT NULL DEFAULT 1,
    `antibiotic_timing_within_60min`        TINYINT(1)    NOT NULL DEFAULT 1,
    `essential_imaging_displayed`           TINYINT(1)    NOT NULL DEFAULT 1,
    `implants_hardware_verified`            TINYINT(1)    NOT NULL DEFAULT 1,
    `near_miss_caught`                      TINYINT(1)    NOT NULL DEFAULT 0,
    `near_miss_details`                     TEXT          DEFAULT NULL,

    -- Phase 3: Sign-Out (Post-Procedure Debriefing)
    `sign_out_performed`                    TINYINT(1)    NOT NULL DEFAULT 1,
    `procedure_recorded_accurately`         TINYINT(1)    NOT NULL DEFAULT 1,
    `sponge_needle_count_status`            ENUM('Correct & Reconciled', 'Discrepancy Resolved on Recount', 'Unresolved Discrepancy - X-Ray Ordered', 'Not Applicable') NOT NULL DEFAULT 'Correct & Reconciled',
    `specimen_labeled_correctly`            TINYINT(1)    NOT NULL DEFAULT 1,
    `equipment_malfunction_noted`           TINYINT(1)    NOT NULL DEFAULT 0,
    `equipment_issues_details`              TEXT          DEFAULT NULL,
    `postop_recovery_concerns`              TEXT          DEFAULT NULL,

    -- Audit & Quality Result
    `universal_protocol_compliant`          TINYINT(1)    NOT NULL DEFAULT 1,
    `non_compliance_reason`                 TEXT          DEFAULT NULL,
    `status`                                ENUM('Completed - Fully Compliant', 'Completed - Minor Variance', 'Completed - Near-Miss Caught', 'Non-Compliant Protocol Breach', 'Under Peer Review') NOT NULL DEFAULT 'Completed - Fully Compliant',
    `notes`                                 TEXT          DEFAULT NULL,
    `created_at`                            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`                            DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_surgery_date        (`surgery_date`),
    INDEX idx_or_suite            (`or_suite`),
    INDEX idx_surgical_specialty  (`surgical_specialty`),
    INDEX idx_operating_surgeon   (`operating_surgeon`),
    INDEX idx_universal_protocol  (`universal_protocol_compliant`),
    INDEX idx_near_miss_caught    (`near_miss_caught`),
    INDEX idx_status              (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
