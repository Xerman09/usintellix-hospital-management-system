<?php

namespace App\Core;

class Controller
{
    /**
     * Return a successful JSON response.
     */
    protected function success($data = null, string $message = 'Success', int $status = 200): void
    {
        $this->json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $status);
    }

    /**
     * Return an error JSON response.
     */
    protected function error(string $message = 'Something went wrong', int $status = 400, $errors = null): void
    {
        $this->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors
        ], $status);
    }

    /**
     * Send any JSON response.
     */
    protected function json(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');

        echo json_encode($data);
        exit;
    }

    /**
     * Redirect to another page.
     */
    protected function redirect(string $url): void
    {
        header("Location: {$url}");
        exit;
    }

    /**
     * Load a PHP view (optional if your frontend is separate).
     */
    protected function view(string $view, array $data = []): void
    {
        extract($data);

        $file = __DIR__ . "/../../views/{$view}.php";

        if (file_exists($file)) {
            require $file;
            return;
        }

        throw new \Exception("View '{$view}' not found.");
    }
}