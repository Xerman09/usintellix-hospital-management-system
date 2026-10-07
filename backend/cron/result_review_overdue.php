<?php
/**
 * Results not reviewed within general_settings.result_review_days -> alert the ordering doctor.
 *
 * The bell's poll already runs this every 5 minutes while anyone is logged in. Schedule this
 * script as well (e.g. hourly), so results are flagged when nobody has the app open:
 *   Windows Task Scheduler:  C:\xampp\php\php.exe C:\xampp\htdocs\usintellix-hospital-management-system\backend\cron\result_review_overdue.php
 *   Linux cron (hourly):  php /path/to/backend/cron/result_review_overdue.php
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$root = dirname(__DIR__);
chdir($root . '/public');
require_once $root . '/app/Core/Autoload.php';
App\Core\Env::load();

$done = (new App\Modules\ResultsInbox\Services\ResultReviewService())->runOverdue(true);
foreach ($done as $d) {
    echo date('Y-m-d H:i:s') . " not reviewed for {$d['days']} days: {$d['test']} — {$d['patient']} (order #{$d['order_id']})\n";
}
