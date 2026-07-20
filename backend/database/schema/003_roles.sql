-- =============================================
-- Table: roles
-- =============================================

CREATE TABLE IF NOT EXISTS roles (

    id INT NOT NULL AUTO_INCREMENT,

    name VARCHAR(255) NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uq_roles_name (name),

    INDEX idx_roles_created_by (created_by),

    INDEX idx_roles_updated_by (updated_by),

    INDEX idx_roles_deleted_by (deleted_by)

) ENGINE = InnoDB;