-- =============================================
-- Table: patient_medical_problems
-- Links a patient to a recorded medical problem/issue. The problem may
-- reference the medical_problems catalog (problem_id) or be entered as
-- free text (title only, problem_id left NULL).
-- =============================================

CREATE TABLE IF NOT EXISTS patient_medical_problems (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    problem_id INT NULL,

    title VARCHAR(255) NOT NULL,

    begin_date DATE NULL,

    end_date DATE NULL,

    comments TEXT NULL,

    coding VARCHAR(255) NULL,

    occurrence VARCHAR(50) NULL,

    outcome VARCHAR(50) NULL,

    classification_type VARCHAR(50) NULL,

    verification_status VARCHAR(50) NULL DEFAULT 'Unconfirmed',

    referred_by VARCHAR(150) NULL,

    destination VARCHAR(150) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_patient_medical_problems_patient (patient_id),

    INDEX idx_patient_medical_problems_problem (problem_id),

    INDEX idx_patient_medical_problems_created_by (created_by),

    INDEX idx_patient_medical_problems_updated_by (updated_by),

    INDEX idx_patient_medical_problems_deleted_by (deleted_by),

    CONSTRAINT fk_patient_medical_problems_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_medical_problems_problem
        FOREIGN KEY (problem_id)
        REFERENCES medical_problems(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
