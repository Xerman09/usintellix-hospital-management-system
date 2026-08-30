-- =============================================
-- Alter procedure_order_configs: replace the free-text category/code/tier
-- fields with a proper "Procedure Tier" model matching OpenEMR's
-- Configure Orders and Results screen (Group, Procedure Order,
-- Discrete Result, Recommendation, Custom Favorite Group,
-- Custom Favorite Item), plus the tier-specific detail fields.
-- =============================================

ALTER TABLE procedure_order_configs

DROP COLUMN category,
DROP COLUMN code,
DROP COLUMN tier,

ADD COLUMN procedure_tier VARCHAR(30) NOT NULL DEFAULT 'group' AFTER parent_id,
ADD COLUMN sequence INT NOT NULL DEFAULT 0 AFTER description,
ADD COLUMN order_test_type VARCHAR(30) NULL AFTER sequence,
ADD COLUMN order_from VARCHAR(100) NULL AFTER order_test_type,
ADD COLUMN identifying_code VARCHAR(100) NULL AFTER order_from,
ADD COLUMN standard_code VARCHAR(100) NULL AFTER identifying_code,
ADD COLUMN body_site VARCHAR(100) NULL AFTER standard_code,
ADD COLUMN specimen_type VARCHAR(100) NULL AFTER body_site,
ADD COLUMN administer_via VARCHAR(100) NULL AFTER specimen_type,
ADD COLUMN laterality VARCHAR(100) NULL AFTER administer_via,
ADD COLUMN default_units VARCHAR(50) NULL AFTER laterality,
ADD COLUMN default_range VARCHAR(255) NULL AFTER default_units;
