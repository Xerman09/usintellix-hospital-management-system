-- =============================================
-- Alter: encounters
-- Adds a free-text billing note per visit, edited from the Visit
-- History page's Billing View (independent of the rest of the
-- encounter's fields -- no revalidation of the whole record needed to
-- jot down a billing note).
-- =============================================

ALTER TABLE encounters
    ADD COLUMN billing_note TEXT NULL AFTER reason_for_visit;
