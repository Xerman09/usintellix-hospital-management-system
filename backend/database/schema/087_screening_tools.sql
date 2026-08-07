-- =============================================
-- Table: screening_tools
-- =============================================

CREATE TABLE IF NOT EXISTS screening_tools (

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

    CONSTRAINT uq_screening_tools_name
        UNIQUE (name),

    INDEX idx_screening_tools_created_by (created_by),

    INDEX idx_screening_tools_updated_by (updated_by),

    INDEX idx_screening_tools_deleted_by (deleted_by)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
