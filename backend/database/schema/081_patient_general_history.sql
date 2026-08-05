-- =============================================
-- Tables: patient_risk_factors, patient_exams
-- Backs the "General" tab of a patient's History & Lifestyle section:
-- a fixed checklist of risk factors and a fixed exam/test tracker.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_risk_factors (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    risk_factor_key VARCHAR(64) NOT NULL,

    specify_text VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_patient_risk_factors_patient_key
        UNIQUE (patient_id, risk_factor_key),

    INDEX idx_patient_risk_factors_patient (patient_id),

    INDEX idx_patient_risk_factors_created_by (created_by),

    INDEX idx_patient_risk_factors_updated_by (updated_by),

    CONSTRAINT fk_patient_risk_factors_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS patient_exams (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    exam_key VARCHAR(64) NOT NULL,

    status ENUM('na', 'normal', 'abnormal') NOT NULL DEFAULT 'na',

    notes VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_patient_exams_patient_key
        UNIQUE (patient_id, exam_key),

    INDEX idx_patient_exams_patient (patient_id),

    INDEX idx_patient_exams_created_by (created_by),

    INDEX idx_patient_exams_updated_by (updated_by),

    CONSTRAINT fk_patient_exams_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
