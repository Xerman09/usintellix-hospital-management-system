<?php
/**
 * My Chart notifications: queue what has become due, then send what is waiting.
 *
 * Queues appointment reminders a day ahead, "check-in is open" when it opens, and
 * "your result is ready" for anything released in the last week. Each is keyed so the
 * same thing is never queued twice, which makes this safe to run as often as you like.
 * Then it drains the outbox through the hospital's mail settings.
 *
 * Nothing clinical is ever put in a message -- only that something is ready to read.
 *
 * Schedule it every 5 minutes:
 *   Windows Task Scheduler:  C:\xampp\php\php.exe C:\xampp\htdocs\ims\usintellix-hospital-management-system\backend\cron\portal_notify.php
 *   Linux cron:  *\/5 * * * * php /path/to/backend/cron/portal_notify.php
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

$root = dirname(__DIR__);
chdir($root . '/public');
require_once $root . '/app/Core/Autoload.php';
App\Core\Env::load();

use App\Modules\MyChart\Services\PortalNotificationService;

$started = microtime(true);
$queued = ['appointments' => 0, 'checkin' => 0, 'results' => 0, 'statements' => 0];

try {
    $queued['appointments'] = PortalNotificationService::queueAppointmentReminders();
} catch (Throwable $e) {
    fwrite(STDERR, 'appointment reminders failed: ' . $e->getMessage() . PHP_EOL);
}

try {
    $queued['checkin'] = PortalNotificationService::queueCheckinOpen();
} catch (Throwable $e) {
    fwrite(STDERR, 'check-in notices failed: ' . $e->getMessage() . PHP_EOL);
}

try {
    $queued['results'] = PortalNotificationService::queueReleasedResults();
} catch (Throwable $e) {
    fwrite(STDERR, 'result notices failed: ' . $e->getMessage() . PHP_EOL);
}

try {
    $queued['statements'] = PortalNotificationService::queueStatements();
} catch (Throwable $e) {
    fwrite(STDERR, 'statement notices failed: ' . $e->getMessage() . PHP_EOL);
}

$drained = ['sent' => 0, 'failed' => 0, 'skipped' => 0];

try {
    $drained = PortalNotificationService::drain();
} catch (Throwable $e) {
    fwrite(STDERR, 'sending failed: ' . $e->getMessage() . PHP_EOL);
}

printf(
    "portal_notify: queued %d appointment, %d check-in, %d result, %d statement; sent %d, failed %d, skipped %d (%.2fs)\n",
    $queued['appointments'], $queued['checkin'], $queued['results'], $queued['statements'],
    $drained['sent'], $drained['failed'], $drained['skipped'], microtime(true) - $started
);
