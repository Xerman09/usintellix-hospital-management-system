<?php

namespace App\Modules\AiAnalysis\Services;

/**
 * One analysis, start to finish.
 *
 * THE ORDER IS THE WHOLE POINT, so it is written out here rather than left to
 * be read off the code:
 *
 *   1. the report is one we know           -- or nothing is built at all
 *   2. the server builds the payload       -- from the report's own query
 *   3. the allowlist projects it           -- dropped keys recorded
 *   4. the guard rules on it               -- off / capability / cache / size
 *                                             / rate / spend, in that order
 *   5. the provider is asked               -- the only step that costs money
 *   6. the ledger is written               -- success, refusal or failure
 *   7. the figures are checked             -- every numeral against the payload
 *   8. the answer is cached                -- so the next identical ask is free
 *
 * Step 4 before step 5 is the only ordering that matters financially, and step
 * 3 before step 4 is the only one that matters legally -- the guard hashes what
 * it is given, so projecting afterwards would mean caching and billing against
 * a payload that is not the one that was sent.
 *
 * STEP 7 IS AFTER THE LEDGER AND BEFORE THE CACHE, and both halves of that are
 * deliberate. After the ledger, because the call happened and the tokens were
 * spent whatever the text turns out to say, and a run that cost money and was
 * then discarded is the single most useful thing this ledger can record.
 * Before the cache, because an answer that failed its own figures must not be
 * stored and served again for free -- that would turn one bad answer into
 * every subsequent view of the report.
 *
 * NOTHING HERE IS PERSISTED INTO A PATIENT'S RECORD. The generated text goes to
 * the screen and into the short-lived cache, and the ledger keeps a hash of
 * what was sent rather than the text of it. See docs/ai-analysis-roadmap.md
 * AI-1 for why that is a decision and not an omission.
 */
class AiAnalysisService
{
    private AiProvider $provider;

    public function __construct(?AiProvider $provider = null)
    {
        $this->provider = $provider ?? new AnthropicProvider();
    }

    /**
     * @param array $filters The report's own filters. Never data -- the
     *                       controller rejects a request carrying any.
     *
     * @return array{success: bool, message: string, data: ?array}
     */
    public function analyse(string $reportKey, array $filters, ?int $userId, ?string $role, ?string $ip = null): array
    {
        if (!AiReports::knows($reportKey)) {
            return self::fail('That report cannot be analysed.');
        }

        // 2 and 3. Built here, projected here. Nothing from the request body
        // reaches the payload except the filters.
        try {
            $built = AiReports::build($reportKey, $filters);
        } catch (\Throwable $e) {
            AiGuardService::record($reportKey, $userId, $role, 'failed', 'report_build_failed', null, null, null, null, $ip);

            return self::fail('That report could not be read just now.');
        }

        $payload = ['context' => $built['context'], 'rows' => $built['rows']];

        // 4. The guard. Everything it refuses costs nothing.
        //
        // The provider's model goes in so the cache is keyed on what will be
        // asked for, not on what config happens to say -- see the note on
        // check(). The same value is used again at step 7.
        $verdict = AiGuardService::check($reportKey, $payload, $userId, $role, $ip, $this->provider->model());

        if (!$verdict['allowed']) {
            // The capability refusal has already written its own row and audit
            // entry inside check(); writing a second one here would double-count
            // every denied attempt in the ledger.
            if ($verdict['reason'] !== AiGuardService::NOT_ALLOWED) {
                AiGuardService::record(
                    $reportKey, $userId, $role, 'refused', $verdict['reason'], null,
                    $verdict['payload_hash'], $verdict['payload_bytes'], null, $ip, null, $built['dropped']
                );
            }

            return self::fail($verdict['message']);
        }

        // A cache hit. Free, so it is recorded as such and nothing is called.
        if ($verdict['cached'] !== null) {
            AiGuardService::record(
                $reportKey, $userId, $role, 'cached', 'cached', $this->provider->model(),
                $verdict['payload_hash'], $verdict['payload_bytes'], null, $ip, null, $built['dropped']
            );

            return [
                'success' => true,
                'message' => '',
                'data' => [
                    'analysis' => $verdict['cached']['response'],
                    'generated_at' => $verdict['cached']['generated_at'],
                    'from_cache' => true,
                    'rows_analysed' => count($built['rows']),
                ],
            ];
        }

        // 5. The only step that costs anything.
        $maxTokens = (int) ($verdict['limits']['ai_max_output_tokens'] ?? 1200);
        $started = microtime(true);

        $answer = $this->provider->generate(
            AiReports::SYSTEM_PROMPT,
            AiReports::userTurn($reportKey, $payload),
            $maxTokens
        );

        $durationMs = (int) round((microtime(true) - $started) * 1000);

        // 6. The ledger, whichever way it went. A failed call that burned
        // tokens is still spend and is recorded as such.
        if (empty($answer['ok'])) {
            AiGuardService::record(
                $reportKey, $userId, $role, 'failed',
                mb_substr((string) ($answer['error'] ?? 'unknown'), 0, 190),
                $answer['model'] ?? $this->provider->model(),
                $verdict['payload_hash'], $verdict['payload_bytes'],
                $answer['usage'] ?? null, $ip, $durationMs, $built['dropped']
            );

            // The provider's own words stay in the ledger. A staff member gets
            // something true and useless to an attacker.
            return self::fail('The analysis could not be generated just now. It has been logged.');
        }

        AiGuardService::record(
            $reportKey, $userId, $role, 'allowed', null,
            $answer['model'], $verdict['payload_hash'], $verdict['payload_bytes'],
            $answer['usage'], $ip, $durationMs, $built['dropped']
        );

        $parsed = self::parse($answer['text']);

        // 7. Every number in the answer must have come from the payload.
        //
        // The system prompt's first rule forbids arithmetic. This is the part
        // that notices when it happened anyway, and from AI-5 the reports
        // include clinical quality -- where "the CLABSI rate is 1.4 per 1,000
        // line-days" is a clinical claim however it was produced, and no
        // reader can tell a figure read off the rows from one that was
        // computed, misremembered or invented.
        //
        // THE WHOLE ANSWER GOES, not the offending sentence. A paragraph with
        // one invented number in it is not partially trustworthy, and a reader
        // handed a half-struck summary would rightly wonder what else is
        // wrong.
        //
        // It runs for every report, not only the clinical ones. A fabricated
        // peso total on a denial report is the same defect with a cheaper
        // consequence, and a check that applies to some answers is a check
        // somebody has to remember.
        $figures = AiFigures::check($parsed, $payload);

        if (!$figures['ok']) {
            AiGuardService::record(
                $reportKey, $userId, $role, 'failed',
                mb_substr('figures_unsupported: ' . implode(' ', $figures['unsupported']), 0, 190),
                $answer['model'], $verdict['payload_hash'], $verdict['payload_bytes'],
                $answer['usage'], $ip, $durationMs, $built['dropped']
            );

            // The numerals go back to the caller as well as into the ledger.
            // Nobody has yet judged a single real answer from this system, so
            // a check that misfires needs to show up as data a person can read
            // rather than as a report that mysteriously never summarises.
            return [
                'success' => false,
                'message' => 'The generated summary contained figures that are not in the report, so it was '
                    . 'discarded rather than shown.',
                'data' => ['unsupported_figures' => $figures['unsupported']],
            ];
        }

        // 8. Remember it, so the next identical question costs nothing.
        //
        // Keyed on the model that was REQUESTED, not $answer['model'] which is
        // the one that answered. Those differ whenever a fallback runs, and
        // keying the write on the answer would mean the next identical request
        // -- which asks for the configured model again -- looks in a different
        // place and misses, every time, silently.
        AiGuardService::remember(
            $verdict['payload_hash'],
            $this->provider->model(),
            $reportKey,
            $parsed,
            $answer['usage']
        );

        return [
            'success' => true,
            'message' => '',
            'data' => [
                'analysis' => $parsed,
                'generated_at' => date('Y-m-d H:i:s'),
                'from_cache' => false,
                'rows_analysed' => count($built['rows']),
            ],
        ];
    }

    /**
     * Read the answer, whatever shape it arrived in.
     *
     * The system prompt asks for JSON. Structured outputs are not in use yet
     * (see AnthropicProvider), so this must cope with a model that answers in
     * prose, or wraps its JSON in a code fence, without losing the answer. A
     * parse failure is not an error: the text is still the analysis, and
     * showing it beats showing nothing.
     *
     * @return array{summary: string, findings: array, watch: array}
     */
    public static function parse(string $text): array
    {
        $trimmed = trim($text);

        // Strip a ```json fence if there is one.
        if (str_starts_with($trimmed, '```')) {
            $trimmed = trim(preg_replace('/^```[a-z]*\s*|\s*```$/i', '', $trimmed) ?? $trimmed);
        }

        $decoded = json_decode($trimmed, true);

        if (is_array($decoded) && isset($decoded['summary'])) {
            return [
                'summary' => (string) $decoded['summary'],
                'findings' => self::strings($decoded['findings'] ?? []),
                'watch' => self::strings($decoded['watch'] ?? []),
            ];
        }

        return ['summary' => $trimmed, 'findings' => [], 'watch' => []];
    }

    /** @return string[] */
    private static function strings(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }

        $out = [];

        foreach ($value as $item) {
            if (is_scalar($item) && trim((string) $item) !== '') {
                $out[] = (string) $item;
            }
        }

        return $out;
    }

    private static function fail(string $message): array
    {
        return ['success' => false, 'message' => $message, 'data' => null];
    }
}
