-- =============================================
-- Alter Table: roles
-- Add description column to support Role Management module
-- =============================================

ALTER TABLE roles
    ADD COLUMN description VARCHAR(255) NULL AFTER name;
