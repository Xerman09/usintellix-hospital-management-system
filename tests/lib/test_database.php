<?php

declare(strict_types=1);

/**
 * A disposable database for the tests that have to write (Phase M9.5).
 *
 * Why this exists
 * ---------------
 * M10 through M14 shipped with their refusal paths covered and their *successful*
 * writes not, for one reason: the only database available was the live one. A test
 * that proved "cancelling an appointment works" would have cancelled a real
 * appointment; one that proved "the care-gap request lands" left a row in a real
 * patient's portal claiming something they never said. That is not a theoretical
 * worry -- M14 did exactly that once, and the row had to be hunted down and
 * deleted by hand.
 *
 * So the write paths were left uncovered, which is the wrong trade: they are the
 * paths that actually change the record. This harness builds a database that can
 * be ruined without consequence, so those tests can be written honestly.
 *
 * How it works
 * ------------
 * There is no fixture dump to maintain. The database is built from the same two
 * directories the real one is built from:
 *
 *   1. backend/database/schema/*.sql -- applied by AutoMigrator, which the app
 *      already runs on every connection. A database it has never seen gets the
 *      full set. Nothing here reimplements that.
 *   2. backend/database/seed/*.sql   -- applied in filename order, through
 *      AutoMigrator's own statement splitter and benign-error list (reached by
 *      reflection; see applySeeds()). Seeds are not auto-run by anything, so
 *      this is the only place in the project that runs all of them.
 *
 * That is deliberate. A checked-in dump would be a third description of the
 * schema, and it would rot the first time someone added a migration without
 * remembering it existed. Building from the real files means the harness fails
 * loudly when a migration or a seed is broken, which is information worth having.
 *
 * The cost is a slow first build (several hundred files). It is a one-off:
 * build() without $fresh reuses whatever is already there.
 *
 * How the database is switched
 * ----------------------------
 * Env::load() only fills a key that is *not already* in $_ENV, so putting
 * DB_DATABASE there first wins, and backend/config/database.php -- which is what
 * Database reads -- picks it up with no code change. use() must therefore be
 * called before anything else touches Env or Database: Database is a singleton,
 * so the first connection in the process decides which database the whole test
 * run talks to.
 *
 * One wrinkle worth knowing: Env::load()'s putenv() call is NOT conditional, so
 * getenv('DB_DATABASE') still reports the live name even here. Env::get() reads
 * $_ENV before getenv(), so the override holds -- but anything that calls
 * getenv() directly would be misled. use() re-putenv()s the test name afterwards
 * to close that gap.
 *
 * Safety
 * ------
 * use() refuses to proceed unless the target name differs from the live one in
 * backend/.env AND contains "test". drop() refuses on the same grounds. The
 * guard is the point of the class: every method that can destroy data asks
 * first, so "run the write tests" can never mean "against production".
 */

require_once __DIR__ . '/../../backend/app/Core/Autoload.php';

use App\Core\AutoMigrator;
use App\Core\Database;
use App\Core\Env;

final class TestDatabase
{
    /**
     * Named so that a human reading a database list, or a DBA reading a slow
     * query log, can tell at a glance that it is disposable.
     */
    public const DEFAULT_NAME = 'usintellix_hms_portal_test';

    private static ?string $name = null;

    /**
     * The database the application itself uses, read straight out of backend/.env
     * rather than through Env::get(). Going through Env would trigger
     * Env::load(), and this is called *before* the override is in place -- the
     * one moment in the process where loading early would lock in the wrong
     * database.
     */
    public static function liveDatabaseName(): string
    {
        $envFile = __DIR__ . '/../../backend/.env';

        if (is_file($envFile)) {
            foreach ((array) file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
                $line = trim((string) $line);

                if ($line === '' || str_starts_with($line, '#')) {
                    continue;
                }

                if (str_starts_with($line, 'DB_DATABASE=')) {
                    return trim(substr($line, strlen('DB_DATABASE=')), " \t\"'");
                }
            }
        }

        // The same fallback backend/config/database.php uses. If .env is missing
        // entirely, assume the default name is live and let the guard refuse.
        return 'usintellix_hospital_management_system';
    }

    /**
     * Point this process at the disposable database. Call this first, before
     * Env::load(), before Database::connection(), before requiring anything that
     * might connect on its own.
     *
     * Returns the name in use, so a test can print it and a reader of the output
     * can see which database the numbers came from.
     */
    public static function use(?string $name = null): string
    {
        $name = $name ?? (string) (getenv('PORTAL_TEST_DB') ?: self::DEFAULT_NAME);
        $live = self::liveDatabaseName();

        if (strcasecmp($name, $live) === 0) {
            self::refuse(
                "the target database ({$name}) is the live one in backend/.env.\n" .
                "  These tests delete and rewrite rows. Pick another name."
            );
        }

        if (stripos($name, 'test') === false) {
            self::refuse(
                "the target database ({$name}) does not have \"test\" in its name.\n" .
                "  That is required, so a mistyped name cannot land on a real database."
            );
        }

        if (self::$name !== null && self::$name !== $name) {
            self::refuse(
                "this process is already connected to {$name}.\n" .
                "  Database is a singleton -- the first connection decides, so a second\n" .
                "  database cannot be introduced half way through a run."
            );
        }

        $_ENV['DB_DATABASE'] = $name;
        $_SERVER['DB_DATABASE'] = $name;

        // Send uploads somewhere disposable too. PortalUploadService writes into
        // <root>/storage/patient-uploads and copies accepted files into
        // <root>/public/uploads/patient_documents; without this they would land in
        // the deployment's own directories, and an accepted file is named
        // doc_from_portal_* whether a patient or a test produced it, so there
        // would be no safe way to clean up afterwards.
        $uploadRoot = self::uploadRoot();
        $_ENV['PORTAL_UPLOAD_ROOT'] = $uploadRoot;
        $_SERVER['PORTAL_UPLOAD_ROOT'] = $uploadRoot;

        Env::load();

        // Env::load() putenv()s the live name unconditionally. Env::get() reads
        // $_ENV first so the override already holds, but anything calling
        // getenv() directly would disagree. Make them agree.
        putenv("DB_DATABASE={$name}");
        putenv("PORTAL_UPLOAD_ROOT={$uploadRoot}");

        self::$name = $name;

        return $name;
    }

    /**
     * The disposable root for uploaded files. Kept beside the database's own name
     * so two differently-named test databases do not share a file store, and
     * named with a leading underscore so it sorts away from the real directories
     * next to it.
     */
    public static function uploadRoot(): string
    {
        return __DIR__ . '/../../backend/storage/_test_uploads';
    }

    /**
     * Delete the disposable upload root entirely.
     *
     * Safe in a way that deleting individual files is not: the directory holds
     * nothing but what a test run put there, so there is no pattern to match and
     * no chance of catching a real patient's document.
     */
    public static function clearUploadRoot(): int
    {
        $root = realpath(self::uploadRoot());

        if ($root === false || !is_dir($root)) {
            return 0;
        }

        // Refuse to recurse anywhere whose path does not end in the expected
        // directory name -- cheap insurance against a mistyped constant.
        if (!str_ends_with(str_replace('\\', '/', $root), '/_test_uploads')) {
            self::refuse("refusing to delete {$root}, which is not the test upload root.");
        }

        $removed = 0;

        $items = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );

        foreach ($items as $item) {
            if ($item->isDir()) {
                @rmdir($item->getPathname());
            } elseif (@unlink($item->getPathname())) {
                $removed++;
            }
        }

        return $removed;
    }

    public static function name(): string
    {
        if (self::$name === null) {
            self::refuse('use() has not been called, so there is no test database to talk to.');
        }

        return (string) self::$name;
    }

    /**
     * Create the database if it is absent, then bring schema and seeds up to date.
     *
     * $fresh drops it first. That is the honest default for a suite that asserts
     * on counts, but it costs a full rebuild, so it is opt-in: pass --fresh to
     * the build script, or let a run reuse the database and clean up after itself.
     *
     * @return array{database:string, created:bool, schema:array, seeds:array}
     */
    public static function build(bool $fresh = false): array
    {
        $name = self::name();

        if ($fresh) {
            self::drop();
        }

        $existed = self::exists($name);

        // CREATE DATABASE cannot be prepared and cannot take a placeholder, and
        // the name reaches here from a constant or the environment rather than
        // from a request -- but it is still interpolated SQL, so it is validated
        // to a conservative identifier shape first.
        if (!preg_match('/^[A-Za-z0-9_]+$/', $name)) {
            self::refuse("the database name ({$name}) is not a plain identifier.");
        }

        if (!$existed) {
            self::serverConnection()->exec(
                "CREATE DATABASE `{$name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            );
        }

        // AutoMigrator caches a per-database fingerprint in backend/storage. A
        // dropped-and-recreated database keeps the same name and the same schema
        // files, so the fingerprint still matches and the sync would be skipped
        // against an empty database. Remove the stamp and force the full scan.
        self::clearSchemaStamp($name);

        $pdo = Database::connection();

        $actual = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();

        if (strcasecmp($actual, $name) !== 0) {
            self::refuse(
                "connected to {$actual} but expected {$name}.\n" .
                "  Something loaded Env or Database before use() ran."
            );
        }

        $schema = AutoMigrator::ensureUpToDate($pdo, true);
        $seeds = self::applySeeds($pdo);

        return [
            'database' => $name,
            'created' => !$existed,
            'schema' => $schema,
            'seeds' => $seeds,
        ];
    }

    /**
     * Run every backend/database/seed/*.sql in filename order.
     *
     * The .php seeders in that directory are skipped: they are standalone
     * scripts that connect by themselves, and several generate sample clinical
     * activity rather than reference data. Nothing in the portal suites needs
     * them, and running them would make the fixtures depend on generated volume.
     *
     * Statement splitting and the benign-error list (duplicate key, table
     * exists, and so on -- exactly what re-running an idempotent seed produces)
     * are AutoMigrator's, reached by reflection rather than copied. A second
     * splitter in the project would be a second thing to keep correct, and this
     * one already handles quoting, comments and DELIMITER blocks.
     *
     * A seed may not contain a USE statement, and this checks twice rather than
     * trusting the files. 007_seed_admin.sql used to open with
     * "USE usintellix_hospital_management_system;", and because it sorts first,
     * every seed after it went to that hard-coded database -- so a run that
     * reported success against the test database had in fact re-seeded the live
     * one. Nothing in the output said so, because the connection really was
     * pointed at the test database when the run started.
     *
     * Hence: refuse any file that contains a USE statement at all, and re-read
     * SELECT DATABASE() after every file in case one arrives in a form the
     * pattern does not catch. A silent switch is the one failure here that
     * could do damage, so it is worth one query per file to make it loud.
     *
     * @return array{files:int, warnings:array<string, array<int, string>>}
     */
    public static function applySeeds(?PDO $pdo = null): array
    {
        $pdo = $pdo ?? Database::connection();

        $expected = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();

        if (strcasecmp($expected, self::name()) !== 0) {
            self::refuse("about to seed {$expected}, which is not the test database.");
        }

        $executor = new ReflectionMethod(AutoMigrator::class, 'executeSqlFileStatements');
        $executor->setAccessible(true);

        $files = glob(__DIR__ . '/../../backend/database/seed/*.sql') ?: [];
        natsort($files);

        $warnings = [];

        foreach ($files as $file) {
            $sql = (string) @file_get_contents($file);

            if (trim($sql) === '') {
                continue;
            }

            // Comment-aware enough for the job: strip line and block comments
            // before looking, so the explanatory comment in 007 (which says the
            // words "USE usintellix_...") does not trip this.
            $bare = preg_replace('#/\*.*?\*/#s', '', $sql) ?? $sql;
            $bare = preg_replace('/^\s*--.*$/m', '', $bare) ?? $bare;

            if (preg_match('/^\s*USE\s+[`\w]+/mi', $bare, $m)) {
                self::refuse(
                    basename($file) . " contains a USE statement (" . trim($m[0]) . ").\n"
                    . "  A seed must inherit the database it is run against. Left in place it\n"
                    . "  would redirect this run, and every seed after it, to that database."
                );
            }

            $fileWarnings = $executor->invoke(null, $pdo, $sql);

            if (!empty($fileWarnings)) {
                $warnings[basename($file)] = $fileWarnings;
            }

            $actual = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();

            if (strcasecmp($actual, $expected) !== 0) {
                self::refuse(
                    basename($file) . " changed the connection's database to {$actual}.\n"
                    . "  Everything seeded after it would have gone there. Stopping."
                );
            }
        }

        return ['files' => count($files), 'warnings' => $warnings];
    }

    /**
     * Delete the disposable database outright. Guarded the same way use() is:
     * the name must differ from the live one and must contain "test".
     */
    public static function drop(): void
    {
        $name = self::name();
        $live = self::liveDatabaseName();

        if (strcasecmp($name, $live) === 0 || stripos($name, 'test') === false) {
            self::refuse("refusing to drop {$name}.");
        }

        if (!preg_match('/^[A-Za-z0-9_]+$/', $name)) {
            self::refuse("the database name ({$name}) is not a plain identifier.");
        }

        self::serverConnection()->exec("DROP DATABASE IF EXISTS `{$name}`");
        self::clearSchemaStamp($name);
    }

    public static function exists(?string $name = null): bool
    {
        $name = $name ?? self::name();

        $stmt = self::serverConnection()->prepare(
            'SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = ?'
        );
        $stmt->execute([$name]);

        return ((int) $stmt->fetchColumn()) > 0;
    }

    /**
     * A connection with no database selected, for CREATE and DROP.
     *
     * Deliberately not Database::connection(): that is a singleton bound to one
     * database for the life of the process, and asking it to create the database
     * it is already connected to is a chicken-and-egg problem. The credentials
     * come from the same config file, so there is still one source for those.
     */
    private static function serverConnection(): PDO
    {
        static $pdo = null;

        if ($pdo instanceof PDO) {
            return $pdo;
        }

        $config = require __DIR__ . '/../../backend/config/database.php';

        $pdo = new PDO(
            "mysql:host={$config['host']};port={$config['port']};charset={$config['charset']}",
            $config['username'],
            $config['password'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );

        return $pdo;
    }

    private static function clearSchemaStamp(string $database): void
    {
        $stamp = __DIR__ . '/../../backend/storage/.schema_sync_'
            . preg_replace('/[^a-zA-Z0-9_-]/', '_', $database) . '.hash';

        if (is_file($stamp)) {
            @unlink($stamp);
        }
    }

    /**
     * Stop the run. Thrown rather than exited so a caller that knows better can
     * catch it, but the message is written for a human reading test output.
     */
    private static function refuse(string $why): void
    {
        throw new RuntimeException("TestDatabase: {$why}");
    }
}
