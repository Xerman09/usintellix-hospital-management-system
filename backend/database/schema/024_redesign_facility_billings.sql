-- =============================================
-- Redesign: facility_billings
-- Facility Billing is a standalone billing-rate catalog, not linked
-- to the facilities table. Table was empty (no real data), so it is
-- safely dropped and recreated with the corrected shape.
-- =============================================

DROP TABLE IF EXISTS facility_billings;

CREATE TABLE facility_billings (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(255) NOT NULL,

    description VARCHAR(255) NULL,

    rate DECIMAL(10,2) NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_facility_billings_name
        UNIQUE (name),

    INDEX idx_facility_billings_created_by (created_by),

    INDEX idx_facility_billings_updated_by (updated_by),

    INDEX idx_facility_billings_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
