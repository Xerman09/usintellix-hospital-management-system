<?php

namespace App\Modules\EncounterDiagnoses\Services;

use App\Core\Database;
use App\Modules\EncounterDiagnoses\Models\EncounterDiagnosis;
use PDO;

class EncounterDiagnosisService
{
    /**
     * An encounter's diagnosis list, ordered Dx1/Dx2/... for the fee
     * sheet's "Justify" checkboxes.
     */
    public function list(int $encounterId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, encounter_id, code, description, sequence, created_at
             FROM encounter_diagnoses
             WHERE encounter_id = :encounter_id AND deleted_at IS NULL
             ORDER BY sequence ASC, id ASC"
        );
        $stmt->execute(['encounter_id' => $encounterId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function store(int $encounterId, array $data, int $createdBy): array
    {
        $code = trim((string) ($data['code'] ?? ''));

        if ($code === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['code' => 'A diagnosis code is required.']];
        }

        $nextSequence = $this->nextSequence($encounterId);

        $id = (new EncounterDiagnosis())->create([
            'encounter_id' => $encounterId,
            'code' => $code,
            'description' => $data['description'] ?? null,
            'sequence' => $nextSequence,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $createdBy
        ]);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to add diagnosis.'];
        }

        return ['success' => true, 'message' => 'Diagnosis added successfully.', 'data' => ['id' => $id, 'sequence' => $nextSequence]];
    }

    public function remove(int $id, int $deletedBy): array
    {
        $record = $this->find($id);

        if (!$record || $record['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Diagnosis not found.'];
        }

        (new EncounterDiagnosis())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy
        ], $id);

        return ['success' => true, 'message' => 'Diagnosis removed successfully.'];
    }

    public function find(int $id): ?array
    {
        return (new EncounterDiagnosis())->where('id', $id)->first();
    }

    private function nextSequence(int $encounterId): int
    {
        $stmt = Database::connection()->prepare(
            "SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence
             FROM encounter_diagnoses
             WHERE encounter_id = :encounter_id AND deleted_at IS NULL"
        );
        $stmt->execute(['encounter_id' => $encounterId]);

        return (int) $stmt->fetchColumn();
    }
}
