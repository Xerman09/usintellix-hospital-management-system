<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';

use App\Core\Database;

echo "Seeding Hospital Non-Pharmaceutical Supply Catalog...\n";

$pdo = Database::connection();

// Check if already seeded
$cnt = (int)$pdo->query("SELECT COUNT(*) FROM supply_catalog_items")->fetchColumn();
if ($cnt > 0) {
    echo "Supply catalog items already seeded ({$cnt} items found).\n";
    exit(0);
}

$items = [
    // 1. Medical & Surgical Consumables
    [
        'code' => 'SUP-MS-0001',
        'name' => 'Disposable Syringe 5mL with 21G Hypodermic Needle',
        'category' => 'medical_surgical',
        'sub_cat' => 'Needles & Syringes',
        'brand' => 'BD Emerald',
        'uom' => 'box',
        'pkg' => '100 pcs per box',
        'cost' => 18.50,
        'price' => 28.00,
        'billable' => 1,
        'min_stock' => 25.00,
        'max_stock' => 200.00,
        'stock' => 85.00,
        'reorder' => 50.00,
        'storage' => 'Store in clean, dry room below 25°C',
        'sterility' => 'sterile',
        'single_use' => 1,
        'sku' => '303174-BD-5ML',
        'supp_name' => 'Luzon MedSupply Distributors Inc.',
        'status' => 'active',
        'notes' => 'General ward medication administration and IV flush.'
    ],
    [
        'code' => 'SUP-MS-0002',
        'name' => 'Disposable Syringe 10mL Luer-Lok',
        'category' => 'medical_surgical',
        'sub_cat' => 'Needles & Syringes',
        'brand' => 'BD Luer-Lok',
        'uom' => 'box',
        'pkg' => '100 pcs per box',
        'cost' => 24.00,
        'price' => 36.00,
        'billable' => 1,
        'min_stock' => 20.00,
        'max_stock' => 150.00,
        'stock' => 60.00,
        'reorder' => 40.00,
        'storage' => 'Standard dry warehouse',
        'sterility' => 'sterile',
        'single_use' => 1,
        'sku' => '309604-BD-10ML',
        'supp_name' => 'Luzon MedSupply Distributors Inc.',
        'status' => 'active',
        'notes' => 'Central line and IV medication preparation.'
    ],
    [
        'code' => 'SUP-MS-0003',
        'name' => 'IV Cannula / Catheter 20G Pink with Injection Port',
        'category' => 'medical_surgical',
        'sub_cat' => 'Vascular Access',
        'brand' => 'B. Braun Introcan Safety',
        'uom' => 'box',
        'pkg' => '50 pcs per box',
        'cost' => 42.00,
        'price' => 65.00,
        'billable' => 1,
        'min_stock' => 15.00,
        'max_stock' => 120.00,
        'stock' => 40.00,
        'reorder' => 30.00,
        'storage' => 'Store away from direct moisture',
        'sterility' => 'sterile',
        'single_use' => 1,
        'sku' => '4252560-BB-20G',
        'supp_name' => 'PrimeCare Medical Equipment Inc.',
        'status' => 'active',
        'notes' => 'Standard peripheral vascular access cannula for adult inpatient admissions.'
    ],
    [
        'code' => 'SUP-MS-0004',
        'name' => 'IV Cannula / Catheter 18G Green for Rapid Infusion',
        'category' => 'medical_surgical',
        'sub_cat' => 'Vascular Access',
        'brand' => 'B. Braun Introcan Safety',
        'uom' => 'box',
        'pkg' => '50 pcs per box',
        'cost' => 44.00,
        'price' => 68.00,
        'billable' => 1,
        'min_stock' => 12.00,
        'max_stock' => 100.00,
        'stock' => 35.00,
        'reorder' => 25.00,
        'storage' => 'Clean medical storage',
        'sterility' => 'sterile',
        'single_use' => 1,
        'sku' => '4252552-BB-18G',
        'supp_name' => 'PrimeCare Medical Equipment Inc.',
        'status' => 'active',
        'notes' => 'Emergency resuscitations, surgical OR, and blood transfusions.'
    ],
    [
        'code' => 'SUP-MS-0005',
        'name' => 'Primary IV Infusion Set with Air Vent 20 drops/mL',
        'category' => 'medical_surgical',
        'sub_cat' => 'IV Administration',
        'brand' => 'Terumo Surflo',
        'uom' => 'pack',
        'pkg' => '25 sets per carton',
        'cost' => 32.50,
        'price' => 52.00,
        'billable' => 1,
        'min_stock' => 30.00,
        'max_stock' => 250.00,
        'stock' => 110.00,
        'reorder' => 60.00,
        'storage' => 'Standard ward supply cabinet',
        'sterility' => 'sterile',
        'single_use' => 1,
        'sku' => 'TI-IV-SET-20D',
        'supp_name' => 'Luzon MedSupply Distributors Inc.',
        'status' => 'active',
        'notes' => 'Standard IV fluid gravity infusion tubing set.'
    ],

    // 2. Wound Care
    [
        'code' => 'SUP-WC-0006',
        'name' => 'Sterile Gauze Swabs 4x4 inches 8-Ply',
        'category' => 'wound_care',
        'sub_cat' => 'Dressings & Bandages',
        'brand' => 'Covidien Curity',
        'uom' => 'pack',
        'pkg' => 'Pack of 100 swabs (2s sterile)',
        'cost' => 12.00,
        'price' => 18.50,
        'billable' => 1,
        'min_stock' => 40.00,
        'max_stock' => 300.00,
        'stock' => 150.00,
        'reorder' => 80.00,
        'storage' => 'Dry storage room',
        'sterility' => 'sterile',
        'single_use' => 1,
        'sku' => 'CV-GAUZE-4X4',
        'supp_name' => 'Luzon MedSupply Distributors Inc.',
        'status' => 'active',
        'notes' => 'General surgical dressings and wound cleaning.'
    ],
    [
        'code' => 'SUP-WC-0007',
        'name' => 'Adhesive Surgical Island Dressing 10cm x 25cm',
        'category' => 'wound_care',
        'sub_cat' => 'Dressings & Bandages',
        'brand' => '3M Tegaderm + Pad',
        'uom' => 'box',
        'pkg' => 'Box of 25 dressings',
        'cost' => 48.00,
        'price' => 74.00,
        'billable' => 1,
        'min_stock' => 10.00,
        'max_stock' => 80.00,
        'stock' => 28.00,
        'reorder' => 20.00,
        'storage' => 'Store below 30°C',
        'sterility' => 'sterile',
        'single_use' => 1,
        'sku' => '3M-TEG-3591',
        'supp_name' => 'PrimeCare Medical Equipment Inc.',
        'status' => 'active',
        'notes' => 'Postoperative surgical wound dressing with viral/bacterial barrier.'
    ],

    // 3. PPE & Infection Control
    [
        'code' => 'SUP-PPE-0008',
        'name' => 'Nitrile Examination Gloves Powder-Free Medium',
        'category' => 'ppe_infection_control',
        'sub_cat' => 'Gloves & Barriers',
        'brand' => 'Halyard Health Lavender',
        'uom' => 'box',
        'pkg' => 'Box of 200 gloves',
        'cost' => 22.00,
        'price' => 32.00,
        'billable' => 0,
        'min_stock' => 50.00,
        'max_stock' => 400.00,
        'stock' => 180.00,
        'reorder' => 100.00,
        'storage' => 'Cool, dry area away from heat and ozone',
        'sterility' => 'non_sterile',
        'single_use' => 1,
        'sku' => 'HY-NIT-MED-200',
        'supp_name' => 'Luzon MedSupply Distributors Inc.',
        'status' => 'active',
        'notes' => 'Standard non-sterile barrier for bedside nursing and examination.'
    ],
    [
        'code' => 'SUP-PPE-0009',
        'name' => 'Sterile Latex Surgical Gloves Size 7.5 Textured',
        'category' => 'ppe_infection_control',
        'sub_cat' => 'Gloves & Barriers',
        'brand' => 'Ansell Gammex',
        'uom' => 'box',
        'pkg' => 'Box of 50 pairs',
        'cost' => 65.00,
        'price' => 98.00,
        'billable' => 1,
        'min_stock' => 20.00,
        'max_stock' => 150.00,
        'stock' => 55.00,
        'reorder' => 40.00,
        'storage' => 'Store away from direct fluorescent lighting',
        'sterility' => 'sterile',
        'single_use' => 1,
        'sku' => 'AN-GAM-75',
        'supp_name' => 'PrimeCare Medical Equipment Inc.',
        'status' => 'active',
        'notes' => 'Operating room sterile surgeon and scrub nurse gloves.'
    ],
    [
        'code' => 'SUP-PPE-0010',
        'name' => 'Surgical Face Mask 3-Ply Level 3 with Head Ties',
        'category' => 'ppe_infection_control',
        'sub_cat' => 'Masks & Respirators',
        'brand' => '3M Healthcare',
        'uom' => 'box',
        'pkg' => 'Box of 50 masks',
        'cost' => 14.00,
        'price' => 22.00,
        'billable' => 0,
        'min_stock' => 40.00,
        'max_stock' => 350.00,
        'stock' => 220.00,
        'reorder' => 80.00,
        'storage' => 'Standard warehouse dry',
        'sterility' => 'non_sterile',
        'single_use' => 1,
        'sku' => '3M-MSK-1818',
        'supp_name' => 'Luzon MedSupply Distributors Inc.',
        'status' => 'active',
        'notes' => 'ASTM Level 3 fluid resistance.'
    ],

    // 4. Respiratory & Airway Management
    [
        'code' => 'SUP-RA-0011',
        'name' => 'Endotracheal Tube Cuffed 7.5mm Murphy Eye',
        'category' => 'respiratory_airway',
        'sub_cat' => 'Airway Management',
        'brand' => 'Teleflex Rusch',
        'uom' => 'box',
        'pkg' => 'Box of 10 tubes',
        'cost' => 38.00,
        'price' => 58.00,
        'billable' => 1,
        'min_stock' => 8.00,
        'max_stock' => 60.00,
        'stock' => 24.00,
        'reorder' => 15.00,
        'storage' => 'Controlled storage room',
        'sterility' => 'sterile',
        'single_use' => 1,
        'sku' => 'TF-ETT-75C',
        'supp_name' => 'PrimeCare Medical Equipment Inc.',
        'status' => 'active',
        'notes' => 'Code blue resuscitation, ICU ventilator admission, and OR general anesthesia.'
    ],
    [
        'code' => 'SUP-RA-0012',
        'name' => 'Suction Catheter with Vacuum Control Valve 14Fr',
        'category' => 'respiratory_airway',
        'sub_cat' => 'Suction & Drainage',
        'brand' => 'Medline Sterile',
        'uom' => 'box',
        'pkg' => 'Box of 50 catheters',
        'cost' => 26.00,
        'price' => 40.00,
        'billable' => 1,
        'min_stock' => 15.00,
        'max_stock' => 120.00,
        'stock' => 65.00,
        'reorder' => 30.00,
        'storage' => 'Store in dust-free cabinet',
        'sterility' => 'sterile',
        'single_use' => 1,
        'sku' => 'ML-SUC-14FR',
        'supp_name' => 'Luzon MedSupply Distributors Inc.',
        'status' => 'active',
        'notes' => 'Endotracheal and oral secretion aspiration.'
    ],

    // 5. Catheters & Tubing
    [
        'code' => 'SUP-CT-0013',
        'name' => 'Foley Balloon Catheter 2-Way 16Fr 30mL Hydrogel',
        'category' => 'catheters_tubing',
        'sub_cat' => 'Urological Supplies',
        'brand' => 'Bard Lubri-Sil',
        'uom' => 'box',
        'pkg' => 'Box of 10 catheters',
        'cost' => 55.00,
        'price' => 85.00,
        'billable' => 1,
        'min_stock' => 8.00,
        'max_stock' => 60.00,
        'stock' => 26.00,
        'reorder' => 15.00,
        'storage' => 'Cool room below 25°C',
        'sterility' => 'sterile',
        'single_use' => 1,
        'sku' => 'BD-FOL-16FR',
        'supp_name' => 'PrimeCare Medical Equipment Inc.',
        'status' => 'active',
        'notes' => 'Indwelling urinary catheterization for inpatient monitoring.'
    ],
    [
        'code' => 'SUP-CT-0014',
        'name' => 'Closed Urinary Drainage Bag 2000mL Anti-Reflux',
        'category' => 'catheters_tubing',
        'sub_cat' => 'Urological Supplies',
        'brand' => 'Bard Centerchem',
        'uom' => 'box',
        'pkg' => 'Box of 20 bags',
        'cost' => 42.00,
        'price' => 65.00,
        'billable' => 1,
        'min_stock' => 12.00,
        'max_stock' => 90.00,
        'stock' => 38.00,
        'reorder' => 25.00,
        'storage' => 'Dry store',
        'sterility' => 'sterile',
        'single_use' => 1,
        'sku' => 'BD-UBAG-2000',
        'supp_name' => 'PrimeCare Medical Equipment Inc.',
        'status' => 'active',
        'notes' => 'Includes needleless sample port and anti-reflux chamber.'
    ],

    // 6. Disinfectants & Infection Control
    [
        'code' => 'SUP-CD-0015',
        'name' => 'Hospital Disinfectant Surface Wipes (Canister of 160)',
        'category' => 'cleaning_disinfectants',
        'sub_cat' => 'Surface Sanitizers',
        'brand' => 'PDI Super Sani-Cloth',
        'uom' => 'canister',
        'pkg' => '1 Canister of 160 Wipes',
        'cost' => 11.50,
        'price' => 16.00,
        'billable' => 0,
        'min_stock' => 30.00,
        'max_stock' => 250.00,
        'stock' => 125.00,
        'reorder' => 60.00,
        'storage' => 'Store tightly capped at room temperature',
        'sterility' => 'non_sterile',
        'single_use' => 1,
        'sku' => 'PDI-Q55172',
        'supp_name' => 'Luzon MedSupply Distributors Inc.',
        'status' => 'active',
        'notes' => '2-minute contact time for bloodborne pathogens and hospital disinfection.'
    ],

    // 7. Linen & Patient Bedding
    [
        'code' => 'SUP-LB-0016',
        'name' => 'Hospital Fitted Adult Bed Sheet Poly-Cotton White',
        'category' => 'linen_bedding',
        'sub_cat' => 'Bedding & Textiles',
        'brand' => 'Standard Textile',
        'uom' => 'piece',
        'pkg' => 'Individual plastic wrapped',
        'cost' => 14.50,
        'price' => 22.00,
        'billable' => 0,
        'min_stock' => 50.00,
        'max_stock' => 300.00,
        'stock' => 180.00,
        'reorder' => 80.00,
        'storage' => 'Clean linen cabinet',
        'sterility' => 'non_sterile',
        'single_use' => 0,
        'sku' => 'ST-SHT-3684',
        'supp_name' => 'Luzon MedSupply Distributors Inc.',
        'status' => 'active',
        'notes' => 'High-durability commercial laundry compliant bedding.'
    ]
];

$stmt = $pdo->prepare("
    INSERT INTO `supply_catalog_items` (
        `item_code`, `item_name`, `category`, `sub_category`,
        `brand_manufacturer`, `unit_of_measure`, `packaging_description`,
        `standard_cost`, `selling_price`, `is_billable_to_patient`,
        `min_safety_stock`, `max_stock_level`, `current_stock`,
        `reorder_quantity`, `storage_requirements`, `sterility_type`,
        `is_single_use`, `barcode_sku`, `preferred_supplier_name`,
        `status`, `notes`, `created_at`, `updated_at`
    ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, NOW(), NOW()
    )
");

foreach ($items as $i) {
    $stmt->execute([
        $i['code'], $i['name'], $i['category'], $i['sub_cat'],
        $i['brand'], $i['uom'], $i['pkg'],
        $i['cost'], $i['price'], $i['billable'],
        $i['min_stock'], $i['max_stock'], $i['stock'],
        $i['reorder'], $i['storage'], $i['sterility'],
        $i['single_use'], $i['sku'], $i['supp_name'],
        $i['status'], $i['notes']
    ]);
}

// Update sequence counter
$pdo->exec("UPDATE `billing_tariff_counters` SET `last_number` = 16 WHERE `counter_type` = 'SUPPLY_ITEM' AND `year` = 2026");

echo "Seeded " . count($items) . " non-pharmaceutical supply catalog items.\n";

// Seed Par Stock Quotas for Key Departments
$departments = [
    'Emergency Department' => [
        'SUP-MS-0001' => [20.00, 8.00],
        'SUP-MS-0003' => [15.00, 6.00],
        'SUP-MS-0004' => [12.00, 5.00],
        'SUP-PPE-0008' => [30.00, 10.00],
        'SUP-RA-0011' => [6.00, 2.00]
    ],
    'Intensive Care Unit (ICU)' => [
        'SUP-MS-0002' => [15.00, 5.00],
        'SUP-RA-0011' => [8.00, 3.00],
        'SUP-RA-0012' => [20.00, 7.00],
        'SUP-CT-0013' => [6.00, 2.00]
    ],
    'Operating Room' => [
        'SUP-PPE-0009' => [25.00, 10.00],
        'SUP-WC-0007' => [15.00, 5.00],
        'SUP-MS-0004' => [15.00, 6.00]
    ],
    'General Inpatient Ward' => [
        'SUP-MS-0001' => [25.00, 6.00],
        'SUP-MS-0005' => [20.00, 5.00],
        'SUP-LB-0016' => [30.00, 8.00],
        'SUP-CD-0015' => [10.00, 2.00]
    ]
];

$stmtDept = $pdo->prepare("
    INSERT INTO `supply_catalog_departments` (`item_id`, `department_name`, `par_level`, `daily_burn_rate`, `created_at`)
    VALUES (?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE `par_level` = VALUES(`par_level`), `daily_burn_rate` = VALUES(`daily_burn_rate`)
");

$seededParCount = 0;
foreach ($departments as $deptName => $parItems) {
    foreach ($parItems as $itemCode => $quants) {
        $selItem = $pdo->prepare("SELECT id FROM supply_catalog_items WHERE item_code = ?");
        $selItem->execute([$itemCode]);
        $itemId = $selItem->fetchColumn();
        if ($itemId) {
            $stmtDept->execute([(int)$itemId, $deptName, $quants[0], $quants[1]]);
            $seededParCount++;
        }
    }
}

echo "Seeded {$seededParCount} department par level stock allocations.\n";
echo "Supply catalog seeding completed successfully.\n";
