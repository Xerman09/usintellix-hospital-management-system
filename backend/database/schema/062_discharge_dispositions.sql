-- =============================================
-- Table: discharge_dispositions
-- Catalog of encounter discharge disposition options (e.g. "Discharged
-- to Home", "Expired", "Still a Patient"). Read-only lookup for the
-- Encounter form's Discharge Disposition dropdown.
-- =============================================

CREATE TABLE IF NOT EXISTS discharge_dispositions (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(255) NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_discharge_dispositions_name
        UNIQUE (name),

    INDEX idx_discharge_dispositions_created_by (created_by),

    INDEX idx_discharge_dispositions_updated_by (updated_by),

    INDEX idx_discharge_dispositions_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
