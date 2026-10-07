-- Medicine administration record (MAR & pain medication, Phase 2).
-- One row per dose recorded against a verified order: given (time + initials; a second
-- nurse for high-alert medicines), held (with reason) or refused. Due / late are worked
-- out from the order's times; nothing is stored until a nurse records the dose.
-- A wrong entry is voided (with reason), never deleted, and the dose is due again.

CREATE TABLE IF NOT EXISTS inpatient_med_administrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    admission_id INT UNSIGNED NOT NULL,
    patient_id INT UNSIGNED NULL,
    scheduled_at DATETIME NULL,                   -- the dose time it answers (NULL for an as-needed dose)
    slot_at DATETIME NULL,                        -- = scheduled_at while not voided; keeps one entry per dose time
    status ENUM('given', 'held', 'refused') NOT NULL,
    given_at DATETIME NULL,                       -- when it was given (given only)
    dose DECIMAL(10,3) NULL,
    dose_unit VARCHAR(20) NULL,
    route VARCHAR(10) NULL,
    reason VARCHAR(255) NULL,                     -- held / refused: why; as-needed: what for
    note VARCHAR(500) NULL,
    initials VARCHAR(5) NOT NULL,                 -- of the nurse who recorded it, as at the time
    recorded_by INT NULL,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    witness_by INT NULL,                          -- second nurse (high-alert medicines)
    witness_initials VARCHAR(5) NULL,
    witness_at DATETIME NULL,
    voided_at DATETIME NULL,
    voided_by INT NULL,
    void_reason VARCHAR(255) NULL,
    UNIQUE KEY uq_ima_slot (order_id, slot_at),
    KEY idx_ima_adm (admission_id, recorded_at),
    KEY idx_ima_order (order_id, given_at),
    CONSTRAINT fk_ima_order FOREIGN KEY (order_id) REFERENCES inpatient_med_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_ima_adm FOREIGN KEY (admission_id) REFERENCES inpatient_admissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_ima_rec FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_ima_wit FOREIGN KEY (witness_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_ima_void FOREIGN KEY (voided_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The overdue-dose check runs from the bell poll (throttled) and from cron/mar_overdue.php.
INSERT IGNORE INTO alert_job_runs (job, last_run_at) VALUES ('mar_overdue', '2000-01-01 00:00:00');
