-- =============================================
-- Table: batch_payments
-- A single lump-sum payment received (an insurance check/EFT, a patient
-- payment batch, etc.) entered once on the Payments > New Payment screen,
-- then split across one or more patients'/encounters' balances via
-- batch_payment_allocations. distributed_to_global holds any portion
-- deliberately left unassigned to a specific patient for now (OpenEMR's
-- "Distributed to Global" bucket); the remaining "Undistributed" amount
-- is always derived (payment_amount - distributed_to_global - SUM of
-- allocations), never stored, so it can't drift out of sync.
-- =============================================

CREATE TABLE IF NOT EXISTS batch_payments (

    id INT NOT NULL AUTO_INCREMENT,

    payment_date DATE NOT NULL,

    post_to_date DATE NOT NULL,

    payment_method VARCHAR(50) NOT NULL DEFAULT 'check',

    check_number VARCHAR(100) NULL,

    payment_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    paying_entity ENUM('insurance', 'patient', 'other') NOT NULL DEFAULT 'insurance',

    payment_category VARCHAR(100) NULL,

    payment_from VARCHAR(255) NULL,

    payor_id VARCHAR(100) NULL,

    deposit_date DATE NULL,

    description TEXT NULL,

    distributed_to_global DECIMAL(12,2) NOT NULL DEFAULT 0,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_batch_payments_payment_date (payment_date),

    INDEX idx_batch_payments_created_by (created_by),

    INDEX idx_batch_payments_updated_by (updated_by),

    INDEX idx_batch_payments_deleted_by (deleted_by)

) ENGINE = InnoDB;
