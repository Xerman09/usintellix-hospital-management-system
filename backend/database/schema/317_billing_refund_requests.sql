-- =====================================================================
-- Migration 317: Refund Authorization Pipeline (Multi-Level Approval)
-- Tables: billing_refund_requests, billing_refund_audit_trail, billing_refund_counters
-- Formal approval request workflow for hospital overpayments and credit balances:
-- 1. Biller / Cashier Request Submission
-- 2. Finance Manager / Supervisor Review & Approval
-- 3. Accounting Payment Voucher Issuance (PV-YYYY-XXXXX)
-- 4. Treasury / Cashier Disbursement Release & Recipient Sign-off
-- =====================================================================

CREATE TABLE IF NOT EXISTS `billing_refund_requests` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `request_number` VARCHAR(50) NOT NULL UNIQUE,
    `patient_id` INT NOT NULL,
    `admission_id` INT UNSIGNED DEFAULT NULL,
    `folio_id` INT UNSIGNED DEFAULT NULL,
    `deposit_id` INT UNSIGNED DEFAULT NULL,
    `original_receipt_number` VARCHAR(50) DEFAULT NULL,

    `refund_reason_category` ENUM(
        'overpayment',
        'retroactive_insurance_adjustment',
        'deposit_credit_balance',
        'duplicate_payment',
        'cancelled_procedure_service',
        'billing_charge_adjustment',
        'pharmacy_return',
        'other'
    ) NOT NULL DEFAULT 'overpayment',
    `refund_reason_description` TEXT NOT NULL,

    `total_credit_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `requested_amount` DECIMAL(12,2) NOT NULL,
    `approved_amount` DECIMAL(12,2) DEFAULT NULL,
    `disbursed_amount` DECIMAL(12,2) DEFAULT NULL,

    `proposed_payment_method` ENUM(
        'check',
        'cash',
        'bank_transfer',
        'credit_card_reversal',
        'online_wallet'
    ) NOT NULL DEFAULT 'check',

    `status` ENUM(
        'draft',
        'pending_approval',
        'approved',
        'rejected',
        'voucher_issued',
        'disbursed',
        'voided'
    ) NOT NULL DEFAULT 'pending_approval',

    -- Stage 1: Biller / Cashier Request
    `requested_by` INT DEFAULT NULL,
    `requested_by_name` VARCHAR(150) NOT NULL DEFAULT 'Billing Clerk',
    `requested_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `justification` TEXT DEFAULT NULL,
    `supporting_documents` TEXT DEFAULT NULL,

    -- Stage 2: Finance Manager Review & Approval
    `reviewed_by` INT DEFAULT NULL,
    `reviewed_by_name` VARCHAR(150) DEFAULT NULL,
    `reviewed_at` DATETIME DEFAULT NULL,
    `approval_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `approval_notes` TEXT DEFAULT NULL,
    `rejection_reason` VARCHAR(255) DEFAULT NULL,

    -- Stage 3: Payment Voucher Issuance
    `voucher_number` VARCHAR(50) DEFAULT NULL UNIQUE,
    `voucher_issued_by` INT DEFAULT NULL,
    `voucher_issued_by_name` VARCHAR(150) DEFAULT NULL,
    `voucher_issued_at` DATETIME DEFAULT NULL,
    `disbursement_method` ENUM(
        'check',
        'cash',
        'bank_transfer',
        'credit_card_reversal',
        'online_wallet'
    ) DEFAULT NULL,
    `check_number` VARCHAR(50) DEFAULT NULL,
    `bank_name` VARCHAR(100) DEFAULT NULL,
    `bank_account_number` VARCHAR(50) DEFAULT NULL,
    `transaction_reference` VARCHAR(100) DEFAULT NULL,

    -- Stage 4: Payee & Disbursement Execution
    `payee_name` VARCHAR(150) NOT NULL,
    `payee_relationship` VARCHAR(50) NOT NULL DEFAULT 'self',
    `payee_id_type` VARCHAR(50) DEFAULT NULL,
    `payee_id_number` VARCHAR(50) DEFAULT NULL,
    `disbursed_by` INT DEFAULT NULL,
    `disbursed_by_name` VARCHAR(150) DEFAULT NULL,
    `disbursed_at` DATETIME DEFAULT NULL,
    `disbursement_notes` TEXT DEFAULT NULL,

    -- Timestamps
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY `idx_brr_patient` (`patient_id`),
    KEY `idx_brr_admission` (`admission_id`),
    KEY `idx_brr_folio` (`folio_id`),
    KEY `idx_brr_deposit` (`deposit_id`),
    KEY `idx_brr_status` (`status`),
    KEY `idx_brr_voucher` (`voucher_number`),
    KEY `idx_brr_req_date` (`requested_at`),
    KEY `idx_brr_app_status` (`approval_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_refund_audit_trail` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `refund_request_id` INT UNSIGNED NOT NULL,
    `action` ENUM(
        'CREATED',
        'SUBMITTED',
        'APPROVED',
        'REJECTED',
        'VOUCHER_ISSUED',
        'DISBURSED',
        'VOIDED',
        'NOTE_ADDED'
    ) NOT NULL,
    `previous_status` VARCHAR(50) DEFAULT NULL,
    `new_status` VARCHAR(50) NOT NULL,
    `performed_by` INT DEFAULT NULL,
    `performed_by_name` VARCHAR(150) NOT NULL,
    `comments` TEXT DEFAULT NULL,
    `performed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY `idx_brat_request` (`refund_request_id`),
    KEY `idx_brat_action` (`action`),
    KEY `idx_brat_date` (`performed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_refund_counters` (
    `counter_type` VARCHAR(30) NOT NULL,
    `year` INT NOT NULL,
    `last_number` INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`counter_type`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize counters
INSERT IGNORE INTO `billing_refund_counters` (`counter_type`, `year`, `last_number`) VALUES
('REFUND_REQUEST', YEAR(CURRENT_DATE()), 0),
('PAYMENT_VOUCHER', YEAR(CURRENT_DATE()), 0);
