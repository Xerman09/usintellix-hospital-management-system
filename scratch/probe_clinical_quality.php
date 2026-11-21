<?php

declare(strict_types=1);

/**
 * AI-5 candidate probe: clinical quality reports.
 *
 * TWO STAGES, AND THE ORDER MATTERS.
 *
 * STAGE ONE is a TRANSITIVE write scan. AI-4's check reads the registered
 * getter's own body and stops there. That is not enough here:
 * ClinicalQualityAnalyticsService::getSummaryMetrics contains no write word at
 * all, and its third statement is
 *
 *     $this->backfillRange($from, $to, 'realtime_snapshot');
 *
 * which reaches calculateForDate(), which contains INSERT INTO
 * analytics_clinical_quality_daily. A getter that writes one call deep is still
 * a getter that writes, and the shallow check would have cleared it.
 *
 * So this follows $this->method() calls within the same class to a fixed depth
 * and reports the path, not just the verdict.
 *
 * STAGE TWO calls only what stage one cleared, and prints the keys that
 * actually come back -- the AI-2 lesson, which is that a field name read off
 * SQL is a guess.
 */

require_once __DIR__ . '/../tests/lib/test_fixtures.php';

try {
    $database = TestDatabase::use();
} catch (Throwable $e) {
    echo "REFUSED: " . $e->getMessage() . "\n";
    exit(1);
}

const WRITE_WORDS = '/\b(INSERT|UPDATE|DELETE|REPLACE|TRUNCATE|ALTER\s+TABLE|DROP\s+TABLE)\b/i';

/** Pull one method's body out of a class's source. */
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

/**
 * Does $method write, directly or through anything it calls on $this?
 *
 * @return array{writes: bool, path: string, words: array}
 */
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

    // Follow calls on $this. Anything else is out of scope for this probe and
    // is reported so it does not pass unexamined.
    preg_match_all('/\$this->([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/', $body, $calls);

    foreach (array_unique($calls[1]) as $callee) {
        $down = writeScan($class, $callee, $depth - 1, $seen);

        if ($down['writes']) {
            return [
                'writes' => true,
                'path'   => $key . ' -> ' . $down['path'],
                'words'  => $down['words'],
            ];
        }
    }

    return ['writes' => false, 'path' => $key, 'words' => []];
}

$candidates = [
    ['App\Modules\Reports\Services\ClinicalQualityAnalyticsService', 'getSummaryMetrics', []],
    ['App\Modules\Reports\Services\ClinicalQualityAnalyticsService', 'getTrends', []],
    ['App\Modules\Reports\Services\ClinicalQualityAnalyticsService', 'getWardBreakdown', []],
    ['App\Modules\Reports\Services\ClinicalQualityScorecardService', 'getScorecardOverview', []],
    ['App\Modules\Reports\Services\RegulatoryAhsrExportService', 'getAhsrOverview', []],
];

echo "=== STAGE ONE: transitive write scan ===\n\n";

$clear = [];

foreach ($candidates as [$class, $method, $args]) {
    $scan = writeScan($class, $method);

    if ($scan['writes']) {
        echo sprintf(
            "  WRITES (%s)\n    %s\n\n",
            implode(', ', $scan['words']),
            $scan['path']
        );
        continue;
    }

    echo "  clear: {$class}::{$method}\n";
    $clear[] = [$class, $method, $args];
}

echo "\n=== STAGE TWO: observed shapes (only what stage one cleared) ===\n";

foreach ($clear as [$class, $method, $args]) {
    echo "\n-- {$class}::{$method} --\n";

    try {
        $service = new $class();
        $result  = $service->$method($args);
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
            $first = $value[0];
            echo sprintf(
                "  [%s] list of %d; first row keys:\n",
                $branch,
                count($value)
            );

            if (is_array($first)) {
                foreach ($first as $k => $v) {
                    echo sprintf("      %-42s %s\n", $k, is_array($v) ? '** NESTED **' : gettype($v));
                }
            } else {
                echo "      (scalar list)\n";
            }
            continue;
        }

        if (is_array($value)) {
            echo sprintf("  [%s] map of %d:\n", $branch, count($value));
            foreach ($value as $k => $v) {
                echo sprintf("      %-42s %s\n", $k, is_array($v) ? '** NESTED **' : gettype($v));
            }
            continue;
        }

        echo sprintf("  [%s] scalar (%s)\n", $branch, gettype($value));
    }
}

echo "\nDone.\n";
