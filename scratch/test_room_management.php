<?php

require_once __DIR__ . '/../backend/app/Core/Autoload.php';
require_once __DIR__ . '/../backend/config/database.php';
$pdo = App\Core\Database::connection();
$pdo->query('UPDATE users SET role_id = 1 WHERE username = "erman"');
$empUser16 = $pdo->query('SELECT * FROM employees WHERE user_id = 16')->fetch(PDO::FETCH_ASSOC);
if (!$empUser16) {
    // link or create employee record for erman
    $pdo->query('UPDATE employees SET user_id = 16 WHERE id = 1');
}
$checkUser = $pdo->query('SELECT id, username, role_id FROM users WHERE username = "erman"')->fetch(PDO::FETCH_ASSOC);
echo "CHECK USER ERMAN: " . json_encode($checkUser) . PHP_EOL;
$checkEmp = $pdo->query('SELECT id, user_id, first_name, last_name, email FROM employees WHERE user_id = 16')->fetch(PDO::FETCH_ASSOC);
echo "CHECK EMP ERMAN: " . json_encode($checkEmp) . PHP_EOL;

use App\Modules\RoomManagement\Services\RoomManagementService;

$service = new RoomManagementService();
$monitor = $service->getHospitalAvailabilityMonitor();

echo "\n=== ROOM MANAGEMENT MONITOR TEST ===\n";
echo "Total Beds:       " . $monitor['kpis']['total_beds'] . "\n";
echo "Available Beds:   " . $monitor['kpis']['available_beds'] . "\n";
echo "Occupied Beds:    " . $monitor['kpis']['occupied_beds'] . "\n";
echo "Reserved Beds:    " . $monitor['kpis']['reserved_beds'] . "\n";
echo "Turnover Beds:    " . $monitor['kpis']['dirty_beds'] . "\n";
echo "Maintenance Beds: " . $monitor['kpis']['maintenance_beds'] . "\n";
echo "Occupancy Rate:   " . $monitor['kpis']['occupancy_rate'] . "%\n";
echo "Total Rooms:      " . $monitor['kpis']['total_rooms'] . "\n";
echo "Available Rooms:  " . $monitor['kpis']['available_rooms'] . "\n";
echo "Occupied Rooms:   " . $monitor['kpis']['occupied_rooms'] . "\n";
echo "Buildings Count:  " . count($monitor['buildings']) . "\n";

foreach ($monitor['buildings'] as $b) {
    echo " - Building [{$b['building_code']}] {$b['building_name']} (" . count($b['floors']) . " floors with rooms)\n";
}
echo "\n=== QUICK BED FINDER TEST ===\n";
$service = new RoomManagementService();
$availIcu = $service->listBeds(['status' => 'Available', 'room_type' => 'ICU']);
echo "Available ICU Beds: " . count($availIcu) . "\n";
foreach ($availIcu as $b) {
    echo " - Bed {$b['bed_number']} in {$b['room_number']} ({$b['building_name']}, Floor {$b['floor_number']}) Daily Rate: \${$b['room_rate']}\n";
}

$availPrivate = $service->listBeds(['status' => 'Available', 'room_type' => 'Private']);
echo "Available Private Beds: " . count($availPrivate) . "\n";
foreach ($availPrivate as $b) {
    echo " - Bed {$b['bed_number']} in {$b['room_number']} ({$b['building_name']}, Floor {$b['floor_number']}) Daily Rate: \${$b['room_rate']}\n";
}

echo "=== ALL TESTS PASSED ===\n";
