-- =============================================
-- Table: patient_procedure_orders
-- A real lab/procedure order placed for a specific patient, referencing
-- a "Procedure Order" tier catalog item from procedure_order_configs.
-- This is the operational counterpart to that catalog: the catalog
-- defines WHAT can be ordered, this table records that it WAS ordered
-- for someone.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_procedure_orders (

    id INT NOT NULL AUTO_INCREMENT,

    patient_id INT NOT NULL,

    procedure_order_config_id INT NOT NULL,

    provider_id INT NULL,

    vendor_facility_id INT NULL,

    order_date DATE NOT NULL,

    ext_time_collected DATETIME NULL,

    specimen VARCHAR(100) NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending',

    reported_at DATETIME NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_patient_procedure_orders_patient (patient_id),

    INDEX idx_patient_procedure_orders_config (procedure_order_config_id),

    INDEX idx_patient_procedure_orders_provider (provider_id),

    INDEX idx_patient_procedure_orders_vendor (vendor_facility_id),

    INDEX idx_patient_procedure_orders_created_by (created_by),

    INDEX idx_patient_procedure_orders_updated_by (updated_by),

    INDEX idx_patient_procedure_orders_deleted_by (deleted_by),

    CONSTRAINT fk_patient_procedure_orders_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_patient_procedure_orders_config
        FOREIGN KEY (procedure_order_config_id)
        REFERENCES procedure_order_configs(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_patient_procedure_orders_provider
        FOREIGN KEY (provider_id)
        REFERENCES providers(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_patient_procedure_orders_vendor
        FOREIGN KEY (vendor_facility_id)
        REFERENCES facilities(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
