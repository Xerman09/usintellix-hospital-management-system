-- Code Blue (module 10, Phase 2: code record).
-- A timed record during the code, one tap per event: CPR start/stop, pulse checks, rhythm,
-- shocks, drugs and doses, airway, notes. Entries are never deleted: a mistap is struck out
-- (voided) and a corrected time keeps the original. The outcome (return of circulation,
-- transfer to ICU, or died) is recorded with its time when the code ends.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS code_blue_record (
    id INT NOT NULL AUTO_INCREMENT,
    event_id INT NOT NULL,
    kind VARCHAR(16) NOT NULL,                       -- cpr_start | cpr_stop | pulse_check | rhythm | shock | drug | airway | note
    value VARCHAR(80) DEFAULT NULL,                  -- rhythm (VF, PEA, ...), drug name, airway
    dose DECIMAL(10,3) DEFAULT NULL,
    unit VARCHAR(10) DEFAULT NULL,
    route VARCHAR(10) DEFAULT NULL,
    energy_j SMALLINT DEFAULT NULL,                  -- shocks
    note VARCHAR(300) DEFAULT NULL,
    event_at DATETIME NOT NULL,                      -- when it happened (the tap, or a corrected time)
    recorded_by INT NOT NULL,
    recorded_at DATETIME NOT NULL,
    original_event_at DATETIME DEFAULT NULL,         -- set when the time was corrected
    edited_by INT DEFAULT NULL,
    edited_at DATETIME DEFAULT NULL,
    voided_at DATETIME DEFAULT NULL,                 -- struck out (mistap), never deleted
    voided_by INT DEFAULT NULL,
    void_reason VARCHAR(200) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_code_blue_record_event (event_id, event_at),
    CONSTRAINT fk_code_blue_record_event FOREIGN KEY (event_id) REFERENCES code_blue_events (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The outcome, with its time (time of death when the patient died).
SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'code_blue_events' AND column_name = 'outcome');
SET @s := IF(@c = 0,
    "ALTER TABLE code_blue_events
        ADD COLUMN outcome VARCHAR(12) DEFAULT NULL AFTER end_note,
        ADD COLUMN outcome_at DATETIME DEFAULT NULL AFTER outcome,
        ADD COLUMN outcome_by INT DEFAULT NULL AFTER outcome_at,
        ADD COLUMN outcome_set_at DATETIME DEFAULT NULL AFTER outcome_by",
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;
