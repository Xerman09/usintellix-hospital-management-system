-- =============================================
-- Table: encounter_sections
-- One row per (encounter, section_type) -- section_type is one of
-- 'visit_summary', 'care_plan', 'clinical_instructions', 'vitals'.
-- Tracks lock/sign state shared by all four Encounter Summary sections;
-- `content` is only used by 'clinical_instructions' (a single free-text
-- block). 'vitals' and 'care_plan' store their data in their own
-- dedicated tables and only use this row for lock/signature tracking.
-- 'visit_summary' needs no stored content at all -- it's composed from
-- the encounter's own fields at render time.
-- A section is "Locked" the moment it has been signed at least once
-- (see encounter_section_signatures); there is no separate manual lock
-- action.
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_sections (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_id INT NOT NULL,

    section_type ENUM('visit_summary', 'care_plan', 'clinical_instructions', 'vitals') NOT NULL,

    content TEXT NULL,

    locked_at DATETIME NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_encounter_sections_encounter_type
        UNIQUE (encounter_id, section_type),

    INDEX idx_encounter_sections_created_by (created_by),

    INDEX idx_encounter_sections_updated_by (updated_by),

    CONSTRAINT fk_encounter_sections_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
