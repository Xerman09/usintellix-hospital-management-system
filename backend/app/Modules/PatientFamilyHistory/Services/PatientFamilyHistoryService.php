<?php

namespace App\Modules\PatientFamilyHistory\Services;

use App\Core\Database;
use PDO;

class PatientFamilyHistoryService
{
    /**
     * Fixed set of recognized relation keys -- kept in sync with the
     * RELATIONS list on the frontend.
     */
    public const RELATION_KEYS = ['father', 'mother', 'siblings', 'spouse', 'offspring'];

    /**
     * Get a patient's recorded family history rows.
     */
    public function get(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT relation_key, description, diagnosis_code, diagnosis_code_description
             FROM patient_family_history
             WHERE patient_id = :patient_id"
        );
        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Replace a patient's full set of family history rows in one save.
     * Every recognized relation is written, even when left blank, so the
     * table always reflects the current state of the form.
     */
    public function save(int $patientId, array $entries, int $userId): array
    {
        $clean = $this->cleanEntries($entries);

        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $delete = $pdo->prepare("DELETE FROM patient_family_history WHERE patient_id = :patient_id");
            $delete->execute(['patient_id' => $patientId]);

            $insert = $pdo->prepare(
                "INSERT INTO patient_family_history
                    (patient_id, relation_key, description, diagnosis_code, diagnosis_code_description, created_at, created_by)
                 VALUES
                    (:patient_id, :relation_key, :description, :diagnosis_code, :diagnosis_code_description, :created_at, :created_by)"
            );

            foreach ($clean as $entry) {
                if ($entry['description'] === null && $entry['diagnosis_code'] === null) {
                    continue;
                }

                $insert->execute([
                    'patient_id' => $patientId,
                    'relation_key' => $entry['relation_key'],
                    'description' => $entry['description'],
                    'diagnosis_code' => $entry['diagnosis_code'],
                    'diagnosis_code_description' => $entry['diagnosis_code_description'],
                    'created_at' => date('Y-m-d H:i:s'),
                    'created_by' => $userId
                ]);
            }

            $pdo->commit();

            return [
                'success' => true,
                'message' => 'Family history saved successfully.'
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();

            return [
                'success' => false,
                'message' => 'Failed to save family history.'
            ];
        }
    }

    /**
     * Keep only recognized relation keys, trimming text fields to NULL
     * when empty.
     */
    private function cleanEntries(array $entries): array
    {
        $byKey = [];

        foreach ($entries as $entry) {
            $key = $entry['relation_key'] ?? null;

            if (!in_array($key, self::RELATION_KEYS, true)) {
                continue;
            }

            $description = trim((string) ($entry['description'] ?? ''));
            $diagnosisCode = trim((string) ($entry['diagnosis_code'] ?? ''));
            $diagnosisCodeDescription = trim((string) ($entry['diagnosis_code_description'] ?? ''));

            $byKey[$key] = [
                'relation_key' => $key,
                'description' => $description === '' ? null : $description,
                'diagnosis_code' => $diagnosisCode === '' ? null : $diagnosisCode,
                'diagnosis_code_description' => $diagnosisCodeDescription === '' ? null : $diagnosisCodeDescription
            ];
        }

        return array_values($byKey);
    }
}
