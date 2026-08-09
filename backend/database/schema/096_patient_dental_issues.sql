-- =============================================
-- Table: patient_dental_issues
-- Records a patient's dental issues (OpenEMR "Issue" type: Dental) --
-- free-text title with optional coding, mirroring patient_health_concerns'
-- structure. No catalog link (no curated dental-issue list exists).
-- =============================================

CREATE TABLE IF NOT EXISTS patient_dental_issues (

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

    INDEX idx_patient_dental_issues_patient (patient_id),

    INDEX idx_patient_dental_issues_created_by (created_by),

    INDEX idx_patient_dental_issues_updated_by (updated_by),

    INDEX idx_patient_dental_issues_deleted_by (deleted_by),

    CONSTRAINT fk_patient_dental_issues_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
