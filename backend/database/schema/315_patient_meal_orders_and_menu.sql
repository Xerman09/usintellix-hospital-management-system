-- 315_patient_meal_orders_and_menu.sql
-- Dietary & Nutrition Services (Part 2): Patient Meal Ordering & Menu Lockout Engine
-- Features:
--   1. Hospital menu catalog with clinical nutritional specs, IDDSI textures, and allergen tags.
--   2. Patient meal orders for daily breakfast, lunch, and dinner.
--   3. Automatic lockout of prohibited foods based on patient's clinical diet plan and food allergies.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS dietary_menu_items (
    id INT NOT NULL AUTO_INCREMENT,
    item_code VARCHAR(32) NOT NULL,                        -- e.g. FOOD-001
    name VARCHAR(150) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    category ENUM('breakfast', 'entree', 'side', 'soup', 'dessert', 'beverage', 'snack') NOT NULL,
    meal_availability VARCHAR(50) NOT NULL DEFAULT 'all',  -- "breakfast", "lunch,dinner", "all"
    
    -- Nutritional Breakdown:
    calories INT NOT NULL DEFAULT 0,
    carbs_g DECIMAL(5,1) NOT NULL DEFAULT 0,
    sodium_mg INT NOT NULL DEFAULT 0,
    potassium_mg INT NOT NULL DEFAULT 0,
    phosphorus_mg INT NOT NULL DEFAULT 0,
    protein_g DECIMAL(5,1) NOT NULL DEFAULT 0,
    fat_g DECIMAL(5,1) NOT NULL DEFAULT 0,
    sugar_g DECIMAL(5,1) NOT NULL DEFAULT 0,
    
    -- IDDSI Texture & Liquid Consistencies:
    texture_level ENUM('regular', 'soft_bite_sized', 'minced_moist', 'pureed', 'liquidized') NOT NULL DEFAULT 'regular',
    liquid_level ENUM('none', 'thin', 'mildly_thick_nectar', 'moderately_thick_honey', 'extremely_thick_pudding') NOT NULL DEFAULT 'none',
    
    -- Clinical Diet Plan Eligibility (1 = Allowed, 0 = PROHIBITED / LOCKED OUT):
    allowed_regular TINYINT(1) NOT NULL DEFAULT 1,
    allowed_diabetic TINYINT(1) NOT NULL DEFAULT 1,
    allowed_low_sodium TINYINT(1) NOT NULL DEFAULT 1,
    allowed_renal TINYINT(1) NOT NULL DEFAULT 1,
    allowed_pureed_soft TINYINT(1) NOT NULL DEFAULT 1,
    allowed_full_liquid TINYINT(1) NOT NULL DEFAULT 0,
    allowed_clear_liquid TINYINT(1) NOT NULL DEFAULT 0,
    allowed_low_fat TINYINT(1) NOT NULL DEFAULT 1,
    allowed_high_protein TINYINT(1) NOT NULL DEFAULT 1,
    
    -- Allergen Ingredients:
    contains_peanuts TINYINT(1) NOT NULL DEFAULT 0,
    contains_tree_nuts TINYINT(1) NOT NULL DEFAULT 0,
    contains_shellfish TINYINT(1) NOT NULL DEFAULT 0,
    contains_fish TINYINT(1) NOT NULL DEFAULT 0,
    contains_eggs TINYINT(1) NOT NULL DEFAULT 0,
    contains_milk TINYINT(1) NOT NULL DEFAULT 0,
    contains_wheat_gluten TINYINT(1) NOT NULL DEFAULT 0,
    contains_soy TINYINT(1) NOT NULL DEFAULT 0,
    contains_sesame TINYINT(1) NOT NULL DEFAULT 0,
    
    contraindication_notes VARCHAR(255) DEFAULT NULL,      -- e.g. "High potassium; prohibited for renal patients"
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_diet_item_code (item_code),
    KEY idx_diet_item_cat (category, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS patient_meal_orders (
    id INT NOT NULL AUTO_INCREMENT,
    order_number VARCHAR(32) NOT NULL,                     -- MO-YYYY-XXXXX
    patient_id INT NOT NULL,                               -- patients.id
    prescription_id INT NOT NULL,                          -- patient_diet_prescriptions.id
    tray_id INT DEFAULT NULL,                             -- dietary_meal_trays.id (optional link)
    meal_date DATE NOT NULL,
    meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack_am', 'snack_pm', 'snack_hs') NOT NULL,
    
    ordered_by_type ENUM('patient_bedside', 'nurse', 'dietitian', 'kitchen_auto') NOT NULL DEFAULT 'patient_bedside',
    ordered_by_user_id INT DEFAULT NULL,
    ordered_by_name VARCHAR(150) DEFAULT NULL,
    
    -- Nutritional Totals calculated at ordering:
    total_calories INT NOT NULL DEFAULT 0,
    total_sodium_mg INT NOT NULL DEFAULT 0,
    total_carbs_g DECIMAL(5,1) NOT NULL DEFAULT 0,
    total_protein_g DECIMAL(5,1) NOT NULL DEFAULT 0,
    total_potassium_mg INT NOT NULL DEFAULT 0,
    
    status ENUM('submitted', 'kitchen_received', 'prep_in_kitchen', 'tray_assembled', 'delivered', 'cancelled') NOT NULL DEFAULT 'submitted',
    diet_compliance_status ENUM('compliant', 'blocked_prohibited', 'override_approved') NOT NULL DEFAULT 'compliant',
    special_requests TEXT DEFAULT NULL,
    
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_pmo_order_no (order_number),
    KEY idx_pmo_patient_date (patient_id, meal_date, meal_type),
    KEY idx_pmo_prescription (prescription_id),
    KEY idx_pmo_status (status, meal_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS patient_meal_order_items (
    id INT NOT NULL AUTO_INCREMENT,
    meal_order_id INT NOT NULL,                            -- patient_meal_orders.id
    menu_item_id INT NOT NULL,                             -- dietary_menu_items.id
    quantity INT NOT NULL DEFAULT 1,
    item_name VARCHAR(150) NOT NULL,
    item_category VARCHAR(50) NOT NULL,
    
    calories INT NOT NULL DEFAULT 0,
    sodium_mg INT NOT NULL DEFAULT 0,
    carbs_g DECIMAL(5,1) NOT NULL DEFAULT 0,
    
    is_diet_compliant TINYINT(1) NOT NULL DEFAULT 1,
    is_allergen_safe TINYINT(1) NOT NULL DEFAULT 1,
    lockout_reason VARCHAR(255) DEFAULT NULL,
    
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_pmoi_order (meal_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dietary_meal_order_counters (
    prefix_year INT NOT NULL,
    last_seq INT NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Standard Hospital Clinical Menu Items
INSERT INTO dietary_menu_items (
    item_code, name, description, category, meal_availability,
    calories, carbs_g, sodium_mg, potassium_mg, phosphorus_mg, protein_g, fat_g, sugar_g,
    texture_level, liquid_level,
    allowed_regular, allowed_diabetic, allowed_low_sodium, allowed_renal, allowed_pureed_soft, allowed_full_liquid, allowed_clear_liquid, allowed_low_fat, allowed_high_protein,
    contains_peanuts, contains_tree_nuts, contains_shellfish, contains_fish, contains_eggs, contains_milk, contains_wheat_gluten, contains_soy, contains_sesame,
    contraindication_notes, created_at
) VALUES
-- Clear Liquid & Beverages
('BEV-001', 'Clear Chicken Broth', 'Warm filtered chicken broth, fat-free', 'soup', 'all',
 25, 1.0, 140, 60, 20, 4.0, 0.0, 0.0,
 'regular', 'thin',
 1, 1, 1, 1, 1, 1, 1, 1, 1,
 0, 0, 0, 0, 0, 0, 0, 0, 0,
 'Clear liquid compliant', NOW()),

('BEV-002', '100% Apple Juice (4 oz)', 'Pasteurized clear apple juice, unsweetened', 'beverage', 'all',
 60, 14.0, 5, 120, 15, 0.1, 0.0, 13.0,
 'regular', 'thin',
 1, 0, 1, 1, 1, 1, 1, 1, 0,
 0, 0, 0, 0, 0, 0, 0, 0, 0,
 'Clear liquid compliant; limit on strict diabetic plan', NOW()),

('BEV-003', 'Lemon Gelatin Cup (Sugar-Free)', 'Clear sugar-free gelatin dessert', 'dessert', 'all',
 10, 0.0, 35, 10, 5, 1.5, 0.0, 0.0,
 'regular', 'thin',
 1, 1, 1, 1, 1, 1, 1, 1, 0,
 0, 0, 0, 0, 0, 0, 0, 0, 0,
 'Clear liquid & diabetic safe', NOW()),

('BEV-004', 'Skim Milk (8 oz)', 'Fortified Grade A fat-free milk', 'beverage', 'all',
 90, 12.0, 130, 380, 250, 8.5, 0.2, 12.0,
 'regular', 'thin',
 1, 1, 1, 0, 1, 1, 0, 1, 1,
 0, 0, 0, 0, 0, 1, 0, 0, 0,
 'Contains milk/lactose; high potassium/phos restricted on Renal diet', NOW()),

-- Full Liquid & Pureed
('SOUP-001', 'Strained Cream of Potato Soup', 'Velvety smooth strained cream soup', 'soup', 'lunch,dinner',
 140, 18.0, 280, 320, 110, 3.5, 6.0, 2.0,
 'pureed', 'moderately_thick_honey',
 1, 0, 0, 0, 1, 1, 0, 0, 0,
 0, 0, 0, 0, 0, 1, 1, 0, 0,
 'Contains milk, wheat; high potassium (potatoes) contraindicated for Renal', NOW()),

('DES-001', 'Vanilla Custard Pudding Cup', 'Smooth homestyle vanilla pudding', 'dessert', 'lunch,dinner',
 130, 21.0, 150, 140, 95, 3.0, 4.0, 15.0,
 'pureed', 'extremely_thick_pudding',
 1, 0, 1, 1, 1, 1, 0, 1, 0,
 0, 0, 0, 0, 0, 1, 0, 0, 0,
 'Full liquid & pureed compliant; high sugar locked out for Diabetic', NOW()),

('ENT-001', 'Pureed Herb Roasted Turkey with Gravy', 'IDDSI 4 smooth pureed seasoned turkey breast', 'entree', 'lunch,dinner',
 180, 6.0, 220, 210, 160, 24.0, 6.0, 0.0,
 'pureed', 'none',
 1, 1, 1, 1, 1, 0, 0, 1, 1,
 0, 0, 0, 0, 0, 0, 0, 0, 0,
 'Dysphagia pureed safe; renal and cardiac compliant', NOW()),

-- Breakfast Staples
('BKF-001', 'Steel-Cut Oatmeal with Cinnamon', 'Slow-cooked whole grain oats with cinnamon', 'breakfast', 'breakfast',
 150, 27.0, 10, 140, 110, 5.0, 2.5, 1.0,
 'soft_bite_sized', 'none',
 1, 1, 1, 1, 1, 0, 0, 1, 0,
 0, 0, 0, 0, 0, 0, 1, 0, 0,
 'Low sodium, cardiac & diabetic friendly', NOW()),

('BKF-002', 'Fluffy Scrambled Eggs (2 eggs)', 'Farm-fresh eggs cooked in olive oil spray', 'breakfast', 'breakfast',
 140, 1.5, 140, 130, 180, 12.0, 9.5, 1.0,
 'soft_bite_sized', 'none',
 1, 1, 1, 1, 1, 0, 0, 0, 1,
 0, 0, 0, 0, 1, 0, 0, 0, 0,
 'Contains eggs; excellent high protein', NOW()),

('BKF-003', 'Whole Wheat Toast with Peanut Butter', '2 slices wheat toast with creamy peanut butter', 'breakfast', 'breakfast',
 290, 28.0, 280, 280, 190, 12.0, 16.0, 4.0,
 'regular', 'none',
 1, 0, 0, 0, 0, 0, 0, 0, 1,
 1, 0, 0, 0, 0, 0, 1, 0, 0,
 'CONTAINS PEANUTS & GLUTEN; high potassium/phos contraindicated for Renal', NOW()),

-- Entrees & Mains
('ENT-002', 'Grilled Chicken Breast with White Rice', 'Skinless chicken breast with steamed jasmine rice & green beans', 'entree', 'lunch,dinner',
 380, 42.0, 180, 290, 210, 36.0, 5.0, 1.0,
 'regular', 'none',
 1, 1, 1, 1, 0, 0, 0, 1, 1,
 0, 0, 0, 0, 0, 0, 0, 0, 0,
 'Renal & Cardiac friendly (Low Sodium, controlled potassium)', NOW()),

('ENT-003', 'Baked Atlantic Salmon with Lemon & Dill', 'Fresh wild salmon with steamed broccoli', 'entree', 'lunch,dinner',
 410, 8.0, 160, 680, 290, 38.0, 24.0, 1.0,
 'regular', 'none',
 1, 1, 1, 0, 0, 0, 0, 0, 1,
 0, 0, 0, 1, 0, 0, 0, 0, 0,
 'CONTAINS FISH; high potassium (salmon/broccoli) contraindicated for Renal', NOW()),

('ENT-004', 'Garlic Butter Jumbo Shrimp with Pasta', 'Sauteed shrimp over penne pasta with garlic sauce', 'entree', 'lunch,dinner',
 460, 48.0, 620, 340, 260, 28.0, 16.0, 2.0,
 'regular', 'none',
 1, 0, 0, 0, 0, 0, 0, 0, 1,
 0, 0, 1, 0, 0, 1, 1, 0, 0,
 'CONTAINS SHELLFISH, MILK, GLUTEN; high sodium (>600mg) locked out for Cardiac', NOW()),

-- Fruits & Sides
('SIDE-001', 'Fresh Ripe Banana (Medium)', 'Whole fresh Cavendish banana', 'snack', 'all',
 105, 27.0, 1, 422, 26, 1.3, 0.3, 14.0,
 'soft_bite_sized', 'none',
 1, 0, 1, 0, 0, 0, 0, 1, 0,
 0, 0, 0, 0, 0, 0, 0, 0, 0,
 'VERY HIGH POTASSIUM (422mg) — STRICTLY CONTRAINDICATED FOR RENAL DIET', NOW()),

('SIDE-002', 'Canned Diced Peaches (In Light Juice)', 'Low-potassium peeled diced peaches', 'snack', 'all',
 60, 14.0, 5, 95, 12, 0.5, 0.1, 12.0,
 'soft_bite_sized', 'none',
 1, 0, 1, 1, 1, 0, 0, 1, 0,
 0, 0, 0, 0, 0, 0, 0, 0, 0,
 'Renal friendly fruit (Low potassium <100mg)', NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);
