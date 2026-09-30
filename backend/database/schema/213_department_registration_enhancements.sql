-- ========================================================
-- Migration: 213_department_registration_enhancements.sql
-- Module: Department Registration
-- Purpose: Adds comprehensive departmental attributes
--          including department code, classification type,
--          head of department, facility assignment, location,
--          operating hours, contact info, and status.
-- ========================================================

ALTER TABLE departments
    ADD COLUMN IF NOT EXISTS code VARCHAR(50) NULL AFTER name,
    ADD COLUMN IF NOT EXISTS type VARCHAR(100) NOT NULL DEFAULT 'Clinical' AFTER code,
    ADD COLUMN IF NOT EXISTS head_of_department_id INT NULL AFTER type,
    ADD COLUMN IF NOT EXISTS phone VARCHAR(50) NULL AFTER head_of_department_id,
    ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL AFTER phone,
    ADD COLUMN IF NOT EXISTS location VARCHAR(255) NULL AFTER email,
    ADD COLUMN IF NOT EXISTS facility_id INT NULL AFTER location,
    ADD COLUMN IF NOT EXISTS operating_hours VARCHAR(100) NULL DEFAULT '24/7' AFTER facility_id,
    ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive', 'maintenance') NOT NULL DEFAULT 'active' AFTER operating_hours,
    ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER status;

-- Add indexes for fast lookup and reporting
CREATE INDEX idx_departments_code ON departments (code);
CREATE INDEX idx_departments_type ON departments (type);
CREATE INDEX idx_departments_facility ON departments (facility_id);
CREATE INDEX idx_departments_head ON departments (head_of_department_id);
CREATE INDEX idx_departments_status ON departments (status);

-- Seed comprehensive hospital departments if only default row exists
UPDATE departments 
SET code = 'ADMIN', 
    type = 'Administrative', 
    location = 'Executive Wing, 4th Floor', 
    operating_hours = 'Mon - Fri 08:00 - 17:00',
    description = 'Hospital Executive Leadership, General Administration, Legal, and Compliance'
WHERE name = 'Administration' AND (code IS NULL OR code = '');

INSERT INTO departments (name, code, type, location, operating_hours, status, description, created_at)
SELECT 'Emergency Medicine', 'EMERG', 'Emergency', 'Ground Floor - Emergency Pavilion', '24/7', 'active', 'Level-1 Emergency and Trauma Care, Resuscitation, and Triage', NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'EMERG' OR name = 'Emergency Medicine');

INSERT INTO departments (name, code, type, location, operating_hours, status, description, created_at)
SELECT 'Internal Medicine', 'INTMED', 'Clinical', 'Tower B - 2nd Floor', 'Mon - Sat 08:00 - 18:00', 'active', 'Adult Comprehensive Primary Care, Chronic Disease Management, and Diagnostics', NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'INTMED' OR name = 'Internal Medicine');

INSERT INTO departments (name, code, type, location, operating_hours, status, description, created_at)
SELECT 'Cardiology', 'CARD', 'Clinical', 'Heart & Vascular Center - 3rd Floor', 'Mon - Fri 08:00 - 17:00', 'active', 'Invasive and Non-Invasive Cardiovascular Care, Echocardiography, and Cardiac Rehab', NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'CARD' OR name = 'Cardiology');

INSERT INTO departments (name, code, type, location, operating_hours, status, description, created_at)
SELECT 'Pediatrics', 'PEDI', 'Clinical', 'Children Wing - 2nd Floor', 'Mon - Sat 08:00 - 18:00', 'active', 'Neonatal, Infant, Child, and Adolescent Healthcare and Vaccinations', NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'PEDI' OR name = 'Pediatrics');

INSERT INTO departments (name, code, type, location, operating_hours, status, description, created_at)
SELECT 'General Surgery', 'SURG', 'Surgical', 'Surgical Complex - 4th Floor', '24/7 (Elective Mon-Fri)', 'active', 'Minimally Invasive Laparoscopy, Trauma Surgeries, and Perioperative Care', NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'SURG' OR name = 'General Surgery');

INSERT INTO departments (name, code, type, location, operating_hours, status, description, created_at)
SELECT 'Intensive Care Unit (ICU)', 'ICU', 'Inpatient', 'Critical Care Wing - 3rd Floor', '24/7', 'active', 'High-acuity hemodynamic monitoring, mechanical ventilation, and multi-organ life support', NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'ICU' OR name = 'Intensive Care Unit (ICU)');

INSERT INTO departments (name, code, type, location, operating_hours, status, description, created_at)
SELECT 'Radiology & Diagnostic Imaging', 'RAD', 'Diagnostic', 'Diagnostic Pavilion - 1st Floor', '24/7', 'active', 'MRI 3T, Multi-slice CT, Digital X-Ray, Fluoroscopy, and Ultrasound', NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'RAD' OR name = 'Radiology & Diagnostic Imaging');

INSERT INTO departments (name, code, type, location, operating_hours, status, description, created_at)
SELECT 'Clinical Laboratory & Pathology', 'LAB', 'Diagnostic', 'Ground Floor - Suite 108', '24/7', 'active', 'Hematology, Clinical Chemistry, Microbiology, Blood Bank, and Histopathology', NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'LAB' OR name = 'Clinical Laboratory & Pathology');

INSERT INTO departments (name, code, type, location, operating_hours, status, description, created_at)
SELECT 'Obstetrics & Gynecology (OB/GYN)', 'OBGYN', 'Clinical', 'Maternal Health - 2nd Floor', '24/7 Labor / Clinic 08:00-17:00', 'active', 'Antenatal care, labor & delivery suites, postpartum care, and gynecological surgery', NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'OBGYN' OR name = 'Obstetrics & Gynecology (OB/GYN)');

INSERT INTO departments (name, code, type, location, operating_hours, status, description, created_at)
SELECT 'Orthopedics & Sports Medicine', 'ORTHO', 'Clinical', 'Tower A - 3rd Floor', 'Mon - Fri 08:00 - 17:00', 'active', 'Joint replacement, fracture care, arthroscopy, and musculoskeletal rehabilitation', NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'ORTHO' OR name = 'Orthopedics & Sports Medicine');

INSERT INTO departments (name, code, type, location, operating_hours, status, description, created_at)
SELECT 'Pharmacy Services', 'PHARM', 'Support Services', 'Central Hospital Pharmacy - Ground Floor', '24/7', 'active', 'Inpatient dispensing, sterile IV compounding, clinical pharmacy, and outpatient dispensary', NOW()
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE code = 'PHARM' OR name = 'Pharmacy Services');
