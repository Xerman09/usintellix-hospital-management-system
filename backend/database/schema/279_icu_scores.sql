-- ICU (module 13, Phase 3: ICU scores and reports).
--   * icu_lines: lines, tubes and drains of an admission (central line, PICC, dialysis catheter, arterial
--     line, urinary catheter, endotracheal tube, tracheostomy, chest drain, NG tube) -- inserted when and
--     where, removed when and why. Central line and urinary catheter days come from these; ventilator
--     days come from the ICU flowsheet (hours charted on a ventilator). They feed the ICU report and the
--     HAI/SSI report (CLABSI / CAUTI / VAP per 1,000 device days).
--   * icu_scores: severity scores of each ICU stay, saved -- SOFA for every ICU day (07:00 to 07:00) and
--     APACHE II for the first 24 hours (with its predicted mortality). A saved score is worked out again
--     until a day after its window ends, so late lab results still count.
--   * icu_stays gets the APACHE II answers a doctor gives: chronic health (severe organ failure or
--     immunocompromised), type of admission (medical / after emergency or planned surgery), acute kidney
--     failure. A death in the ICU closes the stay with out_to = 'died'.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS icu_lines (
    id INT NOT NULL AUTO_INCREMENT,
    admission_id INT UNSIGNED NOT NULL,
    patient_id INT UNSIGNED NOT NULL,
    kind VARCHAR(20) NOT NULL,                        -- cvc | picc | dialysis | arterial | urinary | ett | trach | chest_drain | ngt | other
    label VARCHAR(80) DEFAULT NULL,                   -- for "other", or extra detail
    site VARCHAR(60) DEFAULT NULL,                    -- e.g. Internal jugular, Radial, Urethral
    side VARCHAR(10) DEFAULT NULL,                    -- left | right
    size VARCHAR(30) DEFAULT NULL,                    -- e.g. 7 Fr triple lumen, 14 Fr, 7.5
    inserted_at DATETIME NOT NULL,
    inserted_where VARCHAR(10) NOT NULL DEFAULT 'icu', -- icu | or | er | ward | outside
    inserted_by INT DEFAULT NULL,                     -- the user who charted it
    inserted_by_name VARCHAR(150) DEFAULT NULL,       -- who put it in
    bundle TINYINT(1) DEFAULT NULL,                   -- central lines put in here: insertion bundle followed (1) or not (0)
    notes VARCHAR(500) DEFAULT NULL,
    removed_at DATETIME DEFAULT NULL,
    removed_by INT DEFAULT NULL,
    removed_reason VARCHAR(30) DEFAULT NULL,          -- not_needed | not_working | infection | accidental | replaced | died | other
    removed_note VARCHAR(255) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    voided_at DATETIME DEFAULT NULL, voided_by INT DEFAULT NULL, void_reason VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_icu_lines_adm (admission_id, removed_at),
    KEY idx_icu_lines_patient (patient_id, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS icu_scores (
    id INT NOT NULL AUTO_INCREMENT,
    stay_id INT NOT NULL,
    admission_id INT UNSIGNED NOT NULL,
    kind VARCHAR(10) NOT NULL,                        -- sofa | apache2
    window_end DATETIME NOT NULL,                     -- sofa: the end of the ICU day (07:00) or leaving the ICU; apache2: 24 h after arrival (or leaving)
    score SMALLINT DEFAULT NULL,                      -- NULL: nothing to score
    parts TINYINT UNSIGNED NOT NULL DEFAULT 0,        -- sofa: organs scored (of 6); apache2: measurements found (of 12)
    predicted_mortality DECIMAL(5,1) DEFAULT NULL,    -- apache2: %
    detail TEXT DEFAULT NULL,                         -- JSON: the parts with their values
    computed_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_icu_scores (stay_id, kind, window_end),
    KEY idx_icu_scores_adm (admission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'icu_stays' AND column_name = 'apache_chronic');
SET @s := IF(@c = 0,
    'ALTER TABLE icu_stays
        ADD COLUMN apache_chronic TINYINT(1) DEFAULT NULL AFTER out_by,
        ADD COLUMN apache_admit VARCHAR(16) DEFAULT NULL AFTER apache_chronic,
        ADD COLUMN apache_arf TINYINT(1) DEFAULT NULL AFTER apache_admit,
        ADD COLUMN apache_by INT DEFAULT NULL AFTER apache_arf,
        ADD COLUMN apache_at DATETIME DEFAULT NULL AFTER apache_by',
    'SELECT 1');
PREPARE st FROM @s;
EXECUTE st;
DEALLOCATE PREPARE st;

-- Stays closed by a death before this phase said out_to = 'other', out_reason = 'Deceased'.
UPDATE icu_stays SET out_to = 'died' WHERE out_to = 'other' AND out_reason = 'Deceased';
