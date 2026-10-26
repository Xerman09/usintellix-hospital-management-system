<?php

declare(strict_types=1);

/**
 * CLI & Web Database Migration Synchronizer (`backend/migrate.php`)
 *
 * Usage after `git pull`:
 *   1. Automatic: Triggered automatically on the first API call via `Database::connection()` -> `AutoMigrator::ensureUpToDate()`.
 *   2. Manual CLI: `php backend/migrate.php` (forces a full verification scan of all `backend/database/schema/*.sql` files).
 */

require_once __DIR__ . '/app/Core/Autoload.php';

use App\Core\Env;
use App\Core\Database;
use App\Core\AutoMigrator;

Env::load();

$pdo = Database::connection();
$result = AutoMigrator::ensureUpToDate($pdo, true);

if (PHP_SAPI === 'cli') {
    echo "=============================================================\n";
    echo " USIntellix HMS — Database Schema Auto-Migrator\n";
    echo "=============================================================\n";
    echo "Database        : " . ($result['database'] ?? 'unknown') . "\n";
    echo "Status          : " . ($result['status'] ?? 'unknown') . "\n";
    echo "Total SQL Files : " . ($result['total_files'] ?? 0) . "\n";
    echo "Already Applied : " . ($result['already_applied'] ?? 0) . "\n";
    echo "Newly Applied   : " . ($result['applied_now_count'] ?? 0) . "\n";
    if (!empty($result['applied_now'])) {
        echo "\nApplied Migrations:\n";
        foreach ($result['applied_now'] as $file) {
            echo "  + {$file}\n";
        }
    }
    echo "=============================================================\n";
} else {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'message' => 'Database schema synchronized successfully.',
        'data'    => $result
    ], JSON_PRETTY_PRINT);
}
