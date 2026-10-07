-- Ward cabinet controls (Department medicine stock, Phase 3).
--
--  - Override: medicine taken out of a cabinet before the pharmacist verified the order
--    (an emergency), with the nurse's reason. Logged on the withdrawal; the pharmacy is
--    alerted and reviews it (override_reviewed_*).
--  - Dangerous-drug shift count: at each shift change two nurses count every dangerous drug
--    in the cabinet (blind: the expected figure is shown only after). Any difference is a
--    discrepancy: urgent alert to the pharmacy and the ward's charge nurse, resolved with a note.
-- Safe to re-run.

ALTER TABLE cabinet_withdrawals
    ADD COLUMN IF NOT EXISTS is_override TINYINT(1) NOT NULL DEFAULT 0 AFTER note,
    ADD COLUMN IF NOT EXISTS override_reason VARCHAR(255) NULL AFTER is_override,
    ADD COLUMN IF NOT EXISTS override_reviewed_by INT NULL AFTER override_reason,
    ADD COLUMN IF NOT EXISTS override_reviewed_at DATETIME NULL AFTER override_reviewed_by,
    ADD COLUMN IF NOT EXISTS override_review_note VARCHAR(255) NULL AFTER override_reviewed_at;

CREATE INDEX IF NOT EXISTS idx_cw_override ON cabinet_withdrawals (is_override, override_reviewed_at);

CREATE TABLE IF NOT EXISTS dd_counts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    warehouse_id INT NOT NULL,
    ward_id INT UNSIGNED NULL,
    shift_date DATE NOT NULL,
    shift_id INT NOT NULL,
    status ENUM('ok', 'discrepancy', 'resolved') NOT NULL,
    counted_by INT NULL,
    witness_by INT NULL,
    counted_at DATETIME NOT NULL,
    note VARCHAR(255) NULL,
    resolved_by INT NULL,
    resolved_at DATETIME NULL,
    resolution_note VARCHAR(500) NULL,
    INDEX idx_ddc_shift (warehouse_id, shift_date, shift_id),
    INDEX idx_ddc_status (status),
    CONSTRAINT fk_ddc_wh FOREIGN KEY (warehouse_id) REFERENCES warehouses (id),
    CONSTRAINT fk_ddc_by FOREIGN KEY (counted_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_ddc_wit FOREIGN KEY (witness_by) REFERENCES users (id) ON DELETE SET NULL,
    CONSTRAINT fk_ddc_res FOREIGN KEY (resolved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dd_count_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    count_id INT NOT NULL,
    drug_id INT NOT NULL,
    expected DECIMAL(12,3) NOT NULL,              -- on hand in the system when counted
    counted DECIMAL(12,3) NOT NULL,
    difference DECIMAL(12,3) NOT NULL,            -- counted - expected
    note VARCHAR(255) NULL,
    INDEX idx_ddcl_count (count_id),
    CONSTRAINT fk_ddcl_count FOREIGN KEY (count_id) REFERENCES dd_counts (id) ON DELETE CASCADE,
    CONSTRAINT fk_ddcl_drug FOREIGN KEY (drug_id) REFERENCES drugs (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
