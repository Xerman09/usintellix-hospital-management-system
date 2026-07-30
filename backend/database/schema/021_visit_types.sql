-- =============================================
-- Table: visit_types
-- =============================================

CREATE TABLE IF NOT EXISTS visit_types (

    id INT NOT NULL AUTO_INCREMENT,

    type VARCHAR(255) NOT NULL,

    description VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_visit_types_type
        UNIQUE (type),

    INDEX idx_visit_types_created_by (created_by),

    INDEX idx_visit_types_updated_by (updated_by),

    INDEX idx_visit_types_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
