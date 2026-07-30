-- =============================================
-- Expand patients with Misc (deceased) demographic fields
-- =============================================

ALTER TABLE patients
    ADD COLUMN date_deceased DATE NULL AFTER weight,
    ADD COLUMN reason_deceased VARCHAR(255) NULL AFTER date_deceased;
