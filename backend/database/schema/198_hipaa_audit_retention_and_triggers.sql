-- ==========================================================
-- Migration 198: HIPAA § 164.316(b)(2)(i) 6-Year Retention
-- & § 164.312(b) Cryptographic Immutability Triggers
-- ==========================================================

-- 1. Retention Policy Guard: Blocks deletion of any record within 6 years of creation
DROP TRIGGER IF EXISTS trg_hipaa_audit_logs_retention_guard;

CREATE TRIGGER trg_hipaa_audit_logs_retention_guard
BEFORE DELETE ON hipaa_audit_logs
FOR EACH ROW
BEGIN
    IF OLD.created_at >= DATE_SUB(NOW(), INTERVAL 6 YEAR) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'HIPAA § 164.316(b)(2)(i) VIOLATION: Immutable retention policy prohibits deletion of audit logs within 6 years of creation.';
    END IF;
END;

-- 2. Immutability Guard: Blocks any modification (UPDATE) to preserve cryptographic audit trail
DROP TRIGGER IF EXISTS trg_hipaa_audit_logs_immutability_guard;

CREATE TRIGGER trg_hipaa_audit_logs_immutability_guard
BEFORE UPDATE ON hipaa_audit_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'HIPAA § 164.312(b) VIOLATION: Audit logs are append-only and cryptographically immutable. Record updates are prohibited.';
END;
