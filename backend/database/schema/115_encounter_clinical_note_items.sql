-- =============================================
-- Table: encounter_clinical_note_items
-- Individual Clinical Notes entries on an encounter (multiple per
-- encounter) -- each a typed/categorized narrative note with an
-- auto-derived LOINC document-type code. Unlike encounter_care_plan_items
-- / encounter_clinical_instruction_items, these rows are editable after
-- creation (the mockup shows both a "Date" and a "Last Updated" value),
-- so this table carries updated_at/updated_by.
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_clinical_note_items (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_id INT NOT NULL,

    author_name VARCHAR(255) NOT NULL,

    note_date DATE NOT NULL,

    note_type VARCHAR(100) NOT NULL,

    category VARCHAR(100) NULL,

    code VARCHAR(30) NULL,

    narrative TEXT NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_encounter_clinical_note_items_encounter (encounter_id),

    INDEX idx_encounter_clinical_note_items_created_by (created_by),

    INDEX idx_encounter_clinical_note_items_updated_by (updated_by),

    INDEX idx_encounter_clinical_note_items_deleted_by (deleted_by),

    CONSTRAINT fk_encounter_clinical_note_items_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
