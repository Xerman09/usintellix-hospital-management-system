-- =============================================
-- Table: patients
-- =============================================

CREATE TABLE IF NOT EXISTS patients (

    id INT NOT NULL AUTO_INCREMENT,

    tenant_id INT NOT NULL,

    user_id INT NOT NULL,

    patient_no VARCHAR(255) NOT NULL,

    first_name VARCHAR(255) NOT NULL,

    middle_name VARCHAR(255) NULL,

    last_name VARCHAR(255) NOT NULL,

    suffix VARCHAR(45) NULL,

    sex ENUM('male', 'female') NOT NULL,

    birthdate DATE NOT NULL,

    civil_status VARCHAR(45) NOT NULL,

    blood_type VARCHAR(10) NOT NULL,

    height DECIMAL(5,2) NOT NULL,

    weight DECIMAL(5,2) NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_patients_tenant_patient_no
        UNIQUE (tenant_id, patient_no),

    INDEX idx_patients_tenant (tenant_id),

    INDEX idx_patients_user (user_id),

    INDEX idx_patients_created_by (created_by),

    INDEX idx_patients_updated_by (updated_by),

    INDEX idx_patients_deleted_by (deleted_by),

    CONSTRAINT fk_patients_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patients_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;