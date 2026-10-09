-- ER (module 12, Phase 2: the tracking board).
--   * er_beds: the ER's beds / bays (resuscitation, acute, fast track...), set up by the admin.
--   * er_visits gets the bed, the doctor (the first doctor assigned = the patient was seen: the wait
--     ends) and the nurse.
--   * er_wait_targets: minutes per acuity from arrival to being seen by a doctor (acuity 0 = from
--     arrival to triage). Past the target, the ER team is alerted.
--   * er_staff: the ER team (doctors, nurses) -- they get the waiting-time alerts.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS er_beds (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(40) NOT NULL,                        -- e.g. "Resus 1", "Bay 4", "Fast track 2"
    area VARCHAR(20) NOT NULL DEFAULT 'acute',        -- resus | acute | fast_track | observation | other
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by INT DEFAULT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_er_bed_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'er_visits' AND column_name = 'er_bed_id');
SET @s := IF(@c = 0,
    'ALTER TABLE er_visits
        ADD COLUMN er_bed_id INT DEFAULT NULL AFTER acuity,
        ADD COLUMN bed_at DATETIME DEFAULT NULL AFTER er_bed_id,
        ADD COLUMN doctor_user_id INT DEFAULT NULL AFTER bed_at,
        ADD COLUMN doctor_at DATETIME DEFAULT NULL AFTER doctor_user_id,
        ADD COLUMN nurse_user_id INT DEFAULT NULL AFTER doctor_at,
        ADD KEY idx_er_visits_bed (er_bed_id, status)',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;

CREATE TABLE IF NOT EXISTS er_wait_targets (
    acuity TINYINT NOT NULL,                          -- 0 = arrival to triage; 1-5 = arrival to doctor
    minutes INT NOT NULL,
    updated_by INT DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL,
    PRIMARY KEY (acuity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Common targets (triage within 10 minutes; doctor: level 1 at once, 2 in 10 min, 3 in 30, 4 in 60, 5 in 120). Editable on the ER screen.
INSERT IGNORE INTO er_wait_targets (acuity, minutes) VALUES (0, 10), (1, 0), (2, 10), (3, 30), (4, 60), (5, 120);

CREATE TABLE IF NOT EXISTS er_staff (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    added_by INT DEFAULT NULL,
    added_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_er_staff_user (user_id),
    CONSTRAINT fk_er_staff_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The waiting-time check runs from the bell's poll (at most every minute) and backend/cron/er_wait.php.
INSERT IGNORE INTO alert_job_runs (job, last_run_at) VALUES ('er_wait', '2000-01-01 00:00:00');

-- When each waiting-time alert went out (once per stage; again only if re-triage makes it more urgent).
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'er_visits' AND column_name = 'triage_alert_at');
SET @s := IF(@c = 0,
    'ALTER TABLE er_visits
        ADD COLUMN triage_alert_at DATETIME DEFAULT NULL AFTER nurse_user_id,
        ADD COLUMN doctor_alert_at DATETIME DEFAULT NULL AFTER triage_alert_at,
        ADD COLUMN doctor_alert_acuity TINYINT DEFAULT NULL AFTER doctor_alert_at',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;
