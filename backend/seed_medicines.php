<?php

require_once __DIR__ . '/app/Core/Autoload.php';
\App\Core\Env::load(__DIR__ . '/.env');

use App\Core\Database;
use App\Modules\DrugInventory\Services\DrugInventoryService;

$db = Database::connection();
$service = new DrugInventoryService();

// Current admin user ID
$adminUserId = 3;

$medicines = [
    [
        'generic_name' => 'Amoxicillin',
        'brand_name' => 'Amoxil',
        'strength' => '500 mg',
        'dosage_form_id' => 5, // Capsule
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 9, // capsule
        'package_unit_id' => 19, // box
        'package_quantity' => 100,
        'category_id' => 4, // Antibiotic
        'manufacturer' => 'GlaxoSmithKline',
        'preferred_supplier_id' => 7,
        'registration_number' => 'DR-XY21001',
        'barcode' => '4800000000101',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 4.50,
        'selling_price' => 8.00,
        'min_level_global' => 200,
        'max_level_global' => 2000,
        'lots' => [
            ['lot_number' => 'AMX-2026-A1', 'warehouse_id' => 2, 'quantity' => 500, 'expires_date' => '2027-08-31', 'invoice' => 'INV-2026-0891'],
            ['lot_number' => 'AMX-2026-A2', 'warehouse_id' => 1, 'quantity' => 200, 'expires_date' => '2027-11-30', 'invoice' => 'INV-2026-0892']
        ],
        'templates' => [
            ['name' => 'Adult standard course', 'schedule' => '500 mg every 8 hours for 7 days', 'interval_type' => 'Q8H', 'basic_units' => '21', 'refills' => 0, 'is_standard' => 1]
        ]
    ],
    [
        'generic_name' => 'Amoxicillin + Clavulanic Acid',
        'brand_name' => 'Augmentin',
        'strength' => '625 mg',
        'dosage_form_id' => 2, // Film-coated Tablet
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 8, // tablet
        'package_unit_id' => 19, // box
        'package_quantity' => 14,
        'category_id' => 4, // Antibiotic
        'manufacturer' => 'GlaxoSmithKline',
        'preferred_supplier_id' => 7,
        'registration_number' => 'DR-XY21002',
        'barcode' => '4800000000102',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Protect from light',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 22.00,
        'selling_price' => 38.00,
        'min_level_global' => 140,
        'max_level_global' => 1400,
        'lots' => [
            ['lot_number' => 'AUG-2026-B1', 'warehouse_id' => 2, 'quantity' => 280, 'expires_date' => '2027-06-30', 'invoice' => 'INV-2026-0893']
        ],
        'templates' => [
            ['name' => 'BID course', 'schedule' => '1 tablet every 12 hours for 7 days with food', 'interval_type' => 'BID', 'basic_units' => '14', 'refills' => 0, 'is_standard' => 1]
        ]
    ],
    [
        'generic_name' => 'Cefalexin',
        'brand_name' => 'Ceporex',
        'strength' => '500 mg',
        'dosage_form_id' => 5, // Capsule
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 9, // capsule
        'package_unit_id' => 19, // box
        'package_quantity' => 100,
        'category_id' => 4, // Antibiotic
        'manufacturer' => 'Unilab',
        'preferred_supplier_id' => 8,
        'registration_number' => 'DR-XY21003',
        'barcode' => '4800000000103',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 6.00,
        'selling_price' => 12.00,
        'min_level_global' => 100,
        'max_level_global' => 1000,
        'lots' => [
            ['lot_number' => 'CFX-2026-C1', 'warehouse_id' => 2, 'quantity' => 300, 'expires_date' => '2027-10-31', 'invoice' => 'INV-2026-0894']
        ]
    ],
    [
        'generic_name' => 'Azithromycin',
        'brand_name' => 'Zithromax',
        'strength' => '500 mg',
        'dosage_form_id' => 2, // Film-coated Tablet
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 8, // tablet
        'package_unit_id' => 19, // box
        'package_quantity' => 3,
        'category_id' => 4, // Antibiotic
        'manufacturer' => 'Pfizer',
        'preferred_supplier_id' => 10,
        'registration_number' => 'DR-XY21004',
        'barcode' => '4800000000104',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 45.00,
        'selling_price' => 80.00,
        'min_level_global' => 60,
        'max_level_global' => 600,
        'lots' => [
            ['lot_number' => 'AZM-2026-D1', 'warehouse_id' => 2, 'quantity' => 150, 'expires_date' => '2028-01-31', 'invoice' => 'INV-2026-0895']
        ],
        'templates' => [
            ['name' => '3-day course', 'schedule' => '500 mg once daily for 3 days', 'interval_type' => 'QD', 'basic_units' => '3', 'refills' => 0, 'is_standard' => 1]
        ]
    ],
    [
        'generic_name' => 'Ceftriaxone',
        'brand_name' => 'Rocephin',
        'strength' => '1 g',
        'dosage_form_id' => 13, // Powder for Injection
        'route_id' => 6, // Intravenous
        'dispensing_unit_id' => 11, // vial
        'package_unit_id' => 19, // box
        'package_quantity' => 10,
        'category_id' => 4, // Antibiotic
        'manufacturer' => 'Roche',
        'preferred_supplier_id' => 7,
        'registration_number' => 'DR-XY21005',
        'barcode' => '4800000000105',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Protect from light',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 85.00,
        'selling_price' => 160.00,
        'min_level_global' => 50,
        'max_level_global' => 500,
        'lots' => [
            ['lot_number' => 'CFT-2026-E1', 'warehouse_id' => 2, 'quantity' => 120, 'expires_date' => '2027-12-31', 'invoice' => 'INV-2026-0896']
        ]
    ],
    [
        'generic_name' => 'Ibuprofen',
        'brand_name' => 'Advil',
        'strength' => '200 mg',
        'dosage_form_id' => 6, // Softgel Capsule
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 9, // capsule
        'package_unit_id' => 19, // box
        'package_quantity' => 100,
        'category_id' => 2, // NSAID
        'manufacturer' => 'Haleon',
        'preferred_supplier_id' => 8,
        'registration_number' => 'DR-XY21006',
        'barcode' => '4800000000106',
        'controlled_class' => 'None',
        'requires_prescription' => 0,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 3.50,
        'selling_price' => 7.00,
        'min_level_global' => 150,
        'max_level_global' => 1500,
        'lots' => [
            ['lot_number' => 'IBU-2026-F1', 'warehouse_id' => 2, 'quantity' => 400, 'expires_date' => '2028-03-31', 'invoice' => 'INV-2026-0897']
        ]
    ],
    [
        'generic_name' => 'Mefenamic Acid',
        'brand_name' => 'Ponstan',
        'strength' => '500 mg',
        'dosage_form_id' => 5, // Capsule
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 9, // capsule
        'package_unit_id' => 19, // box
        'package_quantity' => 100,
        'category_id' => 2, // NSAID
        'manufacturer' => 'Pfizer',
        'preferred_supplier_id' => 8,
        'registration_number' => 'DR-XY21007',
        'barcode' => '4800000000107',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 5.00,
        'selling_price' => 9.50,
        'min_level_global' => 150,
        'max_level_global' => 1500,
        'lots' => [
            ['lot_number' => 'MEF-2026-G1', 'warehouse_id' => 2, 'quantity' => 350, 'expires_date' => '2027-09-30', 'invoice' => 'INV-2026-0898']
        ]
    ],
    [
        'generic_name' => 'Tramadol Hydrochloride',
        'brand_name' => 'Ultram',
        'strength' => '50 mg',
        'dosage_form_id' => 5, // Capsule
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 9, // capsule
        'package_unit_id' => 19, // box
        'package_quantity' => 100,
        'category_id' => 3, // Opioid Analgesic
        'manufacturer' => 'Janssen',
        'preferred_supplier_id' => 10,
        'registration_number' => 'DR-XY21008',
        'barcode' => '4800000000108',
        'controlled_class' => 'Dangerous Drug (RA 9165)',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 1,
        'is_lasa' => 1,
        'unit_cost' => 8.00,
        'selling_price' => 16.00,
        'min_level_global' => 50,
        'max_level_global' => 500,
        'lots' => [
            ['lot_number' => 'TRM-2026-H1', 'warehouse_id' => 2, 'quantity' => 150, 'expires_date' => '2027-11-30', 'invoice' => 'INV-2026-0899']
        ]
    ],
    [
        'generic_name' => 'Amlodipine Besilate',
        'brand_name' => 'Norvasc',
        'strength' => '5 mg',
        'dosage_form_id' => 1, // Tablet
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 8, // tablet
        'package_unit_id' => 19, // box
        'package_quantity' => 100,
        'category_id' => 8, // Antihypertensive
        'manufacturer' => 'Pfizer',
        'preferred_supplier_id' => 7,
        'registration_number' => 'DR-XY21009',
        'barcode' => '4800000000109',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 2.50,
        'selling_price' => 6.00,
        'min_level_global' => 200,
        'max_level_global' => 2500,
        'lots' => [
            ['lot_number' => 'AML-2026-I1', 'warehouse_id' => 2, 'quantity' => 600, 'expires_date' => '2028-02-28', 'invoice' => 'INV-2026-0900'],
            ['lot_number' => 'AML-2026-I2', 'warehouse_id' => 1, 'quantity' => 200, 'expires_date' => '2028-05-31', 'invoice' => 'INV-2026-0901']
        ]
    ],
    [
        'generic_name' => 'Losartan Potassium',
        'brand_name' => 'Cozaar',
        'strength' => '50 mg',
        'dosage_form_id' => 2, // Film-coated Tablet
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 8, // tablet
        'package_unit_id' => 19, // box
        'package_quantity' => 100,
        'category_id' => 8, // Antihypertensive
        'manufacturer' => 'Organon',
        'preferred_supplier_id' => 7,
        'registration_number' => 'DR-XY21010',
        'barcode' => '4800000000110',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Protect from light',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 3.00,
        'selling_price' => 7.50,
        'min_level_global' => 200,
        'max_level_global' => 2500,
        'lots' => [
            ['lot_number' => 'LOS-2026-J1', 'warehouse_id' => 2, 'quantity' => 700, 'expires_date' => '2028-04-30', 'invoice' => 'INV-2026-0902']
        ]
    ],
    [
        'generic_name' => 'Metoprolol Tartrate',
        'brand_name' => 'Betaloc',
        'strength' => '50 mg',
        'dosage_form_id' => 1, // Tablet
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 8, // tablet
        'package_unit_id' => 19, // box
        'package_quantity' => 100,
        'category_id' => 8, // Antihypertensive
        'manufacturer' => 'AstraZeneca',
        'preferred_supplier_id' => 9,
        'registration_number' => 'DR-XY21011',
        'barcode' => '4800000000111',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 1,
        'unit_cost' => 2.20,
        'selling_price' => 5.50,
        'min_level_global' => 100,
        'max_level_global' => 1200,
        'lots' => [
            ['lot_number' => 'MTP-2026-K1', 'warehouse_id' => 2, 'quantity' => 350, 'expires_date' => '2027-12-31', 'invoice' => 'INV-2026-0903']
        ]
    ],
    [
        'generic_name' => 'Metformin Hydrochloride',
        'brand_name' => 'Glucophage',
        'strength' => '500 mg',
        'dosage_form_id' => 2, // Film-coated Tablet
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 8, // tablet
        'package_unit_id' => 19, // box
        'package_quantity' => 100,
        'category_id' => 9, // Antidiabetic
        'manufacturer' => 'Merck',
        'preferred_supplier_id' => 7,
        'registration_number' => 'DR-XY21012',
        'barcode' => '4800000000112',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 2.00,
        'selling_price' => 5.00,
        'min_level_global' => 300,
        'max_level_global' => 3000,
        'lots' => [
            ['lot_number' => 'MTF-2026-L1', 'warehouse_id' => 2, 'quantity' => 1000, 'expires_date' => '2028-06-30', 'invoice' => 'INV-2026-0904']
        ]
    ],
    [
        'generic_name' => 'Gliclazide',
        'brand_name' => 'Diamicron MR',
        'strength' => '60 mg',
        'dosage_form_id' => 4, // Extended-release Tablet
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 8, // tablet
        'package_unit_id' => 19, // box
        'package_quantity' => 60,
        'category_id' => 9, // Antidiabetic
        'manufacturer' => 'Servier',
        'preferred_supplier_id' => 8,
        'registration_number' => 'DR-XY21013',
        'barcode' => '4800000000113',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 7.50,
        'selling_price' => 15.00,
        'min_level_global' => 120,
        'max_level_global' => 1200,
        'lots' => [
            ['lot_number' => 'GLZ-2026-M1', 'warehouse_id' => 2, 'quantity' => 360, 'expires_date' => '2027-11-30', 'invoice' => 'INV-2026-0905']
        ]
    ],
    [
        'generic_name' => 'Insulin Glargine',
        'brand_name' => 'Lantus SoloStar',
        'strength' => '100 IU/ml',
        'dosage_form_id' => 12, // Injection (Solution)
        'route_id' => 8, // Subcutaneous
        'dispensing_unit_id' => 11, // vial
        'package_unit_id' => 19, // box
        'package_quantity' => 5,
        'category_id' => 9, // Antidiabetic
        'manufacturer' => 'Sanofi',
        'preferred_supplier_id' => 10,
        'registration_number' => 'DR-XY21014',
        'barcode' => '4800000000114',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Refrigerated (2-8 °C)',
        'is_high_alert' => 1,
        'is_lasa' => 1,
        'unit_cost' => 450.00,
        'selling_price' => 720.00,
        'min_level_global' => 20,
        'max_level_global' => 200,
        'lots' => [
            ['lot_number' => 'INS-2026-N1', 'warehouse_id' => 2, 'quantity' => 40, 'expires_date' => '2027-05-31', 'invoice' => 'INV-2026-0906']
        ]
    ],
    [
        'generic_name' => 'Atorvastatin Calcium',
        'brand_name' => 'Lipitor',
        'strength' => '20 mg',
        'dosage_form_id' => 2, // Film-coated Tablet
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 8, // tablet
        'package_unit_id' => 19, // box
        'package_quantity' => 30,
        'category_id' => 10, // Lipid-lowering Agent
        'manufacturer' => 'Viatris',
        'preferred_supplier_id' => 7,
        'registration_number' => 'DR-XY21015',
        'barcode' => '4800000000115',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 8.00,
        'selling_price' => 18.00,
        'min_level_global' => 150,
        'max_level_global' => 1500,
        'lots' => [
            ['lot_number' => 'ATV-2026-O1', 'warehouse_id' => 2, 'quantity' => 450, 'expires_date' => '2028-03-31', 'invoice' => 'INV-2026-0907']
        ]
    ],
    [
        'generic_name' => 'Clopidogrel Bisulfate',
        'brand_name' => 'Plavix',
        'strength' => '75 mg',
        'dosage_form_id' => 2, // Film-coated Tablet
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 8, // tablet
        'package_unit_id' => 19, // box
        'package_quantity' => 28,
        'category_id' => 11, // Anticoagulant / Antiplatelet
        'manufacturer' => 'Sanofi',
        'preferred_supplier_id' => 8,
        'registration_number' => 'DR-XY21016',
        'barcode' => '4800000000116',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 12.00,
        'selling_price' => 25.00,
        'min_level_global' => 140,
        'max_level_global' => 1400,
        'lots' => [
            ['lot_number' => 'CLP-2026-P1', 'warehouse_id' => 2, 'quantity' => 280, 'expires_date' => '2028-01-31', 'invoice' => 'INV-2026-0908']
        ]
    ],
    [
        'generic_name' => 'Aspirin (Enteric-coated)',
        'brand_name' => 'Aspilets EC',
        'strength' => '80 mg',
        'dosage_form_id' => 1, // Tablet
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 8, // tablet
        'package_unit_id' => 19, // box
        'package_quantity' => 100,
        'category_id' => 11, // Anticoagulant / Antiplatelet
        'manufacturer' => 'United Laboratories',
        'preferred_supplier_id' => 7,
        'registration_number' => 'DR-XY21017',
        'barcode' => '4800000000117',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 1.50,
        'selling_price' => 3.50,
        'min_level_global' => 200,
        'max_level_global' => 2000,
        'lots' => [
            ['lot_number' => 'ASP-2026-Q1', 'warehouse_id' => 2, 'quantity' => 500, 'expires_date' => '2028-07-31', 'invoice' => 'INV-2026-0909']
        ]
    ],
    [
        'generic_name' => 'Omeprazole',
        'brand_name' => 'Losec',
        'strength' => '20 mg',
        'dosage_form_id' => 5, // Capsule
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 9, // capsule
        'package_unit_id' => 19, // box
        'package_quantity' => 100,
        'category_id' => 15, // Antacid / Anti-ulcer
        'manufacturer' => 'AstraZeneca',
        'preferred_supplier_id' => 8,
        'registration_number' => 'DR-XY21018',
        'barcode' => '4800000000118',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Protect from light',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 4.00,
        'selling_price' => 9.00,
        'min_level_global' => 200,
        'max_level_global' => 2000,
        'lots' => [
            ['lot_number' => 'OMP-2026-R1', 'warehouse_id' => 2, 'quantity' => 600, 'expires_date' => '2027-10-31', 'invoice' => 'INV-2026-0910']
        ]
    ],
    [
        'generic_name' => 'Salbutamol Sulfate',
        'brand_name' => 'Ventolin Inhaler',
        'strength' => '100 mcg/dose',
        'dosage_form_id' => 22, // Metered-dose Inhaler
        'route_id' => 12, // Inhalation
        'dispensing_unit_id' => 17, // bottle
        'package_unit_id' => 19, // box
        'package_quantity' => 1,
        'category_id' => 13, // Bronchodilator / Anti-asthma
        'manufacturer' => 'GlaxoSmithKline',
        'preferred_supplier_id' => 7,
        'registration_number' => 'DR-XY21019',
        'barcode' => '4800000000119',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 150.00,
        'selling_price' => 260.00,
        'min_level_global' => 30,
        'max_level_global' => 300,
        'lots' => [
            ['lot_number' => 'SBT-2026-S1', 'warehouse_id' => 2, 'quantity' => 75, 'expires_date' => '2028-02-28', 'invoice' => 'INV-2026-0911']
        ]
    ],
    [
        'generic_name' => 'Salbutamol Sulfate',
        'brand_name' => 'Ventolin Nebules',
        'strength' => '2.5 mg / 2.5 ml',
        'dosage_form_id' => 23, // Nebule (Inhalation Solution)
        'route_id' => 12, // Inhalation
        'dispensing_unit_id' => 13, // nebule
        'package_unit_id' => 19, // box
        'package_quantity' => 30,
        'category_id' => 13, // Bronchodilator / Anti-asthma
        'manufacturer' => 'GlaxoSmithKline',
        'preferred_supplier_id' => 7,
        'registration_number' => 'DR-XY21020',
        'barcode' => '4800000000120',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Protect from light',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 14.00,
        'selling_price' => 28.00,
        'min_level_global' => 120,
        'max_level_global' => 1200,
        'lots' => [
            ['lot_number' => 'SBN-2026-T1', 'warehouse_id' => 2, 'quantity' => 300, 'expires_date' => '2027-12-31', 'invoice' => 'INV-2026-0912']
        ]
    ],
    [
        'generic_name' => 'Cetirizine Hydrochloride',
        'brand_name' => 'Virlix',
        'strength' => '10 mg',
        'dosage_form_id' => 2, // Film-coated Tablet
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 8, // tablet
        'package_unit_id' => 19, // box
        'package_quantity' => 100,
        'category_id' => 12, // Antihistamine
        'manufacturer' => 'GSK Consumer',
        'preferred_supplier_id' => 8,
        'registration_number' => 'DR-XY21021',
        'barcode' => '4800000000121',
        'controlled_class' => 'None',
        'requires_prescription' => 0,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 3.00,
        'selling_price' => 7.00,
        'min_level_global' => 100,
        'max_level_global' => 1000,
        'lots' => [
            ['lot_number' => 'CTZ-2026-U1', 'warehouse_id' => 2, 'quantity' => 350, 'expires_date' => '2028-04-30', 'invoice' => 'INV-2026-0913']
        ]
    ],
    [
        'generic_name' => 'Prednisone',
        'brand_name' => 'Deltasone',
        'strength' => '20 mg',
        'dosage_form_id' => 1, // Tablet
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 8, // tablet
        'package_unit_id' => 19, // box
        'package_quantity' => 100,
        'category_id' => 14, // Corticosteroid
        'manufacturer' => 'Pfizer',
        'preferred_supplier_id' => 10,
        'registration_number' => 'DR-XY21022',
        'barcode' => '4800000000122',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Protect from light',
        'is_high_alert' => 1,
        'is_lasa' => 1,
        'unit_cost' => 3.50,
        'selling_price' => 8.00,
        'min_level_global' => 100,
        'max_level_global' => 1000,
        'lots' => [
            ['lot_number' => 'PRD-2026-V1', 'warehouse_id' => 2, 'quantity' => 250, 'expires_date' => '2028-05-31', 'invoice' => 'INV-2026-0914']
        ]
    ],
    [
        'generic_name' => 'Ondansetron Hydrochloride',
        'brand_name' => 'Zofran',
        'strength' => '8 mg',
        'dosage_form_id' => 1, // Tablet
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 8, // tablet
        'package_unit_id' => 19, // box
        'package_quantity' => 10,
        'category_id' => 16, // Antiemetic
        'manufacturer' => 'Novartis',
        'preferred_supplier_id' => 9,
        'registration_number' => 'DR-XY21023',
        'barcode' => '4800000000123',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 40.00,
        'selling_price' => 75.00,
        'min_level_global' => 50,
        'max_level_global' => 500,
        'lots' => [
            ['lot_number' => 'OND-2026-W1', 'warehouse_id' => 2, 'quantity' => 100, 'expires_date' => '2027-09-30', 'invoice' => 'INV-2026-0915']
        ]
    ],
    [
        'generic_name' => 'Ascorbic Acid + Zinc',
        'brand_name' => 'Ceelin Plus',
        'strength' => '100 mg/5 ml',
        'dosage_form_id' => 7, // Syrup
        'route_id' => 3, // Oral
        'dispensing_unit_id' => 17, // bottle
        'package_unit_id' => 19, // box
        'package_quantity' => 1,
        'category_id' => 23, // Vitamin / Mineral Supplement
        'manufacturer' => 'Unilab',
        'preferred_supplier_id' => 8,
        'registration_number' => 'DR-XY21024',
        'barcode' => '4800000000124',
        'controlled_class' => 'None',
        'requires_prescription' => 0,
        'storage_condition' => 'Protect from light',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 75.00,
        'selling_price' => 120.00,
        'min_level_global' => 50,
        'max_level_global' => 500,
        'lots' => [
            ['lot_number' => 'VIT-2026-X1', 'warehouse_id' => 2, 'quantity' => 120, 'expires_date' => '2028-08-31', 'invoice' => 'INV-2026-0916']
        ]
    ],
    [
        'generic_name' => 'Sodium Chloride 0.9%',
        'brand_name' => 'Plain Normal Saline',
        'strength' => '1000 ml',
        'dosage_form_id' => 14, // IV Infusion
        'route_id' => 6, // Intravenous
        'dispensing_unit_id' => 17, // bottle
        'package_unit_id' => 19, // box
        'package_quantity' => 12,
        'category_id' => 24, // IV Fluid / Electrolyte
        'manufacturer' => 'Euro-Med Laboratories',
        'preferred_supplier_id' => 11,
        'registration_number' => 'DR-XY21025',
        'barcode' => '4800000000125',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 45.00,
        'selling_price' => 95.00,
        'min_level_global' => 60,
        'max_level_global' => 600,
        'lots' => [
            ['lot_number' => 'NSS-2026-Y1', 'warehouse_id' => 2, 'quantity' => 180, 'expires_date' => '2028-10-31', 'invoice' => 'INV-2026-0917']
        ]
    ],
    [
        'generic_name' => 'Dextrose 5% in Water',
        'brand_name' => 'D5W IV Infusion',
        'strength' => '500 ml',
        'dosage_form_id' => 14, // IV Infusion
        'route_id' => 6, // Intravenous
        'dispensing_unit_id' => 17, // bottle
        'package_unit_id' => 19, // box
        'package_quantity' => 12,
        'category_id' => 24, // IV Fluid / Electrolyte
        'manufacturer' => 'Euro-Med Laboratories',
        'preferred_supplier_id' => 11,
        'registration_number' => 'DR-XY21026',
        'barcode' => '4800000000126',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Room temperature (15-30 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 42.00,
        'selling_price' => 90.00,
        'min_level_global' => 60,
        'max_level_global' => 600,
        'lots' => [
            ['lot_number' => 'D5W-2026-Z1', 'warehouse_id' => 2, 'quantity' => 144, 'expires_date' => '2028-09-30', 'invoice' => 'INV-2026-0918']
        ]
    ],
    [
        'generic_name' => 'Hydrocortisone',
        'brand_name' => 'Cortaid',
        'strength' => '1% (10 mg/g)',
        'dosage_form_id' => 15, // Cream
        'route_id' => 10, // Topical
        'dispensing_unit_id' => 18, // tube
        'package_unit_id' => 19, // box
        'package_quantity' => 1,
        'category_id' => 27, // Dermatological
        'manufacturer' => 'Johnson & Johnson',
        'preferred_supplier_id' => 8,
        'registration_number' => 'DR-XY21027',
        'barcode' => '4800000000127',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Cool place (8-15 °C)',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 65.00,
        'selling_price' => 110.00,
        'min_level_global' => 30,
        'max_level_global' => 300,
        'lots' => [
            ['lot_number' => 'HYD-2026-AA1', 'warehouse_id' => 2, 'quantity' => 60, 'expires_date' => '2027-12-31', 'invoice' => 'INV-2026-0919']
        ]
    ],
    [
        'generic_name' => 'Ofloxacin',
        'brand_name' => 'Tarivid Ophthalmic',
        'strength' => '0.3% (3 mg/ml)',
        'dosage_form_id' => 19, // Eye Drops
        'route_id' => 14, // Ophthalmic
        'dispensing_unit_id' => 17, // bottle
        'package_unit_id' => 19, // box
        'package_quantity' => 1,
        'category_id' => 28, // Ophthalmic / Otic
        'manufacturer' => 'Santen Pharmaceutical',
        'preferred_supplier_id' => 9,
        'registration_number' => 'DR-XY21028',
        'barcode' => '4800000000128',
        'controlled_class' => 'None',
        'requires_prescription' => 1,
        'storage_condition' => 'Protect from light',
        'is_high_alert' => 0,
        'is_lasa' => 0,
        'unit_cost' => 180.00,
        'selling_price' => 310.00,
        'min_level_global' => 25,
        'max_level_global' => 250,
        'lots' => [
            ['lot_number' => 'OFL-2026-BB1', 'warehouse_id' => 2, 'quantity' => 50, 'expires_date' => '2027-10-31', 'invoice' => 'INV-2026-0920']
        ]
    ]
];

$added = 0;
$skipped = 0;
$receivedLots = 0;

foreach ($medicines as $med) {
    // Check if drug already exists by generic_name and strength and brand_name
    $check = $db->prepare(
        "SELECT id, name FROM drugs WHERE deleted_at IS NULL AND generic_name = :generic AND strength = :strength LIMIT 1"
    );
    $check->execute([
        'generic' => $med['generic_name'],
        'strength' => $med['strength']
    ]);
    $existing = $check->fetch(PDO::FETCH_ASSOC);

    $drugId = null;
    if ($existing) {
        $drugId = (int) $existing['id'];
        echo "Drug already exists: {$existing['name']} (ID: $drugId)\n";
        $skipped++;
    } else {
        $result = $service->createDrug($med, $adminUserId);
        if (!$result['success']) {
            echo "Failed to create drug: {$med['generic_name']} {$med['strength']}: {$result['message']}\n";
            if (!empty($result['errors'])) {
                print_r($result['errors']);
            }
            continue;
        }

        $drugId = (int) $result['data']['drug_id'];
        $added++;
        echo "Created drug: {$result['data']['name']} (ID: $drugId)\n";
    }

    // Now receive stock lots if specified and lot doesn't already exist
    if (!empty($med['lots']) && $drugId) {
        foreach ($med['lots'] as $lot) {
            $lotCheck = $db->prepare(
                "SELECT id FROM drug_inventory_lots WHERE drug_id = :drug_id AND lot_number = :lot_number AND deleted_at IS NULL LIMIT 1"
            );
            $lotCheck->execute([
                'drug_id' => $drugId,
                'lot_number' => $lot['lot_number']
            ]);
            if ($lotCheck->fetchColumn()) {
                echo "  Lot {$lot['lot_number']} already exists for drug ID $drugId.\n";
                continue;
            }

            $recData = [
                'drug_id' => $drugId,
                'warehouse_id' => $lot['warehouse_id'],
                'facility_id' => null,
                'lot_number' => $lot['lot_number'],
                'expires_date' => $lot['expires_date'],
                'quantity' => $lot['quantity'],
                'received_date' => date('Y-m-d'),
                'supplier_id' => $med['preferred_supplier_id'] ?? null,
                'invoice_number' => $lot['invoice'] ?? null,
                'unit_cost' => $med['unit_cost'] ?? null,
                'notes' => 'Initial stock seed'
            ];

            $recResult = $service->receiveStock($recData, $adminUserId);
            if ($recResult['success']) {
                $receivedLots++;
                echo "  -> Received lot {$lot['lot_number']} (Qty: {$lot['quantity']})\n";
            } else {
                echo "  -> Failed receiving lot {$lot['lot_number']}: {$recResult['message']}\n";
            }
        }
    }
}

echo "\n===============================\n";
echo "SUMMARY:\n";
echo "Drugs added: $added\n";
echo "Drugs skipped (already exist): $skipped\n";
echo "Lots received: $receivedLots\n";
echo "===============================\n";
