-- =============================================
-- Table: recalls
-- Follow-up reminders staff schedule for a patient to come back in
-- (screenings, immunizations, re-checks, etc).
-- =============================================

CREATE TABLE IF NOT EXISTS recalls (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    provider_id INT NULL,

    recall_date DATE NULL,

    reason VARCHAR(255) NOT NULL,

    status VARCHAR(50) NOT NULL DEFAULT 'pending',

    notes TEXT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_recalls_patient (patient_id),

    INDEX idx_recalls_provider (provider_id),

    INDEX idx_recalls_created_by (created_by),

    INDEX idx_recalls_updated_by (updated_by),

    INDEX idx_recalls_deleted_by (deleted_by),

    CONSTRAINT fk_recalls_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_recalls_provider
        FOREIGN KEY (provider_id)
        REFERENCES providers(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
