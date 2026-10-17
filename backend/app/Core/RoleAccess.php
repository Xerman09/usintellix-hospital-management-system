<?php

namespace App\Core;

use App\Core\Database;
use PDO;

/**
 * Role access beyond each route's own role list (see config/role_access.php):
 * inherited roles (a charge nurse counts as a nurse) and per-path grants.
 * Also provides dynamic capability checking backed by the role_permissions table.
 */
class RoleAccess
{
    /** Routes that only these roles may call are never opened by a grant. */
    private const CLOSED_ROLE_SETS = [['admin'], ['patient']];

    private static ?array $config = null;
    private static array $rolePermissionsCache = [];

    private static function config(): array
    {
        return self::$config ??= require dirname(__DIR__, 2) . '/config/role_access.php';
    }

    /** The role plus the roles it counts as, e.g. charge_nurse -> [charge_nurse, nurse]. */
    public static function effectiveRoles(string $role): array
    {
        return array_values(array_unique(array_merge([$role], self::config()['inherits'][$role] ?? [])));
    }

    /** Does this role count as $other (itself or inherited)? */
    public static function is(string $role, string $other): bool
    {
        return in_array($other, self::effectiveRoles($role), true);
    }

    /** True if the role (or a role it inherits) is in the list. */
    public static function inList(string $role, array $roles): bool
    {
        return (bool) array_intersect(self::effectiveRoles($role), $roles);
    }

    /** May this role call this route? $allowedRoles is the route's own list. */
    public static function allows(string $role, array $allowedRoles, string $method, string $path): bool
    {
        if (self::inList($role, $allowedRoles)) {
            return true;
        }
        $sorted = $allowedRoles;
        sort($sorted);
        foreach (self::CLOSED_ROLE_SETS as $closed) {
            if ($sorted === $closed) {
                return false;
            }
        }
        return self::granted($role, $method, $path);
    }

    /** Is the path in the role's grants for this method? */
    public static function granted(string $role, string $method, string $path): bool
    {
        $path = '/' . trim($path, '/');
        foreach (self::config()['grants'][$role][strtoupper($method)] ?? [] as $pattern) {
            if (str_ends_with($pattern, '*')
                ? str_starts_with($path, substr($pattern, 0, -1))
                : $path === $pattern) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if a role possesses a specific granular capability.
     * Admins possess all capabilities by default.
     */
    public static function hasPermission(string|int $role, string $capability): bool
    {
        if (is_string($role) && strtolower($role) === 'admin') {
            return true;
        }

        $perms = self::getPermissionsForRole($role);
        return in_array($capability, $perms, true);
    }

    /**
     * Fetch all granted capability keys for a role name or role id.
     */
    public static function getPermissionsForRole(string|int $role): array
    {
        $cacheKey = (string) $role;
        if (isset(self::$rolePermissionsCache[$cacheKey])) {
            return self::$rolePermissionsCache[$cacheKey];
        }

        try {
            $pdo = Database::connection();
            if (is_numeric($role)) {
                $stmt = $pdo->prepare(
                    "SELECT capability FROM role_permissions WHERE role_id = :role_id AND is_granted = 1"
                );
                $stmt->execute(['role_id' => (int) $role]);
            } else {
                $stmt = $pdo->prepare(
                    "SELECT rp.capability 
                     FROM role_permissions rp
                     JOIN roles r ON r.id = rp.role_id
                     WHERE r.name = :role_name AND rp.is_granted = 1 AND r.deleted_at IS NULL"
                );
                $stmt->execute(['role_name' => (string) $role]);
            }
            $perms = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
        } catch (\Throwable $e) {
            $perms = [];
        }

        self::$rolePermissionsCache[$cacheKey] = $perms;
        return $perms;
    }

    public static function clearPermissionsCache(): void
    {
        self::$rolePermissionsCache = [];
    }

    public static function label(string $role): string
    {
        return self::config()['labels'][$role] ?? ucwords(str_replace('_', ' ', $role));
    }

    /** nurse, charge_nurse, cna */
    public static function nursingRoles(): array
    {
        return self::config()['nursing'];
    }
}
