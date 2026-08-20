-- =============================================
-- Table: patient_documents
-- Files uploaded against a patient's chart (lab results, imaging,
-- consent forms, insurance cards, etc.), uploaded by staff and visible
-- to the patient in their portal's Documents tab for download.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_documents (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    category VARCHAR(100) NULL,

    original_filename VARCHAR(255) NOT NULL,

    stored_filename VARCHAR(255) NOT NULL,

    file_path VARCHAR(255) NOT NULL,

    mime_type VARCHAR(100) NULL,

    file_size INT NULL,

    description TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_patient_documents_patient (patient_id),

    INDEX idx_patient_documents_created_by (created_by),

    INDEX idx_patient_documents_deleted_by (deleted_by),

    CONSTRAINT fk_patient_documents_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
