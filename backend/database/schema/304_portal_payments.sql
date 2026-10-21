-- ============================================================================
-- Migration: 304_portal_payments.sql
-- My Chart Phase 4: paying a hospital bill from the patient portal.
--
-- Two additions:
--
-- 1. patient_ledger_payments learns where a payment came from and whether the
--    money has actually arrived. Until now every row was a payment taken at the
--    counter and therefore real. A payment started in the portal is only real
--    once it is settled, so `status` gates whether the ledger counts it --
--    PatientLedgerService::listPayments() ignores anything that is not settled,
--    or a patient could clear their balance by pressing a button.
--
-- 2. portal_payment_attempts records what was attempted and what the payment
--    provider said back. It never holds card data: the card_number / card_expiry
--    / card_cvv columns on patient_ledger_payments stay counter-only and are
--    never written from the portal.
-- ============================================================================

SET NAMES utf8mb4;

ALTER TABLE `patient_ledger_payments`
    ADD COLUMN IF NOT EXISTS `source` ENUM('counter', 'portal') NOT NULL DEFAULT 'counter' AFTER `payment_type`,
    ADD COLUMN IF NOT EXISTS `reference_no` VARCHAR(100) NULL DEFAULT NULL AFTER `source`,
    ADD COLUMN IF NOT EXISTS `status` ENUM('pending', 'settled', 'failed', 'voided') NOT NULL DEFAULT 'settled' AFTER `reference_no`,
    ADD COLUMN IF NOT EXISTS `settled_at` DATETIME NULL DEFAULT NULL AFTER `status`;

ALTER TABLE `patient_ledger_payments`
    ADD INDEX IF NOT EXISTS `idx_plp_status` (`patient_id`, `status`);

CREATE TABLE IF NOT EXISTS `portal_payment_attempts` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `user_id` INT NULL DEFAULT NULL,
    `reference_no` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `provider` VARCHAR(50) NOT NULL DEFAULT 'cashier',
    `provider_ref` VARCHAR(100) NULL DEFAULT NULL,
    `status` ENUM('pending', 'settled', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    `payment_id` INT NULL DEFAULT NULL,
    `note` VARCHAR(255) NULL DEFAULT NULL,
    `raw_response` TEXT NULL DEFAULT NULL,
    `settled_at` DATETIME NULL DEFAULT NULL,
    `settled_by` INT NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_portal_attempt_ref` (`reference_no`),
    INDEX `idx_portal_attempt_patient` (`patient_id`, `status`),
    INDEX `idx_portal_attempt_status` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
