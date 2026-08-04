-- =============================================
-- Table: amount_units
-- =============================================

CREATE TABLE IF NOT EXISTS amount_units (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(255) NOT NULL,

    description VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_amount_units_name
        UNIQUE (name),

    INDEX idx_amount_units_created_by (created_by),

    INDEX idx_amount_units_updated_by (updated_by),

    INDEX idx_amount_units_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
