<?php

namespace App\Modules\AiAnalysis\Services;

/**
 * Every number in the answer must have come from the data.
 *
 * Rule 1 of the system prompt already forbids arithmetic. This is the part
 * that notices when it happened anyway, and it exists because AI-5 is the
 * first phase whose output reaches a clinical audience: "infection rate is
 * 4.1 per 1,000 line-days" is a clinical claim however it was produced, and a
 * reader has no way to tell a figure that was read off the rows from one that
 * was computed, misremembered or invented.
 *
 * WHAT IT DOES. Pull every numeral out of the generated text, pull every
 * numeral out of the payload that was sent, and report the ones in the text
 * that are not in the payload. The caller discards the whole answer if there
 * are any -- see AiAnalysisService -- rather than redacting the offending
 * sentence, because a paragraph with one invented number in it is not
 * partially trustworthy and a reader given a half-struck summary would
 * rightly wonder what else is wrong.
 *
 * THE HARD PART IS NOT THE COMPARISON, IT IS WHAT COUNTS AS A FIGURE. A naive
 * version refuses almost every real answer, because this is all legitimate
 * text that contains numerals the payload's *values* do not hold:
 *
 *   "the 30-day readmission rate"      -- from the key readmissions_30d_count
 *   "4.1 per 1,000 device-days"        -- from the key rate_per_1000
 *   "Level 1 arrivals"                 -- from a label string in the payload
 *   "1. Readmissions are above target" -- a numbered list, not a figure
 *
 * So the supported set is harvested from the payload's keys and its string
 * values as well as its numbers, and ordered-list markers are stripped before
 * extraction. The effect is that a numeral the hospital's own data uses
 * anywhere is allowed, and a numeral that appears from nowhere is not. That is
 * the line worth drawing: it catches the invented figure and the mis-done
 * division, and it does not catch a model that quotes a metric's name back.
 *
 * ROUNDING IS ALLOWED, CONVERSION IS NOT. A payload value of 4.567 supports
 * "4.6" and "4.57", because reading a number off a row and writing it to fewer
 * decimals is not arithmetic. A payload value of 0.41 does not support "41%":
 * that is a conversion, rule 1 forbids it, and flagging it is the point.
 *
 * WHAT IT CANNOT DO, said plainly rather than left to be discovered:
 *
 *   - Numbers written as words pass unchecked. "Three wards" is not examined.
 *   - A number that is in the payload but describes something else passes.
 *     If 47 is a bed count and the answer calls it a discharge count, every
 *     numeral checks out and the sentence is still wrong. This checks
 *     provenance, not meaning, and no amount of tightening would change that.
 *   - It says nothing about whether the finding is clinically sound. That is
 *     the sign-off AI-5 asks for, and it is not code.
 *
 * NO SETTING TURNS IT OFF. There is no tuning knob because nobody has yet seen
 * a single real answer from this system, so any threshold would be a guess
 * dressed as a configuration. The failure direction is safe -- a false
 * positive shows no analysis rather than a wrong one -- and the unsupported
 * numerals are returned to the caller and written to the ledger, so a check
 * that misfires in practice shows up as data instead of as a mystery.
 */
class AiFigures
{
    /**
     * Numerals in the text that the payload does not support.
     *
     * @param array|string $output  The parsed analysis, or raw text.
     * @param array        $payload Exactly what was sent to the provider.
     *
     * @return array{ok: bool, unsupported: array<int, string>, checked: int}
     */
    public static function check(array|string $output, array $payload): array
    {
        $text = is_array($output) ? self::textOf($output) : $output;

        $supported = self::supportedSet($payload);
        $candidates = self::numeralsIn($text);

        $unsupported = [];

        foreach ($candidates as $raw) {
            if (!self::isSupported($raw, $supported)) {
                $unsupported[$raw] = true;
            }
        }

        return [
            'ok' => $unsupported === [],
            'unsupported' => array_keys($unsupported),
            'checked' => count($candidates),
        ];
    }

    /** Everything the model wrote, as one string. */
    public static function textOf(array $parsed): string
    {
        $parts = [(string) ($parsed['summary'] ?? '')];

        foreach (['findings', 'watch'] as $list) {
            foreach ((array) ($parsed[$list] ?? []) as $item) {
                if (is_scalar($item)) {
                    $parts[] = (string) $item;
                }
            }
        }

        return implode("\n", $parts);
    }

    /**
     * The numerals the payload supports, normalised.
     *
     * Three sources, and all three are needed:
     *   - numeric values, which is the obvious one;
     *   - digits inside KEY names, so `readmissions_30d_count` supports "30"
     *     and `rate_per_1000` supports "1,000";
     *   - digits inside STRING values, so a date of 2026-10-23 supports its
     *     own parts and a label of "Level 1: Resuscitation" supports "1".
     *
     * @return array{exact: array<string, true>, floats: array<int, float>}
     */
    private static function supportedSet(array $payload): array
    {
        $exact = [];
        $floats = [];

        $walk = function ($node) use (&$walk, &$exact, &$floats): void {
            if (is_array($node)) {
                foreach ($node as $key => $value) {
                    // Keys carry figures too: 30d, per_1000, bucket_0_30.
                    if (is_string($key)) {
                        foreach (self::digitRuns($key) as $run) {
                            $exact[self::normalise($run)] = true;
                        }
                    }

                    $walk($value);
                }

                return;
            }

            if (is_bool($node) || $node === null) {
                return;
            }

            if (is_int($node) || is_float($node) || (is_string($node) && is_numeric(trim($node)))) {
                $normal = self::normalise((string) $node);
                $exact[$normal] = true;
                $floats[] = (float) $node;

                return;
            }

            if (is_string($node)) {
                foreach (self::digitRuns($node) as $run) {
                    $exact[self::normalise($run)] = true;
                    $floats[] = (float) str_replace(',', '', $run);
                }
            }
        };

        $walk($payload);

        return ['exact' => $exact, 'floats' => $floats];
    }

    /**
     * The numerals in the generated text.
     *
     * Ordered-list markers go first. A model told to return a JSON array of
     * findings still sometimes numbers them, and "1." is punctuation rather
     * than a claim about the hospital.
     *
     * @return array<int, string>
     */
    public static function numeralsIn(string $text): array
    {
        $text = (string) preg_replace('/(^|\n)\s*\d{1,2}[.)]\s/', '$1', $text);

        preg_match_all('/\d[\d,]*(?:\.\d+)?/', $text, $m);

        return $m[0];
    }

    /**
     * Strip the thousands separators and the trailing zeros, so that "0.00",
     * "0" and 0.0 are one value and a comparison does not turn on formatting.
     */
    public static function normalise(string $numeral): string
    {
        $clean = str_replace([',', ' '], '', trim($numeral));

        if (!is_numeric($clean)) {
            return $clean;
        }

        $formatted = number_format((float) $clean, 6, '.', '');

        return rtrim(rtrim($formatted, '0'), '.') ?: '0';
    }

    /**
     * @param array{exact: array<string, true>, floats: array<int, float>} $supported
     */
    private static function isSupported(string $raw, array $supported): bool
    {
        $normal = self::normalise($raw);

        if (isset($supported['exact'][$normal])) {
            return true;
        }

        // A rounding of something in the payload. Reading 4.567 off a row and
        // writing 4.6 is not arithmetic; writing 41% for 0.41 is, and fails
        // here because rounding never changes a value's magnitude.
        $dot = strpos($normal, '.');
        $places = $dot === false ? 0 : strlen($normal) - $dot - 1;

        foreach ($supported['floats'] as $value) {
            if (self::normalise((string) round($value, $places)) === $normal) {
                return true;
            }
        }

        return false;
    }

    /** @return array<int, string> */
    private static function digitRuns(string $subject): array
    {
        preg_match_all('/\d[\d,]*(?:\.\d+)?/', $subject, $m);

        return $m[0];
    }
}
