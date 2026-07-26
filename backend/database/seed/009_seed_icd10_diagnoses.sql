-- =============================================
-- Seed: common ICD10-CM diagnosis codes catalog
-- A curated set of frequently-used codes across major chapters,
-- not the full official ~70,000-code set.
-- Idempotent: relies on the UNIQUE constraint on `code`, so re-running
-- this file is safe (duplicates are silently skipped).
-- =============================================

INSERT IGNORE INTO icd10_diagnoses (code, description, created_at) VALUES

-- Certain infectious and parasitic diseases (A00-B99)
('A00.0', 'Cholera due to Vibrio cholerae 01, biovar cholerae', NOW()),
('A00.9', 'Cholera, unspecified', NOW()),
('A01.00', 'Typhoid fever, unspecified', NOW()),
('A04.7', 'Enterocolitis due to Clostridium difficile', NOW()),
('A09', 'Infectious gastroenteritis and colitis, unspecified', NOW()),
('A15.0', 'Tuberculosis of lung', NOW()),
('A41.9', 'Sepsis, unspecified organism', NOW()),
('A49.9', 'Bacterial infection, unspecified', NOW()),
('B00.9', 'Herpesviral infection, unspecified', NOW()),
('B01.9', 'Varicella without complication', NOW()),
('B02.9', 'Zoster without complications', NOW()),
('B18.2', 'Chronic viral hepatitis C', NOW()),
('B20', 'Human immunodeficiency virus [HIV] disease', NOW()),
('B34.9', 'Viral infection, unspecified', NOW()),
('B37.9', 'Candidiasis, unspecified', NOW()),
('B96.20', 'Unspecified Escherichia coli as the cause of diseases classified elsewhere', NOW()),

-- COVID-19 and respiratory viral infections
('U07.1', 'COVID-19', NOW()),
('J09.X2', 'Influenza due to identified novel influenza A virus with other respiratory manifestations', NOW()),
('J11.1', 'Influenza due to unidentified influenza virus with other respiratory manifestations', NOW()),

-- Neoplasms (C00-D49)
('C34.90', 'Malignant neoplasm of unspecified part of unspecified bronchus or lung', NOW()),
('C50.919', 'Malignant neoplasm of unspecified site of unspecified female breast', NOW()),
('C61', 'Malignant neoplasm of prostate', NOW()),
('C73', 'Malignant neoplasm of thyroid gland', NOW()),
('D12.6', 'Benign neoplasm of colon, unspecified', NOW()),
('D22.9', 'Melanocytic nevi, unspecified', NOW()),
('D64.9', 'Anemia, unspecified', NOW()),

-- Endocrine, nutritional and metabolic diseases (E00-E89)
('E03.9', 'Hypothyroidism, unspecified', NOW()),
('E05.90', 'Thyrotoxicosis, unspecified without thyrotoxic crisis or storm', NOW()),
('E10.9', 'Type 1 diabetes mellitus without complications', NOW()),
('E11.9', 'Type 2 diabetes mellitus without complications', NOW()),
('E11.65', 'Type 2 diabetes mellitus with hyperglycemia', NOW()),
('E11.22', 'Type 2 diabetes mellitus with diabetic chronic kidney disease', NOW()),
('E66.9', 'Obesity, unspecified', NOW()),
('E78.5', 'Hyperlipidemia, unspecified', NOW()),
('E78.00', 'Pure hypercholesterolemia, unspecified', NOW()),
('E86.0', 'Dehydration', NOW()),
('E87.6', 'Hypokalemia', NOW()),

-- Mental, behavioral and neurodevelopmental disorders (F01-F99)
('F17.210', 'Nicotine dependence, cigarettes, uncomplicated', NOW()),
('F32.9', 'Major depressive disorder, single episode, unspecified', NOW()),
('F33.9', 'Major depressive disorder, recurrent, unspecified', NOW()),
('F41.1', 'Generalized anxiety disorder', NOW()),
('F41.9', 'Anxiety disorder, unspecified', NOW()),
('F43.10', 'Post-traumatic stress disorder, unspecified', NOW()),
('F43.23', 'Adjustment disorder with mixed anxiety and depressed mood', NOW()),
('F90.9', 'Attention-deficit hyperactivity disorder, unspecified type', NOW()),
('F84.0', 'Autistic disorder', NOW()),

-- Diseases of the nervous system (G00-G99)
('G43.909', 'Migraine, unspecified, not intractable, without status migrainosus', NOW()),
('G40.909', 'Epilepsy, unspecified, not intractable, without status epilepticus', NOW()),
('G47.00', 'Insomnia, unspecified', NOW()),
('G47.33', 'Obstructive sleep apnea (adult) (pediatric)', NOW()),
('G20', 'Parkinson''s disease', NOW()),
('G62.9', 'Polyneuropathy, unspecified', NOW()),
('G89.29', 'Other chronic pain', NOW()),

-- Diseases of the eye and adnexa (H00-H59)
('H10.9', 'Unspecified conjunctivitis', NOW()),
('H25.9', 'Unspecified age-related cataract', NOW()),
('H52.4', 'Presbyopia', NOW()),
('H40.9', 'Unspecified glaucoma', NOW()),

-- Diseases of the ear and mastoid process (H60-H95)
('H60.90', 'Unspecified otitis externa, unspecified ear', NOW()),
('H66.90', 'Otitis media, unspecified, unspecified ear', NOW()),
('H61.20', 'Impacted cerumen, unspecified ear', NOW()),
('H90.5', 'Unspecified sensorineural hearing loss', NOW()),

-- Diseases of the circulatory system (I00-I99)
('I10', 'Essential (primary) hypertension', NOW()),
('I11.9', 'Hypertensive heart disease without heart failure', NOW()),
('I25.10', 'Atherosclerotic heart disease of native coronary artery without angina pectoris', NOW()),
('I48.91', 'Unspecified atrial fibrillation', NOW()),
('I50.9', 'Heart failure, unspecified', NOW()),
('I63.9', 'Cerebral infarction, unspecified', NOW()),
('I80.20', 'Phlebitis and thrombophlebitis of unspecified deep vessels of unspecified lower extremity', NOW()),
('I83.90', 'Varicose veins of unspecified lower extremity without ulcer or inflammation', NOW()),

-- Diseases of the respiratory system (J00-J99)
('J00', 'Acute nasopharyngitis [common cold]', NOW()),
('J01.90', 'Acute sinusitis, unspecified', NOW()),
('J02.9', 'Acute pharyngitis, unspecified', NOW()),
('J03.90', 'Acute tonsillitis, unspecified', NOW()),
('J06.9', 'Acute upper respiratory infection, unspecified', NOW()),
('J18.9', 'Pneumonia, unspecified organism', NOW()),
('J20.9', 'Acute bronchitis, unspecified', NOW()),
('J30.9', 'Allergic rhinitis, unspecified', NOW()),
('J44.9', 'Chronic obstructive pulmonary disease, unspecified', NOW()),
('J45.909', 'Unspecified asthma, uncomplicated', NOW()),
('J45.20', 'Mild intermittent asthma, uncomplicated', NOW()),
('J96.00', 'Acute respiratory failure, unspecified whether with hypoxia or hypercapnia', NOW()),

-- Diseases of the digestive system (K00-K95)
('K02.9', 'Dental caries, unspecified', NOW()),
('K21.9', 'Gastro-esophageal reflux disease without esophagitis', NOW()),
('K29.70', 'Gastritis, unspecified, without bleeding', NOW()),
('K30', 'Functional dyspepsia', NOW()),
('K35.80', 'Unspecified acute appendicitis', NOW()),
('K57.90', 'Diverticulosis of intestine, part unspecified, without perforation or abscess without bleeding', NOW()),
('K59.00', 'Constipation, unspecified', NOW()),
('K62.5', 'Hemorrhage of anus and rectum', NOW()),
('K76.0', 'Fatty (change of) liver, not elsewhere classified', NOW()),

-- Diseases of the skin and subcutaneous tissue (L00-L99)
('L03.90', 'Cellulitis, unspecified', NOW()),
('L20.9', 'Atopic dermatitis, unspecified', NOW()),
('L23.9', 'Allergic contact dermatitis, unspecified cause', NOW()),
('L30.9', 'Dermatitis, unspecified', NOW()),
('L40.9', 'Psoriasis, unspecified', NOW()),
('L50.9', 'Urticaria, unspecified', NOW()),
('L70.0', 'Acne vulgaris', NOW()),
('L72.0', 'Epidermal cyst', NOW()),
('L98.9', 'Disorder of the skin and subcutaneous tissue, unspecified', NOW()),

-- Diseases of the musculoskeletal system and connective tissue (M00-M99)
('M06.9', 'Rheumatoid arthritis, unspecified', NOW()),
('M15.9', 'Polyosteoarthritis, unspecified', NOW()),
('M19.90', 'Unspecified osteoarthritis, unspecified site', NOW()),
('M25.50', 'Pain in unspecified joint', NOW()),
('M54.5', 'Low back pain', NOW()),
('M54.2', 'Cervicalgia', NOW()),
('M54.9', 'Dorsalgia, unspecified', NOW()),
('M62.81', 'Muscle weakness (generalized)', NOW()),
('M79.1', 'Myalgia', NOW()),
('M79.7', 'Fibromyalgia', NOW()),
('M81.0', 'Age-related osteoporosis without current pathological fracture', NOW()),

-- Diseases of the genitourinary system (N00-N99)
('N18.9', 'Chronic kidney disease, unspecified', NOW()),
('N20.0', 'Calculus of kidney', NOW()),
('N30.90', 'Cystitis, unspecified without hematuria', NOW()),
('N39.0', 'Urinary tract infection, site not specified', NOW()),
('N40.0', 'Benign prostatic hyperplasia without lower urinary tract symptoms', NOW()),
('N76.0', 'Acute vaginitis', NOW()),
('N92.6', 'Irregular menstruation, unspecified', NOW()),
('N95.1', 'Menopausal and female climacteric states', NOW()),

-- Pregnancy, childbirth and the puerperium (O00-O9A)
('O09.90', 'Supervision of high risk pregnancy, unspecified, unspecified trimester', NOW()),
('O26.90', 'Pregnancy related conditions, unspecified, unspecified trimester', NOW()),
('O80', 'Encounter for full-term uncomplicated delivery', NOW()),

-- Symptoms, signs and abnormal clinical findings (R00-R99)
('R05.9', 'Cough, unspecified', NOW()),
('R06.02', 'Shortness of breath', NOW()),
('R07.9', 'Chest pain, unspecified', NOW()),
('R10.9', 'Unspecified abdominal pain', NOW()),
('R10.84', 'Generalized abdominal pain', NOW()),
('R11.0', 'Nausea', NOW()),
('R11.2', 'Nausea with vomiting, unspecified', NOW()),
('R19.7', 'Diarrhea, unspecified', NOW()),
('R21', 'Rash and other nonspecific skin eruption', NOW()),
('R42', 'Dizziness and giddiness', NOW()),
('R50.9', 'Fever, unspecified', NOW()),
('R51.9', 'Headache, unspecified', NOW()),
('R53.83', 'Other fatigue', NOW()),
('R55', 'Syncope and collapse', NOW()),
('R60.9', 'Edema, unspecified', NOW()),
('R63.4', 'Abnormal weight loss', NOW()),
('R73.03', 'Prediabetes', NOW()),

-- Injury, poisoning and certain other consequences of external causes (S00-T88)
('S01.90XA', 'Unspecified open wound of unspecified part of head, initial encounter', NOW()),
('S06.0X0A', 'Concussion without loss of consciousness, initial encounter', NOW()),
('S09.90XA', 'Unspecified injury of head, initial encounter', NOW()),
('S52.90XA', 'Unspecified fracture of unspecified forearm, initial encounter for closed fracture', NOW()),
('S61.409A', 'Unspecified open wound of unspecified hand, initial encounter', NOW()),
('S72.90XA', 'Unspecified fracture of unspecified femur, initial encounter for closed fracture', NOW()),
('S93.40XA', 'Sprain of unspecified ligament of unspecified ankle, initial encounter', NOW()),
('T14.90XA', 'Injury, unspecified, initial encounter', NOW()),
('T78.40XA', 'Allergy, unspecified, initial encounter', NOW()),
('T88.7XXA', 'Unspecified adverse effect of drug or medicament, initial encounter', NOW()),

-- Factors influencing health status and contact with health services (Z00-Z99)
('Z00.00', 'Encounter for general adult medical examination without abnormal findings', NOW()),
('Z00.129', 'Encounter for routine child health examination without abnormal findings', NOW()),
('Z01.419', 'Encounter for gynecological examination without abnormal findings', NOW()),
('Z23', 'Encounter for immunization', NOW()),
('Z34.90', 'Encounter for supervision of normal pregnancy, unspecified trimester', NOW()),
('Z51.11', 'Encounter for antineoplastic chemotherapy', NOW()),
('Z71.3', 'Dietary counseling and surveillance', NOW()),
('Z79.4', 'Long term (current) use of insulin', NOW()),
('Z79.899', 'Other long term (current) drug therapy', NOW()),
('Z79.01', 'Long term (current) use of anticoagulants', NOW()),
('Z87.891', 'Personal history of nicotine dependence', NOW()),
('Z96.1', 'Presence of intraocular lens', NOW());
