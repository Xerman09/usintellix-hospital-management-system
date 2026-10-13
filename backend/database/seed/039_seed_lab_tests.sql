-- Seed: starter lab test catalog
-- Common hospital lab tests as orderable "Procedure Order" items under one group per lab section
-- (Hematology, Coagulation, Chemistry, Blood Gas, Urinalysis, Microbiology, Serology, Blood Bank), each with
-- its specimen, tube (lab_container) and lab section, for the lab worklist and specimen collection (module 14).
-- Idempotent: INSERT ... SELECT ... WHERE NOT EXISTS on the name under its group (groups: name at the top level);
-- an existing test of the same name is left as it is. Review and extend in Administration > Procedures (Configure Orders).

SET NAMES utf8mb4;

-- Hematology
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, description, sequence, created_at)
SELECT NULL, 'group', 'Hematology', 'Laboratory', 10, NOW()
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs WHERE name = 'Hematology' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL);
SET @g = (SELECT id FROM procedure_order_configs WHERE name = 'Hematology' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, order_test_type, order_from, identifying_code, specimen_type, lab_container, lab_section, created_at)
SELECT * FROM (
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Complete blood count (CBC) with differential' AS name, 10 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'CBC' AS identifying_code, 'Blood' AS specimen_type, 'edta' AS lab_container, 'hematology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Erythrocyte sedimentation rate (ESR)' AS name, 20 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'ESR' AS identifying_code, 'Blood' AS specimen_type, 'edta' AS lab_container, 'hematology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Reticulocyte count' AS name, 30 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'RETIC' AS identifying_code, 'Blood' AS specimen_type, 'edta' AS lab_container, 'hematology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Peripheral blood smear' AS name, 40 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'PBS' AS identifying_code, 'Blood' AS specimen_type, 'edta' AS lab_container, 'hematology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Malaria smear' AS name, 50 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'MALARIA' AS identifying_code, 'Blood' AS specimen_type, 'edta' AS lab_container, 'hematology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'HbA1c (glycated hemoglobin)' AS name, 60 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'HBA1C' AS identifying_code, 'Blood' AS specimen_type, 'edta' AS lab_container, 'hematology' AS lab_section, NOW() AS created_at
) t
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.deleted_at IS NULL);

-- Coagulation
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, description, sequence, created_at)
SELECT NULL, 'group', 'Coagulation', 'Laboratory', 20, NOW()
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs WHERE name = 'Coagulation' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL);
SET @g = (SELECT id FROM procedure_order_configs WHERE name = 'Coagulation' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, order_test_type, order_from, identifying_code, specimen_type, lab_container, lab_section, created_at)
SELECT * FROM (
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Prothrombin time (PT / INR)' AS name, 10 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'PTINR' AS identifying_code, 'Plasma' AS specimen_type, 'citrate' AS lab_container, 'coagulation' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Activated partial thromboplastin time (aPTT)' AS name, 20 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'APTT' AS identifying_code, 'Plasma' AS specimen_type, 'citrate' AS lab_container, 'coagulation' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'D-dimer' AS name, 30 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'DDIMER' AS identifying_code, 'Plasma' AS specimen_type, 'citrate' AS lab_container, 'coagulation' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Fibrinogen' AS name, 40 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'FIBRIN' AS identifying_code, 'Plasma' AS specimen_type, 'citrate' AS lab_container, 'coagulation' AS lab_section, NOW() AS created_at
) t
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.deleted_at IS NULL);

-- Chemistry
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, description, sequence, created_at)
SELECT NULL, 'group', 'Chemistry', 'Laboratory', 30, NOW()
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs WHERE name = 'Chemistry' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL);
SET @g = (SELECT id FROM procedure_order_configs WHERE name = 'Chemistry' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, order_test_type, order_from, identifying_code, specimen_type, lab_container, lab_section, created_at)
SELECT * FROM (
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Basic metabolic panel (BMP)' AS name, 10 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'BMP' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Comprehensive metabolic panel (CMP)' AS name, 20 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'CMP' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Electrolytes (sodium, potassium, chloride)' AS name, 30 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'LYTES' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Creatinine' AS name, 40 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'CREA' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Blood urea nitrogen (BUN)' AS name, 50 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'BUN' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Liver function tests (LFT)' AS name, 60 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'LFT' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Albumin' AS name, 70 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'ALB' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Lipid profile' AS name, 80 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'LIPID' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Fasting blood sugar (FBS)' AS name, 90 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'FBS' AS identifying_code, 'Plasma' AS specimen_type, 'fluoride' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Random blood sugar (RBS)' AS name, 100 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'RBS' AS identifying_code, 'Plasma' AS specimen_type, 'fluoride' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Lactate' AS name, 110 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'LACT' AS identifying_code, 'Plasma' AS specimen_type, 'fluoride' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Troponin I' AS name, 120 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'TROP' AS identifying_code, 'Plasma' AS specimen_type, 'heparin' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'CK-MB' AS name, 130 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'CKMB' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'NT-proBNP' AS name, 140 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'BNP' AS identifying_code, 'Plasma' AS specimen_type, 'edta' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Amylase' AS name, 150 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'AMY' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Lipase' AS name, 160 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'LIPA' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Magnesium' AS name, 170 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'MG' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Calcium' AS name, 180 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'CA' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Phosphorus' AS name, 190 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'PHOS' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Uric acid' AS name, 200 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'URIC' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'C-reactive protein (CRP)' AS name, 210 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'CRP' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Procalcitonin' AS name, 220 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'PCT' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Thyroid stimulating hormone (TSH)' AS name, 230 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'TSH' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Free T4' AS name, 240 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'FT4' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Ammonia' AS name, 250 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'AMMON' AS identifying_code, 'Plasma' AS specimen_type, 'edta' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Serum pregnancy test (beta-hCG)' AS name, 260 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'BHCG' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'chemistry' AS lab_section, NOW() AS created_at
) t
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.deleted_at IS NULL);

-- Blood Gas
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, description, sequence, created_at)
SELECT NULL, 'group', 'Blood Gas', 'Laboratory', 40, NOW()
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs WHERE name = 'Blood Gas' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL);
SET @g = (SELECT id FROM procedure_order_configs WHERE name = 'Blood Gas' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, order_test_type, order_from, identifying_code, specimen_type, lab_container, lab_section, created_at)
SELECT * FROM (
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Arterial blood gas (ABG)' AS name, 10 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'ABG' AS identifying_code, 'Arterial blood' AS specimen_type, 'abg' AS lab_container, 'blood_gas' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Venous blood gas (VBG)' AS name, 20 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'VBG' AS identifying_code, 'Blood' AS specimen_type, 'abg' AS lab_container, 'blood_gas' AS lab_section, NOW() AS created_at
) t
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.deleted_at IS NULL);

-- Urinalysis
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, description, sequence, created_at)
SELECT NULL, 'group', 'Urinalysis', 'Laboratory', 50, NOW()
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs WHERE name = 'Urinalysis' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL);
SET @g = (SELECT id FROM procedure_order_configs WHERE name = 'Urinalysis' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, order_test_type, order_from, identifying_code, specimen_type, lab_container, lab_section, created_at)
SELECT * FROM (
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Urinalysis (routine)' AS name, 10 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'UA' AS identifying_code, 'Urine' AS specimen_type, 'urine' AS lab_container, 'urinalysis' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Urine pregnancy test' AS name, 20 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'UPT' AS identifying_code, 'Urine' AS specimen_type, 'urine' AS lab_container, 'urinalysis' AS lab_section, NOW() AS created_at
) t
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.deleted_at IS NULL);

-- Microbiology
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, description, sequence, created_at)
SELECT NULL, 'group', 'Microbiology', 'Laboratory', 60, NOW()
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs WHERE name = 'Microbiology' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL);
SET @g = (SELECT id FROM procedure_order_configs WHERE name = 'Microbiology' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, order_test_type, order_from, identifying_code, specimen_type, lab_container, lab_section, created_at)
SELECT * FROM (
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Blood culture (2 sets)' AS name, 10 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'BCX' AS identifying_code, 'Blood' AS specimen_type, 'culture' AS lab_container, 'microbiology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Urine culture and sensitivity' AS name, 20 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'UCX' AS identifying_code, 'Urine' AS specimen_type, 'urine' AS lab_container, 'microbiology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Sputum Gram stain and culture' AS name, 30 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'SPCX' AS identifying_code, 'Sputum' AS specimen_type, 'sputum' AS lab_container, 'microbiology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Wound swab culture' AS name, 40 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'WCX' AS identifying_code, 'Swab' AS specimen_type, 'swab' AS lab_container, 'microbiology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Throat swab culture' AS name, 50 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'TSCX' AS identifying_code, 'Swab' AS specimen_type, 'swab' AS lab_container, 'microbiology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Stool examination (routine)' AS name, 60 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'STOOL' AS identifying_code, 'Stool' AS specimen_type, 'stool' AS lab_container, 'microbiology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Stool culture' AS name, 70 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'STCX' AS identifying_code, 'Stool' AS specimen_type, 'stool' AS lab_container, 'microbiology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'CSF analysis (cell count, protein, glucose, Gram stain)' AS name, 80 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'CSF' AS identifying_code, 'CSF' AS specimen_type, 'csf' AS lab_container, 'microbiology' AS lab_section, NOW() AS created_at
) t
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.deleted_at IS NULL);

-- Serology
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, description, sequence, created_at)
SELECT NULL, 'group', 'Serology', 'Laboratory', 70, NOW()
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs WHERE name = 'Serology' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL);
SET @g = (SELECT id FROM procedure_order_configs WHERE name = 'Serology' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, order_test_type, order_from, identifying_code, specimen_type, lab_container, lab_section, created_at)
SELECT * FROM (
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'HIV screening' AS name, 10 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'HIV' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'serology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Hepatitis B surface antigen (HBsAg)' AS name, 20 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'HBSAG' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'serology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Anti-HCV' AS name, 30 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'HCV' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'serology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Dengue NS1 antigen' AS name, 40 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'NS1' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'serology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Dengue IgG / IgM' AS name, 50 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'DENGAB' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'serology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Typhoid IgM' AS name, 60 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'TYPH' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'serology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Syphilis (RPR / VDRL)' AS name, 70 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'RPR' AS identifying_code, 'Serum' AS specimen_type, 'sst' AS lab_container, 'serology' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'COVID-19 antigen' AS name, 80 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'COVAG' AS identifying_code, 'Swab' AS specimen_type, 'swab' AS lab_container, 'serology' AS lab_section, NOW() AS created_at
) t
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.deleted_at IS NULL);

-- Blood Bank
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, description, sequence, created_at)
SELECT NULL, 'group', 'Blood Bank', 'Laboratory', 80, NOW()
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs WHERE name = 'Blood Bank' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL);
SET @g = (SELECT id FROM procedure_order_configs WHERE name = 'Blood Bank' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, order_test_type, order_from, identifying_code, specimen_type, lab_container, lab_section, created_at)
SELECT * FROM (
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Blood typing (ABO / Rh)' AS name, 10 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'ABORH' AS identifying_code, 'Blood' AS specimen_type, 'edta' AS lab_container, 'blood_bank' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Crossmatch' AS name, 20 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'XM' AS identifying_code, 'Blood' AS specimen_type, 'edta' AS lab_container, 'blood_bank' AS lab_section, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Direct Coombs test' AS name, 30 AS sequence, 'Laboratory' AS order_test_type, 'Internal' AS order_from, 'DCT' AS identifying_code, 'Blood' AS specimen_type, 'edta' AS lab_container, 'blood_bank' AS lab_section, NOW() AS created_at
) t
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.deleted_at IS NULL);
