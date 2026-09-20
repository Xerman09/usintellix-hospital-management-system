<?php

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Router;
use App\Core\Session;

// Mock session user
Session::put('user', [
    'id' => 1,
    'username' => 'admin',
    'role' => 'admin'
]);

$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/inpatient-admissions/whiteboard';

echo "=== TESTING INPATIENT ADMISSIONS ROUTE DISPATCH ===\n";

// Capture output
ob_start();
try {
    $router = require __DIR__ . '/../backend/routes/web.php';
    $router->dispatch('GET', '/inpatient-admissions/whiteboard');
    $output = ob_get_clean();
    
    echo "HTTP Output Preview:\n" . substr($output, 0, 300) . "...\n";
    $json = json_decode($output, true);
    if ($json && ($json['status'] ?? '') === 'success') {
        echo "[OK] Whiteboard API returned success!\n";
        echo "Total wards: " . count($json['data']['wards']) . "\n";
        echo "Total beds: " . count($json['data']['beds']) . "\n";
        echo "Total beds KPI: " . $json['data']['kpis']['total_beds'] . "\n";
        echo "BOR: " . $json['data']['kpis']['bed_occupancy_rate'] . "%\n";
    } else {
        echo "[FAIL] API did not return success JSON.\n";
        exit(1);
    }
} catch (Throwable $t) {
    ob_end_clean();
    echo "ROUTING DISPATCH ERROR: " . $t->getMessage() . "\n" . $t->getTraceAsString() . "\n";
    exit(1);
}
