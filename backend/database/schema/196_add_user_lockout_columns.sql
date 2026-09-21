-- =============================================
-- Add Account Lockout & Brute-Force Defense columns to users table (HIPAA § 164.312(a)(2)(i))
-- =============================================

ALTER TABLE users
ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0 AFTER must_change_password,
ADD COLUMN last_failed_login_at DATETIME NULL AFTER failed_login_attempts,
ADD COLUMN locked_until DATETIME NULL AFTER last_failed_login_at,
ADD COLUMN is_locked TINYINT(1) NOT NULL DEFAULT 0 AFTER locked_until;
