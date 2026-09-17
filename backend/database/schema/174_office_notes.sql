-- =============================================
-- Table: office_notes
-- Free-text, dated notes staff attach to a patient's chart (OpenEMR's
-- "Office Notes" dashboard widget + its "(More)" management screen).
-- `active` is a separate concept from `deleted_at` -- unchecking Active
-- hides a note from the default "Only Active" view without destroying
-- it (e.g. a note that's no longer relevant but worth keeping for
-- reference), while deleting via the trash icon soft-deletes it for
-- real, same convention as everywhere else in this app.
-- =============================================

CREATE TABLE IF NOT EXISTS office_notes (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    note TEXT NOT NULL,

    active TINYINT(1) NOT NULL DEFAULT 1,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_office_notes_patient (patient_id),

    INDEX idx_office_notes_created_by (created_by),

    INDEX idx_office_notes_deleted_by (deleted_by),

    CONSTRAINT fk_office_notes_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
