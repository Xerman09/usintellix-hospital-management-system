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
 * It also runs the Fast Pass engine (M18), which is the only step here that changes
 * anything other than the outbox: it expires offers nobody answered, closes slots that
 * have come too close to offer, finds cancellations made at the desk, and sends the next
 * round of offers.
 *
 * THE ORDER OF THOSE TWO IS LOAD-BEARING. The sweep must run BEFORE the drain, because an
 * offer it creates queues an email that the drain then sends in the same pass. Moving the
 * sweep after the drain would leave every offer's email sitting until the next run -- five
 * minutes out of a four-hour deadline, every time, for nothing. If anybody ever reorders
 * this file, that is the line that matters.
 *
 * Five minutes is also now a floor rather than a preference. Offers expire when this runs,
 * so the interval is the worst-case lateness of an expiry, and a slot cannot be passed to
 * the next patient until the previous round has been settled.
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

use App\Modules\MyChart\Services\PortalAudit;
use App\Modules\MyChart\Services\PortalFastPassService;
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

// Fast Pass (M18). Before the drain -- see the note at the top of this file.
//
// In its own try/catch like every other step here, and that matters more for this
// one: the sweep is the only step that writes outside the outbox, and a failure in
// it must not stop mail that is already queued from going out.
$fastpass = [
    'offers_sent' => 0, 'expired_offers' => 0, 'voided_offers' => 0,
    'closed_slots' => 0, 'found_slots' => 0, 'waiting' => 0,
];

try {
    $fastpass = PortalFastPassService::sweep();

    // Audited only when it actually did something. Every five minutes forever
    // would otherwise be 288 rows a day saying nothing happened, and the one row
    // that matters -- the morning six offers went out -- would be lost among them.
    if ($fastpass['offers_sent'] || $fastpass['expired_offers'] || $fastpass['voided_offers']
        || $fastpass['closed_slots'] || $fastpass['found_slots']) {
        PortalAudit::action(null, null, 'Fast Pass Swept', sprintf(
            'Scheduled sweep: %d offers sent, %d expired, %d voided, %d slots closed, %d found.',
            $fastpass['offers_sent'],
            $fastpass['expired_offers'],
            $fastpass['voided_offers'],
            $fastpass['closed_slots'],
            $fastpass['found_slots']
        ));
    }
} catch (Throwable $e) {
    fwrite(STDERR, 'fast pass sweep failed: ' . $e->getMessage() . PHP_EOL);
}

$drained = ['sent' => 0, 'failed' => 0, 'skipped' => 0];

try {
    $drained = PortalNotificationService::drain();
} catch (Throwable $e) {
    fwrite(STDERR, 'sending failed: ' . $e->getMessage() . PHP_EOL);
}

printf(
    "portal_notify: queued %d appointment, %d check-in, %d result, %d statement; "
    . "fast pass %d offered / %d expired / %d closed / %d found (%d waiting); "
    . "sent %d, failed %d, skipped %d (%.2fs)\n",
    $queued['appointments'], $queued['checkin'], $queued['results'], $queued['statements'],
    $fastpass['offers_sent'], $fastpass['expired_offers'], $fastpass['closed_slots'],
    $fastpass['found_slots'], $fastpass['waiting'],
    $drained['sent'], $drained['failed'], $drained['skipped'], microtime(true) - $started
);
