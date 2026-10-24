-- ========================================================
-- Migration: 299_narcotics_vault_ledger.sql
-- Module: Pharmacy > Central Pharmacy Narcotics Vault Perpetual Safe Ledger
-- Purpose: Strict dual-custody perpetual ledger and daily shift balance audit
--          for DEA Schedule II-V / Dangerous Drugs (RA 9165).
--          Enforces two signed witnesses on every movement (receipt, ward transfer,
--          waste/destruction, return, discrepancy adjustment) and shift safe counts.
-- ========================================================

-- 1. Support security PIN verification on users table
ALTER TABLE `users`
    ADD COLUMN IF NOT EXISTS `security_pin` VARCHAR(255) NULL AFTER `password`;

-- 2. Master Narcotics Vault Inventory Items
CREATE TABLE IF NOT EXISTS `narcotics_vault_items` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `drug_id` INT NOT NULL,
    `item_code` VARCHAR(50) NOT NULL UNIQUE,
    `brand_and_strength` VARCHAR(255) NOT NULL,
    `dea_schedule` ENUM('Schedule II', 'Schedule III', 'Schedule IV', 'Schedule V', 'Dangerous Drug (RA 9165)') NOT NULL DEFAULT 'Schedule II',
    `safe_location` VARCHAR(150) NOT NULL DEFAULT 'Main Vault Safe - Shelf A',
    `package_form` VARCHAR(50) NOT NULL DEFAULT 'ampoule',
    `current_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `minimum_safe_par` DECIMAL(12,2) NOT NULL DEFAULT 10.00,
    `maximum_safe_capacity` DECIMAL(12,2) NOT NULL DEFAULT 100.00,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_nvi_drug` (`drug_id`),
    KEY `idx_nvi_schedule` (`dea_schedule`),
    CONSTRAINT `fk_nvi_drug` FOREIGN KEY (`drug_id`) REFERENCES `drugs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Perpetual Transaction Safe Ledger with Mandatory Dual-Custody Witnessing
CREATE TABLE IF NOT EXISTS `narcotics_vault_movements` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `transaction_number` VARCHAR(50) NOT NULL UNIQUE,
    `vault_item_id` INT UNSIGNED NOT NULL,
    `movement_type` ENUM(
        'receipt_po',
        'transfer_to_ward',
        'ward_return',
        'destruction_waste',
        'audit_adjustment',
        'rx_direct_dispense'
    ) NOT NULL,
    `lot_number` VARCHAR(100) NOT NULL,
    `lot_expiry` DATE NULL,
    `quantity_in` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `quantity_out` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `balance_before` DECIMAL(12,2) NOT NULL,
    `balance_after` DECIMAL(12,2) NOT NULL,
    `reference_number` VARCHAR(100) NULL,
    `ward_destination` VARCHAR(150) NULL,
    `patient_id` INT NULL,
    `witness_1_user_id` INT NOT NULL,
    `witness_1_signed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `witness_1_auth_method` VARCHAR(30) NOT NULL DEFAULT 'pin_or_password',
    `witness_2_user_id` INT NOT NULL,
    `witness_2_signed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `witness_2_auth_method` VARCHAR(30) NOT NULL DEFAULT 'pin_or_password',
    `dual_custody_notes` TEXT NULL,
    `status` ENUM('verified_completed', 'flagged_discrepancy', 'voided') NOT NULL DEFAULT 'verified_completed',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_nvm_item` (`vault_item_id`),
    KEY `idx_nvm_type` (`movement_type`),
    KEY `idx_nvm_w1` (`witness_1_user_id`),
    KEY `idx_nvm_w2` (`witness_2_user_id`),
    KEY `idx_nvm_created` (`created_at`),
    CONSTRAINT `fk_nvm_item` FOREIGN KEY (`vault_item_id`) REFERENCES `narcotics_vault_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Daily / End-of-Shift Safe Count Verification Audits
CREATE TABLE IF NOT EXISTS `narcotics_vault_shift_audits` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `audit_number` VARCHAR(50) NOT NULL UNIQUE,
    `shift_name` ENUM('Morning Shift (06:00 - 14:00)', 'Afternoon Shift (14:00 - 22:00)', 'Night Shift (22:00 - 06:00)') NOT NULL,
    `audit_date` DATE NOT NULL,
    `safe_seal_intact` TINYINT(1) NOT NULL DEFAULT 1,
    `safe_seal_number` VARCHAR(50) NULL,
    `auditor_1_user_id` INT NOT NULL,
    `auditor_1_signed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `auditor_2_user_id` INT NOT NULL,
    `auditor_2_signed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `total_items_counted` INT NOT NULL DEFAULT 0,
    `discrepancies_detected` INT NOT NULL DEFAULT 0,
    `status` ENUM('balanced_verified', 'variance_unresolved', 'investigation_escalated') NOT NULL DEFAULT 'balanced_verified',
    `audit_notes` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_nvsa_date` (`audit_date`),
    KEY `idx_nvsa_shift` (`shift_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Shift Safe Count Item Verification Detail
CREATE TABLE IF NOT EXISTS `narcotics_vault_shift_audit_items` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `shift_audit_id` INT UNSIGNED NOT NULL,
    `vault_item_id` INT UNSIGNED NOT NULL,
    `book_balance` DECIMAL(12,2) NOT NULL,
    `physical_count` DECIMAL(12,2) NOT NULL,
    `variance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `variance_reason` VARCHAR(255) NULL,
    PRIMARY KEY (`id`),
    KEY `idx_nvai_audit` (`shift_audit_id`),
    KEY `idx_nvai_item` (`vault_item_id`),
    CONSTRAINT `fk_nvai_audit` FOREIGN KEY (`shift_audit_id`) REFERENCES `narcotics_vault_shift_audits` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_nvai_item` FOREIGN KEY (`vault_item_id`) REFERENCES `narcotics_vault_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Pre-seed Standard Controlled Drugs into `drugs` table if missing
INSERT IGNORE INTO `drugs` (
    `id`, `name`, `generic_name`, `strength`, `controlled_class`, `is_high_alert`,
    `product_type`, `unit`, `requires_prescription`, `is_active`, `allow_inventory`, `created_at`
) VALUES
(8001, 'Morphine Sulfate 10 mg/mL Injection (Ampoule 1 mL)', 'Morphine Sulfate', '10 mg/mL', 'Dangerous Drug (RA 9165)', 1, 'Drug', 'ampoule', 1, 1, 1, NOW()),
(8002, 'Fentanyl Citrate 50 mcg/mL Injection (Ampoule 2 mL)', 'Fentanyl Citrate', '50 mcg/mL', 'Dangerous Drug (RA 9165)', 1, 'Drug', 'ampoule', 1, 1, 1, NOW()),
(8003, 'Midazolam 5 mg/mL Injection (Ampoule 1 mL)', 'Midazolam', '5 mg/mL', 'Dangerous Drug (RA 9165)', 1, 'Drug', 'ampoule', 1, 1, 1, NOW()),
(8004, 'Oxycodone Hydrochloride 10 mg Tablet', 'Oxycodone Hydrochloride', '10 mg', 'Dangerous Drug (RA 9165)', 1, 'Drug', 'tablet', 1, 1, 1, NOW()),
(8005, 'Pethidine (Meperidine) HCl 50 mg/mL Injection (Ampoule 1 mL)', 'Pethidine Hydrochloride', '50 mg/mL', 'Dangerous Drug (RA 9165)', 1, 'Drug', 'ampoule', 1, 1, 1, NOW()),
(8006, 'Diazepam 5 mg/mL Injection (Ampoule 2 mL)', 'Diazepam', '5 mg/mL', 'Dangerous Drug (RA 9165)', 1, 'Drug', 'ampoule', 1, 1, 1, NOW());

-- 7. Pre-seed Master Central Pharmacy Narcotics Safe Vault Inventory Items
INSERT IGNORE INTO `narcotics_vault_items` (
    `id`, `drug_id`, `item_code`, `brand_and_strength`, `dea_schedule`, `safe_location`,
    `package_form`, `current_balance`, `minimum_safe_par`, `maximum_safe_capacity`
) VALUES
(1, 8001, 'NV-MOR-01', 'Morphine Sulfate 10 mg/mL Ampoule (1 mL)', 'Schedule II', 'Vault Safe A - Drawer 1 (High Narcotic)', 'ampoule', 50.00, 20.00, 200.00),
(2, 8002, 'NV-FEN-01', 'Fentanyl Citrate 50 mcg/mL Ampoule (2 mL)', 'Schedule II', 'Vault Safe A - Drawer 2 (High Narcotic)', 'ampoule', 60.00, 25.00, 250.00),
(3, 8003, 'NV-MID-01', 'Midazolam 5 mg/mL Ampoule (1 mL)', 'Schedule IV', 'Vault Safe B - Shelf 1 (Sedatives)', 'ampoule', 80.00, 30.00, 300.00),
(4, 8004, 'NV-OXY-01', 'Oxycodone HCl 10 mg Oral Tablet', 'Schedule II', 'Vault Safe A - Drawer 3 (Oral Narcotics)', 'tablet', 120.00, 50.00, 500.00),
(5, 8005, 'NV-PET-01', 'Pethidine HCl 50 mg/mL Ampoule (1 mL)', 'Schedule II', 'Vault Safe A - Drawer 4 (Opioid Safe)', 'ampoule', 40.00, 15.00, 150.00),
(6, 8006, 'NV-DIA-01', 'Diazepam 5 mg/mL Ampoule (2 mL)', 'Schedule IV', 'Vault Safe B - Shelf 2 (Benzodiazepines)', 'ampoule', 70.00, 25.00, 200.00),
(7, 419,  'NV-TRA-01', 'Tramadol HCl 50 mg Capsule (Ultram)', 'Schedule IV', 'Vault Safe B - Shelf 3 (Controlled Analgesics)', 'capsule', 150.00, 50.00, 600.00);

-- 8. Seed Initial Perpetual Balance Receipts
INSERT IGNORE INTO `narcotics_vault_movements` (
    `id`, `transaction_number`, `vault_item_id`, `movement_type`, `lot_number`, `lot_expiry`,
    `quantity_in`, `quantity_out`, `balance_before`, `balance_after`, `reference_number`,
    `witness_1_user_id`, `witness_2_user_id`, `dual_custody_notes`
) VALUES
(1, 'NVM-2026-00001', 1, 'receipt_po', 'LOT-MOR-2026A', DATE_ADD(CURDATE(), INTERVAL 720 DAY), 50.00, 0.00, 0.00, 50.00, 'PO-2026-NAR-01', 1, 1682, 'Initial safe intake verification and dual count sign-off.'),
(2, 'NVM-2026-00002', 2, 'receipt_po', 'LOT-FEN-2026B', DATE_ADD(CURDATE(), INTERVAL 600 DAY), 60.00, 0.00, 0.00, 60.00, 'PO-2026-NAR-01', 1, 1682, 'Initial safe intake verification and dual count sign-off.'),
(3, 'NVM-2026-00003', 3, 'receipt_po', 'LOT-MID-2026C', DATE_ADD(CURDATE(), INTERVAL 540 DAY), 80.00, 0.00, 0.00, 80.00, 'PO-2026-NAR-01', 1, 1682, 'Initial safe intake verification and dual count sign-off.'),
(4, 'NVM-2026-00004', 4, 'receipt_po', 'LOT-OXY-2026D', DATE_ADD(CURDATE(), INTERVAL 900 DAY), 120.00, 0.00, 0.00, 120.00, 'PO-2026-NAR-02', 1, 1682, 'Initial safe intake verification and dual count sign-off.'),
(5, 'NVM-2026-00005', 5, 'receipt_po', 'LOT-PET-2026E', DATE_ADD(CURDATE(), INTERVAL 480 DAY), 40.00, 0.00, 0.00, 40.00, 'PO-2026-NAR-02', 1, 1682, 'Initial safe intake verification and dual count sign-off.'),
(6, 'NVM-2026-00006', 6, 'receipt_po', 'LOT-DIA-2026F', DATE_ADD(CURDATE(), INTERVAL 620 DAY), 70.00, 0.00, 0.00, 70.00, 'PO-2026-NAR-03', 1, 1682, 'Initial safe intake verification and dual count sign-off.'),
(7, 'NVM-2026-00007', 7, 'receipt_po', 'LOT-TRA-2026G', DATE_ADD(CURDATE(), INTERVAL 800 DAY), 150.00, 0.00, 0.00, 150.00, 'PO-2026-NAR-03', 1, 1682, 'Initial safe intake verification and dual count sign-off.');
