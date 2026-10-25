-- =====================================================================
-- Migration 309: Claim Denial Management & Appeals Workflow
-- Table: billing_claim_denials, billing_claim_appeals, billing_carc_rarc_dictionary
-- Provides systematic tracking, root-cause categorization, CARC/RARC coding,
-- timely filing deadline alerts, and formal insurance appeal letter generation.
-- =====================================================================

CREATE TABLE IF NOT EXISTS `billing_claim_denials` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `denial_number` VARCHAR(50) NOT NULL UNIQUE,
    `claim_number` VARCHAR(50) NOT NULL,
    `patient_id` INT NOT NULL,
    `insurance_id` INT DEFAULT NULL,
    `payer_name` VARCHAR(255) NOT NULL,
    `payer_id` VARCHAR(100) DEFAULT NULL,
    `encounter_id` INT DEFAULT NULL,
    `folio_id` INT UNSIGNED DEFAULT NULL,
    `service_date` DATE NOT NULL,
    `denial_date` DATE NOT NULL,
    `remittance_eob_number` VARCHAR(100) DEFAULT NULL,
    
    -- Financial Impact
    `billed_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `allowed_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `denied_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `patient_responsibility` DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    -- Standard CARC & RARC Coding
    `carc_code` VARCHAR(20) NOT NULL,
    `carc_description` VARCHAR(255) NOT NULL,
    `rarc_code` VARCHAR(20) DEFAULT NULL,
    `rarc_description` VARCHAR(255) DEFAULT NULL,

    -- Actionable Denial Categorization
    `denial_category` ENUM(
        'prior_auth_missing',
        'medical_necessity',
        'timely_filing',
        'coding_billing_error',
        'eligibility_coverage',
        'duplicate_claim',
        'fee_schedule_contractual',
        'documentation_requested'
    ) NOT NULL DEFAULT 'prior_auth_missing',

    `root_cause_analysis` TEXT DEFAULT NULL,
    `priority` ENUM('urgent', 'high', 'medium', 'low') NOT NULL DEFAULT 'high',
    `timely_filing_deadline` DATE DEFAULT NULL,

    -- Workflow Status Lifecycle
    `status` ENUM(
        'pending_review',
        'appeal_in_progress',
        'appeal_submitted',
        'appeal_under_review',
        'overturned_won',
        'upheld_lost',
        'written_off'
    ) NOT NULL DEFAULT 'pending_review',

    `appeal_level` ENUM('none', 'level_1_reconsideration', 'level_2_formal_appeal', 'level_3_external_review') NOT NULL DEFAULT 'none',
    `assigned_to` INT DEFAULT NULL,
    `assigned_to_name` VARCHAR(150) DEFAULT NULL,

    -- Resolution & Financial Recovery
    `recovered_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `written_off_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `resolution_notes` TEXT DEFAULT NULL,
    `resolved_at` DATETIME DEFAULT NULL,
    `resolved_by` INT DEFAULT NULL,

    `created_by` INT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY `idx_bcd_patient` (`patient_id`),
    KEY `idx_bcd_claim` (`claim_number`),
    KEY `idx_bcd_payer` (`payer_name`),
    KEY `idx_bcd_status` (`status`),
    KEY `idx_bcd_category` (`denial_category`),
    KEY `idx_bcd_carc` (`carc_code`),
    KEY `idx_bcd_deadline` (`timely_filing_deadline`),
    KEY `idx_bcd_assigned` (`assigned_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_claim_appeals` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `denial_id` INT UNSIGNED NOT NULL,
    `appeal_number` VARCHAR(50) NOT NULL UNIQUE,
    `appeal_level` ENUM('level_1_reconsideration', 'level_2_formal_appeal', 'level_3_external_review') NOT NULL DEFAULT 'level_1_reconsideration',
    `submission_date` DATE NOT NULL,
    `submission_method` ENUM('portal_upload', 'certified_mail', 'fax', 'clearinghouse_edi') NOT NULL DEFAULT 'portal_upload',
    `tracking_confirmation_number` VARCHAR(100) DEFAULT NULL,
    `payer_appeal_dept_address` TEXT DEFAULT NULL,
    `appellant_contact_person` VARCHAR(150) NOT NULL,
    `appellant_phone` VARCHAR(50) DEFAULT NULL,
    `appeal_reason_summary` TEXT NOT NULL,
    `appeal_letter_body` LONGTEXT NOT NULL,
    `attached_clinical_documents` JSON DEFAULT NULL,
    `status` ENUM('draft', 'submitted', 'overturned', 'upheld', 'withdrawn') NOT NULL DEFAULT 'submitted',
    `payer_response_date` DATE DEFAULT NULL,
    `payer_response_notes` TEXT DEFAULT NULL,
    `recovered_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `created_by` INT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY `idx_bca_denial` (`denial_id`),
    KEY `idx_bca_status` (`status`),
    KEY `idx_bca_date` (`submission_date`),
    CONSTRAINT `fk_bca_denial`
        FOREIGN KEY (`denial_id`)
        REFERENCES `billing_claim_denials` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- CARC / RARC Standard Code Reference Dictionary with Recommended Appeal Strategy
CREATE TABLE IF NOT EXISTS `billing_carc_rarc_dictionary` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) NOT NULL UNIQUE,
    `type` ENUM('CARC', 'RARC') NOT NULL DEFAULT 'CARC',
    `category` VARCHAR(50) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `recommended_appeal_strategy` TEXT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed CARC/RARC Standard Dictionary
INSERT IGNORE INTO `billing_carc_rarc_dictionary` (`code`, `type`, `category`, `title`, `description`, `recommended_appeal_strategy`) VALUES
('CO-16', 'CARC', 'coding_billing_error', 'Claim lacks information or has billing errors', 'Claim/service lacks information or has submission/billing error(s).', 'Review remits for missing modifiers, invalid subscriber ID, or missing diagnosis pointers. Resubmit as corrected claim with 7-digit original ICN.'),
('CO-197', 'CARC', 'prior_auth_missing', 'Precertification / Prior Authorization Absent', 'Precertification/authorization/notification/pre-treatment absent.', 'Submit Level 1 Appeal with retro-authorization request, attaching urgent clinical admission notes and proof of prior authorization request or emergency status.'),
('CO-50', 'CARC', 'medical_necessity', 'Not Deemed a Medical Necessity by Payer', 'These are non-covered services because this is not deemed a medical necessity by the payer.', 'Generate Medical Necessity Appeal Letter attaching physician clinical trajectory notes, lab/radiology evidence, operative report, and applicable CMS LCD/NCD coverage guidelines.'),
('CO-29', 'CARC', 'timely_filing', 'Time Limit for Filing Has Expired', 'The time limit for filing has expired.', 'Submit formal Timely Filing Appeal attaching certified Electronic Data Interchange (EDI) clearinghouse 277 acceptance logs and original 837P transmission timestamps proving initial submission within filing window.'),
('CO-45', 'CARC', 'fee_schedule_contractual', 'Charge Exceeds Fee Schedule / Maximum Allowable', 'Charge exceeds fee schedule/maximum allowable amount.', 'Contractual write-off under participating provider agreement unless out-of-network without surprise billing protections.'),
('CO-97', 'CARC', 'coding_billing_error', 'Bundled Service Allowance Included in Another Service', 'The benefit for this service is included in the payment/allowance for another service/procedure that has already been adjudicated.', 'Review NCCI edits. If procedures were distinct and separately identifiable, attach operative report and append Modifier -59 or -X{EPSU} on appeal.'),
('CO-22', 'CARC', 'eligibility_coverage', 'Coordination of Benefits / Other Primary Payer', 'This care may be covered by another payer per coordination of benefits.', 'Obtain primary payer Explanation of Benefits (EOB) and submit secondary claim with primary remittance voucher attached.'),
('CO-18', 'CARC', 'duplicate_claim', 'Exact Duplicate Claim / Service', 'Exact duplicate claim/service previously adjudicated.', 'Verify if separate encounter or bilateral procedure. If distinct, submit appeal with Modifier -76 (Repeat procedure by same physician) and clinical timeline.'),
('CO-151', 'CARC', 'coding_billing_error', 'Downcoding / Service Level Not Supported', 'Payment adjusted because the payer deems the information submitted does not support this level of service.', 'Submit E/M audit sheet and detailed physician progress note demonstrating complexity of Medical Decision Making (MDM) supporting higher level billed.');

-- Atomic Counters for DEN-YYYY-XXXXX and APP-YYYY-XXXXX
CREATE TABLE IF NOT EXISTS `billing_denial_counters` (
    `counter_type` VARCHAR(20) NOT NULL,
    `year` INT NOT NULL,
    `last_number` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`counter_type`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `billing_denial_counters` (`counter_type`, `year`, `last_number`) VALUES
('DENIAL', YEAR(CURDATE()), 0),
('APPEAL', YEAR(CURDATE()), 0);
