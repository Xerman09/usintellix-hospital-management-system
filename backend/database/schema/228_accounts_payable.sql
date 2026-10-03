-- ========================================================
-- Migration: 228_accounts_payable.sql
-- Module: Pharmacy > Accounts Payable (Phase 2 of procure-to-pay)
-- Purpose: What the hospital owes suppliers, and paying it.
--            * supplier_invoices: once approved, an invoice is owed.
--              amount_paid is what's been settled so far (cash paid +
--              tax withheld), payment_status unpaid / partially_paid /
--              paid, paid_at when fully settled. The due date is filled
--              in on approval from the payment terms when left blank.
--            * supplier_payments: one payment to one supplier
--              (PV-YYYY-NNNNN payment voucher) by check, bank transfer,
--              cash or other, possibly settling several invoices and
--              withholding expanded withholding tax (EWT). A payment
--              entered by mistake is voided, never deleted.
--            * supplier_payment_allocations: how much of a payment went
--              to each invoice -- amount_applied reduces the invoice's
--              balance; ewt_amount is the part of it withheld for BIR
--              instead of paid in cash.
-- ========================================================

ALTER TABLE supplier_invoices
    ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER total,
    ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NULL AFTER amount_paid,
    ADD COLUMN IF NOT EXISTS paid_at DATETIME NULL AFTER payment_status;

CREATE INDEX IF NOT EXISTS idx_si_payment_status ON supplier_invoices (payment_status);
CREATE INDEX IF NOT EXISTS idx_si_due_date ON supplier_invoices (due_date);

-- Invoices approved before payables existed: owed from their invoice date.
UPDATE supplier_invoices
SET payment_status = 'unpaid', due_date = COALESCE(due_date, invoice_date)
WHERE status = 'approved' AND payment_status IS NULL;

CREATE TABLE IF NOT EXISTS supplier_payments (

    id INT NOT NULL AUTO_INCREMENT,

    pv_number VARCHAR(30) NULL,

    supplier_id INT NOT NULL,

    payment_date DATE NOT NULL,

    method VARCHAR(20) NOT NULL,

    reference_no VARCHAR(100) NULL,

    check_date DATE NULL,

    paid_from VARCHAR(150) NULL,

    ewt_rate DECIMAL(5,2) NOT NULL DEFAULT 0,

    total_applied DECIMAL(12,2) NOT NULL DEFAULT 0,

    ewt_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,

    notes TEXT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'posted',

    voided_at DATETIME NULL,

    voided_by INT NULL,

    void_reason VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_spay_pv_number UNIQUE (pv_number),

    INDEX idx_sp_supplier (supplier_id),

    INDEX idx_sp_payment_date (payment_date),

    INDEX idx_sp_status (status),

    CONSTRAINT fk_spay_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_payment_allocations (

    id INT NOT NULL AUTO_INCREMENT,

    supplier_payment_id INT NOT NULL,

    supplier_invoice_id INT NOT NULL,

    amount_applied DECIMAL(12,2) NOT NULL,

    ewt_rate DECIMAL(5,2) NOT NULL DEFAULT 0,

    ewt_base DECIMAL(12,2) NOT NULL DEFAULT 0,

    ewt_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_spa_payment (supplier_payment_id),

    INDEX idx_spa_invoice (supplier_invoice_id),

    CONSTRAINT fk_spay_alloc_payment
        FOREIGN KEY (supplier_payment_id) REFERENCES supplier_payments(id)
        ON UPDATE NO ACTION ON DELETE CASCADE,

    CONSTRAINT fk_spay_alloc_invoice
        FOREIGN KEY (supplier_invoice_id) REFERENCES supplier_invoices(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
