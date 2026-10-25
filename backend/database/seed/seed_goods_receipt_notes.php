<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';

use App\Core\Database;

echo "Seeding Hospital Goods Receipt Notes (GRN) & 3-Way Matching...\n";

$pdo = Database::connection();

// Check if already seeded
$cnt = (int)$pdo->query("SELECT COUNT(*) FROM supply_goods_receipt_notes")->fetchColumn();
if ($cnt > 0) {
    echo "Goods receipt notes already seeded ({$cnt} records found).\n";
    exit(0);
}

// 1. Master GRNs
$grns = [
    // GRN 1: Exact 3-Way Match (100% Quality Pass)
    [
        'id' => 1,
        'grn_number' => 'GRN-2026-0001',
        'purchase_order_id' => null,
        'po_number' => 'PO-2026-00101',
        'supplier_id' => 7,
        'supplier_name' => 'Luzon MedSupply Distributors Inc.',
        'delivery_receipt_no' => 'DR-LM-98214',
        'carrier_name' => 'Luzon MedSupply Fleet Delivery',
        'vehicle_plate_no' => 'NBD-4891',
        'received_date' => '2026-10-24',
        'receiving_bay' => 'Hospital Central Receiving Dock Bay 1',
        'inspector_id' => 101,
        'inspector_name' => 'Eduardo Santos',
        'inspector_title' => 'Materials Management Receiving Officer',
        'package_condition' => 'intact_undamaged',
        'cold_chain' => 1,
        'temp' => 21.5,
        'sterility' => 1,
        'lot_expiry' => 1,
        'po_ordered_qty' => 90.00,
        'dr_qty' => 90.00,
        'accepted_qty' => 90.00,
        'rejected_qty' => 0.00,
        'po_amount' => 2225.00,
        'accepted_amount' => 2225.00,
        'variance_amount' => 0.00,
        'match_status' => 'matched_exact',
        'ap_status' => 'authorized_for_payment',
        'auth_by' => 'Dr. Arthur Sterling, CMO / AP Finance Lead',
        'rejection_reason' => null,
        'notes' => '100% Quality inspection pass. Carton seals intact. Authorized for full AP voucher disbursement.'
    ],

    // GRN 2: Quality Inspection Failure / Partial Rejection (Crushed Boxes & Broken Seals)
    [
        'id' => 2,
        'grn_number' => 'GRN-2026-0002',
        'purchase_order_id' => null,
        'po_number' => 'PO-2026-00102',
        'supplier_id' => 11,
        'supplier_name' => 'PrimeCare Medical Equipment Inc.',
        'delivery_receipt_no' => 'DR-PC-55421',
        'carrier_name' => 'Freight Express Logistics Courier',
        'vehicle_plate_no' => 'WXY-8201',
        'received_date' => '2026-10-25',
        'receiving_bay' => 'Hospital Central Receiving Dock Bay 2',
        'inspector_id' => 101,
        'inspector_name' => 'Eduardo Santos',
        'inspector_title' => 'Materials Management Receiving Officer',
        'package_condition' => 'compromised_seals',
        'cold_chain' => 1,
        'temp' => 22.0,
        'sterility' => 0,
        'lot_expiry' => 1,
        'po_ordered_qty' => 70.00,
        'dr_qty' => 70.00,
        'accepted_qty' => 62.00,
        'rejected_qty' => 8.00,
        'po_amount' => 3860.00,
        'accepted_amount' => 3340.00,
        'variance_amount' => -520.00,
        'match_status' => 'quantity_variance_flagged',
        'ap_status' => 'partially_authorized',
        'auth_by' => 'Dr. Arthur Sterling, CMO / AP Finance Lead',
        'rejection_reason' => '8 outer dispenser boxes crushed and inner sterile surgical glove pouches breached in transit. Rejected at receiving dock.',
        'notes' => 'Debit memo issued to vendor for 8 rejected surgical glove boxes ($520.00). AP authorized for $3,340.00 accepted goods.'
    ],

    // GRN 3: Short Delivery Quantity Variance
    [
        'id' => 3,
        'grn_number' => 'GRN-2026-0003',
        'purchase_order_id' => null,
        'po_number' => 'PO-2026-00103',
        'supplier_id' => 7,
        'supplier_name' => 'Luzon MedSupply Distributors Inc.',
        'delivery_receipt_no' => 'DR-LM-99014',
        'carrier_name' => 'Luzon MedSupply Van',
        'vehicle_plate_no' => 'ABC-1920',
        'received_date' => '2026-10-25',
        'receiving_bay' => 'Hospital Central Receiving Dock Bay 1',
        'inspector_id' => 101,
        'inspector_name' => 'Eduardo Santos',
        'inspector_title' => 'Materials Management Receiving Officer',
        'package_condition' => 'intact_undamaged',
        'cold_chain' => 1,
        'temp' => 23.0,
        'sterility' => 1,
        'lot_expiry' => 1,
        'po_ordered_qty' => 60.00,
        'dr_qty' => 45.00,
        'accepted_qty' => 45.00,
        'rejected_qty' => 0.00,
        'po_amount' => 690.00,
        'accepted_amount' => 517.50,
        'variance_amount' => -172.50,
        'match_status' => 'partial_delivery_matched',
        'ap_status' => 'authorized_for_payment',
        'auth_by' => 'Dr. Arthur Sterling, CMO / AP Finance Lead',
        'rejection_reason' => null,
        'notes' => 'Partial delivery accepted: 45 of 60 disinfectant canisters delivered. Backorder balance of 15 canisters pending second shipment.'
    ],

    // GRN 4: Full Quality Rejection (Water Damage)
    [
        'id' => 4,
        'grn_number' => 'GRN-2026-0004',
        'purchase_order_id' => null,
        'po_number' => 'PO-2026-00104',
        'supplier_id' => 11,
        'supplier_name' => 'PrimeCare Medical Equipment Inc.',
        'delivery_receipt_no' => 'DR-PC-55902',
        'carrier_name' => 'Third-Party Cargo Truck',
        'vehicle_plate_no' => 'RST-9941',
        'received_date' => '2026-10-25',
        'receiving_bay' => 'Hospital Central Receiving Dock Bay 2',
        'inspector_id' => 101,
        'inspector_name' => 'Eduardo Santos',
        'inspector_title' => 'Materials Management Receiving Officer',
        'package_condition' => 'water_moisture_damage',
        'cold_chain' => 1,
        'temp' => 24.5,
        'sterility' => 0,
        'lot_expiry' => 1,
        'po_ordered_qty' => 20.00,
        'dr_qty' => 20.00,
        'accepted_qty' => 0.00,
        'rejected_qty' => 20.00,
        'po_amount' => 760.00,
        'accepted_amount' => 0.00,
        'variance_amount' => -760.00,
        'match_status' => 'rejected_quality_failure',
        'ap_status' => 'payment_blocked_rejected',
        'auth_by' => null,
        'rejection_reason' => 'Severe water damage to master carton during rainy transit. Moisture penetrated packaging of sterile endotracheal tubes.',
        'notes' => 'ENTIRE SHIPMENT REJECTED. Carrier signed return receipt on dock. AP payment blocked.'
    ]
];

$stmtGRN = $pdo->prepare("
    INSERT INTO `supply_goods_receipt_notes` (
        `id`, `grn_number`, `purchase_order_id`, `po_number`,
        `supplier_id`, `supplier_name`, `delivery_receipt_no`, `carrier_name`,
        `vehicle_plate_no`, `received_date`, `receiving_bay`, `inspector_employee_id`,
        `inspector_name`, `inspector_title`, `package_condition`, `cold_chain_verified`,
        `temperature_celsius`, `sterility_seal_inspected`, `lot_expiry_inspected`,
        `po_total_ordered_qty`, `delivery_receipt_qty`, `accepted_qty`, `rejected_qty`,
        `po_total_amount`, `accepted_total_amount`, `variance_amount`,
        `three_way_match_status`, `ap_authorization_status`, `authorized_by`,
        `authorized_at`, `rejection_reason`, `general_notes`, `status`,
        `created_at`, `updated_at`
    ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        NOW(), ?, ?, 'authorized',
        NOW(), NOW()
    )
");

foreach ($grns as $g) {
    $stmtGRN->execute([
        $g['id'], $g['grn_number'], $g['purchase_order_id'], $g['po_number'],
        $g['supplier_id'], $g['supplier_name'], $g['delivery_receipt_no'], $g['carrier_name'],
        $g['vehicle_plate_no'], $g['received_date'], $g['receiving_bay'], $g['inspector_id'],
        $g['inspector_name'], $g['inspector_title'], $g['package_condition'], $g['cold_chain'],
        $g['temp'], $g['sterility'], $g['lot_expiry'],
        $g['po_ordered_qty'], $g['dr_qty'], $g['accepted_qty'], $g['rejected_qty'],
        $g['po_amount'], $g['accepted_amount'], $g['variance_amount'],
        $g['match_status'], $g['ap_status'], $g['auth_by'],
        $g['rejection_reason'], $g['notes']
    ]);
}
echo "Seeded " . count($grns) . " Goods Receipt Notes (GRN).\n";

// 2. Line Items
$items = [
    // GRN 1 items
    [
        'grn_id' => 1,
        'line_no' => 1,
        'supply_item_id' => 1,
        'code' => 'SUP-MS-0001',
        'name' => 'Disposable Syringe 5mL with 21G Hypodermic Needle',
        'uom' => 'box',
        'po_qty' => 50.00,
        'del_qty' => 50.00,
        'acc_qty' => 50.00,
        'rej_qty' => 0.00,
        'rej_reason' => 'none',
        'cost' => 18.50,
        'line_acc' => 925.00,
        'lot' => 'BD-2026-09A',
        'exp' => '2029-08-31',
        'bin' => 'Central Warehouse Bin A-1',
        'notes' => 'Sterile seal verified. Expiry 2029.'
    ],
    [
        'grn_id' => 1,
        'line_no' => 2,
        'supply_item_id' => 5,
        'code' => 'SUP-MS-0005',
        'name' => 'Primary IV Infusion Set with Air Vent 20 drops/mL',
        'uom' => 'pack',
        'po_qty' => 40.00,
        'del_qty' => 40.00,
        'acc_qty' => 40.00,
        'rej_qty' => 0.00,
        'rej_reason' => 'none',
        'cost' => 32.50,
        'line_acc' => 1300.00,
        'lot' => 'TR-2026-07K',
        'exp' => '2029-06-30',
        'bin' => 'Central Warehouse Bin A-3',
        'notes' => 'Full count accepted.'
    ],

    // GRN 2 items
    [
        'grn_id' => 2,
        'line_no' => 1,
        'supply_item_id' => 3,
        'code' => 'SUP-MS-0003',
        'name' => 'IV Cannula / Catheter 20G Pink with Injection Port',
        'uom' => 'box',
        'po_qty' => 30.00,
        'del_qty' => 30.00,
        'acc_qty' => 30.00,
        'rej_qty' => 0.00,
        'rej_reason' => 'none',
        'cost' => 42.00,
        'line_acc' => 1260.00,
        'lot' => 'BB-2026-10A',
        'exp' => '2028-10-31',
        'bin' => 'Central Warehouse Bin B-2',
        'notes' => 'Boxes intact. Passed sterility inspection.'
    ],
    [
        'grn_id' => 2,
        'line_no' => 2,
        'supply_item_id' => 9,
        'code' => 'SUP-PPE-0009',
        'name' => 'Sterile Latex Surgical Gloves Size 7.5 Textured',
        'uom' => 'box',
        'po_qty' => 40.00,
        'del_qty' => 40.00,
        'acc_qty' => 32.00,
        'rej_qty' => 8.00,
        'rej_reason' => 'broken_sterility_seal',
        'cost' => 65.00,
        'line_acc' => 2080.00,
        'lot' => 'AN-2026-08S',
        'exp' => '2028-08-31',
        'bin' => 'Central Warehouse Bin C-1',
        'notes' => 'REJECTED 8 BOXES: Crushed corner boxes with breached sterile pouches. Quarantined for return.'
    ],

    // GRN 3 items
    [
        'grn_id' => 3,
        'line_no' => 1,
        'supply_item_id' => 15,
        'code' => 'SUP-CD-0015',
        'name' => 'Hospital Disinfectant Surface Wipes (Canister of 160)',
        'uom' => 'canister',
        'po_qty' => 60.00,
        'del_qty' => 45.00,
        'acc_qty' => 45.00,
        'rej_qty' => 0.00,
        'rej_reason' => 'none',
        'cost' => 11.50,
        'line_acc' => 517.50,
        'lot' => 'PDI-2026-10',
        'exp' => '2027-10-31',
        'bin' => 'Central Warehouse Bin D-4',
        'notes' => 'Short delivery of 15 canisters noted on DR slip. 45 canisters received in good order.'
    ],

    // GRN 4 items
    [
        'grn_id' => 4,
        'line_no' => 1,
        'supply_item_id' => 11,
        'code' => 'SUP-RA-0011',
        'name' => 'Endotracheal Tube Cuffed 7.5mm Murphy Eye',
        'uom' => 'box',
        'po_qty' => 20.00,
        'del_qty' => 20.00,
        'acc_qty' => 0.00,
        'rej_qty' => 20.00,
        'rej_reason' => 'crushed_packaging',
        'cost' => 38.00,
        'line_acc' => 0.00,
        'lot' => 'TF-2026-05',
        'exp' => '2029-05-31',
        'bin' => 'Quarantine Rejection Area',
        'notes' => 'TOTAL REJECTION: Wet, soaked outer packaging. Sterility integrity lost.'
    ]
];

$stmtItem = $pdo->prepare("
    INSERT INTO `supply_goods_receipt_items` (
        `grn_id`, `line_no`, `supply_item_id`, `item_code`,
        `item_name`, `unit_of_measure`, `po_ordered_qty`, `delivered_qty`,
        `accepted_qty`, `rejected_qty`, `rejection_reason`, `unit_cost`,
        `line_accepted_amount`, `batch_lot_number`, `expiry_date`,
        `storage_location`, `inspection_notes`, `created_at`
    ) VALUES (
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, NOW()
    )
");

foreach ($items as $it) {
    $stmtItem->execute([
        $it['grn_id'], $it['line_no'], $it['supply_item_id'], $it['code'],
        $it['name'], $it['uom'], $it['po_qty'], $it['del_qty'],
        $it['acc_qty'], $it['rej_qty'], $it['rej_reason'], $it['cost'],
        $it['line_acc'], $it['lot'], $it['exp'],
        $it['bin'], $it['notes']
    ]);
}

// Update sequence counter
$pdo->exec("UPDATE `billing_tariff_counters` SET `last_number` = 4 WHERE `counter_type` = 'GRN_NUMBER' AND `year` = 2026");

echo "Seeded " . count($items) . " GRN line items with quality inspection logs.\n";
echo "Goods receipt notes seeding completed successfully.\n";
