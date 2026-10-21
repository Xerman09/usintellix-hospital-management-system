-- =====================================================================
-- Migration 298: Automated Duplicate Therapy Screen (Pharmacological Classes)
-- Table: pharmacological_classes
-- Purpose: Screens prescriptions in real time against pharmacological
--          classes (e.g., two NSAIDs, two Proton-Pump Inhibitors, two
--          Opioids, two Statins, two RAAS blockers, etc.) both within
--          the same prescription slip and across active prescriptions
--          co-prescribed by multiple doctors.
-- =====================================================================

CREATE TABLE IF NOT EXISTS `pharmacological_classes` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `class_code` VARCHAR(60) NOT NULL,
    `class_name` VARCHAR(160) NOT NULL,
    `therapeutic_category` VARCHAR(120) NOT NULL,
    `severity` ENUM('critical', 'high', 'moderate') NOT NULL DEFAULT 'high',
    `member_keywords_json` TEXT NOT NULL,
    `mapped_category_id` INT UNSIGNED NULL,
    `duplicate_clinical_risk` VARCHAR(500) NOT NULL,
    `clinical_recommendation` VARCHAR(500) NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_pharmacological_class_code` (`class_code`),
    INDEX `idx_pharm_class_category` (`mapped_category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `pharmacological_classes` (
    `class_code`, `class_name`, `therapeutic_category`, `severity`,
    `member_keywords_json`, `mapped_category_id`,
    `duplicate_clinical_risk`, `clinical_recommendation`
) VALUES
(
    'NSAID',
    'Non-Steroidal Anti-Inflammatory Drug (NSAID)',
    'Analgesic / Anti-inflammatory',
    'critical',
    '["ibuprofen","advil","mefenamic","ponstan","naproxen","flanax","celecoxib","celebrex","diclofenac","voltaren","ketorolac","toradol","meloxicam","mobic","indomethacin","etoricoxib","arcoxia","piroxicam","feldene","ketoprofen"]',
    2,
    'DUPLICATE NSAID THERAPY: Co-prescribing two or more NSAIDs (e.g. Ibuprofen + Mefenamic Acid/Celecoxib/Naproxen) markedly multiplies the risk of severe gastrointestinal ulceration, GI bleeding, perforation, and acute kidney injury without increasing analgesic efficacy.',
    'Discontinue one NSAID immediately. Never combine two systemic NSAIDs across prescriptions.'
),
(
    'PPI',
    'Proton-Pump Inhibitor (PPI)',
    'Gastrointestinal / Acid Suppressant',
    'high',
    '["omeprazole","losec","pantoprazole","pantoloc","esomeprazole","nexium","lansoprazole","prevacid","rabeprazole","pariet","dexlansoprazole","dexilant"]',
    null,
    'DUPLICATE PROTON-PUMP INHIBITOR (PPI) THERAPY: Co-prescribing multiple PPIs (e.g. Omeprazole + Pantoprazole/Esomeprazole) provides redundant gastric acid suppression and increases risk of hypomagnesemia, C. difficile infection, and bone fractures.',
    'Retain only a single Proton-Pump Inhibitor at the appropriate daily or twice-daily dosing regimen.'
),
(
    'ACETAMINOPHEN',
    'Para-aminophenol Analgesic (Paracetamol / Acetaminophen)',
    'Analgesic / Antipyretic',
    'critical',
    '["paracetamol","acetaminophen","biogesic","tempra","calpol","tylenol","panadol"]',
    1,
    'DUPLICATE PARACETAMOL / ACETAMINOPHEN THERAPY: Co-prescribing multiple Paracetamol-containing products creates a high risk of unintentional cumulative overdose (>4 g/day) and acute fulminant hepatotoxicity.',
    'Consolidate to a single Paracetamol preparation and verify cumulative 24-hour intake does not exceed 4,000 mg (or 75 mg/kg/day in pediatrics).'
),
(
    'OPIOID_ANALGESIC',
    'Opioid Receptor Agonist Analgesic',
    'Opioid Analgesic',
    'critical',
    '["tramadol","ultram","morphine","fentanyl","oxycodone","codeine","hydromorphone","meperidine","pethidine","buprenorphine","nalbuphine","tapentadol"]',
    3,
    'DUPLICATE OPIOID ANALGESIC THERAPY: Co-prescribing multiple opioids causes additive central nervous system depression, profound sedation, and potentially fatal respiratory depression.',
    'Avoid concurrent opioid prescriptions unless explicitly part of a specialist-managed scheduled long-acting + breakthrough pain protocol.'
),
(
    'AMINOPENICILLIN',
    'Beta-Lactam Aminopenicillin Antibiotic',
    'Antibiotic',
    'high',
    '["amoxicillin","amoxil","co-amoxiclav","augmentin","ampicillin","sulbactam","bacampicillin"]',
    null,
    'DUPLICATE BETA-LACTAM AMINOPENICILLIN THERAPY: Co-prescribing Amoxicillin with Amoxicillin-Clavulanate (Co-Amoxiclav) or Ampicillin duplicates the beta-lactam component and increases neurotoxicity, crystalluria, and severe diarrhea risk.',
    'Use either Amoxicillin OR Co-Amoxiclav alone; do not co-prescribe two aminopenicillins unless specifically dosing high-dose pediatric therapy.'
),
(
    'CEPHALOSPORIN',
    'Beta-Lactam Cephalosporin Antibiotic',
    'Antibiotic',
    'high',
    '["cefalexin","cephalexin","ceporex","cefuroxime","zinnat","ceftriaxone","rocephin","cefixime","tergecef","ceftazidime","cefepime","cefazolin","cefdinir","cefoxitin"]',
    null,
    'DUPLICATE CEPHALOSPORIN ANTIBIOTIC THERAPY: Co-prescribing two cephalosporins provides redundant beta-lactam cell-wall inhibition and increases C. difficile colitis and nephrotoxicity/seizure risk.',
    'Select a single appropriate cephalosporin agent.'
),
(
    'FLUOROQUINOLONE',
    'Fluoroquinolone Antibacterial',
    'Antibiotic',
    'critical',
    '["ciprofloxacin","ciprobay","levofloxacin","levaquin","moxifloxacin","avelox","ofloxacin","norfloxacin","delafloxacin"]',
    null,
    'DUPLICATE FLUOROQUINOLONE THERAPY: Combining two fluoroquinolones (e.g. Ciprofloxacin + Levofloxacin) markedly increases the risk of tendon rupture, QTc prolongation/torsades de pointes, peripheral neuropathy, and CNS toxicity.',
    'Discontinue one fluoroquinolone immediately.'
),
(
    'MACROLIDE',
    'Macrolide Antibiotic',
    'Antibiotic',
    'high',
    '["azithromycin","zithromax","clarithromycin","klaricid","erythromycin","roxithromycin"]',
    null,
    'DUPLICATE MACROLIDE THERAPY: Co-prescribing two macrolides (e.g. Azithromycin + Clarithromycin) causes additive QTc interval prolongation, ventricular arrhythmia risk, and hepatotoxicity.',
    'Prescribe only a single macrolide antibiotic.'
),
(
    'STATIN',
    'HMG-CoA Reductase Inhibitor (Statin)',
    'Lipid-lowering Agent',
    'critical',
    '["atorvastatin","lipitor","rosuvastatin","crestor","simvastatin","zocor","pravastatin","fluvastatin","pitavastatin","lovastatin"]',
    10,
    'DUPLICATE STATIN THERAPY: Co-prescribing two HMG-CoA reductase inhibitors (e.g. Atorvastatin + Rosuvastatin/Simvastatin) severely elevates the risk of myopathy, rhabdomyolysis, and acute renal failure.',
    'Retain only one statin medication; never combine two statins.'
),
(
    'RAAS_INHIBITOR',
    'RAAS Inhibitor (ACE Inhibitor / Angiotensin Receptor Blocker)',
    'Antihypertensive',
    'critical',
    '["losartan","cozaar","telmisartan","micardis","valsartan","diovan","irbesartan","aprove","candesartan","olmesartan","enalapril","captopril","lisinopril","ramipril","perindopril","fosinopril"]',
    null,
    'DUPLICATE RAAS BLOCKADE (ACEI / ARB): Combining two ARBs or an ACE inhibitor with an ARB significantly increases the risk of severe hyperkalemia, symptomatic hypotension, and acute kidney injury.',
    'Use a single RAAS blocker (either one ACE inhibitor OR one ARB).'
),
(
    'CCB_DHP',
    'Dihydropyridine Calcium Channel Blocker (CCB)',
    'Antihypertensive',
    'high',
    '["amlodipine","norvasc","nifedipine","calcibloc","felodipine","plendil","nicardipine","lercanidipine","nimodipine"]',
    null,
    'DUPLICATE CALCIUM CHANNEL BLOCKER THERAPY: Co-prescribing multiple dihydropyridine CCBs (e.g. Amlodipine + Nifedipine/Felodipine) leads to excessive peripheral vasodilation, profound hypotension, reflex tachycardia, and edema.',
    'Consolidate to a single Calcium Channel Blocker.'
),
(
    'BETA_BLOCKER',
    'Beta-Adrenergic Blocker',
    'Antihypertensive',
    'critical',
    '["metoprolol","betaloc","carvedilol","coreg","bisoprolol","concor","atenolol","tenormin","propranolol","inderal","nebivolol","labetalol","esmolol"]',
    null,
    'DUPLICATE BETA-BLOCKER THERAPY: Co-prescribing two beta-blockers (e.g. Metoprolol + Carvedilol/Atenolol) can precipitate severe bradycardia, AV heart block, and acute decompensated heart failure.',
    'Retain only a single beta-blocker.'
),
(
    'SULFONYLUREA',
    'Sulfonylurea Insulin Secretagogue',
    'Antidiabetic',
    'critical',
    '["gliclazide","diamicron","glimepiride","amaryl","glibenclamide","glyburide","daonil","glipizide","glucotrol"]',
    null,
    'DUPLICATE SULFONYLUREA THERAPY: Co-prescribing two sulfonylureas (e.g. Gliclazide + Glimepiride) causes synergistic pancreatic beta-cell stimulation and severe, prolonged life-threatening hypoglycemia.',
    'Use only one sulfonylurea agent.'
),
(
    'BIGUANIDE',
    'Biguanide Antidiabetic (Metformin)',
    'Antidiabetic',
    'high',
    '["metformin","glucophage"]',
    null,
    'DUPLICATE METFORMIN (BIGUANIDE) THERAPY: Prescribing multiple Metformin products risks exceeding the maximum daily dose and precipitating metformin-associated lactic acidosis (MALA).',
    'Consolidate all Metformin dosing into a single prescription line.'
),
(
    'ANTIHISTAMINE_H1',
    'H1-Receptor Antihistamine',
    'Antihistamine',
    'moderate',
    '["cetirizine","virlix","zyrtec","levocetirizine","xyzal","loratadine","claritin","desloratadine","aerius","fexofenadine","telfast","diphenhydramine","benadryl","chlorphenamine","chlorpheniramine","hydroxyzine","iterax","bilastine"]',
    12,
    'DUPLICATE H1-ANTIHISTAMINE THERAPY: Co-prescribing multiple H1-antihistamines increases CNS sedation, anticholinergic toxicity (dry mouth, urinary retention), and QTc prolongation.',
    'Use a single antihistamine agent unless explicitly stepping up under specialist urticaria protocol.'
),
(
    'SABA_BRONCHODILATOR',
    'Short-Acting Beta-2 Agonist (SABA) Bronchodilator',
    'Bronchodilator / Anti-asthma',
    'moderate',
    '["salbutamol","albuterol","ventolin","asmalin","terbutaline","bricanyl","levalbuterol","procaterol"]',
    null,
    'DUPLICATE SABA BRONCHODILATOR THERAPY: Concurrent SABA prescriptions (e.g. Salbutamol MDI + Salbutamol Nebules/Oral) can cause beta-adrenergic toxicity including tachycardia, tremors, hypokalemia, and arrhythmias.',
    'Ensure clear instructions if prescribing both inhaler and nebule so the patient does not administer both simultaneously.'
),
(
    'SYSTEMIC_CORTICOSTEROID',
    'Systemic Glucocorticoid / Corticosteroid',
    'Corticosteroid',
    'high',
    '["prednisone","deltasone","prednisolone","methylprednisolone","medrol","dexamethasone","decadron","hydrocortisone","solu-cortef","betamethasone"]',
    14,
    'DUPLICATE SYSTEMIC CORTICOSTEROID THERAPY: Co-prescribing two systemic corticosteroids (e.g. Prednisone + Dexamethasone/Methylprednisolone) causes excessive glucocorticoid toxicity, hyperglycemia, GI bleeding, and adrenal suppression.',
    'Consolidate to a single systemic corticosteroid regimen.'
),
(
    'BENZODIAZEPINE',
    'Benzodiazepine / Sedative-Hypnotic',
    'Anxiolytic / Sedative',
    'critical',
    '["diazepam","valium","lorazepam","ativan","alprazolam","xanax","clonazepam","rivotril","midazolam","dormicum","bromazepam","zolpidem","stilnox"]',
    21,
    'DUPLICATE BENZODIAZEPINE / SEDATIVE THERAPY: Co-prescribing multiple benzodiazepines or Z-drugs causes profound CNS depression, falls, delirium, and respiratory depression.',
    'Avoid concurrent benzodiazepine prescriptions.'
)
ON DUPLICATE KEY UPDATE
    `class_name` = VALUES(`class_name`),
    `therapeutic_category` = VALUES(`therapeutic_category`),
    `severity` = VALUES(`severity`),
    `member_keywords_json` = VALUES(`member_keywords_json`),
    `mapped_category_id` = VALUES(`mapped_category_id`),
    `duplicate_clinical_risk` = VALUES(`duplicate_clinical_risk`),
    `clinical_recommendation` = VALUES(`clinical_recommendation`);
