-- ========================================================
-- Migration: 300_lis_specimen_collections.sql
-- Module: Laboratory Information System (LIS) > Phlebotomy & Specimen Collection
-- Purpose: Tracking phlebotomy draws, tube colors (Lavender EDTA, SST Gold,
--          Light Blue Citrate, Red Plain, etc.), draw status life-cycle
--          (Pending Draw, Collected, In Transit, Received in Lab, Hemolyzed / Rejected),
--          and thermal barcode sticker generation.
-- ========================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `lis_specimen_collections` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `specimen_barcode` VARCHAR(50) NOT NULL UNIQUE,
    `lab_request_id` INT NULL DEFAULT NULL,
    `order_id` INT NULL DEFAULT NULL,
    `patient_id` INT NOT NULL,
    `tube_color` VARCHAR(50) NOT NULL DEFAULT 'Lavender EDTA',
    `tube_cap_color` VARCHAR(20) NOT NULL DEFAULT '#a855f7',
    `specimen_type` VARCHAR(50) NOT NULL DEFAULT 'Whole Blood',
    `test_names` TEXT NOT NULL,
    `order_ids_json` JSON NULL,
    `draw_status` ENUM('Pending Draw', 'Collected', 'In Transit', 'Received in Lab', 'Hemolyzed / Rejected') NOT NULL DEFAULT 'Pending Draw',
    `collection_time` DATETIME NULL DEFAULT NULL,
    `collected_by_user_id` INT NULL DEFAULT NULL,
    `phlebotomy_site` VARCHAR(100) NULL DEFAULT NULL,
    `phlebotomy_method` VARCHAR(50) NULL DEFAULT 'Venipuncture',
    `two_identifier_checked` TINYINT(1) NOT NULL DEFAULT 1,
    `fasting_status` TINYINT(1) NOT NULL DEFAULT 0,
    `storage_temperature` VARCHAR(50) NOT NULL DEFAULT 'Ambient (15-25°C)',
    `in_transit_at` DATETIME NULL DEFAULT NULL,
    `in_transit_by_user_id` INT NULL DEFAULT NULL,
    `received_in_lab_at` DATETIME NULL DEFAULT NULL,
    `received_by_user_id` INT NULL DEFAULT NULL,
    `rejection_reason` VARCHAR(255) NULL DEFAULT NULL,
    `rejection_notes` TEXT NULL DEFAULT NULL,
    `rejected_at` DATETIME NULL DEFAULT NULL,
    `rejected_by_user_id` INT NULL DEFAULT NULL,
    `recollection_ordered` TINYINT(1) NOT NULL DEFAULT 0,
    `thermal_labels_printed` INT NOT NULL DEFAULT 0,
    `last_printed_at` DATETIME NULL DEFAULT NULL,
    `notes` TEXT NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_lsc_barcode` (`specimen_barcode`),
    KEY `idx_lsc_patient` (`patient_id`),
    KEY `idx_lsc_req` (`lab_request_id`),
    KEY `idx_lsc_order` (`order_id`),
    KEY `idx_lsc_status` (`draw_status`),
    KEY `idx_lsc_collected` (`collection_time`),
    CONSTRAINT `fk_lsc_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill or seed initial LIS specimen collection records from open lab requests / orders
INSERT IGNORE INTO `lis_specimen_collections` (
    `specimen_barcode`, `lab_request_id`, `patient_id`, `tube_color`, `tube_cap_color`,
    `specimen_type`, `test_names`, `draw_status`, `collection_time`, `collected_by_user_id`,
    `phlebotomy_site`, `phlebotomy_method`, `two_identifier_checked`, `fasting_status`,
    `storage_temperature`, `created_at`
)
SELECT
    CONCAT('LIS-', DATE_FORMAT(COALESCE(r.collect_at, r.created_at), '%y%m%d'), '-', LPAD(r.id, 5, '0')) AS specimen_barcode,
    r.id AS lab_request_id,
    r.patient_id,
    'Lavender EDTA' AS tube_color,
    '#a855f7' AS tube_cap_color,
    'Whole Blood' AS specimen_type,
    'Complete Blood Count (CBC)' AS test_names,
    CASE WHEN r.status = 'collected' THEN 'Received in Lab' ELSE 'Pending Draw' END AS draw_status,
    CASE WHEN r.status = 'collected' THEN r.collect_at ELSE NULL END AS collection_time,
    r.ordered_by AS collected_by_user_id,
    'Left Antecubital Fossa' AS phlebotomy_site,
    'Venipuncture' AS phlebotomy_method,
    1 AS two_identifier_checked,
    r.fasting AS fasting_status,
    'Refrigerated (2-8°C)' AS storage_temperature,
    NOW() AS created_at
FROM `lab_requests` r
WHERE r.status != 'cancelled'
LIMIT 10;
