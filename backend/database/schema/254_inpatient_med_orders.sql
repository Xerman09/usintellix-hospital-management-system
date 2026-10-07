-- Inpatient medicine orders (MAR & pain medication, Phase 1).
-- The doctor orders a medicine for an admitted patient (dose, route, how often, start/stop,
-- scheduled / as-needed / once); the pharmacist verifies it (allergy and duplicate checks)
-- before it can be given. Orders are never edited: change = discontinue + new order.

CREATE TABLE IF NOT EXISTS inpatient_med_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admission_id INT UNSIGNED NOT NULL,
    patient_id INT UNSIGNED NULL,
    drug_id INT NOT NULL,
    drug_name VARCHAR(255) NOT NULL,              -- as ordered (catalog name at the time)
    dose DECIMAL(10,3) NOT NULL,
    dose_unit VARCHAR(20) NOT NULL,
    route VARCHAR(10) NOT NULL,                   -- PO, IV, IM, SC, ...
    order_type ENUM('scheduled', 'prn', 'once') NOT NULL,
    frequency VARCHAR(10) NULL,                   -- OD, BID, TID, QID, Q4H ... (scheduled)
    admin_times VARCHAR(100) NULL,                -- "08:00,20:00" (scheduled)
    prn_indication VARCHAR(255) NULL,             -- as-needed: what for (e.g. pain score 4+)
    prn_min_hours DECIMAL(4,1) NULL,              -- as-needed: at least this many hours apart
    prn_max_per_day TINYINT NULL,                 -- as-needed: at most this many doses in 24 h
    is_stat TINYINT(1) NOT NULL DEFAULT 0,        -- give immediately
    start_at DATETIME NOT NULL,
    stop_at DATETIME NULL,
    instructions VARCHAR(500) NULL,
    status ENUM('pending', 'verified', 'rejected', 'discontinued') NOT NULL DEFAULT 'pending',
    checks_json TEXT NULL,                        -- warnings found when ordered (allergy / duplicate / high-alert)
    doctor_ack_reason VARCHAR(255) NULL,          -- why it was ordered despite an allergy match
    ordered_by INT NULL,
    ordered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_by INT NULL,
    verified_at DATETIME NULL,
    verify_note VARCHAR(500) NULL,                -- incl. the pharmacist's reason for an allergy override
    rejected_reason VARCHAR(500) NULL,
    discontinued_by INT NULL,
    discontinued_at DATETIME NULL,
    discontinue_reason VARCHAR(255) NULL,
    KEY idx_imo_adm (admission_id, status),
    KEY idx_imo_status (status, ordered_at),
    KEY idx_imo_drug (drug_id),
    CONSTRAINT fk_imo_adm FOREIGN KEY (admission_id) REFERENCES inpatient_admissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_imo_drug FOREIGN KEY (drug_id) REFERENCES drugs(id),
    CONSTRAINT fk_imo_ordered FOREIGN KEY (ordered_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_imo_verified FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_imo_dc FOREIGN KEY (discontinued_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every step of an order: ordered, verified, rejected, discontinued.
CREATE TABLE IF NOT EXISTS inpatient_med_order_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    action VARCHAR(30) NOT NULL,
    note VARCHAR(500) NULL,
    user_id INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_imoe_order (order_id),
    CONSTRAINT fk_imoe_order FOREIGN KEY (order_id) REFERENCES inpatient_med_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_imoe_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
