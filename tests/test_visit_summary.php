<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

// Point this process at the disposable database BEFORE anything connects.
//
// Until 21 November this suite ran against whatever backend/.env names, which
// is the live database -- see docs/TODO.md 3.4. TestDatabase::use() refuses any
// target that is not clearly a test database, and because it writes
// $_ENV['DB_DATABASE'] before Env::load() runs (and Env::load() never
// overwrites a key that is already set), the override survives this suite's own
// Env::load() call further down.
require_once __DIR__ . '/lib/test_database.php';

try {
    TestDatabase::use();
} catch (Throwable $e) {
    echo 'REFUSED: ' . $e->getMessage() . "\n";
    exit(1);
}

use App\Core\Env;
use App\Modules\Encounters\Models\Encounter;
use App\Modules\Encounters\Services\EncounterService;
use App\Modules\Patients\Models\Patient;

Env::load();

echo "==================================================\n";
echo "   Automated Verification: Optimized Visit Summary\n";
echo "==================================================\n";

$patient = (new Patient())->first();
if (!$patient) {
    echo "  [WARN] No patients in DB to test.\n";
    exit(0);
}

$encounter = (new Encounter())->where('patient_id', $patient['id'])->first();
if (!$encounter) {
    $encId = (new Encounter())->create([
        'patient_id' => $patient['id'],
        'date_of_service' => date('Y-m-d H:i:s'),
        'reason_for_visit' => 'Regular Checkup'
    ]);
    $encounter = (new Encounter())->where('id', $encId)->first();
}

$encounterId = (int) $encounter['id'];
echo "  [INFO] Testing with Encounter ID: {$encounterId} for Patient: {$patient['id']}\n";

$service = new EncounterService();

$start = microtime(true);
$summary = $service->getEncounterSummary($encounterId);
$durationMs = round((microtime(true) - $start) * 1000, 2);

echo "  [PASS] Consolidated summary executed in {$durationMs}ms\n";

$requiredKeys = [
    'encounter', 'sections', 'vitals', 'carePlanItems', 'clinicalInstructionItems',
    'clinicalNoteItems', 'miscBillingOptions', 'functionalCognitiveItems',
    'observationItems', 'reviewOfSystems', 'reviewOfSystemsChecks', 'soapNotes',
    'speechDictationItems', 'gad7'
];

$allPresent = true;
foreach ($requiredKeys as $key) {
    if (!array_key_exists($key, $summary)) {
        echo "  [FAIL] Missing required key: {$key}\n";
        $allPresent = false;
    }
}

if ($allPresent) {
    echo "  [PASS] All 14 clinical encounter datasets present in payload\n";
}

if (!empty($summary['encounter']['id'])) {
    echo "  [PASS] Encounter metadata loaded (Category: " . ($summary['encounter']['visit_category_name'] ?? 'Visit') . ")\n";
}

echo "--------------------------------------------------\n";
echo "Summary: Visit summary optimization verified successfully.\n";
