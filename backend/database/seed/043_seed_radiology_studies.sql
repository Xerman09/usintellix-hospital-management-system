-- Seed: starter radiology study catalog
-- Common imaging studies as orderable "Procedure Order" items under one group per modality (X-ray, Ultrasound,
-- CT Scan, MRI), each with its modality, how many minutes the machine needs, whether it uses contrast, whether it
-- can be done portable (at the bedside) and the patient's preparation instructions -- for the radiology worklist
-- and scheduling (module 15).
-- Idempotent: INSERT ... SELECT ... WHERE NOT EXISTS on the name under its group; an existing study of the same
-- name is left as it is. Review and extend in Administration > Procedures (Configure Orders).

SET NAMES utf8mb4;


-- X-ray
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, description, sequence, created_at)
SELECT NULL, 'group', 'X-ray', 'Plain radiography (X-ray)', 110, NOW()
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs WHERE name = 'X-ray' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL);
SET @g = (SELECT id FROM procedure_order_configs WHERE name = 'X-ray' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, order_test_type, order_from, identifying_code, rad_modality, rad_minutes, rad_contrast, rad_portable, rad_prep, created_at)
SELECT * FROM (
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Chest X-ray (PA)' AS name, 10 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CXR' AS identifying_code, 'xray' AS rad_modality, 10 AS rad_minutes, 'none' AS rad_contrast, 1 AS rad_portable, 'Remove jewellery and any metal from the area. Tell the radiographer if the patient may be pregnant.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Chest X-ray (PA and lateral)' AS name, 20 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CXRPAL' AS identifying_code, 'xray' AS rad_modality, 15 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Remove jewellery and any metal from the area. Tell the radiographer if the patient may be pregnant.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Abdominal X-ray (KUB)' AS name, 30 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'AXR' AS identifying_code, 'xray' AS rad_modality, 10 AS rad_minutes, 'none' AS rad_contrast, 1 AS rad_portable, 'Remove jewellery and any metal from the area. Tell the radiographer if the patient may be pregnant.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Abdomen series (erect and supine)' AS name, 40 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'AXRSER' AS identifying_code, 'xray' AS rad_modality, 15 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Remove jewellery and any metal from the area. Tell the radiographer if the patient may be pregnant.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Pelvis X-ray' AS name, 50 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'PELVXR' AS identifying_code, 'xray' AS rad_modality, 10 AS rad_minutes, 'none' AS rad_contrast, 1 AS rad_portable, 'Remove jewellery and any metal from the area. Tell the radiographer if the patient may be pregnant.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Skull X-ray' AS name, 60 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'SKULLXR' AS identifying_code, 'xray' AS rad_modality, 10 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Remove jewellery and any metal from the area. Tell the radiographer if the patient may be pregnant.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Cervical spine X-ray' AS name, 70 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CSPINEXR' AS identifying_code, 'xray' AS rad_modality, 15 AS rad_minutes, 'none' AS rad_contrast, 1 AS rad_portable, 'Remove jewellery and any metal from the area. Tell the radiographer if the patient may be pregnant. Keep the collar on until the doctor says otherwise.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Thoracic spine X-ray' AS name, 80 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'TSPINEXR' AS identifying_code, 'xray' AS rad_modality, 15 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Remove jewellery and any metal from the area. Tell the radiographer if the patient may be pregnant.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Lumbosacral spine X-ray' AS name, 90 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'LSPINEXR' AS identifying_code, 'xray' AS rad_modality, 15 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Remove jewellery and any metal from the area. Tell the radiographer if the patient may be pregnant.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Shoulder X-ray' AS name, 100 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'SHOULDXR' AS identifying_code, 'xray' AS rad_modality, 10 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Remove jewellery and any metal from the area. Tell the radiographer if the patient may be pregnant.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Upper extremity X-ray (hand, wrist, forearm, elbow, humerus)' AS name, 110 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'UEXR' AS identifying_code, 'xray' AS rad_modality, 10 AS rad_minutes, 'none' AS rad_contrast, 1 AS rad_portable, 'Remove jewellery and any metal from the area. Tell the radiographer if the patient may be pregnant. Say which side and which part.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Lower extremity X-ray (foot, ankle, leg, knee, femur)' AS name, 120 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'LEXR' AS identifying_code, 'xray' AS rad_modality, 10 AS rad_minutes, 'none' AS rad_contrast, 1 AS rad_portable, 'Remove jewellery and any metal from the area. Tell the radiographer if the patient may be pregnant. Say which side and which part.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Rib X-ray' AS name, 130 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'RIBXR' AS identifying_code, 'xray' AS rad_modality, 10 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Remove jewellery and any metal from the area. Tell the radiographer if the patient may be pregnant.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Paranasal sinuses X-ray' AS name, 140 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'SINUSXR' AS identifying_code, 'xray' AS rad_modality, 10 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Remove jewellery and any metal from the area. Tell the radiographer if the patient may be pregnant.' AS rad_prep, NOW() AS created_at
) t
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.deleted_at IS NULL);

-- Ultrasound
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, description, sequence, created_at)
SELECT NULL, 'group', 'Ultrasound', 'Ultrasound (sonography)', 120, NOW()
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs WHERE name = 'Ultrasound' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL);
SET @g = (SELECT id FROM procedure_order_configs WHERE name = 'Ultrasound' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, order_test_type, order_from, identifying_code, rad_modality, rad_minutes, rad_contrast, rad_portable, rad_prep, created_at)
SELECT * FROM (
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Ultrasound: whole abdomen' AS name, 10 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'USWA' AS identifying_code, 'ultrasound' AS rad_modality, 30 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Nothing to eat for 6-8 hours before (water and medicines are fine). The gallbladder cannot be seen after a meal.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Ultrasound: hepatobiliary tree (liver, gallbladder)' AS name, 20 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'USHBT' AS identifying_code, 'ultrasound' AS rad_modality, 20 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Nothing to eat for 6-8 hours before (water and medicines are fine).' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Ultrasound: kidneys, ureters and bladder (KUB)' AS name, 30 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'USKUB' AS identifying_code, 'ultrasound' AS rad_modality, 20 AS rad_minutes, 'none' AS rad_contrast, 1 AS rad_portable, 'Drink 3-4 glasses of water an hour before and do not pass urine: the bladder must be full.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Ultrasound: pelvis (transabdominal)' AS name, 40 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'USPELV' AS identifying_code, 'ultrasound' AS rad_modality, 20 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Drink 3-4 glasses of water an hour before and do not pass urine: the bladder must be full.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Ultrasound: transvaginal' AS name, 50 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'USTV' AS identifying_code, 'ultrasound' AS rad_modality, 20 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Empty the bladder just before the scan. A female chaperone is present.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Obstetric ultrasound (pregnancy)' AS name, 60 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'USOB' AS identifying_code, 'ultrasound' AS rad_modality, 25 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'No preparation. Bring the previous scans and the prenatal record.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Ultrasound: thyroid and neck' AS name, 70 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'USTHY' AS identifying_code, 'ultrasound' AS rad_modality, 20 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'No preparation.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Ultrasound: breast' AS name, 80 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'USBREAST' AS identifying_code, 'ultrasound' AS rad_modality, 20 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'No preparation. A female chaperone is present.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Ultrasound: scrotal' AS name, 90 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'USSCROT' AS identifying_code, 'ultrasound' AS rad_modality, 20 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'No preparation.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Ultrasound: soft tissue / superficial' AS name, 100 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'USSOFT' AS identifying_code, 'ultrasound' AS rad_modality, 20 AS rad_minutes, 'none' AS rad_contrast, 1 AS rad_portable, 'No preparation. Say exactly where the lump or swelling is.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Doppler: leg veins (DVT study)' AS name, 110 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'USDVT' AS identifying_code, 'ultrasound' AS rad_modality, 30 AS rad_minutes, 'none' AS rad_contrast, 1 AS rad_portable, 'No preparation. Loose clothing or a gown; both legs are scanned.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'Doppler: carotid arteries' AS name, 120 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'USCAROT' AS identifying_code, 'ultrasound' AS rad_modality, 30 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'No preparation. No necklaces or high collars.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'FAST scan (trauma, at the bedside)' AS name, 130 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'USFAST' AS identifying_code, 'ultrasound' AS rad_modality, 10 AS rad_minutes, 'none' AS rad_contrast, 1 AS rad_portable, 'No preparation.' AS rad_prep, NOW() AS created_at
) t
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.deleted_at IS NULL);

-- CT Scan
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, description, sequence, created_at)
SELECT NULL, 'group', 'CT Scan', 'Computed tomography (CT)', 130, NOW()
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs WHERE name = 'CT Scan' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL);
SET @g = (SELECT id FROM procedure_order_configs WHERE name = 'CT Scan' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, order_test_type, order_from, identifying_code, rad_modality, rad_minutes, rad_contrast, rad_portable, rad_prep, created_at)
SELECT * FROM (
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'CT head (plain)' AS name, 10 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CTHEAD' AS identifying_code, 'ct' AS rad_modality, 15 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'No preparation. Remove earrings, hairpins and dentures.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'CT head with contrast' AS name, 20 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CTHEADC' AS identifying_code, 'ct' AS rad_modality, 20 AS rad_minutes, 'iv' AS rad_contrast, 0 AS rad_portable, 'Nothing to eat for 4 hours before (water and medicines are fine). A creatinine from the last 30 days is needed. Ask about any previous reaction to contrast. Bring the patient on time: the contrast is prepared for the slot.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'CT chest (plain)' AS name, 30 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CTCHEST' AS identifying_code, 'ct' AS rad_modality, 15 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'No preparation. The patient holds their breath for a few seconds.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'CT pulmonary angiogram (CTPA, for embolism)' AS name, 40 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CTPA' AS identifying_code, 'ct' AS rad_modality, 20 AS rad_minutes, 'iv' AS rad_contrast, 0 AS rad_portable, 'Nothing to eat for 4 hours before (water and medicines are fine). A creatinine from the last 30 days is needed. Ask about any previous reaction to contrast. Bring the patient on time: the contrast is prepared for the slot.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'CT abdomen and pelvis with contrast' AS name, 50 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CTAP' AS identifying_code, 'ct' AS rad_modality, 25 AS rad_minutes, 'both' AS rad_contrast, 0 AS rad_portable, 'Nothing to eat for 4 hours before (water and medicines are fine). A creatinine from the last 30 days is needed. Ask about any previous reaction to contrast. Bring the patient on time: the contrast is prepared for the slot. Oral contrast is given in the department 1 hour before, so come early.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'CT abdomen and pelvis (plain)' AS name, 60 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CTAPNC' AS identifying_code, 'ct' AS rad_modality, 20 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Nothing to eat for 4 hours before (water and medicines are fine).' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'CT stonogram (KUB, plain)' AS name, 70 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CTKUB' AS identifying_code, 'ct' AS rad_modality, 15 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Drink water normally. No contrast is used.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'CT cervical spine' AS name, 80 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CTCSPINE' AS identifying_code, 'ct' AS rad_modality, 15 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'No preparation. Keep the collar on until the doctor says otherwise.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'CT lumbar spine' AS name, 90 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CTLSPINE' AS identifying_code, 'ct' AS rad_modality, 15 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'No preparation.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'CT facial bones and orbits' AS name, 100 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CTFACE' AS identifying_code, 'ct' AS rad_modality, 15 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'No preparation. Remove glasses, earrings and dentures.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'CT neck with contrast' AS name, 110 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CTNECKC' AS identifying_code, 'ct' AS rad_modality, 20 AS rad_minutes, 'iv' AS rad_contrast, 0 AS rad_portable, 'Nothing to eat for 4 hours before (water and medicines are fine). A creatinine from the last 30 days is needed. Ask about any previous reaction to contrast. Bring the patient on time: the contrast is prepared for the slot.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'CT angiogram: aorta' AS name, 120 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CTAORTA' AS identifying_code, 'ct' AS rad_modality, 25 AS rad_minutes, 'iv' AS rad_contrast, 0 AS rad_portable, 'Nothing to eat for 4 hours before (water and medicines are fine). A creatinine from the last 30 days is needed. Ask about any previous reaction to contrast. Bring the patient on time: the contrast is prepared for the slot.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'CT extremity' AS name, 130 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'CTEXT' AS identifying_code, 'ct' AS rad_modality, 15 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'No preparation. Say which side and which part.' AS rad_prep, NOW() AS created_at
) t
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.deleted_at IS NULL);

-- MRI
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, description, sequence, created_at)
SELECT NULL, 'group', 'MRI', 'Magnetic resonance imaging (MRI)', 140, NOW()
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs WHERE name = 'MRI' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL);
SET @g = (SELECT id FROM procedure_order_configs WHERE name = 'MRI' AND procedure_tier = 'group' AND parent_id IS NULL AND deleted_at IS NULL ORDER BY id LIMIT 1);
INSERT INTO procedure_order_configs (parent_id, procedure_tier, name, sequence, order_test_type, order_from, identifying_code, rad_modality, rad_minutes, rad_contrast, rad_portable, rad_prep, created_at)
SELECT * FROM (
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'MRI brain (plain)' AS name, 10 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'MRBRAIN' AS identifying_code, 'mri' AS rad_modality, 40 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Metal check before the scan: no pacemaker, aneurysm clips, cochlear implant, metal fragments or recent surgery with clips. Remove all metal, jewellery, hearing aids, cards and loose clothing with zips. The patient must lie still in a narrow tunnel; tell us if they are afraid of enclosed spaces or cannot lie flat, as sedation may be needed.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'MRI brain with contrast' AS name, 20 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'MRBRAINC' AS identifying_code, 'mri' AS rad_modality, 50 AS rad_minutes, 'iv' AS rad_contrast, 0 AS rad_portable, 'Metal check before the scan: no pacemaker, aneurysm clips, cochlear implant, metal fragments or recent surgery with clips. Remove all metal, jewellery, hearing aids, cards and loose clothing with zips. The patient must lie still in a narrow tunnel; tell us if they are afraid of enclosed spaces or cannot lie flat, as sedation may be needed. A creatinine from the last 30 days is needed for the contrast.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'MRA brain (angiogram)' AS name, 30 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'MRANGBR' AS identifying_code, 'mri' AS rad_modality, 45 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Metal check before the scan: no pacemaker, aneurysm clips, cochlear implant, metal fragments or recent surgery with clips. Remove all metal, jewellery, hearing aids, cards and loose clothing with zips. The patient must lie still in a narrow tunnel; tell us if they are afraid of enclosed spaces or cannot lie flat, as sedation may be needed.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'MRI cervical spine' AS name, 40 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'MRCSPINE' AS identifying_code, 'mri' AS rad_modality, 40 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Metal check before the scan: no pacemaker, aneurysm clips, cochlear implant, metal fragments or recent surgery with clips. Remove all metal, jewellery, hearing aids, cards and loose clothing with zips. The patient must lie still in a narrow tunnel; tell us if they are afraid of enclosed spaces or cannot lie flat, as sedation may be needed.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'MRI thoracic spine' AS name, 50 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'MRTSPINE' AS identifying_code, 'mri' AS rad_modality, 40 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Metal check before the scan: no pacemaker, aneurysm clips, cochlear implant, metal fragments or recent surgery with clips. Remove all metal, jewellery, hearing aids, cards and loose clothing with zips. The patient must lie still in a narrow tunnel; tell us if they are afraid of enclosed spaces or cannot lie flat, as sedation may be needed.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'MRI lumbosacral spine' AS name, 60 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'MRLSPINE' AS identifying_code, 'mri' AS rad_modality, 40 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Metal check before the scan: no pacemaker, aneurysm clips, cochlear implant, metal fragments or recent surgery with clips. Remove all metal, jewellery, hearing aids, cards and loose clothing with zips. The patient must lie still in a narrow tunnel; tell us if they are afraid of enclosed spaces or cannot lie flat, as sedation may be needed.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'MRI knee' AS name, 70 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'MRKNEE' AS identifying_code, 'mri' AS rad_modality, 40 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Metal check before the scan: no pacemaker, aneurysm clips, cochlear implant, metal fragments or recent surgery with clips. Remove all metal, jewellery, hearing aids, cards and loose clothing with zips. The patient must lie still in a narrow tunnel; tell us if they are afraid of enclosed spaces or cannot lie flat, as sedation may be needed. Say which side.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'MRI shoulder' AS name, 80 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'MRSHOULD' AS identifying_code, 'mri' AS rad_modality, 40 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Metal check before the scan: no pacemaker, aneurysm clips, cochlear implant, metal fragments or recent surgery with clips. Remove all metal, jewellery, hearing aids, cards and loose clothing with zips. The patient must lie still in a narrow tunnel; tell us if they are afraid of enclosed spaces or cannot lie flat, as sedation may be needed. Say which side.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'MRCP (bile and pancreatic ducts)' AS name, 90 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'MRCP' AS identifying_code, 'mri' AS rad_modality, 45 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Metal check before the scan: no pacemaker, aneurysm clips, cochlear implant, metal fragments or recent surgery with clips. Remove all metal, jewellery, hearing aids, cards and loose clothing with zips. The patient must lie still in a narrow tunnel; tell us if they are afraid of enclosed spaces or cannot lie flat, as sedation may be needed. Nothing to eat for 6 hours before.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'MRI abdomen with contrast' AS name, 100 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'MRABDC' AS identifying_code, 'mri' AS rad_modality, 50 AS rad_minutes, 'iv' AS rad_contrast, 0 AS rad_portable, 'Metal check before the scan: no pacemaker, aneurysm clips, cochlear implant, metal fragments or recent surgery with clips. Remove all metal, jewellery, hearing aids, cards and loose clothing with zips. The patient must lie still in a narrow tunnel; tell us if they are afraid of enclosed spaces or cannot lie flat, as sedation may be needed. Nothing to eat for 6 hours before. A creatinine from the last 30 days is needed.' AS rad_prep, NOW() AS created_at
    UNION ALL
    SELECT @g AS parent_id, 'procedure_order' AS procedure_tier, 'MRI pelvis' AS name, 110 AS sequence, 'Radiology' AS order_test_type, 'Internal' AS order_from, 'MRPELV' AS identifying_code, 'mri' AS rad_modality, 45 AS rad_minutes, 'none' AS rad_contrast, 0 AS rad_portable, 'Metal check before the scan: no pacemaker, aneurysm clips, cochlear implant, metal fragments or recent surgery with clips. Remove all metal, jewellery, hearing aids, cards and loose clothing with zips. The patient must lie still in a narrow tunnel; tell us if they are afraid of enclosed spaces or cannot lie flat, as sedation may be needed.' AS rad_prep, NOW() AS created_at
) t
WHERE NOT EXISTS (SELECT 1 FROM procedure_order_configs c WHERE c.parent_id = t.parent_id AND c.name = t.name AND c.deleted_at IS NULL);
