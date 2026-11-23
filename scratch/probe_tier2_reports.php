<?php

declare(strict_types=1);

/**
 * AI-6 candidate probe: the Tier 2 reports, the ones one column away.
 *
 * Eight reports whose only identifier is a single patient_name or employee
 * name column, carried for display (docs/ai-analysis-build-list.md, Tier 2).
 * Dropping that column from what is SENT makes each of them Tier 1.
 *
 * Same two stages as scratch/probe_clinical_quality.php, and the same reasons:
 *
 * STAGE ONE is a TRANSITIVE write scan, because AI-5 found two already-shipped
 * reports whose write was one call below the registered getter -- getAgingMatrix
 * re-ages every account, getInventoryStats quarantines expired blood. A check
 * that stops at the first method body clears both.
 *
 * STAGE TWO calls only what stage one cleared and prints the keys that come
 * back. A field name read off SQL is a guess (AI-2).
 *
 * STAGE THREE is new here, and is the point of this phase: for every row that
 * comes back, report which keys LOOK like a person. The allowlist is written
 * from that list, with those keys left out -- deliberately, and visibly,
 * rather than by a column quietly not appearing in a projection.
 */

require_once __DIR__ . '/../tests/lib/test_fixtures.php';

try {
    $database = TestDatabase::use();
} catch (Throwable $e) {
    echo "REFUSED: " . $e->getMessage() . "\n";
    exit(1);
}

const WRITE_WORDS = '/\b(INSERT|UPDATE|DELETE|REPLACE|TRUNCATE|ALTER\s+TABLE|DROP\s+TABLE)\b/i';

// Keys that name or could identify a person. Matched case-insensitively as
// substrings, so `patient_name`, `recorded_by_first_name` and `employee_no`
// are all caught. Over-inclusive on purpose: a false positive here costs a
// field that could have been sent, and a false negative sends a name.
const PERSON_WORDS = [
    'name', 'patient', 'employee', 'staff', 'doctor', 'provider', 'surgeon',
    'nurse', 'user', 'mrn', 'chart_no', 'contact', 'phone', 'email', 'address',
    'birth', 'dob', 'age', 'sex', 'gender', 'created_by', 'updated_by',
    'recorded_by', 'approved_by', 'counted_by', 'performed_by',
];

function bodyOf(string $src, string $method): ?string
{
    if (!preg_match('/function ' . preg_quote($method, '/') . '\s*\(/', $src, $m, PREG_OFFSET_CAPTURE)) {
        return null;
    }

    $rest = substr($src, $m[0][1]);
    $next = preg_match('/\n    (?:public|private|protected|static)[ a-z]*function /', $rest, $nm, PREG_OFFSET_CAPTURE)
        ? $nm[0][1]
        : strlen($rest);

    return substr($rest, 0, $next);
}

/** @return array{writes: bool, path: string, words: array} */
function writeScan(string $class, string $method, int $depth = 4, array $seen = []): array
{
    $key = $class . '::' . $method;

    if ($depth <= 0 || isset($seen[$key])) {
        return ['writes' => false, 'path' => '', 'words' => []];
    }

    $seen[$key] = true;

    $file = (new ReflectionClass($class))->getFileName();
    $src  = $file !== false ? (string) file_get_contents($file) : '';
    $body = $src === '' ? null : bodyOf($src, $method);

    if ($body === null) {
        return ['writes' => false, 'path' => $key . ' (UNREADABLE)', 'words' => []];
    }

    preg_match_all(WRITE_WORDS, $body, $direct);

    if ($direct[0] !== []) {
        return [
            'writes' => true,
            'path'   => $key,
            'words'  => array_unique(array_map('strtoupper', $direct[0])),
        ];
    }

    preg_match_all('/\$this->([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/', $body, $calls);

    foreach (array_unique($calls[1]) as $callee) {
        $down = writeScan($class, $callee, $depth - 1, $seen);

        if ($down['writes']) {
            return ['writes' => true, 'path' => $key . ' -> ' . $down['path'], 'words' => $down['words']];
        }
    }

    return ['writes' => false, 'path' => $key, 'words' => []];
}

function looksLikeAPerson(string $key): bool
{
    $lower = strtolower($key);

    foreach (PERSON_WORDS as $word) {
        if (str_contains($lower, $word)) {
            return true;
        }
    }

    return false;
}

$RS = 'App\Modules\Reports\Services\ReportService';
$SL = 'App\Modules\StockLevels\Services\StockLevelService';

// A wide window, so a report with rows somewhere has them here.
$window = ['date_from' => '2020-01-01', 'date_to' => date('Y-m-d'),
           'from' => '2020-01-01', 'to' => date('Y-m-d')];

$candidates = [
    [$RS, 'getIncidentLogReport', $window],
    [$RS, 'getCriticalTATReport', $window],
    [$RS, 'getHAIReport', $window],
    [$RS, 'getReadmissionMortalityReport', $window],
    [$RS, 'getSurgicalSafetyReport', $window],
    [$RS, 'getInventoryActivityReport', $window],
    [$RS, 'getInventoryTransactionsReport', $window],
    [$SL, 'lowStock', []],
];

echo "=== STAGE ONE: transitive write scan ===\n\n";

$clear = [];

foreach ($candidates as [$class, $method, $args]) {
    $scan = writeScan($class, $method);

    if ($scan['writes']) {
        echo sprintf("  WRITES (%s)\n    %s\n\n", implode(', ', $scan['words']), $scan['path']);
        continue;
    }

    echo "  clear: " . substr($class, strrpos($class, '\\') + 1) . "::{$method}\n";
    $clear[] = [$class, $method, $args];
}

echo "\n=== STAGE TWO/THREE: shapes, and what names a person ===\n";

foreach ($clear as [$class, $method, $args]) {
    echo "\n-- {$method} --\n";

    try {
        $result = (new $class())->$method($args);
    } catch (Throwable $e) {
        echo "  THREW: " . get_class($e) . ': ' . $e->getMessage() . "\n";
        continue;
    }

    if (!is_array($result)) {
        echo "  returned " . gettype($result) . "\n";
        continue;
    }

    foreach ($result as $branch => $value) {
        if (is_array($value) && $value !== [] && array_is_list($value)) {
            echo sprintf("  [%s] list of %d\n", $branch, count($value));

            if (is_array($value[0])) {
                foreach ($value[0] as $k => $v) {
                    echo sprintf(
                        "      %-40s %-10s %s\n",
                        $k,
                        is_array($v) ? 'NESTED' : gettype($v),
                        looksLikeAPerson((string) $k) ? '<-- PERSON' : ''
                    );
                }
            } else {
                echo "      (scalar list)\n";
            }
            continue;
        }

        if (is_array($value) && $value === []) {
            echo sprintf("  [%s] EMPTY list or map -- nothing to observe\n", $branch);
            continue;
        }

        if (is_array($value)) {
            echo sprintf("  [%s] map of %d\n", $branch, count($value));
            foreach ($value as $k => $v) {
                echo sprintf(
                    "      %-40s %-10s %s\n",
                    $k,
                    is_array($v) ? 'NESTED' : gettype($v),
                    looksLikeAPerson((string) $k) ? '<-- PERSON' : ''
                );
            }
            continue;
        }

        echo sprintf("  [%s] scalar (%s)\n", $branch, gettype($value));
    }
}

echo "\nDone.\n";
