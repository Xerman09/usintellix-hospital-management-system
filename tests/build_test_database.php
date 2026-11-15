<?php

declare(strict_types=1);

/**
 * Build (or rebuild) the disposable database the write tests run against.
 *
 *   php tests/build_test_database.php            -- create if absent, top up
 *   php tests/build_test_database.php --fresh    -- drop and build from scratch
 *   php tests/build_test_database.php --drop     -- delete it and stop
 *
 * The database name comes from PORTAL_TEST_DB, or TestDatabase::DEFAULT_NAME.
 * It will not touch the database in backend/.env -- see the guards in
 * tests/lib/test_database.php.
 *
 * A fresh build applies every file in backend/database/schema (several hundred)
 * and then every .sql in backend/database/seed, so it takes a few minutes. That
 * is the point: it is built from the same files the real database is built from,
 * so there is no fixture dump to drift out of date.
 */

require_once __DIR__ . '/lib/test_database.php';

$fresh = in_array('--fresh', $argv, true);
$dropOnly = in_array('--drop', $argv, true);

echo "==================================================\n";
echo "   Disposable test database (M9.5)\n";
echo "==================================================\n";

try {
    $name = TestDatabase::use();
} catch (Throwable $e) {
    echo "\n  REFUSED: " . $e->getMessage() . "\n";
    exit(1);
}

echo "  live database (untouched) : " . TestDatabase::liveDatabaseName() . "\n";
echo "  target database           : {$name}\n";

if ($dropOnly) {
    TestDatabase::drop();
    echo "\n  Dropped {$name}.\n";
    exit(0);
}

echo "  mode                      : " . ($fresh ? 'fresh (drop first)' : 'reuse if present') . "\n\n";

$started = microtime(true);

try {
    $result = TestDatabase::build($fresh);
} catch (Throwable $e) {
    echo "  FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

$elapsed = round(microtime(true) - $started, 1);

$schema = $result['schema'];

echo "  schema: " . ($schema['status'] ?? '?')
    . ", " . ($schema['total_files'] ?? 0) . " files"
    . ", " . ($schema['applied_now_count'] ?? 0) . " applied now"
    . ", " . ($schema['already_applied'] ?? 0) . " already applied\n";

$schemaWarnings = $schema['warnings'] ?? [];

if (!empty($schemaWarnings)) {
    echo "\n  Schema files that reported something other than a benign duplicate:\n";

    foreach ($schemaWarnings as $file => $messages) {
        echo "    {$file}\n";
        foreach (array_slice((array) $messages, 0, 3) as $message) {
            echo "      - " . trim(substr((string) $message, 0, 160)) . "\n";
        }
    }
}

echo "\n  seeds: " . $result['seeds']['files'] . " files applied\n";

$seedWarnings = $result['seeds']['warnings'];

if (!empty($seedWarnings)) {
    echo "\n  Seeds that reported something other than a benign duplicate:\n";

    foreach ($seedWarnings as $file => $messages) {
        echo "    {$file}\n";
        foreach (array_slice((array) $messages, 0, 3) as $message) {
            echo "      - " . trim(substr((string) $message, 0, 160)) . "\n";
        }
    }
}

// A built database is only useful if the things the portal needs are actually in
// it. Counting a few of them is cheaper than discovering it inside a test.
//
// The database name is printed again, from the connection itself rather than from
// what we asked for, because that is the one fact that makes these numbers mean
// anything. Counts alone cannot tell you which database they came from, and the
// first version of this script printed live numbers under a test heading.
$pdo = \App\Core\Database::connection();

echo "\n  Spot check (on " . $pdo->query('SELECT DATABASE()')->fetchColumn() . "):\n";

$checks = [
    'tables' => "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()",
    'roles' => 'SELECT COUNT(*) FROM roles',
    'patient role capabilities' => "SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.name = 'patient' AND rp.module = 'mychart' AND rp.is_granted = 1",
    'practice rules' => 'SELECT COUNT(*) FROM practice_rules',
    'health maintenance items' => 'SELECT COUNT(*) FROM portal_health_maintenance_items',
    'diagnosis guides' => 'SELECT COUNT(*) FROM portal_diagnosis_guides',
    'questionnaires' => 'SELECT COUNT(*) FROM portal_questionnaires',
    'patients (should be 0)' => 'SELECT COUNT(*) FROM patients',
];

foreach ($checks as $label => $sql) {
    try {
        printf("    %-28s %s\n", $label, $pdo->query($sql)->fetchColumn());
    } catch (Throwable $e) {
        printf("    %-28s ERR %s\n", $label, substr($e->getMessage(), 0, 80));
    }
}

echo "\n  Done in {$elapsed}s.\n";
