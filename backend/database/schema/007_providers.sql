-- =============================================
-- Table: providers
-- Fields modeled after OpenEMR's physician/provider record
-- (title, credentialing numbers, specialty, licensure).
-- =============================================

CREATE TABLE IF NOT EXISTS providers (

    id INT NOT NULL AUTO_INCREMENT,

    tenant_id INT NOT NULL,

    title VARCHAR(20) NULL,

    first_name VARCHAR(255) NOT NULL,

    middle_name VARCHAR(255) NULL,

    last_name VARCHAR(255) NOT NULL,

    suffix VARCHAR(45) NULL,

    specialty VARCHAR(255) NOT NULL,

    npi_number VARCHAR(20) NULL,

    license_number VARCHAR(50) NULL,

    dea_number VARCHAR(50) NULL,

    email VARCHAR(255) NOT NULL,

    phone VARCHAR(20) NOT NULL,

    department_id INT NOT NULL,

    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_providers_tenant_email
        UNIQUE (tenant_id, email),

    CONSTRAINT uq_providers_tenant_npi
        UNIQUE (tenant_id, npi_number),

    INDEX idx_providers_tenant (tenant_id),

    INDEX idx_providers_department (department_id),

    INDEX idx_providers_created_by (created_by),

    INDEX idx_providers_updated_by (updated_by),

    INDEX idx_providers_deleted_by (deleted_by),

    CONSTRAINT fk_providers_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_providers_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
