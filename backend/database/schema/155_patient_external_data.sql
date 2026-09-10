-- =============================================
-- Table: patient_external_data
-- Records/documents received about a patient from an outside source --
-- another provider, a Health Information Exchange (HIE), etc. -- as
-- opposed to patient_documents, which are files staff upload themselves.
-- Mirrors patient_documents' file-storage shape, plus source_name
-- (required -- the whole point of this table is knowing where a record
-- came from) and received_at (when it arrived from that outside source,
-- which can predate created_at, the moment staff logged it here).
-- =============================================

CREATE TABLE IF NOT EXISTS patient_external_data (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    title VARCHAR(255) NOT NULL,

    source_name VARCHAR(150) NOT NULL,

    document_type VARCHAR(100) NULL,

    received_at DATE NULL,

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

    INDEX idx_patient_external_data_patient (patient_id),

    INDEX idx_patient_external_data_created_by (created_by),

    INDEX idx_patient_external_data_deleted_by (deleted_by),

    CONSTRAINT fk_patient_external_data_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
