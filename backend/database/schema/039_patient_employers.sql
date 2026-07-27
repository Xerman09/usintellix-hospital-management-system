-- =============================================
-- Table: patient_employers
-- Employer/occupation info for a patient (one record per patient).
-- =============================================

CREATE TABLE IF NOT EXISTS patient_employers (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    occupation VARCHAR(150) NULL,

    employer_name VARCHAR(255) NULL,

    address_line VARCHAR(255) NULL,

    address_line2 VARCHAR(255) NULL,

    city VARCHAR(100) NULL,

    state VARCHAR(100) NULL,

    postal_code VARCHAR(20) NULL,

    country VARCHAR(100) NULL,

    industry VARCHAR(150) NULL,

    employment_start_date DATE NULL,

    employment_end_date DATE NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    UNIQUE KEY uq_patient_employers_patient (patient_id),

    INDEX idx_patient_employers_created_by (created_by),

    INDEX idx_patient_employers_updated_by (updated_by),

    INDEX idx_patient_employers_deleted_by (deleted_by),

    CONSTRAINT fk_patient_employers_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
