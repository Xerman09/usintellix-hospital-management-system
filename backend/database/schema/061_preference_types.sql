-- =============================================
-- Table: preference_types
-- Catalog of treatment/care preference types (e.g. resuscitation status,
-- organ donation, artificial nutrition) available when recording a
-- patient's treatment preferences. LOINC-coded for FHIR compliance,
-- mirroring the coded catalogs under File Management (ICD10, CQM
-- Valuesets).
-- =============================================

CREATE TABLE IF NOT EXISTS preference_types (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(255) NOT NULL,

    loinc_code VARCHAR(30) NULL,

    description VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_preference_types_name
        UNIQUE (name),

    INDEX idx_preference_types_created_by (created_by),

    INDEX idx_preference_types_updated_by (updated_by),

    INDEX idx_preference_types_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
