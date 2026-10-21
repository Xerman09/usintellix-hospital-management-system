<?php
declare(strict_types=1);

namespace App\Modules\Dispensing\Models;

/**
 * PrescriptionVerification Model
 *
 * Represents a Clinical Pharmacist Verification record (`prescription_verifications`)
 * for an outpatient e-prescription prior to product picking and dispensing.
 */
final class PrescriptionVerification
{
    public const VERIFICATION_STATUSES = [
        'Pending Review'          => 'Pending Pharmacist Clinical Review',
        'Approved'                => 'Approved for Physical Dispensing',
        'Intervention Needed'     => 'Clinical Intervention Needed (Hold Picking)',
        'Clarification Requested' => 'Prescriber Clarification Requested (Hold Picking)',
        'Rejected'                => 'Rejected — Clinically Unsafe / Contraindicated',
    ];

    public const RENAL_STATUSES = [
        'Normal Renal Function — No Adjustment Needed',
        'Renal Dose Adjustment Verified',
        'Renal Dose Reduction Required',
        'Contraindicated in Renal Impairment',
    ];

    public const WEIGHT_STATUSES = [
        'Appropriate for Weight / Age',
        'Weight-Based Dose Verified (mg/kg)',
        'Dose Too High for Weight (Overdose Risk)',
        'Subtherapeutic Dose for Weight',
    ];

    /**
     * Formats a database row into an enriched API payload.
     *
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function formatRecord(array $row): array
    {
        $status = (string) ($row['verification_status'] ?? 'Pending Review');
        $isApproved = $status === 'Approved';
        $isBlocked  = in_array($status, ['Intervention Needed', 'Clarification Requested', 'Rejected'], true);

        return array_merge($row, [
            'id'                             => (int) ($row['id'] ?? 0),
            'prescription_id'                => (int) ($row['prescription_id'] ?? 0),
            'patient_id'                     => isset($row['patient_id']) ? (int) $row['patient_id'] : null,
            'verification_status'            => $status,
            'verification_status_label'      => self::VERIFICATION_STATUSES[$status] ?? $status,
            'is_approved'                    => $isApproved,
            'is_dispensing_blocked'          => $isBlocked,
            'egfr_crcl_ml_min'               => isset($row['egfr_crcl_ml_min']) ? (float) $row['egfr_crcl_ml_min'] : null,
            'patient_weight_kg'              => isset($row['patient_weight_kg']) ? (float) $row['patient_weight_kg'] : null,
            'indication_verified'            => (int) ($row['indication_verified'] ?? 1),
            'allergy_cross_check_passed'     => (int) ($row['allergy_cross_check_passed'] ?? 1),
            'drug_interaction_check_passed'  => (int) ($row['drug_interaction_check_passed'] ?? 1),
            'duplicate_therapy_check_passed' => (int) ($row['duplicate_therapy_check_passed'] ?? 1),
            'prescriber_contacted'           => (int) ($row['prescriber_contacted'] ?? 0),
        ]);
    }
}
