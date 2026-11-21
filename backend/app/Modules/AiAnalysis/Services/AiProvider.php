<?php

namespace App\Modules\AiAnalysis\Services;

/**
 * The seam between this system and whoever answers the question.
 *
 * It exists so that `AiAnalysisService` -- which decides what is sent, writes
 * the ledger and respects the caps -- has no knowledge of HTTP, of Anthropic,
 * or of any wire format. Two consequences, both deliberate:
 *
 *   the test suite substitutes a double and exercises every path through the
 *   orchestrator without a key, a network, or a bill; and
 *
 *   replacing the transport -- most likely swapping the hand-rolled client for
 *   the official SDK once Composer exists in this project -- is one new class
 *   and a line of configuration, not a rewrite of the part that matters.
 */
interface AiProvider
{
    /**
     * Ask for one analysis.
     *
     * Implementations MUST NOT throw for an ordinary failure -- a refused key,
     * a rate limit, an unreachable host. Those are expected states that the
     * panel has to show and the ledger has to record, so they come back as
     * ['ok' => false, 'error' => ...] and the caller decides.
     *
     * @param string $system     The stable instructions. Cacheable; keep it
     *                           byte-identical between calls or caching stops
     *                           working silently.
     * @param string $user       The volatile part: this report's figures.
     * @param int    $maxTokens  Hard ceiling on the answer, from settings.
     *
     * @return array{
     *     ok: bool,
     *     text: string,
     *     stop_reason: ?string,
     *     model: ?string,
     *     usage: array{input_tokens:int, output_tokens:int, cache_read_tokens:int},
     *     error: ?string,
     *     status: ?int
     * }
     */
    public function generate(string $system, string $user, int $maxTokens): array;

    /** Which model this provider will actually use, for the ledger and the cache key. */
    public function model(): string;
}
