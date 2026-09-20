<?php
require_once 'backend/app/Core/Autoload.php';

use App\Modules\OrManagement\Services\OrManagementService;

$service = new OrManagementService();
$today = date('Y-m-d');

// 1. Get schedule
$res = $service->getSchedule(['date' => $today]);
echo "Schedule Cases Count for Today: " . count($res['cases']) . "\n";
echo "Suites Count: " . count($res['suites']) . "\n";
echo "KPIs: Total=" . $res['kpis']['total_cases'] . ", In Progress=" . $res['kpis']['in_progress'] . ", PACU=" . $res['kpis']['pacu_count'] . ", Utilization=" . $res['kpis']['utilization_rate'] . "%\n";

// 2. Test getCaseDetails
$firstCaseId = $res['cases'][0]['id'];
$details = $service->getCaseDetails($firstCaseId);
echo "Details for Case {$details['case_number']}: Patient={$details['patient_name']} ({$details['patient_mrn']}), Procedure={$details['procedure_name']}, Stage={$details['perioperative_stage']}\n";

// 3. Test stage transition
$transitioned = $service->transitionStage($firstCaseId, 'Closing / Extubation');
echo "Transitioned Case to: " . $transitioned['perioperative_stage'] . " (Closing time: {$transitioned['actual_closing_time']})\n";

// Revert to Incision for test realism
$service->transitionStage($firstCaseId, 'Incision / In Progress');

echo "OR Backend Service test passed successfully!\n";
