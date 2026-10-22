-- ============================================================================
-- Migration 309: Pharmacy Lot Recall Trace Engine & Patient Outreach Roster
-- Enables instant traceability of recalled manufacturer lots:
--   1. Immediate discovery of remaining on-hand stock by storage location/warehouse
--   2. Complete historical trace of all patients dispensed the specific lot
--   3. Contact numbers (Mobile, Home, Work, Emergency Contact) for immediate outreach
--   4. Quarantine lock application across all hospital warehouses
--   5. Patient outreach attempt tracking (Contacted, Voicemail, Returned, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS `pharmacy_lot_recalls` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `recall_reference` VARCHAR(50) NOT NULL,
    `lot_number` VARCHAR(100) NOT NULL,
    `drug_id` INT UNSIGNED NULL DEFAULT NULL,
    `drug_name` VARCHAR(255) NULL DEFAULT NULL,
    `recall_class` ENUM('Class I', 'Class II', 'Class III') NOT NULL DEFAULT 'Class II',
    `recall_reason` TEXT NOT NULL,
    `manufacturer_name` VARCHAR(150) NULL DEFAULT NULL,
    `fda_advisory_ref` VARCHAR(120) NULL DEFAULT NULL,
    `status` ENUM('active', 'quarantined', 'patient_outreach_in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'active',
    `remaining_stock_units` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    `affected_warehouses_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `affected_patients_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_dispensed_units` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    `contacted_patients_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `initiated_by` INT UNSIGNED NULL DEFAULT NULL,
    `initiated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `closed_by` INT UNSIGNED NULL DEFAULT NULL,
    `closed_at` DATETIME NULL DEFAULT NULL,
    `action_notes` TEXT NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_pharmacy_lot_recall_ref` (`recall_reference`),
    KEY `idx_pharmacy_lot_recall_lot` (`lot_number`),
    KEY `idx_pharmacy_lot_recall_drug` (`drug_id`),
    KEY `idx_pharmacy_lot_recall_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pharmacy_lot_recall_outreach` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `recall_id` INT UNSIGNED NULL DEFAULT NULL,
    `lot_number` VARCHAR(100) NOT NULL,
    `patient_id` INT NOT NULL,
    `dispense_source` VARCHAR(50) NOT NULL DEFAULT 'Outpatient Pharmacy',
    `dispense_reference` VARCHAR(100) NULL DEFAULT NULL,
    `dispensed_date` DATE NULL DEFAULT NULL,
    `dispensed_quantity` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    `outreach_status` ENUM('pending', 'contacted_informed', 'voicemail_left', 'unreachable', 'product_returned', 'replacement_dispensed', 'adverse_event') NOT NULL DEFAULT 'pending',
    `contacted_phone` VARCHAR(50) NULL DEFAULT NULL,
    `contact_attempt_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `last_contact_attempt_at` DATETIME NULL DEFAULT NULL,
    `contacted_by` INT UNSIGNED NULL DEFAULT NULL,
    `patient_response_notes` TEXT NULL DEFAULT NULL,
    `units_returned` DECIMAL(12,3) NOT NULL DEFAULT 0.000,
    `replacement_issued` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_recall_outreach_recall` (`recall_id`),
    KEY `idx_recall_outreach_lot` (`lot_number`),
    KEY `idx_recall_outreach_patient` (`patient_id`),
    KEY `idx_recall_outreach_status` (`outreach_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
