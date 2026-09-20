<?php

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Modules\InpatientAdmissions\Services\InpatientAdmissionsService;

try {
    $service = new InpatientAdmissionsService();
    $data = $service->getCensusWhiteboard();
    
    echo "=== TEST INPATIENT ADMISSIONS SERVICE ===\n";
    echo "Wards count: " . count($data['wards']) . "\n";
    echo "Beds count: " . count($data['beds']) . "\n";
    echo "Total Beds: " . $data['kpis']['total_beds'] . "\n";
    echo "Occupied Beds: " . $data['kpis']['occupied_count'] . "\n";
    echo "Available Beds: " . $data['kpis']['available_count'] . "\n";
    echo "BOR%: " . $data['kpis']['bed_occupancy_rate'] . "%\n";
    echo "ALOS: " . $data['kpis']['alos_days'] . " days\n";
    echo "Isolation Count: " . $data['kpis']['isolation_count'] . "\n";
    echo "SUCCESS\n";
} catch (Throwable $t) {
    echo "ERROR: " . $t->getMessage() . "\n" . $t->getTraceAsString() . "\n";
    exit(1);
}
