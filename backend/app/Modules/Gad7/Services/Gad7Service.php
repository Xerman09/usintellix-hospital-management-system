<?php

namespace App\Modules\Gad7\Services;

use App\Core\Database;
use App\Core\AuditLogger;
use App\Modules\Gad7\Models\EncounterGad7;
use PDO;

class Gad7Service
{
    public const QUESTIONS = [
        'q1_feeling_nervous' => 'Feeling nervous, anxious, or on edge',
        'q2_control_worrying' => 'Not being able to stop or control worrying',
        'q3_worrying_too_much' => 'Worrying too much about different things',
        'q4_trouble_relaxing' => 'Trouble relaxing',
        'q5_hard_to_sit_still' => 'Being so restless that it\'s hard to sit still',
        'q6_easily_annoyed' => 'Becoming easily annoyed or irritable',
        'q7_feeling_afraid' => 'Feeling afraid as if something awful might happen',
    ];

    public static function calculateScoreAndSeverity(array $answers): array
    {
        $total = 0;
        foreach (array_keys(self::QUESTIONS) as $field) {
            if (isset($answers[$field]) && is_numeric($answers[$field])) {
                $val = (int) $answers[$field];
                if ($val >= 0 && $val <= 3) {
                    $total += $val;
                }
            }
        }

        if ($total >= 15) {
            $severity = 'Severe anxiety disorder';
        } elseif ($total >= 10) {
            $severity = 'Moderate anxiety disorder';
        } elseif ($total >= 5) {
            $severity = 'Mild anxiety disorder';
        } else {
            $severity = 'No anxiety disorder';
        }

        return [
            'total_score' => $total,
            'severity' => $severity,
            'formatted_score' => "{$total} - {$severity}"
        ];
    }

    /**
     * Get GAD-7 record for an encounter.
     */
    public function getByEncounter(int $encounterId): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM encounter_gad7 
             WHERE encounter_id = :encounter_id AND deleted_at IS NULL 
             ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute(['encounter_id' => $encounterId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        return $this->formatRow($row);
    }

    /**
     * Get or initialize default structure.
     */
    public function getOrCreate(int $encounterId, int $patientId): array
    {
        $existing = $this->getByEncounter($encounterId);
        if ($existing) {
            return $existing;
        }

        return [
            'id' => null,
            'encounter_id' => $encounterId,
            'patient_id' => $patientId,
            'q1_feeling_nervous' => null,
            'q2_control_worrying' => null,
            'q3_worrying_too_much' => null,
            'q4_trouble_relaxing' => null,
            'q5_hard_to_sit_still' => null,
            'q6_easily_annoyed' => null,
            'q7_feeling_afraid' => null,
            'total_score' => 0,
            'severity' => 'No anxiety disorder',
            'formatted_score' => '0 - No anxiety disorder'
        ];
    }

    /**
     * Save or update GAD-7 for an encounter.
     */
    public function save(int $encounterId, int $patientId, array $data, int $userId): array
    {
        $calculated = self::calculateScoreAndSeverity($data);
        $totalScore = $calculated['total_score'];
        $severity = $calculated['severity'];

        $existing = $this->getByEncounter($encounterId);
        $now = date('Y-m-d H:i:s');

        $rowPayload = [
            'encounter_id' => $encounterId,
            'patient_id' => $patientId,
            'q1_feeling_nervous' => isset($data['q1_feeling_nervous']) && $data['q1_feeling_nervous'] !== '' ? (int) $data['q1_feeling_nervous'] : null,
            'q2_control_worrying' => isset($data['q2_control_worrying']) && $data['q2_control_worrying'] !== '' ? (int) $data['q2_control_worrying'] : null,
            'q3_worrying_too_much' => isset($data['q3_worrying_too_much']) && $data['q3_worrying_too_much'] !== '' ? (int) $data['q3_worrying_too_much'] : null,
            'q4_trouble_relaxing' => isset($data['q4_trouble_relaxing']) && $data['q4_trouble_relaxing'] !== '' ? (int) $data['q4_trouble_relaxing'] : null,
            'q5_hard_to_sit_still' => isset($data['q5_hard_to_sit_still']) && $data['q5_hard_to_sit_still'] !== '' ? (int) $data['q5_hard_to_sit_still'] : null,
            'q6_easily_annoyed' => isset($data['q6_easily_annoyed']) && $data['q6_easily_annoyed'] !== '' ? (int) $data['q6_easily_annoyed'] : null,
            'q7_feeling_afraid' => isset($data['q7_feeling_afraid']) && $data['q7_feeling_afraid'] !== '' ? (int) $data['q7_feeling_afraid'] : null,
            'total_score' => $totalScore,
            'severity' => $severity,
            'updated_at' => $now,
            'updated_by' => $userId
        ];

        $model = new EncounterGad7();

        if ($existing && !empty($existing['id'])) {
            $gad7Id = (int) $existing['id'];
            $model->where('id', $gad7Id)->update($rowPayload);
            $action = 'UPDATE_GAD7';
            $msg = 'GAD-7 updated successfully.';
        } else {
            $rowPayload['created_at'] = $now;
            $rowPayload['created_by'] = $userId;
            $gad7Id = (int) $model->insert($rowPayload);
            $action = 'CREATE_GAD7';
            $msg = 'GAD-7 saved successfully.';
        }

        AuditLogger::log(
            AuditLogger::CATEGORY_CLINICAL,
            $action,
            "Documented GAD-7 form #{$gad7Id} with score {$totalScore} ({$severity}) for encounter #{$encounterId} (patient #{$patientId})",
            $patientId,
            $userId
        );

        return [
            'success' => true,
            'message' => $msg,
            'data' => $this->getByEncounter($encounterId)
        ];
    }

    private function formatRow(array $row): array
    {
        $calculated = self::calculateScoreAndSeverity($row);
        $row['formatted_score'] = "{$row['total_score']} - {$row['severity']}";
        return $row;
    }
}
