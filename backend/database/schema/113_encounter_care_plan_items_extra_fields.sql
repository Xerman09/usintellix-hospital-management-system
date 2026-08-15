-- =============================================
-- Alter: encounter_care_plan_items
-- Adds Target Date, End Date, Status, and single-reason fields to
-- support the Care Plan Form's "Add Reason" sub-section. Idempotent
-- guards let this re-run safely if the columns already exist.
-- =============================================

SET @db_name = DATABASE();

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'encounter_care_plan_items'
        AND COLUMN_NAME = 'target_date') = 0,
    'ALTER TABLE encounter_care_plan_items ADD COLUMN target_date DATE NULL AFTER item_date',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'encounter_care_plan_items'
        AND COLUMN_NAME = 'end_date') = 0,
    'ALTER TABLE encounter_care_plan_items ADD COLUMN end_date DATE NULL AFTER target_date',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'encounter_care_plan_items'
        AND COLUMN_NAME = 'status') = 0,
    'ALTER TABLE encounter_care_plan_items ADD COLUMN status VARCHAR(20) NULL AFTER end_date',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'encounter_care_plan_items'
        AND COLUMN_NAME = 'reason_code') = 0,
    'ALTER TABLE encounter_care_plan_items ADD COLUMN reason_code VARCHAR(50) NULL AFTER status',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'encounter_care_plan_items'
        AND COLUMN_NAME = 'reason_status') = 0,
    'ALTER TABLE encounter_care_plan_items ADD COLUMN reason_status VARCHAR(20) NULL AFTER reason_code',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'encounter_care_plan_items'
        AND COLUMN_NAME = 'reason_recording_date') = 0,
    'ALTER TABLE encounter_care_plan_items ADD COLUMN reason_recording_date DATE NULL AFTER reason_status',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'encounter_care_plan_items'
        AND COLUMN_NAME = 'reason_end_date') = 0,
    'ALTER TABLE encounter_care_plan_items ADD COLUMN reason_end_date DATE NULL AFTER reason_recording_date',
    'SELECT 1'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
