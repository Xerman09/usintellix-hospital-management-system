-- =============================================
-- Table: patient_medications
-- Links a patient to a recorded medication. The medication may reference
-- the medications catalog (medication_id) or be entered as free text
-- (title only, medication_id left NULL).
-- =============================================

CREATE TABLE IF NOT EXISTS patient_medications (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    medication_id INT NULL,

    title VARCHAR(255) NOT NULL,

    begin_date DATE NULL,

    end_date DATE NULL,

    medication_usage VARCHAR(50) NULL,

    request_intent VARCHAR(50) NULL,

    is_primary_record TINYINT(1) NOT NULL DEFAULT 1,

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

    INDEX idx_patient_medications_patient (patient_id),

    INDEX idx_patient_medications_medication (medication_id),

    INDEX idx_patient_medications_created_by (created_by),

    INDEX idx_patient_medications_updated_by (updated_by),

    INDEX idx_patient_medications_deleted_by (deleted_by),

    CONSTRAINT fk_patient_medications_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_medications_medication
        FOREIGN KEY (medication_id)
        REFERENCES medications(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
