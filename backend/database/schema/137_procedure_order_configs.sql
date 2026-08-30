-- =============================================
-- Table: procedure_order_configs
-- Hierarchical tree of orderable lab/procedure categories used by
-- "Configure Orders and Results" (Procedures > Configuration).
-- =============================================

CREATE TABLE IF NOT EXISTS procedure_order_configs (

    id INT NOT NULL AUTO_INCREMENT,

    parent_id INT NULL,

    name VARCHAR(255) NOT NULL,

    category VARCHAR(255) NULL,

    code VARCHAR(100) NULL,

    tier INT NULL,

    description VARCHAR(500) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_procedure_order_configs_parent (parent_id),

    INDEX idx_procedure_order_configs_created_by (created_by),

    INDEX idx_procedure_order_configs_updated_by (updated_by),

    INDEX idx_procedure_order_configs_deleted_by (deleted_by),

    CONSTRAINT fk_procedure_order_configs_parent
        FOREIGN KEY (parent_id)
        REFERENCES procedure_order_configs(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
