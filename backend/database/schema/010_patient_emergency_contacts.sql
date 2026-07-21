-- =============================================
-- Table: patient_emergency_contacts
-- One-to-one extension of patients — Emergency Contact / Guardian tab.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_emergency_contacts (

    id INT NOT NULL AUTO_INCREMENT,

    tenant_id INT NOT NULL,

    patient_id INT NOT NULL,

    contact_name VARCHAR(255) NULL,

    relationship VARCHAR(100) NULL,

    phone VARCHAR(20) NULL,

    address VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_patient_emergency_contacts_patient
        UNIQUE (patient_id),

    INDEX idx_patient_emergency_contacts_tenant (tenant_id),

    INDEX idx_patient_emergency_contacts_created_by (created_by),

    INDEX idx_patient_emergency_contacts_updated_by (updated_by),

    INDEX idx_patient_emergency_contacts_deleted_by (deleted_by),

    CONSTRAINT fk_patient_emergency_contacts_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_emergency_contacts_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
