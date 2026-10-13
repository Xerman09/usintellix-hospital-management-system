-- Radiology (module 15, Phase 1: imaging orders and scheduling).
--   * rad_rooms: the machines -- an X-ray room, an ultrasound room, the CT and the MRI (and a portable X-ray unit),
--     each with its modality, how long a slot takes, the hours it works and which days.
--   * rad_requests: one imaging request -- the studies a doctor ordered together for a patient, from where (clinic,
--     ER, a ward, the ICU), the priority, the clinical question, and the safety answers the department needs before
--     scanning: pregnancy, kidney function and contrast allergy (for intravenous contrast), metal / implants (MRI),
--     how the patient travels and whether they are isolated. The studies themselves stay in
--     patient_procedure_orders (one row per study), linked by rad_request_id.
--   * rad_bookings: a study booked on a machine at a time (one live booking per study), who booked it, whether the
--     preparation instructions were given, when the patient arrived, and why a booking was cancelled.
--   * rad_counters: the day's last request number (safe when two people save at once).
--   * procedure_order_configs gets the modality, the slot length, whether the study uses contrast, whether it can be
--     done portable (at the bedside) and its preparation instructions.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS rad_rooms (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,                       -- e.g. "X-ray Room 1", "CT Scanner"
    modality VARCHAR(15) NOT NULL,                    -- xray | ultrasound | ct | mri | fluoroscopy | mammography
    location VARCHAR(150) DEFAULT NULL,
    slot_minutes SMALLINT NOT NULL DEFAULT 15,        -- the machine's own slot length (a study may need more)
    open_from TIME NOT NULL DEFAULT '08:00:00',
    open_to TIME NOT NULL DEFAULT '17:00:00',
    open_days VARCHAR(7) NOT NULL DEFAULT '1234567',  -- ISO weekdays the machine works (1 = Monday)
    around_the_clock TINYINT(1) NOT NULL DEFAULT 0,   -- on call day and night (STAT scans): hours not enforced
    portable TINYINT(1) NOT NULL DEFAULT 0,           -- a mobile unit taken to the bedside
    notes VARCHAR(255) DEFAULT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sequence INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_rad_rooms_name (name),
    KEY idx_rad_rooms_modality (modality, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rad_requests (
    id INT NOT NULL AUTO_INCREMENT,
    request_no VARCHAR(20) NOT NULL,                  -- RX-YYMMDD-NNN
    patient_id INT NOT NULL,
    source VARCHAR(10) NOT NULL,                      -- clinic | er | ward | icu | other
    er_visit_id INT DEFAULT NULL,
    admission_id INT UNSIGNED DEFAULT NULL,
    location VARCHAR(150) DEFAULT NULL,               -- where the patient was when ordered
    priority VARCHAR(10) NOT NULL DEFAULT 'routine',  -- routine | urgent | stat
    indication VARCHAR(500) DEFAULT NULL,             -- what the doctor wants answered
    needed_by DATETIME DEFAULT NULL,                  -- wanted by this time (blank = as soon as it fits)
    -- Safety screening (what radiology must know before scanning):
    pregnancy VARCHAR(12) DEFAULT NULL,               -- no | yes | unknown | not_applicable
    lmp DATE DEFAULT NULL,                            -- last menstrual period
    creatinine DECIMAL(6,2) DEFAULT NULL,             -- mg/dL, for intravenous contrast
    creatinine_at DATE DEFAULT NULL,
    contrast_allergy VARCHAR(12) DEFAULT NULL,        -- no | yes | unknown
    contrast_allergy_detail VARCHAR(255) DEFAULT NULL,
    implants VARCHAR(12) DEFAULT NULL,                -- no | yes | unknown (pacemaker, clips, metal: MRI)
    implants_detail VARCHAR(255) DEFAULT NULL,
    weight_kg DECIMAL(6,2) DEFAULT NULL,              -- table weight limits / contrast dose
    transport VARCHAR(12) DEFAULT NULL,               -- walking | wheelchair | stretcher | portable
    isolation VARCHAR(100) DEFAULT NULL,              -- e.g. airborne, contact
    sedation TINYINT(1) NOT NULL DEFAULT 0,           -- the patient will need sedation (child, confused)
    order_mode VARCHAR(10) NOT NULL DEFAULT 'written', -- written | verbal | protocol
    ordering_user_id INT DEFAULT NULL,
    ordered_by INT DEFAULT NULL,
    ordered_at DATETIME NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'open',       -- open | scheduled | cancelled | done
    cancelled_at DATETIME DEFAULT NULL, cancelled_by INT DEFAULT NULL, cancel_reason VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_rad_requests_no (request_no),
    KEY idx_rad_requests_status (status, priority, ordered_at),
    KEY idx_rad_requests_patient (patient_id),
    KEY idx_rad_requests_visit (er_visit_id),
    KEY idx_rad_requests_adm (admission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rad_bookings (
    id INT NOT NULL AUTO_INCREMENT,
    order_id INT NOT NULL,                            -- patient_procedure_orders.id (the study)
    request_id INT NOT NULL,
    patient_id INT NOT NULL,
    room_id INT NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    minutes SMALLINT NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'booked',     -- booked | arrived | cancelled | no_show
    prep_given TINYINT(1) NOT NULL DEFAULT 0,         -- the preparation instructions were given to the patient / ward
    note VARCHAR(255) DEFAULT NULL,
    booked_by INT DEFAULT NULL,
    booked_at DATETIME NOT NULL,
    arrived_at DATETIME DEFAULT NULL, arrived_by INT DEFAULT NULL,
    cancelled_at DATETIME DEFAULT NULL, cancelled_by INT DEFAULT NULL, cancel_reason VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_rad_bookings_room (room_id, start_at),
    KEY idx_rad_bookings_order (order_id, status),
    KEY idx_rad_bookings_request (request_id),
    KEY idx_rad_bookings_patient (patient_id, start_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rad_counters (
    kind VARCHAR(10) NOT NULL,                        -- request
    day DATE NOT NULL,
    last_no INT NOT NULL DEFAULT 0,
    PRIMARY KEY (kind, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The studies: which request, and the booking they are on. Status: pending -> scheduled -> (performed, Phase 2).
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patient_procedure_orders' AND column_name = 'rad_request_id');
SET @s := IF(@c = 0,
    'ALTER TABLE patient_procedure_orders
        ADD COLUMN rad_request_id INT DEFAULT NULL AFTER lab_request_id,
        ADD COLUMN rad_booking_id INT DEFAULT NULL AFTER rad_request_id,
        ADD KEY idx_ppo_rad_request (rad_request_id),
        ADD KEY idx_ppo_rad_booking (rad_booking_id)',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;

-- The catalog: modality, slot length, contrast, portable, preparation instructions.
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'procedure_order_configs' AND column_name = 'rad_modality');
SET @s := IF(@c = 0,
    'ALTER TABLE procedure_order_configs
        ADD COLUMN rad_modality VARCHAR(15) DEFAULT NULL AFTER lab_price,
        ADD COLUMN rad_minutes SMALLINT DEFAULT NULL AFTER rad_modality,
        ADD COLUMN rad_contrast VARCHAR(10) DEFAULT NULL AFTER rad_minutes,
        ADD COLUMN rad_portable TINYINT(1) NOT NULL DEFAULT 0 AFTER rad_contrast,
        ADD COLUMN rad_prep VARCHAR(500) DEFAULT NULL AFTER rad_portable',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;
