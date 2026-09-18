-- =============================================
-- Table: patient_template_assignments
-- Real assignment of a repository template to either every patient
-- (patient_id IS NULL -- "Default Patient Templates") or one specific
-- patient (patient_id set -- "Patient Assigned Templates"), backing the
-- Template Maintenance screen's Assign action and its two result lists.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_template_assignments (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NULL,

    template_filename VARCHAR(255) NOT NULL,

    category_id INT NULL,

    assigned_at DATETIME NOT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_patient_template_assignments_patient (patient_id),

    INDEX idx_patient_template_assignments_filename (template_filename),

    INDEX idx_patient_template_assignments_category (category_id),

    INDEX idx_patient_template_assignments_created_by (created_by),

    INDEX idx_patient_template_assignments_deleted_by (deleted_by),

    CONSTRAINT fk_patient_template_assignments_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_patient_template_assignments_category
        FOREIGN KEY (category_id)
        REFERENCES template_categories(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
