-- Surgery Phase 4: day-of-surgery monitoring.
--
--   or_case_stages        every stage move of a case, with when and who
--                         (an undone move keeps its row, marked undone).
--   or_case_safety_checks the WHO Surgical Safety Checklist built into the
--                         case: one row per phase (sign_in / time_out /
--                         sign_out), answers as JSON. Sign-In gates going
--                         into the room, Time-Out gates the incision,
--                         Sign-Out gates leaving the room.
--   or_case_vitals        the intra-op vitals timeline.
--   or_case_items         medicines, fluids, blood, supplies and implants
--                         used. An item taken from stock (drug_id +
--                         warehouse_id) has its lots in or_case_item_lots;
--                         each lot row writes the medicine ledger
--                         ('dispensed', source or_case_item_lots) and an
--                         undone item gives the stock back
--                         ('dispense_voided', same source).
--   or_case_specimens     specimens sent from the room.
--   or_surgical_cases     gains anesthesia start/end, urine output, the
--                         procedure actually performed, a count-issue
--                         flag and a revision for stale-edit checks.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS or_case_stages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT UNSIGNED NOT NULL,
    stage VARCHAR(40) NOT NULL,
    from_stage VARCHAR(40) NULL,
    stage_at DATETIME NOT NULL,
    user_id INT NULL,
    notes VARCHAR(255) NULL,
    undone_at DATETIME NULL,
    undone_by INT NULL,
    undo_reason VARCHAR(255) NULL,
    INDEX idx_ocs_case (case_id, stage_at),
    CONSTRAINT fk_ocs_case FOREIGN KEY (case_id) REFERENCES or_surgical_cases (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS or_case_safety_checks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT UNSIGNED NOT NULL,
    phase VARCHAR(20) NOT NULL,
    answers TEXT NOT NULL,
    notes VARCHAR(1000) NULL,
    completed_at DATETIME NOT NULL,
    completed_by INT NULL,
    UNIQUE KEY uq_ocsc_phase (case_id, phase),
    CONSTRAINT fk_ocsc_case FOREIGN KEY (case_id) REFERENCES or_surgical_cases (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS or_case_vitals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT UNSIGNED NOT NULL,
    recorded_at DATETIME NOT NULL,
    heart_rate SMALLINT NULL,
    bp_systolic SMALLINT NULL,
    bp_diastolic SMALLINT NULL,
    spo2 SMALLINT NULL,
    etco2 SMALLINT NULL,
    resp_rate SMALLINT NULL,
    temperature DECIMAL(4,1) NULL,
    notes VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    created_by INT NULL,
    removed_at DATETIME NULL,
    removed_by INT NULL,
    INDEX idx_ocv_case (case_id, recorded_at),
    CONSTRAINT fk_ocv_case FOREIGN KEY (case_id) REFERENCES or_surgical_cases (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS or_case_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT UNSIGNED NOT NULL,
    kind VARCHAR(20) NOT NULL,
    drug_id INT NULL,
    warehouse_id INT NULL,
    name VARCHAR(255) NOT NULL,
    quantity DECIMAL(12,3) NULL,
    dose VARCHAR(100) NULL,
    route VARCHAR(50) NULL,
    given_at DATETIME NULL,
    given_by INT NULL,
    manufacturer VARCHAR(150) NULL,
    catalog_no VARCHAR(100) NULL,
    lot_number VARCHAR(100) NULL,
    serial_number VARCHAR(100) NULL,
    expires_date DATE NULL,
    size VARCHAR(50) NULL,
    body_site VARCHAR(150) NULL,
    notes VARCHAR(500) NULL,
    created_at DATETIME NOT NULL,
    created_by INT NULL,
    voided_at DATETIME NULL,
    voided_by INT NULL,
    void_reason VARCHAR(255) NULL,
    INDEX idx_oci_case (case_id, kind),
    INDEX idx_oci_drug (drug_id),
    CONSTRAINT fk_oci_case FOREIGN KEY (case_id) REFERENCES or_surgical_cases (id) ON DELETE CASCADE,
    CONSTRAINT fk_oci_drug FOREIGN KEY (drug_id) REFERENCES drugs (id),
    CONSTRAINT fk_oci_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS or_case_item_lots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    lot_id INT NOT NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit_cost DECIMAL(12,4) NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_ocil_item (item_id),
    INDEX idx_ocil_lot (lot_id),
    CONSTRAINT fk_ocil_item FOREIGN KEY (item_id) REFERENCES or_case_items (id) ON DELETE CASCADE,
    CONSTRAINT fk_ocil_lot FOREIGN KEY (lot_id) REFERENCES drug_inventory_lots (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS or_case_specimens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT UNSIGNED NOT NULL,
    specimen_type VARCHAR(40) NOT NULL,
    description VARCHAR(255) NOT NULL,
    body_site VARCHAR(150) NULL,
    container_count SMALLINT NOT NULL DEFAULT 1,
    sent_to VARCHAR(150) NULL,
    collected_at DATETIME NULL,
    notes VARCHAR(500) NULL,
    created_at DATETIME NOT NULL,
    created_by INT NULL,
    removed_at DATETIME NULL,
    removed_by INT NULL,
    INDEX idx_ocsp_case (case_id),
    CONSTRAINT fk_ocsp_case FOREIGN KEY (case_id) REFERENCES or_surgical_cases (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE or_surgical_cases
    ADD COLUMN IF NOT EXISTS anesthesia_start_time DATETIME NULL AFTER actual_in_room_time,
    ADD COLUMN IF NOT EXISTS anesthesia_end_time DATETIME NULL AFTER actual_closing_time,
    ADD COLUMN IF NOT EXISTS urine_output_ml INT NULL AFTER estimated_blood_loss_ml,
    ADD COLUMN IF NOT EXISTS procedure_performed VARCHAR(255) NULL AFTER procedure_name,
    ADD COLUMN IF NOT EXISTS count_issue TINYINT(1) NOT NULL DEFAULT 0 AFTER safety_checklist_id,
    ADD COLUMN IF NOT EXISTS revision INT NOT NULL DEFAULT 0;

-- Stage history for cases already past Scheduled (from their milestone times).
INSERT INTO or_case_stages (case_id, stage, from_stage, stage_at, user_id, notes)
SELECT c.id, 'In Room / Induction', NULL, c.actual_in_room_time, NULL, 'Recorded before stage tracking'
FROM or_surgical_cases c
WHERE c.actual_in_room_time IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM or_case_stages s WHERE s.case_id = c.id);

INSERT INTO or_case_stages (case_id, stage, from_stage, stage_at, user_id, notes)
SELECT c.id, 'Incision / In Progress', 'In Room / Induction', c.actual_incision_time, NULL, 'Recorded before stage tracking'
FROM or_surgical_cases c
WHERE c.actual_incision_time IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM or_case_stages s WHERE s.case_id = c.id AND s.stage = 'Incision / In Progress');

INSERT INTO or_case_stages (case_id, stage, from_stage, stage_at, user_id, notes)
SELECT c.id, 'Closing / Extubation', 'Incision / In Progress', c.actual_closing_time, NULL, 'Recorded before stage tracking'
FROM or_surgical_cases c
WHERE c.actual_closing_time IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM or_case_stages s WHERE s.case_id = c.id AND s.stage = 'Closing / Extubation');

INSERT INTO or_case_stages (case_id, stage, from_stage, stage_at, user_id, notes)
SELECT c.id, 'In PACU', 'Closing / Extubation', c.actual_out_room_time, NULL, 'Recorded before stage tracking'
FROM or_surgical_cases c
WHERE c.actual_out_room_time IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM or_case_stages s WHERE s.case_id = c.id AND s.stage = 'In PACU');

-- Medicine ledger backfill for OR use (the same rows OrIntraopService writes;
-- the unique (source_type, source_id, movement_type) key skips existing ones).
INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, counterparty, notes, source_type, source_id, created_at, created_by)
SELECT DATE(il.created_at), l.drug_id, il.lot_id, l.warehouse_id, 'dispensed', -il.quantity, COALESCE(il.unit_cost, 0), c.case_number, c.patient_name,
       CONCAT('Used in surgery: ', c.procedure_name), 'or_case_item_lots', il.id, il.created_at, i.created_by
FROM or_case_item_lots il
JOIN or_case_items i ON i.id = il.item_id
JOIN or_surgical_cases c ON c.id = i.case_id
JOIN drug_inventory_lots l ON l.id = il.lot_id;

INSERT IGNORE INTO drug_stock_movements
    (movement_date, drug_id, lot_id, warehouse_id, movement_type, quantity, unit_cost, reference_no, counterparty, reason, source_type, source_id, created_at, created_by)
SELECT DATE(i.voided_at), l.drug_id, il.lot_id, l.warehouse_id, 'dispense_voided', il.quantity, COALESCE(il.unit_cost, 0), c.case_number, c.patient_name,
       i.void_reason, 'or_case_item_lots', il.id, i.voided_at, i.voided_by
FROM or_case_item_lots il
JOIN or_case_items i ON i.id = il.item_id AND i.voided_at IS NOT NULL
JOIN or_surgical_cases c ON c.id = i.case_id
JOIN drug_inventory_lots l ON l.id = il.lot_id;
