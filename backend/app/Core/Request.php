<?php

namespace App\Core;

class Request
{
    private array $data = [];

    public function __construct()
    {
        $this->parseRequest();
    }

    /**
     * Parse request data.
     */
    private function parseRequest(): void
    {
        $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');
        $rawInput = file_get_contents('php://input');

        if (str_contains($contentType, 'application/json') || (!empty($rawInput) && in_array($_SERVER['REQUEST_METHOD'] ?? '', ['PUT', 'PATCH']))) {
            $body = json_decode($rawInput, true);
            if (is_array($body)) {
                $this->data = array_merge($_GET, $body);
                return;
            }
        }

        $this->data = array_merge($_GET, $_POST);
        if (empty($_POST) && !empty($rawInput)) {
            $body = json_decode($rawInput, true);
            if (is_array($body)) {
                $this->data = array_merge($this->data, $body);
            }
        }
    }

    /**
     * Get all request data.
     */
    public function all(): array
    {
        return $this->data;
    }

    /**
     * Get a single input value.
     */
    public function input(string $key, $default = null)
    {
        return $this->data[$key] ?? $default;
    }

    /**
     * Get a query parameter.
     */
    public function query(string $key, $default = null)
    {
        return $_GET[$key] ?? $this->input($key, $default);
    }

    /**
     * Check if an input exists.
     */
    public function has(string $key): bool
    {
        return isset($this->data[$key]);
    }

    /**
     * Get only specific fields.
     */
    public function only(array $keys): array
    {
        $data = [];

        foreach ($keys as $key) {
            if ($this->has($key)) {
                $data[$key] = $this->input($key);
            }
        }

        return $data;
    }

    /**
     * Get the current HTTP method.
     */
    public function method(): string
    {
        return $_SERVER['REQUEST_METHOD'];
    }

    /**
     * Get the current request URI.
     */
    public function uri(): string
    {
        return parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    }

    /**
     * Get uploaded files.
     */
    public function files(): array
    {
        return $_FILES;
    }

    /**
     * Get request headers.
     */
    public function headers(): array
    {
        if (function_exists('getallheaders')) {
            return getallheaders();
        }

        return [];
    }

    /**
     * Get client IP address.
     */
    public function ip(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? 'UNKNOWN';
    }

    /**
     * Determine if the request is AJAX.
     */
    public function isAjax(): bool
    {
        return (
            $_SERVER['HTTP_X_REQUESTED_WITH'] ?? ''
        ) === 'XMLHttpRequest';
    }
}