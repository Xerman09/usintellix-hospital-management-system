-- =============================================
-- Table: batch_payment_allocations
-- One slice of a batch_payments row applied to a specific patient (and
-- optionally a specific encounter). Each allocation also creates a
-- matching patient_ledger_payments row (ledger_payment_id) so the
-- existing Ledger / Fee Sheet / Billing Manager screens all see the
-- money without any of them needing to know batch payments exist --
-- this table is purely the "which batch did this ledger payment come
-- from, and how much of the batch is left" bookkeeping layer on top.
-- =============================================

CREATE TABLE IF NOT EXISTS batch_payment_allocations (

    id INT NOT NULL AUTO_INCREMENT,

    batch_payment_id INT NOT NULL,

    patient_id INT NOT NULL,

    encounter_id INT NULL,

    payment_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    adjustment_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    notes VARCHAR(255) NULL,

    ledger_payment_id INT NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_bpa_batch (batch_payment_id),

    INDEX idx_bpa_patient (patient_id),

    INDEX idx_bpa_encounter (encounter_id),

    INDEX idx_bpa_ledger_payment (ledger_payment_id),

    INDEX idx_bpa_created_by (created_by),

    INDEX idx_bpa_deleted_by (deleted_by),

    CONSTRAINT fk_bpa_batch
        FOREIGN KEY (batch_payment_id)
        REFERENCES batch_payments(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_bpa_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_bpa_encounter
        FOREIGN KEY (encounter_id)
        REFERENCES encounters(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,

    CONSTRAINT fk_bpa_ledger_payment
        FOREIGN KEY (ledger_payment_id)
        REFERENCES patient_ledger_payments(id)
        ON UPDATE NO ACTION
        ON DELETE NO ACTION

) ENGINE = InnoDB;
