<?php

namespace App\Modules\Phq9\Services;

use App\Core\Database;
use App\Core\AuditLogger;
use App\Modules\Phq9\Models\EncounterPhq9;
use PDO;

class Phq9Service
{
    public const QUESTIONS = [
        'q1_little_interest'       => 'Little interest or pleasure in doing things',
        'q2_feeling_down'          => 'Feeling down, depressed, or hopeless',
        'q3_sleep_trouble'         => 'Trouble falling or staying asleep, or sleeping too much',
        'q4_feeling_tired'         => 'Feeling tired or having little energy',
        'q5_poor_appetite'         => 'Poor appetite or overeating',
        'q6_feeling_bad_self'      => 'Feeling bad about yourself - or that you are a failure or have let yourself or your family down',
        'q7_trouble_concentrating' => 'Trouble concentrating on things, such as reading an article or watching videos',
        'q8_moving_slowly'         => 'Moving or speaking slowly noted by others or fidgety or restless more than usual',
        'q9_better_off_dead'       => 'Thoughts that you would be better off dead, or of hurting yourself',
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

        if ($total >= 20) {
            $severity = 'Severe depressive disorder';
        } elseif ($total >= 15) {
            $severity = 'Moderately severe depressive disorder';
        } elseif ($total >= 10) {
            $severity = 'Moderate depressive disorder';
        } elseif ($total >= 5) {
            $severity = 'Mild depressive disorder';
        } else {
            $severity = 'No depressive disorder';
        }

        return [
            'total_score'     => $total,
            'severity'        => $severity,
            'formatted_score' => "{$total} - {$severity}"
        ];
    }

    /**
     * Get PHQ-9 record for an encounter.
     */
    public function getByEncounter(int $encounterId): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM encounter_phq9 
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
            'id'                       => null,
            'encounter_id'             => $encounterId,
            'patient_id'               => $patientId,
            'q1_little_interest'       => null,
            'q2_feeling_down'          => null,
            'q3_sleep_trouble'         => null,
            'q4_feeling_tired'         => null,
            'q5_poor_appetite'         => null,
            'q6_feeling_bad_self'      => null,
            'q7_trouble_concentrating' => null,
            'q8_moving_slowly'         => null,
            'q9_better_off_dead'       => null,
            'total_score'              => 0,
            'severity'                 => 'No depressive disorder',
            'formatted_score'          => '0 - No depressive disorder'
        ];
    }

    /**
     * Save or update PHQ-9 for an encounter.
     */
    public function save(int $encounterId, int $patientId, array $data, int $userId): array
    {
        $calculated = self::calculateScoreAndSeverity($data);
        $totalScore = $calculated['total_score'];
        $severity   = $calculated['severity'];

        $existing = $this->getByEncounter($encounterId);
        $now      = date('Y-m-d H:i:s');

        $rowPayload = [
            'encounter_id'             => $encounterId,
            'patient_id'               => $patientId,
            'q1_little_interest'       => isset($data['q1_little_interest'])       && $data['q1_little_interest']       !== '' ? (int) $data['q1_little_interest']       : null,
            'q2_feeling_down'          => isset($data['q2_feeling_down'])          && $data['q2_feeling_down']          !== '' ? (int) $data['q2_feeling_down']          : null,
            'q3_sleep_trouble'         => isset($data['q3_sleep_trouble'])         && $data['q3_sleep_trouble']         !== '' ? (int) $data['q3_sleep_trouble']         : null,
            'q4_feeling_tired'         => isset($data['q4_feeling_tired'])         && $data['q4_feeling_tired']         !== '' ? (int) $data['q4_feeling_tired']         : null,
            'q5_poor_appetite'         => isset($data['q5_poor_appetite'])         && $data['q5_poor_appetite']         !== '' ? (int) $data['q5_poor_appetite']         : null,
            'q6_feeling_bad_self'      => isset($data['q6_feeling_bad_self'])      && $data['q6_feeling_bad_self']      !== '' ? (int) $data['q6_feeling_bad_self']      : null,
            'q7_trouble_concentrating' => isset($data['q7_trouble_concentrating']) && $data['q7_trouble_concentrating'] !== '' ? (int) $data['q7_trouble_concentrating'] : null,
            'q8_moving_slowly'         => isset($data['q8_moving_slowly'])         && $data['q8_moving_slowly']         !== '' ? (int) $data['q8_moving_slowly']         : null,
            'q9_better_off_dead'       => isset($data['q9_better_off_dead'])       && $data['q9_better_off_dead']       !== '' ? (int) $data['q9_better_off_dead']       : null,
            'total_score'              => $totalScore,
            'severity'                 => $severity,
            'updated_at'               => $now,
            'updated_by'               => $userId
        ];

        $model = new EncounterPhq9();

        if ($existing && !empty($existing['id'])) {
            $phq9Id = (int) $existing['id'];
            if (empty($existing['author_name'])) {
                $rowPayload['author_name'] = $this->resolveAuthorName($userId);
            }
            $model->where('id', $phq9Id)->update($rowPayload);
            $action = 'UPDATE_PHQ9';
            $msg    = 'PHQ-9 updated successfully.';
        } else {
            $rowPayload['author_name'] = $this->resolveAuthorName($userId);
            $rowPayload['created_at']  = $now;
            $rowPayload['created_by']  = $userId;
            $phq9Id                    = (int) $model->insert($rowPayload);
            $action                    = 'CREATE_PHQ9';
            $msg                       = 'PHQ-9 saved successfully.';
        }

        AuditLogger::log(
            AuditLogger::CATEGORY_CLINICAL,
            $action,
            "Documented PHQ-9 form #{$phq9Id} with score {$totalScore} ({$severity}) for encounter #{$encounterId} (patient #{$patientId})",
            $patientId,
            $userId
        );

        return [
            'success' => true,
            'message' => $msg,
            'data'    => $this->getByEncounter($encounterId)
        ];
    }

    public function resolveAuthorName(int $userId): string
    {
        $employee = (new \App\Modules\Employees\Models\Employee())->where('user_id', $userId)->first();
        if ($employee) {
            $prefix    = 'Dr ';
            if (!empty($employee['title'])) {
                $prefix = trim($employee['title']) . ' ';
            }
            $firstName = trim((string) ($employee['first_name'] ?? ''));
            $lastName  = trim((string) ($employee['last_name'] ?? ''));
            $num       = !empty($employee['npi']) ? ', ' . trim($employee['npi']) : (!empty($employee['employee_number']) ? ', ' . trim($employee['employee_number']) : '');
            return trim($prefix . $firstName . ' ' . $lastName . $num);
        }

        $user = (new \App\Modules\Users\Models\User())->where('id', $userId)->first();
        return $user['username'] ?? 'Clinical Staff';
    }

    private function formatRow(array $row): array
    {
        if (empty($row['author_name']) && !empty($row['created_by'])) {
            $row['author_name'] = $this->resolveAuthorName((int) $row['created_by']);
        }
        self::calculateScoreAndSeverity($row);
        $row['formatted_score'] = "{$row['total_score']} - {$row['severity']}";
        return $row;
    }
}
