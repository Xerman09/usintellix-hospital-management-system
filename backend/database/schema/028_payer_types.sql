-- =============================================
-- Table: payer_types
-- =============================================

CREATE TABLE IF NOT EXISTS payer_types (

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

    CONSTRAINT uq_payer_types_name
        UNIQUE (name),

    INDEX idx_payer_types_created_by (created_by),

    INDEX idx_payer_types_updated_by (updated_by),

    INDEX idx_payer_types_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
