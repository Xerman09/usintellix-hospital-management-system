-- 311_blood_inventory_units_and_cold_chain.sql
-- Blood Bank Management (Part 2): Blood Product Inventory & Cold-Chain Tracking
-- Tracks individual blood unit bags:
--   - Packed Red Blood Cells (PRBC: 1°C to 6°C, 35-42 days)
--   - Fresh Frozen Plasma (FFP: <= -18°C, 1 year / 365 days)
--   - Platelet Concentrates / Apheresis (Platelets: 20°C to 24°C with continuous agitation, 5 days)
--   - Cryoprecipitate (Cryo: <= -18°C, 1 year)
--   - Whole Blood (WB: 1°C to 6°C, 21-35 days)
-- Features refrigerator/freezer shelf locations, cold-chain temperature monitoring, and automatic expiration quarantine.
-- Safe to re-run.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS blood_storage_locations (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,                            -- e.g. "Main Blood Bank Refrigerator 1", "Plasma Deep Freezer #2", "Platelet Agitator Bay"
    equipment_type ENUM('refrigerator', 'deep_freezer', 'platelet_agitator', 'transport_cooler') NOT NULL,
    target_temp_c DECIMAL(4,1) NOT NULL,                   -- e.g. 4.0, -20.0, 22.0
    min_temp_c DECIMAL(4,1) NOT NULL,                      -- e.g. 1.0, -30.0, 20.0
    max_temp_c DECIMAL(4,1) NOT NULL,                      -- e.g. 6.0, -18.0, 24.0
    current_temp_c DECIMAL(4,1) DEFAULT NULL,
    last_temp_check_at DATETIME DEFAULT NULL,
    location_description VARCHAR(150) DEFAULT NULL,        -- Ground Floor Blood Bank Room 102
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blood_inventory_units (
    id INT NOT NULL AUTO_INCREMENT,
    unit_number VARCHAR(32) NOT NULL,                      -- Standard ISBT 128 / Hospital DIN: W26-YYYY-XXXXX
    donor_id INT DEFAULT NULL,                             -- blood_donors.id (if drawn in-house)
    collection_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    
    -- Blood Component Classification:
    component_type ENUM('prbc', 'ffp', 'platelets', 'cryoprecipitate', 'whole_blood') NOT NULL,
    volume_ml SMALLINT NOT NULL DEFAULT 450,
    
    -- Blood Group:
    abo_group ENUM('A', 'B', 'AB', 'O') NOT NULL,
    rh_factor ENUM('positive', 'negative') NOT NULL,
    kell_antigen ENUM('positive', 'negative', 'unknown') NOT NULL DEFAULT 'unknown',
    
    -- Cold-Chain Preservation Parameters:
    storage_location_id INT DEFAULT NULL,                  -- blood_storage_locations.id
    shelf_slot VARCHAR(50) DEFAULT NULL,                   -- e.g. "Shelf A - Rack 3"
    storage_temp_min_c DECIMAL(4,1) NOT NULL,              -- 1.0 (PRBC), -30.0 (FFP), 20.0 (Plt)
    storage_temp_max_c DECIMAL(4,1) NOT NULL,              -- 6.0 (PRBC), -18.0 (FFP), 24.0 (Plt)
    requires_continuous_agitation TINYINT(1) NOT NULL DEFAULT 0, -- 1 for Platelets
    is_cold_chain_breached TINYINT(1) NOT NULL DEFAULT 0,
    cold_chain_breach_notes VARCHAR(255) DEFAULT NULL,
    
    -- Inventory Lifecycle Status:
    status ENUM('available', 'crossmatched_reserved', 'issued', 'transfused', 'quarantined', 'discarded', 'expired') NOT NULL DEFAULT 'available',
    quarantine_reason VARCHAR(255) DEFAULT NULL,
    quarantined_at DATETIME DEFAULT NULL,
    
    -- Crossmatch / Allocation:
    reserved_for_patient_id INT DEFAULT NULL,              -- patients.id
    reserved_until DATETIME DEFAULT NULL,
    
    created_at DATETIME NOT NULL,
    updated_at DATETIME DEFAULT NULL,
    
    PRIMARY KEY (id),
    UNIQUE KEY uq_blood_unit_number (unit_number),
    KEY idx_blood_unit_component (component_type, status),
    KEY idx_blood_unit_abo_rh (abo_group, rh_factor),
    KEY idx_blood_unit_expiry (expiration_date, status),
    KEY idx_blood_unit_storage (storage_location_id, status),
    KEY idx_blood_unit_reserved (reserved_for_patient_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blood_cold_chain_logs (
    id INT NOT NULL AUTO_INCREMENT,
    storage_location_id INT NOT NULL,
    recorded_temp_c DECIMAL(4,1) NOT NULL,
    is_in_range TINYINT(1) NOT NULL DEFAULT 1,
    alert_triggered TINYINT(1) NOT NULL DEFAULT 0,
    logged_by INT DEFAULT NULL,                            -- users.id
    logged_at DATETIME NOT NULL,
    notes VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_cold_chain_loc (storage_location_id, logged_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Counter for Blood Unit DIN numbers: W26-YYYY-XXXXX
CREATE TABLE IF NOT EXISTS blood_unit_counters (
    prefix_year INT NOT NULL,
    last_seq INT NOT NULL DEFAULT 0,
    PRIMARY KEY (prefix_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default standard blood bank cold storage units
INSERT INTO blood_storage_locations (name, equipment_type, target_temp_c, min_temp_c, max_temp_c, current_temp_c, last_temp_check_at, location_description, is_active, created_at)
VALUES 
('Main Blood Refrigerator #1 (PRBC)', 'refrigerator', 4.0, 1.0, 6.0, 3.8, NOW(), 'Blood Bank Main Laboratory - Bay A', 1, NOW()),
('Reserve Blood Refrigerator #2 (Whole Blood)', 'refrigerator', 4.0, 1.0, 6.0, 4.2, NOW(), 'Blood Bank Main Laboratory - Bay A', 1, NOW()),
('Plasma Deep Freezer -30°C #1 (FFP/Cryo)', 'deep_freezer', -25.0, -35.0, -18.0, -26.5, NOW(), 'Blood Bank Component Storage - Room 104', 1, NOW()),
('Platelet Agitator & Incubator #1', 'platelet_agitator', 22.0, 20.0, 24.0, 22.1, NOW(), 'Blood Bank Processing Suite - Agitator Counter 1', 1, NOW()),
('Emergency Trauma Cooler Pack A', 'transport_cooler', 3.0, 1.0, 6.0, 3.5, NOW(), 'ER Resuscitation Bay Rapid Deployment Cart', 1, NOW())
ON DUPLICATE KEY UPDATE is_active = 1;
