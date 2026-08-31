-- =============================================
-- Table: patient_merges
-- Audit trail for "Merge Patients": records who merged which source
-- chart into which target chart and when. Merging itself does not
-- create or alter rows in this table beyond a single insert per run --
-- the actual data movement happens across ~35 other patient_id-bearing
-- tables, reassigned in the same transaction.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_merges (

    id INT NOT NULL AUTO_INCREMENT,

    target_patient_id INT NOT NULL,

    source_patient_id INT NOT NULL,

    dedupe_encounters TINYINT(1) NOT NULL DEFAULT 0,

    encounters_deduped INT NOT NULL DEFAULT 0,

    performed_at DATETIME NOT NULL,

    performed_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_patient_merges_target (target_patient_id),

    INDEX idx_patient_merges_source (source_patient_id),

    INDEX idx_patient_merges_performed_by (performed_by),

    CONSTRAINT fk_patient_merges_target
        FOREIGN KEY (target_patient_id)
        REFERENCES patients(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_patient_merges_source
        FOREIGN KEY (source_patient_id)
        REFERENCES patients(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_patient_merges_performed_by
        FOREIGN KEY (performed_by)
        REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
