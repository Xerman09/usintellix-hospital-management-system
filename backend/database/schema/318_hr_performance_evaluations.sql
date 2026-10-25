-- =====================================================================
-- Migration 318: Periodic Multi-Source Performance Evaluations
-- Table: hr_performance_evaluations
-- Implements 5-tier scoring rubric:
-- 1. Clinical Competence
-- 2. Bedside Manner & Patient Communication
-- 3. Documentation Accuracy & Timeliness
-- 4. Teamwork & Interprofessional Collaboration
-- 5. Professionalism, Ethics & Compliance
-- Along with qualitative strengths, development goals, and 360-degree multi-source appraisals.
-- =====================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `hr_performance_evaluations` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `evaluation_code` VARCHAR(50) NOT NULL UNIQUE,
    `employee_id` INT NOT NULL,
    `employee_name` VARCHAR(150) NOT NULL,
    `job_title` VARCHAR(100) NOT NULL,
    `department_id` INT NULL,
    `department_name` VARCHAR(100) NULL,
    `evaluation_cycle` ENUM('annual', 'semi_annual', 'probationary', 'recredentialing_peer_review', 'quarterly') NOT NULL DEFAULT 'annual',
    `evaluation_period_start` DATE NOT NULL,
    `evaluation_period_end` DATE NOT NULL,
    `evaluation_year` INT NOT NULL DEFAULT 2026,
    `evaluator_type` ENUM('supervisor', 'peer', 'self', 'multidisciplinary', 'department_chair') NOT NULL DEFAULT 'supervisor',
    `evaluator_id` INT NULL,
    `evaluator_name` VARCHAR(150) NOT NULL,
    `evaluator_title` VARCHAR(100) NOT NULL,

    -- 5-Tier Scoring Rubric (Scale 1.00 to 5.00)
    `score_clinical_competence` DECIMAL(3,2) NOT NULL DEFAULT 3.00,
    `score_bedside_manner` DECIMAL(3,2) NOT NULL DEFAULT 3.00,
    `score_documentation_accuracy` DECIMAL(3,2) NOT NULL DEFAULT 3.00,
    `score_teamwork_ethics` DECIMAL(3,2) NOT NULL DEFAULT 3.00,
    `score_professionalism_compliance` DECIMAL(3,2) NOT NULL DEFAULT 3.00,

    -- Computed Overall Composite Score & Tier
    `overall_score` DECIMAL(3,2) NOT NULL DEFAULT 3.00,
    `performance_tier` ENUM(
        'exceptional',
        'exceeds_expectations',
        'meets_expectations',
        'needs_development',
        'unsatisfactory'
    ) NOT NULL DEFAULT 'meets_expectations',

    -- Qualitative Appraisals
    `key_strengths` TEXT NULL,
    `areas_for_development` TEXT NULL,
    `development_goals` TEXT NULL,
    `action_plan` TEXT NULL,
    `evaluator_recommendation` ENUM(
        'recredential_full_privileges',
        'eligible_for_merit_promotion',
        'regularize_employment',
        'continue_current_tier',
        'targeted_clinical_supervision',
        'performance_improvement_plan'
    ) NOT NULL DEFAULT 'recredential_full_privileges',
    `recommendation_notes` TEXT NULL,

    -- Multi-Source / Sign-Off Workflow
    `status` ENUM('draft', 'submitted', 'under_review', 'acknowledged', 'finalized') NOT NULL DEFAULT 'finalized',
    `employee_comments` TEXT NULL,
    `employee_acknowledged_at` DATETIME NULL,
    `approving_officer_name` VARCHAR(150) NULL,
    `approving_officer_title` VARCHAR(100) NULL,
    `approved_at` DATETIME NULL,
    `created_by` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY `idx_hpe_employee` (`employee_id`),
    KEY `idx_hpe_evaluator` (`evaluator_id`),
    KEY `idx_hpe_year` (`evaluation_year`),
    KEY `idx_hpe_tier` (`performance_tier`),
    KEY `idx_hpe_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize Sequence Counter in billing_tariff_counters
INSERT IGNORE INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
VALUES ('PERF_EVAL', YEAR(NOW()), 0);
