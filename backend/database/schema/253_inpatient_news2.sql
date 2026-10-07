-- NEWS2 early warning score (Inpatient vital signs, Phase 2).
-- The score is worked out by the app from each set when it is saved and stored with the set
-- (so the history keeps the score as it was, with the SpO2 scale in use at the time).
-- Sets saved before this change get their score worked out when read.

ALTER TABLE inpatient_vitals
    ADD COLUMN IF NOT EXISTS news2_score TINYINT NULL AFTER notes,
    ADD COLUMN IF NOT EXISTS news2_risk ENUM('low', 'low_medium', 'medium', 'high') NULL AFTER news2_score,
    ADD COLUMN IF NOT EXISTS news2_complete TINYINT(1) NULL AFTER news2_risk,
    ADD COLUMN IF NOT EXISTS news2_scale TINYINT NULL AFTER news2_complete,
    ADD COLUMN IF NOT EXISTS news2_parts VARCHAR(255) NULL AFTER news2_scale;    -- JSON {"resp_rate":3,...}

-- SpO2 scale per admission: 1 (default) or 2 for a prescribed 88-92% target (set by a doctor).
CREATE TABLE IF NOT EXISTS inpatient_news2_settings (
    admission_id INT UNSIGNED PRIMARY KEY,
    spo2_scale TINYINT NOT NULL DEFAULT 1,
    reason VARCHAR(255) NULL,
    set_by INT NULL,
    set_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ins_adm FOREIGN KEY (admission_id) REFERENCES inpatient_admissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_ins_by FOREIGN KEY (set_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
