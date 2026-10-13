-- Lab department (module 14, Phase 1: specimen collection).
--   * lab_requests: one lab request (requisition) -- the tests a doctor ordered together for a patient, from where
--     (clinic, ER, a ward, the ICU), with the priority (routine / urgent / STAT), clinical information, fasting,
--     when to collect, and who ordered it (written, verbal or protocol order). The tests themselves stay in
--     patient_procedure_orders (one row per test), linked by lab_request_id.
--   * lab_specimens: each tube / container collected, with its accession number (YYMMDD + 4 digits, printed as a
--     barcode label), who collected it and when, how (venipuncture, line draw ...), and that the patient's identity
--     was checked. A specimen collected in error is voided and its tests go back to "to collect".
--   * lab_counters: the day's last request / accession number (safe when two people save at once).
--   * procedure_order_configs gets the tube (lab_container) and the lab section (lab_section) of each test.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS lab_requests (
    id INT NOT NULL AUTO_INCREMENT,
    request_no VARCHAR(20) NOT NULL,                  -- LR-YYMMDD-NNN
    patient_id INT NOT NULL,
    source VARCHAR(10) NOT NULL,                      -- clinic | er | ward | icu | other
    er_visit_id INT DEFAULT NULL,
    admission_id INT UNSIGNED DEFAULT NULL,
    location VARCHAR(150) DEFAULT NULL,               -- where the patient was when ordered, e.g. "ER · Bed 3", "Medical Ward · MED-201-A"
    priority VARCHAR(10) NOT NULL DEFAULT 'routine',  -- routine | urgent | stat
    clinical_info VARCHAR(500) DEFAULT NULL,
    fasting TINYINT(1) NOT NULL DEFAULT 0,
    collect_at DATETIME NOT NULL,                     -- when to collect (the order time, or later: e.g. tomorrow's 06:00 bloods)
    order_mode VARCHAR(10) NOT NULL DEFAULT 'written', -- written | verbal | protocol
    ordering_user_id INT DEFAULT NULL,                -- the doctor who ordered it
    ordered_by INT DEFAULT NULL,                      -- who entered it
    ordered_at DATETIME NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'open',       -- open | collected | cancelled
    cancelled_at DATETIME DEFAULT NULL, cancelled_by INT DEFAULT NULL, cancel_reason VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_lab_requests_no (request_no),
    KEY idx_lab_requests_status (status, collect_at),
    KEY idx_lab_requests_patient (patient_id),
    KEY idx_lab_requests_visit (er_visit_id),
    KEY idx_lab_requests_adm (admission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lab_specimens (
    id INT NOT NULL AUTO_INCREMENT,
    accession_no VARCHAR(20) NOT NULL,                -- YYMMDDNNNN, the barcode
    request_id INT NOT NULL,
    patient_id INT NOT NULL,
    container VARCHAR(20) NOT NULL,                   -- edta | sst | citrate | heparin | fluoride | culture | abg | urine | stool | swab | sputum | csf | red | other
    specimen_type VARCHAR(30) NOT NULL,               -- Blood, Urine ...
    collected_at DATETIME NOT NULL,
    collected_by INT NOT NULL,                        -- who took it
    recorded_by INT NOT NULL,                         -- who charted it (usually the same person)
    method VARCHAR(20) DEFAULT NULL,                  -- venipuncture | capillary | arterial | line | midstream | catheter | swab | other
    site VARCHAR(60) DEFAULT NULL,                    -- e.g. left antecubital, CVC lumen
    id_checked TINYINT(1) NOT NULL DEFAULT 0,         -- two patient identifiers checked at the bedside
    notes VARCHAR(255) DEFAULT NULL,
    labels_printed SMALLINT NOT NULL DEFAULT 0,
    last_printed_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL,
    voided_at DATETIME DEFAULT NULL, voided_by INT DEFAULT NULL, void_reason VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_lab_specimens_accession (accession_no),
    KEY idx_lab_specimens_request (request_id),
    KEY idx_lab_specimens_patient (patient_id),
    KEY idx_lab_specimens_collected (collected_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lab_counters (
    kind VARCHAR(10) NOT NULL,                        -- request | accession
    day DATE NOT NULL,
    last_no INT NOT NULL DEFAULT 0,
    PRIMARY KEY (kind, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The tests: which request, priority, which specimen, collected when / by whom, why cancelled.
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patient_procedure_orders' AND column_name = 'lab_request_id');
SET @s := IF(@c = 0,
    'ALTER TABLE patient_procedure_orders
        ADD COLUMN lab_request_id INT DEFAULT NULL AFTER vendor_facility_id,
        ADD COLUMN priority VARCHAR(10) DEFAULT NULL AFTER lab_request_id,
        ADD COLUMN specimen_id INT DEFAULT NULL AFTER specimen,
        ADD COLUMN collected_at DATETIME DEFAULT NULL AFTER specimen_id,
        ADD COLUMN collected_by INT DEFAULT NULL AFTER collected_at,
        ADD COLUMN cancel_reason VARCHAR(255) DEFAULT NULL AFTER status,
        ADD KEY idx_ppo_lab_request (lab_request_id),
        ADD KEY idx_ppo_specimen (specimen_id)',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;

-- The catalog: tube and lab section of each test.
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'procedure_order_configs' AND column_name = 'lab_container');
SET @s := IF(@c = 0,
    'ALTER TABLE procedure_order_configs
        ADD COLUMN lab_container VARCHAR(20) DEFAULT NULL AFTER specimen_type,
        ADD COLUMN lab_section VARCHAR(20) DEFAULT NULL AFTER lab_container',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;
