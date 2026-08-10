-- =============================================
-- Table: encounter_care_plan_items
-- Individual line items on an encounter's Care Plan Form (multiple per
-- encounter) -- e.g. "Supply Order Act - Diabetic education - <date>".
-- code/code_text stay optional free text since there's no clinical
-- order-code catalog backing this in the app.
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_care_plan_items (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_id INT NOT NULL,

    author_name VARCHAR(255) NOT NULL,

    item_type VARCHAR(100) NOT NULL,

    code VARCHAR(30) NULL,

    code_text VARCHAR(255) NULL,

    description TEXT NOT NULL,

    item_date DATETIME NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_encounter_care_plan_items_encounter (encounter_id),

    INDEX idx_encounter_care_plan_items_created_by (created_by),

    INDEX idx_encounter_care_plan_items_deleted_by (deleted_by),

    CONSTRAINT fk_encounter_care_plan_items_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
