-- =============================================
-- Alter: patients — OpenEMR-style "Choices" consent/communication flags
-- =============================================

ALTER TABLE patients

ADD COLUMN allow_sms TINYINT(1) NOT NULL DEFAULT 0 AFTER language,

ADD COLUMN allow_voice_calls TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_sms,

ADD COLUMN allow_email TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_voice_calls,

ADD COLUMN allow_hie TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_email;
