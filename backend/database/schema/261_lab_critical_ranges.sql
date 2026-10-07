-- Critical lab values (Critical lab values, Phase 1).
--
--  - lab_result_ranges: per lab test (result analyte), set up by an admin: the normal range
--    and the critical low / high limits, in the test's units; for text results, the values
--    that are critical (e.g. "positive, reactive") and the ones that are normal. A result is
--    matched by its code, its name or one of the aliases (case-insensitive).
--  - patient_procedure_results gains the flag worked out when the result is saved or
--    imported: normal / abnormal / critical, with why (flag_detail) and the range used.
--    is_abnormal stays in step (1 for abnormal and critical).
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS lab_result_ranges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,                   -- e.g. Potassium
    code VARCHAR(100) NULL,                       -- result code (LOINC / lab code), e.g. 2823-3
    aliases VARCHAR(255) NULL,                    -- other names results come in as: "K, Serum potassium"
    units VARCHAR(50) NOT NULL DEFAULT '',        -- the units the limits are in ('' = any)
    normal_low DECIMAL(14,4) NULL,
    normal_high DECIMAL(14,4) NULL,
    critical_low DECIMAL(14,4) NULL,              -- critical when below this
    critical_high DECIMAL(14,4) NULL,             -- critical when above this
    critical_values VARCHAR(255) NULL,            -- text results that are critical: "positive, reactive, detected"
    normal_values VARCHAR(255) NULL,              -- text results that are normal: "negative, non-reactive"
    notes VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NULL,
    created_by INT NULL,
    updated_at DATETIME NULL,
    updated_by INT NULL,
    UNIQUE KEY uq_lrr_name_units (name, units),
    KEY idx_lrr_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE patient_procedure_results
    ADD COLUMN IF NOT EXISTS flag VARCHAR(10) NULL AFTER is_abnormal,       -- normal | abnormal | critical
    ADD COLUMN IF NOT EXISTS flag_detail VARCHAR(150) NULL AFTER flag,     -- e.g. "Critical high (above 6.5)"
    ADD COLUMN IF NOT EXISTS range_id INT NULL AFTER flag_detail;

CREATE INDEX IF NOT EXISTS idx_ppr_flag ON patient_procedure_results (flag);
