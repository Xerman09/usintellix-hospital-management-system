<?php
/**
 * ER waiting times: patients past the target for their acuity (not triaged in time, or not seen
 * by a doctor in time) -> alert the ER team.
 *
 * The bell's poll and the ER screen already run this every minute while anyone is logged in.
 * Schedule it every minute as well, so the alerts go out when nobody has the app open:
 *   Windows Task Scheduler:  C:\xampp\php\php.exe C:\xampp\htdocs\usintellix-hospital-management-system\backend\cron\er_wait.php
 *   Linux cron:  * * * * * php /path/to/backend/cron/er_wait.php
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$root = dirname(__DIR__);
chdir($root . '/public');
require_once $root . '/app/Core/Autoload.php';
App\Core\Env::load();

foreach ((new App\Modules\Er\Services\ErBoardService())->runWaits(true) as $s) {
    echo date('Y-m-d H:i:s') . " ER wait alert: {$s['visit']} ({$s['stage']})\n";
}
