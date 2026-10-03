-- ========================================================
-- Migration: 232_procurement_controls.sql
-- Module: Pharmacy (Phase 6 of procure-to-pay: controls)
-- Purpose: Approval limits by amount.
--            * approval_limits: one row per document type
--              (purchase_order / supplier_invoice / supplier_payment).
--              When enabled, a document above limit_amount also needs
--              an administrator: an accountant's approval is recorded
--              as the first approval and an administrator gives the
--              final one (an administrator alone covers both).
--              Default rows: backend/database/seed/031_seed_approval_limits.sql
--            * purchase_orders / supplier_invoices: first_approved_* is
--              the accountant's approval of a document above the limit,
--              while it waits for an administrator.
--            * supplier_payments: a payment above the limit recorded by
--              an accountant is 'pending_approval' -- its amounts are
--              held against the invoices but not paid off until an
--              administrator approves it ('posted') or rejects it
--              ('rejected', nothing applied).
-- ========================================================

CREATE TABLE IF NOT EXISTS approval_limits (

    id INT NOT NULL AUTO_INCREMENT,

    document_type VARCHAR(30) NOT NULL,

    is_enabled TINYINT(1) NOT NULL DEFAULT 1,

    limit_amount DECIMAL(14,2) NOT NULL DEFAULT 0,

    created_at DATETIME NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_alimit_document_type UNIQUE (document_type)

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS first_approved_at DATETIME NULL AFTER submitted_by,
    ADD COLUMN IF NOT EXISTS first_approved_by INT NULL AFTER first_approved_at,
    ADD COLUMN IF NOT EXISTS first_approval_notes VARCHAR(255) NULL AFTER first_approved_by;

ALTER TABLE supplier_invoices
    ADD COLUMN IF NOT EXISTS first_approved_at DATETIME NULL AFTER submitted_by,
    ADD COLUMN IF NOT EXISTS first_approved_by INT NULL AFTER first_approved_at,
    ADD COLUMN IF NOT EXISTS first_approval_notes VARCHAR(500) NULL AFTER first_approved_by;

ALTER TABLE supplier_payments
    ADD COLUMN IF NOT EXISTS approved_at DATETIME NULL AFTER status,
    ADD COLUMN IF NOT EXISTS approved_by INT NULL AFTER approved_at,
    ADD COLUMN IF NOT EXISTS approval_notes VARCHAR(500) NULL AFTER approved_by,
    ADD COLUMN IF NOT EXISTS rejected_at DATETIME NULL AFTER approval_notes,
    ADD COLUMN IF NOT EXISTS rejected_by INT NULL AFTER rejected_at,
    ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(255) NULL AFTER rejected_by;

CREATE INDEX IF NOT EXISTS idx_sp_status ON supplier_payments (status);
