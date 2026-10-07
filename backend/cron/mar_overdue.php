<?php
/**
 * Late medicine doses on the MAR -> alert the patient's nurse.
 *
 * The bell's poll already runs this every 60 seconds while anyone is logged in. Schedule
 * this script every few minutes as well, so late doses are flagged when nobody has the app open:
 *   Windows Task Scheduler:  C:\xampp\php\php.exe C:\xampp\htdocs\usintellix-hospital-management-system\backend\cron\mar_overdue.php
 *   Linux cron (every 5 minutes):  php /path/to/backend/cron/mar_overdue.php
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$root = dirname(__DIR__);
chdir($root . '/public');
require_once $root . '/app/Core/Autoload.php';
App\Core\Env::load();

$done = (new App\Modules\InpatientOrders\Services\MarService())->runOverdue(true);
foreach ($done as $d) {
    echo date('Y-m-d H:i:s') . " late dose: {$d['drug']} due {$d['at']} — {$d['patient']} (order #{$d['order_id']})\n";
}
