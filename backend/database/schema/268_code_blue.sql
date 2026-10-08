-- Code Blue (module 10, Phase 1: activation).
-- A code is called with its location (an admitted patient's bed, or a place); the code team,
-- the ward's staff and the nurse stations are alerted at once; team members tap "Responding".

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS code_blue_events (
    id INT NOT NULL AUTO_INCREMENT,
    status VARCHAR(12) NOT NULL DEFAULT 'active',      -- active | ended | cancelled (false alarm)
    patient_id INT DEFAULT NULL,
    admission_id INT UNSIGNED DEFAULT NULL,
    ward_id INT DEFAULT NULL,
    bed_id INT DEFAULT NULL,
    location VARCHAR(200) NOT NULL,                    -- shown on the alert and the TVs (never the patient's name)
    location_detail VARCHAR(200) DEFAULT NULL,          -- e.g. "bathroom", "corridor by the lifts"
    called_from VARCHAR(20) DEFAULT NULL,               -- chart | census | station
    called_by INT NOT NULL,
    called_at DATETIME NOT NULL,
    alert_id INT DEFAULT NULL,
    ended_at DATETIME DEFAULT NULL,
    ended_by INT DEFAULT NULL,
    end_note VARCHAR(500) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_code_blue_status (status, called_at),
    KEY idx_code_blue_ward (ward_id),
    KEY idx_code_blue_patient (patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS code_blue_responders (
    id INT NOT NULL AUTO_INCREMENT,
    event_id INT NOT NULL,
    user_id INT NOT NULL,
    response VARCHAR(12) NOT NULL DEFAULT 'responding', -- responding | declined
    responded_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_code_blue_responder (event_id, user_id),
    CONSTRAINT fk_code_blue_responders_event FOREIGN KEY (event_id) REFERENCES code_blue_events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The code team: alerted for every Code Blue wherever it is.
CREATE TABLE IF NOT EXISTS code_blue_team (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    team_role VARCHAR(40) DEFAULT NULL,                 -- e.g. Team leader, Airway, Compressions, Medications, Recorder
    added_by INT DEFAULT NULL,
    added_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_code_blue_team_user (user_id),
    CONSTRAINT fk_code_blue_team_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- A Code Blue alert stays with everyone until the code ends: it never escalates.
INSERT IGNORE INTO alert_escalation_policies (alert_type, applies_to, is_active, created_at) VALUES ('code_blue', 'critical', 0, NOW());
