<?php
require_once 'backend/app/Core/Autoload.php';
require_once 'backend/config/database.php';

$s = new App\Modules\OrManagement\Services\OrManagementService();
$reg = $s->createSuite([
    'suite_code' => 'OR-07',
    'suite_name' => 'Robotic Surgery & Advanced Urology Suite',
    'suite_type' => 'Hybrid OR',
    'floor_location' => '3rd Floor - West Wing',
    'equipment_spec' => 'DaVinci Xi Robot, 4K Laparoscopic Tower, C-Arm',
    'status' => 'Available'
]);
echo "Registered Suite ID: " . $reg['id'] . ", Code: " . $reg['suite_code'] . "\n";

$upd = $s->updateSuite($reg['id'], [
    'suite_code' => 'OR-07',
    'suite_name' => 'Robotic & Urology Suite 7 (Updated)',
    'suite_type' => 'Hybrid OR',
    'floor_location' => '3rd Floor - Suite 701',
    'equipment_spec' => 'DaVinci Xi Robot, Dual Console, C-Arm'
]);
echo "Updated Name: " . $upd['suite_name'] . ", Floor: " . $upd['floor_location'] . "\n";

$suites = $s->getSuites();
echo "Total Active Suites now: " . count($suites) . "\n";
