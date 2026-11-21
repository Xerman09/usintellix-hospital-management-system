<?php

declare(strict_types=1);

/**
 * AI-2: what does a SELECT * in a report method actually return?
 *
 *     php scratch/scan_select_star.php
 *
 * scan_report_identifiers.php reads column names out of the SQL. That misses
 * everything hidden behind a wildcard, and it missed one that mattered:
 * getClaimDenialParetoAnalytics() looked clean and its fifth section runs
 * `SELECT d.* FROM billing_claim_denials`, a table carrying patient_id,
 * encounter_id and service_date.
 *
 * THIS DOES NOT EXECUTE ANYTHING. The obvious way to learn what a method
 * returns is to call it and look at the keys. Forty-three of these methods
 * include saveCounts(), approve(), send(), receive(), cancel(), deleteImage()
 * and releaseQuarantine() -- calling them to find out what they select would
 * write to the database, dispatch stock and delete an image. So the wildcard is
 * resolved statically instead: find the table it belongs to, and ask
 * information_schema what columns that table has.
 *
 * READ-ONLY against the live database: SHOW COLUMNS and nothing else.
 */

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;

$roots = __DIR__ . '/../backend/app/Modules';

/** Columns that name or point at a person. Same list the sibling scanner uses. */
const IDENTIFIERS = [
    'patient_id', 'patient_no', 'patient_name', 'first_name', 'middle_name', 'last_name',
    'birthdate', 'date_of_birth', 'dob', 'mrn', 'email', 'mobile_phone', 'home_phone',
    'work_phone', 'phone', 'address_line', 'city', 'province', 'zip_code',
    'employee_id', 'employee_no', 'user_id', 'full_name', 'created_by', 'updated_by',
    'assigned_to', 'assigned_to_name', 'encounter_id', 'guardian_name', 'contact_person',
];

$db = Database::connection();

echo "AI-2: resolving SELECT * in report methods\n";
echo "==========================================\n";
echo 'database: ' . $db->query('SELECT DATABASE()')->fetchColumn() . "  (read-only)\n\n";

// Cache of table => columns, so a table used by six methods is asked for once.
$columnsOf = static function (string $table) use ($db): ?array {
    static $cache = [];

    if (array_key_exists($table, $cache)) {
        return $cache[$table];
    }

    try {
        $cols = $db->query('SHOW COLUMNS FROM `' . str_replace('`', '', $table) . '`')
            ->fetchAll(PDO::FETCH_COLUMN);
        $cache[$table] = $cols ?: null;
    } catch (Throwable $e) {
        $cache[$table] = null;
    }

    return $cache[$table];
};

$files = [];
$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($roots));

foreach ($it as $f) {
    if ($f->isFile() && str_ends_with($f->getFilename(), 'Service.php')
        && preg_match('/(Report|Analytics|Census|ArAging|Dashboard|Commission|Payroll|Pharmacy|Procurement|Financial|Quality|Safety|Surveillance|Inventory|Stock)/i', $f->getPathname())) {
        $files[] = $f->getPathname();
    }
}

sort($files);

$methodsScanned = 0;
$methodsExposing = 0;
$unresolved = [];
$findings = [];

foreach ($files as $path) {
    $src = file_get_contents($path);

    if (!preg_match_all('/public function (\w+)\s*\(/', $src, $m, PREG_OFFSET_CAPTURE)) {
        continue;
    }

    for ($i = 0; $i < count($m[1]); $i++) {
        $name = $m[1][$i][0];
        $start = $m[0][$i][1];
        $end = ($i + 1 < count($m[0])) ? $m[0][$i + 1][1] : strlen($src);
        $body = substr($src, $start, $end - $start);

        // `SELECT x.*` or `SELECT *`, then the FROM that follows it.
        if (!preg_match_all('/SELECT\s+(?:(\w+)\.)?\*(.*?)(?:;|"|\')/is', $body, $selects, PREG_SET_ORDER)) {
            continue;
        }

        $methodsScanned++;
        $exposed = [];
        $tablesSeen = [];

        foreach ($selects as $select) {
            $alias = $select[1] ?? '';
            $after = $select[2] ?? '';

            // The FROM in the same statement. Looks for an alias match first so
            // `SELECT d.* FROM x JOIN billing_claim_denials d` resolves to the
            // right table rather than the first one named.
            $table = null;

            if ($alias !== '' && preg_match('/\b(?:FROM|JOIN)\s+`?(\w+)`?\s+(?:AS\s+)?' . preg_quote($alias, '/') . '\b/i', $body, $aliased)) {
                $table = $aliased[1];
            } elseif (preg_match('/\bFROM\s+`?(\w+)`?/i', $after, $plain)) {
                $table = $plain[1];
            }

            if ($table === null) {
                $unresolved[] = basename($path) . '::' . $name;
                continue;
            }

            $tablesSeen[$table] = true;
            $cols = $columnsOf($table);

            if ($cols === null) {
                $unresolved[] = basename($path) . '::' . $name . ' (no such table: ' . $table . ')';
                continue;
            }

            foreach ($cols as $col) {
                if (in_array(strtolower($col), IDENTIFIERS, true)) {
                    $exposed[$table . '.' . $col] = true;
                }
            }
        }

        if ($exposed !== []) {
            $methodsExposing++;
            $findings[] = [
                'where' => basename($path) . '::' . $name,
                'tables' => array_keys($tablesSeen),
                'exposed' => array_keys($exposed),
            ];
        }
    }
}

usort($findings, static fn(array $a, array $b): int => count($b['exposed']) <=> count($a['exposed']));

foreach ($findings as $finding) {
    printf("%s\n", $finding['where']);
    printf("    tables:  %s\n", implode(', ', $finding['tables']));
    printf("    EXPOSES: %s\n\n", implode(', ', $finding['exposed']));
}

printf("--------------------------------------------------------\n");
printf("%d methods use a wildcard select.\n", $methodsScanned);
printf("%d of them would return at least one identifier column.\n", $methodsExposing);

if ($unresolved !== []) {
    printf("\n%d wildcard(s) could not be resolved to a table and need reading by hand:\n", count($unresolved));

    foreach (array_unique($unresolved) as $u) {
        printf("    %s\n", $u);
    }
}

printf("\nA wildcard that exposes nothing here is still not an allowlist. It means the\n");
printf("columns are safe TODAY; a column added to that table tomorrow arrives in the\n");
printf("payload without anybody deciding to send it. That is what AiPayload is for.\n");
