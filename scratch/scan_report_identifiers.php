<?php
/**
 * First-pass classification of report methods: does the SQL in this method
 * touch anything that identifies a person?
 *
 * Mechanical and deliberately over-inclusive -- a flag means "look at this",
 * not "this is personal data". A clean result means no identifier term appears
 * anywhere in the method, which is the stronger of the two signals.
 */
declare(strict_types=1);

$roots = $argv[1] ?? 'backend/app/Modules';

$identifiers = '/\b(patient_id|patient_no|first_name|last_name|middle_name|birthdate|date_of_birth|dob|address_line|mobile_phone|home_phone|email|mrn|employee_id|employee_no|user_id|full_name|patient_name)\b|FROM\s+patients|JOIN\s+patients|FROM\s+employees|JOIN\s+employees/i';

$files = [];
$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($roots));

foreach ($it as $f) {
    if (!$f->isFile() || !str_ends_with($f->getFilename(), 'Service.php')) {
        continue;
    }
    if (preg_match('/(Report|Analytics|Census|ArAging|Dashboard|Commission|Payroll|Pharmacy|Procurement|Financial|Quality|Safety|Surveillance|Inventory|Stock)/i', $f->getPathname())) {
        $files[] = $f->getPathname();
    }
}

sort($files);

$cleanCount = 0;
$namedCount = 0;

foreach ($files as $path) {
    $src = file_get_contents($path);

    if (!preg_match_all('/public function (\w+)\s*\(/', $src, $m, PREG_OFFSET_CAPTURE)) {
        continue;
    }

    $rows = [];

    for ($i = 0; $i < count($m[1]); $i++) {
        $name = $m[1][$i][0];
        $start = $m[0][$i][1];
        $end = ($i + 1 < count($m[0])) ? $m[0][$i + 1][1] : strlen($src);
        $body = substr($src, $start, $end - $start);

        if (!preg_match('/\b(SELECT|query\(|prepare\()/i', $body)) {
            continue;
        }

        preg_match_all($identifiers, $body, $hits);
        $found = array_values(array_unique(array_map('strtolower', $hits[0])));
        $rows[] = [$name, $found];
    }

    if (!$rows) {
        continue;
    }

    $short = strtr($path, [DIRECTORY_SEPARATOR => '/']);
    $short = str_replace(strtr($roots, [DIRECTORY_SEPARATOR => '/']) . '/', '', $short);

    echo "\n" . $short . "\n";

    foreach ($rows as [$name, $found]) {
        if ($found) {
            $namedCount++;
        } else {
            $cleanCount++;
        }

        printf(
            "   %-9s %-44s %s\n",
            $found ? '[NAMES]' : '[clean]',
            $name,
            $found ? implode(', ', array_slice($found, 0, 5)) : ''
        );
    }
}

printf("\n\n%d methods with no identifier term, %d that touch one.\n", $cleanCount, $namedCount);
