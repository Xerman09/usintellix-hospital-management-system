-- ==============================================================================
-- Migration: 207_hipaa_phi_amendments.sql
-- HIPAA Privacy Rule 45 CFR § 164.526
-- Formal Statutory PHI Amendment 60-Day Workflow & Denial Management
-- ==============================================================================

ALTER TABLE amendments
    ADD COLUMN amendment_number VARCHAR(50) NULL UNIQUE AFTER id,
    ADD COLUMN request_date DATE NULL AFTER patient_id,
    ADD COLUMN requester_type ENUM('patient', 'personal_representative', 'legal_guardian', 'authorized_representative') NOT NULL DEFAULT 'patient' AFTER request_date,
    ADD COLUMN requester_contact VARCHAR(255) NULL AFTER requested_by,
    ADD COLUMN target_record_type ENUM('encounter_soap_note', 'medical_problem', 'allergy', 'medication', 'procedure_result', 'demographics', 'other') NOT NULL DEFAULT 'encounter_soap_note' AFTER requester_contact,
    ADD COLUMN target_record_id INT NULL AFTER target_record_type,
    ADD COLUMN target_record_label VARCHAR(255) NULL AFTER target_record_id,
    ADD COLUMN disputed_text TEXT NULL AFTER target_record_label,
    ADD COLUMN requested_amendment TEXT NULL AFTER disputed_text,
    ADD COLUMN initial_deadline DATE NULL AFTER requested_amendment,
    ADD COLUMN is_extended TINYINT(1) NOT NULL DEFAULT 0 AFTER initial_deadline,
    ADD COLUMN extended_deadline DATE NULL AFTER is_extended,
    ADD COLUMN extension_reason VARCHAR(255) NULL AFTER extended_deadline,
    ADD COLUMN extension_rationale TEXT NULL AFTER extension_reason,
    ADD COLUMN extension_notice_date DATE NULL AFTER extension_rationale,
    ADD COLUMN review_decision_date DATE NULL AFTER status,
    ADD COLUMN reviewed_by INT NULL AFTER review_decision_date,
    ADD COLUMN denial_statutory_ground ENUM('not_created_by_entity', 'not_part_of_drs', 'exempt_from_access', 'accurate_and_complete') NULL AFTER reviewed_by,
    ADD COLUMN denial_rationale TEXT NULL AFTER denial_statutory_ground,
    ADD COLUMN denial_notice_date DATE NULL AFTER denial_rationale,
    ADD COLUMN acceptance_notes TEXT NULL AFTER denial_notice_date,
    ADD COLUMN accepted_linked_at DATETIME NULL AFTER acceptance_notes,
    ADD COLUMN statement_of_disagreement TEXT NULL AFTER accepted_linked_at,
    ADD COLUMN disagreement_received_at DATETIME NULL AFTER statement_of_disagreement,
    ADD COLUMN statement_of_rebuttal TEXT NULL AFTER disagreement_received_at,
    ADD COLUMN rebuttal_provided_at DATETIME NULL AFTER statement_of_rebuttal,
    ADD COLUMN future_disclosure_dissemination_requested TINYINT(1) NOT NULL DEFAULT 1 AFTER rebuttal_provided_at;

ALTER TABLE amendments
    MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending_review';

ALTER TABLE amendments
    ADD INDEX idx_amendments_status (status),
    ADD INDEX idx_amendments_request_date (request_date),
    ADD INDEX idx_amendments_initial_deadline (initial_deadline),
    ADD INDEX idx_amendments_target (target_record_type, target_record_id);
