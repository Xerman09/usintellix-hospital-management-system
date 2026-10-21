<?php
declare(strict_types=1);

namespace App\Modules\OrManagement\Models;

/**
 * OrAnesthesiaRecord Model
 *
 * Represents a structured Electronic Anesthesia Record (`or_anesthesia_records`)
 * capturing ASA physical status (I–VI + Emergency E), Mallampati airway class (I–IV),
 * anesthesia modality, induction/maintenance/reversal pharmacology, intraoperative
 * fluid balance & estimated blood loss (EBL), and PACU Aldrete recovery scoring (0–10).
 */
final class OrAnesthesiaRecord
{
    public const ASA_CLASSES = [
        'ASA I'   => 'Normal healthy patient',
        'ASA II'  => 'Patient with mild systemic disease',
        'ASA III' => 'Patient with severe systemic disease (substantive functional limitations)',
        'ASA IV'  => 'Patient with severe systemic disease that is a constant threat to life',
        'ASA V'   => 'Moribund patient not expected to survive without the operation',
        'ASA VI'  => 'Declared brain-dead patient whose organs are being removed for donor purposes',
    ];

    public const MALLAMPATI_CLASSES = [
        'Class I'   => 'Soft palate, uvula, fauces, pillars fully visible',
        'Class II'  => 'Soft palate, major part of uvula, fauces visible',
        'Class III' => 'Soft palate and base of uvula visible only',
        'Class IV'  => 'Hard palate only visible (High risk of difficult laryngoscopy)',
    ];

    public const ANESTHESIA_TYPES = [
        'General',
        'Spinal',
        'Epidural',
        'Combined Spinal-Epidural (CSE)',
        'MAC',
        'Regional Nerve Block',
        'Local',
    ];

    /**
     * Computes the total Aldrete Post-Anesthesia Recovery Score (0–10)
     * from the 5 clinical domains (Activity, Respiration, Circulation, Consciousness, Oxygenation).
     *
     * @param array<string, mixed> $data
     * @return array{
     *   aldrete_activity: int,
     *   aldrete_respiration: int,
     *   aldrete_circulation: int,
     *   aldrete_consciousness: int,
     *   aldrete_oxygenation: int,
     *   aldrete_total_score: int,
     *   pacu_discharge_ready: int,
     *   interpretation: string
     * }
     */
    public static function computeAldreteScore(array $data): array
    {
        $clamp = static fn($val): int => max(0, min(2, (int) ($val ?? 2)));

        $activity      = $clamp($data['aldrete_activity'] ?? 2);
        $respiration   = $clamp($data['aldrete_respiration'] ?? 2);
        $circulation   = $clamp($data['aldrete_circulation'] ?? 2);
        $consciousness = $clamp($data['aldrete_consciousness'] ?? 2);
        $oxygenation   = $clamp($data['aldrete_oxygenation'] ?? 2);

        $total = $activity + $respiration + $circulation + $consciousness + $oxygenation;
        $ready = ($total >= 9) ? 1 : 0;

        if ($total >= 9) {
            $interpretation = 'Ready for PACU Discharge to Ward/Home (Aldrete >= 9/10)';
        } elseif ($total >= 7) {
            $interpretation = 'Continued PACU Observation Required (Aldrete 7–8/10)';
        } else {
            $interpretation = 'Critical Post-Anesthesia Monitoring Required (Aldrete <= 6/10)';
        }

        return [
            'aldrete_activity'      => $activity,
            'aldrete_respiration'   => $respiration,
            'aldrete_circulation'   => $circulation,
            'aldrete_consciousness' => $consciousness,
            'aldrete_oxygenation'   => $oxygenation,
            'aldrete_total_score'   => $total,
            'pacu_discharge_ready'  => $ready,
            'interpretation'        => $interpretation,
        ];
    }

    /**
     * Formats a Database Row for API consumption.
     *
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function formatRecord(array $row): array
    {
        $asa = (string) ($row['asa_status'] ?? 'ASA II');
        $isEmergency = ((int) ($row['asa_emergency_modifier'] ?? 0)) === 1;
        $asaDisplay = $asa . ($isEmergency ? '-E' : '');

        $aldrete = self::computeAldreteScore($row);

        $crystalloids = (int) ($row['crystalloids_ml'] ?? 0);
        $colloids     = (int) ($row['colloids_ml'] ?? 0);
        $bloodIn      = (int) ($row['blood_products_ml'] ?? 0);
        $ebl          = (int) ($row['estimated_blood_loss_ml'] ?? 0);
        $urine        = (int) ($row['urine_output_ml'] ?? 0);

        $totalIn  = $crystalloids + $colloids + $bloodIn;
        $totalOut = $ebl + $urine;
        $netFluid = $totalIn - $totalOut;

        $medsJson = $row['intraop_medications_json'] ?? null;
        $vitalsJson = $row['intraop_vitals_json'] ?? null;

        return array_merge($row, [
            'id'                           => (int) ($row['id'] ?? 0),
            'surgical_case_id'             => (int) ($row['surgical_case_id'] ?? 0),
            'patient_id'                   => isset($row['patient_id']) ? (int) $row['patient_id'] : null,
            'asa_emergency_modifier'       => $isEmergency ? 1 : 0,
            'asa_display'                  => $asaDisplay,
            'asa_description'              => self::ASA_CLASSES[$asa] ?? '',
            'mallampati_description'       => self::MALLAMPATI_CLASSES[$row['mallampati_class'] ?? 'Class I'] ?? '',
            'difficult_airway_anticipated' => (int) ($row['difficult_airway_anticipated'] ?? 0),
            'intubation_attempts'          => (int) ($row['intubation_attempts'] ?? 1),
            'estimated_blood_loss_ml'      => $ebl,
            'urine_output_ml'              => $urine,
            'crystalloids_ml'              => $crystalloids,
            'colloids_ml'                  => $colloids,
            'blood_products_ml'            => $bloodIn,
            'total_fluid_intake_ml'        => $totalIn,
            'total_fluid_output_ml'        => $totalOut,
            'net_fluid_balance_ml'         => $netFluid,
            'aldrete_activity'             => $aldrete['aldrete_activity'],
            'aldrete_respiration'          => $aldrete['aldrete_respiration'],
            'aldrete_circulation'          => $aldrete['aldrete_circulation'],
            'aldrete_consciousness'        => $aldrete['aldrete_consciousness'],
            'aldrete_oxygenation'          => $aldrete['aldrete_oxygenation'],
            'aldrete_total_score'          => $aldrete['aldrete_total_score'],
            'pacu_discharge_ready'         => $aldrete['pacu_discharge_ready'],
            'aldrete_interpretation'       => $aldrete['interpretation'],
            'intraop_medications'          => is_string($medsJson) && $medsJson !== '' ? (json_decode($medsJson, true) ?: []) : [],
            'intraop_vitals'               => is_string($vitalsJson) && $vitalsJson !== '' ? (json_decode($vitalsJson, true) ?: []) : [],
        ]);
    }
}
