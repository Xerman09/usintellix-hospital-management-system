-- =============================================
-- Table: patient_procedure_results
-- One or more manually-entered result lines ("Results and
-- Recommendations") recorded against a patient_procedure_orders row,
-- since this app has no automated electronic lab feed.
-- =============================================

CREATE TABLE IF NOT EXISTS patient_procedure_results (

    id INT NOT NULL AUTO_INCREMENT,

    patient_procedure_order_id INT NOT NULL,

    code VARCHAR(100) NULL,

    name VARCHAR(255) NOT NULL,

    result_date DATE NULL,

    end_date DATE NULL,

    is_abnormal TINYINT(1) NOT NULL DEFAULT 0,

    value VARCHAR(100) NULL,

    units VARCHAR(50) NULL,

    reference_range VARCHAR(100) NULL,

    created_at DATETIME NULL,

    created_by INT NULL,

    updated_at DATETIME NULL,

    updated_by INT NULL,

    deleted_at DATETIME NULL,

    deleted_by INT NULL,

    PRIMARY KEY (id),

    INDEX idx_patient_procedure_results_order (patient_procedure_order_id),

    INDEX idx_patient_procedure_results_created_by (created_by),

    INDEX idx_patient_procedure_results_updated_by (updated_by),

    INDEX idx_patient_procedure_results_deleted_by (deleted_by),

    CONSTRAINT fk_patient_procedure_results_order
        FOREIGN KEY (patient_procedure_order_id)
        REFERENCES patient_procedure_orders(id)
        ON UPDATE CASCADE
        ON DELETE CASCADE

) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
