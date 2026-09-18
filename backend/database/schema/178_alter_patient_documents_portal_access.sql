-- =============================================
-- Alter: patient_documents
-- Adds `portal_visible` so staff can control which of a patient's
-- documents are exposed through the Patient Portal (previously every
-- document was unconditionally visible to the patient, with no way to
-- hold one back). Defaults to 1 (visible) so this is purely additive --
-- no existing document's current visibility changes. Also adds
-- updated_at/updated_by, missing from the original table, so this and
-- any future edit to a document row is attributable.
-- =============================================

ALTER TABLE patient_documents
    ADD COLUMN portal_visible TINYINT(1) NOT NULL DEFAULT 1 AFTER category,
    ADD COLUMN updated_at DATETIME NULL AFTER created_by,
    ADD COLUMN updated_by INT NULL AFTER updated_at;
