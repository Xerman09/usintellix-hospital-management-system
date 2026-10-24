-- 302_ris_imaging_orders.sql
-- Radiology Information System (RIS): Modality Scheduling, Accession Tracking (RAD-YYYY-XXXXX),
-- and Multi-Factor Safety Clearance (IV contrast allergy, eGFR/creatinine renal clearance, implants/pregnancy).
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS ris_imaging_orders (
    id INT NOT NULL AUTO_INCREMENT,
    order_id INT NOT NULL,                                 -- patient_procedure_orders.id (the specific study)
    rad_request_id INT DEFAULT NULL,                       -- rad_requests.id (parent batch request)
    booking_id INT DEFAULT NULL,                           -- rad_bookings.id (linked scheduled slot)
    patient_id INT NOT NULL,                               -- patients.id
    accession_no VARCHAR(32) NOT NULL,                     -- RAD-YYYY-XXXXX (DICOM & PACS standard accession number)
    modality VARCHAR(20) NOT NULL,                         -- ct | mri | xray | ultrasound | mammography | fluoroscopy
    room_id INT DEFAULT NULL,                              -- rad_rooms.id (CT Suite, MRI Suite, Ultrasound Bay, etc.)
    scheduled_start_at DATETIME DEFAULT NULL,
    scheduled_end_at DATETIME DEFAULT NULL,
    
    -- Safety Screening & Clearance:
    safety_status ENUM('pending_review', 'cleared', 'flagged_risk', 'rejected') NOT NULL DEFAULT 'pending_review',
    contrast_type ENUM('none', 'oral', 'iv', 'both', 'optional') NOT NULL DEFAULT 'none',
    contrast_allergy_status ENUM('no_allergy', 'previous_reaction', 'premedication_ordered', 'unknown') NOT NULL DEFAULT 'no_allergy',
    contrast_allergy_notes VARCHAR(255) DEFAULT NULL,
    
    -- Renal Clearance (eGFR & Creatinine) for IV contrast safety:
    creatinine_value DECIMAL(6,2) DEFAULT NULL,            -- mg/dL
    creatinine_date DATE DEFAULT NULL,
    egfr_value DECIMAL(6,2) DEFAULT NULL,                  -- mL/min/1.73m^2 (e.g. CKD-EPI / Cockcroft-Gault)
    renal_cleared TINYINT(1) NOT NULL DEFAULT 1,           -- 1 = safe (eGFR >= 45-60 or no IV contrast needed), 0 = contra-indicated/needs hydration protocol
    renal_clearance_notes VARCHAR(255) DEFAULT NULL,
    
    -- MRI Safety (implants / metal / pacemaker):
    mri_safe_status ENUM('not_applicable', 'mri_safe', 'mri_conditional', 'mri_unsafe', 'pending_check') NOT NULL DEFAULT 'not_applicable',
    implants_notes VARCHAR(255) DEFAULT NULL,
    
    -- Radiation & Pregnancy Safety:
    pregnancy_status ENUM('not_pregnant', 'pregnant', 'unknown', 'not_applicable') NOT NULL DEFAULT 'not_applicable',
    pregnancy_cleared TINYINT(1) NOT NULL DEFAULT 1,
    pregnancy_notes VARCHAR(255) DEFAULT NULL,
    
    -- Technologist & Clinical Clearance Tracking:
    safety_cleared_by INT DEFAULT NULL,                    -- users.id (technologist or radiologist who cleared the patient)
    safety_cleared_at DATETIME DEFAULT NULL,
    technologist_user_id INT DEFAULT NULL,                 -- users.id (performing radiologic technologist)
    technologist_license_no VARCHAR(50) DEFAULT NULL,      -- PRC Radiologic Technologist license number
    
    -- Operational Status:
    study_status ENUM('ordered', 'scheduled', 'cleared', 'arrived', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'ordered',
    completed_at DATETIME DEFAULT NULL,
    cancelled_at DATETIME DEFAULT NULL,
    cancelled_by INT DEFAULT NULL,
    cancellation_reason VARCHAR(255) DEFAULT NULL,
    
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_ris_accession_no (accession_no),
    KEY idx_ris_order (order_id),
    KEY idx_ris_request (rad_request_id),
    KEY idx_ris_patient (patient_id),
    KEY idx_ris_modality (modality, study_status),
    KEY idx_ris_safety (safety_status, renal_cleared, mri_safe_status),
    KEY idx_ris_room_schedule (room_id, scheduled_start_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Counter for accession numbers RAD-YYYY-XXXXX
CREATE TABLE IF NOT EXISTS ris_counters (
    prefix_year INT NOT NULL,                              -- 2026
    last_seq INT NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Augment rad_bookings and patient_procedure_orders with RIS accession number linkage if not present
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'rad_bookings' AND column_name = 'accession_no');
SET @s := IF(@c = 0,
    'ALTER TABLE rad_bookings
        ADD COLUMN accession_no VARCHAR(32) DEFAULT NULL AFTER request_id,
        ADD KEY idx_rad_bookings_accession (accession_no)',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patient_procedure_orders' AND column_name = 'accession_no');
SET @s := IF(@c = 0,
    'ALTER TABLE patient_procedure_orders
        ADD COLUMN accession_no VARCHAR(32) DEFAULT NULL AFTER rad_booking_id,
        ADD KEY idx_ppo_accession (accession_no)',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'rad_images' AND column_name = 'accession_no');
SET @s := IF(@c = 0,
    'ALTER TABLE rad_images
        ADD COLUMN accession_no VARCHAR(32) DEFAULT NULL AFTER booking_id,
        ADD KEY idx_rad_images_accession (accession_no)',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;
