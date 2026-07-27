-- =============================================
-- Table: patient_guardians
-- Guardian/related-person info for a patient (one record per patient).
-- =============================================

CREATE TABLE IF NOT EXISTS patient_guardians (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    guardian_name VARCHAR(255) NULL,

    relationship VARCHAR(100) NULL,

    sex ENUM('male', 'female') NULL,

    address VARCHAR(255) NULL,

    city VARCHAR(100) NULL,

    state VARCHAR(100) NULL,

    postal_code VARCHAR(20) NULL,

    country VARCHAR(100) NULL,

    phone VARCHAR(20) NULL,

    work_phone VARCHAR(20) NULL,

    email VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uq_patient_guardians_patient (patient_id),

    INDEX idx_patient_guardians_created_by (created_by),

    INDEX idx_patient_guardians_updated_by (updated_by),

    INDEX idx_patient_guardians_deleted_by (deleted_by),

    CONSTRAINT fk_patient_guardians_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
