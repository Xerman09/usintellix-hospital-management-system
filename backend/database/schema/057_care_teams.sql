-- =============================================
-- Table: care_teams
-- A patient's care team header (name + status), one per patient. The
-- individual members (providers and/or related persons) live in
-- care_team_members below.
-- =============================================

CREATE TABLE IF NOT EXISTS care_teams (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    name VARCHAR(255) NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'active',

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id),

    UNIQUE INDEX uq_care_teams_patient (patient_id),

    INDEX idx_care_teams_created_by (created_by),

    INDEX idx_care_teams_updated_by (updated_by),

    CONSTRAINT fk_care_teams_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
