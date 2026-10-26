-- =====================================================================
-- Subsystem: Central Sterile Supply Department (CSSD / CCSD)
-- File: 326_cssd_ot_distribution_and_missing_instruments.sql
-- Description: Operating Theater (OT) Distribution & Missing Instrument Logging
--              - Dispatching sterile surgical instrument sets to OR suites
--              - Chain-of-custody transfer from CSSD to Scrub/Circulating Nurse
--              - Scanning dirty returns post-op at Decontamination receiving
--              - Piece-by-piece manifest count reconciliation
--              - Retained Surgical Item (RSI) safety alerts & missing tool incident tracking
--              - Damaged surgical tool logging & repair workflows
-- =====================================================================

-- 1. OT Surgical Instrument Dispatches (Chain of Custody Handover)
CREATE TABLE IF NOT EXISTS `cssd_ot_dispatches` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `dispatch_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'e.g. DISP-2026-0001',
    `physical_tray_id` INT NOT NULL COMMENT 'FK to cssd_physical_trays.id',
    `tray_barcode` VARCHAR(50) NOT NULL,
    `master_tray_id` INT NOT NULL COMMENT 'FK to cssd_master_trays.id',
    `surgical_case_id` INT UNSIGNED NULL COMMENT 'Optional FK to or_surgical_cases.id',
    `surgical_case_number` VARCHAR(50) NULL,
    `or_suite_name` VARCHAR(100) NOT NULL COMMENT 'e.g. OR Suite 1 - General Surgery',
    `patient_id` INT UNSIGNED NULL,
    `patient_name` VARCHAR(150) NULL,
    `procedure_name` VARCHAR(255) NULL,
    `primary_surgeon` VARCHAR(150) NULL,
    `circulating_nurse` VARCHAR(150) NULL,
    `scrub_nurse` VARCHAR(150) NULL,
    `dispatched_by_name` VARCHAR(100) NOT NULL DEFAULT 'CSSD Dispatch Specialist',
    `dispatched_by_user_id` INT NULL,
    `received_by_name` VARCHAR(100) NULL COMMENT 'OR Nurse or Orderly receiving delivery',
    `dispatched_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `received_in_or_at` DATETIME NULL,
    `sterility_verified` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = Verified seal & chemical indicator intact prior to dispatch',
    `chemical_indicator_checked` TINYINT(1) NOT NULL DEFAULT 1,
    `sterile_expiry_date` DATE NULL,
    `dispatch_status` ENUM(
        'dispatched_in_transit',
        'received_in_or',
        'in_surgery',
        'returned_to_cssd',
        'quarantined_incident'
    ) NOT NULL DEFAULT 'dispatched_in_transit',
    `case_priority` ENUM('elective', 'urgent', 'stat_emergency') NOT NULL DEFAULT 'elective',
    `transport_container_barcode` VARCHAR(50) NULL COMMENT 'e.g. CART-04 or CASE-TOTE-12',
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_cod_dispatch_no` (`dispatch_number`),
    KEY `idx_cod_tray` (`physical_tray_id`),
    KEY `idx_cod_barcode` (`tray_barcode`),
    KEY `idx_cod_case` (`surgical_case_id`),
    KEY `idx_cod_suite` (`or_suite_name`),
    KEY `idx_cod_status` (`dispatch_status`),
    KEY `idx_cod_date` (`dispatched_at`),
    CONSTRAINT `fk_cod_physical_tray` FOREIGN KEY (`physical_tray_id`) REFERENCES `cssd_physical_trays` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Post-Op Dirty Return Reconciliations & Decontamination Reception
CREATE TABLE IF NOT EXISTS `cssd_tray_return_reconciliations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `return_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'e.g. RET-2026-0001',
    `dispatch_id` INT NULL COMMENT 'FK to cssd_ot_dispatches.id',
    `physical_tray_id` INT NOT NULL COMMENT 'FK to cssd_physical_trays.id',
    `tray_barcode` VARCHAR(50) NOT NULL,
    `surgical_case_id` INT UNSIGNED NULL,
    `returned_from_or_suite` VARCHAR(100) NOT NULL,
    `returned_by_name` VARCHAR(100) NOT NULL DEFAULT 'OR Orderly / Scrub Nurse',
    `received_by_cssd_tech` VARCHAR(100) NOT NULL DEFAULT 'CSSD Decontamination Tech',
    `received_by_user_id` INT NULL,
    `received_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expected_pieces` INT NOT NULL DEFAULT 0,
    `counted_pieces` INT NOT NULL DEFAULT 0,
    `missing_count` INT NOT NULL DEFAULT 0,
    `damaged_count` INT NOT NULL DEFAULT 0,
    `bioburden_level` ENUM(
        'light',
        'moderate',
        'heavy_gross_blood',
        'suspected_prion_creutzfeldt'
    ) NOT NULL DEFAULT 'moderate',
    `reconciliation_status` ENUM(
        'reconciled_complete',
        'missing_instruments_alert',
        'damaged_instruments_detected',
        'quarantined_safety_incident'
    ) NOT NULL DEFAULT 'reconciled_complete',
    `is_rsi_alert_triggered` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 = Retained Surgical Item Alert Triggered',
    `checklist_audit_json` LONGTEXT NULL COMMENT 'Piece-by-piece manifest verification details',
    `decon_bay_assigned` VARCHAR(100) NULL DEFAULT 'Decon Sink Bay 1 / Ultrasonic Washer',
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_ctrr_return_no` (`return_number`),
    KEY `idx_ctrr_dispatch` (`dispatch_id`),
    KEY `idx_ctrr_tray` (`physical_tray_id`),
    KEY `idx_ctrr_status` (`reconciliation_status`),
    KEY `idx_ctrr_rsi` (`is_rsi_alert_triggered`),
    KEY `idx_ctrr_date` (`received_at`),
    CONSTRAINT `fk_ctrr_physical_tray` FOREIGN KEY (`physical_tray_id`) REFERENCES `cssd_physical_trays` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Missing Instrument Incidents & Retained Surgical Item (RSI) Safety Tracker
CREATE TABLE IF NOT EXISTS `cssd_missing_instrument_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `incident_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'e.g. INC-2026-0001',
    `return_id` INT NULL COMMENT 'FK to cssd_tray_return_reconciliations.id',
    `dispatch_id` INT NULL COMMENT 'FK to cssd_ot_dispatches.id',
    `physical_tray_id` INT NOT NULL COMMENT 'FK to cssd_physical_trays.id',
    `tray_barcode` VARCHAR(50) NOT NULL,
    `master_tray_name` VARCHAR(150) NOT NULL,
    `master_tray_item_id` INT NULL COMMENT 'FK to cssd_master_tray_items.id if matched',
    `instrument_name` VARCHAR(150) NOT NULL COMMENT 'e.g. Curved Mayo Scissors 6.75 in',
    `instrument_type` VARCHAR(80) NULL,
    `quantity_missing` INT NOT NULL DEFAULT 1,
    `quantity_damaged` INT NOT NULL DEFAULT 0,
    `incident_type` ENUM(
        'missing_unaccounted',
        'retained_surgical_item_risk',
        'lost_in_laundry_trash',
        'broken_in_field',
        'damaged_blunt_cracked'
    ) NOT NULL DEFAULT 'missing_unaccounted',
    `severity_level` ENUM(
        'critical_rsi_alert',
        'high_priority',
        'medium',
        'minor_maintenance'
    ) NOT NULL DEFAULT 'critical_rsi_alert',
    `or_suite_name` VARCHAR(100) NOT NULL,
    `surgical_case_id` INT UNSIGNED NULL,
    `patient_mrn` VARCHAR(50) NULL,
    `lead_surgeon` VARCHAR(150) NULL,
    `circulating_nurse` VARCHAR(150) NULL,
    `scrub_nurse` VARCHAR(150) NULL,
    `investigation_status` ENUM(
        'active_search_in_or',
        'portable_xray_ordered',
        'xray_negative_cavity_clear',
        'xray_positive_retained',
        'found_in_or_linens',
        'found_in_trash_bin',
        'confirmed_lost_written_off',
        'sent_for_repair',
        'replaced_with_new_stock',
        'resolved_closed'
    ) NOT NULL DEFAULT 'active_search_in_or',
    `xray_ordered` TINYINT(1) NOT NULL DEFAULT 0,
    `xray_findings` VARCHAR(255) NULL,
    `xray_performed_at` DATETIME NULL,
    `found_location_details` VARCHAR(255) NULL,
    `reported_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `reported_by_name` VARCHAR(100) NOT NULL,
    `investigated_by_name` VARCHAR(100) NULL,
    `resolved_at` DATETIME NULL,
    `resolution_notes` TEXT NULL,
    `corrective_action` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_cmil_incident_no` (`incident_number`),
    KEY `idx_cmil_return` (`return_id`),
    KEY `idx_cmil_tray` (`physical_tray_id`),
    KEY `idx_cmil_status` (`investigation_status`),
    KEY `idx_cmil_severity` (`severity_level`),
    KEY `idx_cmil_case` (`surgical_case_id`),
    KEY `idx_cmil_reported` (`reported_at`),
    CONSTRAINT `fk_cmil_physical_tray` FOREIGN KEY (`physical_tray_id`) REFERENCES `cssd_physical_trays` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Initialize Sequence Counters in billing_tariff_counters
INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
VALUES
    ('CSSD_DISPATCH', YEAR(CURRENT_DATE), 0),
    ('CSSD_RETURN', YEAR(CURRENT_DATE), 0),
    ('CSSD_INCIDENT', YEAR(CURRENT_DATE), 0)
ON DUPLICATE KEY UPDATE `counter_type` = `counter_type`;
