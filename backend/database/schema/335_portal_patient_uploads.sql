-- ============================================================================
-- Migration: 335_portal_patient_uploads.sql
-- My Chart Phase M11: files a patient sends in -- insurance cards, IDs, outside
-- lab results, photos of a wound or a rash.
--
-- Two decisions worth stating, because both differ from how staff uploads work
-- today (PatientDocumentService):
--
-- 1. NOTHING A PATIENT SENDS BECOMES PART OF THE RECORD BY ITSELF.
--    Every row lands 'pending' and a staff member accepts or rejects it. Only on
--    accept is a patient_documents row created, and `document_id` then points at
--    it. A patient-supplied file is a claim about reality, not a clinical
--    document: it could be the wrong person's card, an unreadable photograph, or
--    simply not what they think it is.
--
-- 2. THE FILES ARE NOT FETCHABLE BY URL.
--    Staff documents are written to backend/public/uploads/patient_documents and
--    served straight off the filesystem: anyone with the path gets the file, with
--    no session. For an identification card that is a PHI leak by URL, so these
--    go to backend/storage/patient-uploads and are served only through an
--    endpoint that re-checks who is asking. `stored_filename` is therefore a name
--    within that directory, never a public path.
--
--    Note this is NOT achieved by being outside the document root -- the deployed
--    tree sits under it (C:/xampp/htdocs), and that directory answered a plain GET
--    with HTTP 200 until backend/storage/patient-uploads/.htaccess was added to
--    deny it. A deployment on nginx, or with AllowOverride off, must deny the
--    location in server config instead; the .htaccess alone will not save it.
--
-- `sha256` is kept so the same file sent twice can be recognised, and so a
-- stored file can be checked against what was received.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `patient_uploads` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `uploaded_by` INT NULL DEFAULT NULL COMMENT 'users.id -- the patient, or a proxy acting for them',
    `kind` ENUM('insurance_card', 'identification', 'outside_result', 'photo', 'other') NOT NULL DEFAULT 'other',
    `caption` VARCHAR(255) NULL DEFAULT NULL COMMENT 'what the patient says this is',
    `original_filename` VARCHAR(255) NOT NULL,
    `stored_filename` VARCHAR(255) NOT NULL COMMENT 'name within backend/storage/patient-uploads, not a URL',
    `mime_type` VARCHAR(100) NOT NULL,
    `size_bytes` INT NOT NULL,
    `sha256` CHAR(64) NULL DEFAULT NULL,
    `status` ENUM('pending', 'accepted', 'rejected') NOT NULL DEFAULT 'pending',
    `reviewed_by` INT NULL DEFAULT NULL,
    `reviewed_at` DATETIME NULL DEFAULT NULL,
    `review_note` VARCHAR(255) NULL DEFAULT NULL COMMENT 'why it was rejected; the patient reads this',
    `document_id` INT NULL DEFAULT NULL COMMENT 'patient_documents.id, set when accepted',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL DEFAULT NULL,
    `deleted_by` INT NULL DEFAULT NULL,
    INDEX `idx_patient_uploads_patient` (`patient_id`, `created_at`),
    INDEX `idx_patient_uploads_status` (`status`, `created_at`),
    INDEX `idx_patient_uploads_sha` (`sha256`),
    CONSTRAINT `fk_patient_uploads_patient`
        FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
        ON UPDATE NO ACTION ON DELETE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Policy, beside the other operational settings (schema 296, 334). The per-day
-- cap is the cheap defence against someone filling the disk one photograph at a
-- time; 8 MB suits a phone photograph without encouraging a scanned 40-page PDF.
ALTER TABLE `general_settings`
    ADD COLUMN IF NOT EXISTS `portal_allow_uploads` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS `portal_upload_max_mb` INT NOT NULL DEFAULT 8,
    ADD COLUMN IF NOT EXISTS `portal_upload_max_per_day` INT NOT NULL DEFAULT 10;
