-- =============================================
-- Recall reason is no longer required (Recall Date, Provider, and
-- Facility are the required fields; Reason is free text, optional).
-- =============================================

ALTER TABLE recalls

MODIFY COLUMN reason VARCHAR(255) NULL;
