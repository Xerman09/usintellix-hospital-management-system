-- =============================================
-- Table: patient_care_preferences
-- Backs the "Care Experience Preferences" widget on the patient dashboard:
-- a dated, LOINC-category-linked record of a patient's stated care/treatment
-- preferences (FHIR Observation-style: category + response type + coded,
-- free-text, or yes/no value), each row created/edited/soft-deleted as a
-- whole unit -- corrections are new rows, never silent edits of history is
-- NOT enforced here (unlike the append-only reminder action log), since a
-- preference can legitimately change and the UI edits the same record.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_care_preferences (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    preference_type_id INT NOT NULL,

    date_recorded DATETIME NOT NULL,

    status ENUM('preliminary', 'final', 'amended') NOT NULL DEFAULT 'final',

    response_type ENUM('coded', 'free_text', 'yes_no') NOT NULL,

    preference_value VARCHAR(255) NOT NULL,

    notes TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_patient_care_preferences_patient (patient_id),

    INDEX idx_patient_care_preferences_type (preference_type_id),

    INDEX idx_patient_care_preferences_created_by (created_by),

    INDEX idx_patient_care_preferences_updated_by (updated_by),

    INDEX idx_patient_care_preferences_deleted_by (deleted_by),

    CONSTRAINT fk_patient_care_preferences_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_care_preferences_type
        FOREIGN KEY (preference_type_id)
        REFERENCES preference_types(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
