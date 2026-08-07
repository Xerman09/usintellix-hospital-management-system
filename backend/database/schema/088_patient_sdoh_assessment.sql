-- =============================================
-- Table: patient_sdoh_assessment
-- Backs the "SDOH Assessment" item under the Patient Chart's Assessments
-- nav: a fixed checklist of Social Determinants of Health domains, each
-- with a selected response value and a free-text note.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_sdoh_assessment (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    item_key VARCHAR(40) NOT NULL,

    response_value VARCHAR(40) NULL,

    notes VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_patient_sdoh_assessment_patient_item
        UNIQUE (patient_id, item_key),

    INDEX idx_patient_sdoh_assessment_patient (patient_id),

    INDEX idx_patient_sdoh_assessment_created_by (created_by),

    INDEX idx_patient_sdoh_assessment_updated_by (updated_by),

    CONSTRAINT fk_patient_sdoh_assessment_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
