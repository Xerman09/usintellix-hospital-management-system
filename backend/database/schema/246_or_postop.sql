-- Surgery Phase 5: post-op and recovery.
--
--   or_pacu_observations     recovery room (PACU) readings over time: vitals,
--                            pain (0-10), nausea and the modified Aldrete
--                            score (five parts, 0-2 each, total 0-10).
--   or_operative_reports     the surgeon's operative report, one per case:
--                            draft, then signed (locked).
--   or_operative_report_addenda  notes added after signing.
--   or_surgical_cases        gains the release from recovery: when, by whom,
--                            where to (ward / ICU / home / another facility),
--                            the bed admission it went to, an override
--                            reason when the release criteria weren't met,
--                            and the surgical-history row it created.
--   patient_surgeries        gains or_case_id: the history row a completed
--                            OR case added (one per case).
--
-- Safe to re-run.
-- Text below contains non-ASCII characters: read this file as UTF-8 whatever the client's default is.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS or_pacu_observations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT UNSIGNED NOT NULL,
    recorded_at DATETIME NOT NULL,
    heart_rate SMALLINT NULL,
    bp_systolic SMALLINT NULL,
    bp_diastolic SMALLINT NULL,
    spo2 SMALLINT NULL,
    resp_rate SMALLINT NULL,
    temperature DECIMAL(4,1) NULL,
    pain_score TINYINT NULL,
    nausea TINYINT(1) NULL,
    aldrete_activity TINYINT NULL,
    aldrete_respiration TINYINT NULL,
    aldrete_circulation TINYINT NULL,
    aldrete_consciousness TINYINT NULL,
    aldrete_oxygen TINYINT NULL,
    aldrete_total TINYINT NULL,
    notes VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    created_by INT NULL,
    removed_at DATETIME NULL,
    removed_by INT NULL,
    INDEX idx_opo_case (case_id, recorded_at),
    CONSTRAINT fk_opo_case FOREIGN KEY (case_id) REFERENCES or_surgical_cases (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS or_operative_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT UNSIGNED NOT NULL,
    surgeon_user_id INT NULL,
    preop_diagnosis VARCHAR(500) NULL,
    postop_diagnosis VARCHAR(500) NULL,
    procedure_performed VARCHAR(500) NULL,
    indications TEXT NULL,
    findings TEXT NULL,
    technique TEXT NULL,
    complications_none TINYINT(1) NOT NULL DEFAULT 1,
    complications TEXT NULL,
    drains VARCHAR(500) NULL,
    condition_at_end VARCHAR(100) NULL,
    postop_plan TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    signed_at DATETIME NULL,
    signed_by INT NULL,
    revision INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    UNIQUE KEY uq_oor_case (case_id),
    CONSTRAINT fk_oor_case FOREIGN KEY (case_id) REFERENCES or_surgical_cases (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS or_operative_report_addenda (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    body TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    created_by INT NULL,
    INDEX idx_oora_report (report_id),
    CONSTRAINT fk_oora_report FOREIGN KEY (report_id) REFERENCES or_operative_reports (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE or_surgical_cases
    ADD COLUMN IF NOT EXISTS released_by INT NULL AFTER pacu_discharge_time,
    ADD COLUMN IF NOT EXISTS release_destination VARCHAR(20) NULL AFTER released_by,
    ADD COLUMN IF NOT EXISTS release_override_reason VARCHAR(255) NULL AFTER release_destination,
    ADD COLUMN IF NOT EXISTS release_notes VARCHAR(500) NULL AFTER release_override_reason,
    ADD COLUMN IF NOT EXISTS admission_id INT UNSIGNED NULL AFTER release_notes,
    ADD COLUMN IF NOT EXISTS patient_surgery_id INT NULL AFTER admission_id;

ALTER TABLE patient_surgeries
    ADD COLUMN IF NOT EXISTS or_case_id INT UNSIGNED NULL AFTER surgery_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_surgeries_or_case ON patient_surgeries (or_case_id);

-- Surgeries already completed in the OR (for a patient on file) go into the surgical history.
INSERT INTO patient_surgeries (patient_id, surgery_id, or_case_id, title, begin_date, end_date, comments, outcome, verification_status, created_at, created_by)
SELECT c.patient_id, c.surgery_id, c.id, LEFT(COALESCE(c.procedure_performed, c.procedure_name), 255), c.scheduled_date, c.scheduled_date,
       CONCAT('OR case ', c.case_number, ' · ', c.lead_surgeon, ' · ', c.or_suite_name), 'Completed', 'Confirmed', NOW(), NULL
FROM or_surgical_cases c
JOIN patients p ON p.id = c.patient_id
WHERE c.perioperative_stage = 'Transferred / Discharged'
  AND NOT EXISTS (SELECT 1 FROM patient_surgeries ps WHERE ps.or_case_id = c.id);

UPDATE or_surgical_cases c
JOIN patient_surgeries ps ON ps.or_case_id = c.id
SET c.patient_surgery_id = ps.id
WHERE c.patient_surgery_id IS NULL;
