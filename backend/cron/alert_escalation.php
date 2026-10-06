<?php
/**
 * Escalate overdue alerts (Alerts Phase 2).
 *
 * The bell's poll already runs this every 30 seconds while anyone is logged in. Schedule
 * this script every minute as well, so alerts still escalate when nobody has the app open:
 *   Windows Task Scheduler:  C:\xampp\php\php.exe C:\xampp\htdocs\usintellix-hospital-management-system\backend\cron\alert_escalation.php
 *   Linux cron:              * * * * * php /path/to/backend/cron/alert_escalation.php
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$root = dirname(__DIR__);
chdir($root . '/public');
require_once $root . '/app/Core/Autoload.php';
App\Core\Env::load();

$done = (new App\Modules\Alerts\Services\AlertEscalationService())->run(true);
foreach ($done as $d) {
    echo date('Y-m-d H:i:s') . " alert #{$d['alert_id']} escalated to level {$d['level']}: {$d['to']}\n";
}
