-- 304_ris_radiology_reports.sql
-- Radiology Information System (RIS): Structured Radiologist Reporting
-- Standardized Sections: Clinical Indication, Technique, Comparison, Findings, Impression, Recommendation.
-- Dual Electronic Signatures, Urgency Escalation Alerts (Critical Panics / Urgent Diagnostic Findings).
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS ris_radiology_reports (
    id INT NOT NULL AUTO_INCREMENT,
    order_id INT NOT NULL,                                 -- patient_procedure_orders.id
    accession_no VARCHAR(32) NOT NULL,                     -- RAD-YYYY-XXXXX
    study_instance_uid VARCHAR(128) DEFAULT NULL,          -- DICOM Study Instance UID
    patient_id INT NOT NULL,                               -- patients.id
    version SMALLINT NOT NULL DEFAULT 1,
    status ENUM('draft', 'preliminary', 'final_signed', 'addendum', 'corrected', 'cancelled') NOT NULL DEFAULT 'draft',
    
    -- Structured Report Sections:
    indication TEXT DEFAULT NULL,                          -- Clinical Indication / History
    technique VARCHAR(500) DEFAULT NULL,                   -- Protocol, views, contrast agent & dose, slice thickness
    comparison VARCHAR(500) DEFAULT NULL,                  -- Prior imaging studies compared with
    findings LONGTEXT DEFAULT NULL,                        -- Detailed anatomical organ-by-organ findings
    impression LONGTEXT DEFAULT NULL,                      -- Primary conclusion & diagnostic interpretation
    recommendation VARCHAR(500) DEFAULT NULL,              -- Follow-up imaging / clinical management advice
    
    -- Diagnostic Finding Urgency & Critical Alerts:
    finding_urgency ENUM('routine', 'abnormal', 'urgent_action_required', 'critical_panic') NOT NULL DEFAULT 'routine',
    urgent_finding_details VARCHAR(500) DEFAULT NULL,      -- Specific emergency finding (e.g. midline shift, pneumothorax, pulmonary embolism)
    critical_alert_sent TINYINT(1) NOT NULL DEFAULT 0,
    critical_alert_at DATETIME DEFAULT NULL,
    read_back_confirmed TINYINT(1) NOT NULL DEFAULT 0,
    read_back_by_name VARCHAR(150) DEFAULT NULL,           -- Recipient clinician / nurse who took read-back
    read_back_at DATETIME DEFAULT NULL,
    
    -- Electronic Signature & Radiologist Credentials:
    is_signed TINYINT(1) NOT NULL DEFAULT 0,
    radiologist_user_id INT DEFAULT NULL,                  -- users.id
    radiologist_name VARCHAR(150) DEFAULT NULL,
    radiologist_license_no VARCHAR(50) DEFAULT NULL,       -- Board certification / PRC Medical License No.
    signed_at DATETIME DEFAULT NULL,
    signature_hash VARCHAR(64) DEFAULT NULL,               -- SHA-256 cryptographic verification checksum
    
    -- Audit & Amendment Trail:
    amendment_reason VARCHAR(255) DEFAULT NULL,
    previous_report_id INT DEFAULT NULL,
    
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_ris_report_version (order_id, version),
    KEY idx_ris_rep_accession (accession_no),
    KEY idx_ris_rep_patient (patient_id),
    KEY idx_ris_rep_status (status, finding_urgency),
    KEY idx_ris_rep_radiologist (radiologist_user_id, signed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure rad_reports has indication and urgency fields for legacy compatibility
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'rad_reports' AND column_name = 'indication');
SET @s := IF(@c = 0,
    'ALTER TABLE rad_reports
        ADD COLUMN indication TEXT DEFAULT NULL AFTER status,
        ADD COLUMN finding_urgency VARCHAR(30) DEFAULT \'routine\' AFTER conclusion,
        ADD COLUMN signature_hash VARCHAR(64) DEFAULT NULL AFTER signed_at',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;

-- Seed sample board-certified radiologists in rad_staff if none exist
INSERT INTO rad_staff (user_id, radiologist, license_no, updated_at)
SELECT u.id, 1, 'PRC-RAD-092841', NOW()
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.name IN ('doctor', 'clinician')
ORDER BY u.id ASC
LIMIT 2
ON DUPLICATE KEY UPDATE radiologist = 1;
