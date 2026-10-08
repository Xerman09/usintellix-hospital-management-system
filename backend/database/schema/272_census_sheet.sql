-- Census (module 11, Phase 2: reports and the printable daily census sheet).
-- Saved with each day's census, so the sheet shows the day as it was:
--   census_patients  -- each patient in a ward at midnight (bed, name, patient no., age / sex,
--                       admitted on, day of stay, attending, admitting diagnosis).
--   census_movements -- the day's admissions, transfers in / out, discharges and deaths, with the time.
-- Days saved before this phase are shown from the records when their sheet is printed.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS census_patients (
    id INT NOT NULL AUTO_INCREMENT,
    census_date DATE NOT NULL,
    ward_id INT NOT NULL,
    admission_id INT NOT NULL,
    bed_label VARCHAR(80) DEFAULT NULL,
    patient_name VARCHAR(150) NOT NULL,
    patient_no VARCHAR(50) DEFAULT NULL,
    age INT DEFAULT NULL,
    gender VARCHAR(20) DEFAULT NULL,
    admission_date DATETIME NOT NULL,
    stay_day INT NOT NULL,                        -- day of stay at midnight (admission day = 1)
    doctor_name VARCHAR(160) DEFAULT NULL,
    diagnosis VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_census_patients (census_date, ward_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS census_movements (
    id INT NOT NULL AUTO_INCREMENT,
    census_date DATE NOT NULL,
    ward_id INT NOT NULL,
    admission_id INT NOT NULL,
    event VARCHAR(16) NOT NULL,                   -- admitted | transferred_in | transferred_out | discharged | died
    event_at DATETIME NOT NULL,
    other_ward VARCHAR(100) DEFAULT NULL,         -- transfers: the ward it came from / went to
    detail VARCHAR(150) DEFAULT NULL,             -- discharges: the disposition
    bed_label VARCHAR(80) DEFAULT NULL,
    patient_name VARCHAR(150) NOT NULL,
    patient_no VARCHAR(50) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_census_movements (census_date, ward_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Whether the day was saved with its patient lists (days saved before this phase: no).
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'census_days' AND column_name = 'has_sheet');
SET @s := IF(@c = 0, 'ALTER TABLE census_days ADD COLUMN has_sheet TINYINT(1) NOT NULL DEFAULT 0 AFTER note', 'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;
