-- =====================================================================
-- Migration 310: Patient Advance Deposit Management & Automated Drawdowns
-- Tables: billing_patient_deposits, billing_deposit_drawdowns, billing_deposit_refunds
-- Tracks upfront admission deposits, automated drawdown deductions against
-- interim/final folios, and unused deposit balance refunds.
-- =====================================================================

CREATE TABLE IF NOT EXISTS `billing_patient_deposits` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `deposit_number` VARCHAR(50) NOT NULL UNIQUE,
    `receipt_number` VARCHAR(50) NOT NULL,
    `patient_id` INT NOT NULL,
    `admission_id` INT UNSIGNED DEFAULT NULL,
    `folio_id` INT UNSIGNED DEFAULT NULL,
    `deposit_type` ENUM(
        'inpatient_admission',
        'elective_surgery',
        'maternity_package',
        'icu_reservation',
        'general_prepayment'
    ) NOT NULL DEFAULT 'inpatient_admission',

    `payment_method` ENUM(
        'cash',
        'credit_card',
        'debit_card',
        'check',
        'gcash_maya',
        'bank_transfer'
    ) NOT NULL DEFAULT 'cash',
    `reference_no` VARCHAR(100) DEFAULT NULL,

    -- Balances Ledger
    `initial_deposit_amount` DECIMAL(12,2) NOT NULL,
    `total_drawn_down` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_refunded` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `remaining_balance` DECIMAL(12,2) NOT NULL,

    `deposit_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `status` ENUM(
        'active',
        'partially_utilized',
        'exhausted',
        'refunded',
        'voided'
    ) NOT NULL DEFAULT 'active',

    `cashier_id` INT DEFAULT NULL,
    `cashier_name` VARCHAR(150) NOT NULL DEFAULT 'Main Cashier Desk',
    `notes` TEXT DEFAULT NULL,

    `voided_at` DATETIME DEFAULT NULL,
    `voided_by` INT DEFAULT NULL,
    `void_reason` VARCHAR(255) DEFAULT NULL,

    `created_by` INT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY `idx_bpd_patient` (`patient_id`),
    KEY `idx_bpd_admission` (`admission_id`),
    KEY `idx_bpd_folio` (`folio_id`),
    KEY `idx_bpd_status` (`status`),
    KEY `idx_bpd_date` (`deposit_date`),
    KEY `idx_bpd_receipt` (`receipt_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_deposit_drawdowns` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `drawdown_number` VARCHAR(50) NOT NULL UNIQUE,
    `deposit_id` INT UNSIGNED NOT NULL,
    `folio_id` INT UNSIGNED NOT NULL,
    `amount_drawn` DECIMAL(12,2) NOT NULL,
    `previous_deposit_balance` DECIMAL(12,2) NOT NULL,
    `new_deposit_balance` DECIMAL(12,2) NOT NULL,
    `drawdown_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `drawdown_type` ENUM(
        'interim_billing_deduction',
        'discharge_final_settlement',
        'manual_deduction'
    ) NOT NULL DEFAULT 'interim_billing_deduction',
    `notes` VARCHAR(255) DEFAULT NULL,
    `created_by` INT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY `idx_bdd_deposit` (`deposit_id`),
    KEY `idx_bdd_folio` (`folio_id`),
    KEY `idx_bdd_date` (`drawdown_date`),
    CONSTRAINT `fk_bdd_deposit`
        FOREIGN KEY (`deposit_id`)
        REFERENCES `billing_patient_deposits` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_deposit_refunds` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `refund_number` VARCHAR(50) NOT NULL UNIQUE,
    `deposit_id` INT UNSIGNED NOT NULL,
    `patient_id` INT NOT NULL,
    `folio_id` INT UNSIGNED DEFAULT NULL,
    `refund_amount` DECIMAL(12,2) NOT NULL,
    `refund_method` ENUM(
        'cash',
        'card_reversal',
        'check',
        'bank_transfer',
        'gcash_maya'
    ) NOT NULL DEFAULT 'cash',
    `refund_reason` ENUM(
        'unused_discharge_balance',
        'admission_cancelled',
        'overpayment_correction',
        'insurance_retroactive_takeover'
    ) NOT NULL DEFAULT 'unused_discharge_balance',
    `disbursed_by` INT DEFAULT NULL,
    `disbursed_by_name` VARCHAR(150) NOT NULL,
    `recipient_name` VARCHAR(150) NOT NULL,
    `recipient_signature_acknowledged` TINYINT(1) NOT NULL DEFAULT 1,
    `reference_no` VARCHAR(100) DEFAULT NULL,
    `notes` TEXT DEFAULT NULL,
    `refund_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY `idx_bdr_deposit` (`deposit_id`),
    KEY `idx_bdr_patient` (`patient_id`),
    KEY `idx_bdr_date` (`refund_date`),
    CONSTRAINT `fk_bdr_deposit`
        FOREIGN KEY (`deposit_id`)
        REFERENCES `billing_patient_deposits` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_deposit_counters` (
    `counter_type` VARCHAR(20) NOT NULL,
    `year` INT NOT NULL,
    `last_number` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`counter_type`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `billing_deposit_counters` (`counter_type`, `year`, `last_number`) VALUES
('DEPOSIT', YEAR(CURDATE()), 0),
('DRAWDOWN', YEAR(CURDATE()), 0),
('REFUND', YEAR(CURDATE()), 0);
