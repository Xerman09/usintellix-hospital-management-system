-- =============================================
-- Table: users
-- =============================================

CREATE TABLE IF NOT EXISTS users (

    id INT NOT NULL AUTO_INCREMENT,

    tenant_id INT NOT NULL,

    username VARCHAR(255) NOT NULL,

    password VARCHAR(255) NOT NULL,

    role_id INT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_users_tenant_username
        UNIQUE (tenant_id, username),

    INDEX idx_users_tenant (tenant_id),

    INDEX idx_users_role (role_id),

    INDEX idx_users_created_by (created_by),

    INDEX idx_users_updated_by (updated_by),

    INDEX idx_users_deleted_by (deleted_by),

    CONSTRAINT fk_users_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;