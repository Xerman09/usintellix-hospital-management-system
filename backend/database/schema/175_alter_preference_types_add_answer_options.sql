-- =============================================
-- Alter: preference_types
-- Adds an admin-editable, newline-separated list of coded answer choices
-- offered when a patient's care preference for this type is recorded with
-- the "Coded Value (from answer list)" response type. NULL/empty means no
-- answer list has been configured yet for that category.
-- =============================================

ALTER TABLE preference_types
    ADD COLUMN answer_options TEXT NULL AFTER description;
