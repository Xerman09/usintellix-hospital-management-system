-- =============================================
-- Migration 212: encounter_eye_exams
-- Structured Eye Exam (Ophthalmology/Optometry) documentation
-- linked to patient encounter under HIPAA Security & Privacy Rules
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_eye_exams (
    id INT NOT NULL AUTO_INCREMENT,
    encounter_id INT NOT NULL,
    patient_id INT NOT NULL,
    
    -- Status & Lock
    locked_at DATETIME NULL,
    locked_by INT NULL,
    
    -- Sub-sections structured JSON data
    hpi_data JSON NULL,
    pmsfh_data JSON NULL,
    physical_exam_data JSON NULL,
    external_exam_data JSON NULL,
    anterior_segment_data JSON NULL,
    retina_data JSON NULL,
    neuro_data JSON NULL,
    impression_plan_data JSON NULL,
    
    -- Flat quick search / summary fields
    chief_complaint TEXT NULL,
    new_dx TEXT NULL,
    
    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    deleted_at DATETIME NULL,
    deleted_by INT NULL,

    PRIMARY KEY (id),
    INDEX idx_eye_exams_encounter (encounter_id),
    INDEX idx_eye_exams_patient (patient_id),
    INDEX idx_eye_exams_created_by (created_by),
    INDEX idx_eye_exams_deleted_by (deleted_by),

    CONSTRAINT fk_eye_exams_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE,

    CONSTRAINT fk_eye_exams_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
