-- ============================================================================
-- Migration 297: Pharmacy Automated Reorder Policies, Alerts & Batch Recalls
-- Formula: Reorder Point = (Avg Daily Consumption * Lead Time Days) + Safety Stock
-- Automatically triggers Reorder Breach Alerts and Draft Purchase Requisitions
-- when usable stock breaches the reorder point.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `pharmacy_reorder_policies` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `warehouse_id` INT UNSIGNED NOT NULL,
    `drug_id` INT UNSIGNED NOT NULL,
    `avg_daily_consumption` DECIMAL(12,3) NOT NULL DEFAULT 0.000 COMMENT 'Average Daily Consumption in dispensing units/day',
    `use_auto_consumption` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = blend/compute from 30-day stock ledger outflow when available',
    `lead_time_days` INT UNSIGNED NOT NULL DEFAULT 7 COMMENT 'Supplier procurement lead time in days',
    `safety_stock` DECIMAL(12,3) NOT NULL DEFAULT 0.000 COMMENT 'Safety stock buffer in dispensing units',
    `reorder_point` DECIMAL(12,3) NOT NULL DEFAULT 0.000 COMMENT '(avg_daily_consumption * lead_time_days) + safety_stock',
    `max_stock_level` DECIMAL(12,3) NULL DEFAULT NULL COMMENT 'Target maximum stock level at this location',
    `reorder_quantity` DECIMAL(12,3) NOT NULL DEFAULT 0.000 COMMENT 'Minimum/standard order quantity when breached',
    `auto_generate_draft_pr` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = auto-create or append to draft Purchase Requisition when stock <= reorder_point',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `last_breach_detected_at` DATETIME NULL DEFAULT NULL,
    `last_triggered_pr_id` INT UNSIGNED NULL DEFAULT NULL,
    `last_evaluated_at` DATETIME NULL DEFAULT NULL,
    `notes` VARCHAR(500) NULL DEFAULT NULL,
    `created_by` INT UNSIGNED NULL DEFAULT NULL,
    `updated_by` INT UNSIGNED NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_pharmacy_reorder_wh_drug` (`warehouse_id`, `drug_id`),
    KEY `idx_pharmacy_reorder_wh` (`warehouse_id`, `is_active`),
    KEY `idx_pharmacy_reorder_drug` (`drug_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pharmacy_reorder_alerts` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `policy_id` INT UNSIGNED NULL DEFAULT NULL,
    `warehouse_id` INT UNSIGNED NOT NULL,
    `drug_id` INT UNSIGNED NOT NULL,
    `usable_stock` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    `reorder_point` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    `suggested_order_qty` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    `alert_status` ENUM('open', 'requisition_drafted', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
    `purchase_requisition_id` INT UNSIGNED NULL DEFAULT NULL,
    `pr_number` VARCHAR(40) NULL DEFAULT NULL,
    `trigger_source` VARCHAR(60) NOT NULL DEFAULT 'manual_check' COMMENT 'dispensing, stock_adjustment, manual_check, policy_update',
    `triggered_by` INT UNSIGNED NULL DEFAULT NULL,
    `triggered_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `resolved_at` DATETIME NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_reorder_alerts_wh_status` (`warehouse_id`, `alert_status`),
    KEY `idx_reorder_alerts_drug` (`drug_id`, `alert_status`),
    KEY `idx_reorder_alerts_pr` (`purchase_requisition_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pharmacy_batch_recalls` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `recall_number` VARCHAR(40) NOT NULL,
    `drug_id` INT UNSIGNED NOT NULL,
    `lot_number` VARCHAR(100) NOT NULL,
    `recall_class` ENUM('Class I', 'Class II', 'Class III') NOT NULL DEFAULT 'Class II',
    `reason` TEXT NOT NULL,
    `fda_advisory_ref` VARCHAR(120) NULL DEFAULT NULL,
    `status` ENUM('active', 'quarantined', 'returned_to_supplier', 'closed') NOT NULL DEFAULT 'active',
    `quarantined_lots_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `quarantined_quantity` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    `affected_patients_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `initiated_by` INT UNSIGNED NULL DEFAULT NULL,
    `initiated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `closed_by` INT UNSIGNED NULL DEFAULT NULL,
    `closed_at` DATETIME NULL DEFAULT NULL,
    `notes` TEXT NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_pharmacy_recall_number` (`recall_number`),
    KEY `idx_pharmacy_recall_drug_lot` (`drug_id`, `lot_number`),
    KEY `idx_pharmacy_recall_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed initial reorder policies from existing warehouse_stock_levels where not yet present
INSERT INTO `pharmacy_reorder_policies`
    (`warehouse_id`, `drug_id`, `avg_daily_consumption`, `use_auto_consumption`, `lead_time_days`, `safety_stock`, `reorder_point`, `max_stock_level`, `reorder_quantity`, `auto_generate_draft_pr`, `is_active`, `notes`)
SELECT
    wsl.warehouse_id,
    wsl.drug_id,
    ROUND(GREATEST(wsl.min_level * 0.60 / 7, 1.000), 3) AS avg_daily_consumption,
    1 AS use_auto_consumption,
    7 AS lead_time_days,
    ROUND(wsl.min_level * 0.40, 3) AS safety_stock,
    wsl.min_level AS reorder_point,
    wsl.max_level AS max_stock_level,
    ROUND(GREATEST(COALESCE(wsl.max_level, wsl.min_level * 2) - wsl.min_level, wsl.min_level, 10), 3) AS reorder_quantity,
    1 AS auto_generate_draft_pr,
    1 AS is_active,
    'Seeded from warehouse_stock_levels'
FROM `warehouse_stock_levels` wsl
ON DUPLICATE KEY UPDATE
    `max_stock_level` = COALESCE(`pharmacy_reorder_policies`.`max_stock_level`, VALUES(`max_stock_level`));
