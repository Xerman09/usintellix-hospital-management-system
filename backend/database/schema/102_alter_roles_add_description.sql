-- =============================================
-- Alter: roles
-- Adds the `description` column the Role Management UI and
-- RoleService (list/register/update) have always read and written, but
-- which was never part of the roles table -- every GET /roles request
-- fails with "Unknown column 'description'" until this is applied.
-- =============================================

ALTER TABLE roles
    ADD COLUMN description VARCHAR(255) NULL AFTER name;
