-- ========================================================
-- Seed: 033_seed_medicines.sql
-- Module: Drug Inventory & Pharmacy
-- Purpose: Seed essential medicines across major therapeutic classes
--          into `drugs` table, along with sample lots and stock receipts.
--          Idempotent: inserts only if the generic and brand name
--          combination does not already exist.
-- ========================================================

INSERT INTO drugs (
    name, generic_name, brand_name, strength, dosage_form_id, route_id,
    dispensing_unit_id, package_unit_id, package_quantity, category_id,
    manufacturer, preferred_supplier_id, registration_number, barcode,
    controlled_class, requires_prescription, storage_condition,
    is_high_alert, is_lasa, unit_cost, selling_price,
    min_level_global, max_level_global, product_type, is_active,
    allow_inventory, allow_multiple_lots, allow_combining_lots,
    created_at, created_by
)
SELECT 'Amoxicillin 500 mg Capsule (Amoxil)', 'Amoxicillin', 'Amoxil', '500 mg', 5, 3, 9, 19, 100, 4, 'GlaxoSmithKline', 7, 'DR-XY21001', '4800000000101', 'None', 1, 'Room temperature (15-30 °C)', 0, 0, 4.50, 8.00, 200, 2000, 'Drug', 1, 1, 1, 0, NOW(), 3
WHERE NOT EXISTS (SELECT 1 FROM drugs WHERE generic_name = 'Amoxicillin' AND brand_name = 'Amoxil' AND deleted_at IS NULL);

INSERT INTO drugs (
    name, generic_name, brand_name, strength, dosage_form_id, route_id,
    dispensing_unit_id, package_unit_id, package_quantity, category_id,
    manufacturer, preferred_supplier_id, registration_number, barcode,
    controlled_class, requires_prescription, storage_condition,
    is_high_alert, is_lasa, unit_cost, selling_price,
    min_level_global, max_level_global, product_type, is_active,
    allow_inventory, allow_multiple_lots, allow_combining_lots,
    created_at, created_by
)
SELECT 'Amoxicillin + Clavulanic Acid 625 mg Film-coated Tablet (Augmentin)', 'Amoxicillin + Clavulanic Acid', 'Augmentin', '625 mg', 2, 3, 8, 19, 14, 4, 'GlaxoSmithKline', 7, 'DR-XY21002', '4800000000102', 'None', 1, 'Protect from light', 0, 0, 22.00, 38.00, 140, 1400, 'Drug', 1, 1, 1, 0, NOW(), 3
WHERE NOT EXISTS (SELECT 1 FROM drugs WHERE generic_name = 'Amoxicillin + Clavulanic Acid' AND brand_name = 'Augmentin' AND deleted_at IS NULL);

INSERT INTO drugs (
    name, generic_name, brand_name, strength, dosage_form_id, route_id,
    dispensing_unit_id, package_unit_id, package_quantity, category_id,
    manufacturer, preferred_supplier_id, registration_number, barcode,
    controlled_class, requires_prescription, storage_condition,
    is_high_alert, is_lasa, unit_cost, selling_price,
    min_level_global, max_level_global, product_type, is_active,
    allow_inventory, allow_multiple_lots, allow_combining_lots,
    created_at, created_by
)
SELECT 'Cefalexin 500 mg Capsule (Ceporex)', 'Cefalexin', 'Ceporex', '500 mg', 5, 3, 9, 19, 100, 4, 'Unilab', 8, 'DR-XY21003', '4800000000103', 'None', 1, 'Room temperature (15-30 °C)', 0, 0, 6.00, 12.00, 100, 1000, 'Drug', 1, 1, 1, 0, NOW(), 3
WHERE NOT EXISTS (SELECT 1 FROM drugs WHERE generic_name = 'Cefalexin' AND brand_name = 'Ceporex' AND deleted_at IS NULL);

INSERT INTO drugs (
    name, generic_name, brand_name, strength, dosage_form_id, route_id,
    dispensing_unit_id, package_unit_id, package_quantity, category_id,
    manufacturer, preferred_supplier_id, registration_number, barcode,
    controlled_class, requires_prescription, storage_condition,
    is_high_alert, is_lasa, unit_cost, selling_price,
    min_level_global, max_level_global, product_type, is_active,
    allow_inventory, allow_multiple_lots, allow_combining_lots,
    created_at, created_by
)
SELECT 'Azithromycin 500 mg Film-coated Tablet (Zithromax)', 'Azithromycin', 'Zithromax', '500 mg', 2, 3, 8, 19, 3, 4, 'Pfizer', 10, 'DR-XY21004', '4800000000104', 'None', 1, 'Room temperature (15-30 °C)', 0, 0, 45.00, 80.00, 60, 600, 'Drug', 1, 1, 1, 0, NOW(), 3
WHERE NOT EXISTS (SELECT 1 FROM drugs WHERE generic_name = 'Azithromycin' AND brand_name = 'Zithromax' AND deleted_at IS NULL);

INSERT INTO drugs (
    name, generic_name, brand_name, strength, dosage_form_id, route_id,
    dispensing_unit_id, package_unit_id, package_quantity, category_id,
    manufacturer, preferred_supplier_id, registration_number, barcode,
    controlled_class, requires_prescription, storage_condition,
    is_high_alert, is_lasa, unit_cost, selling_price,
    min_level_global, max_level_global, product_type, is_active,
    allow_inventory, allow_multiple_lots, allow_combining_lots,
    created_at, created_by
)
SELECT 'Ceftriaxone 1 g Powder for Injection (Rocephin)', 'Ceftriaxone', 'Rocephin', '1 g', 13, 6, 11, 19, 10, 4, 'Roche', 7, 'DR-XY21005', '4800000000105', 'None', 1, 'Protect from light', 0, 0, 85.00, 160.00, 50, 500, 'Drug', 1, 1, 1, 0, NOW(), 3
WHERE NOT EXISTS (SELECT 1 FROM drugs WHERE generic_name = 'Ceftriaxone' AND brand_name = 'Rocephin' AND deleted_at IS NULL);

INSERT INTO drugs (
    name, generic_name, brand_name, strength, dosage_form_id, route_id,
    dispensing_unit_id, package_unit_id, package_quantity, category_id,
    manufacturer, preferred_supplier_id, registration_number, barcode,
    controlled_class, requires_prescription, storage_condition,
    is_high_alert, is_lasa, unit_cost, selling_price,
    min_level_global, max_level_global, product_type, is_active,
    allow_inventory, allow_multiple_lots, allow_combining_lots,
    created_at, created_by
)
SELECT 'Ibuprofen 200 mg Softgel Capsule (Advil)', 'Ibuprofen', 'Advil', '200 mg', 6, 3, 9, 19, 100, 2, 'Haleon', 8, 'DR-XY21006', '4800000000106', 'None', 0, 'Room temperature (15-30 °C)', 0, 0, 3.50, 7.00, 150, 1500, 'Drug', 1, 1, 1, 0, NOW(), 3
WHERE NOT EXISTS (SELECT 1 FROM drugs WHERE generic_name = 'Ibuprofen' AND brand_name = 'Advil' AND deleted_at IS NULL);

INSERT INTO drugs (
    name, generic_name, brand_name, strength, dosage_form_id, route_id,
    dispensing_unit_id, package_unit_id, package_quantity, category_id,
    manufacturer, preferred_supplier_id, registration_number, barcode,
    controlled_class, requires_prescription, storage_condition,
    is_high_alert, is_lasa, unit_cost, selling_price,
    min_level_global, max_level_global, product_type, is_active,
    allow_inventory, allow_multiple_lots, allow_combining_lots,
    created_at, created_by
)
SELECT 'Mefenamic Acid 500 mg Capsule (Ponstan)', 'Mefenamic Acid', 'Ponstan', '500 mg', 5, 3, 9, 19, 100, 2, 'Pfizer', 8, 'DR-XY21007', '4800000000107', 'None', 1, 'Room temperature (15-30 °C)', 0, 0, 5.00, 9.50, 150, 1500, 'Drug', 1, 1, 1, 0, NOW(), 3
WHERE NOT EXISTS (SELECT 1 FROM drugs WHERE generic_name = 'Mefenamic Acid' AND brand_name = 'Ponstan' AND deleted_at IS NULL);

INSERT INTO drugs (
    name, generic_name, brand_name, strength, dosage_form_id, route_id,
    dispensing_unit_id, package_unit_id, package_quantity, category_id,
    manufacturer, preferred_supplier_id, registration_number, barcode,
    controlled_class, requires_prescription, storage_condition,
    is_high_alert, is_lasa, unit_cost, selling_price,
    min_level_global, max_level_global, product_type, is_active,
    allow_inventory, allow_multiple_lots, allow_combining_lots,
    created_at, created_by
)
SELECT 'Amlodipine Besilate 5 mg Tablet (Norvasc)', 'Amlodipine Besilate', 'Norvasc', '5 mg', 1, 3, 8, 19, 100, 8, 'Pfizer', 7, 'DR-XY21009', '4800000000109', 'None', 1, 'Room temperature (15-30 °C)', 0, 0, 2.50, 6.00, 200, 2500, 'Drug', 1, 1, 1, 0, NOW(), 3
WHERE NOT EXISTS (SELECT 1 FROM drugs WHERE generic_name = 'Amlodipine Besilate' AND brand_name = 'Norvasc' AND deleted_at IS NULL);

INSERT INTO drugs (
    name, generic_name, brand_name, strength, dosage_form_id, route_id,
    dispensing_unit_id, package_unit_id, package_quantity, category_id,
    manufacturer, preferred_supplier_id, registration_number, barcode,
    controlled_class, requires_prescription, storage_condition,
    is_high_alert, is_lasa, unit_cost, selling_price,
    min_level_global, max_level_global, product_type, is_active,
    allow_inventory, allow_multiple_lots, allow_combining_lots,
    created_at, created_by
)
SELECT 'Losartan Potassium 50 mg Film-coated Tablet (Cozaar)', 'Losartan Potassium', 'Cozaar', '50 mg', 2, 3, 8, 19, 100, 8, 'Organon', 7, 'DR-XY21010', '4800000000110', 'None', 1, 'Protect from light', 0, 0, 3.00, 7.50, 200, 2500, 'Drug', 1, 1, 1, 0, NOW(), 3
WHERE NOT EXISTS (SELECT 1 FROM drugs WHERE generic_name = 'Losartan Potassium' AND brand_name = 'Cozaar' AND deleted_at IS NULL);

INSERT INTO drugs (
    name, generic_name, brand_name, strength, dosage_form_id, route_id,
    dispensing_unit_id, package_unit_id, package_quantity, category_id,
    manufacturer, preferred_supplier_id, registration_number, barcode,
    controlled_class, requires_prescription, storage_condition,
    is_high_alert, is_lasa, unit_cost, selling_price,
    min_level_global, max_level_global, product_type, is_active,
    allow_inventory, allow_multiple_lots, allow_combining_lots,
    created_at, created_by
)
SELECT 'Metformin Hydrochloride 500 mg Film-coated Tablet (Glucophage)', 'Metformin Hydrochloride', 'Glucophage', '500 mg', 2, 3, 8, 19, 100, 9, 'Merck', 7, 'DR-XY21012', '4800000000112', 'None', 1, 'Room temperature (15-30 °C)', 0, 0, 2.00, 5.00, 300, 3000, 'Drug', 1, 1, 1, 0, NOW(), 3
WHERE NOT EXISTS (SELECT 1 FROM drugs WHERE generic_name = 'Metformin Hydrochloride' AND brand_name = 'Glucophage' AND deleted_at IS NULL);

INSERT INTO drugs (
    name, generic_name, brand_name, strength, dosage_form_id, route_id,
    dispensing_unit_id, package_unit_id, package_quantity, category_id,
    manufacturer, preferred_supplier_id, registration_number, barcode,
    controlled_class, requires_prescription, storage_condition,
    is_high_alert, is_lasa, unit_cost, selling_price,
    min_level_global, max_level_global, product_type, is_active,
    allow_inventory, allow_multiple_lots, allow_combining_lots,
    created_at, created_by
)
SELECT 'Atorvastatin Calcium 20 mg Film-coated Tablet (Lipitor)', 'Atorvastatin Calcium', 'Lipitor', '20 mg', 2, 3, 8, 19, 30, 10, 'Viatris', 7, 'DR-XY21015', '4800000000115', 'None', 1, 'Room temperature (15-30 °C)', 0, 0, 8.00, 18.00, 150, 1500, 'Drug', 1, 1, 1, 0, NOW(), 3
WHERE NOT EXISTS (SELECT 1 FROM drugs WHERE generic_name = 'Atorvastatin Calcium' AND brand_name = 'Lipitor' AND deleted_at IS NULL);

INSERT INTO drugs (
    name, generic_name, brand_name, strength, dosage_form_id, route_id,
    dispensing_unit_id, package_unit_id, package_quantity, category_id,
    manufacturer, preferred_supplier_id, registration_number, barcode,
    controlled_class, requires_prescription, storage_condition,
    is_high_alert, is_lasa, unit_cost, selling_price,
    min_level_global, max_level_global, product_type, is_active,
    allow_inventory, allow_multiple_lots, allow_combining_lots,
    created_at, created_by
)
SELECT 'Omeprazole 20 mg Capsule (Losec)', 'Omeprazole', 'Losec', '20 mg', 5, 3, 9, 19, 100, 15, 'AstraZeneca', 8, 'DR-XY21018', '4800000000118', 'None', 1, 'Protect from light', 0, 0, 4.00, 9.00, 200, 2000, 'Drug', 1, 1, 1, 0, NOW(), 3
WHERE NOT EXISTS (SELECT 1 FROM drugs WHERE generic_name = 'Omeprazole' AND brand_name = 'Losec' AND deleted_at IS NULL);

INSERT INTO drugs (
    name, generic_name, brand_name, strength, dosage_form_id, route_id,
    dispensing_unit_id, package_unit_id, package_quantity, category_id,
    manufacturer, preferred_supplier_id, registration_number, barcode,
    controlled_class, requires_prescription, storage_condition,
    is_high_alert, is_lasa, unit_cost, selling_price,
    min_level_global, max_level_global, product_type, is_active,
    allow_inventory, allow_multiple_lots, allow_combining_lots,
    created_at, created_by
)
SELECT 'Salbutamol Sulfate 100 mcg/dose Metered-dose Inhaler (Ventolin Inhaler)', 'Salbutamol Sulfate', 'Ventolin Inhaler', '100 mcg/dose', 22, 12, 17, 19, 1, 13, 'GlaxoSmithKline', 7, 'DR-XY21019', '4800000000119', 'None', 1, 'Room temperature (15-30 °C)', 0, 0, 150.00, 260.00, 30, 300, 'Drug', 1, 1, 1, 0, NOW(), 3
WHERE NOT EXISTS (SELECT 1 FROM drugs WHERE generic_name = 'Salbutamol Sulfate' AND brand_name = 'Ventolin Inhaler' AND deleted_at IS NULL);

INSERT INTO drugs (
    name, generic_name, brand_name, strength, dosage_form_id, route_id,
    dispensing_unit_id, package_unit_id, package_quantity, category_id,
    manufacturer, preferred_supplier_id, registration_number, barcode,
    controlled_class, requires_prescription, storage_condition,
    is_high_alert, is_lasa, unit_cost, selling_price,
    min_level_global, max_level_global, product_type, is_active,
    allow_inventory, allow_multiple_lots, allow_combining_lots,
    created_at, created_by
)
SELECT 'Cetirizine Hydrochloride 10 mg Film-coated Tablet (Virlix)', 'Cetirizine Hydrochloride', 'Virlix', '10 mg', 2, 3, 8, 19, 100, 12, 'GSK Consumer', 8, 'DR-XY21021', '4800000000121', 'None', 0, 'Room temperature (15-30 °C)', 0, 0, 3.00, 7.00, 100, 1000, 'Drug', 1, 1, 1, 0, NOW(), 3
WHERE NOT EXISTS (SELECT 1 FROM drugs WHERE generic_name = 'Cetirizine Hydrochloride' AND brand_name = 'Virlix' AND deleted_at IS NULL);
