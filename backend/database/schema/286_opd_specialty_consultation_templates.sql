-- ========================================================
-- Migration: 286_opd_specialty_consultation_templates.sql
-- Module: Outpatient Department (OPD) Management
-- Purpose: Specialty-Customized Consultation & SOAP Templates.
--          Supports clinical variables for specialty consultations:
--            * Obstetrics & Gynecology (OB/GYN):
--              - Gravida, Para, TPAL (Term, Preterm, Abortions, Living)
--              - LMP (Last Menstrual Period), EDD (Estimated Date of Delivery)
--              - Gestational age in weeks, Fundal height, Fetal heart rate, Presentation
--            * Pediatrics:
--              - Head circumference, Head circumference percentile
--              - Weight percentile, Height/length percentile
--              - Developmental milestone checklists (Gross motor, Fine motor, Language, Social)
--              - Immunization status & pediatric notes
--            * Orthopedic Surgery:
--              - Affected side (Left, Right, Bilateral, Axial)
--              - Affected joint / anatomical region
--              - Range of motion (ROM)
--              - Weight bearing status
--              - Neurovascular status (pulses, sensation, motor)
--              - Deformity / swelling / effusion
--              - Special orthopedic tests (Lachman, McMurray, SLR, etc.)
--            * Extensible JSON clinical_data for custom clinic variables.
-- ========================================================

CREATE TABLE IF NOT EXISTS opd_specialty_consultation_templates (
    id INT NOT NULL AUTO_INCREMENT,
    specialty_code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'clinical',
    description VARCHAR(255) NULL,
    template_schema LONGTEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_opd_template_code (specialty_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS opd_consultation_specialty_data (
    id INT NOT NULL AUTO_INCREMENT,
    encounter_id INT NOT NULL,
    soap_note_id INT NULL,
    specialty_type VARCHAR(50) NOT NULL DEFAULT 'general',
    template_name VARCHAR(100) NULL,

    -- Obstetrics & Gynecology clinical variables
    gravida INT NULL,
    para INT NULL,
    term_births INT NULL,
    preterm_births INT NULL,
    abortions INT NULL,
    living_children INT NULL,
    lmp DATE NULL,
    edd DATE NULL,
    gestational_age_weeks DECIMAL(4, 1) NULL,
    fundal_height_cm DECIMAL(4, 1) NULL,
    fetal_heart_rate_bpm INT NULL,
    fetal_presentation VARCHAR(50) NULL,

    -- Pediatrics clinical variables
    head_circumference_cm DECIMAL(4, 1) NULL,
    head_circumference_percentile DECIMAL(4, 1) NULL,
    weight_percentile DECIMAL(4, 1) NULL,
    height_length_percentile DECIMAL(4, 1) NULL,
    developmental_milestones LONGTEXT NULL,
    immunization_status VARCHAR(100) NULL,

    -- Orthopedic Surgery clinical variables
    affected_side VARCHAR(20) NULL,
    affected_joint_region VARCHAR(100) NULL,
    range_of_motion TEXT NULL,
    weight_bearing_status VARCHAR(50) NULL,
    neurovascular_status TEXT NULL,
    deformity_swelling TEXT NULL,
    special_orthopedic_tests TEXT NULL,

    -- Dynamic / Extensible custom variables (encrypted or JSON structured)
    clinical_data LONGTEXT NULL,

    -- Audit trail
    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    deleted_at DATETIME NULL,
    deleted_by INT NULL,

    PRIMARY KEY (id),
    INDEX idx_opd_spec_data_encounter (encounter_id),
    INDEX idx_opd_spec_data_soap (soap_note_id),
    INDEX idx_opd_spec_data_specialty (specialty_type),
    INDEX idx_opd_spec_data_created_by (created_by),
    INDEX idx_opd_spec_data_deleted_at (deleted_at),

    CONSTRAINT fk_opd_spec_data_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_opd_spec_data_soap
        FOREIGN KEY (soap_note_id)
        REFERENCES encounter_soap_notes(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default standard OPD Specialty Templates
INSERT INTO opd_specialty_consultation_templates 
    (specialty_code, name, category, description, template_schema, is_active, created_at)
VALUES 
(
    'obstetrics',
    'Obstetrics & Gynecology (OB/GYN)',
    'maternal_health',
    'Antenatal, obstetric, and prenatal clinical tracking: Gravida/Para/TPAL, LMP, EDD, gestational age, fundal height, and fetal evaluation.',
    '{"sections":["obstetrics_history","fetal_assessment"],"fields":["gravida","para","term_births","preterm_births","abortions","living_children","lmp","edd","gestational_age_weeks","fundal_height_cm","fetal_heart_rate_bpm","fetal_presentation"]}',
    1,
    NOW()
),
(
    'pediatrics',
    'Pediatrics & Child Health',
    'child_health',
    'Pediatric growth & developmental consultation: Head circumference percentile, growth percentiles, and developmental milestone checklists.',
    '{"sections":["growth_anthropometrics","milestones"],"fields":["head_circumference_cm","head_circumference_percentile","weight_percentile","height_length_percentile","developmental_milestones","immunization_status"]}',
    1,
    NOW()
),
(
    'orthopedics',
    'Orthopedic Surgery & Musculoskeletal',
    'musculoskeletal',
    'Musculoskeletal evaluation: Affected joint/limb, range of motion, weight bearing status, neurovascular examination, and orthopedic tests.',
    '{"sections":["anatomical_localization","biomechanics_tests"],"fields":["affected_side","affected_joint_region","range_of_motion","weight_bearing_status","neurovascular_status","deformity_swelling","special_orthopedic_tests"]}',
    1,
    NOW()
),
(
    'general',
    'General Outpatient SOAP',
    'general_medicine',
    'Standard ambulatory SOAP note consultation.',
    '{"sections":["standard_soap"],"fields":["subjective","objective","assessment","plan"]}',
    1,
    NOW()
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    template_schema = VALUES(template_schema),
    updated_at = NOW();
