-- =============================================
-- Add avatar (profile photo) support to users
-- =============================================

ALTER TABLE users

ADD COLUMN avatar VARCHAR(255) NULL AFTER password;
