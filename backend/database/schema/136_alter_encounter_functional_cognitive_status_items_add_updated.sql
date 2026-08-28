-- =============================================
-- Add updated_at/updated_by to encounter_functional_cognitive_status_items
-- Sibling tables (encounter_clinical_note_items, encounter_observation_items,
-- encounter_speech_dictation_items) already carry these audit columns; this
-- table's original CREATE TABLE (120) omitted them even though the service
-- layer reads/writes both.
-- =============================================

ALTER TABLE encounter_functional_cognitive_status_items

ADD COLUMN updated_at DATETIME NULL AFTER created_by,

ADD COLUMN updated_by INT NULL AFTER updated_at,

ADD INDEX idx_encounter_functional_cognitive_status_items_updated_by (updated_by);
