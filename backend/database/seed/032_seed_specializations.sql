-- Seed: specializations
-- Common Philippine medical specializations, grouped as surgical /
-- anesthesiology / medical / other. Idempotent via INSERT IGNORE on the
-- UNIQUE name. Run after schema 242, then run schema 242 once more so
-- existing doctors and surgeries are matched to these by name.

INSERT IGNORE INTO specializations (name, category, description, created_at) VALUES
('General Surgery', 'surgical', 'Abdominal, hernia, breast, thyroid and soft-tissue surgery', NOW()),
('Obstetrics & Gynecology', 'surgical', 'OB-GYN: deliveries, cesarean section, gynecologic surgery', NOW()),
('Orthopedics', 'surgical', 'Bones, joints, spine and trauma', NOW()),
('Otorhinolaryngology (ENT)', 'surgical', 'Ear, nose, throat, head and neck surgery', NOW()),
('Ophthalmology', 'surgical', 'Eye surgery', NOW()),
('Urology', 'surgical', 'Kidney, bladder, prostate and male reproductive surgery', NOW()),
('Neurosurgery', 'surgical', 'Brain, spine and nerve surgery', NOW()),
('Thoracic & Cardiovascular Surgery', 'surgical', 'Heart, lung and chest surgery', NOW()),
('Plastic & Reconstructive Surgery', 'surgical', 'Reconstructive, burn and aesthetic surgery', NOW()),
('Pediatric Surgery', 'surgical', 'Surgery for infants and children', NOW()),
('Colorectal Surgery', 'surgical', 'Colon, rectum and anus', NOW()),
('Vascular Surgery', 'surgical', 'Arteries, veins and dialysis access', NOW()),
('Surgical Oncology', 'surgical', 'Cancer surgery', NOW()),
('Anesthesiology', 'anesthesiology', 'Anesthesia, sedation and perioperative care', NOW()),
('Internal Medicine', 'medical', NULL, NOW()),
('Cardiology', 'medical', NULL, NOW()),
('Pediatrics', 'medical', NULL, NOW()),
('Family Medicine', 'medical', NULL, NOW()),
('Gastroenterology', 'medical', NULL, NOW()),
('Pulmonology', 'medical', NULL, NOW()),
('Nephrology', 'medical', NULL, NOW()),
('Endocrinology', 'medical', NULL, NOW()),
('Neurology', 'medical', NULL, NOW()),
('Infectious Disease', 'medical', NULL, NOW()),
('Medical Oncology', 'medical', NULL, NOW()),
('Dermatology', 'medical', NULL, NOW()),
('Psychiatry', 'medical', NULL, NOW()),
('Rehabilitation Medicine', 'medical', NULL, NOW()),
('Emergency Medicine', 'medical', NULL, NOW()),
('Radiology', 'other', 'Imaging and interventional radiology', NOW()),
('Pathology', 'other', 'Laboratory medicine and anatomic pathology', NOW());
