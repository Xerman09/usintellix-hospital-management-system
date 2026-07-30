-- =============================================
-- Alter Table: appointments
-- Adds provider_category_id — the Provider Block tab's own "Category"
-- dropdown (sourced from provider_categories), distinct from
-- visit_category_id (used as "Category" on the Patient tab and
-- "Exclusive Category" on the Provider tab).
-- =============================================

ALTER TABLE appointments

    ADD COLUMN provider_category_id INT NULL AFTER visit_category_id,

    ADD INDEX idx_appointments_provider_category (provider_category_id),

    ADD CONSTRAINT fk_appointments_provider_category
        FOREIGN KEY (provider_category_id)
        REFERENCES provider_categories(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION;
