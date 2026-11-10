<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Env;
use App\Modules\MyChart\Services\PortalDiagnosisGuideService;

Env::load();

echo "==================================================\n";
echo "   Automated Verification: Diagnosis Guides\n";
echo "==================================================\n";

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

/** The guide title matched for one diagnosis row, or null. */
function titleFor(array $row): ?string
{
    $out = PortalDiagnosisGuideService::forDiagnoses([$row]);

    return $out ? (reset($out)['title'] ?? null) : null;
}

// --------------------------------------------------------------------------
// 1. The matcher, against the shapes a diagnosis actually arrives in. The
//    expectations below are the contract, not a wish list: exact code wins,
//    then keyword, then the three-character category.
// --------------------------------------------------------------------------
echo "\n-- Matching (seeded guides) --\n";

$cases = [
    // encounter_diagnoses: coded, description present
    [['code' => 'I10', 'text' => 'Essential (primary) hypertension'], 'High blood pressure'],
    [['code' => 'E11.9', 'text' => 'Type 2 diabetes mellitus without complications'], 'Type 2 diabetes'],
    [['code' => 'E11.1', 'text' => ''], 'Diabetes with ketoacidosis'],
    [['code' => 'J45.909', 'text' => 'Unspecified asthma, uncomplicated'], 'Asthma'],
    [['code' => 'N10', 'text' => 'Acute pyelonephritis'], 'Kidney infection (pyelonephritis)'],

    // inpatient_discharge_summaries: code written into the text, house style
    [['code' => '', 'text' => 'K80.00 Acute Cholecystitis with Cholelithiasis (Post-Op Day 2)'], 'Gallstones'],
    [['code' => '', 'text' => 'A15.0 Tuberculosis of lung, confirmed by sputum microscopy'], 'Pulmonary tuberculosis'],
    [['code' => '', 'text' => 'J18.9 Community-Acquired Pneumonia with Acute COPD Exacerbation'], 'Pneumonia'],

    // free text, no code anywhere
    [['code' => '', 'text' => 'Severe Sepsis secondary to Pyelonephritis'], 'Kidney infection (pyelonephritis)'],
    [['code' => '', 'text' => 'Resolved Acute Bronchitis, Secondary Mild Dehydration'], 'Acute bronchitis'],
    [['code' => '', 'text' => 'Dengue fever with warning signs'], 'Dengue'],
    [['code' => '', 'text' => 'dog bite, left leg'], 'Animal bite and rabies risk'],

    // patient_medical_problems.coding: several codes, dashed, suffixed
    [['code' => "A01.00 - Typhoid fever, unspecified (ICD-10-CM)", 'text' => 'ewf'], 'Typhoid fever'],

    // nothing seeded for these: no guess is the correct answer
    [['code' => '', 'text' => 'M17.11 Primary Osteoarthritis, Right Knee (Post-TKR Day 3)'], 'Osteoarthritis'],
    [['code' => '', 'text' => 'I25.10 Coronary Artery Disease post CABG x3 graft'], 'Coronary artery disease'],
    [['code' => 'Q90.9', 'text' => 'Down syndrome, unspecified'], null],
    [['code' => '', 'text' => 'For routine follow up'], null],
    [['code' => '', 'text' => ''], null],
];

foreach ($cases as [$row, $want]) {
    $got = titleFor($row);
    $label = ($row['code'] !== '' ? $row['code'] . ' | ' : '') . ($row['text'] ?: '(no text)');
    check(
        substr($label, 0, 58) . ' -> ' . var_export($want, true),
        $got === $want,
        'got ' . var_export($got, true)
    );
}

// --------------------------------------------------------------------------
// 2. A code must never be invented out of ordinary words. 'x3 graft' and
//    'Day 3' read as ICD codes under a loose pattern.
// --------------------------------------------------------------------------
echo "\n-- The code pattern does not fire on prose --\n";

check(
    "'Post-Op Day 2' alone matches nothing",
    titleFor(['code' => '', 'text' => 'Reviewed on Post-Op Day 2']) === null
);
check(
    "'CABG x3 graft' alone matches nothing",
    titleFor(['code' => '', 'text' => 'Doing well after CABG x3 graft']) === null
);

// --------------------------------------------------------------------------
// 3. Shape of what the app receives. The lists must arrive split, because the
//    app renders them as bullets and does no parsing of its own.
// --------------------------------------------------------------------------
echo "\n-- Payload shape --\n";

$one = PortalDiagnosisGuideService::forDiagnoses([['code' => 'E11', 'text' => 'Type 2 diabetes mellitus']]);
$guide = reset($one);

check('a guide is returned for E11', is_array($guide));
check('dos is a non-empty list', !empty($guide['dos']) && is_array($guide['dos']));
check('donts is a non-empty list', !empty($guide['donts']) && is_array($guide['donts']));
check('when_to_seek_help is a non-empty list', !empty($guide['when_to_seek_help']) && is_array($guide['when_to_seek_help']));
check('about is prose, not a list', is_string($guide['about'] ?? null) && strlen((string) $guide['about']) > 40);
check(
    'no list item still carries a bullet or newline',
    !array_filter(
        array_merge($guide['dos'], $guide['donts'], $guide['when_to_seek_help']),
        static fn($l) => $l === '' || $l[0] === '-' || $l[0] === '*' || strpos($l, "\n") !== false
    )
);
check('the map is keyed by the row text the caller passed', array_key_exists('Type 2 diabetes mellitus', $one));

// --------------------------------------------------------------------------
// 4. One query however many rows -- the AVS passes its whole diagnosis list.
// --------------------------------------------------------------------------
echo "\n-- Batch --\n";

$many = PortalDiagnosisGuideService::forDiagnoses([
    ['code' => 'I10', 'text' => 'Essential hypertension'],
    ['code' => 'E11.9', 'text' => 'Type 2 diabetes mellitus'],
    ['code' => 'N39.0', 'text' => 'Urinary tract infection, site not specified'],
    ['code' => 'Q90.9', 'text' => 'Down syndrome'],
]);

check('three of four rows matched, the unseeded one absent', count($many) === 3, 'got ' . count($many));

// --------------------------------------------------------------------------
// 5. The patient filter. This is the privacy boundary: the endpoint must not
//    answer for a condition the patient does not have, or it becomes an open
//    ICD-10 dictionary and the audit row it writes means nothing.
// --------------------------------------------------------------------------
echo "\n-- Patient filter --\n";

$db = \App\Core\Database::connection();
$own = $db->query(
    "SELECT p.patient_id, p.title, p.coding
       FROM patient_medical_problems p
      WHERE p.deleted_at IS NULL AND p.coding IS NOT NULL
      LIMIT 1"
)->fetch(\PDO::FETCH_ASSOC);

if (!$own) {
    echo "  [WARN] No coded problem-list row in this database; patient filter not exercised.\n";
} else {
    $patientId = (int) $own['patient_id'];

    $mine = PortalDiagnosisGuideService::forPatient($patientId, [
        ['code' => $own['coding'], 'text' => $own['title']],
    ]);
    check("a patient's own coded problem is answered", count($mine) >= 1);

    $notMine = PortalDiagnosisGuideService::forPatient($patientId, [
        ['code' => 'I50.9', 'text' => 'Heart failure, unspecified'],
    ]);
    check(
        'a condition the patient does not have is refused',
        $notMine === [],
        'returned ' . count($notMine) . ' guide(s)'
    );

    $spoof = PortalDiagnosisGuideService::forPatient($patientId, [
        ['code' => '', 'text' => 'diabetes'],
    ]);
    check(
        'a bare keyword cannot stand in for a diagnosis the patient has',
        $spoof === [],
        'returned ' . count($spoof) . ' guide(s)'
    );
}

check(
    'a patient with no record at all gets nothing',
    PortalDiagnosisGuideService::forPatient(0, [['code' => 'I10', 'text' => 'Hypertension']]) === []
);

// --------------------------------------------------------------------------
// 6. The staff screen: the authored list, and the gap list it is judged on.
// --------------------------------------------------------------------------
echo "\n-- Staff screen --\n";

$all = PortalDiagnosisGuideService::listAll();
check('listAll returns the seeded guides', ($all['counts']['guides'] ?? 0) >= 40, 'got ' . ($all['counts']['guides'] ?? 0));
check('each row carries do/dont counts for the table', isset($all['items'][0]['dos_count'], $all['items'][0]['donts_count']));
check('the gap list is present', array_key_exists('missing', $all));
check(
    'nothing already covered appears in the gap list',
    !array_filter($all['missing'], static fn($m) => titleFor(['code' => (string) ($m['code'] ?? ''), 'text' => (string) $m['text']]) !== null)
);

$search = PortalDiagnosisGuideService::listAll('diabet');
check('search narrows the list', ($search['counts']['guides'] ?? 99) < ($all['counts']['guides'] ?? 0));

// --------------------------------------------------------------------------
// 7. Validation on save -- a guide nothing can ever match is a silent failure,
//    so it is refused at the point of writing it.
// --------------------------------------------------------------------------
echo "\n-- Save validation --\n";

check('a guide with no title is refused', empty(PortalDiagnosisGuideService::save(['about' => 'x'], 0)['success']));
check(
    'a guide with no "about" is refused',
    empty(PortalDiagnosisGuideService::save(['title' => 'Test condition', 'code' => 'I10'], 0)['success'])
);
check(
    'a malformed code is refused',
    empty(PortalDiagnosisGuideService::save(['title' => 'Test condition', 'code' => 'NOTACODE', 'about' => 'x'], 0)['success'])
);
check(
    'a guide with neither code nor keywords is refused',
    empty(PortalDiagnosisGuideService::save(['title' => 'Zzz untraceable', 'about' => 'x'], 0)['success'])
);

echo "\n==================================================\n";
echo "   {$pass} passed, {$fail} failed\n";
echo "==================================================\n";

exit($fail === 0 ? 0 : 1);
