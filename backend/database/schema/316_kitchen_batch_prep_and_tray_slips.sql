-- 316_kitchen_batch_prep_and_tray_slips.sql
-- Hospital Kitchen Batch Prep Lists, Meal Counts Census, and Bedside Tray Slips
-- Safe to re-run.

SET NAMES utf8mb4;

-- 1. Ensure meal_order_id link on dietary_meal_trays
SET @dbname = DATABASE();
SET @tablename = 'dietary_meal_trays';
SET @columnname = 'meal_order_id';
SET @preparedStatement = (SELECT IF(
    (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = @dbname
        AND TABLE_NAME = @tablename
        AND COLUMN_NAME = @columnname
    ) > 0,
    'SELECT 1',
    'ALTER TABLE dietary_meal_trays ADD COLUMN meal_order_id INT DEFAULT NULL AFTER prescription_id'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Ensure indexes for fast census queries
SET @indexname = 'idx_meal_tray_compilation';
SET @preparedStatement = (SELECT IF(
    (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @dbname
        AND TABLE_NAME = @tablename
        AND INDEX_NAME = @indexname
    ) > 0,
    'SELECT 1',
    'CREATE INDEX idx_meal_tray_compilation ON dietary_meal_trays (meal_date, meal_type, diet_category)'
));
PREPARE addIdxIfNotExists FROM @preparedStatement;
EXECUTE addIdxIfNotExists;
DEALLOCATE PREPARE addIdxIfNotExists;

SET @indexname2 = 'idx_meal_tray_order_ref';
SET @preparedStatement = (SELECT IF(
    (
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = @dbname
        AND TABLE_NAME = @tablename
        AND INDEX_NAME = @indexname2
    ) > 0,
    'SELECT 1',
    'CREATE INDEX idx_meal_tray_order_ref ON dietary_meal_trays (meal_order_id)'
));
PREPARE addIdx2IfNotExists FROM @preparedStatement;
EXECUTE addIdx2IfNotExists;
DEALLOCATE PREPARE addIdx2IfNotExists;

-- Link any existing patient_meal_orders to dietary_meal_trays
UPDATE dietary_meal_trays dmt
JOIN patient_meal_orders pmo 
  ON dmt.patient_id = pmo.patient_id 
 AND dmt.meal_date = pmo.meal_date 
 AND dmt.meal_type = pmo.meal_type
SET dmt.meal_order_id = pmo.id
WHERE dmt.meal_order_id IS NULL;
