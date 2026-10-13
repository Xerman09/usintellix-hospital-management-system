-- Seed: lab result items
-- The discrete results (analytes) of the starter lab tests from 039_seed_lab_tests.sql -- e.g. the CBC's WBC count,
-- hemoglobin, platelets ... -- with their usual units and adult reference range, as "Discrete Result" rows under each
-- test. The lab's result entry screen lists them (module 14, Phase 2). Names match the critical lab ranges
-- (037_seed_lab_critical_ranges.sql) so results are flagged. Each lab should check the ranges against its own analyzers.
-- Idempotent: INSERT ... SELECT ... WHERE NOT EXISTS on the name under its test (tests found by their identifying code).

SET NAMES utf8mb4;

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'CBC' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'WBC count' AS name, 10 AS sequence, 'x10^9/L' AS default_units, '4.5-11.0' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'RBC count' AS name, 20 AS sequence, 'x10^12/L' AS default_units, '4.2-5.9' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Hemoglobin' AS name, 30 AS sequence, 'g/dL' AS default_units, '12.0-17.5' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Hematocrit' AS name, 40 AS sequence, '%' AS default_units, '36-52' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'MCV' AS name, 50 AS sequence, 'fL' AS default_units, '80-100' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'MCH' AS name, 60 AS sequence, 'pg' AS default_units, '27-33' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'MCHC' AS name, 70 AS sequence, 'g/dL' AS default_units, '32-36' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Platelet count' AS name, 80 AS sequence, 'x10^9/L' AS default_units, '150-450' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Neutrophils' AS name, 90 AS sequence, '%' AS default_units, '40-75' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Lymphocytes' AS name, 100 AS sequence, '%' AS default_units, '20-45' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Monocytes' AS name, 110 AS sequence, '%' AS default_units, '2-10' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Eosinophils' AS name, 120 AS sequence, '%' AS default_units, '1-6' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Basophils' AS name, 130 AS sequence, '%' AS default_units, '0-1' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'ESR' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'ESR' AS name, 10 AS sequence, 'mm/h' AS default_units, '0-20' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'RETIC' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Reticulocyte count' AS name, 10 AS sequence, '%' AS default_units, '0.5-2.5' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'PBS' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Peripheral smear' AS name, 10 AS sequence, NULL AS default_units, NULL AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'MALARIA' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Malaria parasites' AS name, 10 AS sequence, NULL AS default_units, 'Not seen' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'HBA1C' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'HbA1c' AS name, 10 AS sequence, '%' AS default_units, '4.0-5.6' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'PTINR' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Prothrombin time' AS name, 10 AS sequence, 'seconds' AS default_units, '11.0-13.5' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'INR' AS name, 20 AS sequence, NULL AS default_units, '0.8-1.2' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'APTT' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'aPTT' AS name, 10 AS sequence, 'seconds' AS default_units, '25-35' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'DDIMER' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'D-dimer' AS name, 10 AS sequence, 'ng/mL FEU' AS default_units, '<500' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'FIBRIN' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Fibrinogen' AS name, 10 AS sequence, 'mg/dL' AS default_units, '200-400' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'BMP' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Sodium' AS name, 10 AS sequence, 'mmol/L' AS default_units, '135-145' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Potassium' AS name, 20 AS sequence, 'mmol/L' AS default_units, '3.5-5.1' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Chloride' AS name, 30 AS sequence, 'mmol/L' AS default_units, '98-107' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Bicarbonate' AS name, 40 AS sequence, 'mmol/L' AS default_units, '22-29' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'BUN' AS name, 50 AS sequence, 'mg/dL' AS default_units, '7-20' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Creatinine' AS name, 60 AS sequence, 'mg/dL' AS default_units, '0.6-1.3' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Glucose' AS name, 70 AS sequence, 'mg/dL' AS default_units, '70-110' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Calcium' AS name, 80 AS sequence, 'mg/dL' AS default_units, '8.5-10.5' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'CMP' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Sodium' AS name, 10 AS sequence, 'mmol/L' AS default_units, '135-145' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Potassium' AS name, 20 AS sequence, 'mmol/L' AS default_units, '3.5-5.1' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Chloride' AS name, 30 AS sequence, 'mmol/L' AS default_units, '98-107' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Bicarbonate' AS name, 40 AS sequence, 'mmol/L' AS default_units, '22-29' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'BUN' AS name, 50 AS sequence, 'mg/dL' AS default_units, '7-20' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Creatinine' AS name, 60 AS sequence, 'mg/dL' AS default_units, '0.6-1.3' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Glucose' AS name, 70 AS sequence, 'mg/dL' AS default_units, '70-110' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Calcium' AS name, 80 AS sequence, 'mg/dL' AS default_units, '8.5-10.5' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Total protein' AS name, 90 AS sequence, 'g/dL' AS default_units, '6.0-8.3' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Albumin' AS name, 100 AS sequence, 'g/dL' AS default_units, '3.5-5.0' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Total bilirubin' AS name, 110 AS sequence, 'mg/dL' AS default_units, '0.1-1.2' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'ALP' AS name, 120 AS sequence, 'U/L' AS default_units, '44-147' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'AST' AS name, 130 AS sequence, 'U/L' AS default_units, '10-40' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'ALT' AS name, 140 AS sequence, 'U/L' AS default_units, '7-56' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'LYTES' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Sodium' AS name, 10 AS sequence, 'mmol/L' AS default_units, '135-145' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Potassium' AS name, 20 AS sequence, 'mmol/L' AS default_units, '3.5-5.1' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Chloride' AS name, 30 AS sequence, 'mmol/L' AS default_units, '98-107' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'CREA' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Creatinine' AS name, 10 AS sequence, 'mg/dL' AS default_units, '0.6-1.3' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'BUN' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'BUN' AS name, 10 AS sequence, 'mg/dL' AS default_units, '7-20' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'LFT' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Total bilirubin' AS name, 10 AS sequence, 'mg/dL' AS default_units, '0.1-1.2' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Direct bilirubin' AS name, 20 AS sequence, 'mg/dL' AS default_units, '0.0-0.3' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'AST' AS name, 30 AS sequence, 'U/L' AS default_units, '10-40' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'ALT' AS name, 40 AS sequence, 'U/L' AS default_units, '7-56' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'ALP' AS name, 50 AS sequence, 'U/L' AS default_units, '44-147' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Total protein' AS name, 60 AS sequence, 'g/dL' AS default_units, '6.0-8.3' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Albumin' AS name, 70 AS sequence, 'g/dL' AS default_units, '3.5-5.0' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'ALB' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Albumin' AS name, 10 AS sequence, 'g/dL' AS default_units, '3.5-5.0' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'LIPID' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Total cholesterol' AS name, 10 AS sequence, 'mg/dL' AS default_units, '<200' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Triglycerides' AS name, 20 AS sequence, 'mg/dL' AS default_units, '<150' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'HDL cholesterol' AS name, 30 AS sequence, 'mg/dL' AS default_units, '>40' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'LDL cholesterol' AS name, 40 AS sequence, 'mg/dL' AS default_units, '<100' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'FBS' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Glucose' AS name, 10 AS sequence, 'mg/dL' AS default_units, '70-100' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'RBS' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Glucose' AS name, 10 AS sequence, 'mg/dL' AS default_units, '70-140' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'LACT' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Lactate' AS name, 10 AS sequence, 'mmol/L' AS default_units, '0.5-2.2' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'TROP' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Troponin I' AS name, 10 AS sequence, 'ng/mL' AS default_units, '<0.04' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'CKMB' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'CK-MB' AS name, 10 AS sequence, 'ng/mL' AS default_units, '0-5' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'BNP' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'NT-proBNP' AS name, 10 AS sequence, 'pg/mL' AS default_units, '<125' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'AMY' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Amylase' AS name, 10 AS sequence, 'U/L' AS default_units, '30-110' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'LIPA' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Lipase' AS name, 10 AS sequence, 'U/L' AS default_units, '0-160' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'MG' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Magnesium' AS name, 10 AS sequence, 'mg/dL' AS default_units, '1.7-2.2' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'CA' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Calcium' AS name, 10 AS sequence, 'mg/dL' AS default_units, '8.5-10.5' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'PHOS' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Phosphorus' AS name, 10 AS sequence, 'mg/dL' AS default_units, '2.5-4.5' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'URIC' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Uric acid' AS name, 10 AS sequence, 'mg/dL' AS default_units, '3.5-7.2' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'CRP' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'CRP' AS name, 10 AS sequence, 'mg/L' AS default_units, '<5' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'PCT' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Procalcitonin' AS name, 10 AS sequence, 'ng/mL' AS default_units, '<0.5' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'TSH' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'TSH' AS name, 10 AS sequence, 'mIU/L' AS default_units, '0.4-4.0' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'FT4' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Free T4' AS name, 10 AS sequence, 'ng/dL' AS default_units, '0.8-1.8' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'AMMON' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Ammonia' AS name, 10 AS sequence, 'umol/L' AS default_units, '15-45' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'BHCG' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'beta-hCG' AS name, 10 AS sequence, 'mIU/mL' AS default_units, '<5' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'ABG' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'pH (arterial)' AS name, 10 AS sequence, NULL AS default_units, '7.35-7.45' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'pCO2 (arterial)' AS name, 20 AS sequence, 'mmHg' AS default_units, '35-45' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'pO2 (arterial)' AS name, 30 AS sequence, 'mmHg' AS default_units, '80-100' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Bicarbonate' AS name, 40 AS sequence, 'mmol/L' AS default_units, '22-26' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Base excess' AS name, 50 AS sequence, 'mmol/L' AS default_units, '-2-2' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'O2 saturation' AS name, 60 AS sequence, '%' AS default_units, '95-100' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Lactate' AS name, 70 AS sequence, 'mmol/L' AS default_units, '0.5-2.2' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'VBG' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'pH (venous)' AS name, 10 AS sequence, NULL AS default_units, '7.31-7.41' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'pCO2 (venous)' AS name, 20 AS sequence, 'mmHg' AS default_units, '41-51' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Bicarbonate' AS name, 30 AS sequence, 'mmol/L' AS default_units, '22-29' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Lactate' AS name, 40 AS sequence, 'mmol/L' AS default_units, '0.5-2.2' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'UA' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine color' AS name, 10 AS sequence, NULL AS default_units, 'Yellow' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine appearance' AS name, 20 AS sequence, NULL AS default_units, 'Clear' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine specific gravity' AS name, 30 AS sequence, NULL AS default_units, '1.005-1.030' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine pH' AS name, 40 AS sequence, NULL AS default_units, '4.5-8.0' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine protein' AS name, 50 AS sequence, NULL AS default_units, 'Negative' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine glucose' AS name, 60 AS sequence, NULL AS default_units, 'Negative' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine ketones' AS name, 70 AS sequence, NULL AS default_units, 'Negative' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine blood' AS name, 80 AS sequence, NULL AS default_units, 'Negative' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine leukocyte esterase' AS name, 90 AS sequence, NULL AS default_units, 'Negative' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine nitrite' AS name, 100 AS sequence, NULL AS default_units, 'Negative' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine WBC' AS name, 110 AS sequence, '/hpf' AS default_units, '0-5' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine RBC' AS name, 120 AS sequence, '/hpf' AS default_units, '0-2' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine bacteria' AS name, 130 AS sequence, NULL AS default_units, 'None seen' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'UPT' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine pregnancy test' AS name, 10 AS sequence, NULL AS default_units, 'Negative' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'BCX' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Blood culture' AS name, 10 AS sequence, NULL AS default_units, 'No growth' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'UCX' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine culture' AS name, 10 AS sequence, NULL AS default_units, 'No growth' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Urine colony count' AS name, 20 AS sequence, 'CFU/mL' AS default_units, '<10000' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Organism and sensitivity' AS name, 30 AS sequence, NULL AS default_units, NULL AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'SPCX' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Sputum Gram stain' AS name, 10 AS sequence, NULL AS default_units, NULL AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Sputum culture' AS name, 20 AS sequence, NULL AS default_units, 'Normal flora' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'WCX' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Wound culture' AS name, 10 AS sequence, NULL AS default_units, 'No growth' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Organism and sensitivity' AS name, 20 AS sequence, NULL AS default_units, NULL AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'TSCX' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Throat culture' AS name, 10 AS sequence, NULL AS default_units, 'Normal flora' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'STOOL' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Stool consistency' AS name, 10 AS sequence, NULL AS default_units, NULL AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Stool ova and parasites' AS name, 20 AS sequence, NULL AS default_units, 'None seen' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Stool occult blood' AS name, 30 AS sequence, NULL AS default_units, 'Negative' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'STCX' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Stool culture' AS name, 10 AS sequence, NULL AS default_units, 'No pathogens isolated' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'CSF' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'CSF WBC' AS name, 10 AS sequence, 'cells/uL' AS default_units, '0-5' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'CSF protein' AS name, 20 AS sequence, 'mg/dL' AS default_units, '15-45' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'CSF glucose' AS name, 30 AS sequence, 'mg/dL' AS default_units, '40-70' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'CSF Gram stain' AS name, 40 AS sequence, NULL AS default_units, 'No organisms seen' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'HIV' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'HIV screening' AS name, 10 AS sequence, NULL AS default_units, 'Non-reactive' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'HBSAG' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'HBsAg' AS name, 10 AS sequence, NULL AS default_units, 'Non-reactive' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'HCV' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Anti-HCV' AS name, 10 AS sequence, NULL AS default_units, 'Non-reactive' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'NS1' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Dengue NS1 antigen' AS name, 10 AS sequence, NULL AS default_units, 'Negative' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'DENGAB' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Dengue IgG' AS name, 10 AS sequence, NULL AS default_units, 'Negative' AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Dengue IgM' AS name, 20 AS sequence, NULL AS default_units, 'Negative' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'TYPH' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Typhoid IgM' AS name, 10 AS sequence, NULL AS default_units, 'Negative' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'RPR' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'RPR' AS name, 10 AS sequence, NULL AS default_units, 'Non-reactive' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'COVAG' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'COVID-19 antigen' AS name, 10 AS sequence, NULL AS default_units, 'Negative' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'ABORH' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'ABO group' AS name, 10 AS sequence, NULL AS default_units, NULL AS default_range, NOW() AS created_at
    UNION ALL
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Rh(D) type' AS name, 20 AS sequence, NULL AS default_units, NULL AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'XM' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Crossmatch' AS name, 10 AS sequence, NULL AS default_units, 'Compatible' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);

SET @t = (SELECT id FROM procedure_order_configs WHERE identifying_code = 'DCT' AND procedure_tier = 'procedure_order' AND lab_section IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, default_units, default_range, created_at)
SELECT * FROM (
    SELECT @t AS parent_id, 'discrete_result' AS procedure_tier, 'Direct Coombs test' AS name, 10 AS sequence, NULL AS default_units, 'Negative' AS default_range, NOW() AS created_at
) t
WHERE t.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.procedure_tier = 'discrete_result' AND c.deleted_at IS NULL);
