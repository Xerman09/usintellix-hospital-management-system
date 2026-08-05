<?php

namespace App\Modules\PatientLifestyle\Services;

use App\Core\Database;
use PDO;

class PatientLifestyleService
{
    /**
     * Fixed set of recognized lifestyle item keys -- kept in sync with the
     * LIFESTYLE_ITEMS list on the frontend.
     */
    public const ITEM_KEYS = [
        'tobacco', 'coffee', 'alcohol', 'recreational_drugs', 'counseling',
        'exercise_patterns', 'hazardous_activities', 'sleep_patterns', 'seatbelt_use'
    ];

    private const STATUS_VALUES = ['current', 'quit', 'never', 'na'];

    /**
     * Get a patient's recorded lifestyle rows.
     */
    public function get(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT item_key, notes, status, quit_date, tobacco_status, cigarette_pack_years
             FROM patient_lifestyle
             WHERE patient_id = :patient_id"
        );
        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Replace a patient's full set of lifestyle rows in one save.
     */
    public function save(int $patientId, array $entries, int $userId): array
    {
        $clean = $this->cleanEntries($entries);

        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $delete = $pdo->prepare("DELETE FROM patient_lifestyle WHERE patient_id = :patient_id");
            $delete->execute(['patient_id' => $patientId]);

            $insert = $pdo->prepare(
                "INSERT INTO patient_lifestyle
                    (patient_id, item_key, notes, status, quit_date, tobacco_status, cigarette_pack_years, created_at, created_by)
                 VALUES
                    (:patient_id, :item_key, :notes, :status, :quit_date, :tobacco_status, :cigarette_pack_years, :created_at, :created_by)"
            );

            foreach ($clean as $entry) {
                $isBlank = $entry['notes'] === null
                    && $entry['status'] === null
                    && $entry['quit_date'] === null
                    && $entry['tobacco_status'] === null
                    && $entry['cigarette_pack_years'] === null;

                if ($isBlank) {
                    continue;
                }

                $insert->execute([
                    'patient_id' => $patientId,
                    'item_key' => $entry['item_key'],
                    'notes' => $entry['notes'],
                    'status' => $entry['status'],
                    'quit_date' => $entry['quit_date'],
                    'tobacco_status' => $entry['tobacco_status'],
                    'cigarette_pack_years' => $entry['cigarette_pack_years'],
                    'created_at' => date('Y-m-d H:i:s'),
                    'created_by' => $userId
                ]);
            }

            $pdo->commit();

            return [
                'success' => true,
                'message' => 'Lifestyle saved successfully.'
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();

            return [
                'success' => false,
                'message' => 'Failed to save lifestyle.'
            ];
        }
    }

    /**
     * Keep only recognized item keys and status values, trimming text
     * fields to NULL when empty.
     */
    private function cleanEntries(array $entries): array
    {
        $byKey = [];

        foreach ($entries as $entry) {
            $key = $entry['item_key'] ?? null;

            if (!in_array($key, self::ITEM_KEYS, true)) {
                continue;
            }

            $status = $entry['status'] ?? '';
            $status = in_array($status, self::STATUS_VALUES, true) ? $status : null;

            $byKey[$key] = [
                'item_key' => $key,
                'notes' => $this->blankToNull($entry['notes'] ?? ''),
                'status' => $status,
                'quit_date' => $this->blankToNull($entry['quit_date'] ?? ''),
                'tobacco_status' => $this->blankToNull($entry['tobacco_status'] ?? ''),
                'cigarette_pack_years' => $this->blankToNull($entry['cigarette_pack_years'] ?? '')
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
