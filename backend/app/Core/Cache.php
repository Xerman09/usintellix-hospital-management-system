<?php

namespace App\Core;

/**
 * Minimal file-based cache. This app has no APCu/Redis available in every
 * environment it runs in, so cached values are serialized to disk under
 * storage/cache with an expiry timestamp checked on read.
 */
class Cache
{
    private static string $directory = __DIR__ . '/../../storage/cache';

    /**
     * Return the cached value for $key, or compute it via $resolver, cache
     * it for $ttlSeconds, and return it. A resolver result of null is never
     * cached, so a "not found" lookup is retried on the next call instead
     * of being remembered as missing for the full TTL.
     */
    public static function remember(string $key, int $ttlSeconds, callable $resolver)
    {
        $cached = self::get($key);

        if ($cached !== null) {
            return $cached;
        }

        $value = $resolver();

        if ($value !== null) {
            self::set($key, $value, $ttlSeconds);
        }

        return $value;
    }

    public static function get(string $key)
    {
        $file = self::path($key);

        if (!is_file($file)) {
            return null;
        }

        $payload = @unserialize(file_get_contents($file));

        if (!is_array($payload) || $payload['expires_at'] < time()) {
            @unlink($file);
            return null;
        }

        return $payload['value'];
    }

    public static function set(string $key, $value, int $ttlSeconds): void
    {
        if (!is_dir(self::$directory)) {
            mkdir(self::$directory, 0775, true);
        }

        file_put_contents(self::path($key), serialize([
            'expires_at' => time() + $ttlSeconds,
            'value' => $value
        ]));
    }

    /**
     * Drop a cached value early, e.g. after a write that would make it stale.
     */
    public static function forget(string $key): void
    {
        $file = self::path($key);

        if (is_file($file)) {
            unlink($file);
        }
    }

    private static function path(string $key): string
    {
        return self::$directory . '/' . hash('sha256', $key) . '.cache';
    }
}
