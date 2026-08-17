-- =============================================
-- Table: encounter_functional_cognitive_status_items
-- Individual Functional and Cognitive Status entries on an encounter
-- (multiple per encounter) -- each a coded status item, optionally
-- flagged as being for mental status, mirroring encounter_care_plan_items
-- / encounter_clinical_note_items.
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_functional_cognitive_status_items (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_id INT NOT NULL,

    author_name VARCHAR(255) NOT NULL,

    code VARCHAR(30) NULL,

    code_text VARCHAR(255) NULL,

    for_mental_status TINYINT(1) NOT NULL DEFAULT 0,

    description TEXT NOT NULL,

    item_date DATE NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_encounter_functional_cognitive_status_items_encounter (encounter_id),

    INDEX idx_encounter_functional_cognitive_status_items_created_by (created_by),

    INDEX idx_encounter_functional_cognitive_status_items_deleted_by (deleted_by),

    CONSTRAINT fk_encounter_functional_cognitive_status_items_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
