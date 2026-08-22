<?php

namespace App\Modules\AiAnalysis\Controllers;

use App\Core\Controller;
use App\Core\Request;

class AiAnalysisController extends Controller
{
    public function healthAssessment(): void
    {
        $request = new Request();
        $patientId = $request->input('patient_id');
        $data = $request->input('data');

        if (!$patientId || !$data) {
            $this->error('Patient ID and data are required.', 422);
            return;
        }

        // Decode the JSON string if it was sent as a string
        if (is_string($data)) {
            $data = json_decode($data, true);
        }

        // Mock AI analysis process
        // In a real scenario, this would call an external API like OpenAI or Gemini
        sleep(2); // Simulate network delay

        $warnings = [];
        $recommendations = [];

        // Simple mock logic based on common data points
        if (!empty($data['problems'])) {
            foreach ($data['problems'] as $problem) {
                if (stripos($problem['title'] ?? '', 'hypertension') !== false) {
                    $warnings[] = "Patient has a history of hypertension. Monitor blood pressure closely before administering stimulants.";
                }
                if (stripos($problem['title'] ?? '', 'diabetes') !== false) {
                    $warnings[] = "Patient has a history of diabetes. Check HbA1c levels and monitor for hypoglycemic episodes.";
                }
            }
        }

        if (!empty($data['allergies'])) {
            $allergyList = implode(', ', array_map(function($a) { return $a['coding'] ?? 'Unknown'; }, $data['allergies']));
            $warnings[] = "Patient has documented allergies to: {$allergyList}. Ensure no cross-reactivity with prescribed medications.";
        } else {
            $recommendations[] = "No allergies documented. Verify with patient if this is up to date.";
        }

        if (empty($warnings)) {
            $warnings[] = "No immediate critical warning signs detected from the provided history. However, always exercise clinical judgement.";
        }

        $recommendations[] = "Review recent lab results if available.";
        $recommendations[] = "Consider updating the SDOH assessment for a more comprehensive review.";

        $this->success([
            'patient_id' => $patientId,
            'analysis' => [
                'summary' => "Based on the provided health assessment and history, the AI has generated the following insights.",
                'warnings' => $warnings,
                'recommendations' => $recommendations,
                'generated_at' => date('Y-m-d H:i:s')
            ]
        ], 'AI Health Assessment generated successfully.');
    }
}
