-- 310_blood_donor_registry.sql
-- Blood Bank Management (Part 1): Blood Donor Registry & Transfusion-Transmissible Infection (TTI) Screening.
-- Strict Donor Eligibility, ABO/Rh Confirmation, Questionnaire, and Serology Screening (HIV, Hep B, Hep C, Syphilis, Malaria).
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS blood_donors (
    id INT NOT NULL AUTO_INCREMENT,
    donor_number VARCHAR(32) NOT NULL,                     -- BD-YYYY-XXXXX
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100) DEFAULT NULL,
    last_name VARCHAR(100) NOT NULL,
    birthdate DATE NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(150) DEFAULT NULL,
    national_id VARCHAR(50) DEFAULT NULL,
    address TEXT DEFAULT NULL,
    
    -- Blood Grouping (Forward & Reverse Confirmed):
    abo_group ENUM('A', 'B', 'AB', 'O', 'unknown') NOT NULL DEFAULT 'unknown',
    rh_factor ENUM('positive', 'negative', 'unknown') NOT NULL DEFAULT 'unknown',
    kell_antigen ENUM('positive', 'negative', 'unknown') NOT NULL DEFAULT 'unknown',
    
    -- Physical Examination & Vital Signs:
    weight_kg DECIMAL(5,2) NOT NULL,                       -- >= 50kg standard threshold
    hemoglobin_g_dl DECIMAL(4,1) DEFAULT NULL,             -- >= 12.5 g/dL (female), >= 13.0 g/dL (male)
    blood_pressure_systolic SMALLINT DEFAULT NULL,
    blood_pressure_diastolic SMALLINT DEFAULT NULL,
    pulse_rate SMALLINT DEFAULT NULL,
    temperature_c DECIMAL(4,1) DEFAULT NULL,
    
    -- Infectious Disease / TTI Screening Results:
    hiv_screen ENUM('non_reactive', 'reactive', 'pending') NOT NULL DEFAULT 'pending',
    hbv_screen ENUM('non_reactive', 'reactive', 'pending') NOT NULL DEFAULT 'pending',      -- HBsAg
    hcv_screen ENUM('non_reactive', 'reactive', 'pending') NOT NULL DEFAULT 'pending',      -- Anti-HCV
    syphilis_screen ENUM('non_reactive', 'reactive', 'pending') NOT NULL DEFAULT 'pending', -- VDRL / RPR
    malaria_screen ENUM('non_reactive', 'reactive', 'pending') NOT NULL DEFAULT 'pending',  -- Rapid Antigen / Smear
    
    -- Screening Questionnaire & Risk History:
    has_recent_tattoo_piercing TINYINT(1) NOT NULL DEFAULT 0,
    has_recent_travel_malaria TINYINT(1) NOT NULL DEFAULT 0,
    has_high_risk_exposure TINYINT(1) NOT NULL DEFAULT 0,
    has_recent_illness TINYINT(1) NOT NULL DEFAULT 0,
    questionnaire_notes TEXT DEFAULT NULL,
    
    -- Eligibility & Deferral Status:
    eligibility_status ENUM('eligible', 'temporary_deferred', 'permanently_deferred', 'pending_screening') NOT NULL DEFAULT 'pending_screening',
    deferral_reason VARCHAR(255) DEFAULT NULL,
    deferred_until DATE DEFAULT NULL,
    
    -- Donation History:
    total_donations INT NOT NULL DEFAULT 0,
    last_donation_date DATE DEFAULT NULL,
    
    -- Audit & Clinical Sign-off:
    screened_by INT DEFAULT NULL,                          -- users.id
    screened_at DATETIME DEFAULT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_blood_donor_no (donor_number),
    KEY idx_blood_donor_abo_rh (abo_group, rh_factor),
    KEY idx_blood_donor_eligibility (eligibility_status, deferred_until),
    KEY idx_blood_donor_tti (hiv_screen, hbv_screen, hcv_screen, syphilis_screen, malaria_screen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Counter for Blood Donor Numbers: BD-YYYY-XXXXX
CREATE TABLE IF NOT EXISTS blood_donor_counters (
    prefix_year INT NOT NULL,
    last_seq INT NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
