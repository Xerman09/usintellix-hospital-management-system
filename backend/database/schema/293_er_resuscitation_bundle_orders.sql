-- ============================================================================
-- Migration: 293_er_resuscitation_bundle_orders.sql
-- Module: Emergency Department (ED) — STAT Resuscitation Order Bundles
-- Description:
--   Instant one-click STAT resuscitation order bundles for ER visits:
--   1. Massive Transfusion Protocol (MTP) (1:1:1 Uncrossed O-Neg/Type-Specific
--      PRBC + FFP + Platelets + Cryoprecipitate + TXA 1g IV + CaCl2/CaGluconate)
--   2. STAT Trauma Lab Panel (Type & Crossmatch, CBC, PT/INR/aPTT, Fibrinogen,
--      Arterial Blood Gas + Lactate, CMP, Ethanol/Tox, Quantitative Beta-hCG)
--   3. STAT Emergency Bedside Imaging (Portable Chest X-Ray, Portable Pelvis
--      X-Ray, eFAST Bedside Ultrasound, Trauma CT Pan-Scan Head/C-Spine/CAP)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `er_resuscitation_bundle_orders` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `bundle_order_no` VARCHAR(40) NOT NULL,
    `visit_id` INT UNSIGNED NOT NULL,
    `patient_id` INT UNSIGNED NOT NULL,
    `bundle_code` VARCHAR(50) NOT NULL COMMENT 'mtp_activation | trauma_lab_panel | emergency_bedside_imaging | full_trauma_megabundle',
    `bundle_title` VARCHAR(140) NOT NULL,
    `bundle_category` ENUM(
        'Massive Transfusion Protocol (MTP)',
        'Trauma Lab Panel',
        'Emergency Bedside Imaging',
        'Full Trauma Resuscitation Mega-Bundle'
    ) NOT NULL,
    `priority` VARCHAR(20) NOT NULL DEFAULT 'STAT',
    `ordered_items_json` TEXT NOT NULL COMMENT 'JSON list of individual blood products, lab tests, and imaging studies ordered',
    `linked_lab_request_id` INT UNSIGNED NULL DEFAULT NULL,
    `linked_lab_request_no` VARCHAR(40) NULL DEFAULT NULL,
    `linked_rad_request_id` INT UNSIGNED NULL DEFAULT NULL,
    `linked_rad_request_no` VARCHAR(40) NULL DEFAULT NULL,
    `blood_bank_status` VARCHAR(100) NULL DEFAULT NULL,
    `clinical_indication` VARCHAR(500) NULL DEFAULT NULL,
    `status` ENUM(
        'Ordered - STAT',
        'Dispatched / In Progress',
        'Completed',
        'Cancelled'
    ) NOT NULL DEFAULT 'Ordered - STAT',
    `ordered_by_id` INT UNSIGNED NULL DEFAULT NULL,
    `ordered_by_name` VARCHAR(120) NOT NULL,
    `ordered_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_er_resus_bundle_order_no` (`bundle_order_no`),
    KEY `idx_erbo_visit_id` (`visit_id`),
    KEY `idx_erbo_patient_id` (`patient_id`),
    KEY `idx_erbo_bundle_code` (`bundle_code`),
    KEY `idx_erbo_ordered_at` (`ordered_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
