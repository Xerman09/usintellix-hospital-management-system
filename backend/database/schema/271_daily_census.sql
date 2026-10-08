-- Census (module 11, Phase 1: daily census).
-- The midnight census is saved once per day (by the nightly job, or when the bell's poll finds
-- yesterday not saved yet), so later changes to admissions don't rewrite history:
--   census_days   -- one row per day: when and how it was saved.
--   census_wards  -- per ward: patients at the start of the day, admitted, transferred in / out,
--                    discharged alive, died, patients at midnight, beds (total, out of service,
--                    available) and occupancy.
--   census_doctors -- per attending doctor (as written on the admission, matched to a provider
--                    when possible) with the specialization at the time: patients at midnight,
--                    admitted, discharged, died. The specialization census is summed from this.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS census_days (
    id INT NOT NULL AUTO_INCREMENT,
    census_date DATE NOT NULL,
    source VARCHAR(12) NOT NULL DEFAULT 'auto',       -- auto (nightly) | manual (recalculated) | backfill (saved later from records)
    saved_at DATETIME NOT NULL,
    saved_by INT DEFAULT NULL,
    note VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_census_day (census_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS census_wards (
    id INT NOT NULL AUTO_INCREMENT,
    census_date DATE NOT NULL,
    ward_id INT NOT NULL,
    ward_name VARCHAR(100) NOT NULL,
    ward_type VARCHAR(30) DEFAULT NULL,
    start_count INT NOT NULL DEFAULT 0,
    admitted INT NOT NULL DEFAULT 0,
    transferred_in INT NOT NULL DEFAULT 0,
    transferred_out INT NOT NULL DEFAULT 0,
    discharged INT NOT NULL DEFAULT 0,               -- left alive (home, other facility, against advice)
    died INT NOT NULL DEFAULT 0,
    midnight_count INT NOT NULL DEFAULT 0,           -- patients in the ward at midnight (= patient days)
    total_beds INT NOT NULL DEFAULT 0,
    out_of_service_beds INT DEFAULT NULL,            -- maintenance / blocked when saved; NULL = not known (saved later)
    available_beds INT DEFAULT NULL,
    occupancy_pct DECIMAL(5,1) DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_census_ward (census_date, ward_id),
    KEY idx_census_ward (ward_id, census_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS census_doctors (
    id INT NOT NULL AUTO_INCREMENT,
    census_date DATE NOT NULL,
    doctor_key VARCHAR(160) NOT NULL,                -- provider:{id}, or the name as written
    doctor_name VARCHAR(160) NOT NULL,
    provider_id INT DEFAULT NULL,
    specialization VARCHAR(120) DEFAULT NULL,         -- NULL = not known (doctor not matched to a provider)
    patients INT NOT NULL DEFAULT 0,                  -- at midnight
    admitted INT NOT NULL DEFAULT 0,
    discharged INT NOT NULL DEFAULT 0,
    died INT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_census_doctor (census_date, doctor_key),
    KEY idx_census_doctor_spec (census_date, specialization)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Yesterday's census is saved by the bell's poll when the nightly job hasn't (at most every 10 minutes).
INSERT IGNORE INTO alert_job_runs (job, last_run_at) VALUES ('daily_census', '2000-01-01 00:00:00');
