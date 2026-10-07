<?php

namespace App\Modules\NursingStaff\Services;

use App\Core\Database;
use App\Core\RoleAccess;
use PDO;

/**
 * Nursing staff (nurses, charge nurses, CNAs) and the wards they work in.
 * Admins set anyone's wards; a charge nurse can add or remove only the wards they
 * work in themselves (other wards on the person stay as they are).
 */
class NursingStaffService
{
    /** filters: ward_id?, role?, q? */
    public function list(array $filters, array $actor): array
    {
        $db = Database::connection();
        $roles = RoleAccess::nursingRoles();
        $in = implode(',', array_map(fn($r) => $db->quote($r), $roles));
        $where = "u.deleted_at IS NULL AND r.name IN ({$in})";
        $params = [];
        if (!empty($filters['role']) && in_array($filters['role'], $roles, true)) {
            $where .= " AND r.name = :role";
            $params['role'] = $filters['role'];
        }
        $q = trim((string) ($filters['q'] ?? ''));
        if ($q !== '') {
            $where .= " AND (e.first_name LIKE :q OR e.last_name LIKE :q2 OR e.employee_no LIKE :q3 OR u.username LIKE :q4)";
            $params += ['q' => "%{$q}%", 'q2' => "%{$q}%", 'q3' => "%{$q}%", 'q4' => "%{$q}%"];
        }
        if (!empty($filters['ward_id'])) {
            if ($filters['ward_id'] === 'none') {
                $where .= " AND NOT EXISTS (SELECT 1 FROM nurse_ward_assignments x WHERE x.user_id = u.id)";
            } else {
                $where .= " AND EXISTS (SELECT 1 FROM nurse_ward_assignments x WHERE x.user_id = u.id AND x.ward_id = :ward)";
                $params['ward'] = (int) $filters['ward_id'];
            }
        }
        $stmt = $db->prepare(
            "SELECT u.id, u.username, r.name AS role, e.employee_no, e.first_name, e.last_name, d.name AS department
             FROM users u
             JOIN roles r ON r.id = u.role_id
             LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
             LEFT JOIN departments d ON d.id = e.department_id
             WHERE {$where}
             ORDER BY FIELD(r.name, 'charge_nurse', 'nurse', 'cna'), e.last_name, e.first_name, u.username"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $wardsByUser = $this->wardsByUser($db, array_map(fn($r) => (int) $r['id'], $rows));
        $myWards = $this->isAdmin($actor) ? null : $this->wardIds((int) $actor['id']);

        $staff = array_map(function ($r) use ($wardsByUser, $myWards) {
            $name = trim(($r['first_name'] ?? '') . ' ' . ($r['last_name'] ?? ''));
            return [
                'user_id' => (int) $r['id'],
                'name' => $name !== '' ? $name : $r['username'],
                'username' => $r['username'],
                'employee_no' => $r['employee_no'],
                'role' => $r['role'],
                'role_label' => RoleAccess::label($r['role']),
                'department' => $r['department'],
                'wards' => $wardsByUser[(int) $r['id']] ?? [],
                // A charge nurse can change only people in their wards or with no ward yet.
                'can_edit' => $myWards === null || !($wardsByUser[(int) $r['id']] ?? [])
                    || (bool) array_intersect($myWards, array_column($wardsByUser[(int) $r['id']], 'id')),
            ];
        }, $rows);

        return [
            'staff' => $staff,
            'wards' => $this->wards($db),
            'roles' => array_map(fn($r) => ['value' => $r, 'label' => RoleAccess::label($r)], $roles),
            'editable_ward_ids' => $myWards,   // null = all (admin)
            'counts' => $this->counts($db),
            'unassigned' => $this->unassigned($db),
        ];
    }

    /** The wards a person works in (ids), main ward first. */
    public function wardIds(int $userId): array
    {
        $stmt = Database::connection()->prepare("SELECT ward_id FROM nurse_ward_assignments WHERE user_id = :u ORDER BY is_primary DESC, ward_id");
        $stmt->execute(['u' => $userId]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /** For the signed-in person: their role and wards. */
    public function mine(array $user): array
    {
        $db = Database::connection();
        $wards = $this->wardsByUser($db, [(int) $user['id']])[(int) $user['id']] ?? [];
        return [
            'role' => $user['role'] ?? null,
            'role_label' => RoleAccess::label((string) ($user['role'] ?? '')),
            'is_nursing' => in_array($user['role'] ?? '', RoleAccess::nursingRoles(), true),
            'wards' => $wards,
            'primary_ward' => $wards[0] ?? null,
        ];
    }

    /**
     * Set the wards a nursing staff member works in.
     * data: user_id, ward_ids[], primary_ward_id?
     */
    public function setWards(array $data, array $actor): array
    {
        $db = Database::connection();
        $userId = (int) ($data['user_id'] ?? 0);
        $stmt = $db->prepare("SELECT r.name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = :id AND u.deleted_at IS NULL");
        $stmt->execute(['id' => $userId]);
        $role = $stmt->fetchColumn();
        if (!$role || !in_array($role, RoleAccess::nursingRoles(), true)) {
            return ['success' => false, 'message' => 'Only nurses, charge nurses and CNAs are linked to wards.', 'not_found' => !$role];
        }

        $requested = array_values(array_unique(array_filter(array_map('intval', is_array($data['ward_ids'] ?? null) ? $data['ward_ids'] : []))));
        $valid = array_column($this->wards($db), 'id');
        if (array_diff($requested, $valid)) {
            return ['success' => false, 'message' => 'Choose wards from the list.', 'errors' => ['ward_ids' => 'Unknown or inactive ward.']];
        }

        $current = $this->wardIds($userId);
        $isAdmin = $this->isAdmin($actor);
        if ($isAdmin) {
            $final = $requested;
        } else {
            // Charge nurse: changes only within their own wards; the person's other wards stay.
            $mine = $this->wardIds((int) $actor['id']);
            if (!$mine) {
                return ['success' => false, 'message' => 'You are not linked to a ward yet. Ask an admin to add you to your ward first.'];
            }
            if ($current && !array_intersect($current, $mine)) {
                return ['success' => false, 'message' => 'This person works in other wards. Only an admin or their own charge nurse can change their wards.'];
            }
            if (array_diff($requested, array_merge($mine, $current))) {
                return ['success' => false, 'message' => 'You can only add people to the wards you work in.', 'errors' => ['ward_ids' => 'Outside your wards.']];
            }
            $outside = array_diff($current, $mine);
            $final = array_values(array_unique(array_merge($outside, array_intersect($requested, $mine))));
        }

        $primary = (int) ($data['primary_ward_id'] ?? 0);
        if ($final && !in_array($primary, $final, true)) {
            // Keep the current main ward if it's still there; else the first one.
            $primary = in_array($current[0] ?? 0, $final, true) ? $current[0] : $final[0];
        }

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT nurse_wards');
        try {
            $db->prepare("DELETE FROM nurse_ward_assignments WHERE user_id = :u")->execute(['u' => $userId]);
            $ins = $db->prepare("INSERT INTO nurse_ward_assignments (user_id, ward_id, is_primary, created_by, created_at) VALUES (:u, :w, :p, :by, NOW())");
            foreach ($final as $w) {
                $ins->execute(['u' => $userId, 'w' => $w, 'p' => $w === $primary ? 1 : 0, 'by' => (int) $actor['id'] ?: null]);
            }
            $before = $this->codes($db, $current, $current[0] ?? 0);
            $after = $this->codes($db, $final, $primary);
            if ($before !== $after) {
                $db->prepare("INSERT INTO nurse_ward_assignment_log (user_id, wards_before, wards_after, changed_by, changed_at) VALUES (:u, :b, :a, :by, NOW())")
                    ->execute(['u' => $userId, 'b' => $before ?: null, 'a' => $after ?: null, 'by' => (int) $actor['id'] ?: null]);
            }
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT nurse_wards');
        } catch (\Throwable $e) {
            $owns ? ($db->inTransaction() && $db->rollBack()) : $db->exec('ROLLBACK TO SAVEPOINT nurse_wards');
            throw $e;
        }

        return ['success' => true, 'message' => $final ? 'Wards saved.' : 'Removed from all wards.',
            'data' => ['wards' => $this->wardsByUser($db, [$userId])[$userId] ?? []]];
    }

    /** Recent ward changes for a person. */
    public function history(int $userId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT l.wards_before, l.wards_after, l.changed_at,
                    (SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                     FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL WHERE nu.id = l.changed_by LIMIT 1) AS changed_by
             FROM nurse_ward_assignment_log l WHERE l.user_id = :u ORDER BY l.id DESC LIMIT 20"
        );
        $stmt->execute(['u' => $userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // ------------------------------------------------------------------

    private function isAdmin(array $actor): bool
    {
        return ($actor['role'] ?? '') === 'admin';
    }

    private function wards(PDO $db): array
    {
        $rows = $db->query("SELECT id, ward_code, ward_name, ward_type FROM hospital_wards WHERE is_active = 1 ORDER BY ward_name")->fetchAll(PDO::FETCH_ASSOC);
        return array_map(fn($w) => ['id' => (int) $w['id'], 'code' => $w['ward_code'], 'name' => $w['ward_name'], 'type' => $w['ward_type']], $rows);
    }

    /** @return array<int, array> user_id => [{id, code, name, primary}] main ward first */
    private function wardsByUser(PDO $db, array $userIds): array
    {
        if (!$userIds) {
            return [];
        }
        $stmt = $db->query(
            "SELECT a.user_id, a.is_primary, w.id, w.ward_code, w.ward_name FROM nurse_ward_assignments a
             JOIN hospital_wards w ON w.id = a.ward_id
             WHERE a.user_id IN (" . implode(',', array_map('intval', $userIds)) . ")
             ORDER BY a.is_primary DESC, w.ward_name"
        );
        $out = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[(int) $r['user_id']][] = ['id' => (int) $r['id'], 'code' => $r['ward_code'], 'name' => $r['ward_name'], 'primary' => (int) $r['is_primary'] === 1];
        }
        return $out;
    }

    private function counts(PDO $db): array
    {
        $in = implode(',', array_map(fn($r) => $db->quote($r), RoleAccess::nursingRoles()));
        $rows = $db->query(
            "SELECT w.id, COUNT(a.id) AS n FROM hospital_wards w
             LEFT JOIN nurse_ward_assignments a ON a.ward_id = w.id
                AND a.user_id IN (SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.deleted_at IS NULL AND r.name IN ({$in}))
             WHERE w.is_active = 1 GROUP BY w.id"
        )->fetchAll(PDO::FETCH_KEY_PAIR);
        return array_map('intval', $rows);
    }

    /** Nursing staff with no ward yet. */
    private function unassigned(PDO $db): int
    {
        $in = implode(',', array_map(fn($r) => $db->quote($r), RoleAccess::nursingRoles()));
        return (int) $db->query(
            "SELECT COUNT(*) FROM users u JOIN roles r ON r.id = u.role_id
             WHERE u.deleted_at IS NULL AND r.name IN ({$in})
               AND NOT EXISTS (SELECT 1 FROM nurse_ward_assignments a WHERE a.user_id = u.id)"
        )->fetchColumn();
    }

    private function codes(PDO $db, array $wardIds, int $primary): string
    {
        if (!$wardIds) {
            return '';
        }
        $codes = $db->query("SELECT id, ward_code FROM hospital_wards WHERE id IN (" . implode(',', array_map('intval', $wardIds)) . ")")->fetchAll(PDO::FETCH_KEY_PAIR);
        $list = [];
        foreach ($wardIds as $id) {
            $list[] = ($codes[$id] ?? "#{$id}") . ($id === $primary ? ' (main)' : '');
        }
        sort($list);
        return implode(', ', $list);
    }
}
