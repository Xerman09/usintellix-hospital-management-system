<?php

namespace App\Modules\PatientSdohAssessment\Services;

use App\Core\Database;
use PDO;

class PatientSdohAssessmentService
{
    /**
     * Fixed set of recognized SDOH domain keys -- kept in sync with the
     * SDOH_ITEMS list on the frontend.
     */
    public const ITEM_KEYS = [
        'housing_stability', 'housing_quality', 'food_insecurity', 'transportation',
        'utilities', 'financial_strain', 'employment_status', 'education_level',
        'social_isolation', 'interpersonal_safety', 'disability_adl'
    ];

    /**
     * Allowed response values per domain -- kept in sync with each item's
     * `options` list on the frontend.
     */
    private const RESPONSE_VALUES = [
        'housing_stability' => ['stable', 'worried', 'unstable'],
        'housing_quality' => ['no_problems', 'some_problems', 'significant_problems'],
        'food_insecurity' => ['never', 'sometimes', 'often'],
        'transportation' => ['no_barriers', 'occasional', 'frequent'],
        'utilities' => ['no_risk', 'at_risk', 'shut_off'],
        'financial_strain' => ['not_hard', 'somewhat_hard', 'very_hard'],
        'employment_status' => ['employed', 'unemployed_looking', 'unemployed_not_looking', 'unable_to_work', 'retired'],
        'education_level' => ['less_than_hs', 'hs_or_ged', 'some_college', 'college_plus'],
        'social_isolation' => ['rarely', 'sometimes', 'often'],
        'interpersonal_safety' => ['safe', 'some_concerns', 'significant_concerns'],
        'disability_adl' => ['no_difficulty', 'some_difficulty', 'significant_difficulty']
    ];

    /**
     * Get a patient's recorded SDOH assessment rows.
     */
    public function get(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT item_key, response_value, notes
             FROM patient_sdoh_assessment
             WHERE patient_id = :patient_id"
        );
        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Replace a patient's full set of SDOH assessment rows in one save.
     */
    public function save(int $patientId, array $entries, int $userId): array
    {
        $clean = $this->cleanEntries($entries);

        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $delete = $pdo->prepare("DELETE FROM patient_sdoh_assessment WHERE patient_id = :patient_id");
            $delete->execute(['patient_id' => $patientId]);

            $insert = $pdo->prepare(
                "INSERT INTO patient_sdoh_assessment
                    (patient_id, item_key, response_value, notes, created_at, created_by)
                 VALUES
                    (:patient_id, :item_key, :response_value, :notes, :created_at, :created_by)"
            );

            foreach ($clean as $entry) {
                if ($entry['response_value'] === null && $entry['notes'] === null) {
                    continue;
                }

                $insert->execute([
                    'patient_id' => $patientId,
                    'item_key' => $entry['item_key'],
                    'response_value' => $entry['response_value'],
                    'notes' => $entry['notes'],
                    'created_at' => date('Y-m-d H:i:s'),
                    'created_by' => $userId
                ]);
            }

            $pdo->commit();

            return [
                'success' => true,
                'message' => 'SDOH Assessment saved successfully.'
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();

            return [
                'success' => false,
                'message' => 'Failed to save SDOH Assessment.'
            ];
        }
    }

    /**
     * Keep only recognized item keys and their allowed response values,
     * trimming notes to NULL when empty.
     */
    private function cleanEntries(array $entries): array
    {
        $byKey = [];

        foreach ($entries as $entry) {
            $key = $entry['item_key'] ?? null;

            if (!in_array($key, self::ITEM_KEYS, true)) {
                continue;
            }

            $response = $entry['response_value'] ?? '';
            $allowed = self::RESPONSE_VALUES[$key] ?? [];
            $response = in_array($response, $allowed, true) ? $response : null;

            $byKey[$key] = [
                'item_key' => $key,
                'response_value' => $response,
                'notes' => $this->blankToNull($entry['notes'] ?? '')
            ];
        }

        return array_values($byKey);
    }

    private function blankToNull(string $value): ?string
    {
        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
