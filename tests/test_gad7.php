<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Modules\Gad7\Services\Gad7Service;
use App\Modules\Encounters\Models\Encounter;
use App\Modules\Patients\Models\Patient;

Env::load();

$passed = 0;
$failed = 0;

function report(bool $condition, string $title, string $detail = ''): void {
    global $passed, $failed;
    if ($condition) {
        $passed++;
        echo "  [PASS] {$title}\n";
    } else {
        $failed++;
        echo "  [FAIL] {$title}\n";
        if ($detail) {
            echo "         Detail: {$detail}\n";
        }
    }
}

echo "\n==================================================\n";
echo "   Automated Verification: GAD-7 Functionality    \n";
echo "==================================================\n";

try {
    $db = Database::connection();
    
    // Check table exists
    $stmt = $db->query("SHOW TABLES LIKE 'encounter_gad7'");
    $table = $stmt->fetchColumn();
    report($table === 'encounter_gad7', "Table encounter_gad7 exists in database");

    // Fetch a patient
    $patient = (new Patient())->first();
    report(!empty($patient['id']), "Found test patient in database");

    $patientId = (int)$patient['id'];

    // Fetch or create an encounter
    $encModel = new Encounter();
    $encounter = $encModel->where('patient_id', $patientId)->first();
    if (!$encounter) {
        $encounterId = $encModel->insert([
            'patient_id' => $patientId,
            'encounter_date' => date('Y-m-d H:i:s'),
            'status' => 'arrived',
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => 1
        ]);
        $encounter = $encModel->where('id', $encounterId)->first();
    }
    report(!empty($encounter['id']), "Found or created test encounter");
    $encounterId = (int)$encounter['id'];
    $db->exec("DELETE FROM encounter_gad7 WHERE encounter_id = {$encounterId}");

    $service = new Gad7Service();

    // 1. Initial retrieval returns defaults
    $initData = $service->getOrCreate($encounterId, $patientId);
    report((int)$initData['total_score'] === 0 && $initData['severity'] === 'No anxiety disorder', "Default initialization has 0 score and 'No anxiety disorder'");

    // 2. Score calculation tests
    $scoreTest1 = Gad7Service::calculateScoreAndSeverity([
        'q1_feeling_nervous' => 1,
        'q2_control_worrying' => 2,
        'q3_worrying_too_much' => 2,
        'q4_trouble_relaxing' => 1,
        'q5_hard_to_sit_still' => 1,
        'q6_easily_annoyed' => 1,
        'q7_feeling_afraid' => 1,
    ]);
    report($scoreTest1['total_score'] === 9 && $scoreTest1['severity'] === 'Mild anxiety disorder', "Score 9 evaluates to Mild anxiety disorder");

    $scoreTest2 = Gad7Service::calculateScoreAndSeverity([
        'q1_feeling_nervous' => 3,
        'q2_control_worrying' => 3,
        'q3_worrying_too_much' => 3,
        'q4_trouble_relaxing' => 3,
        'q5_hard_to_sit_still' => 3,
        'q6_easily_annoyed' => 0,
        'q7_feeling_afraid' => 0,
    ]);
    report($scoreTest2['total_score'] === 15 && $scoreTest2['severity'] === 'Severe anxiety disorder', "Score 15 evaluates to Severe anxiety disorder");

    // 3. Save GAD-7
    $saveData = [
        'q1_feeling_nervous' => 2,
        'q2_control_worrying' => 2,
        'q3_worrying_too_much' => 3,
        'q4_trouble_relaxing' => 1,
        'q5_hard_to_sit_still' => 2,
        'q6_easily_annoyed' => 1,
        'q7_feeling_afraid' => 1,
    ]; // sum: 2+2+3+1+2+1+1 = 12 (Moderate anxiety disorder)
    $saveResult = $service->save($encounterId, $patientId, $saveData, 1);
    report($saveResult['success'] === true, "Gad7Service::save successfully persisted form");
    report($saveResult['data']['total_score'] === 12 && $saveResult['data']['severity'] === 'Moderate anxiety disorder', "Saved GAD-7 calculated score 12 correctly");

    // 4. Retrieve saved
    $retrieved = $service->getByEncounter($encounterId);
    report($retrieved !== null && (int)$retrieved['q3_worrying_too_much'] === 3, "Retrieved GAD-7 matches persisted values");

} catch (Throwable $e) {
    report(false, "Exception occurred during verification", $e->getMessage() . "\n" . $e->getTraceAsString());
}

echo "\n--------------------------------------------------\n";
echo "Summary: {$passed} passed, {$failed} failed\n";
echo "--------------------------------------------------\n";

if ($failed > 0) {
    exit(1);
}
