-- =============================================
-- Add postcard consent flag alongside the existing SMS/voice/email
-- contact-preference flags on patients.
-- =============================================

ALTER TABLE patients

ADD COLUMN allow_postcard ENUM('yes', 'no') NULL DEFAULT NULL AFTER allow_hie;
