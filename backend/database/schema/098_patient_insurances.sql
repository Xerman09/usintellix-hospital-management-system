-- =============================================
-- Table: patient_insurances
-- Links a patient to an insurance carrier from the insurances catalog,
-- with the patient-specific policy details (primary/secondary/tertiary,
-- policy/group numbers, subscriber, coverage dates).
-- =============================================

CREATE TABLE IF NOT EXISTS patient_insurances (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    insurance_id INT NOT NULL,

    insurance_type ENUM('primary', 'secondary', 'tertiary') NOT NULL DEFAULT 'primary',

    policy_number VARCHAR(100) NULL,

    group_number VARCHAR(100) NULL,

    subscriber_name VARCHAR(255) NULL,

    effective_date DATE NULL,

    term_date DATE NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_patient_insurances_patient (patient_id),

    INDEX idx_patient_insurances_insurance (insurance_id),

    INDEX idx_patient_insurances_created_by (created_by),

    INDEX idx_patient_insurances_updated_by (updated_by),

    INDEX idx_patient_insurances_deleted_by (deleted_by),

    CONSTRAINT fk_patient_insurances_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_insurances_insurance
        FOREIGN KEY (insurance_id)
        REFERENCES insurances(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
