-- =============================================
-- Alter: encounters
-- Adds claim-level Bill/X12 status tracking for the Billing Manager
-- screen ("Mark as Cleared" / "Re-Open" acts on bill_status; the X12
-- dropdown is a manually-set status label since this app has no real
-- clearinghouse/EDI integration to drive it automatically).
-- =============================================

ALTER TABLE encounters
    ADD COLUMN bill_status ENUM('unassigned', 'cleared') NOT NULL DEFAULT 'unassigned' AFTER billing_note,
    ADD COLUMN billed_at DATETIME NULL AFTER bill_status,
    ADD COLUMN billed_by INT NULL AFTER billed_at,
    ADD COLUMN x12_status ENUM('unassigned', 'sent', 'accepted', 'rejected') NOT NULL DEFAULT 'unassigned' AFTER billed_by;
