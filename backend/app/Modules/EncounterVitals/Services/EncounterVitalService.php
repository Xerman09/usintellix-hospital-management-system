<?php

namespace App\Modules\EncounterVitals\Services;

use App\Modules\EncounterSections\Services\EncounterSectionService;
use App\Modules\EncounterVitals\Models\EncounterVital;

class EncounterVitalService
{
    private const DETAIL_FIELDS = [
        'height_cm', 'weight_kg', 'oxygen_saturation', 'oxygen_flow_rate', 'inhaled_oxygen_concentration'
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
     * Upsert an encounter's vitals, computing BMI/BMI status server-side.
     * Rejected once the 'vitals' section is locked.
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

        foreach (self::DETAIL_FIELDS as $field) {
            $raw = $data[$field] ?? null;
            $values[$field] = ($raw === '' || $raw === null) ? null : (float) $raw;
        }

        [$bmi, $bmiStatus] = $this->computeBmi($values['height_cm'], $values['weight_kg']);

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
     * BMI = weight(kg) / height(m)^2, categorized into the standard WHO
     * bands. Either input missing means BMI can't be computed.
     */
    private function computeBmi(?float $heightCm, ?float $weightKg): array
    {
        if (!$heightCm || !$weightKg) {
            return [null, null];
        }

        $heightM = $heightCm / 100;
        $bmi = round($weightKg / ($heightM * $heightM), 1);

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
