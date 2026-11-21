<?php

declare(strict_types=1);

/**
 * A child process, so that PasswordChangeGuard::enforce() can be tested at all.
 *
 * `enforce()` writes a 403 and calls exit, which is correct for middleware and
 * untestable in-process: the parent suite can only ever exercise `check()`,
 * the decision. That leaves the half that actually refuses the request --
 * the status code, the body the client switches on, and the audit row --
 * running for the first time in production, which is the wrong place.
 *
 * So the parent runs this, and reads what came out.
 *
 * Usage:  php tests/lib/password_gate_enforce_child.php <userId> <METHOD> <path>
 *
 * Prints whatever enforce() prints, then a marker line with the HTTP status it
 * set, which survives the exit because shutdown functions run on the way out.
 */

require_once __DIR__ . '/test_fixtures.php';

use App\Core\PasswordChangeGuard;
use App\Core\Router;

try {
    TestDatabase::use();
} catch (Throwable $e) {
    fwrite(STDERR, 'REFUSED: ' . $e->getMessage() . "\n");
    exit(2);
}

$userId = (int) ($argv[1] ?? 0);
$method = (string) ($argv[2] ?? 'GET');
$path = (string) ($argv[3] ?? '/patients');

Router::$current = ['method' => strtoupper($method), 'path' => $path];

register_shutdown_function(static function (): void {
    echo "\n__STATUS__=" . http_response_code() . "\n";
});

PasswordChangeGuard::enforce($userId, ['must_change_password' => true]);

// Only reached when enforce() decided not to block.
echo "__NOT_BLOCKED__\n";
