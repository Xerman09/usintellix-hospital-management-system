-- =============================================
-- Table: patient_duplicate_dismissals
-- Lets an admin mark a detected duplicate cluster (grouped by normalized
-- name + DOB, see PatientDuplicateService::groupKey) as "not actually a
-- duplicate" so it stops reappearing in Duplicate Patient Management on
-- every recalculation.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_duplicate_dismissals (

    id INT NOT NULL AUTO_INCREMENT,

    group_key VARCHAR(255) NOT NULL,

    dismissed_at DATETIME NOT NULL,

    dismissed_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_patient_duplicate_dismissals_group_key
        UNIQUE (group_key),

    INDEX idx_patient_duplicate_dismissals_dismissed_by (dismissed_by),

    CONSTRAINT fk_patient_duplicate_dismissals_dismissed_by
        FOREIGN KEY (dismissed_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
