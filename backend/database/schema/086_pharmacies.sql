-- =============================================
-- Table: pharmacies
-- Pharmacies available for prescription routing under
-- Practice Settings.
-- =============================================

CREATE TABLE IF NOT EXISTS pharmacies (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(255) NOT NULL,

    address VARCHAR(255) NULL,

    address2 VARCHAR(255) NULL,

    city VARCHAR(100) NULL,

    state VARCHAR(100) NULL,

    zip VARCHAR(20) NULL,

    email VARCHAR(255) NULL,

    phone VARCHAR(50) NULL,

    fax VARCHAR(50) NULL,

    npi VARCHAR(20) NULL,

    ncpdp VARCHAR(20) NULL,

    default_method VARCHAR(20) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_pharmacies_created_by (created_by),

    INDEX idx_pharmacies_updated_by (updated_by),

    INDEX idx_pharmacies_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
