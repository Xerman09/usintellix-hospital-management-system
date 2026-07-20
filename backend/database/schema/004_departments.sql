-- =============================================
-- Table: departments
-- =============================================

CREATE TABLE IF NOT EXISTS departments (

    id INT NOT NULL AUTO_INCREMENT,

    tenant_id INT NOT NULL,

    name VARCHAR(255) NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_departments_tenant_name
        UNIQUE (tenant_id, name),

    INDEX idx_departments_tenant (tenant_id),

    INDEX idx_departments_created_by (created_by),

    INDEX idx_departments_updated_by (updated_by),

    INDEX idx_departments_deleted_by (deleted_by),

    CONSTRAINT fk_departments_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;