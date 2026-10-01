-- =============================================
-- Migration 223: encounter_gad7
-- General Anxiety Disorder 7 (GAD-7) documentation
-- linked to patient encounter under HIPAA Security & Privacy Rules
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_gad7 (
    id INT NOT NULL AUTO_INCREMENT,
    encounter_id INT NOT NULL,
    patient_id INT NOT NULL,
    
    q1_feeling_nervous INT NULL,
    q2_control_worrying INT NULL,
    q3_worrying_too_much INT NULL,
    q4_trouble_relaxing INT NULL,
    q5_hard_to_sit_still INT NULL,
    q6_easily_annoyed INT NULL,
    q7_feeling_afraid INT NULL,
    
    total_score INT NOT NULL DEFAULT 0,
    severity VARCHAR(100) NOT NULL DEFAULT 'No anxiety disorder',
    
    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    deleted_at DATETIME NULL,
    deleted_by INT NULL,

    PRIMARY KEY (id),
    INDEX idx_gad7_encounter (encounter_id),
    INDEX idx_gad7_patient (patient_id),
    INDEX idx_gad7_created_by (created_by),
    INDEX idx_gad7_deleted_by (deleted_by),

    CONSTRAINT fk_gad7_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE,

    CONSTRAINT fk_gad7_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
