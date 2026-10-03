-- ========================================================
-- Migration: 230_purchase_requisitions.sql
-- Module: Pharmacy > Purchase Requisitions (Phase 4 of procure-to-pay)
-- Purpose: Departments and wards ask for what they need; purchasing
--          turns approved requests into purchase orders.
--            * purchase_requisitions: one request from one department
--              (PR-YYYY-NNNNN) -- what for, when it's needed, where it
--              should be delivered. draft -> submitted -> approved |
--              rejected (editable, resubmit); cancelled; closed when
--              the rest won't be ordered. How much has been ordered /
--              received is worked out from the linked purchase orders.
--            * purchase_requisition_items: the items asked for, in units
--              or packages (base_quantity = dispensing units).
--            * purchase_order_item_sources: which request lines each
--              purchase order line covers, and how much of each (in
--              dispensing units). One PO line can combine several
--              requests for the same item; a request line can be split
--              across orders. Removed with its PO line.
-- ========================================================

CREATE TABLE IF NOT EXISTS purchase_requisitions (

    id INT NOT NULL AUTO_INCREMENT,

    pr_number VARCHAR(30) NULL,

    department_id INT NOT NULL,

    warehouse_id INT NULL,

    needed_by DATE NULL,

    priority VARCHAR(10) NOT NULL DEFAULT 'normal',

    reason TEXT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'draft',

    submitted_at DATETIME NULL,

    submitted_by INT NULL,

    approved_at DATETIME NULL,

    approved_by INT NULL,

    approval_notes VARCHAR(500) NULL,

    rejected_at DATETIME NULL,

    rejected_by INT NULL,

    rejection_reason VARCHAR(255) NULL,

    cancelled_at DATETIME NULL,

    cancelled_by INT NULL,

    cancel_reason VARCHAR(255) NULL,

    closed_at DATETIME NULL,

    closed_by INT NULL,

    close_reason VARCHAR(255) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    CONSTRAINT uq_preq_pr_number UNIQUE (pr_number),

    INDEX idx_preq_department (department_id),

    INDEX idx_preq_status (status),

    CONSTRAINT fk_preq_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_preq_warehouse
        FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_requisition_items (

    id INT NOT NULL AUTO_INCREMENT,

    purchase_requisition_id INT NOT NULL,

    line_no INT NOT NULL DEFAULT 1,

    drug_id INT NOT NULL,

    order_unit VARCHAR(10) NOT NULL DEFAULT 'unit',

    units_per_package DECIMAL(12,3) NULL,

    quantity DECIMAL(12,3) NOT NULL,

    base_quantity DECIMAL(12,3) NOT NULL,

    notes VARCHAR(255) NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_preqi_requisition (purchase_requisition_id),

    INDEX idx_preqi_drug (drug_id),

    CONSTRAINT fk_preqi_requisition
        FOREIGN KEY (purchase_requisition_id) REFERENCES purchase_requisitions(id)
        ON UPDATE NO ACTION ON DELETE CASCADE,

    CONSTRAINT fk_preqi_drug
        FOREIGN KEY (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_requisition_history (

    id INT NOT NULL AUTO_INCREMENT,

    purchase_requisition_id INT NOT NULL,

    action VARCHAR(30) NOT NULL,

    notes VARCHAR(500) NULL,

    user_id INT NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_preqh_requisition (purchase_requisition_id),

    CONSTRAINT fk_preqh_requisition
        FOREIGN KEY (purchase_requisition_id) REFERENCES purchase_requisitions(id)
        ON UPDATE NO ACTION ON DELETE CASCADE

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE IF NOT EXISTS purchase_order_item_sources (

    id INT NOT NULL AUTO_INCREMENT,

    purchase_order_item_id INT NOT NULL,

    requisition_item_id INT NOT NULL,

    base_quantity DECIMAL(12,3) NOT NULL,

    created_at DATETIME NULL,

    PRIMARY KEY (id),

    INDEX idx_pois_po_item (purchase_order_item_id),

    INDEX idx_pois_req_item (requisition_item_id),

    CONSTRAINT fk_pois_po_item
        FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id)
        ON UPDATE NO ACTION ON DELETE CASCADE,

    CONSTRAINT fk_pois_req_item
        FOREIGN KEY (requisition_item_id) REFERENCES purchase_requisition_items(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
