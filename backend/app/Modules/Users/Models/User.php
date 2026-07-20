<?php

namespace App\Modules\Users\Models;

use App\Core\QueryBuilder;

class User extends QueryBuilder
{
    protected string $table = 'users';

    protected string $primaryKey = 'id';

    /**
     * Hash a plaintext password for storage.
     */
    public static function hashPassword(string $plainPassword): string
    {
        return password_hash($plainPassword, PASSWORD_DEFAULT);
    }

    /**
     * Verify a plaintext password against a stored hash.
     */
    public static function verifyPassword(string $plainPassword, string $hashedPassword): bool
    {
        return password_verify($plainPassword, $hashedPassword);
    }
}