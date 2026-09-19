CREATE TABLE IF NOT EXISTS portal_audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NULL,
    user_id INT NULL,
    event_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    ip_address VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
    status VARCHAR(50) NOT NULL DEFAULT 'Success',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_portal_audit_patient (patient_id),
    INDEX idx_portal_audit_user (user_id),
    INDEX idx_portal_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;