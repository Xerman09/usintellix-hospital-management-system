-- ==============================================================================
-- Migration: 206_hipaa_drs_access_requests.sql
-- HIPAA Privacy Rule 45 CFR § 164.524 & 21st Century Cures Act
-- Patient Right of Access 30-Day Designated Record Set (DRS) Pipeline
-- ==============================================================================

CREATE TABLE IF NOT EXISTS hipaa_drs_access_requests (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    request_number VARCHAR(50) NOT NULL UNIQUE,
    patient_id INT NOT NULL,
    request_date DATE NOT NULL,
    requestor_type ENUM('patient', 'personal_representative', 'legal_guardian', 'authorized_third_party') NOT NULL DEFAULT 'patient',
    requestor_name VARCHAR(255) NOT NULL,
    requestor_contact VARCHAR(255) NULL,
    request_channel ENUM('patient_portal', 'written_mail', 'in_person', 'secure_email', 'fax') NOT NULL DEFAULT 'patient_portal',
    format_requested ENUM('electronic_pdf', 'machine_readable_json', 'paper_printout', 'portal_download', 'all_formats') NOT NULL DEFAULT 'electronic_pdf',
    delivery_method ENUM('secure_portal', 'encrypted_email', 'first_class_mail', 'in_person_pickup') NOT NULL DEFAULT 'secure_portal',
    records_scope ENUM('complete_designated_record_set', 'clinical_only', 'billing_only', 'date_range_custom') NOT NULL DEFAULT 'complete_designated_record_set',
    scope_start_date DATE NULL,
    scope_end_date DATE NULL,
    custom_scope_notes TEXT NULL,
    initial_deadline DATE NOT NULL,
    is_extended TINYINT(1) NOT NULL DEFAULT 0,
    extended_deadline DATE NULL,
    extension_reason VARCHAR(255) NULL,
    extension_rationale TEXT NULL,
    extension_notice_date DATE NULL,
    status ENUM('pending', 'in_review', 'extension_granted', 'fulfilled', 'denied', 'cancelled') NOT NULL DEFAULT 'pending',
    fee_assessed DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    fee_category ENUM('none_zero_fee', 'electronic_media_safe_harbor', 'paper_copying_supplies', 'actual_postage') NOT NULL DEFAULT 'none_zero_fee',
    fee_breakdown VARCHAR(255) NULL,
    fulfillment_date DATE NULL,
    fulfilled_by INT NULL,
    denial_reason VARCHAR(255) NULL,
    denial_rationale TEXT NULL,
    denial_notice_date DATE NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    created_by INT NOT NULL,
    deleted_at DATETIME NULL,
    INDEX idx_drs_patient (patient_id),
    INDEX idx_drs_status (status),
    INDEX idx_drs_request_date (request_date),
    INDEX idx_drs_initial_deadline (initial_deadline),
    INDEX idx_drs_deleted (deleted_at),
    CONSTRAINT fk_drs_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
