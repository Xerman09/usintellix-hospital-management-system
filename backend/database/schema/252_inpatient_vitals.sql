-- Inpatient vital signs (module 3, Phase 1).
--  - inpatient_vitals: any number of sets per admission (BP, HR, RR, temperature, SpO2, pain,
--    blood sugar; oxygen and AVPU are kept for the early warning score in Phase 2).
--    A wrong entry is voided with a reason, never deleted.
--  - inpatient_vitals_schedules: how often each patient's vitals are due (e.g. every 4 hours).

CREATE TABLE IF NOT EXISTS inpatient_vitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT UNSIGNED NOT NULL,
    patient_id INT UNSIGNED NULL,
    taken_at DATETIME NOT NULL,
    bp_systolic SMALLINT NULL,
    bp_diastolic SMALLINT NULL,
    heart_rate SMALLINT NULL,
    resp_rate SMALLINT NULL,
    temperature_c DECIMAL(4,1) NULL,
    spo2 TINYINT NULL,
    on_oxygen TINYINT(1) NULL,                  -- on supplemental oxygen
    oxygen_lpm DECIMAL(4,1) NULL,
    consciousness ENUM('Alert', 'Confused', 'Voice', 'Pain', 'Unresponsive') NULL,
    pain_score TINYINT NULL,                    -- 0-10
    blood_sugar_mgdl SMALLINT NULL,
    notes VARCHAR(500) NULL,
    recorded_by INT NULL,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    voided_at DATETIME NULL,
    voided_by INT NULL,
    void_reason VARCHAR(255) NULL,
    KEY idx_iv_adm_time (admission_id, taken_at),
    KEY idx_iv_patient (patient_id, taken_at),
    CONSTRAINT fk_iv_adm FOREIGN KEY (admission_id) REFERENCES inpatient_admissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_iv_by FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_iv_void_by FOREIGN KEY (voided_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inpatient_vitals_schedules (
    admission_id INT UNSIGNED PRIMARY KEY,
    every_hours TINYINT NOT NULL,                -- 1, 2, 4, 6, 8, 12 or 24
    reason VARCHAR(255) NULL,
    set_by INT NULL,
    set_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ivs_adm FOREIGN KEY (admission_id) REFERENCES inpatient_admissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_ivs_by FOREIGN KEY (set_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
