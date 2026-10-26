<?php
/**
 * Daily Clinical Quality & Hospital Utilization Aggregation Cron
 *
 * Runs nightly (e.g. at 00:15) to calculate and store daily KPIs:
 * - Bed Occupancy Rate (BOR %)
 * - Average Length of Stay (ALOS in days)
 * - Bed Turnover Interval (BTI in days)
 * - 30-Day Readmissions
 * - Inpatient Mortality Rate %
 * - Healthcare-Associated Infections (HAI / SSI)
 *
 * Usage:
 *   Windows Task Scheduler (Daily 00:15):
 *     C:\xampp\php\php.exe C:\xampp\htdocs\ims\usintellix-hospital-management-system\backend\cron\daily_clinical_quality_kpis.php
 *
 *   Backfill last 30 days:
 *     C:\xampp\php\php.exe C:\xampp\htdocs\ims\usintellix-hospital-management-system\backend\cron\daily_clinical_quality_kpis.php --days=30
 *
 *   Specific date:
 *     C:\xampp\php\php.exe C:\xampp\htdocs\ims\usintellix-hospital-management-system\backend\cron\daily_clinical_quality_kpis.php 2026-10-25
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    echo "CLI execution only.\n";
    exit(1);
}

$root = dirname(__DIR__);
chdir($root . '/public');
require_once $root . '/app/Core/Autoload.php';
require_once $root . '/app/Core/Env.php';
require_once $root . '/app/Core/Database.php';
require_once $root . '/app/Modules/Reports/Services/ClinicalQualityAnalyticsService.php';

App\Core\Env::load();

$service = new App\Modules\Reports\Services\ClinicalQualityAnalyticsService();

echo "[" . date('Y-m-d H:i:s') . "] Starting Clinical Quality & Utilization KPI Aggregation...\n";

// Check for arguments
$argv = $_SERVER['argv'] ?? [];
$daysArg = null;
$specificDate = null;

foreach ($argv as $arg) {
    if (strpos($arg, '--days=') === 0) {
        $daysArg = (int)substr($arg, 7);
    } elseif (preg_match('/^\d{4}-\d{2}-\d{2}$/', $arg)) {
        $specificDate = $arg;
    }
}

if ($specificDate) {
    echo "Calculating for specific date: {$specificDate}\n";
    $res = $service->calculateForDate($specificDate, 'manual_recalc');
    echo "Completed! Processed {$res['processed']} targets (Hospital-Wide + Wards).\n";
} elseif ($daysArg && $daysArg > 0) {
    $start = date('Y-m-d', strtotime("-{$daysArg} days"));
    $end = date('Y-m-d');
    echo "Backfilling date range: {$start} to {$end} ({$daysArg} days)...\n";
    $res = $service->backfillRange($start, $end, 'manual_recalc');
    echo "Completed backfill! Calculated {$res['days_calculated']} days.\n";
} else {
    // Default Nightly Cron behavior: Calculate yesterday (formal midnight census) AND today's snapshot
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $today = date('Y-m-d');

    echo "Running aggregation for yesterday: {$yesterday}\n";
    $res1 = $service->calculateForDate($yesterday, 'nightly_cron');
    echo "Yesterday completed: {$res1['processed']} targets aggregated.\n";

    echo "Updating current snapshot for today: {$today}\n";
    $res2 = $service->calculateForDate($today, 'realtime_snapshot');
    echo "Today completed: {$res2['processed']} targets aggregated.\n";
}

echo "[" . date('Y-m-d H:i:s') . "] Clinical Quality Aggregation finished successfully.\n";
