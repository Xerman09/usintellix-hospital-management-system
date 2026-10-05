<?php

namespace App\Modules\Specializations\Services;

use App\Core\Database;
use PDO;

/**
 * Setup > Specializations: the one list of medical specializations that
 * doctors (Providers), surgery types (Surgeries) and OR cases point to.
 * Each is surgical, anesthesiology, medical or other -- which is what the
 * surgery screens filter on (surgeons by the case's specialization,
 * anesthesiologists by "anesthesiology").
 */
class SpecializationService
{
    public const READ_ROLES = ['admin', 'receptionist', 'doctor', 'accountant'];

    public const CATEGORIES = [
        'surgical' => 'Surgical',
        'anesthesiology' => 'Anesthesiology',
        'medical' => 'Medical',
        'other' => 'Other'
    ];

    /** Filters: include_inactive?, category? */
    public function list(array $filters = []): array
    {
        $where = ['1 = 1'];
        $params = [];
        if (empty($filters['include_inactive'])) {
            $where[] = 's.is_active = 1';
        }
        if (!empty($filters['category']) && isset(self::CATEGORIES[$filters['category']])) {
            $where[] = 's.category = :category';
            $params['category'] = $filters['category'];
        }

        $stmt = Database::connection()->prepare(
            "SELECT s.id, s.name, s.category, s.description, s.is_active,
                    (SELECT COUNT(*) FROM provider_specializations ps JOIN providers p ON p.id = ps.provider_id AND p.deleted_at IS NULL
                     WHERE ps.specialization_id = s.id) AS doctor_count,
                    (SELECT COUNT(*) FROM surgeries su WHERE su.specialization_id = s.id AND su.deleted_at IS NULL) AS surgery_count
             FROM specializations s
             WHERE " . implode(' AND ', $where) . "
             ORDER BY FIELD(s.category, 'surgical', 'anesthesiology', 'medical', 'other'), s.name"
        );
        $stmt->execute($params);

        return array_map(fn($r) => [
            'id' => (int) $r['id'], 'name' => $r['name'], 'category' => $r['category'],
            'category_label' => self::CATEGORIES[$r['category']] ?? $r['category'],
            'description' => $r['description'], 'is_active' => (bool) $r['is_active'],
            'doctor_count' => (int) $r['doctor_count'], 'surgery_count' => (int) $r['surgery_count']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function categories(): array
    {
        return array_map(fn($k, $v) => ['value' => $k, 'label' => $v], array_keys(self::CATEGORIES), self::CATEGORIES);
    }

    /** data: name, category, description? -- $id null = new. */
    public function save(?int $id, array $data, int $userId): array
    {
        $name = trim((string) ($data['name'] ?? ''));
        $category = (string) ($data['category'] ?? '');
        $description = trim((string) ($data['description'] ?? '')) ?: null;
        $errors = [];

        if ($name === '') {
            $errors['name'] = 'Enter the specialization name.';
        } elseif (mb_strlen($name) > 120) {
            $errors['name'] = 'Keep the name under 120 characters.';
        }
        if (!isset(self::CATEGORIES[$category])) {
            $errors['category'] = 'Choose whether it is surgical, anesthesiology, medical or other.';
        }

        $db = Database::connection();
        if ($id && !$this->exists($id)) {
            return ['success' => false, 'message' => 'Specialization not found.', 'not_found' => true];
        }
        if (!$errors) {
            $stmt = $db->prepare("SELECT id FROM specializations WHERE name = :name" . ($id ? " AND id <> :id" : ""));
            $stmt->execute(['name' => $name] + ($id ? ['id' => $id] : []));
            if ($stmt->fetchColumn()) {
                $errors['name'] = 'This specialization is already on the list.';
            }
        }
        if ($errors) {
            return ['success' => false, 'message' => 'Check the highlighted fields.', 'errors' => $errors];
        }

        $now = date('Y-m-d H:i:s');
        if ($id) {
            $db->prepare("UPDATE specializations SET name = :name, category = :category, description = :d, updated_at = :now, updated_by = :u WHERE id = :id")
                ->execute(['name' => $name, 'category' => $category, 'd' => $description, 'now' => $now, 'u' => $userId, 'id' => $id]);
            // Doctors whose primary specialization this is keep the printed name in step.
            $db->prepare(
                "UPDATE providers p JOIN provider_specializations ps ON ps.provider_id = p.id AND ps.is_primary = 1
                 SET p.specialty = :name WHERE ps.specialization_id = :id"
            )->execute(['name' => $name, 'id' => $id]);

            return ['success' => true, 'message' => 'Specialization updated.'];
        }

        $db->prepare("INSERT INTO specializations (name, category, description, created_at, created_by) VALUES (:name, :category, :d, :now, :u)")
            ->execute(['name' => $name, 'category' => $category, 'd' => $description, 'now' => $now, 'u' => $userId]);

        return ['success' => true, 'message' => 'Specialization added.', 'data' => ['id' => (int) $db->lastInsertId()]];
    }

    /** In-use specializations are switched off, not deleted, so records keep their meaning. */
    public function setActive(int $id, bool $active, int $userId): array
    {
        if (!$this->exists($id)) {
            return ['success' => false, 'message' => 'Specialization not found.', 'not_found' => true];
        }

        Database::connection()->prepare("UPDATE specializations SET is_active = :a, updated_at = :now, updated_by = :u WHERE id = :id")
            ->execute(['a' => $active ? 1 : 0, 'now' => date('Y-m-d H:i:s'), 'u' => $userId, 'id' => $id]);

        return ['success' => true, 'message' => $active
            ? 'Specialization switched on.'
            : 'Specialization switched off. It stays on existing records but can no longer be picked for new ones.'];
    }

    /** id => row, for the active ones (used by Providers, Surgeries, OR). */
    public static function byId(array $ids): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
        if (!$ids) {
            return [];
        }
        $rows = Database::connection()->query("SELECT id, name, category, is_active FROM specializations WHERE id IN (" . implode(',', $ids) . ")")->fetchAll(PDO::FETCH_ASSOC);

        return array_column($rows, null, 'id');
    }

    private function exists(int $id): bool
    {
        $stmt = Database::connection()->prepare("SELECT 1 FROM specializations WHERE id = :id");
        $stmt->execute(['id' => $id]);
        return (bool) $stmt->fetchColumn();
    }
}
