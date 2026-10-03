-- =============================================
-- Seed: approval limits
-- Default amount limits for purchase orders, supplier invoices and
-- supplier payments (General Settings > Approval Limits): above
-- PHP 100,000 an administrator must also approve.
--
-- Idempotent: INSERT IGNORE on the UNIQUE document_type, so a re-run
-- never overwrites limits an administrator has already changed.
-- =============================================

INSERT IGNORE INTO approval_limits (document_type, is_enabled, limit_amount, created_at) VALUES
('purchase_order', 1, 100000.00, NOW()),
('supplier_invoice', 1, 100000.00, NOW()),
('supplier_payment', 1, 100000.00, NOW());
