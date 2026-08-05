-- =============================================
-- Table: patient_family_history
-- Backs the "Family History" tab: a fixed set of relations, each with a
-- free-text description and an optional diagnosis code picked from the
-- codes catalog.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_family_history (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    relation_key VARCHAR(20) NOT NULL,

    description VARCHAR(255) NULL,

    diagnosis_code VARCHAR(30) NULL,

    diagnosis_code_description VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_patient_family_history_patient_relation
        UNIQUE (patient_id, relation_key),

    INDEX idx_patient_family_history_patient (patient_id),

    INDEX idx_patient_family_history_created_by (created_by),

    INDEX idx_patient_family_history_updated_by (updated_by),

    CONSTRAINT fk_patient_family_history_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
