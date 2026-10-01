-- ========================================================
-- Migration: 217_supplier_products.sql
-- Module: Pharmacy > Supplier Prices
-- Purpose: "Where to buy" price list -- which supplier sells which
--          catalog item, at what price, and any discount on it.
--            * price_basis: the price is per dispensing unit ('unit',
--              e.g. per tablet) or per package ('package', e.g. per
--              box -- uses drugs.package_quantity to get a unit price)
--            * discount_*: optional % or fixed-peso discount with an
--              optional label, validity window and minimum quantity
--          One listing per supplier + item (whatever its price basis)
--          is enforced in SupplierProductService (soft deletes rule out
--          a plain UNIQUE key).
-- ========================================================

CREATE TABLE IF NOT EXISTS supplier_products (

    id INT NOT NULL AUTO_INCREMENT,

    supplier_id INT NOT NULL,

    drug_id INT NOT NULL,

    supplier_item_code VARCHAR(100) NULL,

    price_basis VARCHAR(10) NOT NULL DEFAULT 'unit',

    price DECIMAL(12,2) NOT NULL,

    min_order_qty DECIMAL(12,3) NULL,

    price_as_of DATE NULL,

    discount_type VARCHAR(10) NOT NULL DEFAULT 'none',

    discount_value DECIMAL(12,2) NULL,

    discount_label VARCHAR(100) NULL,

    discount_starts DATE NULL,

    discount_ends DATE NULL,

    discount_min_qty DECIMAL(12,3) NULL,

    notes VARCHAR(255) NULL,

    is_active TINYINT(1) NOT NULL DEFAULT 1,

    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    deleted_at DATETIME NULL,
    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_sp_supplier (supplier_id),
    INDEX idx_sp_drug (drug_id),
    INDEX idx_sp_discount_ends (discount_ends),

    CONSTRAINT fk_sp_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION,

    CONSTRAINT fk_sp_drug
        FOREIGN KEY (drug_id) REFERENCES drugs(id)
        ON UPDATE NO ACTION ON DELETE NO ACTION

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
