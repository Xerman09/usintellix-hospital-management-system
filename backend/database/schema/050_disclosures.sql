-- =============================================
-- Table: disclosures
-- Records a HIPAA-style disclosure of a patient's information to a
-- third party (who it went to, why, and what was shared).
-- =============================================

CREATE TABLE IF NOT EXISTS disclosures (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    disclosure_date DATETIME NULL,

    disclosure_type VARCHAR(100) NULL,

    recipient VARCHAR(255) NOT NULL,

    description TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_disclosures_patient (patient_id),

    INDEX idx_disclosures_created_by (created_by),

    INDEX idx_disclosures_updated_by (updated_by),

    INDEX idx_disclosures_deleted_by (deleted_by),

    CONSTRAINT fk_disclosures_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
