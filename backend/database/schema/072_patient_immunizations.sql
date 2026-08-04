-- =============================================
-- Table: patient_immunizations
-- Records a vaccine administered (or refused/not
-- administered) for a patient. The vaccine may
-- reference the CVX code catalog (cvx_code_id) or
-- be entered as free text (cvx_code only).
-- =============================================

CREATE TABLE IF NOT EXISTS patient_immunizations (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    cvx_code_id INT NULL,

    cvx_code VARCHAR(10) NOT NULL,

    vaccine_name VARCHAR(255) NULL,

    administered_at DATETIME NULL,

    amount_administered VARCHAR(20) NULL,

    amount_unit VARCHAR(20) NULL,

    expiration_date DATE NULL,

    manufacturer VARCHAR(255) NULL,

    lot_number VARCHAR(100) NULL,

    administered_by VARCHAR(255) NULL,

    administered_by_provider_id INT NULL,

    vis_date_given DATE NULL,

    vis_date_document DATE NULL,

    route VARCHAR(50) NULL,

    administration_site VARCHAR(50) NULL,

    notes TEXT NULL,

    information_source VARCHAR(100) NULL,

    completion_status VARCHAR(30) NULL DEFAULT 'completed',

    refusal_reason VARCHAR(100) NULL,

    reason_code VARCHAR(100) NULL,

    ordering_provider_id INT NULL,

    encounter_id INT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_patient_immunizations_patient (patient_id),

    INDEX idx_patient_immunizations_cvx_code (cvx_code_id),

    INDEX idx_patient_immunizations_provider (administered_by_provider_id),

    INDEX idx_patient_immunizations_ordering_provider (ordering_provider_id),

    INDEX idx_patient_immunizations_encounter (encounter_id),

    INDEX idx_patient_immunizations_created_by (created_by),

    INDEX idx_patient_immunizations_updated_by (updated_by),

    INDEX idx_patient_immunizations_deleted_by (deleted_by),

    CONSTRAINT fk_patient_immunizations_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_immunizations_cvx_code
        FOREIGN KEY (cvx_code_id)
        REFERENCES cvx_codes(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_immunizations_provider
        FOREIGN KEY (administered_by_provider_id)
        REFERENCES providers(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_immunizations_ordering_provider
        FOREIGN KEY (ordering_provider_id)
        REFERENCES providers(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_immunizations_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
