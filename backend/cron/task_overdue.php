<?php
/**
 * Tasks past their due time -> alert whoever the task is for (My Work tasks).
 *
 * The bell's poll already runs this every minute while anyone is logged in. Schedule this
 * script every few minutes as well, so overdue tasks are flagged when nobody has the app open:
 *   Windows Task Scheduler:  C:\xampp\php\php.exe C:\xampp\htdocs\usintellix-hospital-management-system\backend\cron\task_overdue.php
 *   Linux cron (every 5 minutes):  php /path/to/backend/cron/task_overdue.php
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$root = dirname(__DIR__);
chdir($root . '/public');
require_once $root . '/app/Core/Autoload.php';
App\Core\Env::load();

$done = (new App\Modules\MyWork\Services\TaskService())->runOverdue(true);
foreach ($done as $d) {
    echo date('Y-m-d H:i:s') . " task overdue: {$d['title']} -> {$d['to']} (#{$d['id']})\n";
}
