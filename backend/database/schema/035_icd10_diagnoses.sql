-- =============================================
-- Table: icd10_diagnoses
-- ICD10 diagnosis code catalog, used for coding
-- conditions, allergies, and other clinical records.
-- =============================================

CREATE TABLE IF NOT EXISTS icd10_diagnoses (

    id INT NOT NULL AUTO_INCREMENT,

    code VARCHAR(15) NOT NULL,

    description VARCHAR(255) NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_icd10_diagnoses_code
        UNIQUE (code),

    INDEX idx_icd10_diagnoses_created_by (created_by),

    INDEX idx_icd10_diagnoses_updated_by (updated_by),

    INDEX idx_icd10_diagnoses_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
