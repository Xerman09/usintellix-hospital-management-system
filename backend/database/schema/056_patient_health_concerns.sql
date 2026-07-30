-- =============================================
-- Table: patient_health_concerns
-- Records a patient's health concerns (OpenEMR "Issue" type: Health
-- Concern) -- free-text title with optional ICD10 coding, distinct from
-- the curated Medical Problems catalog list.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_health_concerns (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

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

    INDEX idx_patient_health_concerns_patient (patient_id),

    INDEX idx_patient_health_concerns_created_by (created_by),

    INDEX idx_patient_health_concerns_updated_by (updated_by),

    INDEX idx_patient_health_concerns_deleted_by (deleted_by),

    CONSTRAINT fk_patient_health_concerns_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
