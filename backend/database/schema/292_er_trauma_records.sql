-- ============================================================================
-- Migration: 292_er_trauma_records.sql
-- Module: Emergency Department (ED) / Triage — Trauma & Resuscitation Fast-Sheet
-- Description:
--   High-velocity trauma registry & resuscitation fast-sheet (MVCs, falls,
--   penetrating wounds) featuring:
--   1. Glasgow Coma Scale (GCS) Calculator (Eye 1-4, Verbal 1-5, Motor 1-6 = Total 3-15)
--   2. ATLS Primary Survey Checklist (Airway with C-spine, Breathing,
--      Circulation & Hemorrhage, Disability/Pupils, Exposure)
--   3. FAST / eFAST Bedside Ultrasound Result (Negative, Positive Free Fluid,
--      Indeterminate) with 5-window breakdown.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `er_trauma_records` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `trauma_record_no` VARCHAR(40) NOT NULL,
    `visit_id` INT UNSIGNED NOT NULL,
    `patient_id` INT UNSIGNED NULL DEFAULT NULL,
    `resuscitation_timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Trauma Activation & Mechanism of Injury (MOI)
    `trauma_activation_level` ENUM(
        'Level 1 - Full Trauma Team Activation',
        'Level 2 - Modified Trauma Activation',
        'Level 3 - Trauma Consult / Fast-Track'
    ) NOT NULL DEFAULT 'Level 1 - Full Trauma Team Activation',
    `mechanism_of_injury` VARCHAR(120) NOT NULL,
    `injury_details` TEXT NULL DEFAULT NULL,
    `injury_timestamp` DATETIME NULL DEFAULT NULL,

    -- 1. Glasgow Coma Scale (GCS) Calculator (Eye 1-4, Verbal 1-5, Motor 1-6 = Total 3-15)
    `gcs_eye` TINYINT UNSIGNED NOT NULL DEFAULT 4 COMMENT '1=None, 2=To Pain/Pressure, 3=To Speech, 4=Spontaneous',
    `gcs_verbal` TINYINT UNSIGNED NOT NULL DEFAULT 5 COMMENT '1=None, 2=Incomprehensible, 3=Inappropriate, 4=Confused, 5=Oriented',
    `gcs_motor` TINYINT UNSIGNED NOT NULL DEFAULT 6 COMMENT '1=None, 2=Extension, 3=Flexion, 4=Withdrawal, 5=Localizes, 6=Obeys',
    `gcs_total` TINYINT UNSIGNED NOT NULL DEFAULT 15 COMMENT 'Sum of Eye + Verbal + Motor (3 to 15)',
    `gcs_intubated_flag` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 if patient is intubated (e.g. GCS 8T)',
    `gcs_severity_label` VARCHAR(60) NOT NULL DEFAULT 'Mild / Alert (GCS 13-15)',

    -- 2. ATLS Primary Survey Checklist (A - B - C - D - E)
    `atls_airway_status` VARCHAR(120) NOT NULL DEFAULT 'Patent & Self-Maintaining',
    `atls_cspine_immobilized` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Rigid C-Collar / Inline C-Spine Stabilization',
    `atls_airway_notes` TEXT NULL DEFAULT NULL,

    `atls_breathing_status` VARCHAR(120) NOT NULL DEFAULT 'Bilateral Equal Breath Sounds',
    `atls_breathing_notes` TEXT NULL DEFAULT NULL,

    `atls_circulation_status` VARCHAR(120) NOT NULL DEFAULT 'Hemodynamically Stable',
    `atls_circulation_notes` TEXT NULL DEFAULT NULL,

    `atls_disability_pupils` VARCHAR(120) NOT NULL DEFAULT 'PERRLA (Equal, Round, Reactive)',
    `atls_disability_notes` TEXT NULL DEFAULT NULL,

    `atls_exposure_notes` TEXT NULL DEFAULT NULL,
    `atls_checklist_json` TEXT NULL DEFAULT NULL COMMENT 'JSON array of completed ATLS resuscitation interventions',

    -- 3. FAST / eFAST Bedside Ultrasound Result
    `fast_exam_result` ENUM(
        'Negative',
        'Positive Free Fluid',
        'Indeterminate',
        'Not Performed'
    ) NOT NULL DEFAULT 'Negative',
    `fast_ruq_morison` VARCHAR(40) NOT NULL DEFAULT 'Negative' COMMENT 'RUQ / Hepatorenal (Morison Pouch)',
    `fast_luq_splenorenal` VARCHAR(40) NOT NULL DEFAULT 'Negative' COMMENT 'LUQ / Perisplenic',
    `fast_pelvis_pouch` VARCHAR(40) NOT NULL DEFAULT 'Negative' COMMENT 'Suprapubic / Pelvic',
    `fast_pericardial` VARCHAR(40) NOT NULL DEFAULT 'Negative' COMMENT 'Subxiphoid / Pericardial',
    `efast_thorax_pneumo` VARCHAR(40) NOT NULL DEFAULT 'Negative' COMMENT 'Bilateral Thorax Lung Sliding',
    `fast_notes` TEXT NULL DEFAULT NULL,

    -- Resuscitation Hemodynamics & Disposition Plan
    `bp_systolic` INT NULL DEFAULT NULL,
    `bp_diastolic` INT NULL DEFAULT NULL,
    `heart_rate` INT NULL DEFAULT NULL,
    `resp_rate` INT NULL DEFAULT NULL,
    `spo2` INT NULL DEFAULT NULL,
    `shock_index` DECIMAL(4,2) NULL DEFAULT NULL COMMENT 'HR / SBP (>0.9 indicates occult hemorrhagic shock)',
    `resuscitation_summary` TEXT NULL DEFAULT NULL,
    `trauma_disposition_plan` VARCHAR(120) NULL DEFAULT NULL,

    -- Trauma Team Sign-Off
    `trauma_team_leader_id` INT UNSIGNED NULL DEFAULT NULL,
    `trauma_team_leader_name` VARCHAR(120) NOT NULL,
    `recorded_by_id` INT UNSIGNED NULL DEFAULT NULL,
    `recorded_by_name` VARCHAR(120) NULL DEFAULT NULL,

    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_er_trauma_record_no` (`trauma_record_no`),
    KEY `idx_etr_visit_id` (`visit_id`),
    KEY `idx_etr_patient_id` (`patient_id`),
    KEY `idx_etr_timestamp` (`resuscitation_timestamp`),
    KEY `idx_etr_fast_result` (`fast_exam_result`),
    KEY `idx_etr_gcs_total` (`gcs_total`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
