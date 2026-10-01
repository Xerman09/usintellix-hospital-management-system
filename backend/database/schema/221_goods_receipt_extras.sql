-- ========================================================
-- Migration: 221_goods_receipt_extras.sql
-- Module: Pharmacy > Receiving
-- Purpose: Deliveries that don't match the purchase order exactly.
--            * Items not on the order: goods_receipt_items rows with
--              purchase_order_item_id NULL. Their unit (unit/package)
--              and package size are stored on the row itself, since
--              there is no order line to read them from. The order's
--              own lines are left unchanged.
--            * More than ordered: over_quantity is the part of a row
--              beyond what was still outstanding on its order line
--              when it was received (0 when within the order). The
--              order line's quantity_received may then exceed its
--              quantity.
-- ========================================================

ALTER TABLE goods_receipt_items
    MODIFY purchase_order_item_id INT NULL;

ALTER TABLE goods_receipt_items
    ADD COLUMN IF NOT EXISTS order_unit VARCHAR(10) NULL AFTER drug_id,
    ADD COLUMN IF NOT EXISTS units_per_package DECIMAL(12,3) NULL AFTER order_unit,
    ADD COLUMN IF NOT EXISTS over_quantity DECIMAL(12,3) NOT NULL DEFAULT 0 AFTER base_quantity;

-- Rows saved before this migration were all order lines: copy the unit across.
UPDATE goods_receipt_items gri
JOIN purchase_order_items poi ON poi.id = gri.purchase_order_item_id
SET gri.order_unit = poi.order_unit, gri.units_per_package = poi.units_per_package
WHERE gri.order_unit IS NULL;
