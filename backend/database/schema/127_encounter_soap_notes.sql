-- =============================================
-- Table: encounter_soap_notes
-- Multiple SOAP notes per encounter, each rendered and locked/signed
-- independently in the Encounter Summary (unlike the other Clinical
-- forms, which share one lock per encounter via encounter_sections --
-- the reference UI shows each SOAP note as its own separately
-- collapsible/signable card, so locking lives on this table directly
-- rather than going through encounter_sections).
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_soap_notes (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_id INT NOT NULL,

    author_name VARCHAR(255) NOT NULL,

    subjective TEXT NULL,

    objective TEXT NULL,

    assessment TEXT NULL,

    plan TEXT NULL,

    locked_at DATETIME NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_encounter_soap_notes_encounter (encounter_id),

    INDEX idx_encounter_soap_notes_created_by (created_by),

    INDEX idx_encounter_soap_notes_updated_by (updated_by),

    INDEX idx_encounter_soap_notes_deleted_by (deleted_by),

    CONSTRAINT fk_encounter_soap_notes_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
