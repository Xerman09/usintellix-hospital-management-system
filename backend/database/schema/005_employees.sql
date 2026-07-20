-- =============================================
-- Table: employees
-- =============================================

CREATE TABLE IF NOT EXISTS employees (

    id INT NOT NULL AUTO_INCREMENT,

    tenant_id INT NOT NULL,

    user_id INT NOT NULL,

    employee_no VARCHAR(255) NOT NULL,

    first_name VARCHAR(255) NOT NULL,

    middle_name VARCHAR(255) NULL,

    last_name VARCHAR(255) NOT NULL,

    suffix VARCHAR(45) NULL,

    sex ENUM('male', 'female') NOT NULL,

    birthdate DATE NOT NULL,

    email VARCHAR(255) NOT NULL,

    phone VARCHAR(20) NOT NULL,

    department_id INT NOT NULL,

    role_id INT NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_employees_tenant_employee_no
        UNIQUE (tenant_id, employee_no),

    CONSTRAINT uq_employees_tenant_email
        UNIQUE (tenant_id, email),

    CONSTRAINT uq_employees_tenant_phone
        UNIQUE (tenant_id, phone),

    INDEX idx_employees_tenant (tenant_id),

    INDEX idx_employees_user (user_id),

    INDEX idx_employees_department (department_id),

    INDEX idx_employees_role (role_id),

    INDEX idx_employees_created_by (created_by),

    INDEX idx_employees_updated_by (updated_by),

    INDEX idx_employees_deleted_by (deleted_by),

    CONSTRAINT fk_employees_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_employees_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_employees_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_employees_role
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;