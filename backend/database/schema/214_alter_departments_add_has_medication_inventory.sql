-- ========================================================
-- Migration: 214_alter_departments_add_has_medication_inventory.sql
-- Module: Department Management
-- Purpose: Adds boolean tag `has_medication_inventory` to
--          departments to tag whether the department holds,
--          manages, or dispenses medication inventory.
-- ========================================================

ALTER TABLE departments
    ADD COLUMN IF NOT EXISTS has_medication_inventory TINYINT(1) NOT NULL DEFAULT 0 AFTER description;

CREATE INDEX idx_departments_med_inv ON departments (has_medication_inventory);

-- Mark Pharmacy Services as holding medication inventory by default
UPDATE departments 
SET has_medication_inventory = 1 
WHERE code = 'PHARM' OR name LIKE '%Pharmacy%';
