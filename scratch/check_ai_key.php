<?php

declare(strict_types=1);

/**
 * Does the AI key in backend/.env work?
 *
 *     php scratch/check_ai_key.php
 *
 * Makes ONE small request to the Messages API and reports what came back. It
 * never prints the key, and it sends no hospital data of any kind -- the prompt
 * is a fixed string with nothing from the database in it.
 *
 * This is a connectivity check, not the integration. AI-1 builds the real
 * client on the official Anthropic PHP SDK through Composer; raw curl here
 * keeps the check runnable today, before Composer exists in this project.
 *
 * Costs a fraction of a centavo to run.
 */

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

App\Core\Env::load();

$config = require __DIR__ . '/../backend/config/ai.php';

echo "AI key check\n";
echo "============\n\n";

$key = (string) $config['api_key'];

if ($key === '') {
    echo "  ANTHROPIC_API_KEY is empty in backend/.env.\n\n";
    echo "  Get one at platform.claude.com -> Settings -> API keys, on the\n";
    echo "  hospital's organisation rather than a personal account, then paste it\n";
    echo "  after the = on the ANTHROPIC_API_KEY line. Nothing else to change.\n";
    exit(1);
}

// Shape only. The value itself is never printed, here or anywhere.
printf("  key:     %s, %d characters\n", str_starts_with($key, 'sk-ant-') ? 'begins sk-ant- (looks right)' : 'does NOT begin sk-ant- (check it)', strlen($key));
printf("  model:   %s\n", $config['model']);
printf("  timeout: %ds\n\n", $config['timeout']);

$endpoint = rtrim($config['base_url'] !== '' ? $config['base_url'] : 'https://api.anthropic.com', '/') . '/v1/messages';

$payload = [
    'model' => $config['model'],
    'max_tokens' => 64,
    // Cheapest setting: this is a ping, not a question worth thinking about.
    'output_config' => ['effort' => 'low'],
    'messages' => [[
        'role' => 'user',
        'content' => 'Reply with the single word: ready',
    ]],
];

$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => $config['timeout'],
    CURLOPT_HTTPHEADER => [
        'content-type: application/json',
        'anthropic-version: 2026-10-21',
        'x-api-key: ' . $key,
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
]);

$started = microtime(true);
$raw = curl_exec($ch);
$status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$curlError = curl_error($ch);
curl_close($ch);

$elapsed = microtime(true) - $started;

if ($raw === false) {
    echo "  COULD NOT REACH THE API: {$curlError}\n\n";
    echo "  That is the network or TLS, not the key. Check that this machine can\n";
    echo "  reach api.anthropic.com on 443.\n";
    exit(1);
}

$body = json_decode((string) $raw, true);

if ($status !== 200) {
    $type = $body['error']['type'] ?? 'unknown';
    $message = $body['error']['message'] ?? substr((string) $raw, 0, 300);

    printf("  HTTP %d -- %s\n  %s\n\n", $status, $type, $message);

    echo match (true) {
        $status === 401 => "  401 means the key was rejected. Check it was copied whole -- it is shown\n"
            . "  once and is easy to truncate -- and that it belongs to an organisation\n"
            . "  that still exists.\n",
        $status === 400 && str_contains((string) $message, 'model') =>
            "  The model name was not accepted. Check AI_MODEL in backend/.env against\n"
            . "  the model list for your organisation.\n",
        $status === 429 => "  Rate limited, which means the key works. Try again shortly.\n",
        $status === 402 || str_contains((string) $message, 'credit') =>
            "  The key is valid but the organisation has no credit. The API is prepaid:\n"
            . "  buy credits at platform.claude.com before the first real call.\n",
        default => "  See https://platform.claude.com/docs for this error type.\n",
    };

    exit(1);
}

$text = '';

foreach ($body['content'] ?? [] as $block) {
    if (($block['type'] ?? '') === 'text') {
        $text .= $block['text'];
    }
}

$usage = $body['usage'] ?? [];

echo "  WORKING.\n\n";
printf("  replied:       %s\n", trim($text) !== '' ? '"' . trim($text) . '"' : '(thinking only, no text -- still a success)');
printf("  model used:    %s\n", $body['model'] ?? '?');
printf("  tokens:        %d in, %d out\n", $usage['input_tokens'] ?? 0, $usage['output_tokens'] ?? 0);
printf("  round trip:    %.2fs\n\n", $elapsed);

echo "  The key is in place and the hospital's organisation is reachable.\n";
echo "  Nothing from the database was sent by this check.\n";
