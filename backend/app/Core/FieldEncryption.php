<?php

declare(strict_types=1);

namespace App\Core;

/**
 * HIPAA § 164.312(a)(2)(iv) Field-Level Database Encryption Engine
 *
 * Implements NIST SP 800-38D compliant AES-256-GCM (Galois/Counter Mode) authenticated
 * encryption at rest for sensitive database fields (SSN, national IDs, credit cards/banking,
 * and psychiatric/psychotherapy notes).
 *
 * Envelope Format:
 *   enc:v1:<base64(12-byte IV . 16-byte Auth Tag . Ciphertext)>
 */
class FieldEncryption
{
    public const CIPHER = 'aes-256-gcm';
    public const PREFIX = 'enc:v1:';
    public const IV_LENGTH = 12;      // 96-bit IV recommended for GCM
    public const TAG_LENGTH = 16;     // 128-bit authentication tag

    private static ?string $cachedKey = null;

    /**
     * Resolve the 256-bit binary encryption key.
     */
    public static function getKey(): string
    {
        if (self::$cachedKey !== null) {
            return self::$cachedKey;
        }

        $rawKey = Env::get('DB_ENCRYPTION_KEY');

        if (!empty($rawKey)) {
            $trimmed = trim($rawKey);
            // 64-character hexadecimal representation
            if (strlen($trimmed) === 64 && ctype_xdigit($trimmed)) {
                self::$cachedKey = hex2bin($trimmed);
                return self::$cachedKey;
            }

            // Base64-encoded 32-byte key
            $decoded = base64_decode($trimmed, true);
            if ($decoded !== false && strlen($decoded) === 32) {
                self::$cachedKey = $decoded;
                return self::$cachedKey;
            }

            // Raw 32-byte binary key
            if (strlen($trimmed) === 32) {
                self::$cachedKey = $trimmed;
                return self::$cachedKey;
            }
        }

        // Resilient deterministic fallback using SHA-256 of APP_KEY or system salt
        error_log('HIPAA Security Warning: DB_ENCRYPTION_KEY not set or invalid in .env. Falling back to derived key.');
        $fallbackSeed = Env::get('APP_KEY') ?: 'UHMS_SECURE_CIPHER_FALLBACK_SEED_2026';
        self::$cachedKey = hash('sha256', $fallbackSeed, true);

        return self::$cachedKey;
    }

    /**
     * Reset cached key (primarily for test suites / key rotation).
     */
    public static function resetKey(): void
    {
        self::$cachedKey = null;
    }

    /**
     * Determine if a given string has already been encrypted with the envelope.
     */
    public static function isEncrypted(?string $value): bool
    {
        if ($value === null || $value === '') {
            return false;
        }

        return str_starts_with($value, self::PREFIX);
    }

    /**
     * Encrypt a plaintext value using AES-256-GCM.
     */
    public static function encrypt(?string $plaintext): ?string
    {
        if ($plaintext === null || $plaintext === '') {
            return $plaintext;
        }

        // Avoid double-encryption
        if (self::isEncrypted($plaintext)) {
            return $plaintext;
        }

        $key = self::getKey();
        $iv = random_bytes(self::IV_LENGTH);
        $tag = '';

        $ciphertext = openssl_encrypt(
            $plaintext,
            self::CIPHER,
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            '',
            self::TAG_LENGTH
        );

        if ($ciphertext === false) {
            error_log('HIPAA Cryptographic Error: Failed to encrypt field data with AES-256-GCM.');
            throw new \RuntimeException('Encryption failed.');
        }

        return self::PREFIX . base64_encode($iv . $tag . $ciphertext);
    }

    /**
     * Decrypt an AES-256-GCM encrypted envelope.
     * Non-encrypted legacy values pass through untouched for backward compatibility.
     */
    public static function decrypt(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        if (!self::isEncrypted($value)) {
            return $value;
        }

        $encoded = substr($value, strlen(self::PREFIX));
        $raw = base64_decode($encoded, true);

        $minPayloadLength = self::IV_LENGTH + self::TAG_LENGTH;
        if ($raw === false || strlen($raw) < $minPayloadLength) {
            error_log('HIPAA Security Alert: Malformed ciphertext payload in encrypted database field.');
            return null;
        }

        $iv = substr($raw, 0, self::IV_LENGTH);
        $tag = substr($raw, self::IV_LENGTH, self::TAG_LENGTH);
        $ciphertext = substr($raw, $minPayloadLength);

        $key = self::getKey();

        $decrypted = openssl_decrypt(
            $ciphertext,
            self::CIPHER,
            $key,
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($decrypted === false) {
            error_log('HIPAA Security Tamper Alert: Decryption failed or authentication tag mismatch (§ 164.312(a)(2)(iv)).');
            return null;
        }

        return $decrypted;
    }

    /**
     * Encrypt specified fields in a row associative array.
     */
    public static function encryptRow(array $row, array $fields): array
    {
        foreach ($fields as $field) {
            if (isset($row[$field]) && is_string($row[$field]) && $row[$field] !== '') {
                $row[$field] = self::encrypt($row[$field]);
            }
        }

        return $row;
    }

    /**
     * Decrypt specified fields in a single row associative array.
     */
    public static function decryptRow(array $row, array $fields): array
    {
        foreach ($fields as $field) {
            if (isset($row[$field]) && is_string($row[$field]) && $row[$field] !== '') {
                $row[$field] = self::decrypt($row[$field]);
            }
        }

        return $row;
    }

    /**
     * Decrypt specified fields across a list of row associative arrays.
     */
    public static function decryptRows(array $rows, array $fields): array
    {
        foreach ($rows as &$row) {
            if (is_array($row)) {
                $row = self::decryptRow($row, $fields);
            }
        }
        unset($row);

        return $rows;
    }

    /**
     * Mask Social Security Number for secure UI display (e.g. ***-**-1234).
     */
    public static function maskSsn(?string $ssn): string
    {
        if (empty($ssn)) {
            return '';
        }

        $digits = preg_replace('/\D/', '', $ssn);
        if (strlen($digits) === 9) {
            return '***-**-' . substr($digits, -4);
        }

        if (strlen($ssn) <= 4) {
            return str_repeat('*', strlen($ssn));
        }

        return str_repeat('*', max(0, strlen($ssn) - 4)) . substr($ssn, -4);
    }

    /**
     * Mask Payment Card Number (e.g. **** **** **** 1234).
     */
    public static function maskCard(?string $card): string
    {
        if (empty($card)) {
            return '';
        }

        $clean = preg_replace('/\D/', '', $card);
        if (strlen($clean) >= 12) {
            return '**** **** **** ' . substr($clean, -4);
        }

        if (strlen($card) <= 4) {
            return str_repeat('*', strlen($card));
        }

        return '**** ' . substr($card, -4);
    }

    /**
     * Mask National ID or Government ID (e.g. ******1234).
     */
    public static function maskNationalId(?string $id): string
    {
        if (empty($id)) {
            return '';
        }

        $trimmed = trim($id);
        $len = strlen($trimmed);
        if ($len <= 4) {
            return str_repeat('*', $len);
        }

        return str_repeat('*', $len - 4) . substr($trimmed, -4);
    }
}
