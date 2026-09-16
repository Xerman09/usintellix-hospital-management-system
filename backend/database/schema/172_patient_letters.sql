-- =============================================
-- Table: patient_letters
-- Popups > Letter -- a free-text correspondence letter composed about a
-- patient (From/To staff, date, specialty filter used at compose time,
-- which document template -- if any -- it started from, print format,
-- and the letter body itself). Backs "Save as New"/"Save Changes" on
-- that screen; "Generate Letter" itself is a client-side print/HTML
-- render and doesn't need a row here. from/to are snapshotted as plain
-- names (not just employee ids) so a saved letter keeps reading
-- correctly even if the referenced employee is later renamed or
-- removed, matching the same "snapshot, not a live FK" reasoning used
-- for encounter_billing_codes/encounter_diagnoses.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_letters (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    from_employee_id INT NULL,

    from_name VARCHAR(255) NULL,

    to_employee_id INT NULL,

    to_name VARCHAR(255) NULL,

    specialty VARCHAR(255) NULL,

    template_filename VARCHAR(255) NULL,

    print_format VARCHAR(20) NOT NULL DEFAULT 'html',

    letter_date DATE NOT NULL,

    body MEDIUMTEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_patient_letters_patient (patient_id),

    INDEX idx_patient_letters_created_by (created_by),

    INDEX idx_patient_letters_updated_by (updated_by),

    INDEX idx_patient_letters_deleted_by (deleted_by),

    CONSTRAINT fk_patient_letters_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
