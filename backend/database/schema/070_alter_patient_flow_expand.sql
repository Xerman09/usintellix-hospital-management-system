-- =============================================
-- Alter Table: patient_flow
-- Adds visit category (copied from the appointment at check-in, used as
-- a board filter) and a drug-screen completion checkbox.
-- =============================================

ALTER TABLE patient_flow

    ADD COLUMN visit_category_id INT NULL AFTER provider_id,

    ADD COLUMN drug_screen_completed TINYINT(1) NOT NULL DEFAULT 0 AFTER notes,

    ADD INDEX idx_patient_flow_visit_category (visit_category_id),

    ADD CONSTRAINT fk_patient_flow_visit_category
        FOREIGN KEY (visit_category_id)
        REFERENCES visit_categories(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION;
