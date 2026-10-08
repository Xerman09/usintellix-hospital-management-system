-- ER (module 12, Phase 1: registration and triage).
--   * patients.registration_status: complete | quick (ER quick registration: name, sex, birth date
--     or age only -- complete it at Registration) | unidentified (an unknown patient with a temporary
--     name, identified later: the details filled in, or merged into the patient's existing chart).
--     patients.dob_estimated: the birth date was worked out from an estimated age.
--   * er_visits: one ER visit (ER-YYYY-NNNNN): arrival, how they came, status
--     waiting (for triage) | triaged | left (without being seen) | cancelled (registered in error).
--   * er_triage: each triage (and re-triage): acuity 1-5, chief complaint, vital signs.
-- Safe to re-run.

SET NAMES utf8mb4;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'patients' AND column_name = 'registration_status');
SET @s := IF(@c = 0,
    "ALTER TABLE patients
        ADD COLUMN registration_status VARCHAR(14) NOT NULL DEFAULT 'complete' AFTER patient_no,
        ADD COLUMN dob_estimated TINYINT(1) NOT NULL DEFAULT 0 AFTER birthdate",
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;

CREATE TABLE IF NOT EXISTS er_visits (
    id INT NOT NULL AUTO_INCREMENT,
    visit_no VARCHAR(20) NOT NULL,
    patient_id INT NOT NULL,
    status VARCHAR(12) NOT NULL DEFAULT 'waiting',     -- waiting | triaged | left | cancelled
    arrived_at DATETIME NOT NULL,
    arrival_mode VARCHAR(30) NOT NULL,                 -- Walk-in | Private vehicle | Ambulance | Police | Transfer from another facility | Other
    brought_by VARCHAR(150) DEFAULT NULL,
    chief_complaint VARCHAR(255) DEFAULT NULL,         -- as told at registration (triage records its own)
    is_unidentified TINYINT(1) NOT NULL DEFAULT 0,     -- registered as an unknown patient
    description VARCHAR(500) DEFAULT NULL,             -- an unknown patient: what they look like, belongings, where found
    identified_at DATETIME DEFAULT NULL,
    identified_by INT DEFAULT NULL,
    identified_how VARCHAR(10) DEFAULT NULL,           -- details (filled in) | merged (into an existing chart)
    merged_from_patient_id INT DEFAULT NULL,           -- the temporary chart merged away
    acuity TINYINT DEFAULT NULL,                       -- the latest triage
    triaged_at DATETIME DEFAULT NULL,                  -- the first triage
    registered_by INT NOT NULL,
    registered_at DATETIME NOT NULL,
    closed_at DATETIME DEFAULT NULL,
    closed_by INT DEFAULT NULL,
    close_reason VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_er_visit_no (visit_no),
    KEY idx_er_visits_status (status, arrived_at),
    KEY idx_er_visits_patient (patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS er_triage (
    id INT NOT NULL AUTO_INCREMENT,
    visit_id INT NOT NULL,
    acuity TINYINT NOT NULL,                           -- 1 resuscitation, 2 emergent, 3 urgent, 4 less urgent, 5 non-urgent
    chief_complaint VARCHAR(255) NOT NULL,
    bp_systolic SMALLINT DEFAULT NULL,
    bp_diastolic SMALLINT DEFAULT NULL,
    heart_rate SMALLINT DEFAULT NULL,
    resp_rate SMALLINT DEFAULT NULL,
    temperature_c DECIMAL(4,1) DEFAULT NULL,
    spo2 TINYINT DEFAULT NULL,
    on_oxygen TINYINT(1) NOT NULL DEFAULT 0,
    pain_score TINYINT DEFAULT NULL,
    gcs TINYINT DEFAULT NULL,
    blood_glucose SMALLINT DEFAULT NULL,               -- mg/dL
    weight_kg DECIMAL(5,1) DEFAULT NULL,
    pregnant VARCHAR(8) DEFAULT NULL,                  -- yes | no | unknown
    allergies_note VARCHAR(255) DEFAULT NULL,
    notes VARCHAR(1000) DEFAULT NULL,
    danger_vitals VARCHAR(255) DEFAULT NULL,           -- the vital signs in the danger zone, when there were any
    undertriage_reason VARCHAR(255) DEFAULT NULL,      -- danger-zone vitals but level 3-5: why
    triaged_by INT NOT NULL,
    triaged_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_er_triage_visit (visit_id, triaged_at),
    CONSTRAINT fk_er_triage_visit FOREIGN KEY (visit_id) REFERENCES er_visits (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
