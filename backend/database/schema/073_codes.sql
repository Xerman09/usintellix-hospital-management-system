-- =============================================
-- Table: codes
-- Generic multi-type code catalog (mirrors OpenEMR's
-- Admin > Coding > Codes screen). Stores manually added
-- and CSV-imported codes across all supported code types:
-- CPT4, HCPCS, CVX, ICD10, LOINC, PHIN_QUESTIONS,
-- NCI_CONCEPT_ID, CQM_VALUESET, OID_VALUESET.
-- =============================================

CREATE TABLE IF NOT EXISTS codes (

    id INT NOT NULL AUTO_INCREMENT,

    code_type VARCHAR(30) NOT NULL,

    code VARCHAR(30) NOT NULL,

    modifier VARCHAR(10) NULL,

    description VARCHAR(255) NOT NULL,

    short_description VARCHAR(100) NULL,

    category VARCHAR(100) NOT NULL DEFAULT 'Unassigned',

    diagnosis_reporting TINYINT(1) NOT NULL DEFAULT 0,

    service_reporting TINYINT(1) NOT NULL DEFAULT 0,

    related_code VARCHAR(30) NULL,

    fee_standard DECIMAL(10,2) NULL,

    active TINYINT(1) NOT NULL DEFAULT 1,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_codes_type_code_modifier
        UNIQUE (code_type, code, modifier),

    INDEX idx_codes_type (code_type),

    INDEX idx_codes_created_by (created_by),

    INDEX idx_codes_updated_by (updated_by),

    INDEX idx_codes_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
