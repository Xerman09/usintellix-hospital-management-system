-- =============================================
-- Table: patient_relatives_history
-- Backs the "Relatives" tab: a fixed checklist of hereditary conditions,
-- each with a free-text note.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_relatives_history (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    condition_key VARCHAR(30) NOT NULL,

    notes VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_patient_relatives_history_patient_condition
        UNIQUE (patient_id, condition_key),

    INDEX idx_patient_relatives_history_patient (patient_id),

    INDEX idx_patient_relatives_history_created_by (created_by),

    INDEX idx_patient_relatives_history_updated_by (updated_by),

    CONSTRAINT fk_patient_relatives_history_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
