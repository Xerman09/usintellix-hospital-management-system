-- =============================================
-- Table: appointments
-- =============================================

CREATE TABLE IF NOT EXISTS appointments (

    id INT NOT NULL AUTO_INCREMENT,

    tenant_id INT NOT NULL,

    patient_id INT NOT NULL,

    provider_id INT NOT NULL,

    appointment_date DATE NOT NULL,

    appointment_time TIME NOT NULL,

    reason VARCHAR(255) NULL,

    notes TEXT NULL,

    status ENUM('scheduled', 'completed', 'cancelled', 'no_show') NOT NULL DEFAULT 'scheduled',

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_appointments_tenant (tenant_id),

    INDEX idx_appointments_patient (patient_id),

    INDEX idx_appointments_provider (provider_id),

    INDEX idx_appointments_provider_date (provider_id, appointment_date),

    INDEX idx_appointments_created_by (created_by),

    INDEX idx_appointments_updated_by (updated_by),

    INDEX idx_appointments_deleted_by (deleted_by),

    CONSTRAINT fk_appointments_tenant
        FOREIGN KEY (tenant_id)
        REFERENCES tenants(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_appointments_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_appointments_provider
        FOREIGN KEY (provider_id)
        REFERENCES providers(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
