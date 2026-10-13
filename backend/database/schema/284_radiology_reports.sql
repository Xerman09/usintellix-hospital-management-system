-- Radiology (module 15, Phase 2: performing the study, the images and the radiologist's report).
--   * rad_bookings gets the "done" side: when the study was performed and by whom, the technique actually used
--     (views, contrast given, dose). Its status gains 'performed'.
--   * rad_images: the image files of a study (DICOM .dcm or JPEG / PNG captures), opened in the existing DICOM
--     viewer. One row per file, with the series it belongs to and whether it is a key image.
--   * rad_reports: the radiologist's report of a study, versioned like the lab's result sets. Status
--     draft -> signed -> superseded (an addendum or a correction is a new version). Technique, comparison,
--     findings, impression, recommendation, whether the finding is critical (and what was told to whom).
--     Signing writes the conclusion to patient_procedure_results, so the chart, the results inbox (module 7),
--     the sign-off clock and -- for a critical finding -- the critical alert with read-back (module 6) all work
--     the same way as for the lab.
--   * rad_staff: which doctors are radiologists (only they may sign a report), set by an admin.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS rad_images (
    id INT NOT NULL AUTO_INCREMENT,
    order_id INT NOT NULL,                            -- patient_procedure_orders.id (the study)
    booking_id INT DEFAULT NULL,
    patient_id INT NOT NULL,
    series_desc VARCHAR(150) DEFAULT NULL,            -- e.g. "PA erect", "Axial 5 mm", "Post contrast"
    instance_no SMALLINT NOT NULL DEFAULT 1,          -- the order of the files within the study
    is_key TINYINT(1) NOT NULL DEFAULT 0,             -- key image: the one the report points at
    original_filename VARCHAR(255) DEFAULT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,                  -- /uploads/rad_images/...
    mime_type VARCHAR(100) DEFAULT NULL,
    file_size INT DEFAULT NULL,
    notes VARCHAR(255) DEFAULT NULL,
    uploaded_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL,
    deleted_at DATETIME DEFAULT NULL, deleted_by INT DEFAULT NULL, delete_reason VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_rad_images_order (order_id, instance_no),
    KEY idx_rad_images_patient (patient_id),
    KEY idx_rad_images_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rad_reports (
    id INT NOT NULL AUTO_INCREMENT,
    order_id INT NOT NULL,
    version SMALLINT NOT NULL DEFAULT 1,
    status VARCHAR(12) NOT NULL DEFAULT 'draft',      -- draft | signed | superseded | cancelled
    technique VARCHAR(500) DEFAULT NULL,
    comparison VARCHAR(500) DEFAULT NULL,             -- previous studies compared with
    findings TEXT DEFAULT NULL,
    impression TEXT DEFAULT NULL,                     -- the conclusion: what it means
    recommendation VARCHAR(500) DEFAULT NULL,
    conclusion VARCHAR(10) NOT NULL DEFAULT 'normal', -- normal | abnormal | critical (what the chart and the inbox show)
    critical_note VARCHAR(255) DEFAULT NULL,          -- the critical finding in one line (goes in the alert)
    change_reason VARCHAR(255) DEFAULT NULL,          -- why this version exists (addendum / correction)
    is_addendum TINYINT(1) NOT NULL DEFAULT 0,        -- an addendum adds to the report; otherwise it corrects it
    saved_by INT DEFAULT NULL, saved_at DATETIME DEFAULT NULL,
    signed_by INT DEFAULT NULL, signed_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_rad_reports_version (order_id, version),
    KEY idx_rad_reports_status (status, signed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rad_staff (
    user_id INT NOT NULL,
    radiologist TINYINT(1) NOT NULL DEFAULT 0,        -- may read and sign reports
    license_no VARCHAR(50) DEFAULT NULL,
    updated_by INT DEFAULT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The study as performed: when, by whom, and with what technique.
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'rad_bookings' AND column_name = 'performed_at');
SET @s := IF(@c = 0,
    'ALTER TABLE rad_bookings
        ADD COLUMN performed_at DATETIME DEFAULT NULL AFTER arrived_by,
        ADD COLUMN performed_by INT DEFAULT NULL AFTER performed_at,
        ADD COLUMN technique VARCHAR(500) DEFAULT NULL AFTER performed_by,
        ADD COLUMN contrast_given TINYINT(1) NOT NULL DEFAULT 0 AFTER technique,
        ADD COLUMN contrast_detail VARCHAR(255) DEFAULT NULL AFTER contrast_given,
        ADD COLUMN dose VARCHAR(50) DEFAULT NULL AFTER contrast_detail,
        ADD KEY idx_rad_bookings_performed (performed_at)',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;
