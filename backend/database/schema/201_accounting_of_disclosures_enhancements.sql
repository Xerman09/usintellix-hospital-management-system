-- =============================================================================
-- Migration 201: Accounting of Disclosures Enhancements (HIPAA § 164.528)
-- =============================================================================
-- Enhances the disclosures table with full statutory fields mandated by
-- 45 CFR § 164.528(b)(2) (recipient address, legal basis, purpose,
-- records disclosed, requestor name, medium, reference/case docket number).
-- =============================================================================

ALTER TABLE `disclosures`
    ADD COLUMN `legal_basis` VARCHAR(100) NULL COMMENT 'Statutory legal basis (e.g. court_order_subpoena, public_health, law_enforcement)' AFTER `disclosure_type`,
    ADD COLUMN `purpose` VARCHAR(255) NULL COMMENT 'Statement of purpose for disclosure (45 CFR § 164.528(b)(2)(iv))' AFTER `legal_basis`,
    ADD COLUMN `recipient_address` VARCHAR(255) NULL COMMENT 'Address/location of recipient entity (45 CFR § 164.528(b)(2)(ii))' AFTER `recipient`,
    ADD COLUMN `records_disclosed` TEXT NULL COMMENT 'Description of specific PHI records disclosed (45 CFR § 164.528(b)(2)(iii))' AFTER `recipient_address`,
    ADD COLUMN `requestor_name` VARCHAR(255) NULL COMMENT 'Name of requesting official, attorney, auditor, or inspector' AFTER `records_disclosed`,
    ADD COLUMN `disclosure_medium` VARCHAR(50) NULL DEFAULT 'electronic_portal' COMMENT 'Medium: electronic_portal, secure_email, encrypted_media, fax, paper_mail, in_person' AFTER `requestor_name`,
    ADD COLUMN `reference_number` VARCHAR(100) NULL COMMENT 'Subpoena docket #, case #, audit ID, or warrant #' AFTER `disclosure_medium`,
    ADD COLUMN `is_tpo_exempt` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0 = reportable under § 164.528, 1 = TPO exempt' AFTER `reference_number`;

ALTER TABLE `disclosures`
    ADD INDEX `idx_disclosures_date` (`disclosure_date`),
    ADD INDEX `idx_disclosures_legal_basis` (`legal_basis`);
