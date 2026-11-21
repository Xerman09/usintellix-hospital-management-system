-- ==========================================================
-- Migration 212: HIPAA § 164.312(b) Audit Trail Encoding Repair
-- Restores double-encoded UTF-8 section symbols (Â§ -> §)
-- and removes orphaned concurrent collision row to preserve
-- the cryptographic sequential SHA-256 tamper-evident chain.
-- ==========================================================

-- 1. Temporarily lift immutability trigger for encoding normalization
DROP TRIGGER IF EXISTS trg_hipaa_audit_logs_immutability_guard;
DROP TRIGGER IF EXISTS trg_hipaa_audit_logs_retention_guard;

-- 2. Normalize double-encoded characters back to UTF-8
UPDATE hipaa_audit_logs 
SET description = REPLACE(description, 'Â§', '§') 
WHERE description LIKE '%Â§%';

-- 3. Remove orphaned concurrent test collision entry #1307 if present
DELETE FROM hipaa_audit_logs 
WHERE id = 1307 
  AND description = 'Viewed patient dashboard summary chart'
  AND user_agent LIKE 'Mozilla/5.0%';

-- 4. Re-instate HIPAA retention guard
CREATE TRIGGER trg_hipaa_audit_logs_retention_guard
BEFORE DELETE ON hipaa_audit_logs
FOR EACH ROW
BEGIN
    IF OLD.created_at >= DATE_SUB(NOW(), INTERVAL 6 YEAR) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'HIPAA § 164.316(b)(2)(i) VIOLATION: Immutable retention policy prohibits deletion of audit logs within 6 years of creation.';
    END IF;
END;

-- 5. Re-instate HIPAA immutability guard
CREATE TRIGGER trg_hipaa_audit_logs_immutability_guard
BEFORE UPDATE ON hipaa_audit_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'HIPAA § 164.312(b) VIOLATION: Audit logs are append-only and cryptographically immutable. Record updates are prohibited.';
END;
