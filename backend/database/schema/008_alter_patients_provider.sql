-- =============================================
-- Alter: patients — link a patient to their assigned provider
-- =============================================

ALTER TABLE patients

ADD COLUMN provider_id INT NULL AFTER user_id,

ADD INDEX idx_patients_provider (provider_id),

ADD CONSTRAINT fk_patients_provider
    FOREIGN KEY (provider_id)
    REFERENCES providers(id)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION;
