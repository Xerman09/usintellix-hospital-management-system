-- =============================================
-- Expand patient_allergies with clinical detail fields
-- (reaction, severity, dates, coding, and status fields)
-- =============================================

ALTER TABLE patient_allergies
    ADD COLUMN reaction VARCHAR(100) NULL AFTER allergy_id,
    ADD COLUMN severity VARCHAR(50) NULL AFTER reaction,
    ADD COLUMN begin_date DATE NULL AFTER severity,
    ADD COLUMN end_date DATE NULL AFTER begin_date,
    ADD COLUMN comments TEXT NULL AFTER end_date,
    ADD COLUMN coding VARCHAR(255) NULL AFTER comments,
    ADD COLUMN occurrence VARCHAR(50) NULL AFTER coding,
    ADD COLUMN outcome VARCHAR(50) NULL AFTER occurrence,
    ADD COLUMN classification_type VARCHAR(50) NULL AFTER outcome,
    ADD COLUMN verification_status VARCHAR(50) NULL DEFAULT 'Unconfirmed' AFTER classification_type,
    ADD COLUMN referred_by VARCHAR(150) NULL AFTER verification_status,
    ADD COLUMN destination VARCHAR(150) NULL AFTER referred_by;
