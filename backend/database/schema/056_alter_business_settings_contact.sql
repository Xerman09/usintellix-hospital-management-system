-- =============================================
-- Add contact info to business_settings
-- =============================================

ALTER TABLE business_settings

ADD COLUMN address VARCHAR(255) NULL AFTER logo,

ADD COLUMN phone VARCHAR(20) NULL AFTER address,

ADD COLUMN email VARCHAR(255) NULL AFTER phone;
