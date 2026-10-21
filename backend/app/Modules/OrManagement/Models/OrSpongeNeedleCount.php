<?php
declare(strict_types=1);

namespace App\Modules\OrManagement\Models;

/**
 * OrSpongeNeedleCount Model
 *
 * Represents a Surgical Sponge, Sharps, Needle & Instrument Count Reconciliation
 * sheet (`or_sponge_needle_counts`) with dual Scrub Nurse + Circulating Nurse
 * sign-offs across Initial, Cavity Closure, and Final Skin Closure counts.
 */
final class OrSpongeNeedleCount
{
    public const ITEM_CATEGORIES = [
        'lap_sponges'    => 'Laparotomy Sponges / Packs (Radiopaque)',
        'raytec_sponges' => 'Raytec / 4x4 Radiopaque Gauze Sponges',
        'suture_needles' => 'Suture Needles (Atraumatic & Free)',
        'blades_sharps'  => 'Scalpel Blades, Hypodermic Needles & Bovie Tips',
        'instruments'    => 'Surgical Instruments (Clamps, Forceps, Retractors)',
    ];

    /**
     * Evaluates itemized counts across all 5 categories and checks dual-nurse signatures.
     *
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public static function evaluateReconciliation(array $data): array
    {
        $categories = [];
        $hasClosureDiscrepancy = false;
        $hasFinalDiscrepancy   = false;
        $totalExpectedItems    = 0;
        $totalFinalCounted     = 0;

        foreach (self::ITEM_CATEGORIES as $key => $label) {
            $initial = max(0, (int) ($data["{$key}_initial"] ?? 0));
            $added   = max(0, (int) ($data["{$key}_added"] ?? 0));
            $closure = max(0, (int) ($data["{$key}_closure_counted"] ?? ($initial + $added)));
            $final   = max(0, (int) ($data["{$key}_final_counted"] ?? ($initial + $added)));

            $expected        = $initial + $added;
            $closureVariance = $closure - $expected;
            $finalVariance   = $final - $expected;

            if ($closureVariance !== 0) {
                $hasClosureDiscrepancy = true;
            }
            if ($finalVariance !== 0) {
                $hasFinalDiscrepancy = true;
            }

            $totalExpectedItems += $expected;
            $totalFinalCounted  += $final;

            $categories[$key] = [
                'key'              => $key,
                'label'            => $label,
                'initial'          => $initial,
                'added'            => $added,
                'expected_total'   => $expected,
                'closure_counted'  => $closure,
                'closure_variance' => $closureVariance,
                'closure_matched'  => $closureVariance === 0,
                'final_counted'    => $final,
                'final_variance'   => $finalVariance,
                'final_matched'    => $finalVariance === 0,
            ];
        }

        $initialDualSigned = trim((string) ($data['initial_scrub_signature'] ?? '')) !== ''
            && trim((string) ($data['initial_circulating_signature'] ?? '')) !== '';
        $closureDualSigned = trim((string) ($data['closure_scrub_signature'] ?? '')) !== ''
            && trim((string) ($data['closure_circulating_signature'] ?? '')) !== '';
        $finalDualSigned   = trim((string) ($data['final_scrub_signature'] ?? '')) !== ''
            && trim((string) ($data['final_circulating_signature'] ?? '')) !== '';

        $allDualSigned  = $initialDualSigned && $closureDualSigned && $finalDualSigned;
        $hasDiscrepancy = $hasClosureDiscrepancy || $hasFinalDiscrepancy;

        if ($hasDiscrepancy) {
            $xrayOrdered = !empty($data['intraop_xray_ordered']);
            $surgeonAck  = trim((string) ($data['attending_surgeon_acknowledgment'] ?? '')) !== '';
            $overallStatus = ($xrayOrdered && $surgeonAck)
                ? 'Resolved with Attending Surgeon Sign-Off'
                : 'Count Discrepancy — X-Ray Protocol Active';
        } elseif ($allDualSigned) {
            $overallStatus = 'All Counts Correct & Dual-Signed';
        } else {
            $overallStatus = 'In Progress';
        }

        return [
            'categories'              => $categories,
            'total_expected_items'    => $totalExpectedItems,
            'total_final_counted'     => $totalFinalCounted,
            'has_closure_discrepancy' => $hasClosureDiscrepancy,
            'has_final_discrepancy'   => $hasFinalDiscrepancy,
            'has_discrepancy'         => $hasDiscrepancy ? 1 : 0,
            'initial_dual_signed'     => $initialDualSigned,
            'closure_dual_signed'     => $closureDualSigned,
            'final_dual_signed'       => $finalDualSigned,
            'all_phases_dual_signed'  => $allDualSigned,
            'computed_overall_status' => $overallStatus,
        ];
    }

    /**
     * Formats a database row into an enriched response payload.
     *
     * @param array<string, mixed> $row
     * @return array<string, mixed>
     */
    public static function formatRecord(array $row): array
    {
        $eval = self::evaluateReconciliation($row);
        $customJson = $row['custom_items_json'] ?? null;

        return array_merge($row, [
            'id'                        => (int) ($row['id'] ?? 0),
            'surgical_case_id'          => (int) ($row['surgical_case_id'] ?? 0),
            'patient_id'                => isset($row['patient_id']) ? (int) $row['patient_id'] : null,
            'has_discrepancy'           => $eval['has_discrepancy'],
            'surgeon_notified_of_count' => (int) ($row['surgeon_notified_of_count'] ?? 1),
            'intraop_xray_ordered'      => (int) ($row['intraop_xray_ordered'] ?? 0),
            'evaluation'                => $eval,
            'custom_items'              => is_string($customJson) && $customJson !== '' ? (json_decode($customJson, true) ?: []) : [],
        ]);
    }
}
