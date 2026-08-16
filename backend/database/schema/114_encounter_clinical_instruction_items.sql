-- =============================================
-- Table: encounter_clinical_instruction_items
-- Individual Clinical Instructions entries on an encounter (multiple
-- per encounter) -- each a free-text instruction with its own author
-- and timestamp, mirroring encounter_care_plan_items.
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_clinical_instruction_items (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_id INT NOT NULL,

    author_name VARCHAR(255) NOT NULL,

    instructions TEXT NOT NULL,

    item_date DATETIME NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_encounter_clinical_instruction_items_encounter (encounter_id),

    INDEX idx_encounter_clinical_instruction_items_created_by (created_by),

    INDEX idx_encounter_clinical_instruction_items_deleted_by (deleted_by),

    CONSTRAINT fk_encounter_clinical_instruction_items_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
