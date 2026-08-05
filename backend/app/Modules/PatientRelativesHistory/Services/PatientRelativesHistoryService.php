<?php

namespace App\Modules\PatientRelativesHistory\Services;

use App\Core\Database;
use PDO;

class PatientRelativesHistoryService
{
    /**
     * Fixed set of recognized hereditary condition keys -- kept in sync
     * with the CONDITIONS list on the frontend.
     */
    public const CONDITION_KEYS = [
        'cancer', 'diabetes', 'heart_problems', 'epilepsy', 'suicide',
        'tuberculosis', 'high_blood_pressure', 'stroke', 'mental_illness'
    ];

    /**
     * Get a patient's recorded relatives history rows.
     */
    public function get(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT condition_key, notes
             FROM patient_relatives_history
             WHERE patient_id = :patient_id"
        );
        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Replace a patient's full set of relatives history rows in one save.
     */
    public function save(int $patientId, array $entries, int $userId): array
    {
        $clean = $this->cleanEntries($entries);

        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $delete = $pdo->prepare("DELETE FROM patient_relatives_history WHERE patient_id = :patient_id");
            $delete->execute(['patient_id' => $patientId]);

            $insert = $pdo->prepare(
                "INSERT INTO patient_relatives_history
                    (patient_id, condition_key, notes, created_at, created_by)
                 VALUES
                    (:patient_id, :condition_key, :notes, :created_at, :created_by)"
            );

            foreach ($clean as $entry) {
                if ($entry['notes'] === null) {
                    continue;
                }

                $insert->execute([
                    'patient_id' => $patientId,
                    'condition_key' => $entry['condition_key'],
                    'notes' => $entry['notes'],
                    'created_at' => date('Y-m-d H:i:s'),
                    'created_by' => $userId
                ]);
            }

            $pdo->commit();

            return [
                'success' => true,
                'message' => 'Relatives history saved successfully.'
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();

            return [
                'success' => false,
                'message' => 'Failed to save relatives history.'
            ];
        }
    }

    /**
     * Keep only recognized condition keys, trimming notes to NULL when empty.
     */
    private function cleanEntries(array $entries): array
    {
        $byKey = [];

        foreach ($entries as $entry) {
            $key = $entry['condition_key'] ?? null;

            if (!in_array($key, self::CONDITION_KEYS, true)) {
                continue;
            }

            $notes = trim((string) ($entry['notes'] ?? ''));

            $byKey[$key] = [
                'condition_key' => $key,
                'notes' => $notes === '' ? null : $notes
            ];
        }

        return array_values($byKey);
    }
}
