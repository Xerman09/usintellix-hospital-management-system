-- =====================================================================
-- Migration 308: Split-Tender Cashiering & Official Tax Receipts
-- Table: billing_cashier_transactions & billing_cashier_tenders
-- Supports multi-tender split payments (Cash + Card + HMO Guarantee + Check),
-- change calculation, POS terminal reference tracking, and BIR/tax-compliant receipts.
-- =====================================================================

CREATE TABLE IF NOT EXISTS `billing_cashier_transactions` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `transaction_number` VARCHAR(50) NOT NULL UNIQUE,
    `receipt_number` VARCHAR(50) NOT NULL UNIQUE,
    `patient_id` INT NOT NULL,
    `folio_id` INT UNSIGNED DEFAULT NULL,
    `encounter_id` INT DEFAULT NULL,
    `source_type` ENUM(
        'inpatient_folio',
        'ambulatory_encounter',
        'pharmacy',
        'laboratory',
        'radiology',
        'er_billing',
        'general_deposit'
    ) NOT NULL DEFAULT 'inpatient_folio',
    
    -- Financial Totals
    `gross_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `discount_type` VARCHAR(100) DEFAULT NULL,
    `net_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_tendered` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_applied` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `change_due` DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    -- Tax & Regulatory Compliance
    `tax_type` ENUM('vat_exempt', 'vatable', 'zero_rated') NOT NULL DEFAULT 'vat_exempt',
    `vatable_sales` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `vat_exempt_sales` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `zero_rated_sales` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `vat_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `tax_id_number` VARCHAR(50) DEFAULT NULL,
    `business_name` VARCHAR(200) DEFAULT NULL,
    `business_address` VARCHAR(255) DEFAULT NULL,

    -- Cashier Shift & Terminal Identification
    `cashier_id` INT DEFAULT NULL,
    `cashier_name` VARCHAR(150) NOT NULL DEFAULT 'Main Cashier Desk',
    `terminal_id` VARCHAR(50) NOT NULL DEFAULT 'POS-TERM-01',
    `notes` TEXT DEFAULT NULL,

    -- Audit & Void Status
    `status` ENUM('completed', 'voided', 'refunded') NOT NULL DEFAULT 'completed',
    `voided_at` DATETIME DEFAULT NULL,
    `voided_by` INT DEFAULT NULL,
    `void_reason` VARCHAR(255) DEFAULT NULL,

    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY `idx_bct_patient` (`patient_id`),
    KEY `idx_bct_folio` (`folio_id`),
    KEY `idx_bct_encounter` (`encounter_id`),
    KEY `idx_bct_date` (`created_at`),
    KEY `idx_bct_receipt` (`receipt_number`),
    KEY `idx_bct_cashier` (`cashier_name`, `terminal_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_cashier_tenders` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `transaction_id` INT UNSIGNED NOT NULL,
    `tender_index` TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `payment_method` ENUM(
        'cash',
        'credit_card',
        'debit_card',
        'check',
        'gcash_maya',
        'bank_transfer',
        'insurance_guarantee_letter',
        'philhealth_deduction',
        'promissory_note'
    ) NOT NULL DEFAULT 'cash',
    
    `amount_applied` DECIMAL(12,2) NOT NULL,
    `amount_tendered` DECIMAL(12,2) NOT NULL,
    `change_returned` DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    -- Credit / Debit Card Details
    `card_brand` VARCHAR(50) DEFAULT NULL,
    `card_last_four` VARCHAR(4) DEFAULT NULL,
    `terminal_reference` VARCHAR(100) DEFAULT NULL,
    `terminal_device` VARCHAR(100) DEFAULT NULL,

    -- Check Details
    `check_number` VARCHAR(50) DEFAULT NULL,
    `check_bank` VARCHAR(100) DEFAULT NULL,
    `check_date` DATE DEFAULT NULL,

    -- HMO / Corporate Guarantee / LOA Details
    `guarantor_name` VARCHAR(150) DEFAULT NULL,
    `loa_reference` VARCHAR(100) DEFAULT NULL,

    -- Digital Wallet / Wire Reference
    `online_transfer_ref` VARCHAR(100) DEFAULT NULL,

    `notes` VARCHAR(255) DEFAULT NULL,
    `status` ENUM('applied', 'voided') NOT NULL DEFAULT 'applied',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY `idx_tender_txn` (`transaction_id`),
    KEY `idx_tender_method` (`payment_method`),
    KEY `idx_tender_ref` (`terminal_reference`, `loa_reference`, `check_number`),
    CONSTRAINT `fk_bct_transaction`
        FOREIGN KEY (`transaction_id`)
        REFERENCES `billing_cashier_transactions` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Counter for atomic transaction IDs TXN-YYYY-XXXXX
CREATE TABLE IF NOT EXISTS `billing_transaction_counters` (
    `year` INT NOT NULL PRIMARY KEY,
    `last_number` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `billing_transaction_counters` (`year`, `last_number`) VALUES (YEAR(CURDATE()), 0);
