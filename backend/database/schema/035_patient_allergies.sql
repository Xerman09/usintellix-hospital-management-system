-- =============================================
-- Table: patient_allergies
-- Links a patient to one or more entries in the allergies catalog.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_allergies (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    allergy_id INT NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_patient_allergies_patient_allergy
        UNIQUE (patient_id, allergy_id),

    INDEX idx_patient_allergies_patient (patient_id),

    INDEX idx_patient_allergies_allergy (allergy_id),

    INDEX idx_patient_allergies_created_by (created_by),

    INDEX idx_patient_allergies_updated_by (updated_by),

    INDEX idx_patient_allergies_deleted_by (deleted_by),

    CONSTRAINT fk_patient_allergies_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_allergies_allergy
        FOREIGN KEY (allergy_id)
        REFERENCES allergies(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
