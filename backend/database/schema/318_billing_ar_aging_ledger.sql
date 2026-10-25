-- =====================================================================
-- Migration 318: Accounts Receivable (AR) Aging Engine & Collection Ledger
-- Tables: billing_ar_accounts, billing_ar_collection_notes, billing_ar_counters
-- Allows Finance Leadership to view outstanding receivables broken down into
-- aging intervals (0–30, 31–60, 61–90, 91–120, >120 days) segregated by
-- Payer Category (Self-Pay vs Commercial HMO vs Government Payers).
-- =====================================================================

CREATE TABLE IF NOT EXISTS `billing_ar_accounts` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `account_number` VARCHAR(50) NOT NULL UNIQUE,
    `patient_id` INT NOT NULL,
    `folio_id` INT UNSIGNED DEFAULT NULL,
    `encounter_id` INT DEFAULT NULL,
    `invoice_number` VARCHAR(50) DEFAULT NULL,

    `service_date` DATE NOT NULL,
    `discharge_date` DATE DEFAULT NULL,

    `payer_category` ENUM(
        'self_pay',
        'commercial_hmo',
        'government'
    ) NOT NULL DEFAULT 'self_pay',

    `payer_name` VARCHAR(150) NOT NULL DEFAULT 'Self-Pay / Patient Responsibility',
    `insurance_id` INT DEFAULT NULL,
    `policy_number` VARCHAR(100) DEFAULT NULL,
    `claim_control_number` VARCHAR(100) DEFAULT NULL,

    -- Financial Breakdown
    `total_charges` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `insurance_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `insurance_adjusted` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `patient_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `patient_discount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `current_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    -- Aging Computation
    `days_aged` INT NOT NULL DEFAULT 0,
    `aging_bucket` ENUM(
        '0-30',
        '31-60',
        '61-90',
        '91-120',
        '120+'
    ) NOT NULL DEFAULT '0-30',

    -- Collection Lifecycle
    `collection_status` ENUM(
        'current',
        'first_notice_sent',
        'second_notice_sent',
        'final_demand_sent',
        'under_appeal',
        'in_payment_plan',
        'promise_to_pay',
        'referred_to_collections',
        'bad_debt_write_off',
        'settled'
    ) NOT NULL DEFAULT 'current',

    `promise_amount` DECIMAL(12,2) DEFAULT NULL,
    `promise_date` DATE DEFAULT NULL,
    `last_contact_date` DATE DEFAULT NULL,
    `next_follow_up_date` DATE DEFAULT NULL,
    `assigned_collector` VARCHAR(150) DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY `idx_ar_patient` (`patient_id`),
    KEY `idx_ar_folio` (`folio_id`),
    KEY `idx_ar_encounter` (`encounter_id`),
    KEY `idx_ar_payer_cat` (`payer_category`),
    KEY `idx_ar_bucket` (`aging_bucket`),
    KEY `idx_ar_status` (`collection_status`),
    KEY `idx_ar_date` (`service_date`),
    KEY `idx_ar_balance` (`current_balance`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_ar_collection_notes` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `ar_account_id` INT UNSIGNED NOT NULL,
    `contact_type` ENUM(
        'phone_call',
        'letter_sent',
        'email',
        'payer_portal',
        'in_person',
        'settlement_negotiation',
        'internal_review'
    ) NOT NULL DEFAULT 'phone_call',
    `contacted_party` VARCHAR(150) NOT NULL,
    `action_outcome` VARCHAR(100) DEFAULT NULL,
    `notes` TEXT NOT NULL,
    `next_follow_up_date` DATE DEFAULT NULL,
    `created_by` INT DEFAULT NULL,
    `created_by_name` VARCHAR(150) NOT NULL DEFAULT 'Collection Specialist',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY `idx_ar_notes_acct` (`ar_account_id`),
    KEY `idx_ar_notes_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_ar_counters` (
    `counter_type` VARCHAR(30) NOT NULL,
    `year` INT NOT NULL,
    `last_number` INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`counter_type`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize counter
INSERT IGNORE INTO `billing_ar_counters` (`counter_type`, `year`, `last_number`) VALUES
('AR_ACCOUNT', YEAR(CURRENT_DATE()), 0);
