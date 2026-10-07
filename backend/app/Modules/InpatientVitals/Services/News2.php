<?php

namespace App\Modules\InpatientVitals\Services;

/**
 * NEWS2 (National Early Warning Score 2, Royal College of Physicians 2017).
 *
 * Seven parameters, each scored 0-3: respiration rate, SpO2 (scale 1, or scale 2 for
 * patients with a prescribed 88-92% target, e.g. hypercapnic respiratory failure),
 * air or oxygen, systolic BP, pulse, consciousness (ACVPU) and temperature.
 *
 * Risk: 0-4 low; a 3 in any single parameter low-medium; 5-6 medium; 7+ high.
 * A set missing parameters gets a partial score (it can only go up when the rest is
 * measured), marked incomplete.
 */
class News2
{
    public const PARAMETERS = [
        'resp_rate' => 'Respiration rate', 'spo2' => 'SpO₂', 'oxygen' => 'Air or oxygen', 'bp_systolic' => 'Systolic BP',
        'heart_rate' => 'Pulse', 'consciousness' => 'Consciousness', 'temperature_c' => 'Temperature',
    ];

    public const RISK_LABELS = ['low' => 'Low', 'low_medium' => 'Low-medium', 'medium' => 'Medium', 'high' => 'High'];

    /** What the score asks for (RCP clinical response), shown with alerts. */
    public const RESPONSE = [
        'low' => 'Continue routine monitoring; the registered nurse decides whether more frequent monitoring or escalation is needed.',
        'low_medium' => 'Urgent ward-based response: the registered nurse informs the medical team, who decide on review and escalation. Monitor at least hourly.',
        'medium' => 'Key threshold for urgent response: urgent review by a clinician competent in assessing acutely ill patients. Monitor at least hourly.',
        'high' => 'Emergency response: emergency assessment by a team with critical-care competencies; consider transfer to a higher level of care. Continuous monitoring.',
    ];

    /** Minimum monitoring, in hours between sets (continuous = 1 here). */
    public const MIN_HOURS = ['zero' => 12, 'low' => 4, 'low_medium' => 1, 'medium' => 1, 'high' => 1];

    /**
     * @param array $v  bp_systolic, heart_rate, resp_rate, temperature_c, spo2, on_oxygen (bool|null), consciousness
     * @return array{score:int, risk:string, complete:bool, missing:string[], parts:array<string,int>, red:bool, min_hours:int, scale:int}
     */
    public static function score(array $v, int $scale = 1): array
    {
        $parts = [];
        $missing = [];
        $rr = $v['resp_rate'] ?? null;
        $rr === null ? $missing[] = 'resp_rate' : $parts['resp_rate'] = $rr <= 8 ? 3 : ($rr <= 11 ? 1 : ($rr <= 20 ? 0 : ($rr <= 24 ? 2 : 3)));

        $o2 = $v['on_oxygen'] ?? null;
        $o2 === null ? $missing[] = 'oxygen' : $parts['oxygen'] = $o2 ? 2 : 0;

        $s = $v['spo2'] ?? null;
        if ($s === null) {
            $missing[] = 'spo2';
        } elseif ($scale === 2) {
            // Scale 2: 88-92 is the target; above 92 only scores when on oxygen.
            if ($s <= 83) {
                $parts['spo2'] = 3;
            } elseif ($s <= 85) {
                $parts['spo2'] = 2;
            } elseif ($s <= 87) {
                $parts['spo2'] = 1;
            } elseif ($s <= 92 || !$o2) {
                $parts['spo2'] = 0;
            } else {
                $parts['spo2'] = $s <= 94 ? 1 : ($s <= 96 ? 2 : 3);
            }
        } else {
            $parts['spo2'] = $s <= 91 ? 3 : ($s <= 93 ? 2 : ($s <= 95 ? 1 : 0));
        }

        $sbp = $v['bp_systolic'] ?? null;
        $sbp === null ? $missing[] = 'bp_systolic' : $parts['bp_systolic'] = $sbp <= 90 ? 3 : ($sbp <= 100 ? 2 : ($sbp <= 110 ? 1 : ($sbp <= 219 ? 0 : 3)));

        $hr = $v['heart_rate'] ?? null;
        $hr === null ? $missing[] = 'heart_rate' : $parts['heart_rate'] = $hr <= 40 ? 3 : ($hr <= 50 ? 1 : ($hr <= 90 ? 0 : ($hr <= 110 ? 1 : ($hr <= 130 ? 2 : 3))));

        $c = $v['consciousness'] ?? null;
        $c === null || $c === '' ? $missing[] = 'consciousness' : $parts['consciousness'] = $c === 'Alert' ? 0 : 3;

        $t = $v['temperature_c'] ?? null;
        $t === null ? $missing[] = 'temperature_c' : $parts['temperature_c'] = $t <= 35.0 ? 3 : ($t <= 36.0 ? 1 : ($t <= 38.0 ? 0 : ($t <= 39.0 ? 1 : 2)));

        $score = array_sum($parts);
        $red = in_array(3, $parts, true);
        $risk = $score >= 7 ? 'high' : ($score >= 5 ? 'medium' : ($red ? 'low_medium' : 'low'));
        return [
            'score' => $score, 'risk' => $risk, 'complete' => !$missing, 'missing' => $missing, 'parts' => $parts,
            'red' => $red, 'min_hours' => self::MIN_HOURS[$score === 0 && !$missing ? 'zero' : $risk], 'scale' => $scale,
        ];
    }

    /** Alert level: none, urgent (single 3 or 5-6) or critical (7+). Ordered so a higher number is worse. */
    public static function level(?array $n): int
    {
        if (!$n) {
            return 0;
        }
        return $n['risk'] === 'high' ? 3 : ($n['risk'] === 'medium' ? 2 : ($n['risk'] === 'low_medium' ? 1 : 0));
    }

    /** "RR 26 (3) · SpO₂ 90 (3) · on oxygen (2)" -- the parameters that scored. */
    public static function describe(array $n, array $v): string
    {
        $show = [
            'resp_rate' => fn() => "RR {$v['resp_rate']}", 'spo2' => fn() => "SpO₂ {$v['spo2']}%",
            'oxygen' => fn() => 'on oxygen', 'bp_systolic' => fn() => "SBP {$v['bp_systolic']}",
            'heart_rate' => fn() => "pulse {$v['heart_rate']}", 'consciousness' => fn() => (string) $v['consciousness'],
            'temperature_c' => fn() => "temp {$v['temperature_c']}°C",
        ];
        $bits = [];
        foreach ($n['parts'] as $k => $p) {
            if ($p > 0) {
                $bits[] = $show[$k]() . " ({$p})";
            }
        }
        return $bits ? implode(' · ', $bits) : 'all parameters normal';
    }
}
