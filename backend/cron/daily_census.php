<?php
/**
 * Save yesterday's midnight census (and any day missed in the last month).
 *
 * The bell's poll and the Census screen also save it when this hasn't run, but schedule it
 * just after midnight so the beds out of service are captured as they were:
 *   Windows Task Scheduler (daily, 00:05):  C:\xampp\php\php.exe C:\xampp\htdocs\usintellix-hospital-management-system\backend\cron\daily_census.php
 *   Linux cron:  5 0 * * * php /path/to/backend/cron/daily_census.php
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$root = dirname(__DIR__);
chdir($root . '/public');
require_once $root . '/app/Core/Autoload.php';
App\Core\Env::load();

foreach ((new App\Modules\Census\Services\CensusService())->ensureSaved(true) as $d) {
    echo date('Y-m-d H:i:s') . " census saved: {$d}\n";
}
