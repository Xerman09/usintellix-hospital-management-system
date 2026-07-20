-- =============================================
-- Table: tenants
-- =============================================

CREATE TABLE IF NOT EXISTS tenants (

    id INT NOT NULL AUTO_INCREMENT,

    subdomain VARCHAR(255) NOT NULL,

    name VARCHAR(500) NOT NULL,

    email VARCHAR(255) NOT NULL,

    phone VARCHAR(20) NOT NULL,

    logo VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uq_tenants_subdomain (subdomain),

    UNIQUE KEY uq_tenants_email (email)

) ENGINE = InnoDB;