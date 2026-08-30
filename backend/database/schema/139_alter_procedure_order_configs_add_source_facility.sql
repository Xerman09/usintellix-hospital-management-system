-- =============================================
-- Alter procedure_order_configs: track which lab/vendor facility a
-- Procedure Order row was bulk-imported from via "Load Lab Compendium".
-- Manually-created rows simply leave this null.
-- =============================================

ALTER TABLE procedure_order_configs

ADD COLUMN source_facility_id INT NULL AFTER parent_id,

ADD INDEX idx_procedure_order_configs_source_facility (source_facility_id),

ADD CONSTRAINT fk_procedure_order_configs_source_facility
    FOREIGN KEY (source_facility_id)
    REFERENCES facilities(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;
