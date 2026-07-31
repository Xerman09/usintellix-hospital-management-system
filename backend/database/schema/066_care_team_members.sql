-- =============================================
-- Table: care_team_members
-- One row per person on a patient's care team. member_type + user_id /
-- related_person_id mirrors encounter_issues' polymorphic pattern: a
-- "Provider" row points at a user account (the system's user list), a
-- "Related Person" row points at that patient's related_persons record.
-- Rows are fully replaced (delete + recreate) whenever the care team is
-- saved, so there is no soft-delete bookkeeping here.
-- =============================================

CREATE TABLE IF NOT EXISTS care_team_members (

    id INT NOT NULL AUTO_INCREMENT,

    care_team_id INT NOT NULL,

    member_type VARCHAR(20) NOT NULL,

    user_id INT NULL,

    related_person_id INT NULL,

    role_id INT NULL,

    facility_id INT NULL,

    member_since DATE NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'active',

    note VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_care_team_members_care_team (care_team_id),

    INDEX idx_care_team_members_user (user_id),

    INDEX idx_care_team_members_related_person (related_person_id),

    INDEX idx_care_team_members_role (role_id),

    INDEX idx_care_team_members_facility (facility_id),

    CONSTRAINT fk_care_team_members_care_team
        FOREIGN KEY (care_team_id)
        REFERENCES care_teams(id)
        ON UPDATE NO ACTION
        ON DELETE CASCADE,

    CONSTRAINT fk_care_team_members_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_care_team_members_related_person
        FOREIGN KEY (related_person_id)
        REFERENCES related_persons(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_care_team_members_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_care_team_members_facility
        FOREIGN KEY (facility_id)
        REFERENCES facilities(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
