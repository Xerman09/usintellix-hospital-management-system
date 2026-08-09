-- =============================================
-- Alter: patient_transactions
-- Adds a single free-text "details" field, used by the non-Referral
-- transaction types (Billing, Legal, Patient Request, Physical Request)
-- which only need one plain text box instead of the full Referral /
-- Counter-Referral field set.
-- =============================================

ALTER TABLE patient_transactions
    ADD COLUMN details TEXT NULL AFTER transaction_type;
