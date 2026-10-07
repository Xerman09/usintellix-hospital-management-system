-- Nursing shifts, patient assignments and hand-overs (Nurse & CNA, Phase 2).
--  - nursing_shifts: the shift pattern (seeded 7-3, 3-11, 11-7). A shift that crosses midnight
--    belongs to the date it starts on (the 11-7 shift of Oct 7 ends on Oct 8 at 7:00).
--  - nurse_patient_assignments: per admitted patient per shift, the nurse and the CNA.
--  - nurse_handovers: what the outgoing nurse tells the next shift about a patient; the
--    incoming nurse marks it received.

CREATE TABLE IF NOT EXISTS nursing_shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(60) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    sort_order TINYINT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ns_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nurse_patient_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT UNSIGNED NOT NULL,
    shift_date DATE NOT NULL,
    shift_id INT NOT NULL,
    ward_id INT UNSIGNED NOT NULL,                 -- the ward at the time of assignment
    nurse_user_id INT NULL,
    cna_user_id INT NULL,
    assigned_by INT NULL,
    assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT NULL,
    updated_at DATETIME NULL,
    UNIQUE KEY uq_npa_shift (admission_id, shift_date, shift_id),
    KEY idx_npa_shift_ward (shift_date, shift_id, ward_id),
    KEY idx_npa_nurse (nurse_user_id, shift_date),
    KEY idx_npa_cna (cna_user_id, shift_date),
    CONSTRAINT fk_npa_adm FOREIGN KEY (admission_id) REFERENCES inpatient_admissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_npa_shift FOREIGN KEY (shift_id) REFERENCES nursing_shifts(id),
    CONSTRAINT fk_npa_ward FOREIGN KEY (ward_id) REFERENCES hospital_wards(id),
    CONSTRAINT fk_npa_nurse FOREIGN KEY (nurse_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_npa_cna FOREIGN KEY (cna_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_npa_by FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS nurse_handovers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT UNSIGNED NOT NULL,
    shift_date DATE NOT NULL,                      -- the shift handing over
    shift_id INT NOT NULL,
    situation TEXT NOT NULL,                       -- how the patient is now
    background TEXT NULL,                          -- what happened this shift
    assessment TEXT NULL,                          -- concerns / watch for
    recommendation TEXT NULL,                      -- to do next shift
    written_by INT NULL,
    written_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL,
    received_by INT NULL,
    received_at DATETIME NULL,
    UNIQUE KEY uq_nh_shift (admission_id, shift_date, shift_id),
    KEY idx_nh_adm (admission_id, shift_date),
    CONSTRAINT fk_nh_adm FOREIGN KEY (admission_id) REFERENCES inpatient_admissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_nh_shift FOREIGN KEY (shift_id) REFERENCES nursing_shifts(id),
    CONSTRAINT fk_nh_written FOREIGN KEY (written_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_nh_received FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
