<?php

namespace App\Modules\EncounterVitals\Services;

use App\Core\Database;
use App\Modules\EncounterSections\Services\EncounterSectionService;
use App\Modules\EncounterVitals\Models\EncounterVital;
use PDO;

class EncounterVitalService
{
    private const NUMERIC_FIELDS = [
        'weight', 'height', 'bp_systolic', 'bp_diastolic', 'pulse', 'respiration', 'temperature',
        'oxygen_saturation', 'oxygen_flow_rate', 'inhaled_oxygen_concentration',
        'head_circumference', 'waist_circumference'
    ];

    private const TEXT_FIELDS = [
        'weight_abn', 'height_abn', 'bp_systolic_abn', 'bp_diastolic_abn', 'pulse_abn', 'respiration_abn',
        'temperature_abn', 'temp_location', 'oxygen_saturation_abn', 'oxygen_flow_rate_abn',
        'inhaled_oxygen_concentration_abn', 'head_circumference_abn', 'waist_circumference_abn', 'other_notes'
    ];

    private EncounterSectionService $encounterSectionService;

    public function __construct()
    {
        $this->encounterSectionService = new EncounterSectionService();
    }

    public function find(int $encounterId): ?array
    {
        return (new EncounterVital())->where('encounter_id', $encounterId)->first();
    }

    /**
     * Every vitals row recorded across all of a patient's encounters,
     * most recent first -- backs the "Vitals" dashboard widget's history
     * view (cross-encounter), as opposed to find() which is scoped to
     * one encounter.
     */
    public function listForPatient(int $patientId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT ev.*, e.date_of_service
             FROM encounter_vitals ev
             JOIN encounters e ON e.id = ev.encounter_id
             WHERE e.patient_id = :patient_id AND e.deleted_at IS NULL
             ORDER BY e.date_of_service DESC, ev.id DESC"
        );
        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Upsert an encounter's vitals, computing BMI/BMI status server-side
     * from height(in)/weight(lbs). Rejected once the 'vitals' section is
     * locked.
     */
    public function save(int $encounterId, array $data, int $userId): array
    {
        if ($this->encounterSectionService->isLocked($encounterId, 'vitals')) {
            return [
                'success' => false,
                'message' => 'Vitals are locked. Sign the section again to record further changes.'
            ];
        }

        $values = [];

        foreach (self::NUMERIC_FIELDS as $field) {
            $raw = $data[$field] ?? null;
            $values[$field] = ($raw === '' || $raw === null) ? null : (float) $raw;
        }

        foreach (self::TEXT_FIELDS as $field) {
            $raw = $data[$field] ?? null;
            $values[$field] = ($raw === '' || $raw === null) ? null : $raw;
        }

        [$bmi, $bmiStatus] = $this->computeBmi($values['height'], $values['weight']);

        $values['bmi'] = $bmi;
        $values['bmi_status'] = $bmiStatus;

        $existing = $this->find($encounterId);

        if ($existing) {
            $values['updated_at'] = date('Y-m-d H:i:s');
            $values['updated_by'] = $userId;

            (new EncounterVital())->update($values, (int) $existing['id']);
        } else {
            $values['encounter_id'] = $encounterId;
            $values['created_at'] = date('Y-m-d H:i:s');
            $values['created_by'] = $userId;

            (new EncounterVital())->create($values);
        }

        return [
            'success' => true,
            'message' => 'Vitals saved successfully.',
            'data' => $this->find($encounterId)
        ];
    }

    /**
     * BMI = 703 * weight(lbs) / height(in)^2, categorized into the
     * standard WHO bands. Either input missing means BMI can't be
     * computed.
     */
    private function computeBmi(?float $heightIn, ?float $weightLbs): array
    {
        if (!$heightIn || !$weightLbs) {
            return [null, null];
        }

        $bmi = round((703 * $weightLbs) / ($heightIn * $heightIn), 1);

        $status = match (true) {
            $bmi < 18.5 => 'Underweight',
            $bmi < 25 => 'Normal',
            $bmi < 30 => 'Overweight',
            $bmi < 35 => 'Obesity I',
            $bmi < 40 => 'Obesity II',
            default => 'Obesity III'
        };

        return [$bmi, $status];
    }
}
