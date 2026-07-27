<?php

namespace App\Modules\Messaging\Services;

use RuntimeException;

class ZenzapService
{
    private string $apiKey;
    private string $apiSecret;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey = $_ENV['ZENZAP_API_KEY'] ?? '';
        $this->apiSecret = $_ENV['ZENZAP_API_SECRET'] ?? '';
        $this->baseUrl = rtrim(
            $_ENV['ZENZAP_BASE_URL'] ?? 'https://api.zenzap.co',
            '/'
        );

        if ($this->apiKey === '' || $this->apiSecret === '') {
            throw new RuntimeException(
                'Zenzap API credentials are not configured.'
            );
        }
    }

    /**
     * Generate HMAC-SHA256 signature.
     *
     * GET:
     *   timestamp + URI
     *
     * POST/PATCH/DELETE:
     *   timestamp + request body
     */
    private function generateSignature(
        string $payload,
        string $timestamp
    ): string {
        $signaturePayload = "{$timestamp}.{$payload}";

        return hash_hmac(
            'sha256',
            $signaturePayload,
            $this->apiSecret
        );
    }

    /**
     * Build authenticated headers.
     */
    private function headers(
        string $signature,
        string $timestamp,
        bool $json = false
    ): array {
        $headers = [
            "Authorization: Bearer {$this->apiKey}",
            "X-Signature: {$signature}",
            "X-Timestamp: {$timestamp}",
        ];

        if ($json) {
            $headers[] = 'Content-Type: application/json';
        }

        return $headers;
    }

    /**
     * Perform a GET request.
     */
    private function get(string $path): array
    {
        $timestamp = (string) round(microtime(true) * 1000);

        // Zenzap requires the URI path/query for GET signatures.
        $signature = $this->generateSignature(
            $path,
            $timestamp
        );

        $url = $this->baseUrl . $path;

        $ch = curl_init($url);

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $this->headers(
                $signature,
                $timestamp
            ),
            CURLOPT_TIMEOUT => 30,
        ]);

        return $this->execute($ch);
    }

    /**
     * Perform a POST request.
     */
    private function post(
        string $path,
        array $data = []
    ): array {
        /*
         * Encode ONCE and use this exact string for:
         * 1. HMAC signature
         * 2. HTTP request body
         */
        $body = json_encode(
            $data,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );

        if ($body === false) {
            throw new RuntimeException(
                'Failed to encode Zenzap request body.'
            );
        }

        $timestamp = (string) round(microtime(true) * 1000);

        $signature = $this->generateSignature(
            $body,
            $timestamp
        );

        $url = $this->baseUrl . $path;

        $ch = curl_init($url);

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => $this->headers(
                $signature,
                $timestamp,
                true
            ),
            CURLOPT_TIMEOUT => 30,
        ]);

        return $this->execute($ch);
    }

    /**
     * Execute cURL request and normalize response.
     */
    private function execute($ch): array
    {
        $response = curl_exec($ch);

        if ($response === false) {
            $error = curl_error($ch);

            curl_close($ch);

            throw new RuntimeException(
                "Zenzap API request failed: {$error}"
            );
        }

        $status = curl_getinfo(
            $ch,
            CURLINFO_HTTP_CODE
        );

        curl_close($ch);

        $decoded = json_decode(
            $response,
            true
        );

        return [
            'success' => $status >= 200 && $status < 300,
            'status' => $status,
            'data' => $decoded ?? $response,
        ];
    }

    /**
     * Get the Zenzap bot's own member/profile.
     *
     * Useful for verifying that authentication works.
     */
    public function getCurrentMember(): array
    {
        return $this->get('/v2/members/me');
    }

    /**
     * Get a Zenzap topic.
     */
    public function getTopic(string $topicId): array
    {
        return $this->get(
            '/v2/topics/' . rawurlencode($topicId)
        );
    }

    /**
     * Get messages from a topic.
     */
    public function getMessages(
        string $topicId,
        int $limit = 50,
        ?string $cursor = null
    ): array {
        $limit = max(1, min($limit, 100));

        $query = [
            'limit' => $limit,
        ];

        if ($cursor !== null && $cursor !== '') {
            $query['cursor'] = $cursor;
        }

        $path = '/v2/topics/'
            . rawurlencode($topicId)
            . '/messages?'
            . http_build_query($query);

        return $this->get($path);
    }

    /**
     * Send a message to a Zenzap topic.
     */
    public function sendMessage(
        string $topicId,
        string $text,
        ?string $externalId = null
    ): array {
        $data = [
            'topicId' => $topicId,
            'text' => $text,
        ];

        if ($externalId !== null) {
            $data['externalId'] = $externalId;
        }

        return $this->post(
            '/v2/messages',
            $data
        );
    }

    /**
     * Mark a Zenzap message as read.
     */
    public function markMessageRead(
        string $messageId
    ): array {
        return $this->post(
            '/v2/messages/'
            . rawurlencode($messageId)
            . '/read'
        );
    }
}