<?php

declare(strict_types=1);

/**
 * Apply one seed file, to the test database or to the live one.
 *
 *   php scratch/apply_seed.php <file> test     -- the disposable database
 *   php scratch/apply_seed.php <file> live     -- whatever backend/.env names
 *
 * Why this exists rather than the mysql client: `mysql -p""` hangs on this
 * machine, so seeds are applied through PDO. Comment lines are stripped BEFORE
 * the statements are split, because a seed header that contains a semicolon in
 * ordinary prose -- "a thirteenth row exists; pointing the suite at ..." --
 * otherwise splits the file in the middle of a sentence and hands the fragment
 * to the server as SQL.
 *
 * It prints the database it is connected to before doing anything, and never
 * prints a password.
 */

$file = $argv[1] ?? '';
$target = $argv[2] ?? '';

if ($file === '' || !is_file($file) || !in_array($target, ['test', 'live'], true)) {
    fwrite(STDERR, "usage: php scratch/apply_seed.php <file> test|live\n");
    exit(1);
}

if ($target === 'test') {
    require_once __DIR__ . '/../tests/lib/test_database.php';
    TestDatabase::use();
} else {
    require_once __DIR__ . '/../backend/app/Core/Autoload.php';
    App\Core\Env::load();
}

$db = App\Core\Database::connection();

echo 'connected to: ' . $db->query('SELECT DATABASE()')->fetchColumn() . "\n";

$sql = (string) file_get_contents($file);

// Comments first, statements second.
$body = implode("\n", array_filter(
    explode("\n", $sql),
    static fn (string $line): bool => !str_starts_with(ltrim($line), '--')
));

$applied = 0;

foreach (explode(';', $body) as $statement) {
    $statement = trim($statement);

    if ($statement === '') {
        continue;
    }

    $db->exec($statement);
    $applied++;
}

echo "statements applied: {$applied}\n";
