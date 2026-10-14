-- Seed: imaging study prices
-- Starter price (in pesos) for each of the 51 imaging studies seeded by 043_seed_radiology_studies.sql, so a signed
-- report can be charged to the patient ledger (module 15, Phase 3). Matched by identifying_code. Idempotent: it only
-- fills a price that is still NULL, so a price the hospital has already set (under Radiology Worklist -> Study
-- prices) is never overwritten. Every hospital should check these against its own price list; contrast studies
-- usually cost more because the contrast itself is charged with them.

SET NAMES utf8mb4;

UPDATE procedure_order_configs
SET rad_price = CASE identifying_code
        -- X-ray
        WHEN 'CXR' THEN 450 WHEN 'CXRPAL' THEN 700 WHEN 'AXR' THEN 500 WHEN 'AXRSER' THEN 800
        WHEN 'PELVXR' THEN 550 WHEN 'SKULLXR' THEN 600 WHEN 'CSPINEXR' THEN 700 WHEN 'TSPINEXR' THEN 700
        WHEN 'LSPINEXR' THEN 750 WHEN 'SHOULDXR' THEN 550 WHEN 'UEXR' THEN 500 WHEN 'LEXR' THEN 500
        WHEN 'RIBXR' THEN 550 WHEN 'SINUSXR' THEN 550
        -- Ultrasound
        WHEN 'USWA' THEN 1800 WHEN 'USHBT' THEN 1200 WHEN 'USKUB' THEN 1200 WHEN 'USPELV' THEN 1200
        WHEN 'USTV' THEN 1500 WHEN 'USOB' THEN 1500 WHEN 'USTHY' THEN 1200 WHEN 'USBREAST' THEN 1500
        WHEN 'USSCROT' THEN 1200 WHEN 'USSOFT' THEN 1000 WHEN 'USDVT' THEN 2500 WHEN 'USCAROT' THEN 2500
        WHEN 'USFAST' THEN 800
        -- CT
        WHEN 'CTHEAD' THEN 4500 WHEN 'CTHEADC' THEN 7000 WHEN 'CTCHEST' THEN 5500 WHEN 'CTPA' THEN 9000
        WHEN 'CTAP' THEN 11000 WHEN 'CTAPNC' THEN 7500 WHEN 'CTKUB' THEN 5500 WHEN 'CTCSPINE' THEN 5000
        WHEN 'CTLSPINE' THEN 5000 WHEN 'CTFACE' THEN 4500 WHEN 'CTNECKC' THEN 7500 WHEN 'CTAORTA' THEN 12000
        WHEN 'CTEXT' THEN 4500
        -- MRI
        WHEN 'MRBRAIN' THEN 9500 WHEN 'MRBRAINC' THEN 13000 WHEN 'MRANGBR' THEN 11000 WHEN 'MRCSPINE' THEN 9500
        WHEN 'MRTSPINE' THEN 9500 WHEN 'MRLSPINE' THEN 9500 WHEN 'MRKNEE' THEN 9000 WHEN 'MRSHOULD' THEN 9000
        WHEN 'MRCP' THEN 11000 WHEN 'MRABDC' THEN 13000 WHEN 'MRPELV' THEN 10000
    END
WHERE procedure_tier = 'procedure_order'
  AND deleted_at IS NULL
  AND rad_price IS NULL
  AND identifying_code IN ('CXR','CXRPAL','AXR','AXRSER','PELVXR','SKULLXR','CSPINEXR','TSPINEXR','LSPINEXR','SHOULDXR','UEXR','LEXR','RIBXR','SINUSXR',
    'USWA','USHBT','USKUB','USPELV','USTV','USOB','USTHY','USBREAST','USSCROT','USSOFT','USDVT','USCAROT','USFAST',
    'CTHEAD','CTHEADC','CTCHEST','CTPA','CTAP','CTAPNC','CTKUB','CTCSPINE','CTLSPINE','CTFACE','CTNECKC','CTAORTA','CTEXT',
    'MRBRAIN','MRBRAINC','MRANGBR','MRCSPINE','MRTSPINE','MRLSPINE','MRKNEE','MRSHOULD','MRCP','MRABDC','MRPELV');
