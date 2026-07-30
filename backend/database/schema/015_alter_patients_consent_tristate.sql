-- =============================================
-- Alter: patients — convert Choices consent flags from boolean
-- to a tri-state Yes/No/Unassigned (NULL) dropdown value.
-- =============================================

ALTER TABLE patients

DROP COLUMN allow_sms,

DROP COLUMN allow_voice_calls,

DROP COLUMN allow_email,

DROP COLUMN allow_hie;

ALTER TABLE patients

ADD COLUMN allow_sms ENUM('yes', 'no') NULL DEFAULT NULL AFTER language,

ADD COLUMN allow_voice_calls ENUM('yes', 'no') NULL DEFAULT NULL AFTER allow_sms,

ADD COLUMN allow_email ENUM('yes', 'no') NULL DEFAULT NULL AFTER allow_voice_calls,

ADD COLUMN allow_hie ENUM('yes', 'no') NULL DEFAULT NULL AFTER allow_email;
