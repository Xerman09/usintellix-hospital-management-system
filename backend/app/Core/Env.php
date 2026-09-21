<?php

namespace App\Core;

class Env
{
    private static bool $loaded = false;

    /**
     * Parse and load environment variables from the given file path into $_ENV, $_SERVER, and putenv().
     */
    public static function load(?string $path = null): void
    {
        if (self::$loaded) {
            return;
        }

        $envFile = $path ?? dirname(__DIR__, 2) . '/.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines !== false) {
                foreach ($lines as $line) {
                    $line = trim($line);
                    if ($line === '' || str_starts_with($line, '#') || str_starts_with($line, ';')) {
                        continue;
                    }

                    if (strpos($line, '=') !== false) {
                        [$key, $value] = explode('=', $line, 2);
                        $key = trim($key);
                        $value = trim($value);

                        // Strip optional surrounding quotes
                        if (
                            (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
                            (str_starts_with($value, "'") && str_ends_with($value, "'"))
                        ) {
                            $value = substr($value, 1, -1);
                        }

                        if (!array_key_exists($key, $_ENV)) {
                            $_ENV[$key] = $value;
                        }
                        if (!array_key_exists($key, $_SERVER)) {
                            $_SERVER[$key] = $value;
                        }
                        putenv("{$key}={$value}");
                    }
                }
            }
        }

        self::$loaded = true;
    }

    /**
     * Retrieve an environment variable with a fallback default.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        self::load();

        if (array_key_exists($key, $_ENV)) {
            return self::castValue($_ENV[$key]);
        }

        if (array_key_exists($key, $_SERVER)) {
            return self::castValue($_SERVER[$key]);
        }

        $val = getenv($key);
        if ($val !== false) {
            return self::castValue($val);
        }

        return $default;
    }

    /**
     * Normalize common boolean and null values.
     */
    private static function castValue(mixed $val): mixed
    {
        if (!is_string($val)) {
            return $val;
        }

        $lower = strtolower(trim($val));
        if ($lower === 'true' || $lower === '(true)') {
            return true;
        }
        if ($lower === 'false' || $lower === '(false)') {
            return false;
        }
        if ($lower === 'null' || $lower === '(null)') {
            return null;
        }
        if ($lower === 'empty' || $lower === '(empty)') {
            return '';
        }

        return $val;
    }
}
