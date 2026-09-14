-- =============================================
-- Table: encounter_diagnoses
-- The structured, ordered list of ICD-10 diagnoses attached to a single
-- encounter (OpenEMR-style Dx1/Dx2/... list) -- distinct from both the
-- standalone icd10_diagnoses reference catalog and the free-text
-- patient_medical_problems.coding field. Fee sheet charges reference
-- these rows (by id, via encounter_billing_codes.justify) to record
-- which diagnosis justifies which billed code. Values are captured as a
-- snapshot (code, description) rather than an FK into the codes catalog,
-- same reasoning as encounter_billing_codes.
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_diagnoses (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_id INT NOT NULL,

    code VARCHAR(30) NOT NULL,

    description VARCHAR(255) NULL,

    sequence INT NOT NULL DEFAULT 1,

    created_at DATETIME NULL,

    created_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_encounter_diagnoses_encounter (encounter_id),

    INDEX idx_encounter_diagnoses_created_by (created_by),

    INDEX idx_encounter_diagnoses_deleted_by (deleted_by),

    CONSTRAINT fk_encounter_diagnoses_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
