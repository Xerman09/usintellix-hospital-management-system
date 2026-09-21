-- ==========================================================
-- Table: hipaa_audit_logs
-- HIPAA Security Rule § 164.312(b) Audit Controls &
-- § 164.312(c)(1) Cryptographic Tamper-Evident Integrity Chain
-- ==========================================================

CREATE TABLE IF NOT EXISTS hipaa_audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    user_role VARCHAR(50) NULL,
    patient_id INT NULL,
    event_category VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    ip_address VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
    user_agent VARCHAR(255) NULL,
    tamper_hash VARCHAR(64) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_hipaa_audit_user (user_id),
    INDEX idx_hipaa_audit_role (user_role),
    INDEX idx_hipaa_audit_patient (patient_id),
    INDEX idx_hipaa_audit_category (event_category),
    INDEX idx_hipaa_audit_action (action),
    INDEX idx_hipaa_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
