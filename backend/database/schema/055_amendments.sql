-- =============================================
-- Table: amendments
-- Records a patient's (or insurer's) request to amend their medical
-- record, and the practice's decision on that request.
-- =============================================

CREATE TABLE IF NOT EXISTS amendments (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    requested_date DATETIME NULL,

    requested_by VARCHAR(100) NULL,

    description TEXT NULL,

    status VARCHAR(50) NULL,

    comments TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_amendments_patient (patient_id),

    INDEX idx_amendments_created_by (created_by),

    INDEX idx_amendments_updated_by (updated_by),

    INDEX idx_amendments_deleted_by (deleted_by),

    CONSTRAINT fk_amendments_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
