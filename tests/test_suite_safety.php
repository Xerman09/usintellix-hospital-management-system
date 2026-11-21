<?php

declare(strict_types=1);

/**
 * Automated Verification: the test suites themselves (docs/TODO.md 3.4)
 *
 *   php tests/test_suite_safety.php
 *
 * This suite tests the suites. It exists because of three mistakes that were
 * all invisible until somebody went looking, and all of which a one-line check
 * would have caught the day they were made.
 *
 * ONE: A SUITE THAT CONNECTS TO THE LIVE DATABASE. Of 34 suites, 20 ran against
 * whatever backend/.env names -- the production database -- creating users,
 * employees and patients there on every run from September until they were
 * cleared out on 18 November. The harness to avoid that has existed since M9.5;
 * nothing required its use. Writing a new suite is exactly the moment somebody
 * forgets, so the requirement is checked here rather than remembered.
 *
 * TWO: A CHILD PROCESS THAT CONNECTS TO THE LIVE DATABASE. The override lives
 * in $_ENV and is not inherited, so a child that calls Env::load() reaches
 * production even when its parent does not. test_hipaa_retention_and_export
 * exported the live audit log and wrote its own rows into it for months, and
 * the suite passed throughout because the parent read the same live table.
 *
 * THREE: A SKIPPED TEST THAT REPORTS A PASS. Five assertions in
 * test_hipaa_officer_designation were `report(true, "... skipped ...")` when the
 * row they needed was missing. On the live database those rows happened to
 * exist; on a fresh test database the suite printed five green lines for
 * assertions that never ran. A fabricated pass is worse than a failure, because
 * a failure gets investigated.
 *
 * WHAT THIS DOES NOT DO. It reads the files; it does not run them. A suite can
 * still be wrong in every way that matters. These three it cannot be.
 */

require_once __DIR__ . '/lib/test_database.php';

try {
    TestDatabase::use();
} catch (Throwable $e) {
    echo 'REFUSED: ' . $e->getMessage() . "\n";
    exit(1);
}

echo "==================================================\n";
echo "   Automated Verification: the test suites themselves\n";
echo "==================================================\n";
echo "  live database (never connected to here): " . TestDatabase::liveDatabaseName() . "\n";

$pass = 0;
$fail = 0;

function check(string $what, bool $ok, string $detail = ''): void
{
    global $pass, $fail;

    if ($ok) {
        $pass++;
        echo "  [PASS] {$what}\n";
    } else {
        $fail++;
        echo "  [FAIL] {$what}" . ($detail !== '' ? " -- {$detail}" : '') . "\n";
    }
}

/**
 * A suite's source with its comments removed.
 *
 * This matters more than it sounds. The first version of this file scanned raw
 * text and reported three failures, all of them its own prose and the comments
 * that explain the fixes -- a comment saying `report(true, "... skipped ...")`
 * read exactly like the thing it was warning about. A scanner that cannot tell
 * code from a sentence about code will be switched off, so the comments go
 * first and every check below looks only at what executes.
 *
 * token_get_all() rather than a regular expression, because the strings in
 * these files contain both // and /* and a regex gets that wrong in whichever
 * direction you tune it.
 */
function codeOnly(string $source): string
{
    $out = '';

    foreach (token_get_all($source) as $token) {
        if (is_array($token)) {
            if (in_array($token[0], [T_COMMENT, T_DOC_COMMENT], true)) {
                // Keep the newlines so reported line numbers stay true.
                $out .= str_repeat("\n", substr_count($token[1], "\n"));
                continue;
            }

            $out .= $token[1];
            continue;
        }

        $out .= $token;
    }

    return $out;
}

/** @var array<string, string> basename => source, comments removed */
$suites = [];

/** @var array<string, string> basename => raw source, for checks that want it */
$rawSuites = [];

foreach (glob(__DIR__ . '/test_*.php') ?: [] as $path) {
    // This file is the scanner, not a suite under test, and section 5 below
    // necessarily contains samples of every pattern it hunts for -- held in
    // string literals, which codeOnly() rightly does not strip. Scanning
    // itself, it finds its own examples and reports them as violations.
    //
    // It still points at the disposable database: the TestDatabase::use() at
    // the top of this file runs before anything else, and the process exits
    // with REFUSED if that call is ever unsafe. That is a stronger guarantee
    // than the text search it is being excluded from.
    if (basename($path) === basename(__FILE__)) {
        continue;
    }

    $source = (string) file_get_contents($path);
    $rawSuites[basename($path)] = $source;
    $suites[basename($path)] = codeOnly($source);
}

check('the suites were readable', $suites !== [], (string) count($suites));
check('there are at least thirty of them, so this is scanning the real set',
    count($suites) >= 30, (string) count($suites));

// ==========================================================================
// 1. EVERY SUITE POINTS AT THE DISPOSABLE DATABASE.
// ==========================================================================
echo "\n-- 1. No suite may connect to the live database --\n";

$offenders = [];

foreach ($suites as $name => $src) {
    if (!str_contains($src, 'TestDatabase::use')) {
        $offenders[] = $name;
    }
}

check('EVERY suite calls TestDatabase::use()', $offenders === [],
    count($offenders) . ' do not: ' . implode(', ', $offenders));

// Calling it is not enough: it has to happen before anything connects. The
// harness itself refuses a second database once Database has been built
// ("this process is already connected to ..."), so the ordering that matters is
// that the call comes before the suite's own Env::load().
$outOfOrder = [];

foreach ($suites as $name => $src) {
    $use = strpos($src, 'TestDatabase::use');
    $load = strpos($src, 'Env::load()');

    if ($use !== false && $load !== false && $load < $use) {
        $outOfOrder[] = $name;
    }
}

check('and calls it BEFORE its own Env::load()', $outOfOrder === [],
    implode(', ', $outOfOrder));

// ==========================================================================
// 2. A CHILD PROCESS IS NOT A LOOPHOLE.
//
// $_ENV is not inherited, so a child that bootstraps with Env::load() alone
// connects to production however carefully its parent was pointed elsewhere.
// ==========================================================================
echo "\n-- 2. Nor may a child process --\n";

$spawners = [];

foreach ($suites as $name => $src) {
    if (preg_match('/\b(shell_exec|proc_open|popen|passthru)\s*\(/', $src)) {
        $spawners[] = $name;
    }
}

check('the suites that spawn children were found', $spawners !== [],
    implode(', ', $spawners));

foreach ($spawners as $name) {
    $src = $suites[$name];

    // The child's bootstrap is assembled as a string. Either it requires the
    // harness, or it names a child script that does.
    $bootstrapsHarness = str_contains($src, 'test_database.php')
        || str_contains($src, 'test_fixtures.php');

    check("{$name}: its child bootstraps through the harness", $bootstrapsHarness);

    // The specific shape that was wrong for months: a child whose entire
    // database setup is Env::load().
    $naiveChild = (bool) preg_match('/require_once\s+.{0,80}Autoload\.php.{0,10};\s*.{0,40}Env::load\(\)/s', $src);

    check("{$name}: no child bootstraps with Autoload + Env::load() alone", !$naiveChild);
}

// ==========================================================================
// 3. NO SUITE MAY REPORT A PASS FOR A TEST IT DID NOT RUN.
//
// The generalisable lesson. A missing fixture is a reason to create one or to
// fail; it is never a reason to print a green line. Warning and skipping
// loudly is acceptable -- that is visible. Asserting true is not.
// ==========================================================================
echo "\n-- 3. No fabricated passes --\n";

$fabricated = [];

foreach ($suites as $name => $src) {
    foreach (explode("\n", $src) as $number => $line) {
        // A literal-true assertion whose own message admits it skipped.
        if (preg_match('/\b(report|check)\s*\(\s*true\s*,/', $line)
            && preg_match('/\bskip(ped)?\b/i', $line)) {
            $fabricated[] = $name . ':' . ($number + 1);
        }
    }
}

check('NO SUITE ASSERTS true FOR A SKIPPED TEST', $fabricated === [],
    implode(', ', $fabricated));

// The five that prompted this, named so the reason survives.
// Against the stripped source, because the comment that explains the fix
// legitimately quotes the old message.
check('test_hipaa_officer_designation no longer has any of its five',
    !str_contains($suites['test_hipaa_officer_designation.php'] ?? '', 'skipped specific row'));

check('and the raw file still explains why, for whoever reads it next',
    str_contains($rawSuites['test_hipaa_officer_designation.php'] ?? '', 'CREATED RATHER THAN HOPED FOR'));

// ==========================================================================
// 4. The harness still refuses what it is for.
//
// Cheap, and it is the single assumption every other suite rests on.
// ==========================================================================
echo "\n-- 4. The harness still refuses a live target --\n";

$refusedLive = false;

try {
    TestDatabase::use(TestDatabase::liveDatabaseName());
} catch (Throwable $e) {
    $refusedLive = str_contains($e->getMessage(), 'live one')
        || str_contains($e->getMessage(), 'already connected');
}

check('it refuses the live database by name', $refusedLive);

$refusedUntestlike = false;

try {
    TestDatabase::use('production_copy');
} catch (Throwable $e) {
    $refusedUntestlike = str_contains($e->getMessage(), '"test"')
        || str_contains($e->getMessage(), 'already connected');
}

check('and refuses any name without "test" in it', $refusedUntestlike);

// ==========================================================================
// 5. THE DETECTORS, EXERCISED.
//
// Every check above passes, which is the problem: a scanner that finds nothing
// is indistinguishable from a scanner that cannot find anything. All four were
// written against real violations that have now been fixed, so from here on
// they are only as good as their ability to still fire.
//
// So each one is run against a synthetic source that violates it, and against
// one that does not. If somebody later loosens a pattern, these fail rather
// than the whole file quietly going green for ever.
// ==========================================================================
echo "\n-- 5. The detectors can still detect --\n";

$noHarness = '<?php require_once "x/Autoload.php"; App\\Core\\Env::load(); $db = connect();';
$withHarness = '<?php require_once "lib/test_database.php"; TestDatabase::use(); App\\Core\\Env::load();';

check('check 1 fires on a suite with no TestDatabase::use()',
    !str_contains(codeOnly($noHarness), 'TestDatabase::use'));

check('and does not fire on one that has it',
    str_contains(codeOnly($withHarness), 'TestDatabase::use'));

$wrongOrder = '<?php App\\Core\\Env::load(); require_once "lib/test_database.php"; TestDatabase::use();';
$code = codeOnly($wrongOrder);

check('check 1 fires when Env::load() comes first',
    strpos($code, 'Env::load()') < strpos($code, 'TestDatabase::use'));

$naive = '<?php $script = "chdir(1); require_once \'/a/Autoload.php\'; App\\Core\\Env::load(); " . $c;';

check('check 2 fires on a child bootstrapped with Autoload + Env::load() alone',
    (bool) preg_match('/require_once\s+.{0,80}Autoload\.php.{0,10};\s*.{0,40}Env::load\(\)/s', codeOnly($naive)));

$fine = '<?php $script = "chdir(1); require_once \'/a/test_database.php\'; TestDatabase::use(); " . $c;';

check('and does not fire on one that uses the harness',
    !preg_match('/require_once\s+.{0,80}Autoload\.php.{0,10};\s*.{0,40}Env::load\(\)/s', codeOnly($fine)));

$fake = '<?php report(true, "thing tested (skipped due to empty table)");';

check('check 3 fires on report(true) for a skipped test',
    (bool) preg_match('/\b(report|check)\s*\(\s*true\s*,/', codeOnly($fake))
    && (bool) preg_match('/\bskip(ped)?\b/i', codeOnly($fake)));

$commentOnly = '<?php // report(true, "... skipped ...") was the old shape' . "\n" . '$x = 1;';

check('and NOT on a comment that merely describes the shape -- the false '
    . 'positive that made codeOnly() necessary',
    !preg_match('/\b(report|check)\s*\(\s*true\s*,/', codeOnly($commentOnly)));

$honestSkip = '<?php echo "  [WARN] no row; section not exercised\\n";';

check('an honest WARN is left alone -- skipping loudly is allowed, lying is not',
    !preg_match('/\b(report|check)\s*\(\s*true\s*,/', codeOnly($honestSkip)));

echo "\n==================================================\n";
echo "  {$pass} passed, {$fail} failed\n";
echo "==================================================\n";

exit($fail === 0 ? 0 : 1);
