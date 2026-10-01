-- ========================================================
-- Migration: 219_purchase_order_approval.sql
-- Module: Pharmacy > Purchase Orders
-- Purpose: Approval step before an order goes to the supplier.
--          purchase_orders.status is now one of:
--            draft             being prepared, editable
--            pending_approval  submitted, waiting for an approver
--            approved          approved -- OK to send to the supplier
--            rejected          sent back with a reason; editable and
--                              can be submitted again
--            cancelled         called off (reason kept)
--          Approvers are admins, and nobody can approve an order they
--          created or submitted (PurchaseOrderService).
--            * approved_* / rejected_* columns: the latest decision
--            * purchase_order_history: every step (created, submitted,
--              approved, rejected, cancelled) with who, when and notes
--          Orders that were "submitted" before this step existed are
--          moved to pending_approval so they get approved too.
-- ========================================================

ALTER TABLE purchase_orders
    ADD COLUMN IF NOT EXISTS approved_at DATETIME NULL AFTER submitted_by,
    ADD COLUMN IF NOT EXISTS approved_by INT NULL AFTER approved_at,
    ADD COLUMN IF NOT EXISTS approval_notes VARCHAR(255) NULL AFTER approved_by,
    ADD COLUMN IF NOT EXISTS rejected_at DATETIME NULL AFTER approval_notes,
    ADD COLUMN IF NOT EXISTS rejected_by INT NULL AFTER rejected_at,
    ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(255) NULL AFTER rejected_by;


CREATE TABLE IF NOT EXISTS purchase_order_history (

    id INT NOT NULL AUTO_INCREMENT,

    purchase_order_id INT NOT NULL,

    -- created, submitted, resubmitted, approved, rejected, cancelled
    action VARCHAR(20) NOT NULL,

    notes VARCHAR(255) NULL,

    user_id INT NULL,

    created_at DATETIME NOT NULL,

    PRIMARY KEY (id),

    INDEX idx_poh_order (purchase_order_id),

    CONSTRAINT fk_poh_order
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
        ON UPDATE NO ACTION ON DELETE CASCADE

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;


-- History for orders made before this migration (only if they have none).
INSERT INTO purchase_order_history (purchase_order_id, action, notes, user_id, created_at)
SELECT po.id, 'created', NULL, po.created_by, COALESCE(po.created_at, NOW())
FROM purchase_orders po
WHERE NOT EXISTS (SELECT 1 FROM purchase_order_history h WHERE h.purchase_order_id = po.id);

INSERT INTO purchase_order_history (purchase_order_id, action, notes, user_id, created_at)
SELECT po.id, 'submitted', NULL, po.submitted_by, po.submitted_at
FROM purchase_orders po
WHERE po.status = 'submitted' AND po.submitted_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM purchase_order_history h WHERE h.purchase_order_id = po.id AND h.action = 'submitted');

INSERT INTO purchase_order_history (purchase_order_id, action, notes, user_id, created_at)
SELECT po.id, 'cancelled', po.cancel_reason, po.cancelled_by, po.cancelled_at
FROM purchase_orders po
WHERE po.status = 'cancelled' AND po.cancelled_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM purchase_order_history h WHERE h.purchase_order_id = po.id AND h.action = 'cancelled');

UPDATE purchase_orders SET status = 'pending_approval' WHERE status = 'submitted';
