<?php

namespace App\Modules\DrugLookups\Services;

use App\Core\Database;
use PDO;
use PDOException;

/**
 * Shared CRUD for the small name/description lookup tables that feed the
 * drug catalog's dropdowns (dosage_forms, drug_categories). Each table
 * is paired with the drugs column that references it so a value still
 * used by a drug can't be removed out from under it.
 */
class DrugLookupService
{
    private const TABLES = [
        'dosage_forms' => ['column' => 'dosage_form_id', 'label' => 'Dosage form', 'max' => 100],
        'drug_categories' => ['column' => 'category_id', 'label' => 'Category', 'max' => 150]
    ];

    private string $table;

    private array $config;

    public function __construct(string $table)
    {
        if (!isset(self::TABLES[$table])) {
            throw new \InvalidArgumentException("Unknown lookup table: {$table}");
        }

        $this->table = $table;
        $this->config = self::TABLES[$table];
    }

    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT t.id, t.name, t.description, t.created_at, t.updated_at,
                    (SELECT COUNT(*) FROM drugs d WHERE d.{$this->config['column']} = t.id AND d.deleted_at IS NULL) AS drug_count
             FROM {$this->table} t
             WHERE t.deleted_at IS NULL
             ORDER BY t.name"
        );
        $stmt->execute();

        return array_map(function (array $r) {
            $r['id'] = (int) $r['id'];
            $r['drug_count'] = (int) $r['drug_count'];
            return $r;
        }, $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function register(array $data, int $userId): array
    {
        $errors = $this->validate($data);

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        try {
            $stmt = Database::connection()->prepare(
                "INSERT INTO {$this->table} (name, description, created_at, created_by)
                 VALUES (:name, :description, :created_at, :created_by)"
            );
            $stmt->execute([
                'name' => trim($data['name']),
                'description' => trim((string) ($data['description'] ?? '')) ?: null,
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $userId
            ]);
        } catch (PDOException $e) {
            return $this->duplicateOrFailure($e, 'create');
        }

        return [
            'success' => true,
            'message' => "{$this->config['label']} added successfully.",
            'data' => ['id' => (int) Database::connection()->lastInsertId()]
        ];
    }

    public function update(int $id, array $data, int $userId): array
    {
        if (!$this->find($id)) {
            return ['success' => false, 'message' => "{$this->config['label']} not found."];
        }

        $errors = $this->validate($data, $id);

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        try {
            Database::connection()->prepare(
                "UPDATE {$this->table}
                 SET name = :name, description = :description, updated_at = :updated_at, updated_by = :updated_by
                 WHERE id = :id"
            )->execute([
                'name' => trim($data['name']),
                'description' => trim((string) ($data['description'] ?? '')) ?: null,
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => $userId,
                'id' => $id
            ]);
        } catch (PDOException $e) {
            return $this->duplicateOrFailure($e, 'update');
        }

        return ['success' => true, 'message' => "{$this->config['label']} updated successfully."];
    }

    public function remove(int $id, int $userId): array
    {
        if (!$this->find($id)) {
            return ['success' => false, 'message' => "{$this->config['label']} not found."];
        }

        $stmt = Database::connection()->prepare(
            "SELECT COUNT(*) FROM drugs WHERE {$this->config['column']} = :id AND deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);
        $inUse = (int) $stmt->fetchColumn();

        if ($inUse > 0) {
            return [
                'success' => false,
                'message' => "Can't delete: {$inUse} drug(s) still use this " . strtolower($this->config['label']) . '.'
            ];
        }

        // Rename on soft-delete so the UNIQUE(name) constraint doesn't
        // block re-adding the same name later.
        Database::connection()->prepare(
            "UPDATE {$this->table}
             SET deleted_at = :deleted_at, deleted_by = :deleted_by,
                 name = LEFT(CONCAT(name, ' [deleted #', id, ']'), {$this->config['max']})
             WHERE id = :id"
        )->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId,
            'id' => $id
        ]);

        return ['success' => true, 'message' => "{$this->config['label']} deleted successfully."];
    }

    private function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM {$this->table} WHERE id = :id AND deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    private function validate(array $data, ?int $ignoreId = null): array
    {
        $name = trim((string) ($data['name'] ?? ''));

        if ($name === '') {
            return ['name' => 'Name is required.'];
        }

        if (mb_strlen($name) > $this->config['max']) {
            return ['name' => "Name must be {$this->config['max']} characters or fewer."];
        }

        $stmt = Database::connection()->prepare(
            "SELECT id FROM {$this->table} WHERE name = :name AND deleted_at IS NULL AND id <> :ignore LIMIT 1"
        );
        $stmt->execute(['name' => $name, 'ignore' => (int) $ignoreId]);

        if ($stmt->fetchColumn() !== false) {
            return ['name' => "A " . strtolower($this->config['label']) . " with this name already exists."];
        }

        return [];
    }

    private function duplicateOrFailure(PDOException $e, string $action): array
    {
        if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => ['name' => "A " . strtolower($this->config['label']) . " with this name already exists."]
            ];
        }

        error_log("drug lookup {$action} failed ({$this->table}): " . $e->getMessage());

        return ['success' => false, 'message' => "Failed to {$action} " . strtolower($this->config['label']) . '.'];
    }
}
