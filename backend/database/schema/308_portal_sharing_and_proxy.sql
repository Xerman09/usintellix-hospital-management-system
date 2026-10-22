-- ============================================================================
-- Migration: 308_portal_sharing_and_proxy.sql
-- My Chart Phase 8: account, proxy access, and sharing a record outward.
--
-- proxy_access_requests  a portal user asking to see another patient's record
--                        (a child, a parent). This table is the *request*; the
--                        grant itself stays where it already is --
--                        related_persons.proxy_user_id / proxy_status, which
--                        PatientAccessService reads on every request. Approving
--                        writes that existing grant, so nothing about how proxy
--                        access works at run time changes here.
--
-- record_shares          a time-limited, revocable link for an outside doctor.
--                        `scope` is a JSON array of section keys, so a share is
--                        a few sections, never the whole chart by default.
--                        access_count is kept on the row for cheap display.
--
-- record_share_views     one row per hit on a link, including refused ones, so
--                        a patient can see that someone tried the link after
--                        they revoked it.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `proxy_access_requests` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `requester_user_id` INT NOT NULL,
    `patient_id` INT NOT NULL,
    `relationship` VARCHAR(100) NOT NULL,
    `requester_note` VARCHAR(500) NULL DEFAULT NULL,
    `evidence_document_id` INT NULL DEFAULT NULL,
    `status` ENUM('pending', 'approved', 'denied', 'revoked') NOT NULL DEFAULT 'pending',
    `related_person_id` INT NULL DEFAULT NULL,
    `decided_by` INT NULL DEFAULT NULL,
    `decided_at` DATETIME NULL DEFAULT NULL,
    `reason` VARCHAR(500) NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT NULL DEFAULT NULL,
    `updated_by` INT NULL DEFAULT NULL,
    INDEX `idx_proxy_request_status` (`status`, `created_at`),
    INDEX `idx_proxy_request_patient` (`patient_id`, `status`),
    INDEX `idx_proxy_request_requester` (`requester_user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `record_shares` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `token` CHAR(64) NOT NULL,
    `label` VARCHAR(150) NULL DEFAULT NULL,
    `scope` TEXT NOT NULL,
    `expires_at` DATETIME NOT NULL,
    `access_count` INT NOT NULL DEFAULT 0,
    `last_viewed_at` DATETIME NULL DEFAULT NULL,
    `revoked_at` DATETIME NULL DEFAULT NULL,
    `revoked_by` INT NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` INT NULL DEFAULT NULL,
    UNIQUE KEY `uq_record_share_token` (`token`),
    INDEX `idx_record_share_patient` (`patient_id`, `revoked_at`, `expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `record_share_views` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `share_id` INT NULL DEFAULT NULL,
    `patient_id` INT NULL DEFAULT NULL,
    `outcome` ENUM('opened', 'expired', 'revoked', 'unknown') NOT NULL DEFAULT 'opened',
    `ip_address` VARCHAR(45) NULL DEFAULT NULL,
    `user_agent` VARCHAR(255) NULL DEFAULT NULL,
    `viewed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_record_share_view_share` (`share_id`, `viewed_at`),
    INDEX `idx_record_share_view_patient` (`patient_id`, `viewed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
