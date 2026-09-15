-- Seed: warehouses
-- Starter storage locations for the Inventory > Management screen, so
-- the warehouse picker isn't empty on a fresh install. Idempotent via
-- INSERT IGNORE against warehouses.name's UNIQUE constraint.

INSERT IGNORE INTO warehouses (name, is_active, created_at) VALUES
('On Site', 1, NOW()),
('Main Pharmacy', 1, NOW()),
('Off Site Storage', 1, NOW());
