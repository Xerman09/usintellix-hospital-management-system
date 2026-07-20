<?php

namespace App\Core;

class Session
{
    /**
     * Start the session if it hasn't been started.
     */
    public static function start(): void
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }

    /**
     * Store a value in the session.
     */
    public static function put(string $key, mixed $value): void
    {
        self::start();

        $_SESSION[$key] = $value;
    }

    /**
     * Retrieve a value from the session.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        self::start();

        return $_SESSION[$key] ?? $default;
    }

    /**
     * Check if a session key exists.
     */
    public static function has(string $key): bool
    {
        self::start();

        return array_key_exists($key, $_SESSION);
    }

    /**
     * Remove a single session key.
     */
    public static function forget(string $key): void
    {
        self::start();

        unset($_SESSION[$key]);
    }

    /**
     * Remove all session data.
     */
    public static function flush(): void
    {
        self::start();

        $_SESSION = [];
    }

    /**
     * Destroy the current session.
     */
    public static function destroy(): void
    {
        self::start();

        $_SESSION = [];

        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();

            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }

        session_destroy();
    }

    /**
     * Regenerate the session ID.
     */
    public static function regenerate(): void
    {
        self::start();

        session_regenerate_id(true);
    }

    /**
     * Get all session data.
     */
    public static function all(): array
    {
        self::start();

        return $_SESSION;
    }
}