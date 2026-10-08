-- Fall risk for admitted patients (module 9, Phase 2: the room TV's fall-risk icon).
-- Nurses score the Morse Fall Scale; the admission keeps the latest level, every assessment is kept.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS inpatient_fall_assessments (
    id INT NOT NULL AUTO_INCREMENT,
    admission_id INT UNSIGNED NOT NULL,
    score INT NOT NULL,                                 -- Morse Fall Scale 0-125
    level VARCHAR(10) NOT NULL,                         -- low | moderate | high
    items_json VARCHAR(500) NOT NULL,                   -- the answer to each item
    note VARCHAR(500) DEFAULT NULL,
    assessed_by INT NOT NULL,
    assessed_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_fall_assessments_admission (admission_id, assessed_at),
    CONSTRAINT fk_fall_assessments_admission FOREIGN KEY (admission_id) REFERENCES inpatient_admissions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE inpatient_admissions
    ADD COLUMN IF NOT EXISTS fall_risk VARCHAR(10) NULL,
    ADD COLUMN IF NOT EXISTS fall_risk_score INT NULL,
    ADD COLUMN IF NOT EXISTS fall_risk_at DATETIME NULL;
