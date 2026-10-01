-- =============================================
-- Seed: sample suppliers and supplier prices
-- Five fictional suppliers (Pharmacy > Suppliers) and sample "where to
-- buy" prices (Pharmacy > Supplier Prices) for Paracetamol 500 mg, if
-- that drug is in the catalog. Company names are made up, emails use the
-- reserved .example domain, and LTO numbers say SAMPLE -- safe to edit
-- or delete. License expiries and discount dates are relative to the
-- day the seed runs so every status (valid / expiring / expired /
-- none, and active / upcoming discount) has an example.
--
-- Idempotent: each supplier is inserted only if no supplier with that
-- name exists (deleted or not, so removing a sample doesn't make a
-- re-run bring it back); each price only if that supplier has no price
-- for the drug yet (one price per supplier + item). Codes (SUP-0001...) follow the app's
-- own id-based format.
-- =============================================

-- Suppliers

INSERT INTO suppliers (name, supplier_type, product_types, contact_person, phone, mobile, email, website,
                       address_line, city, province, postal_code, country, tin, fda_license_number, license_expiry,
                       payment_terms, lead_time_days, notes, is_active, created_at)
SELECT 'Luzon MedSupply Distributors Inc.', 'Distributor', 'Drug,Vaccine,Supply', 'Maria Santos', '(02) 8555 0101', '0917 555 0101',
       'orders@luzonmedsupply.example', 'https://luzonmedsupply.example', '88 Quezon Avenue', 'Quezon City', 'Metro Manila', '1100',
       'Philippines', '201-555-101-000', 'LTO-SAMPLE-0001', DATE_ADD(CURDATE(), INTERVAL 400 DAY),
       'Net 30', 3, 'Sample supplier. Delivers Mon-Sat.', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'Luzon MedSupply Distributors Inc.');

INSERT INTO suppliers (name, supplier_type, product_types, contact_person, phone, mobile, email, website,
                       address_line, city, province, postal_code, country, tin, fda_license_number, license_expiry,
                       payment_terms, lead_time_days, notes, is_active, created_at)
SELECT 'Visayas Pharma Trading Corp.', 'Wholesaler', 'Drug', 'Jose Ramirez', '(032) 255 0102', '0918 555 0102',
       'sales@visayaspharma.example', NULL, '12 Osmena Boulevard', 'Cebu City', 'Cebu', '6000',
       'Philippines', '202-555-102-000', 'LTO-SAMPLE-0002', DATE_ADD(CURDATE(), INTERVAL 30 DAY),
       'Net 15', 7, 'Sample supplier. LTO renewal due soon.', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'Visayas Pharma Trading Corp.');

INSERT INTO suppliers (name, supplier_type, product_types, contact_person, phone, mobile, email, website,
                       address_line, city, province, postal_code, country, tin, fda_license_number, license_expiry,
                       payment_terms, lead_time_days, notes, is_active, created_at)
SELECT 'Mindanao Health Products Co.', 'Distributor', 'Drug,Supply', 'Ana Dimaculangan', '(082) 224 0103', '0919 555 0103',
       'orders@mindanaohealth.example', NULL, '5 J.P. Laurel Avenue', 'Davao City', 'Davao del Sur', '8000',
       'Philippines', '203-555-103-000', 'LTO-SAMPLE-0003', DATE_SUB(CURDATE(), INTERVAL 15 DAY),
       'Cash on Delivery', 10, 'Sample supplier. LTO expired -- ask for the renewed copy before ordering.', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'Mindanao Health Products Co.');

INSERT INTO suppliers (name, supplier_type, product_types, contact_person, phone, mobile, email, website,
                       address_line, city, province, postal_code, country, tin, fda_license_number, license_expiry,
                       payment_terms, lead_time_days, notes, is_active, created_at)
SELECT 'Golden Leaf Pharmaceuticals Inc.', 'Manufacturer', 'Drug', 'Ramon Villanueva', '(02) 8633 0104', NULL,
       'trade@goldenleafpharma.example', 'https://goldenleafpharma.example', '21 Ortigas Avenue', 'Pasig', 'Metro Manila', '1600',
       'Philippines', '204-555-104-000', 'LTO-SAMPLE-0004', DATE_ADD(CURDATE(), INTERVAL 700 DAY),
       'Net 60', 14, 'Sample supplier. Direct from manufacturer; minimum 10 boxes per order.', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'Golden Leaf Pharmaceuticals Inc.');

INSERT INTO suppliers (name, supplier_type, product_types, contact_person, phone, mobile, email, website,
                       address_line, city, province, postal_code, country, tin, fda_license_number, license_expiry,
                       payment_terms, lead_time_days, notes, is_active, created_at)
SELECT 'PrimeCare Medical Equipment Inc.', 'Equipment Vendor', 'Equipment,Supply', 'Carlo Mendoza', '(02) 8810 0105', '0920 555 0105',
       'service@primecaremed.example', NULL, '7 Ayala Avenue', 'Makati', 'Metro Manila', '1226',
       'Philippines', '205-555-105-000', NULL, NULL,
       'Net 30', 5, 'Sample supplier. Equipment and consumables; no drug LTO on file.', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE name = 'PrimeCare Medical Equipment Inc.');

UPDATE suppliers SET code = CONCAT('SUP-', LPAD(id, 4, '0')) WHERE code IS NULL;


-- Supplier prices for Paracetamol 500 mg (skipped if the drug isn't in the catalog)

SET @drug_id = (
    SELECT id FROM drugs
    WHERE deleted_at IS NULL AND generic_name = 'Paracetamol' AND REPLACE(LOWER(strength), ' ', '') = '500mg'
    ORDER BY id LIMIT 1
);

SET @has_box = (SELECT COALESCE(package_quantity, 0) > 0 FROM drugs WHERE id = @drug_id);

SET @luzon = (SELECT id FROM suppliers WHERE name = 'Luzon MedSupply Distributors Inc.' AND deleted_at IS NULL LIMIT 1);
SET @visayas = (SELECT id FROM suppliers WHERE name = 'Visayas Pharma Trading Corp.' AND deleted_at IS NULL LIMIT 1);
SET @mindanao = (SELECT id FROM suppliers WHERE name = 'Mindanao Health Products Co.' AND deleted_at IS NULL LIMIT 1);
SET @golden = (SELECT id FROM suppliers WHERE name = 'Golden Leaf Pharmaceuticals Inc.' AND deleted_at IS NULL LIMIT 1);

-- Per box, 10% bulk promo running for the next 30 days (the best price)
INSERT INTO supplier_products (supplier_id, drug_id, supplier_item_code, price_basis, price, min_order_qty, price_as_of,
                               discount_type, discount_value, discount_label, discount_starts, discount_ends, discount_min_qty,
                               notes, is_active, created_at)
SELECT @luzon, @drug_id, 'LMS-PCM500', 'package', 150.00, 2, CURDATE(),
       'percent', 10.00, 'Bulk order promo', NULL, DATE_ADD(CURDATE(), INTERVAL 30 DAY), 5,
       'Sample price', 1, NOW()
FROM DUAL
WHERE @drug_id IS NOT NULL AND @has_box AND @luzon IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM supplier_products WHERE supplier_id = @luzon AND drug_id = @drug_id);

-- Per tablet, no discount
INSERT INTO supplier_products (supplier_id, drug_id, supplier_item_code, price_basis, price, min_order_qty, price_as_of,
                               discount_type, notes, is_active, created_at)
SELECT @visayas, @drug_id, 'VPT-0500', 'unit', 1.60, 200, CURDATE(),
       'none', 'Sample price', 1, NOW()
FROM DUAL
WHERE @drug_id IS NOT NULL AND @visayas IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM supplier_products WHERE supplier_id = @visayas AND drug_id = @drug_id);

-- Per box, P10 off sale starting next week (shown as upcoming)
INSERT INTO supplier_products (supplier_id, drug_id, supplier_item_code, price_basis, price, min_order_qty, price_as_of,
                               discount_type, discount_value, discount_label, discount_starts, discount_ends, discount_min_qty,
                               notes, is_active, created_at)
SELECT @mindanao, @drug_id, NULL, 'package', 145.00, NULL, CURDATE(),
       'amount', 10.00, 'Anniversary sale', DATE_ADD(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 21 DAY), NULL,
       'Sample price', 1, NOW()
FROM DUAL
WHERE @drug_id IS NOT NULL AND @has_box AND @mindanao IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM supplier_products WHERE supplier_id = @mindanao AND drug_id = @drug_id);

-- Per box direct from the manufacturer, minimum 10 boxes
INSERT INTO supplier_products (supplier_id, drug_id, supplier_item_code, price_basis, price, min_order_qty, price_as_of,
                               discount_type, notes, is_active, created_at)
SELECT @golden, @drug_id, 'GLP-PARA-500-100', 'package', 138.00, 10, CURDATE(),
       'none', 'Sample price', 1, NOW()
FROM DUAL
WHERE @drug_id IS NOT NULL AND @has_box AND @golden IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM supplier_products WHERE supplier_id = @golden AND drug_id = @drug_id);
