-- =============================================
-- Table: encounter_speech_dictation_items
-- Individual Speech Dictation entries on an encounter (multiple per
-- encounter), editable after creation (per-row Edit in the summary
-- table), mirroring encounter_clinical_note_items.
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_speech_dictation_items (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_id INT NOT NULL,

    author_name VARCHAR(255) NOT NULL,

    dictation TEXT NULL,

    additional_notes TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_encounter_speech_dictation_items_encounter (encounter_id),

    INDEX idx_encounter_speech_dictation_items_created_by (created_by),

    INDEX idx_encounter_speech_dictation_items_updated_by (updated_by),

    INDEX idx_encounter_speech_dictation_items_deleted_by (deleted_by),

    CONSTRAINT fk_encounter_speech_dictation_items_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
