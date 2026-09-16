-- =============================================
-- Alter: drugs
-- Adds the rest of the real "Add Drug" form's fields (Allow flags,
-- RXCUI, On Order, Min/Max stock Limits, Route) that the first pass of
-- Drug Inventory didn't capture yet. Name/NDC/Form/Size/Unit/Active/
-- Consumable already existed from 165_drugs.sql.
-- =============================================

ALTER TABLE drugs
    ADD COLUMN allow_inventory TINYINT(1) NOT NULL DEFAULT 1 AFTER is_consumable,
    ADD COLUMN allow_multiple_lots TINYINT(1) NOT NULL DEFAULT 1 AFTER allow_inventory,
    ADD COLUMN allow_combining_lots TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_multiple_lots,
    ADD COLUMN rxcui VARCHAR(50) NULL AFTER ndc,
    ADD COLUMN route VARCHAR(50) NULL AFTER unit,
    ADD COLUMN on_order DECIMAL(12,3) NOT NULL DEFAULT 0 AFTER route,
    ADD COLUMN min_level_global DECIMAL(12,3) NOT NULL DEFAULT 0 AFTER on_order,
    ADD COLUMN max_level_global DECIMAL(12,3) NOT NULL DEFAULT 0 AFTER min_level_global,
    ADD COLUMN min_level_onsite DECIMAL(12,3) NOT NULL DEFAULT 0 AFTER max_level_global,
    ADD COLUMN max_level_onsite DECIMAL(12,3) NOT NULL DEFAULT 0 AFTER min_level_onsite;
