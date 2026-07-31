-- =============================================
-- Table: encounter_issues
-- Links an encounter to existing patient issues (allergy, medical
-- problem, medication, or health concern) it was addressed alongside --
-- OpenEMR's "Link/Add Issues to This Visit". issue_type + issue_id is a
-- polymorphic reference (the referenced tables differ by type), so no
-- single FK constraint covers issue_id.
-- =============================================

CREATE TABLE IF NOT EXISTS encounter_issues (

    id INT NOT NULL AUTO_INCREMENT,

    encounter_id INT NOT NULL,

    issue_type VARCHAR(20) NOT NULL,

    issue_id INT NOT NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_encounter_issues_encounter (encounter_id),

    INDEX idx_encounter_issues_type_issue (issue_type, issue_id),

    CONSTRAINT fk_encounter_issues_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
