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
        } elseif (($data['context'] ?? '') !== 'vitals') {
            $recommendations[] = "No allergies documented. Verify with patient if this is up to date.";
        }

        // Vitals-focused analysis: read the abnormal-flag columns the
        // Vitals History table already computes per reading (weight_abn,
        // bp_systolic_abn, etc.) rather than re-deriving thresholds here,
        // so this stays consistent with what's shown in that table.
        if (!empty($data['vitals'])) {
            $this->analyzeVitals($data['vitals'], $warnings, $recommendations);
        }

        if (empty($warnings)) {
            $warnings[] = "No immediate critical warning signs detected from the provided history. However, always exercise clinical judgement.";
        }

        if (($data['context'] ?? '') === 'vitals') {
            $recommendations[] = "Correlate any flagged readings with the patient's current medications and recent encounters.";
        } else {
            $recommendations[] = "Review recent lab results if available.";
            $recommendations[] = "Consider updating the SDOH assessment for a more comprehensive review.";
        }

        $summary = ($data['context'] ?? '') === 'vitals'
            ? "Based on this patient's recorded vitals history, the AI has generated the following insights."
            : "Based on the provided health assessment and history, the AI has generated the following insights.";

        $this->success([
            'patient_id' => $patientId,
            'analysis' => [
                'summary' => $summary,
                'warnings' => $warnings,
                'recommendations' => $recommendations,
                'generated_at' => date('Y-m-d H:i:s')
            ]
        ], 'AI Health Assessment generated successfully.');
    }

    /**
     * Turns the abnormal-flag columns already present on each vitals
     * reading (set elsewhere when the reading was recorded) into
     * plain-language findings, most recent first, capped so the panel
     * doesn't turn into a wall of text for a patient with a long history.
     */
    private function analyzeVitals(array $vitals, array &$warnings, array &$recommendations): void
    {
        $flagLabels = [
            'bp_systolic_abn' => 'Systolic blood pressure',
            'bp_diastolic_abn' => 'Diastolic blood pressure',
            'pulse_abn' => 'Pulse',
            'temperature_abn' => 'Temperature',
            'respiration_abn' => 'Respiration rate',
            'oxygen_saturation_abn' => 'Oxygen saturation',
            'weight_abn' => 'Weight',
            'height_abn' => 'Height'
        ];

        $findings = [];

        foreach ($vitals as $vital) {
            $date = !empty($vital['date_of_service']) ? date('M j, Y', strtotime($vital['date_of_service'])) : null;

            foreach ($flagLabels as $flagKey => $label) {
                $flagValue = strtolower(trim((string) ($vital[$flagKey] ?? '')));

                if (in_array($flagValue, ['high', 'low', 'abnormal'], true)) {
                    $findings[] = "{$label} flagged {$flagValue}" . ($date ? " on {$date}" : '') . '.';
                }
            }

            $bmiStatus = strtolower(trim((string) ($vital['bmi_status'] ?? '')));

            if ($bmiStatus !== '' && !in_array($bmiStatus, ['normal', 'na'], true)) {
                $findings[] = "BMI status recorded as " . ucwords(str_replace('_', ' ', $bmiStatus)) . ($date ? " on {$date}" : '') . '.';
            }
        }

        if (!empty($findings)) {
            // Vitals are already newest-first from the API, so the first
            // handful of findings are naturally the most recent ones.
            $warnings = array_merge($warnings, array_slice($findings, 0, 6));
        } else {
            $recommendations[] = "Vitals history shows no flagged abnormal readings across " . count($vitals) . " recorded visit" . (count($vitals) === 1 ? '' : 's') . ".";
        }
    }
}
