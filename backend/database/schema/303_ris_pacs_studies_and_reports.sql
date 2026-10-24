-- 303_ris_pacs_studies_and_reports.sql
-- Radiology Information System (RIS) & PACS Integration:
-- DICOM Study Instance UIDs, Series UIDs, PACS Storage / Retrieval, and Web DICOM Viewer Integration.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS ris_pacs_studies (
    id INT NOT NULL AUTO_INCREMENT,
    study_instance_uid VARCHAR(128) NOT NULL,              -- DICOM Study Instance UID (1.2.840.113619.2...)
    accession_no VARCHAR(32) NOT NULL,                     -- Linked RAD-YYYY-XXXXX
    patient_id INT NOT NULL,                               -- patients.id
    order_id INT NOT NULL,                                 -- patient_procedure_orders.id
    ris_order_id INT DEFAULT NULL,                         -- ris_imaging_orders.id
    modality VARCHAR(16) NOT NULL,                         -- CT | MR | CR | DX | US | MG | XA
    study_description VARCHAR(255) DEFAULT NULL,           -- e.g. "CT Head with Contrast"
    study_date DATE NOT NULL,
    study_time TIME DEFAULT NULL,
    referring_physician VARCHAR(150) DEFAULT NULL,
    patient_age VARCHAR(10) DEFAULT NULL,
    patient_sex ENUM('M', 'F', 'O') DEFAULT 'M',
    series_count INT NOT NULL DEFAULT 1,
    instance_count INT NOT NULL DEFAULT 1,                 -- Total DICOM slices / images
    pacs_aet VARCHAR(32) DEFAULT 'HOSPITAL_PACS',          -- Application Entity Title (AET)
    pacs_status ENUM('online', 'archived', 'retrieving', 'offline') NOT NULL DEFAULT 'online',
    default_window_center INT DEFAULT 40,                  -- Default window level
    default_window_width INT DEFAULT 350,                  -- Default window width
    sop_class_uid VARCHAR(128) DEFAULT NULL,
    web_viewer_url VARCHAR(500) DEFAULT NULL,              -- Direct Cornerstone / OHIF / WADO-URI URL
    metadata_json LONGTEXT DEFAULT NULL,                   -- Cached DICOM metadata tags
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pacs_study_uid (study_instance_uid),
    KEY idx_pacs_accession (accession_no),
    KEY idx_pacs_patient (patient_id),
    KEY idx_pacs_order (order_id),
    KEY idx_pacs_modality (modality)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ris_pacs_series (
    id INT NOT NULL AUTO_INCREMENT,
    pacs_study_id INT NOT NULL,
    series_instance_uid VARCHAR(128) NOT NULL,
    series_number INT NOT NULL DEFAULT 1,
    series_description VARCHAR(255) DEFAULT NULL,          -- e.g. "Axial 2.5mm Brain", "Sagittal MPR"
    modality VARCHAR(16) NOT NULL,
    body_part_examined VARCHAR(64) DEFAULT NULL,
    protocol_name VARCHAR(128) DEFAULT NULL,
    image_count INT NOT NULL DEFAULT 1,
    window_center INT DEFAULT 40,
    window_width INT DEFAULT 350,
    pixel_spacing VARCHAR(64) DEFAULT '0.5\\0.5',
    slice_thickness VARCHAR(32) DEFAULT '2.5',
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_pacs_series_uid (series_instance_uid),
    KEY idx_pacs_series_study (pacs_study_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Augment rad_images with DICOM Study Instance UID and Series UID if missing
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'rad_images' AND column_name = 'study_instance_uid');
SET @s := IF(@c = 0,
    'ALTER TABLE rad_images
        ADD COLUMN study_instance_uid VARCHAR(128) DEFAULT NULL AFTER accession_no,
        ADD COLUMN series_instance_uid VARCHAR(128) DEFAULT NULL AFTER study_instance_uid,
        ADD COLUMN sop_instance_uid VARCHAR(128) DEFAULT NULL AFTER series_instance_uid,
        ADD KEY idx_rad_images_study_uid (study_instance_uid)',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'ris_imaging_orders' AND column_name = 'study_instance_uid');
SET @s := IF(@c = 0,
    'ALTER TABLE ris_imaging_orders
        ADD COLUMN study_instance_uid VARCHAR(128) DEFAULT NULL AFTER accession_no,
        ADD KEY idx_ris_orders_study_uid (study_instance_uid)',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;
