<?php
require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Router;
use App\Core\Database;

$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/queue-tokens/display-board';
$_SERVER['SCRIPT_NAME'] = '/index.php';

ob_start();
require __DIR__ . '/../backend/public/index.php';
$output = ob_get_clean();

echo "HTTP ROUTE OUTPUT LENGTH: " . strlen($output) . "\n";
$json = json_decode($output, true);
if ($json && isset($json['success']) && $json['success'] === true) {
    echo "SUCCESS: Public display board endpoint responded without authentication!\n";
    echo "Now Calling: " . count($json['data']['now_calling']) . "\n";
    echo "Up Next: " . count($json['data']['up_next']) . "\n";
    echo "Departments Available: " . count($json['data']['all_departments']) . "\n";
} else {
    echo "ERROR RESPONSE:\n" . substr($output, 0, 500) . "\n";
}
