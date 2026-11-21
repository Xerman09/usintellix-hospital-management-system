<?php

namespace App\Modules\AiAnalysis\Services;

/**
 * Anthropic's Messages API over HTTPS.
 *
 * WHY THIS IS HAND-ROLLED, AND WHAT THAT COSTS.
 *
 * docs/ai-analysis-roadmap.md says AI-1 builds on the official Anthropic PHP
 * SDK. That needs Composer, and this project has no composer.json, no vendor/
 * and no composer binary on the machine -- the hand-rolled Mailer exists for
 * the same reason. Installing Composer is a change to how this system is
 * deployed and is not a decision to take quietly inside a feature.
 *
 * So the transport is written here, behind `AiProvider`, and the debt is
 * recorded rather than hidden. What it costs: every parameter below is one this
 * code has to keep correct by hand as the API moves, and the Mailer is the
 * cautionary tale -- it carried a multiline-greeting bug for two months because
 * nobody was maintaining a protocol by hand on purpose. Swapping this class for
 * an SDK-backed one is one file and a line of configuration, by design.
 *
 * WHAT IS DELIBERATELY NOT SENT.
 *
 *   `thinking` -- omitted. On Claude Opus 5.5 thinking is always on and
 *   `{"type":"disabled"}` is a 400 at every effort level. Depth is controlled
 *   by `output_config.effort` instead.
 *
 *   `temperature`, `top_p`, `top_k` -- removed on API version 2026-10-21 and
 *   rejected with a 400. Report summaries want consistency anyway.
 *
 *   Structured outputs -- not yet. The response shape is asked for in the
 *   prompt and parsed defensively instead. A first build that cannot be tested
 *   against the real API should not carry a parameter whose exact shape is
 *   unverified: the cost of being wrong is that the very first real call fails
 *   on a parameter rather than on something that teaches us anything. It is a
 *   follow-up for the day there is a key to test with.
 *
 * ERRORS DO NOT THROW. A refused key, a rate limit, an unreachable host: all
 * expected states that the panel must show and the ledger must record. They
 * come back as ok => false with a reason a developer can act on.
 */
class AnthropicProvider implements AiProvider
{
    /** Verified against the current reference. Bump deliberately, not by habit. */
    private const API_VERSION = '2026-10-21';

    private const DEFAULT_ENDPOINT = 'https://api.anthropic.com';

    private string $apiKey;
    private string $model;
    private int $timeout;
    private string $baseUrl;

    /** Depth of reasoning. `medium` is the default on Opus 5.5; a report summary does not need more. */
    private string $effort;

    public function __construct(?array $config = null, string $effort = 'medium')
    {
        $config ??= require __DIR__ . '/../../../../config/ai.php';

        $this->apiKey = (string) ($config['api_key'] ?? '');
        $this->model = (string) ($config['model'] ?? 'claude-opus-5-5');
        $this->timeout = (int) ($config['timeout'] ?? 30);
        $this->baseUrl = rtrim((string) ($config['base_url'] ?? '') ?: self::DEFAULT_ENDPOINT, '/');
        $this->effort = $effort;
    }

    public function model(): string
    {
        return $this->model;
    }

    public function configured(): bool
    {
        return $this->apiKey !== '';
    }

    public function generate(string $system, string $user, int $maxTokens): array
    {
        $blank = [
            'ok' => false,
            'text' => '',
            'stop_reason' => null,
            'model' => $this->model,
            'usage' => ['input_tokens' => 0, 'output_tokens' => 0, 'cache_read_tokens' => 0],
            'error' => null,
            'status' => null,
        ];

        if (!$this->configured()) {
            return ['error' => 'ANTHROPIC_API_KEY is not set in backend/.env.'] + $blank;
        }

        $payload = [
            'model' => $this->model,
            'max_tokens' => max(64, $maxTokens),
            // The stable prefix, marked cacheable. Everything volatile is in
            // the user turn below, which is what makes the cache worth having:
            // a byte of drift up here throws away every saving.
            'system' => [[
                'type' => 'text',
                'text' => $system,
                'cache_control' => ['type' => 'ephemeral'],
            ]],
            'output_config' => ['effort' => $this->effort],
            'messages' => [[
                'role' => 'user',
                'content' => $user,
            ]],
        ];

        $ch = curl_init($this->baseUrl . '/v1/messages');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => [
                'content-type: application/json',
                'anthropic-version: ' . self::API_VERSION,
                'x-api-key: ' . $this->apiKey,
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ]);

        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $transportError = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            return ['error' => 'Could not reach the AI provider: ' . $transportError] + $blank;
        }

        $body = json_decode((string) $raw, true);

        if (!is_array($body)) {
            return ['error' => 'The AI provider returned something that was not JSON.', 'status' => $status] + $blank;
        }

        if ($status !== 200) {
            return [
                'error' => sprintf(
                    '%s: %s',
                    $body['error']['type'] ?? ('HTTP ' . $status),
                    $body['error']['message'] ?? 'no message'
                ),
                'status' => $status,
            ] + $blank;
        }

        $usage = [
            'input_tokens' => (int) ($body['usage']['input_tokens'] ?? 0),
            'output_tokens' => (int) ($body['usage']['output_tokens'] ?? 0),
            // Cache reads are billed far below input tokens, so they are
            // counted apart rather than folded in.
            'cache_read_tokens' => (int) ($body['usage']['cache_read_input_tokens'] ?? 0),
        ];

        $stop = $body['stop_reason'] ?? null;

        // A refusal is HTTP 200 with no usable content. It is a real outcome,
        // not an error to hide, and it is still billed -- so the usage above
        // goes back with it and lands in the ledger.
        if ($stop === 'refusal') {
            return [
                'ok' => false,
                'text' => '',
                'stop_reason' => $stop,
                'model' => $body['model'] ?? $this->model,
                'usage' => $usage,
                'error' => 'The provider declined to answer this request.',
                'status' => 200,
            ];
        }

        $text = '';

        foreach ($body['content'] ?? [] as $block) {
            if (($block['type'] ?? '') === 'text') {
                $text .= $block['text'];
            }
        }

        if (trim($text) === '') {
            return [
                'ok' => false,
                'text' => '',
                'stop_reason' => $stop,
                'model' => $body['model'] ?? $this->model,
                'usage' => $usage,
                'error' => 'The provider answered with no text.',
                'status' => 200,
            ];
        }

        return [
            'ok' => true,
            'text' => $text,
            'stop_reason' => $stop,
            'model' => $body['model'] ?? $this->model,
            'usage' => $usage,
            'error' => null,
            'status' => 200,
        ];
    }
}
