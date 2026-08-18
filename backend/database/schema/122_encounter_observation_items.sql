-- =============================================
-- Table: encounter_observation_items
-- Individual Observation entries on an encounter (multiple per
-- encounter) -- each a coded observation with a value/unit/status/type,
-- optionally justified by a reason code + reason status. Rows are
-- editable after creation (per-row Edit in the summary table), mirroring
-- encounter_clinical_note_items, so this table carries updated_at/updated_by.
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_observation_items (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_id INT NOT NULL,

    author_name VARCHAR(255) NOT NULL,

    code VARCHAR(30) NULL,

    code_text VARCHAR(255) NULL,

    description TEXT NULL,

    value VARCHAR(100) NULL,

    unit VARCHAR(30) NULL,

    status ENUM('Registered', 'Preliminary', 'Final', 'Amended', 'Corrected', 'Cancelled', 'Entered in Error', 'Unknown') NOT NULL DEFAULT 'Preliminary',

    observation_type VARCHAR(60) NULL,

    item_date DATETIME NOT NULL,

    reason_code VARCHAR(50) NULL,

    reason_status ENUM('Pending', 'Completed', 'Negated') NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_encounter_observation_items_encounter (encounter_id),

    INDEX idx_encounter_observation_items_created_by (created_by),

    INDEX idx_encounter_observation_items_updated_by (updated_by),

    INDEX idx_encounter_observation_items_deleted_by (deleted_by),

    CONSTRAINT fk_encounter_observation_items_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
