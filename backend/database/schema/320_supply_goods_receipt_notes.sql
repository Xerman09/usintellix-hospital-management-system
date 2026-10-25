-- =====================================================================
-- Migration 320: Hospital Goods Receipt Notes (GRN) & 3-Way Matching
-- Tables: supply_goods_receipt_notes, supply_goods_receipt_items
-- Quality inspection at hospital dock logging accepted vs rejected items,
-- package integrity, sterility verification, and 3-way matching
-- (Purchase Order vs Delivery Receipt vs GRN) before AP payment authorization.
-- =====================================================================

SET NAMES utf8mb4;

-- 1. Goods Receipt Notes (GRN) Master Record
CREATE TABLE IF NOT EXISTS `supply_goods_receipt_notes` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `grn_number` VARCHAR(50) NOT NULL UNIQUE,
    `purchase_order_id` INT NULL,
    `po_number` VARCHAR(50) NULL,
    `supplier_id` INT NOT NULL,
    `supplier_name` VARCHAR(255) NOT NULL,
    `delivery_receipt_no` VARCHAR(100) NOT NULL,
    `carrier_name` VARCHAR(150) NULL DEFAULT 'Vendor Direct Delivery Truck',
    `vehicle_plate_no` VARCHAR(50) NULL,
    `received_date` DATE NOT NULL,
    `receiving_bay` VARCHAR(100) NOT NULL DEFAULT 'Hospital Central Receiving Dock Bay 1',
    `inspector_employee_id` INT NULL,
    `inspector_name` VARCHAR(150) NOT NULL,
    `inspector_title` VARCHAR(100) NOT NULL DEFAULT 'Materials Management Officer',

    -- Quality Inspection & Package Integrity Checks
    `package_condition` ENUM(
        'intact_undamaged',
        'minor_outer_crush',
        'severe_damage_open',
        'water_moisture_damage',
        'compromised_seals'
    ) NOT NULL DEFAULT 'intact_undamaged',
    `cold_chain_verified` TINYINT(1) NOT NULL DEFAULT 1,
    `temperature_celsius` DECIMAL(5, 2) NULL,
    `sterility_seal_inspected` TINYINT(1) NOT NULL DEFAULT 1,
    `lot_expiry_inspected` TINYINT(1) NOT NULL DEFAULT 1,

    -- 3-Way Matching Engine Metrics
    `po_total_ordered_qty` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `delivery_receipt_qty` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `accepted_qty` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `rejected_qty` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `po_total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `accepted_total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `variance_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `three_way_match_status` ENUM(
        'matched_exact',
        'partial_delivery_matched',
        'quantity_variance_flagged',
        'price_variance_flagged',
        'rejected_quality_failure',
        'pending_ap_verification'
    ) NOT NULL DEFAULT 'matched_exact',

    -- Accounts Payable Authorization
    `ap_authorization_status` ENUM(
        'pending_inspection',
        'authorized_for_payment',
        'payment_hold_variance',
        'payment_blocked_rejected',
        'partially_authorized'
      ) NOT NULL DEFAULT 'authorized_for_payment',
    `authorized_by` VARCHAR(150) NULL,
    `authorized_at` DATETIME NULL,

    `rejection_reason` VARCHAR(255) NULL,
    `general_notes` TEXT NULL,
    `status` ENUM('draft', 'inspected', 'authorized', 'archived', 'cancelled') NOT NULL DEFAULT 'authorized',
    `created_by` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY `idx_sgrn_po` (`purchase_order_id`),
    KEY `idx_sgrn_supplier` (`supplier_id`),
    KEY `idx_sgrn_match` (`three_way_match_status`),
    KEY `idx_sgrn_ap` (`ap_authorization_status`),
    KEY `idx_sgrn_date` (`received_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Goods Receipt Note Line Items & Quality Inspection Log
CREATE TABLE IF NOT EXISTS `supply_goods_receipt_items` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `grn_id` INT UNSIGNED NOT NULL,
    `line_no` INT NOT NULL DEFAULT 1,
    `supply_item_id` INT UNSIGNED NULL,
    `drug_id` INT NULL,
    `item_code` VARCHAR(50) NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `unit_of_measure` VARCHAR(50) NOT NULL DEFAULT 'box',
    `po_ordered_qty` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `delivered_qty` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `accepted_qty` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `rejected_qty` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `rejection_reason` ENUM(
        'none',
        'crushed_packaging',
        'broken_sterility_seal',
        'short_dated_near_expiry',
        'expired_lot',
        'wrong_item_specification',
        'temperature_excursion',
        'shortage_missing_quantity',
        'leaking_container'
    ) NOT NULL DEFAULT 'none',
    `unit_cost` DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    `line_accepted_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `batch_lot_number` VARCHAR(100) NULL,
    `expiry_date` DATE NULL,
    `storage_location` VARCHAR(100) NULL DEFAULT 'Central Medical Warehouse Bin A-1',
    `inspection_notes` VARCHAR(255) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    KEY `idx_sgri_grn` (`grn_id`),
    KEY `idx_sgri_item` (`supply_item_id`),
    CONSTRAINT `fk_sgri_grn` FOREIGN KEY (`grn_id`) REFERENCES `supply_goods_receipt_notes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Initialize Counter Sequence
INSERT IGNORE INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
VALUES ('GRN_NUMBER', YEAR(NOW()), 0);
