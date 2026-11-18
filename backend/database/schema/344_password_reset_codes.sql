-- ============================================================================
-- Migration: 344_password_reset_codes.sql
-- Making "Forgot Password?" work.
--
-- Until now both clients offered the link and neither could do anything with
-- it. The web one (login.view.js) had no handler bound to it at all, so it did
-- nothing when clicked; the mobile one raised an alert saying to contact the
-- administrator. There was no route, no service and no table behind either.
--
-- ----------------------------------------------------------------------------
-- A CODE, NOT A LINK
-- ----------------------------------------------------------------------------
--
-- The usual shape for this is a signed URL emailed to the user. That needs a
-- public base URL that resolves for both clients, and there isn't one: the web
-- app is a hash-routed SPA served from whatever host the deployment happens to
-- use, and the patient app is a React Native binary where a link has to become
-- a deep link with its own scheme and registration. Both would have to be
-- configured per deployment, and a reset link that opens the wrong one -- or
-- opens nothing -- is a locked-out user with no way back.
--
-- So this mirrors the flow the system already has and already delivers: a
-- six-digit code by email, exactly like `two_factor_codes`. Same table shape,
-- same TTL idea, same attempt counting, and the same contact resolution
-- (AuthService::twoFactorContact), which is the only code that knows an address
-- lives on `employees` for staff and `patient_contacts` for patients -- the
-- `users` table has no email column at all.
--
-- ----------------------------------------------------------------------------
-- TWO DELIBERATE DIFFERENCES FROM two_factor_codes
-- ----------------------------------------------------------------------------
--
-- 1. THE CODE IS STORED HASHED. `two_factor_codes.code` holds the six digits in
--    plain text. For a second factor that is bad; for a password reset it would
--    be account takeover, because anyone who can read this table could complete
--    a reset for any account without knowing the current password at all. Only
--    the SHA-256 is stored, and the plaintext exists for as long as it takes to
--    put it in an email.
--
-- 2. THERE IS NO "MAIL FAILED, HERE IS THE CODE" FALLBACK. AuthService does that
--    for staff 2FA, deliberately and with its reasoning written down: the person
--    has already proved the password, so handing back the code degrades two
--    factors to one. That reasoning does not carry over. A reset caller has
--    proved nothing but knowledge of a username, so returning the code would let
--    anyone who knows a username take the account. If the mail cannot be sent,
--    the reset fails -- for staff and patients alike.
--
-- ----------------------------------------------------------------------------
-- WHAT THE TABLE HAS TO SUPPORT
-- ----------------------------------------------------------------------------
--
-- `attempts` so a six-digit code cannot be guessed. Six digits is a million
-- possibilities, which sounds ample and is not: without a cap, an attacker gets
-- all million tries inside the TTL.
--
-- `requested_ip` so requests can be rate-limited even when no account matches.
-- The request endpoint answers identically whether or not the username exists --
-- otherwise it becomes a free tool for discovering valid usernames -- which
-- means there is often no user_id to count against, and the IP is the only
-- thing left.
--
-- `consumed_at` rather than deleting the row, so a used code is visibly used.
-- Rows are evidence of an attempt on an account and are worth keeping.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `password_reset_codes` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,

    -- Null when the request named no real account. The row still exists so the
    -- attempt is rate-limited and visible; nothing was ever sent for it.
    `user_id` INT(11) NULL DEFAULT NULL,

    -- What was typed into the box, kept so repeated guesses at one username are
    -- visible even when that username does not exist.
    `requested_username` VARCHAR(190) NOT NULL,

    -- SHA-256 of the six digits. Never the digits themselves -- see the header.
    `code_hash` CHAR(64) NULL DEFAULT NULL,

    `method` VARCHAR(20) NOT NULL DEFAULT 'email',

    `expires_at` DATETIME NULL DEFAULT NULL,
    `consumed_at` DATETIME NULL DEFAULT NULL,
    `attempts` INT NOT NULL DEFAULT 0,

    -- Whether an email actually went out. A row with this 0 and a user_id set
    -- means the account exists and could not be reached, which is the one case
    -- worth finding in this table.
    `was_sent` TINYINT(1) NOT NULL DEFAULT 0,

    `requested_ip` VARCHAR(45) NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_password_reset_user` (`user_id`, `consumed_at`, `expires_at`),
    KEY `idx_password_reset_ip` (`requested_ip`, `created_at`),
    KEY `idx_password_reset_username` (`requested_username`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- One switch. A hospital that wants every reset to go through the service desk
-- turns this off, and both clients then say so instead of offering the form.
-- ----------------------------------------------------------------------------
ALTER TABLE `general_settings`
    ADD COLUMN IF NOT EXISTS `allow_self_password_reset` TINYINT(1) NOT NULL DEFAULT 1;
