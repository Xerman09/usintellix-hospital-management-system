-- ========================================================
-- Migration: 243_surgery_requests.sql
-- Module: Surgery Requests (patient chart, Surgery Requests worklist)
-- Purpose: Surgery Phase 2 -- requesting surgery and getting the
--          patient ready for it.
--            * surgery_requests -- one request per planned surgery
--              (SR-YYYY-NNNNN): patient, visit (optional), specialization,
--              surgery type (or a procedure not in the catalog), side,
--              ICD-10 diagnosis, surgeon, priority, preferred date,
--              expected duration and anesthesia.
--              status: requested -> planning -> ready -> (scheduled,
--              Phase 3) | cancelled. Requested = nothing on the checklist
--              confirmed yet; planning = some; ready = every required
--              item confirmed (an Emergency can be made ready early,
--              with a reason).
--            * surgery_request_checks -- the pre-op readiness checklist,
--              one row per item: done / not needed, details (consent
--              signer, blood type and units, ...), who confirmed it and
--              when. The items themselves are defined in code
--              (SurgeryRequestService::CHECK_ITEMS).
--          Safe to run again.
-- ========================================================

CREATE TABLE IF NOT EXISTS surgery_requests (

    id INT NOT NULL AUTO_INCREMENT,

    request_number VARCHAR(30) NOT NULL,

    patient_id INT NOT NULL,

    encounter_id INT NULL,

    requested_by INT NULL,

    specialization_id INT NOT NULL,

    surgery_id INT NULL,

    -- The surgery's name when it was requested, or a procedure not in the catalog.
    procedure_name VARCHAR(255) NOT NULL,

    -- Left | Right | Bilateral, or NULL when not applicable
    laterality VARCHAR(20) NULL,

    diagnosis_code VARCHAR(20) NULL,

    diagnosis_text VARCHAR(255) NULL,

    surgeon_user_id INT NOT NULL,

    surgeon_override_reason VARCHAR(255) NULL,

    -- Elective | Urgent | Emergency / STAT (as in OR Management)
    priority VARCHAR(20) NOT NULL DEFAULT 'Elective',

    preferred_date DATE NULL,

    estimated_duration_minutes INT NOT NULL DEFAULT 60,

    anesthesia_type VARCHAR(40) NULL,

    notes TEXT NULL,

    -- requested | planning | ready | scheduled | cancelled
    status VARCHAR(20) NOT NULL DEFAULT 'requested',

    ready_at DATETIME NULL,

    -- An Emergency made ready before every check was done.
    ready_override_reason VARCHAR(255) NULL,
    ready_override_by INT NULL,

    -- Phase 3: the OR case it was booked as.
    or_case_id INT UNSIGNED NULL,

    cancelled_at DATETIME NULL,
    cancelled_by INT NULL,
    cancel_reason VARCHAR(500) NULL,

    revision INT NOT NULL DEFAULT 0,

    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_surgery_request_number UNIQUE (request_number),

    INDEX idx_sr_patient (patient_id, created_at),

    INDEX idx_sr_status (status, priority, preferred_date),

    INDEX idx_sr_specialization (specialization_id, status),

    INDEX idx_sr_surgeon (surgeon_user_id, status),

    CONSTRAINT fk_sr_patient
        FOREIGN KEY (patient_id) REFERENCES patients(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_sr_encounter
        FOREIGN KEY (encounter_id) REFERENCES encounters(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_sr_specialization
        FOREIGN KEY (specialization_id) REFERENCES specializations(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_sr_surgery
        FOREIGN KEY (surgery_id) REFERENCES surgeries(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_sr_surgeon
        FOREIGN KEY (surgeon_user_id) REFERENCES users(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS surgery_request_checks (

    id INT NOT NULL AUTO_INCREMENT,

    request_id INT NOT NULL,

    -- medical_clearance | anesthesia_clearance | labs | imaging | consent |
    -- blood | implants | npo | site_marking | allergies
    item_key VARCHAR(40) NOT NULL,

    -- done | not_needed
    status VARCHAR(20) NOT NULL,

    -- Item details as JSON (e.g. consent: signed_by, relationship, signed_date;
    -- blood: blood_type, units).
    details TEXT NULL,

    notes VARCHAR(500) NULL,

    confirmed_by INT NULL,

    confirmed_at DATETIME NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_sr_check UNIQUE (request_id, item_key),

    CONSTRAINT fk_src_request
        FOREIGN KEY (request_id) REFERENCES surgery_requests(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- An OR case booked from a request (Phase 3) points back to it.
ALTER TABLE or_surgical_cases
    ADD COLUMN IF NOT EXISTS surgery_request_id INT NULL AFTER patient_id;

CREATE INDEX IF NOT EXISTS idx_or_surgery_request ON or_surgical_cases (surgery_request_id);
