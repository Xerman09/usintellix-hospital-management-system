-- Seed: lab test prices
-- Starter price (in pesos) for each of the 59 lab tests seeded by 039_seed_lab_tests.sql, so released results can be
-- charged to the patient ledger (module 14, Phase 3). Matched by identifying_code. Idempotent: it only fills a price
-- that is still NULL, so a price the hospital has already set (under Lab Worklist -> Test prices) is never overwritten.
-- Every hospital should check these against its own price list.

SET NAMES utf8mb4;

UPDATE procedure_order_configs
SET lab_price = CASE identifying_code
        -- Hematology
        WHEN 'CBC' THEN 350 WHEN 'ESR' THEN 200 WHEN 'RETIC' THEN 300 WHEN 'PBS' THEN 350
        WHEN 'MALARIA' THEN 350 WHEN 'HBA1C' THEN 700
        -- Coagulation
        WHEN 'PTINR' THEN 450 WHEN 'APTT' THEN 450 WHEN 'DDIMER' THEN 1500 WHEN 'FIBRIN' THEN 700
        -- Chemistry
        WHEN 'BMP' THEN 900 WHEN 'CMP' THEN 1500 WHEN 'LYTES' THEN 700 WHEN 'CREA' THEN 250
        WHEN 'BUN' THEN 250 WHEN 'LFT' THEN 1200 WHEN 'ALB' THEN 300 WHEN 'LIPID' THEN 900
        WHEN 'FBS' THEN 150 WHEN 'RBS' THEN 150 WHEN 'LACT' THEN 600 WHEN 'TROP' THEN 1400
        WHEN 'CKMB' THEN 900 WHEN 'BNP' THEN 2500 WHEN 'AMY' THEN 600 WHEN 'LIPA' THEN 700
        WHEN 'MG' THEN 400 WHEN 'CA' THEN 300 WHEN 'PHOS' THEN 300 WHEN 'URIC' THEN 250
        WHEN 'CRP' THEN 700 WHEN 'PCT' THEN 2500 WHEN 'TSH' THEN 600 WHEN 'FT4' THEN 700
        WHEN 'AMMON' THEN 900 WHEN 'BHCG' THEN 800
        -- Blood gas
        WHEN 'ABG' THEN 1200 WHEN 'VBG' THEN 1000
        -- Urinalysis
        WHEN 'UA' THEN 150 WHEN 'UPT' THEN 250
        -- Microbiology
        WHEN 'BCX' THEN 1800 WHEN 'UCX' THEN 800 WHEN 'SPCX' THEN 900 WHEN 'WCX' THEN 800
        WHEN 'TSCX' THEN 800 WHEN 'STOOL' THEN 200 WHEN 'STCX' THEN 800 WHEN 'CSF' THEN 1200
        -- Serology
        WHEN 'HIV' THEN 500 WHEN 'HBSAG' THEN 400 WHEN 'HCV' THEN 800 WHEN 'NS1' THEN 1200
        WHEN 'DENGAB' THEN 1200 WHEN 'TYPH' THEN 700 WHEN 'RPR' THEN 350 WHEN 'COVAG' THEN 800
        -- Blood bank
        WHEN 'ABORH' THEN 300 WHEN 'XM' THEN 800 WHEN 'DCT' THEN 500
    END
WHERE procedure_tier = 'procedure_order'
  AND deleted_at IS NULL
  AND lab_price IS NULL
  AND identifying_code IN ('CBC','ESR','RETIC','PBS','MALARIA','HBA1C','PTINR','APTT','DDIMER','FIBRIN','BMP','CMP','LYTES','CREA','BUN','LFT','ALB',
    'LIPID','FBS','RBS','LACT','TROP','CKMB','BNP','AMY','LIPA','MG','CA','PHOS','URIC','CRP','PCT','TSH','FT4','AMMON','BHCG','ABG','VBG','UA','UPT',
    'BCX','UCX','SPCX','WCX','TSCX','STOOL','STCX','CSF','HIV','HBSAG','HCV','NS1','DENGAB','TYPH','RPR','COVAG','ABORH','XM','DCT');
