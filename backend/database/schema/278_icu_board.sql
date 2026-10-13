-- ICU (module 13, Phase 2: the ICU board).
--   * icu_stays: each ICU stay of an admission -- when the patient came in and from where (ER, OR,
--     another ward, or admitted straight to the ICU), and when they left and to which ward. Stays
--     of patients moved in or out by other screens (Inpatient Admissions, OR release) are opened and
--     closed by the board itself.
--   * TV displays get the kind "icu" (the ICU board; display_devices.kind is a VARCHAR, nothing to alter).
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS icu_stays (
    id INT NOT NULL AUTO_INCREMENT,
    admission_id INT UNSIGNED NOT NULL,
    patient_id INT UNSIGNED NOT NULL,
    ward_id INT UNSIGNED NOT NULL,                    -- the ICU ward
    bed_id INT UNSIGNED NOT NULL,                     -- the ICU bed on arrival
    in_at DATETIME NOT NULL,
    source VARCHAR(10) NOT NULL,                      -- er | or | ward | direct
    source_ref VARCHAR(80) DEFAULT NULL,              -- e.g. ER-2026-00012, OR-2026-0031, Medical Inpatient Ward
    source_id INT DEFAULT NULL,                       -- er_visits.id / or_surgical_cases.id / the ward's id
    in_reason VARCHAR(255) DEFAULT NULL,
    in_by INT DEFAULT NULL,
    out_at DATETIME DEFAULT NULL,
    out_to VARCHAR(10) DEFAULT NULL,                  -- ward | discharged | other
    out_ward_id INT UNSIGNED DEFAULT NULL,
    out_bed_id INT UNSIGNED DEFAULT NULL,
    out_reason VARCHAR(255) DEFAULT NULL,
    out_note VARCHAR(1000) DEFAULT NULL,              -- the handover to the ward
    out_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_icu_stays_adm (admission_id, out_at),
    KEY idx_icu_stays_open (out_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
