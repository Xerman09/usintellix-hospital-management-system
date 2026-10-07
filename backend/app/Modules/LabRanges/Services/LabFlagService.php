<?php

namespace App\Modules\LabRanges\Services;

use App\Core\Database;
use PDO;

/**
 * Flags a lab result Normal / Abnormal / Critical (Critical lab values, Phase 1).
 *
 *   1. The result is matched to a range set up by the admin (lab_result_ranges) by its code,
 *      else its name or an alias (case-insensitive). When a test has ranges in more than one
 *      unit (e.g. glucose in mg/dL and mmol/L), the one in the result's units is used.
 *   2. Critical: a number below critical_low / above critical_high, or a text result that
 *      is one of the critical values ("positive", "detected"...). Only when the units match
 *      the range's (or either has none) -- a value is never compared across units.
 *   3. Otherwise abnormal when outside the normal range: the range's, else the result's own
 *      reference range ("3.5-5.1", "<200", ">60"); a text result that isn't a normal value.
 *   4. Otherwise normal. A result ticked abnormal by hand stays abnormal; a critical one can't
 *      be marked down. No value, or nothing to compare against: not flagged (null), unless
 *      ticked abnormal.
 */
class LabFlagService
{
    private ?array $ranges = null;

    /**
     * row: code?, name, value?, units?, reference_range?, is_abnormal?
     * @return array ['flag' => normal|abnormal|critical|null, 'detail' => ?string, 'range_id' => ?int, 'is_abnormal' => 0|1]
     */
    public function flag(array $row): array
    {
        $value = trim((string) ($row['value'] ?? ''));
        $manual = !empty($row['is_abnormal']);
        $out = fn(?string $flag, ?string $detail, ?int $rangeId = null) => [
            'flag' => $flag, 'detail' => $detail !== null ? mb_substr($detail, 0, 150) : null, 'range_id' => $rangeId,
            'is_abnormal' => in_array($flag, ['abnormal', 'critical'], true) ? 1 : 0,
        ];
        if ($value === '') {
            return $out($manual ? 'abnormal' : null, $manual ? 'Marked abnormal' : null);
        }
        $m = $this->match($row['code'] ?? null, (string) ($row['name'] ?? ''), $row['units'] ?? null);
        $range = $m['range'] ?? null;
        $usable = $range && $m['units_ok'];
        $rid = $range ? (int) $range['id'] : null;
        $unitNote = $usable && !empty($m['assumed']) ? " (units taken as {$range['units']})" : '';
        [$op, $num] = self::number($value);

        // ---- critical
        if ($usable) {
            if ($num !== null) {
                $cl = $range['critical_low'] !== null ? (float) $range['critical_low'] : null;
                $ch = $range['critical_high'] !== null ? (float) $range['critical_high'] : null;
                // "<2.0" is below 2.0: critical when 2.0 <= the limit.
                if ($cl !== null && ($num < $cl || ($op === '<' && $num <= $cl))) {
                    return $out('critical', 'Critical low (below ' . self::fmt($cl) . ')' . $unitNote, $rid);
                }
                if ($ch !== null && ($num > $ch || ($op === '>' && $num >= $ch))) {
                    return $out('critical', 'Critical high (above ' . self::fmt($ch) . ')' . $unitNote, $rid);
                }
            } else {
                $text = self::norm($value);
                $normals = self::list($range['normal_values']);
                if (!in_array($text, $normals, true)) {
                    foreach (self::list($range['critical_values']) as $c) {
                        if ($c !== '' && preg_match('/(^|\W)' . preg_quote($c, '/') . '(\W|$)/u', $text) && !self::negated($text, $c)) {
                            return $out('critical', "Critical result ({$value})", $rid);
                        }
                    }
                }
            }
        }

        // ---- abnormal / normal
        if ($num !== null) {
            $low = $usable && $range['normal_low'] !== null ? (float) $range['normal_low'] : null;
            $high = $usable && $range['normal_high'] !== null ? (float) $range['normal_high'] : null;
            if ($low === null && $high === null) {
                [$low, $high] = self::referenceRange((string) ($row['reference_range'] ?? ''));
            }
            if ($low !== null && $num < $low) {
                return $out('abnormal', 'Low (below ' . self::fmt($low) . ')', $rid);
            }
            if ($high !== null && $num > $high) {
                return $out('abnormal', 'High (above ' . self::fmt($high) . ')', $rid);
            }
            if ($low !== null || $high !== null) {
                return $manual ? $out('abnormal', 'Marked abnormal', $rid) : $out('normal', null, $rid);
            }
        } elseif ($usable && ($range['normal_values'] || $range['critical_values'])) {
            $text = self::norm($value);
            $normals = self::list($range['normal_values']);
            if ($normals && !in_array($text, $normals, true) && !array_filter($normals, fn($n) => $n !== '' && str_contains($text, $n))) {
                return $out('abnormal', "Not a normal result ({$value})", $rid);
            }
            return $manual ? $out('abnormal', 'Marked abnormal', $rid) : $out('normal', null, $rid);
        }
        return $manual ? $out('abnormal', 'Marked abnormal', $rid) : $out(null, null, $rid);
    }

    /**
     * The admin range for a result: by code, else name / alias; among several, the one in the
     * result's units. ['range' => row|null, 'units_ok' => bool, 'assumed' => bool]
     */
    public function match(?string $code, string $name, ?string $units): array
    {
        $ranges = $this->ranges();
        $code = trim((string) $code);
        $key = self::norm($name);
        $cands = [];
        if ($code !== '') {
            $cands = array_values(array_filter($ranges, fn($r) => $r['code'] !== null && strcasecmp(trim($r['code']), $code) === 0));
        }
        if (!$cands && $key !== '') {
            $cands = array_values(array_filter($ranges, fn($r) => self::norm($r['name']) === $key || in_array($key, self::list($r['aliases']), true)));
        }
        if (!$cands) {
            return ['range' => null, 'units_ok' => false];
        }
        $u = self::unit($units);
        if ($u !== '') {
            foreach ($cands as $r) {
                if (self::unit($r['units']) === $u) {
                    return ['range' => $r, 'units_ok' => true];
                }
            }
            foreach ($cands as $r) {
                if (self::unit($r['units']) === '') {
                    return ['range' => $r, 'units_ok' => true];
                }
            }
            return ['range' => $cands[0], 'units_ok' => false];   // other units: never compared
        }
        // No units on the result: only when the test has a single range.
        if (count($cands) === 1) {
            return ['range' => $cands[0], 'units_ok' => true, 'assumed' => self::unit($cands[0]['units']) !== ''];
        }
        $noUnit = array_values(array_filter($cands, fn($r) => self::unit($r['units']) === ''));
        return $noUnit ? ['range' => $noUnit[0], 'units_ok' => true] : ['range' => $cands[0], 'units_ok' => false];
    }

    public function ranges(): array
    {
        if ($this->ranges === null) {
            $this->ranges = Database::connection()->query("SELECT * FROM lab_result_ranges WHERE is_active = 1 ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
        }
        return $this->ranges;
    }

    // ------------------------------------------------------------------

    /** "6.8" -> ['', 6.8]; "<0.01" -> ['<', 0.01]; "> 500 H" -> ['>', 500]; "150,000" -> ['', 150000]; text -> ['', null] */
    public static function number(string $value): array
    {
        if (!preg_match('/^\s*(<=|>=|<|>|≤|≥)?\s*(-?\d+(?:[.,]\d+)*)\s*([a-zA-Z%\/^*\s]*)$/u', $value, $m)) {
            return ['', null];
        }
        $n = $m[2];
        if (preg_match('/^-?\d{1,3}(,\d{3})+(\.\d+)?$/', $n)) {
            $n = str_replace(',', '', $n);          // 150,000
        } else {
            $n = str_replace(',', '.', $n);         // 6,8
        }
        if (!is_numeric($n)) {
            return ['', null];
        }
        $op = in_array($m[1], ['<', '<=', '≤'], true) ? '<' : (in_array($m[1], ['>', '>=', '≥'], true) ? '>' : '');
        return [$op, (float) $n];
    }

    /** "3.5-5.1" / "3.5 to 5.1" -> [3.5, 5.1]; "<200" -> [null, 200]; ">60" -> [60, null]. */
    public static function referenceRange(string $text): array
    {
        $t = trim($text);
        if (preg_match('/^(-?\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(-?\d+(?:\.\d+)?)/u', $t, $m)) {
            return [(float) $m[1], (float) $m[2]];
        }
        if (preg_match('/^(?:<=|<|≤|up to|below)\s*(\d+(?:\.\d+)?)/iu', $t, $m)) {
            return [null, (float) $m[1]];
        }
        if (preg_match('/^(?:>=|>|≥|above)\s*(\d+(?:\.\d+)?)/iu', $t, $m)) {
            return [(float) $m[1], null];
        }
        return [null, null];
    }

    /** Units compared loosely: case, spaces, µ/u, and the usual ways of writing x10^9/L. */
    public static function unit(?string $u): string
    {
        $s = strtolower(str_replace([' ', 'µ', 'μ', '³'], ['', 'u', 'u', '^3'], trim((string) $u)));
        $same = [
            'x10^9/l' => ['10^9/l', 'x10e9/l', '10*9/l', 'x10^3/ul', '10^3/ul', 'x10e3/ul', '10*3/ul', 'k/ul', 'thou/ul', 'x10^3/mm^3', '10^3/mm^3'],
            'seconds' => ['s', 'sec', 'secs', 'second'],
            'mmol/l' => ['meq/l'],
        ];
        foreach ($same as $canon => $alts) {
            if ($s === $canon || in_array($s, $alts, true)) {
                return $canon;
            }
        }
        return $s;
    }

    private static function norm(string $s): string
    {
        return strtolower(preg_replace('/\s+/', ' ', trim($s)));
    }

    /** "positive, reactive; detected" -> ['positive', 'reactive', 'detected'] */
    private static function list(?string $s): array
    {
        return array_values(array_filter(array_map(fn($x) => self::norm($x), preg_split('/[,;]/', (string) $s))));
    }

    /** "not detected" / "no growth" mention the critical word but aren't critical. */
    private static function negated(string $text, string $word): bool
    {
        return (bool) preg_match('/\b(not|no|non|negative for)[\s-]+' . preg_quote($word, '/') . '/u', $text);
    }

    private static function fmt(float $v): string
    {
        return rtrim(rtrim(number_format($v, 4, '.', ''), '0'), '.');
    }
}
