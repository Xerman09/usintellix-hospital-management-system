<?php
require_once __DIR__ . '/app/Core/Autoload.php';

use App\Core\Database;
use App\Modules\Reports\Services\ReportService;

// Load env
$envPath = __DIR__ . '/.env';
if (file_exists($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        putenv($line);
    }
}

try {
    $service = new ReportService();
    $data = $service->getPatientList(['provider_id' => '']);
    echo json_encode(['success' => true, 'data' => count($data)]);
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
