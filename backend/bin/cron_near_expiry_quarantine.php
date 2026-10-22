<?php

declare(strict_types=1);

/**
 * Nightly Cron Job: Near-Expiry Automated Quarantine Lock (<60 days)
 *
 * Scans all inventory lots across all storage locations and flags lots expiring
 * within <60 days (or past expiry) as Quarantined (`is_quarantined = 1`, `is_active = 0`),
 * preventing them from being selected during dispensing.
 *
 * Usage:
 *   php backend/bin/cron_near_expiry_quarantine.php [--days=60] [--quiet]
 */

require_once __DIR__ . '/../app/Core/Autoload.php';

use App\Core\Env;
use App\Modules\DrugInventory\Services\NearExpiryQuarantineService;

Env::load();

$options = getopt('', ['days::', 'quiet']);
$days = isset($options['days']) ? (int) $options['days'] : 60;
$quiet = isset($options['quiet']);

if (!$quiet) {
    echo "========================================================\n";
    echo "Pharmacy Near-Expiry Automated Quarantine Lock Cron Job\n";
    echo "Timestamp: " . date('Y-m-d H:i:s') . "\n";
    echo "Scanning for lots expiring in < {$days} days...\n";
    echo "========================================================\n";
}

try {
    $service = new NearExpiryQuarantineService();
    $result = $service->runQuarantineScan($days, 'cron_nightly', null);

    if (!$quiet) {
        echo "Status: SUCCESS\n";
        echo "Summary: " . $result['message'] . "\n";
        echo "Quarantined Lots: " . $result['data']['lots_quarantined_count'] . "\n";
        echo "Total Quarantined Quantity: " . $result['data']['total_quantity_quarantined'] . " units\n";

        if (!empty($result['data']['affected_lots'])) {
            echo "\nLocked Lots:\n";
            foreach ($result['data']['affected_lots'] as $lot) {
                echo sprintf(
                    " - [%s] %s | Lot: %s | Qty: %s %s | Exp: %s (%s days left)\n",
                    $lot['warehouse_name'],
                    $lot['drug_name'],
                    $lot['lot_number'],
                    $lot['quantity_on_hand'],
                    $lot['unit_name'],
                    $lot['expires_date'],
                    $lot['days_remaining']
                );
            }
        }
        echo "Done.\n";
    }
    exit(0);
} catch (\Throwable $e) {
    fwrite(STDERR, "ERROR: Near-expiry quarantine scan failed: " . $e->getMessage() . "\n");
    exit(1);
}
