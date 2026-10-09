-- ER (module 12, Phase 3: time-critical protocols -- chest pain, stroke, sepsis).
--   * er_protocols: a protocol started for an ER visit (at triage, or later from the board). The clock
--     runs from arrival (chest pain, stroke: "door to ECG / CT / needle") or from when it was started
--     (sepsis: time zero = recognition, i.e. triage when started there).
--   * er_protocol_steps: the checklist -- one row per step, pending / done / not needed, with when it
--     was actually done, a result (e.g. ECG: STEMI) and when the "late" alert went out.
--   * er_protocol_targets: the admin's step targets (minutes); steps not listed use the built-in ones.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS er_protocols (
    id INT NOT NULL AUTO_INCREMENT,
    visit_id INT NOT NULL,
    protocol VARCHAR(20) NOT NULL,                    -- chest_pain | stroke | sepsis
    status VARCHAR(12) NOT NULL DEFAULT 'active',     -- active | complete | stopped
    clock_at DATETIME NOT NULL,                       -- the step targets count from here
    started_via VARCHAR(10) NOT NULL DEFAULT 'board', -- triage | board
    started_by INT DEFAULT NULL,
    started_at DATETIME NOT NULL,
    completed_at DATETIME DEFAULT NULL,
    stopped_by INT DEFAULT NULL,
    stopped_at DATETIME DEFAULT NULL,
    stop_reason VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_er_protocols_visit (visit_id, status),
    KEY idx_er_protocols_status (status),
    CONSTRAINT fk_er_protocols_visit FOREIGN KEY (visit_id) REFERENCES er_visits (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS er_protocol_steps (
    id INT NOT NULL AUTO_INCREMENT,
    protocol_id INT NOT NULL,
    step_key VARCHAR(30) NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'pending',    -- pending | done | na
    value VARCHAR(60) DEFAULT NULL,                   -- result / number / last-known-well time
    done_at DATETIME DEFAULT NULL,                    -- when it was actually done (may be before it was charted)
    recorded_by INT DEFAULT NULL,                     -- NULL = filled in automatically (doctor seen, triage glucose)
    recorded_at DATETIME DEFAULT NULL,
    alert_at DATETIME DEFAULT NULL,                   -- the "late" alert went out (once)
    PRIMARY KEY (id),
    UNIQUE KEY uq_er_protocol_step (protocol_id, step_key),
    CONSTRAINT fk_er_protocol_steps_protocol FOREIGN KEY (protocol_id) REFERENCES er_protocols (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS er_protocol_targets (
    protocol VARCHAR(20) NOT NULL,
    step_key VARCHAR(30) NOT NULL,
    minutes INT NOT NULL,
    updated_by INT DEFAULT NULL,
    updated_at DATETIME DEFAULT NULL,
    PRIMARY KEY (protocol, step_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
