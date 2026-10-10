-- ICU (module 13, Phase 1: the ICU flowsheet).
--   * icu_hourly: one entry per patient per hour -- the vital signs go to inpatient_vitals (so NEWS2,
--     the vitals graph and the census see them; vitals_id links them), plus CVP / EtCO2, level of
--     consciousness (GCS, RASS, pupils, CAM-ICU), oxygen device and ventilator settings. slot_at keeps
--     one live entry per hour; a correction voids the old entry (slot_at -> NULL) and adds a new one.
--   * icu_drips + icu_drip_rates: continuous infusions -- drug, concentration (amount in volume), dose
--     unit, weight -- and every rate change (mL/h and the dose it gives). The volume infused counts as
--     intake by itself.
--   * icu_io: intake and output entries (mL) by type; the flowsheet adds them up per hour, per ICU day
--     (07:00 to 07:00) and since admission.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS icu_hourly (
    id INT NOT NULL AUTO_INCREMENT,
    admission_id INT UNSIGNED NOT NULL,
    patient_id INT UNSIGNED NOT NULL,
    hour_at DATETIME NOT NULL,                        -- the hour this entry is for (HH:00)
    slot_at DATETIME DEFAULT NULL,                    -- = hour_at while live; NULL once voided
    vitals_id INT DEFAULT NULL,                       -- inpatient_vitals row with HR, BP, RR, temp, SpO2
    cvp TINYINT DEFAULT NULL,                         -- mmHg
    etco2 TINYINT UNSIGNED DEFAULT NULL,              -- mmHg
    gcs_e TINYINT DEFAULT NULL, gcs_v TINYINT DEFAULT NULL, gcs_m TINYINT DEFAULT NULL,
    gcs_intubated TINYINT(1) NOT NULL DEFAULT 0,      -- verbal not testable ("T")
    rass TINYINT DEFAULT NULL,                        -- -5 .. +4
    pupil_l DECIMAL(3,1) DEFAULT NULL, pupil_r DECIMAL(3,1) DEFAULT NULL,   -- mm
    pupil_l_react VARCHAR(10) DEFAULT NULL, pupil_r_react VARCHAR(10) DEFAULT NULL,   -- brisk | sluggish | fixed
    cam_icu VARCHAR(10) DEFAULT NULL,                 -- negative | positive | unable
    o2_device VARCHAR(20) DEFAULT NULL,               -- room_air | nasal | mask | nrb | hfnc | niv | ventilator
    o2_flow DECIMAL(4,1) DEFAULT NULL,                -- L/min (nasal, mask, HFNC)
    fio2 TINYINT UNSIGNED DEFAULT NULL,               -- %
    vent_mode VARCHAR(20) DEFAULT NULL,
    peep DECIMAL(4,1) DEFAULT NULL, vt_set SMALLINT DEFAULT NULL, rr_set TINYINT DEFAULT NULL,
    pressure_support DECIMAL(4,1) DEFAULT NULL, pinsp DECIMAL(4,1) DEFAULT NULL,
    vt_exp SMALLINT DEFAULT NULL, rr_total TINYINT DEFAULT NULL, ppeak DECIMAL(4,1) DEFAULT NULL, pplat DECIMAL(4,1) DEFAULT NULL,
    notes VARCHAR(500) DEFAULT NULL,
    recorded_by INT DEFAULT NULL,
    recorded_at DATETIME NOT NULL,
    voided_at DATETIME DEFAULT NULL, voided_by INT DEFAULT NULL, void_reason VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_icu_hourly_slot (admission_id, slot_at),
    KEY idx_icu_hourly_adm (admission_id, hour_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS icu_drips (
    id INT NOT NULL AUTO_INCREMENT,
    admission_id INT UNSIGNED NOT NULL,
    patient_id INT UNSIGNED NOT NULL,
    med_order_id INT DEFAULT NULL,                    -- the verified medicine order it runs under, if chosen
    drug_name VARCHAR(150) NOT NULL,
    amount DECIMAL(10,3) NOT NULL,                    -- e.g. 4 (mg) ...
    amount_unit VARCHAR(10) NOT NULL,                 -- mg | mcg | g | units | mmol
    volume_ml DECIMAL(7,1) NOT NULL,                  -- ... in 250 mL
    dose_unit VARCHAR(15) NOT NULL,                   -- mcg/kg/min, mg/h, units/h ... or mL/h
    weight_kg DECIMAL(5,1) DEFAULT NULL,              -- for per-kg doses
    started_at DATETIME NOT NULL,
    started_by INT DEFAULT NULL,
    stopped_at DATETIME DEFAULT NULL,
    stopped_by INT DEFAULT NULL,
    stop_reason VARCHAR(255) DEFAULT NULL,
    notes VARCHAR(500) DEFAULT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_icu_drips_adm (admission_id, stopped_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS icu_drip_rates (
    id INT NOT NULL AUTO_INCREMENT,
    drip_id INT NOT NULL,
    changed_at DATETIME NOT NULL,
    rate_ml_h DECIMAL(7,2) NOT NULL,
    dose DECIMAL(12,4) DEFAULT NULL,                  -- in the drip's dose unit (NULL for mL/h drips)
    reason VARCHAR(255) DEFAULT NULL,                 -- e.g. "MAP 58, titrated up"
    recorded_by INT DEFAULT NULL,
    recorded_at DATETIME NOT NULL,
    voided_at DATETIME DEFAULT NULL, voided_by INT DEFAULT NULL, void_reason VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_icu_drip_rates (drip_id, changed_at),
    CONSTRAINT fk_icu_drip_rates_drip FOREIGN KEY (drip_id) REFERENCES icu_drips (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS icu_io (
    id INT NOT NULL AUTO_INCREMENT,
    admission_id INT UNSIGNED NOT NULL,
    patient_id INT UNSIGNED NOT NULL,
    kind VARCHAR(3) NOT NULL,                         -- in | out
    category VARCHAR(20) NOT NULL,                    -- in: iv, blood, oral, enteral, flush, other; out: urine, drain, ng, stool, emesis, blood, other
    label VARCHAR(80) DEFAULT NULL,                   -- e.g. "Plain NSS", "Chest drain L"
    volume_ml DECIMAL(7,1) NOT NULL,
    at DATETIME NOT NULL,
    recorded_by INT DEFAULT NULL,
    recorded_at DATETIME NOT NULL,
    voided_at DATETIME DEFAULT NULL, voided_by INT DEFAULT NULL, void_reason VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_icu_io_adm (admission_id, at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
