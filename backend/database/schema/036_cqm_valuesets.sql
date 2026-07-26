-- =============================================
-- Tables: cqm_valuesets, cqm_valueset_codes
-- CQM (Clinical Quality Measure) Value Set administration.
-- A value set groups member codes (ICD10, SNOMED, LOINC, RxNorm, etc.)
-- under a single OID, used when defining eCQM measure logic.
-- =============================================

CREATE TABLE IF NOT EXISTS cqm_valuesets (

    id INT NOT NULL AUTO_INCREMENT,

    oid VARCHAR(64) NOT NULL,

    name VARCHAR(255) NOT NULL,

    code_system VARCHAR(100) NOT NULL,

    definition_version VARCHAR(50) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_cqm_valuesets_oid
        UNIQUE (oid),

    INDEX idx_cqm_valuesets_created_by (created_by),

    INDEX idx_cqm_valuesets_updated_by (updated_by),

    INDEX idx_cqm_valuesets_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS cqm_valueset_codes (

    id INT NOT NULL AUTO_INCREMENT,

    valueset_id INT NOT NULL,

    code VARCHAR(30) NOT NULL,

    code_system VARCHAR(100) NOT NULL,

    description VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_cqm_valueset_codes_valueset_code
        UNIQUE (valueset_id, code),

    CONSTRAINT fk_cqm_valueset_codes_valueset
        FOREIGN KEY (valueset_id) REFERENCES cqm_valuesets (id) ON DELETE CASCADE,

    INDEX idx_cqm_valueset_codes_created_by (created_by),

    INDEX idx_cqm_valueset_codes_updated_by (updated_by),

    INDEX idx_cqm_valueset_codes_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
