-- 314_dietary_prescriptions_and_meals.sql
-- Dietary and Nutrition Services (Part 1): Clinical Diet Prescriptions & Kitchen Tray Ledger
-- Features:
--   1. Clinical diet prescriptions (Regular, Diabetic/Low Carb, Low Sodium Cardiac, Renal, Pureed/Soft, Full Liquid, Clear Liquid, NPO).
--   2. Texture & liquid consistencies (IDDSI dysphagia framework: Thin, Nectar, Honey, Pudding).
--   3. Calorie, sodium, and fluid restriction parameters.
--   4. Automated food allergy alerts linking patient allergies directly to kitchen meal trays.
--   5. Kitchen tray assembly, allergy clearance verification, and delivery tracking.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS patient_diet_prescriptions (
    id INT NOT NULL AUTO_INCREMENT,
    prescription_number VARCHAR(32) NOT NULL,              -- DIET-YYYY-XXXXX
    patient_id INT NOT NULL,                               -- patients.id
    admission_id INT DEFAULT NULL,                         -- inpatient_admissions.id (if admitted)
    ward_room_bed VARCHAR(100) DEFAULT NULL,               -- e.g. "West Wing ICU - Bed 04"
    
    -- Clinical Diet Category:
    diet_category ENUM(
        'regular',              -- Standard General Hospital Diet
        'diabetic',             -- Diabetic / Consistent Carbohydrate / Low Carb
        'low_sodium',           -- Low Sodium / Cardiac / DASH (e.g. 2g Na restriction)
        'renal',                -- Renal (Low Protein, Low Potassium, Low Phosphorus, Fluid Restricted)
        'pureed_soft',          -- Dysphagia Soft / Pureed (IDDSI Level 4/5)
        'full_liquid',          -- Full Liquid (milk, strained soups, puddings)
        'clear_liquid',         -- Clear Liquid (broth, clear juices, gelatin)
        'npo',                  -- Nil Per Os (Nothing by Mouth - Pre-Op/Fasting)
        'enteral_tube',         -- Enteral Tube Feeding (Glucerna, Jevity, Osmolite)
        'low_fat',              -- Low Fat / Hepatic / Gallbladder
        'high_protein',         -- High Protein / Wound Healing / Burn Care
        'custom'                -- Custom Clinical Diet Formula
    ) NOT NULL DEFAULT 'regular',
    
    -- Dysphagia & Swallowing Consistency (IDDSI framework):
    texture_consistency ENUM(
        'regular',              -- IDDSI 7 - Regular
        'soft_bite_sized',      -- IDDSI 6 - Soft & Bite-Sized
        'minced_moist',         -- IDDSI 5 - Minced & Moist
        'pureed',               -- IDDSI 4 - Pureed
        'liquidized'            -- IDDSI 3 - Liquidized
    ) NOT NULL DEFAULT 'regular',
    
    liquid_consistency ENUM(
        'thin',                 -- IDDSI 0 - Thin Water/Juice
        'mildly_thick_nectar',  -- IDDSI 2 - Mildly Thick (Nectar)
        'moderately_thick_honey',-- IDDSI 3 - Moderately Thick (Honey)
        'extremely_thick_pudding'-- IDDSI 4 - Extremely Thick (Pudding)
    ) NOT NULL DEFAULT 'thin',
    
    -- Nutritional Constraints:
    calorie_target_kcal INT DEFAULT NULL,                  -- e.g. 1800 kcal
    sodium_limit_mg INT DEFAULT NULL,                      -- e.g. 2000 mg
    fluid_restriction_ml INT DEFAULT NULL,                 -- e.g. 1500 mL / 24h
    protein_limit_g INT DEFAULT NULL,                      -- e.g. 60g for renal non-dialysis
    potassium_limit_mg INT DEFAULT NULL,                   -- e.g. 2000 mg
    phosphorus_limit_mg INT DEFAULT NULL,                  -- e.g. 800 mg
    
    -- Clinical Notes & Restrictions:
    clinical_indication VARCHAR(255) DEFAULT NULL,         -- e.g. "Stage 4 CKD with Hyperkalemia", "Type 2 DM with Nephropathy"
    special_instructions TEXT DEFAULT NULL,                -- e.g. "Strict NPO past 22:00 for Endoscopy", "No Citrus"
    
    -- Physician & Audit Trail:
    prescribed_by INT DEFAULT NULL,                        -- users.id
    prescribing_doctor_name VARCHAR(150) NOT NULL,
    effective_from DATETIME NOT NULL,
    effective_to DATETIME DEFAULT NULL,
    
    status ENUM('active', 'completed', 'discontinued', 'suspended_npo') NOT NULL DEFAULT 'active',
    discontinued_at DATETIME DEFAULT NULL,
    discontinued_by INT DEFAULT NULL,
    discontinuation_reason VARCHAR(255) DEFAULT NULL,
    
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_diet_rx_no (prescription_number),
    KEY idx_diet_rx_patient (patient_id, status),
    KEY idx_diet_rx_admission (admission_id),
    KEY idx_diet_rx_category (diet_category, status),
    KEY idx_diet_rx_effective (effective_from, effective_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dietary_meal_trays (
    id INT NOT NULL AUTO_INCREMENT,
    tray_number VARCHAR(32) NOT NULL,                      -- TRAY-YYYY-XXXXX
    prescription_id INT NOT NULL,                          -- patient_diet_prescriptions.id
    patient_id INT NOT NULL,                               -- patients.id
    admission_id INT DEFAULT NULL,
    ward_room_bed VARCHAR(100) DEFAULT NULL,
    
    meal_date DATE NOT NULL,
    meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack_am', 'snack_pm', 'snack_hs') NOT NULL,
    
    -- Snapshot of prescribed diet for the kitchen prep ticket:
    diet_category VARCHAR(50) NOT NULL,
    texture_consistency VARCHAR(50) NOT NULL DEFAULT 'regular',
    liquid_consistency VARCHAR(50) NOT NULL DEFAULT 'thin',
    
    -- Automated Patient Allergy Alerts Linked to Tray:
    has_food_allergies TINYINT(1) NOT NULL DEFAULT 0,
    allergy_alerts TEXT DEFAULT NULL,                      -- JSON / comma list of active allergens e.g. "Peanuts (Anaphylaxis), Shellfish"
    
    -- Tray Lifecycle Status:
    status ENUM(
        'scheduled',            -- Scheduled for preparation
        'prep_in_kitchen',      -- Currently being cooked/portioned
        'tray_assembled',       -- Tray assembled on cart, ready for delivery
        'in_transit',           -- Transporting to ward
        'delivered',            -- Confirmed delivered to bedside
        'patient_refused',      -- Patient declined meal
        'held_npo'              -- Tray held due to active NPO status
    ) NOT NULL DEFAULT 'scheduled',
    
    -- Kitchen Quality & Allergy Safety Sign-Off:
    allergy_cleared_by_kitchen TINYINT(1) NOT NULL DEFAULT 0,
    kitchen_prep_notes TEXT DEFAULT NULL,                  -- e.g. "Prepared in allergen-free bay with gluten-free ingredients"
    prepared_by VARCHAR(150) DEFAULT NULL,                 -- Kitchen cook / dietary tech
    
    -- Ward Delivery:
    delivered_by VARCHAR(150) DEFAULT NULL,                -- Dietary aide / floor nurse
    delivered_at DATETIME DEFAULT NULL,
    
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_meal_tray_no (tray_number),
    KEY idx_meal_tray_date_type (meal_date, meal_type, status),
    KEY idx_meal_tray_patient (patient_id, meal_date),
    KEY idx_meal_tray_prescription (prescription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dietary_prescription_counters (
    prefix_year INT NOT NULL,
    last_seq INT NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dietary_tray_counters (
    prefix_year INT NOT NULL,
    last_seq INT NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
