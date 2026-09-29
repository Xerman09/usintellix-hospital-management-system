<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Modules\EyeExam\Services\EyeExamService;
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
echo "   Automated Verification: Eye Exam Functionality \n";
echo "==================================================\n";

try {
    $db = Database::connection();
    
    // Check table exists
    $stmt = $db->query("SHOW TABLES LIKE 'encounter_eye_exams'");
    $table = $stmt->fetchColumn();
    report($table === 'encounter_eye_exams', 'Table encounter_eye_exams exists in database');

    // Find or create test patient & encounter
    $patient = (new Patient())->first();
    report(!empty($patient), 'Found test patient in database', 'Patient ID: ' . ($patient['id'] ?? 'none'));

    $encounter = (new Encounter())->where('patient_id', $patient['id'])->first();
    if (!$encounter) {
        $encId = (new Encounter())->create([
            'patient_id' => $patient['id'],
            'date_of_service' => date('Y-m-d H:i:s'),
            'reason_for_visit' => 'Eye Examination'
        ]);
        $encounter = (new Encounter())->where('id', $encId)->first();
    }
    report(!empty($encounter), 'Found or created test encounter', 'Encounter ID: ' . ($encounter['id'] ?? 'none'));

    $service = new EyeExamService();
    $init = $service->getOrCreate((int)$encounter['id'], (int)$patient['id']);
    report(is_array($init) && isset($init['physical_exam_data']), 'EyeExamService initializes default schema structure');

    // Save test payload
    $saveData = [
        'hpi_data' => [
            'active_tab' => 'cc1',
            'cc1' => 'Blurred vision in both eyes',
            'hpi_text' => 'Gradual onset over 6 months, worse when reading fine print',
            'chronic_problems' => 'Myopia, astigmatism'
        ],
        'physical_exam_data' => [
            'mental_status' => ['alert' => true, 'oriented_tpp' => true, 'mood_affect_nml' => true],
            'vision' => [
                'sc_od' => '20/40', 'sc_os' => '20/50',
                'cc_od' => '20/20', 'cc_os' => '20/20',
                'va_od' => '20/20', 'va_os' => '20/20'
            ],
            'tension' => ['time' => '14:30', 'ap_od' => '15', 'ap_os' => '16'],
            'fields' => ['ftcf' => true, 'od_desc' => 'Full to confrontation', 'os_desc' => 'Full to confrontation'],
            'amsler' => ['normal' => true],
            'pupils' => ['normal' => true, 'od_size' => '3', 'os_size' => '3', 'apd' => 'None']
        ],
        'external_exam_data' => [
            'od' => ['brow' => 'Normal', 'upper_lids' => 'Normal', 'lower_lids' => 'Normal', 'medial_canthi' => 'Normal', 'adnoxa' => 'Normal'],
            'os' => ['brow' => 'Normal', 'upper_lids' => 'Normal', 'lower_lids' => 'Normal', 'medial_canthi' => 'Normal', 'adnoxa' => 'Normal']
        ],
        'anterior_segment_data' => [
            'od' => ['conj_sclera' => 'Clear', 'cornea' => 'Clear', 'ac' => 'Deep & Quiet', 'lens' => 'Clear', 'iris' => 'Flat & Intact'],
            'os' => ['conj_sclera' => 'Clear', 'cornea' => 'Clear', 'ac' => 'Deep & Quiet', 'lens' => 'Clear', 'iris' => 'Flat & Intact']
        ],
        'retina_data' => [
            'od' => ['disc' => 'Pink & Sharp', 'macula' => 'Normal', 'vessels' => 'Normal caliber', 'vitreous' => 'Clear', 'periph' => 'Attached 360'],
            'os' => ['disc' => 'Pink & Sharp', 'macula' => 'Normal', 'vessels' => 'Normal caliber', 'vitreous' => 'Clear', 'periph' => 'Attached 360'],
            'cd_ratio_od' => '0.30',
            'cd_ratio_os' => '0.30'
        ],
        'neuro_data' => [
            'motility_normal' => true,
            'act_ortho' => true,
            'od' => ['color' => '14/14 Ishihara', 'red_desat' => '100%'],
            'os' => ['color' => '14/14 Ishihara', 'red_desat' => '100%'],
            'stereopsis' => '40 sec of arc'
        ],
        'impression_plan_data' => [
            'new_dx' => '1. Myopia with astigmatism (H52.203)\n2. Presbyopia (H52.4)',
            'next_visit_orders' => 'Updated spectacles Rx, RTC in 1 year'
        ],
        'chief_complaint' => 'Blurred vision in both eyes',
        'new_dx' => '1. Myopia with astigmatism (H52.203)\n2. Presbyopia (H52.4)'
    ];

    $saveResult = $service->save((int)$encounter['id'], (int)$patient['id'], $saveData, 1);
    report($saveResult['success'] === true, 'EyeExamService::save persists exam data to database');

    $fetched = $service->getByEncounter((int)$encounter['id']);
    report(!empty($fetched) && $fetched['chief_complaint'] === 'Blurred vision in both eyes', 'Retrieved saved eye exam matches persisted chief complaint');
    report(isset($fetched['physical_exam_data']['vision']['va_od']) && $fetched['physical_exam_data']['vision']['va_od'] === '20/20', 'Visual acuity persisted and retrieved accurately');
    report(isset($fetched['anterior_segment_data']['od']['cornea']) && $fetched['anterior_segment_data']['od']['cornea'] === 'Clear', 'Anterior segment structures persisted and formatted correctly');

    echo "\n--------------------------------------------------\n";
    echo "Summary: {$passed} passed, {$failed} failed\n";
    echo "--------------------------------------------------\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    exit(1);
}
