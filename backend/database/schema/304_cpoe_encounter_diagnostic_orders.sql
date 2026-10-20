-- ========================================================
-- Migration: 304_cpoe_encounter_diagnostic_orders.sql
-- Module: CPOE Diagnostic Ordering (Outpatient Department & Consultations)
-- Purpose: Links Lab requests, Radiology imaging requests, and Procedure
--          orders directly to patient clinical encounters (visits) and
--          SOAP consultation notes. Enables bundled inline CPOE ordering
--          without leaving the consultation note.
-- ========================================================

SET NAMES utf8mb4;

-- 1. Add encounter_id and soap_note_id to lab_requests
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'lab_requests' 
    AND COLUMN_NAME = 'encounter_id');

SET @sql := IF(@col_exists = 0, 
    'ALTER TABLE lab_requests 
        ADD COLUMN encounter_id INT NULL AFTER patient_id,
        ADD COLUMN soap_note_id INT NULL AFTER encounter_id,
        ADD INDEX idx_lab_requests_encounter (encounter_id),
        ADD INDEX idx_lab_requests_soap (soap_note_id)', 
    'SELECT "Column encounter_id already exists on lab_requests"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Add encounter_id and soap_note_id to rad_requests
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'rad_requests' 
    AND COLUMN_NAME = 'encounter_id');

SET @sql := IF(@col_exists = 0, 
    'ALTER TABLE rad_requests 
        ADD COLUMN encounter_id INT NULL AFTER patient_id,
        ADD COLUMN soap_note_id INT NULL AFTER encounter_id,
        ADD INDEX idx_rad_requests_encounter (encounter_id),
        ADD INDEX idx_rad_requests_soap (soap_note_id)', 
    'SELECT "Column encounter_id already exists on rad_requests"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Add encounter_id to patient_procedure_orders
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'patient_procedure_orders' 
    AND COLUMN_NAME = 'encounter_id');

SET @sql := IF(@col_exists = 0, 
    'ALTER TABLE patient_procedure_orders 
        ADD COLUMN encounter_id INT NULL AFTER patient_id,
        ADD INDEX idx_ppo_encounter (encounter_id)', 
    'SELECT "Column encounter_id already exists on patient_procedure_orders"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
