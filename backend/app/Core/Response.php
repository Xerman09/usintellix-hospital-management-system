<?php

namespace App\Core;

class Response
{
    private int $statusCode;
    private mixed $data;
    private array $headers;

    public function __construct(mixed $data = [], int $status = 200, array $headers = [])
    {
        $this->statusCode = $status;
        $this->data = $data;
        $this->headers = $headers;
    }

    /**
     * Send or return JSON response
     */
    public static function json(mixed $data, int $status = 200, array $headers = []): self
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
            foreach ($headers as $k => $v) {
                header("{$k}: {$v}");
            }
        }
        echo json_encode($data);

        return new self($data, $status, $headers);
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getData(): mixed
    {
        return $this->data;
    }
}
