<?php

namespace App\Modules\InpatientAdmissions\Services;

use App\Core\Database;
use App\Modules\InpatientAdmissions\Models\InpatientDailyRound;
use App\Modules\InpatientAdmissions\Models\InpatientAdmission;
use PDO;
use Exception;
use Throwable;

class DailyRoundService
{
    public const TRAJECTORIES = [
        'Critical' => [
            'label' => 'Critical',
            'color' => '#dc2626',
            'bg' => '#fee2e2',
            'description' => 'Unstable vital signs or organ failure risk; intensive monitoring required'
        ],
        'Guarded' => [
            'label' => 'Guarded',
            'color' => '#ea580c',
            'bg' => '#ffedd5',
            'description' => 'Serious condition; high risk of acute complication or clinical change'
        ],
        'Stable' => [
            'label' => 'Stable',
            'color' => '#ca8a04',
            'bg' => '#fef9c3',
            'description' => 'Vital signs stable, acute symptoms controlled, progressing on regimen'
        ],
        'Improving' => [
            'label' => 'Improving',
            'color' => '#16a34a',
            'bg' => '#dcfce7',
            'description' => 'Clear objective clinical recovery, positive response to inpatient treatment'
        ],
        'Discharge Ready' => [
            'label' => 'Discharge Ready',
            'color' => '#0284c7',
            'bg' => '#e0f2fe',
            'description' => 'Clinical discharge criteria achieved; pending final discharge processing'
        ],
    ];

    public const DIET_OPTIONS = [
        'Regular Diet',
        'Low Salt / Low Sodium Diet',
        'Diabetic / Consistent Carb Diet',
        'Renal Diet',
        'Soft / Easy to Chew Diet',
        'Pureed Diet',
        'Full Liquid Diet',
        'Clear Liquid Diet',
        'NPO (Nil Per Os / Nothing by mouth)',
        'Enteral / Tube Feeding',
    ];

    public const ACTIVITY_OPTIONS = [
        'Ambulate as tolerated / Ad lib',
        'Ambulate with assistance',
        'Up in chair as tolerated',
        'Dangle at bedside',
        'Bedrest with Bathroom Privileges (BRP)',
        'Strict Bedrest',
    ];

    public function options(): array
    {
        return [
            'trajectories' => self::TRAJECTORIES,
            'diet_options' => self::DIET_OPTIONS,
            'activity_options' => self::ACTIVITY_OPTIONS,
        ];
    }

    public function listByAdmission(int $admissionId): array
    {
        $db = Database::connection();
        $sql = "SELECT r.*,
                       a.admission_number, a.patient_name, a.patient_mrn, a.patient_age, a.gender,
                       a.admitting_diagnosis, a.expected_discharge_date,
                       w.ward_name, b.bed_number
                FROM inpatient_daily_rounds r
                JOIN inpatient_admissions a ON a.id = r.admission_id
                LEFT JOIN hospital_wards w ON w.id = a.ward_id
                LEFT JOIN hospital_beds b ON b.id = a.bed_id
                WHERE r.admission_id = :admission_id AND r.deleted_at IS NULL
                ORDER BY r.round_datetime DESC, r.id DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute(['admission_id' => $admissionId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function get(int $id): ?array
    {
        $db = Database::connection();
        $sql = "SELECT r.*,
                       a.admission_number, a.patient_name, a.patient_mrn, a.patient_age, a.gender,
                       a.admitting_diagnosis, a.expected_discharge_date,
                       w.ward_name, b.bed_number
                FROM inpatient_daily_rounds r
                JOIN inpatient_admissions a ON a.id = r.admission_id
                LEFT JOIN hospital_wards w ON w.id = a.ward_id
                LEFT JOIN hospital_beds b ON b.id = a.bed_id
                WHERE r.id = :id AND r.deleted_at IS NULL
                LIMIT 1";

        $stmt = $db->prepare($sql);
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    public function store(array $data, ?int $userId, array $actor = []): array
    {
        $admissionId = (int) ($data['admission_id'] ?? 0);
        if ($admissionId <= 0) {
            throw new Exception('Admission ID is required.');
        }

        $admission = (new InpatientAdmission())->where('id', $admissionId)->first();
        if (!$admission) {
            throw new Exception('Inpatient admission record not found.');
        }

        $patientId = (int) ($admission['patient_id'] ?? ($data['patient_id'] ?? 0));
        if ($patientId <= 0) {
            $patientId = $admissionId;
        }

        $assessment = trim((string) ($data['assessment'] ?? ''));
        $plan = trim((string) ($data['plan'] ?? ''));

        if ($assessment === '') {
            throw new Exception('Clinical Assessment is required for the daily ward round.');
        }
        if ($plan === '') {
            throw new Exception('Daily Treatment Plan is required for the daily ward round.');
        }

        $trajectory = $data['clinical_trajectory'] ?? 'Stable';
        if (!array_key_exists($trajectory, self::TRAJECTORIES)) {
            $trajectory = 'Stable';
        }

        $roundDateTime = !empty($data['round_datetime'])
            ? date('Y-m-d H:i:s', strtotime($data['round_datetime']))
            : date('Y-m-d H:i:s');

        // Resolve physician name
        $physicianName = trim((string) ($data['rounding_physician_name'] ?? ''));
        $physicianId = !empty($data['rounding_physician_id']) ? (int) $data['rounding_physician_id'] : null;

        if ($physicianName === '') {
            if (!empty($actor['first_name']) || !empty($actor['last_name'])) {
                $physicianName = 'Dr. ' . trim(($actor['first_name'] ?? '') . ' ' . ($actor['last_name'] ?? ''));
            } else {
                $physicianName = $admission['attending_physician'] ?: 'Attending Physician';
            }
        }
        if (!$physicianId && !empty($actor['id'])) {
            $physicianId = (int) $actor['id'];
        }

        $dietOrder = !empty($data['diet_order']) ? trim((string) $data['diet_order']) : 'Regular Diet';
        $activityOrder = !empty($data['activity_order']) ? trim((string) $data['activity_order']) : 'Ambulate as tolerated';
        $targetDischargeDate = !empty($data['target_discharge_date']) ? date('Y-m-d', strtotime($data['target_discharge_date'])) : null;

        $db = Database::connection();
        $roundNumber = $this->generateRoundNumber($db);

        $insertSql = "INSERT INTO inpatient_daily_rounds (
            round_number, admission_id, patient_id, round_datetime,
            rounding_physician_id, rounding_physician_name,
            clinical_trajectory, subjective, objective, assessment, plan,
            diet_order, activity_order, target_discharge_date,
            is_finalized, created_by, created_at
        ) VALUES (
            :round_number, :admission_id, :patient_id, :round_datetime,
            :physician_id, :physician_name,
            :trajectory, :subjective, :objective, :assessment, :plan,
            :diet, :activity, :target_discharge,
            1, :created_by, NOW()
        )";

        $stmt = $db->prepare($insertSql);
        $stmt->execute([
            'round_number' => $roundNumber,
            'admission_id' => $admissionId,
            'patient_id' => $patientId,
            'round_datetime' => $roundDateTime,
            'physician_id' => $physicianId,
            'physician_name' => $physicianName,
            'trajectory' => $trajectory,
            'subjective' => !empty($data['subjective']) ? trim((string) $data['subjective']) : null,
            'objective' => !empty($data['objective']) ? trim((string) $data['objective']) : null,
            'assessment' => $assessment,
            'plan' => $plan,
            'diet' => $dietOrder,
            'activity' => $activityOrder,
            'target_discharge' => $targetDischargeDate,
            'created_by' => $userId,
        ]);

        $roundId = (int) $db->lastInsertId();

        // If target discharge date is specified, update admission expected discharge date
        if ($targetDischargeDate) {
            try {
                $db->prepare("UPDATE inpatient_admissions SET expected_discharge_date = :tdd WHERE id = :id")
                   ->execute(['tdd' => $targetDischargeDate, 'id' => $admissionId]);
            } catch (Throwable $e) {}
        }

        return [
            'id' => $roundId,
            'round_number' => $roundNumber,
            'admission_id' => $admissionId,
            'clinical_trajectory' => $trajectory,
            'round_datetime' => $roundDateTime
        ];
    }

    public function update(int $id, array $data, ?int $userId): bool
    {
        $existing = $this->get($id);
        if (!$existing) {
            throw new Exception('Ward round record not found.');
        }

        $assessment = trim((string) ($data['assessment'] ?? $existing['assessment']));
        $plan = trim((string) ($data['plan'] ?? $existing['plan']));

        if ($assessment === '') {
            throw new Exception('Clinical Assessment is required.');
        }
        if ($plan === '') {
            throw new Exception('Daily Treatment Plan is required.');
        }

        $trajectory = $data['clinical_trajectory'] ?? $existing['clinical_trajectory'];
        if (!array_key_exists($trajectory, self::TRAJECTORIES)) {
            $trajectory = $existing['clinical_trajectory'];
        }

        $dietOrder = !empty($data['diet_order']) ? trim((string) $data['diet_order']) : $existing['diet_order'];
        $activityOrder = !empty($data['activity_order']) ? trim((string) $data['activity_order']) : $existing['activity_order'];
        $targetDischargeDate = !empty($data['target_discharge_date'])
            ? date('Y-m-d', strtotime($data['target_discharge_date']))
            : $existing['target_discharge_date'];

        $roundDateTime = !empty($data['round_datetime'])
            ? date('Y-m-d H:i:s', strtotime($data['round_datetime']))
            : $existing['round_datetime'];

        $db = Database::connection();
        $updateSql = "UPDATE inpatient_daily_rounds SET
            round_datetime = :round_datetime,
            clinical_trajectory = :trajectory,
            subjective = :subjective,
            objective = :objective,
            assessment = :assessment,
            plan = :plan,
            diet_order = :diet,
            activity_order = :activity,
            target_discharge_date = :target_discharge,
            updated_by = :updated_by,
            updated_at = NOW()
            WHERE id = :id";

        $stmt = $db->prepare($updateSql);
        $stmt->execute([
            'round_datetime' => $roundDateTime,
            'trajectory' => $trajectory,
            'subjective' => isset($data['subjective']) ? trim((string) $data['subjective']) : $existing['subjective'],
            'objective' => isset($data['objective']) ? trim((string) $data['objective']) : $existing['objective'],
            'assessment' => $assessment,
            'plan' => $plan,
            'diet' => $dietOrder,
            'activity' => $activityOrder,
            'target_discharge' => $targetDischargeDate,
            'updated_by' => $userId,
            'id' => $id,
        ]);

        if ($targetDischargeDate) {
            try {
                $db->prepare("UPDATE inpatient_admissions SET expected_discharge_date = :tdd WHERE id = :id")
                   ->execute(['tdd' => $targetDischargeDate, 'id' => $existing['admission_id']]);
            } catch (Throwable $e) {}
        }

        return true;
    }

    public function delete(int $id, ?int $userId): bool
    {
        $existing = $this->get($id);
        if (!$existing) {
            throw new Exception('Ward round record not found.');
        }

        $db = Database::connection();
        $stmt = $db->prepare("UPDATE inpatient_daily_rounds SET deleted_at = NOW(), updated_by = :u WHERE id = :id");
        return $stmt->execute(['u' => $userId, 'id' => $id]);
    }

    private function generateRoundNumber(PDO $db): string
    {
        $prefix = 'RND-' . date('ymd') . '-';
        $stmt = $db->prepare("SELECT COUNT(*) FROM inpatient_daily_rounds WHERE round_number LIKE :p");
        $stmt->execute(['p' => $prefix . '%']);
        $seq = (int) $stmt->fetchColumn() + 1;
        return sprintf('%s%03d', $prefix, $seq);
    }
}
