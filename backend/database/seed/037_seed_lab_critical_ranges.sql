-- Seed: starter critical lab ranges
-- Common adult critical (panic) values and normal ranges, for the admin to review and adjust
-- in Administration > Critical Lab Ranges. Idempotent: INSERT IGNORE on the UNIQUE (name, units).
-- Numbers follow widely used hospital critical-value lists; each lab should confirm its own.

SET NAMES utf8mb4;

INSERT IGNORE INTO lab_result_ranges
    (name, code, aliases, units, normal_low, normal_high, critical_low, critical_high, critical_values, normal_values, notes, is_active, created_at) VALUES
('Potassium',        '2823-3',  'K, Serum potassium, Potassium (K)',              'mmol/L', 3.5,   5.1,   2.5,   6.5,   NULL, NULL, NULL, 1, NOW()),
('Sodium',           '2951-2',  'Na, Serum sodium, Sodium (Na)',                  'mmol/L', 135,   145,   120,   160,   NULL, NULL, NULL, 1, NOW()),
('Calcium',          '17861-6', 'Ca, Total calcium, Serum calcium',               'mg/dL',  8.5,   10.5,  6.0,   13.0,  NULL, NULL, 'Total calcium', 1, NOW()),
('Magnesium',        '19123-9', 'Mg, Serum magnesium',                            'mg/dL',  1.7,   2.2,   1.0,   4.9,   NULL, NULL, NULL, 1, NOW()),
('Phosphorus',       '2777-1',  'Phosphate, PO4, Inorganic phosphorus',           'mg/dL',  2.5,   4.5,   1.0,   NULL,  NULL, NULL, NULL, 1, NOW()),
('Glucose',          '2345-7',  'FBS, RBS, Blood sugar, Blood glucose, Fasting blood sugar, Random blood sugar', 'mg/dL', 70, 110, 40, 500, NULL, NULL, NULL, 1, NOW()),
('Glucose',          '15074-8', 'FBS, RBS, Blood sugar, Blood glucose, Fasting blood sugar, Random blood sugar', 'mmol/L', 3.9, 6.1, 2.2, 27.8, NULL, NULL, 'SI units', 1, NOW()),
('Hemoglobin',       '718-7',   'Hgb, Hb, Haemoglobin',                           'g/dL',   12.0,  17.5,  7.0,   20.0,  NULL, NULL, NULL, 1, NOW()),
('Hemoglobin',       '718-7',   'Hgb, Hb, Haemoglobin',                           'g/L',    120,   175,   70,    200,   NULL, NULL, 'SI units', 1, NOW()),
('Hematocrit',       '4544-3',  'Hct, Haematocrit, PCV',                          '%',      36,    52,    20,    60,    NULL, NULL, NULL, 1, NOW()),
('Platelet count',   '777-3',   'PLT, Platelets, Platelet',                       'x10^9/L', 150,  450,   20,    1000,  NULL, NULL, 'Same numbers as x10^3/uL', 1, NOW()),
('WBC count',        '6690-2',  'WBC, White blood cells, White blood cell count, Leukocytes', 'x10^9/L', 4.5, 11.0, 2.0, 30.0, NULL, NULL, 'Same numbers as x10^3/uL', 1, NOW()),
('INR',              '6301-6',  'Prothrombin time INR, PT INR',                   '',       0.8,   1.2,   NULL,  5.0,   NULL, NULL, 'Not on warfarin: review lower', 1, NOW()),
('aPTT',             '3173-2',  'PTT, Activated partial thromboplastin time',      'seconds', 25,   35,    NULL,  100,   NULL, NULL, NULL, 1, NOW()),
('pH (arterial)',    '2744-1',  'pH, Arterial pH, ABG pH',                        '',       7.35,  7.45,  7.20,  7.60,  NULL, NULL, NULL, 1, NOW()),
('pCO2 (arterial)',  '2019-8',  'pCO2, PaCO2',                                    'mmHg',   35,    45,    20,    70,    NULL, NULL, NULL, 1, NOW()),
('pO2 (arterial)',   '2703-7',  'pO2, PaO2',                                      'mmHg',   80,    100,   40,    NULL,  NULL, NULL, NULL, 1, NOW()),
('Lactate',          '2524-7',  'Lactic acid, Serum lactate',                     'mmol/L', 0.5,   2.2,   NULL,  4.0,   NULL, NULL, NULL, 1, NOW()),
('Troponin I',       '10839-9', 'Trop I, cTnI, Troponin, Troponin I (qualitative)', '',     NULL,  NULL,  NULL,  NULL,  'positive, reactive, detected', 'negative, non-reactive, not detected', 'Qualitative (rapid) test', 1, NOW()),
('Blood culture',    '600-7',   'Culture, blood; Blood C/S',                      '',       NULL,  NULL,  NULL,  NULL,  'positive, growth, organism seen, organisms seen', 'no growth, negative', NULL, 1, NOW());
