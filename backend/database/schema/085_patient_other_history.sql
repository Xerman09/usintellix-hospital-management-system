-- =============================================
-- Table: patient_other_history
-- Backs the "Other" tab: two generic name/value custom fields plus a
-- free-text "Additional History" note. One row per patient.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_other_history (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    name_1 VARCHAR(255) NULL,

    value_1 VARCHAR(255) NULL,

    name_2 VARCHAR(255) NULL,

    value_2 VARCHAR(255) NULL,

    additional_history TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_patient_other_history_patient
        UNIQUE (patient_id),

    INDEX idx_patient_other_history_created_by (created_by),

    INDEX idx_patient_other_history_updated_by (updated_by),

    CONSTRAINT fk_patient_other_history_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
